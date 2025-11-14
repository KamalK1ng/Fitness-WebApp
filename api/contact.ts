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
};

function getString(v: unknown): string {
  return (typeof v === "string" ? v : "").trim();
}

async function contactHandler(req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {
  try {
    // ---- Parse body safely ----
    let body = {} as ContactPayload;
    const ct = req.headers.get("content-type") || "";

    if (ct.includes("application/json")) {
      body = (await req.json()) as ContactPayload;
    } else if (ct.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      body = Object.fromEntries(new URLSearchParams(text)) as unknown as ContactPayload;
    } else {
      // best effort
      try {
        body = (await req.json()) as ContactPayload;
      } catch {
        const text = await req.text();
        try {
          body = Object.fromEntries(new URLSearchParams(text)) as unknown as ContactPayload;
        } catch { /* ignore */ }
      }
    }

    const firstName = getString(body.First_name);
    const lastName  = getString(body.Last_name);
    const phoneRaw  = getString(body.Phone);
    const location  = getString(body.Location);
    const consent   = !!body.consent;

    if (!firstName || !lastName || !phoneRaw) {
      return { status: 400, jsonBody: { error: "Missing required fields." } };
    }

    const phone = phoneRaw.replace(/[^\d+]/g, "").slice(0, 20);

    const conn = process.env.STORAGE_CONNECTION;
    if (!conn) {
      ctx.error("STORAGE_CONNECTION missing");
      return { status: 500, jsonBody: { error: "Storage not configured" } };
    }

    const client = TableClient.fromConnectionString(conn, tableName);

    // Create the table if it doesn't exist (ignore 409)
    try {
      await client.createTable();
    } catch (e: any) {
      if (!(e?.statusCode === 409)) throw e;
    }

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

    return { status: 201, jsonBody: { ok: true, id: entity.rowKey } };
  } catch (err: any) {
    ctx.error(`contact error: ${err?.message}`);
    return { status: 500, jsonBody: { error: "Server error" } };
  }
}

// 🔑 This is the crucial bit – it actually registers the HTTP trigger.
app.http("contact", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: contactHandler
});
