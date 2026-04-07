import { tool } from "ai";
import { z } from "zod";
import { useComputer } from "#/core/index.js";

/**
 * Tool: Keyboard Type Text
 */
export const keyboardTypeTextTool = tool({
  description: "Types the specified text using the keyboard.",
  inputSchema: z.object({
    text: z.string().describe("The literal text to type"),
  }),
  async execute({ text }) {
    await useComputer().keyboardTypeText(text);
    return { status: "executed", message: `Typed text: "${text}".` };
  },
});
