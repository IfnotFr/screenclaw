import express from "express";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { missionsRouter } from "./routes/missions.js";
import { skillsRouter } from "./routes/skills.js";
import { schedulerRouter } from "./routes/scheduler.js";
import { eventsRouter } from "./routes/events.js";

export { emitEvent } from "./events.js";
export { schedulerState } from "./routes/scheduler.js";

// prod: dist/admin/ (vite builds there) — dev fallback: src/admin/dist/
const prodPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "admin");
const devPath  = path.join(process.cwd(), "src", "admin", "dist");
const ADMIN_DIST = existsSync(prodPath) ? prodPath : devPath;

export async function startAdminServer(port = Number(process.env.ADMIN_PORT) || 3010) {
  const app = express();

  app.use(express.json());

  app.use("/api/missions", missionsRouter);
  app.use("/api/skills", skillsRouter);
  app.use("/api/scheduler", schedulerRouter);
  app.use("/api/events", eventsRouter);

  // Serve frontend static files
  app.use(express.static(ADMIN_DIST));
  app.use((_req, res) => res.sendFile(path.join(ADMIN_DIST, "index.html")));

  app.listen(port);
}
