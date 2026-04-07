import { tool } from "ai";
import { z } from "zod";
import { useComputer } from "#/core/index.js";

/**
 * Tool: Execute Hotkey
 */
export const executeHotkeyTool = tool({
  description: "Sends a keyboard shortcut or a special key press to the system.",
  inputSchema: z.object({
    combination: z.string().describe(
      `The key or shortcut to press (e.g., "enter", "tab", "ctrl+c", "alt+tab", "win+r", "backspace")`
    ),
  }),
  async execute({ combination }) {
    await useComputer().executeHotkey(combination);
    return { 
      status: "executed", 
      message: `Hotkey "${combination}" executed.` 
    };
  },
});
