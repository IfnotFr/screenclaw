import { tool } from "ai";
import { z } from "zod";
import { useComputer } from "#/core/index.js";

/**
 * Tool: Mouse Drag and Drop
 */
export const mouseDragAndDropTool = tool({
  description: "Drags an element from one location to another.",
  inputSchema: z.object({
    fromX: z.number().describe("Source x-coordinate"),
    fromY: z.number().describe("Source y-coordinate"),
    toX: z.number().describe("Destination x-coordinate"),
    toY: z.number().describe("Destination y-coordinate"),
  }),
  async execute({ fromX, fromY, toX, toY }) {
    await useComputer().mouseDragAndDrop(fromX, fromY, toX, toY);
    return { status: "executed", message: `Dragged from (${fromX}, ${fromY}) to (${toX}, ${toY}).` };
  },
});
