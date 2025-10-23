const { TableClient } = require("@azure/data-tables");
const conn = process.env.STORAGE_CONN || process.env.AzureWebJobsStorage;
const tableName = "PageTracks";

async function getTableClient() {
  const client = TableClient.fromConnectionString(conn, tableName);
  await client.createTable();
  return client;
}

global.tableReady = global.tableReady || getTableClient();

module.exports = async function (context, req) {
  const minutes = Number(req.query.minutes || 60);
  const cutoff = Date.now() - minutes * 60_000;

  const client = await global.tableReady;

  // Scan all partitions (paths) for recent rows (simple + good enough for now)
  const filter = `ts ge ${cutoff}`;
  let total = 0;
  const byPath = {};
  const uniqueVisitors = new Set();

  for await (const entity of client.listEntities({ queryOptions: { filter } })) {
    total++;
    byPath[entity.partitionKey] = (byPath[entity.partitionKey] || 0) + 1;
    uniqueVisitors.add(`${entity.partitionKey}|${entity.userAgent}`);
  }

  context.res = {
    status: 200,
    body: {
      ok: true,
      windowMinutes: minutes,
      total,
      activeVisitors: uniqueVisitors.size, // naive unique by path+UA
      byPath
    }
  };
};
