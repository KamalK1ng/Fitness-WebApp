export {}; // ← marks the file as a module; isolates its scope
const { app } = require("@azure/functions");
const { EmailClient } = require("@azure/communication-email");

const emailClient = new EmailClient(process.env.ACS_CONNECTION_STRING ?? "");

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || "");

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

async function contactHandler(req: any, ctx: any): Promise<any> {
  try {
    const body = (await req.json().catch(() => ({}))) as { name?: string; email?: string; message?: string };
    const { name, email, message } = body;

    if (!name || !email || !message || !isEmail(email)) {
      return { status: 400, jsonBody: { error: "Invalid input." } };
    }

    const from = process.env.EMAIL_SENDER ?? "";
    const to = process.env.EMAIL_TO ?? "";
    if (!from || !to || !process.env.ACS_CONNECTION_STRING) {
      return { status: 500, jsonBody: { error: "Email is not configured." } };
    }

    const subject = `New website enquiry from ${name}`;
    const html = `
      <h3>New Contact Form Submission</h3>
      <p><b>Name:</b> ${escapeHtml(name)}</p>
      <p><b>Email:</b> ${escapeHtml(email)}</p>
      <p><b>Message:</b><br/>${escapeHtml(message).replace(/\n/g,"<br/>")}</p>
      <hr/>
      <p>Sent: ${new Date().toISOString()}</p>
    `;

    const poller = await emailClient.beginSend({
      senderAddress: from,
      recipients: { to: [{ address: to }] },
      content: { subject, html }
    });

    await poller.pollUntilDone();
    return { status: 202, jsonBody: { ok: true } };
  } catch (err: any) {
    ctx?.error?.("Contact error:", err?.message || err);
    return { status: 500, jsonBody: { error: "Failed to send message." } };
  }
}

app.http("contact", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "contact",
  handler: contactHandler
});
