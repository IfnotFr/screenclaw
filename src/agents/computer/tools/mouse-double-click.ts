import { tool } from "ai";
import { z } from "zod";
import { useComputer } from "#/core/index.js";

/**
 * Tool: Mouse Double Click
 */
export const mouseDoubleClickTool = tool({
  description: "Performs a double-click at the specified screen coordinates (x, y).",
  inputSchema: z.object({
    x: z.number().describe("The x-coordinate"),
    y: z.number().describe("The y-coordinate"),
  }),
  async execute({ x, y }) {
    await useComputer().mouseDoubleClick(x, y);
    return { status: "executed", message: `Double-click performed at (${x}, ${y}).` };
  },
});
