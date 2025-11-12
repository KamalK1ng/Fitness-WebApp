// api/diag.ts
export {};
const { app } = require("@azure/functions");
const { TableClient } = require("@azure/data-tables");

function getConn() {
  return process.env.APP_TABLE_CONN || process.env.AzureWebJobsStorage || "";
}
function getTable() {
  const conn = getConn();
  const name = process.env.TABLE_NAME || "SiteVisits";
  return conn ? TableClient.fromConnectionString(conn, name) : null;
}

app.http("diag", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "diag",
  handler: async (_req: any, ctx: any) => {
    const info: any = {
      ok: true,
      seenEnv: {
        APP_TABLE_CONN: !!process.env.APP_TABLE_CONN,
        AzureWebJobsStorage: !!process.env.AzureWebJobsStorage,
        TABLE_NAME: process.env.TABLE_NAME || "SiteVisits",
        TABLE_PARTITION: process.env.TABLE_PARTITION || "visits"
      },
      tablePing: "not attempted",
      recentCount15m: 0,
      writeAttempt: "not attempted",
      errors: [] as string[],
    };

    try {
      const cli = getTable();
      if (!cli) {
        info.tablePing = "no connection string";
        return { status: 200, jsonBody: info };
      }

      // ensure table
      try { await cli.createTable(); } catch (e: any) { if (e?.statusCode !== 409) throw e; }
      info.tablePing = "connected";

      // write a tiny diag row
      const ts = Date.now();
      const pk = process.env.TABLE_PARTITION || "visits";
      const sid = "diag";
      try {
        await cli.createEntity({
          partitionKey: pk,
          rowKey: `${sid}_${ts}`,
          sessionId: sid,
          path: "/diag",
          event: "start",
          ts
        } as any);
        info.writeAttempt = "ok";
      } catch (e: any) {
        info.writeAttempt = "failed";
        info.errors.push("write: " + (e?.message || String(e)));
      }

      // count recent rows in window
      const since = ts - 15 * 60 * 1000;
      try {
        let c = 0;
        const iter = cli.listEntities({ queryOptions: { filter: `PartitionKey eq '${pk}'` } });
        for await (const e of iter) {
          const ets = Number((e as any).ts ?? 0);
          if (Number.isFinite(ets) && ets >= since) c++;
        }
        info.recentCount15m = c;
      } catch (e: any) {
        info.errors.push("scan: " + (e?.message || String(e)));
      }
    } catch (e: any) {
      info.ok = false;
      info.errors.push(e?.message || String(e));
      ctx.log("diag error", e);
    }

    return { status: 200, jsonBody: info };
  }
});
