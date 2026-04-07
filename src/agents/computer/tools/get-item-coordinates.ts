import { tool } from "ai";
import { z } from "zod";
import { useImage, useComputer } from "#/core/index.js";

/**
 * Tool: Get Item Coordinates
 */
export const getItemCoordinatesTool = tool({
  description: "Locates a specific visual element on the screen using its name, visual description, and spatial anchors (e.g., 'next to', 'below'). Returns its center coordinates (x, y).",
  inputSchema: z.object({
    element: z.string().describe('The name or text of the element (e.g., "Login button", "Username field")'),
    description: z.string().optional().describe('Visual characteristics (e.g., "blue rounded button", "underlined link")'),
    anchor: z.string().optional().describe('Spatial context to disambiguate (e.g., "to the right of the logo", "in the top navigation bar")'),
  }),
  async execute(input) {
    const { element, description, anchor } = input;
    const computer = useComputer();

    const goal = [
      `Element: ${element}`,
      description ? `Description: ${description}` : null,
      anchor ? `Anchor: ${anchor}` : null,
    ].filter(Boolean).join(" | ");

    const screenshot = await computer.takeScreenshot();
    const foundItem = await useImage().findItem(screenshot, goal);

    if (!foundItem) {
      return { status: "error", message: `Element "${goal}" not found.` };
    }

    try {
      const x = foundItem.centerX - foundItem.width / 2;
      const y = foundItem.centerY - foundItem.height / 2;
      await computer.highlightRegion(x, y, foundItem.width, foundItem.height);
    } catch (e) {}

    return {
      status: "success",
      coordinates: { x: Math.round(foundItem.centerX), y: Math.round(foundItem.centerY) },
      message: `Element "${goal}" located at (${Math.round(foundItem.centerX)}, ${Math.round(foundItem.centerY)}).`,
    };
  },
});
