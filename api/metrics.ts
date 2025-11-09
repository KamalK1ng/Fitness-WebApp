export {};
const { app } = require("@azure/functions");
const { TableClient } = require("@azure/data-tables");

function getTableClient() {
  const conn = process.env.APP_TABLE_CONN || process.env.AzureWebJobsStorage || "";
  if (!conn) return null;
  const tableName = process.env.TABLE_NAME || "SiteVisits";
  return TableClient.fromConnectionString(conn, tableName);
}

app.http("metrics", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "metrics",
  handler: async (req: any, ctx: any) => {
    const windowMinutes = Math.max(1, Math.min(1440, Number(req.query.get("minutes") ?? 60)));
    const activeWindowSec = Math.max(10, Math.min(600, Number(req.query.get("activeWindowSec") ?? 120)));
    const since = Date.now() - windowMinutes * 60_000;
    const activeSince = Date.now() - activeWindowSec * 1000;
    const pk = process.env.TABLE_PARTITION || "visits";

    const out = {
      fromUnixMs: since,
      windowMinutes,
      path: "ALL",
      samples: 0,
      averageMs: 0,
      averageSeconds: 0,
      starts: 0,
      stops: 0,
      activeNow: 0,
      activeWindowSec
    };

    try {
      const client = getTableClient();
      if (!client) return { status: 200, jsonBody: out };

      const iter = client.listEntities({ queryOptions: { filter: `PartitionKey eq '${pk}'` } });

      let sum = 0, count = 0;
      const lastEventBySession = new Map<string, { ev: "start" | "stop"; ts: number }>();

      for await (const e of iter) {
        const ts = Number((e as any).ts ?? 0);
        if (!Number.isFinite(ts) || ts < since) continue;

        const ev = (e as any).event as "start" | "stop";
        const sid = String((e as any).sessionId ?? "");
        if (!sid) continue;

        // Aggregate for averages (stops only)
        if (ev === "stop") {
          out.stops++;
          const d = Number((e as any).durationMs ?? 0);
          if (Number.isFinite(d) && d > 0) {
            sum += d;
            count++;
          }
        } else if (ev === "start") {
          out.starts++;
        }

        // Track the latest event per session to estimate "active now"
        const prev = lastEventBySession.get(sid);
        if (!prev || ts > prev.ts) {
          lastEventBySession.set(sid, { ev, ts });
        }
      }

      // Active = sessions whose last event is a start within the active window
      out.activeNow = [...lastEventBySession.values()].filter(v => v.ev === "start" && v.ts >= activeSince).length;

      out.samples = count;
      out.averageMs = count ? Math.round(sum / count) : 0;
      out.averageSeconds = count ? Math.round(out.averageMs / 100) / 10 : 0;

      return { status: 200, jsonBody: out };
    } catch (e: any) {
      ctx.log("metrics error:", e?.message || e);
      return { status: 200, jsonBody: out }; // best-effort
    }
  }
});
