import { tool } from "ai";
import { z } from "zod";
import { useStorage } from "#/core/index.js";
import { parseTasks, serializeTasks } from "./get-task-list.js";

export const updateTaskTool = tool({
  description: "Update the text of an existing task (e.g. to refine it based on new context).",
  inputSchema: z.object({
    index: z.number().describe("Line index of the task (as returned by getTaskList)."),
    text: z.string().describe("New description for the task."),
  }),
  execute: async ({ index, text }) => {
    try {
      const storage = useStorage();
      if (!storage) throw new Error("Storage not available.");
      const content = await storage.read("TASKS.md");
      if (!content) throw new Error("No task list found.");

      const tasks = parseTasks(content);
      const task = tasks.find(t => t.index === index);
      if (!task) throw new Error(`No task at index ${index}.`);

      const oldText = task.text;
      task.text = text;
      await storage.write("TASKS.md", serializeTasks(tasks));
      return { status: "success", message: `Task ${index} updated: "${oldText}" → "${text}"` };
    } catch (e: any) {
      return { status: "error", message: e.message };
    }
  },
});
