import { tool } from "ai";
import { z } from "zod";
import { useStorage } from "#/core/index.js";

const inputSchema = z.object({
  markdown: z.string().describe("New COMPLETE memory (Markdown checklist) including [x] history and new [ ] steps.")
});

/**
 * Tool: Update Current Plan
 * Updates the mission memory (Markdown).
 */
export const updateCurrentPlanTool = tool({
  description: "Update the checklist. Format: - [x] done, - [ ] pending. Use atomic steps.",
  inputSchema,
  execute: async ({ markdown }: z.infer<typeof inputSchema>) => {
    try {
      const storage = useStorage();
      await storage.writeMemory(markdown);
      return { status: "success", message: "Memory updated." };
    } catch (e: any) {
      return { status: "error", message: e.message };
    }
  }
});
