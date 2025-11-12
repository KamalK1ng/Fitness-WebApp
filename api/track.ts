export {}; // keep file scoped

const { app } = require("@azure/functions");
const { TableClient } = require("@azure/data-tables");

function getTableClient() {
  // Prefer dedicated app setting in prod; fall back to Functions storage (local Azurite)
  const conn =
    process.env.APP_TABLE_CONN ||
    process.env.AzureWebJobsStorage ||
    "";

  if (!conn) return null; // best-effort: allow missing storage
  const tableName = process.env.TABLE_NAME || "SiteVisits";
  return TableClient.fromConnectionString(conn, tableName);
}

type VisitEvent = "start" | "stop";
interface VisitEntity {
  partitionKey: string;
  rowKey: string;
  path: string;
  sessionId: string;
  event: VisitEvent;
  ts: number;
  durationMs?: number;
}

async function trackHandler(req: any, ctx: any): Promise<any> {
  try {
    // --- CORS preflight (useful during local dev) ---
    if (req.method === "OPTIONS") {
      const origin = req.headers?.get?.("Origin") || "*";
      return {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "content-type",
          "Access-Control-Max-Age": "600"
        }
      };
    }

    // Quick healthcheck (handy for browser GET)
    if (req.method === "GET") {
      return {
        status: 200,
        headers: { "Content-Type": "application/json" },
        jsonBody: { ok: true }
      };
    }

    // Parse body (POST)
    const body = (await req.json().catch(() => ({}))) as {
      sessionId?: string;
      path?: string;
      event?: VisitEvent;
      durationMs?: number;
      timestamp?: number;
    };

    const sessionId = (body.sessionId ?? "anon").toString();
    const path = (body.path ?? "/").toString();
    const event = ((body.event ?? "start") as VisitEvent);

    if (!["start", "stop"].includes(event)) {
      return {
        status: 400,
        headers: { "Content-Type": "application/json" },
        jsonBody: { error: "Invalid body." }
      };
    }

    const ts = Number.isFinite(body.timestamp) ? Number(body.timestamp) : Date.now();
    const pk = process.env.TABLE_PARTITION || "visits";
    const rk = `${sessionId}_${ts}`;

    const entity: VisitEntity = {
      partitionKey: pk,
      rowKey: rk,
      path,
      sessionId,
      event,
      ts,
      ...(event === "stop" && Number.isFinite(body.durationMs)
        ? { durationMs: Math.max(0, Math.floor(Number(body.durationMs))) }
        : {})
    };

    // Best-effort persist: try to write, but don't fail the request if storage has an issue
    try {
      const table = getTableClient();
      if (table) {
        try {
          await table.createTable(); // idempotent; 409 = already exists
        } catch (e: any) {
          if (e?.statusCode !== 409) throw e;
        }
        await table.createEntity(entity as any);
      } else {
        ctx.log("track: storage not configured; skipping persist");
      }
    } catch (e: any) {
      ctx.log("track: persist failed:", e?.message || e);
      // swallow: still return 202 so site UX never breaks
    }

    return {
      status: 202,
      headers: { "Content-Type": "application/json" },
      jsonBody: { ok: true }
    };
  } catch (err: any) {
    ctx?.error?.("Track error:", err?.message || err);
    return {
      status: 500,
      headers: { "Content-Type": "application/json" },
      jsonBody: { error: "Failed to track." }
    };
  }
}

app.http("track", {
  methods: ["OPTIONS", "GET", "POST"], // POST for events; GET for health; OPTIONS for CORS preflight
  authLevel: "anonymous",
  route: "track",
  handler: trackHandler
});
