import compression from "compression";
import express from "express";
import { existsSync } from "node:fs";
import { createApp } from "./app";
import { geminiAi, offlineAi, vertexAi } from "./ai";
import { loadEnv } from "./env";
import { log } from "./log";

const env = loadEnv();
const provider = env.GOOGLE_CLOUD_PROJECT ? "vertex" : env.GEMINI_API_KEY ? "gemini" : "offline";
const ai =
  provider === "vertex"
    ? vertexAi(env.GOOGLE_CLOUD_PROJECT as string, env.GOOGLE_CLOUD_LOCATION, env.GEMINI_MODEL)
    : provider === "gemini"
      ? geminiAi(env.GEMINI_API_KEY as string, env.GEMINI_MODEL)
      : offlineAi;
const app = createApp(ai, {
  origin: env.CLIENT_ORIGIN,
  trustProxy: env.TRUST_PROXY === "1",
  limit: env.RATE_LIMIT_PER_MIN,
  provider,
});
if (existsSync("dist")) {
  app.use(compression());
  const noCache = /(\.html|sw\.js|\.webmanifest)$/;
  app.use(
    express.static("dist", {
      setHeaders: (res, f) =>
        res.setHeader("Cache-Control", noCache.test(f) ? "no-cache" : "public, max-age=31536000, immutable"),
    }),
  );
}
const server = app.listen(env.PORT, () => log("INFO", "server started", { port: env.PORT, ai: provider }));
server.keepAliveTimeout = 620_000; // longer than Google front ends keep connections, avoiding sporadic 502s
server.headersTimeout = 625_000;
process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
  server.closeIdleConnections();
});
