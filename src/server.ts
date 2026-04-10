import { logger } from "#/core/index.js";
import { agents } from "./hub.js";
import cron from "node-cron";
import { bootstrap } from "./bootstrap.js";
import { startAdminServer, emitEvent, schedulerState } from "./api/server.js";

export async function start() {
  await bootstrap();
  await startAdminServer();

  // Forward all log events to SSE clients
  const _log = logger.log.bind(logger);
  const _warn = logger.warn.bind(logger);
  const _error = logger.error.bind(logger);
  logger.log = (msg: string, ...args: any[]) => { emitEvent("log", { level: "info", msg }); return _log(msg, ...args); };
  logger.warn = (msg: string, ...args: any[]) => { emitEvent("log", { level: "warn", msg }); return _warn(msg, ...args); };
  logger.error = (msg: string, ...args: any[]) => { emitEvent("log", { level: "error", msg }); return _error(msg, ...args); };

  const scheduler = agents.scheduler;

  let isSchedulerRunning = false;

  const runScheduler = async () => {
    if (isSchedulerRunning) {
      logger.warn("⚠️ Scheduler skip: a run is already in progress.", { level: 0 });
      return;
    }

    isSchedulerRunning = true;
    schedulerState.running = true;
    emitEvent("scheduler:start");

    try {
      const result = await scheduler.stream({
        prompt: "Scan and execute pending missions.",
      });
      await result.text;
      schedulerState.lastRun = new Date().toISOString();
      emitEvent("scheduler:complete");
    } catch (e) {
      logger.error(`Scheduler Error: ${e}`, { level: 0 });
      emitEvent("scheduler:error", { message: String(e) });
    } finally {
      isSchedulerRunning = false;
      schedulerState.running = false;
    }
  };

  schedulerState.triggerRun = runScheduler;

  // Start initial run with a small delay to ensure server is ready
  setTimeout(runScheduler, 2000);

  // Schedule every minute
  const cronExpr = process.env.SCHEDULER_CRON || "* * * * *";
  console.log(`⏱️  Scheduler cron: ${cronExpr}`);
  cron.schedule(cronExpr, async () => {
    logger.log("⏰ Cron Trigger: Running scheduler...", { level: 0 });
    await runScheduler();
  });

  process.on("exit", (code) => {
    console.log(`\n🛑 Process exiting with code: ${code}`);
  });

  process.on("SIGINT", () => {
    console.log("\n👋 Gracefully shutting down...");
    process.exit(0);
  });

  process.on("uncaughtException", (err) => {
    console.error("\n💥 Uncaught Exception:", err);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("\n💥 Unhandled Rejection at:", promise, "reason:", reason);
  });
}
