import { AgentPlugin, AgentLogPayload, AgentTextPayload } from "ai-sdk-agentic";
import fs from "node:fs/promises";
import path from "node:path";
import { logger } from "#/core/index.js";

// ─── ANSI strip ────────────────────────────────────────────────────────────────

const ANSI_RE = /\x1B\[[0-9;]*[mGKHFJABCDsu]/g;
function stripAnsi(str: string): string { return str.replace(ANSI_RE, ""); }

// ─── Dedup: only subscribe once per mission id ─────────────────────────────────

const subscribedMissions = new Set<string>();

// ─── Plugin ────────────────────────────────────────────────────────────────────

/**
 * withStorage: Mission-specific directory storage plugin.
 * Structure:
 * .storage/missions/{missionId}/MEMORY.md
 * .storage/missions/{missionId}/run.log  (single file, appended across runs)
 */
export const withStorage = (): AgentPlugin => async (options, mission) => {
  const missionPath = path.join(process.cwd(), ".storage", "missions", mission.id);
  await fs.mkdir(missionPath, { recursive: true });

  mission.context.storagePath = missionPath;
  mission.context.logFileName = "run.log";

  // Only subscribe once per mission id — runner/computer/scheduler share the same id
  if (subscribedMissions.has(mission.id)) return {};
  subscribedMissions.add(mission.id);

  const logFilePath = path.join(missionPath, "run.log");
  const runHeader = `\n${"─".repeat(60)}\n Run: ${new Date().toISOString()}\n${"─".repeat(60)}\n`;

  // ─── Serialized write queue (preserves order) ──────────────────────────────

  let writeQueue = Promise.resolve();
  function enqueue(data: string): void {
    writeQueue = writeQueue.then(() => fs.appendFile(logFilePath, data, "utf-8")).catch(() => {});
  }

  enqueue(runHeader);

  // ─── Per-agent stream buffer ───────────────────────────────────────────────

  // Stored as { prefix, content } so we only write if content is non-empty
  const streamBuffers = new Map<string, { prefix: string; content: string }>();

  function agentLabel(payload: { mission: typeof mission }): string {
    return payload.mission.agent.metadata?.log?.name ?? payload.mission.agent.id ?? "Agent";
  }

  function flushBuffer(agentId: string): void {
    const buf = streamBuffers.get(agentId);
    streamBuffers.delete(agentId);
    if (buf?.content.trim()) enqueue(buf.prefix + buf.content + "\n");
  }

  logger.onAny((event, payload) => {
    if (payload?.mission?.id !== mission.id) return;

    // Normalize agent.text (LLM reasoning tokens) into agent.log shape
    if (event === "agent.text") {
      payload = {
        ...payload,
        type: "agent-text",
        message: (payload as AgentTextPayload).text,
        options: { level: 1, eol: false },
      } as AgentLogPayload;
      event = "agent.log";
    }

    if (event !== "agent.log") return;

    const entry = payload as AgentLogPayload;
    const agentId = entry.mission.agent.id;
    const name = agentLabel(entry);
    const level = Math.max(0, entry.options?.level ?? 0);
    const indent = "  ".repeat(level);
    // Mirror withConsoleLogger: only "agent-text" gets 💬, not "text" (logger.write)
    const isChat = entry.type === "agent-text";
    // Mirror withConsoleLogger: both "agent-text" and "text" are streaming continuations
    const isStreamContinuation = entry.options?.eol === false &&
      (entry.type === "agent-text" || entry.type === "text");
    const message = stripAnsi(entry.message ?? "");

    // Flush open buffer when the stream is broken (same rule as withConsoleLogger)
    if (streamBuffers.has(agentId) && !isStreamContinuation) {
      flushBuffer(agentId);
      if (message === "" && entry.options?.eol) return; // empty eol sentinel
    }

    if (isStreamContinuation) {
      if (!streamBuffers.has(agentId)) {
        const chatPrefix = isChat ? "💬 " : "";
        streamBuffers.set(agentId, { prefix: `[${name}] ${indent}${chatPrefix}`, content: "" });
      }
      if (message) {
        const buf = streamBuffers.get(agentId)!;
        buf.content += message;
      }
    } else {
      // Immediate line — prefix each sub-line for multi-line messages
      const lines = message.split("\n");
      const out = lines.map(l => `[${name}] ${indent}${l}`).join("\n");
      if (out.replace(/\[.*?\]\s*/g, "").trim()) {
        enqueue(out + "\n");
      }
    }
  });

  return {};
};
