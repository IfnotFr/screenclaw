import { tool } from "ai";
import { z } from "zod";
import { useComputer } from "#/core/index.js";

/**
 * Tool: Mouse Move
 */
export const mouseMoveTool = tool({
  description: "Moves the mouse cursor to the specified screen coordinates (x, y).",
  inputSchema: z.object({
    x: z.number().describe("The x-coordinate"),
    y: z.number().describe("The y-coordinate"),
  }),
  async execute({ x, y }) {
    await useComputer().mouseMove(x, y);
    return { status: "executed", message: `Mouse moved to (${x}, ${y}).` };
  },
});
