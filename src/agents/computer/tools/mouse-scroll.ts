import { tool } from "ai";
import { z } from "zod";
import { useComputer } from "#/core/index.js";

/**
 * Tool: Mouse Scroll
 */
export const mouseScrollTool = tool({
  description: "Scrolls the mouse wheel one step in the given direction. Call multiple times to scroll further.",
  inputSchema: z.object({
    direction: z.enum(["up", "down", "left", "right"]).describe("The direction to scroll"),
  }),
  async execute({ direction }) {
    await useComputer().mouseScroll(direction, 5);
    return { status: "executed", message: `Scrolled ${direction}.` };
  },
});
