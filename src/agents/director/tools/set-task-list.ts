import { tool } from "ai";
import { z } from "zod";
import { useStorage } from "#/core/index.js";

export const setTaskListTool = tool({
  description: "Create or replace the task list for this mission. Call this once at the start to break the request into ordered subtasks.",
  inputSchema: z.object({
    tasks: z.array(z.string()).describe("Ordered list of subtask descriptions."),
  }),
  execute: async ({ tasks }) => {
    try {
      const storage = useStorage();
      if (!storage) throw new Error("Storage not available.");
      const content = tasks.map(t => `- [ ] ${t}`).join("\n") + "\n";
      await storage.write("TASKS.md", content);
      return { status: "success", message: `Task list created with ${tasks.length} tasks.` };
    } catch (e: any) {
      return { status: "error", message: e.message };
    }
  },
});
