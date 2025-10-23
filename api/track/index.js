const { TableClient, AzureSASCredential } = require("@azure/data-tables");

// Dev: UseDevelopmentStorage=true → Azurite
const conn = process.env.STORAGE_CONN || process.env.AzureWebJobsStorage;
const tableName = "PageTracks";

async function getTableClient() {
  // SDK auto-parses connection strings; no SAS needed for dev conn string
  const client = TableClient.fromConnectionString(conn, tableName);
  await client.createTable(); // no-op if exists
  return client;
}

global.tableReady = global.tableReady || getTableClient();

module.exports = async function (context, req) {
  const { path, ts, userAgent } = req.body || {};
  if (typeof path !== "string" || typeof ts !== "number") {
    context.res = { status: 400, body: { error: "Expected { path: string, ts: number, userAgent?: string }" } };
    return;
  }

  const client = await global.tableReady;

  // Partition by path; unique row by ts+random to avoid collisions
  const entity = {
    partitionKey: path,
    rowKey: `${ts}-${Math.random().toString(36).slice(2, 8)}`,
    ts: ts,
    userAgent: userAgent || (req.headers && req.headers["user-agent"]) || ""
  };

  await client.createEntity(entity);
  context.res = { status: 200, body: { ok: true } };
};
