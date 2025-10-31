export {}; // ← marks the file as a module; isolates its scope

const { app } = require("@azure/functions");
const { TableClient } = require("@azure/data-tables");

function getTableClient() {
  const conn = process.env.AzureWebJobsStorage;
  if (!conn) throw new Error("AzureWebJobsStorage not set.");
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
    const body = (await req.json().catch(() => ({}))) as {
      sessionId?: string;
      path?: string;
      event?: VisitEvent;
      durationMs?: number;
      timestamp?: number;
    };

    const { sessionId, path, event } = body;
    if (!sessionId || !path || !event || !["start", "stop"].includes(event)) {
      return { status: 400, jsonBody: { error: "Invalid body." } };
    }

    const table = getTableClient();
    try { await table.createTable(); } catch { /* already exists */ }

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

    // Relax typing for SDK generic expectations
    await table.createEntity(entity as any);

    return { status: 202, jsonBody: { ok: true } };
  } catch (err: any) {
    ctx?.error?.("Track error:", err?.message || err);
    return { status: 500, jsonBody: { error: "Failed to track." } };
  }
}

app.http("track", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "track",
  handler: trackHandler
});
