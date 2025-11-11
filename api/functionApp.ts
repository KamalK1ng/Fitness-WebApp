// When running from dist, these will be .js
require("./dist/track.js");
require("./dist/metrics.js");

const { app } = require("@azure/functions");
app.http("ping", { methods: ["GET"], authLevel: "anonymous", route: "ping",
  handler: async () => ({ status: 200, jsonBody: { ok: true } }) });
