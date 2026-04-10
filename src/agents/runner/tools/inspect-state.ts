import { tool, streamText, Output } from "ai";
import { z } from "zod";
import { useComputer, useMission, getModel, logger } from "#/core/index.js";

/**
 * Tool: Inspect State
 * Takes a screenshot, describes the current screen, and answers an optional query.
 *
 * Skill synchronization and instruction delivery are handled by withPostHandoffSync
 * in hub.ts, which appends updated skill guides to the handoff tool result automatically.
 */
export const inspectStateTool = tool({
  description: "Take a screenshot to provide a visual description and answer specific queries about the current screen state.",
  inputSchema: z.object({
    query: z.string().optional().describe("An optional specific question to answer about the screen content."),
  }),
  execute: async ({ query }) => {
    try {
      const computer = useComputer();
      const { context } = useMission();
      const model = getModel();

      const screenshot = await computer.takeScreenshot();
      const lastStateDescription = context.lastStateDescription as string | null;

      const result = streamText({
        model,
        output: Output.object({
          schema: z.object({
            description: z.string().describe("A precise, token-efficient paragraph describing the current screen."),
            answer: z.string().optional().describe("A precise sentence answering the query (if provided)."),
          }),
        }),
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: `LAST KNOWN STATE: ${lastStateDescription || "None (this is the first inspection)"}

TASK:
1. Describe the screen in one precise paragraph.
${query ? `2. Answer this question: "${query}"` : ""}`,
            },
            { type: "image", image: screenshot },
          ],
        }],
      });

      await logger.chat(result.textStream);
      const output = await result.output;

      context.lastStateDescription = output.description;

      return {
        status: "success",
        description: output.description,
        answer: output.answer,
      };
    } catch (e: any) {
      return { status: "error", message: e.message };
    }
  },
});
