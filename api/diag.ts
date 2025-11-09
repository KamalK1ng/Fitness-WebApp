export {};
const { app } = require("@azure/functions");
const { TableClient } = require("@azure/data-tables");

function pickConn() {
  const appConn  = !!process.env.APP_TABLE_CONN;
  const funcConn = !!process.env.AzureWebJobsStorage;
  const table    = process.env.TABLE_NAME || "SiteVisits";
  const part     = process.env.TABLE_PARTITION || "visits";
  const connStr  = process.env.APP_TABLE_CONN || process.env.AzureWebJobsStorage || "";
  return { appConn, funcConn, table, part, connStr };
}

app.http("diag", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "diag",
  handler: async (req: any, ctx: any) => {
    const q = Object.fromEntries(req.query.entries());
    const info = pickConn();
    const out: any = {
      ok: true,
      env: {
        has_APP_TABLE_CONN: info.appConn,
        has_AzureWebJobsStorage: info.funcConn,
        TABLE_NAME: info.table,
        TABLE_PARTITION: info.part
      },
      testedWrite: false,
      writeError: null
    };

    // optional test write: /api/diag?write=1
    if (q.write === "1" && info.connStr) {
      try {
        const cli = TableClient.fromConnectionString(info.connStr, info.table);
        try { await cli.createTable(); } catch (e: any) { if (e?.statusCode !== 409) throw e; }
        const now = Date.now();
        await cli.createEntity({
          partitionKey: info.part,
          rowKey: `diag_${now}`,
          event: "diag",
          ts: now
        } as any);
        out.testedWrite = true;
      } catch (e: any) {
        out.writeError = e?.message || String(e);
      }
    }
    return { status: 200, jsonBody: out };
  }
});
