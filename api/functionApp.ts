// Load compiled functions (JS in /dist)
require("./dist/track.js");
require("./dist/metrics.js");
require("./dist/contact.js");   

const { app } = require("@azure/functions");

// Test endpoint
app.http("ping", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "ping",
  handler: async () => ({
    status: 200,
    jsonBody: { ok: true }
  })
});
