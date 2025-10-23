const { TableClient } = require("@azure/data-tables");

// Storage (Azurite in dev, real Storage in Azure)
const conn = process.env.STORAGE_CONN || process.env.AzureWebJobsStorage;
const tableName = "Contacts";

async function getTableClient() {
  const client = TableClient.fromConnectionString(conn, tableName);
  await client.createTable(); // idempotent
  return client;
}

async function trySendEmail(name, email, message) {
  const connStr = process.env.EMAIL_CONNECTION_STRING;
  const sender = process.env.EMAIL_SENDER;
  if (!connStr || !sender) return { sent: false, reason: "Email not configured" };

  const { EmailClient } = require("@azure/communication-email");
  const client = new EmailClient(connStr);

  const subject = `New contact form lead from ${name}`;
  const safe = (s) => String(s ?? "").replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]));
  const html = `
    <div>
      <h3>New Lead</h3>
      <p><b>Name:</b> ${safe(name)}</p>
      <p><b>Email:</b> ${safe(email)}</p>
      <p><b>Message:</b></p>
      <pre>${safe(message)}</pre>
      <hr/>
      <small>Sent ${new Date().toISOString()}</small>
    </div>
  `;

  try {
    const poller = await client.beginSend({
      senderAddress: sender,
      content: { subject, html },
      // send to yourself for now (same as sender)
      recipients: { to: [{ address: sender }] }
    });
    await poller.pollUntilDone();
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: String(err) };
  }
}

module.exports = async function (context, req) {
  const { name, email, message } = req.body || {};
  if (typeof name !== "string" || typeof email !== "string" || typeof message !== "string") {
    context.res = { status: 400, body: { error: "Body must be { name:string, email:string, message:string }" } };
    return;
  }
  if (name.length > 200 || email.length > 320 || message.length > 5000) {
    context.res = { status: 413, body: { error: "Payload too large" } };
    return;
  }

  const table = await getTableClient();
  const ts = Date.now();
  const rowKey = `${ts}-${Math.random().toString(36).slice(2,8)}`;

  await table.createEntity({
    partitionKey: "lead",
    rowKey,
    ts,
    name,
    email,
    message
  });

  const emailResult = await trySendEmail(name, email, message);

  context.res = {
    status: 200,
    body: { ok: true, stored: true, emailed: emailResult.sent, emailNote: emailResult.reason || undefined }
  };
};
