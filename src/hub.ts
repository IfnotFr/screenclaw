import { computerAgent, COMPUTER_INSTRUCTIONS } from "./agents/computer/agent.js";
import { schedulerAgent } from "./agents/scheduler/agent.js";
import { runnerAgent } from "./agents/runner/agent.js";
import { configureAgent, withConsoleLogger, withHandoff } from "ai-sdk-agentic";
import { withStorage, useSkill, logger } from "#/core/index.js";
import { useMission } from "ai-sdk-agentic";

function withVisualAnchors() {
  return async () => ({
    onStart: async () => {
      const anchors = await useSkill().getActiveVisualAnchors();
      (computerAgent as any).instructions = anchors
        ? `${COMPUTER_INSTRUCTIONS}\n\n${anchors}`
        : COMPUTER_INSTRUCTIONS;
    },
  });
}

function withPostHandoffSync() {
  return async () => ({
    wrapTool: async (proceed: () => Promise<any>, { toolName }: { toolName: string }) => {
      const { context } = useMission();
      const isFirstInspect = toolName === "inspectState" && !context.lastStateDescription;

      const result = await proceed();
      if (toolName !== "handoff" && !isFirstInspect) return result;

      try {
        const skillContext = await useSkill().sync();
        if (skillContext) return `${result}\n\n[SKILL CONTEXT UPDATED]${skillContext}`;
      } catch (e: any) {
        logger.error(`Skill sync failed: ${e.message}`);
      }

      return result;
    },
  });
}

export const computer = configureAgent(computerAgent, [
  withStorage(),
  withVisualAnchors(),
  withConsoleLogger({ name: "Computer", color: "blue" }),
]);

export const runner = configureAgent(runnerAgent, [
  withStorage(),
  withConsoleLogger({ name: "Runner", color: "green" }),
  withHandoff([{ name: "computer", agent: computer, mode: "stream" }]),
  withPostHandoffSync(),
]);

export const scheduler = configureAgent(schedulerAgent, [
  withStorage(),
  withConsoleLogger({ name: "Scheduler", color: "cyan" }),
  withHandoff([{ name: "runner", agent: runner, mode: "stream" }]),
]);

export const agents = {
  runner,
  computer,
  scheduler,
} as const;

export type AgentRole = keyof typeof agents;
