import { Router } from "express";

export const schedulerRouter = Router();

// State shared with server.ts via this module
export const schedulerState = {
  running: false,
  lastRun: null as string | null,
  triggerRun: null as (() => Promise<void>) | null,
};

schedulerRouter.get("/status", (_req, res) => {
  res.json({ running: schedulerState.running, lastRun: schedulerState.lastRun });
});

schedulerRouter.post("/run", async (_req, res) => {
  if (schedulerState.running) return res.status(409).json({ error: "Already running" });
  if (!schedulerState.triggerRun) return res.status(503).json({ error: "Scheduler not ready" });
  res.json({ ok: true });
  schedulerState.triggerRun();
});
