import { EmailClient } from "@azure/communication-email";
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { TableClient } from "@azure/data-tables";
import { randomUUID } from "crypto";

const tableName = "ContactMessages";

type ContactPayload = {
  First_name?: string;
  Last_name?: string;
  Phone?: string;
  Location?: string;
  consent?: boolean;
  trap?: string;  // honeypot
};

function getString(v: unknown): string {
  return (typeof v === "string" ? v : "").trim();
}

async function contactHandler(req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {
  try {
    //-----------------------------------
    // Parse body safely
    //-----------------------------------
    let body = {} as ContactPayload;
    const ct = req.headers.get("content-type") || "";

    if (ct.includes("application/json")) {
      body = (await req.json()) as ContactPayload;
    } else if (ct.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      body = Object.fromEntries(new URLSearchParams(text)) as unknown as ContactPayload;
    } else {
      // best-effort attempt
      try {
        body = (await req.json()) as ContactPayload;
      } catch {
        const text = await req.text();
        try {
          body = Object.fromEntries(new URLSearchParams(text)) as unknown as ContactPayload;
        } catch { /* ignore */ }
      }
    }

    //-----------------------------------
    // Honeypot (bot detection)
    //-----------------------------------
    const trap = getString(body.trap);
    if (trap) {
      ctx.log("Bot submission blocked via honeypot.");
      return { status: 200, jsonBody: { ok: true } };
    }

    //-----------------------------------
    // Extract fields
    //-----------------------------------
    const firstName = getString(body.First_name);
    const lastName  = getString(body.Last_name);
    const phoneRaw  = getString(body.Phone);
    const location  = getString(body.Location);
    const consent   = !!body.consent;

    //-----------------------------------
    // Required validation
    //-----------------------------------
    if (!firstName || !lastName || !phoneRaw) {
      return { status: 400, jsonBody: { error: "Missing required fields." } };
    }

    const phone = phoneRaw.replace(/[^\d+]/g, "").slice(0, 20);

    //-----------------------------------
    // Table Storage connection
    //-----------------------------------
    const conn = process.env.STORAGE_CONNECTION;
    if (!conn) {
      ctx.error("STORAGE_CONNECTION missing");
      return { status: 500, jsonBody: { error: "Storage not configured" } };
    }

    const client = TableClient.fromConnectionString(conn, tableName);

    // Create table (ignore 409 conflict)
    try {
      await client.createTable();
    } catch (e: any) {
      if (e?.statusCode !== 409) throw e;
    }

    //-----------------------------------
    // Build entity
    //-----------------------------------
    const entity = {
      partitionKey: "contact",
      rowKey: randomUUID(),
      firstName,
      lastName,
      phone,
      location,
      consent,
      userAgent: req.headers.get("user-agent") || "",
      createdUtc: new Date().toISOString()
    };

    await client.createEntity(entity);

    //-----------------------------------
    // Send email (ACS)
    //-----------------------------------
    try {
      const emailClient = new EmailClient(process.env["EMAIL_CONNECTION_STRING"]!);

      const message = {
        senderAddress: "DoNotReply@b095abe3-40ea-4120-8f16-b8a73cc854a5.azurecomm.net", 
        recipients: {
          to: [
            { address: "KamalKing@KamalsCompany.onmicrosoft.com" } 
          ]
        },
        content: {
          subject: "New Coaching Lead",
          plainText: `
    New lead submission:

    Name: ${firstName} ${lastName}
    Phone: ${phone}
    Location: ${location}
          `
        }
      };

      // Start the operation
      const poller = await emailClient.beginSend(message);

      // Wait for completion
      const result = await poller.pollUntilDone();

      ctx.log("Email sent via ACS", result?.status);
    } catch (e: any) {
      ctx.error("Failed to send ACS email: " + e.message);
    }


    //-----------------------------------
    // Success
    //-----------------------------------
    return { status: 201, jsonBody: { ok: true, id: entity.rowKey } };

  } catch (err: any) {
    ctx.error(`contact error: ${err?.message}`);
    return { status: 500, jsonBody: { error: "Server error" } };
  }
}

//-----------------------------------
// Register endpoint
//-----------------------------------
app.http("contact", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: contactHandler
});
