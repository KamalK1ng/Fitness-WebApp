// api/metrics.ts (replace file)
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
  handler: async (req: any, ctx: any) => {
    const pk = process.env.TABLE_PARTITION || "visits";

    const url = new URL(req.url);
    const minutes = Math.max(1, Math.min(240, Number(url.searchParams.get("minutes")) || 60));
    const activeWindowSec = Math.max(10, Number(url.searchParams.get("activeWindowSec")) || 120);

    const now = Date.now();
    const since = now - minutes * 60 * 1000;
    const MIN_SAMPLE_MS = 5000; // ignore anything shorter than 5s

    const out = {
      ok: true,
      windowMinutes: minutes,
      activeNow: 0,
      starts: 0,
      stops: 0,
      averageMs: 0,
      averageSeconds: 0
    };

    try {
      const cli = getClient();
      if (!cli) return { status: 200, jsonBody: out };

      const lastBySession = new Map<string, { ev: "start" | "stop"; ts: number }>();
      let sumMs = 0, cnt = 0;

      // 1) Scan rows in window
      const iter = cli.listEntities({ queryOptions: { filter: `PartitionKey eq '${pk}'` } });
      for await (const e of iter) {
        const ts = Number((e as any).ts ?? 0);
        if (!Number.isFinite(ts) || ts < since) continue;

        const ev = (e as any).event as "start" | "stop";
        const sid = String((e as any).sessionId ?? "");
        if (!sid) continue;

        if (ev === "start") out.starts++;
        if (ev === "stop") {
          out.stops++;
          const d = Number((e as any).durationMs ?? 0);
          if (Number.isFinite(d) && d >= MIN_SAMPLE_MS) { sumMs += d; cnt++; }
        }

        const prev = lastBySession.get(sid);
        if (!prev || ts > prev.ts) lastBySession.set(sid, { ev, ts });
      }

      // 2) Add live partials: sessions currently "start" add (now - ts)
      for (const { ev, ts } of lastBySession.values()) {
        if (ev === "start") {
          const partial = now - ts;
          if (partial >= MIN_SAMPLE_MS) { sumMs += partial; cnt++; }
        }
      }

      // 3) Active now = last event is start within active window
      out.activeNow = [...lastBySession.values()]
        .filter(v => v.ev === "start" && v.ts >= now - activeWindowSec * 1000).length;

      out.averageMs = cnt ? Math.round(sumMs / cnt) : 0;
      out.averageSeconds = cnt ? Math.round((out.averageMs / 1000) * 10) / 10 : 0;

      return { status: 200, jsonBody: out };
    } catch (e: any) {
      ctx.log("metrics error:", e?.message || e);
      return { status: 200, jsonBody: out };
    }
  }
});
