export {}; // keep this at top

const { app } = require("@azure/functions");
const { TableClient } = require("@azure/data-tables");

function getTableClient() {
  const conn = process.env.AzureWebJobsStorage;
  if (!conn) throw new Error("AzureWebJobsStorage not set.");
  const tableName = process.env.TABLE_NAME || "SiteVisits";
  return TableClient.fromConnectionString(conn, tableName);
}

async function metricsHandler(req: any, ctx: any): Promise<any> {
  try {
    const url = new URL(req.url);
    const minutes = Number(url.searchParams.get("minutes") ?? "60");
    const pathFilter = url.searchParams.get("path") ?? undefined;
    const since = Date.now() - Math.max(1, minutes) * 60_000;

    const table = getTableClient();
    const pk = process.env.TABLE_PARTITION || "visits";

    const filters: string[] = [
      `PartitionKey eq '${pk}'`,
      `event eq 'stop'`,
      `ts ge ${since}`
    ];
    if (pathFilter) filters.push(`path eq '${(pathFilter as string).replace(/'/g, "''")}'`);
    const filter = filters.join(" and ");

    let total = 0;
    let count = 0;
    // no generic arg here because TableClient is 'any' via require()
    for await (const entity of table.listEntities({ queryOptions: { filter } }) as any) {
      const d = Number((entity as any).durationMs);
      if (Number.isFinite(d) && d > 0) {
        total += d;
        count += 1;
      }
    }

    const avgMs = count ? Math.round(total / count) : 0;
    return {
      status: 200,
      jsonBody: {
        fromUnixMs: since,
        windowMinutes: minutes,
        path: pathFilter || "ALL",
        samples: count,
        averageMs: avgMs,
        averageSeconds: Math.round(avgMs / 1000)
      }
    };
  } catch (err: any) {
    ctx?.error?.("Metrics error:", err?.message || err);
    return { status: 500, jsonBody: { error: "Failed to compute metrics." } };
  }
}

app.http("metrics", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "metrics",
  handler: metricsHandler
});
