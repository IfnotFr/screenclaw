import { tool } from "ai";
import { z } from "zod";
import { useStorage } from "#/core/index.js";
import { parseTasks, serializeTasks } from "./get-task-list.js";

export const completeTaskTool = tool({
  description: "Mark a task as completed ([x]).",
  inputSchema: z.object({
    index: z.number().describe("Line index of the task (as returned by getTaskList)."),
  }),
  execute: async ({ index }) => {
    try {
      const storage = useStorage();
      if (!storage) throw new Error("Storage not available.");
      const content = await storage.read("TASKS.md");
      if (!content) throw new Error("No task list found.");

      const tasks = parseTasks(content);
      const task = tasks.find(t => t.index === index);
      if (!task) throw new Error(`No task at index ${index}.`);

      task.done = true;
      await storage.write("TASKS.md", serializeTasks(tasks));
      return { status: "success", message: `Task ${index} completed: "${task.text}"` };
    } catch (e: any) {
      return { status: "error", message: e.message };
    }
  },
});
