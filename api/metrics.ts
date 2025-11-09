// api/metrics.ts
export {};
const { app } = require("@azure/functions");
const { TableClient } = require("@azure/data-tables");

function getClient() {
  const conn = process.env.APP_TABLE_CONN || process.env.AzureWebJobsStorage || "";
  if (!conn) return null;
  const table = process.env.TABLE_NAME || "SiteVisits";
  return TableClient.fromConnectionString(conn, table);
}

app.http("metrics", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "metrics",
  handler: async (_req: any, ctx: any) => {
    const pk = process.env.TABLE_PARTITION || "visits";
    const activeWindowSec = 120;
    const activeSince = Date.now() - activeWindowSec * 1000;

    const out = {
      ok: true,
      activeNow: 0,
      starts: 0,
      stops: 0,
      averageSeconds: 0
    };

    try {
      const cli = getClient();
      if (!cli) return { status: 200, jsonBody: out };

      const iter = cli.listEntities({ queryOptions: { filter: `PartitionKey eq '${pk}'` } });

      const lastBySession = new Map<string, { ev: "start" | "stop"; ts: number }>();
      let sumMs = 0, cnt = 0;

      for await (const e of iter) {
        const ts = Number((e as any).ts ?? 0);
        const ev = (e as any).event as "start" | "stop";
        const sid = String((e as any).sessionId ?? "");
        if (!sid || !Number.isFinite(ts)) continue;

        if (ev === "start") out.starts++;
        if (ev === "stop") {
          out.stops++;
          const d = Number((e as any).durationMs ?? 0);
          if (Number.isFinite(d) && d > 0) { sumMs += d; cnt++; }
        }

        const prev = lastBySession.get(sid);
        if (!prev || ts > prev.ts) lastBySession.set(sid, { ev, ts });
      }

      out.activeNow = [...lastBySession.values()].filter(v => v.ev === "start" && v.ts >= activeSince).length;
      out.averageSeconds = cnt ? Math.round((sumMs / cnt) / 100) / 10 : 0;

      return { status: 200, jsonBody: out };
    } catch (e: any) {
      ctx.log("metrics error:", e?.message || e);
      return { status: 200, jsonBody: out };
    }
  }
});
