// Fictional-data demo with a disposable MongoDB instance. Not for real records.
import mongoose from "mongoose";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "./app.js";
import { seed } from "./seed.js";
const production = process.env.NODE_ENV === "production";
const mongo = await MongoMemoryServer.create();
await mongoose.connect(mongo.getUri());
await seed();
const app = createApp({
  jwtSecret: randomBytes(48).toString("hex"),
  teacherCode: production ? undefined : "DEMO-FACULTY-2026",
  clientOrigin:
    process.env.RENDER_EXTERNAL_URL ||
    process.env.CLIENT_ORIGIN ||
    "http://localhost:5173",
  production,
  demoPublic: production,
});
app.get("/api/demo-info", (_req, res) =>
  res.json({ demo: true, public: production }),
);
if (production) {
  const dist = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../..",
    "client/dist",
  );
  app.use(express.static(dist));
  app.get("/{*path}", (_req, res) =>
    res.sendFile(path.join(dist, "index.html")),
  );
}
const server = app.listen(process.env.PORT || 4000, "0.0.0.0", () =>
  console.log("SmartERP fictional-data demo ready"),
);
async function stop() {
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  await mongo.stop();
  process.exit(0);
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
