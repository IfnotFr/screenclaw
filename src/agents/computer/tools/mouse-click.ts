import { tool } from "ai";
import { z } from "zod";
import { useComputer } from "#/core/index.js";

/**
 * Tool: Mouse Click
 */
export const mouseClickTool = tool({
  description: "Performs a single left-click at the specified screen coordinates (x, y).",
  inputSchema: z.object({
    x: z.number().describe("The x-coordinate"),
    y: z.number().describe("The y-coordinate"),
  }),
  async execute({ x, y }) {
    await useComputer().mouseClick(x, y);
    return { status: "executed", message: `Click performed at (${x}, ${y}).` };
  },
});
