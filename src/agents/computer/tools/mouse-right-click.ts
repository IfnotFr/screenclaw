import { tool } from "ai";
import { z } from "zod";
import { useComputer } from "#/core/index.js";

/**
 * Tool: Mouse Right Click
 */
export const mouseRightClickTool = tool({
  description: "Performs a single right-click at the specified screen coordinates (x, y).",
  inputSchema: z.object({
    x: z.number().describe("The x-coordinate"),
    y: z.number().describe("The y-coordinate"),
  }),
  async execute({ x, y }) {
    await useComputer().mouseRightClick(x, y);
    return { status: "executed", message: `Right-click performed at (${x}, ${y}).` };
  },
});
