import { tool } from "ai";
import { z } from "zod";
import { useStorage } from "#/core/index.js";
import { parseTasks, serializeTasks, Task } from "./get-task-list.js";

export const insertTaskTool = tool({
  description: "Insert a new pending task before the current task (the first uncompleted one) by default, or before a specific task index. Use this when Runner reports a missing prerequisite.",
  inputSchema: z.object({
    text: z.string().describe("Description of the task to insert."),
    beforeIndex: z.number().optional().describe("Line index to insert before. Defaults to the current (first uncompleted) task."),
  }),
  execute: async ({ text, beforeIndex }) => {
    try {
      const storage = useStorage();
      if (!storage) throw new Error("Storage not available.");
      const content = await storage.read("TASKS.md");
      if (!content) throw new Error("No task list found.");

      const tasks = parseTasks(content);

      // Resolve insertion point
      const targetIndex = beforeIndex !== undefined
        ? beforeIndex
        : tasks.find(t => !t.done)?.index ?? tasks.length;

      // Find the position in the tasks array to insert before
      const insertPos = tasks.findIndex(t => t.index === targetIndex);
      const newTask: Task = { index: -1, done: false, text }; // index will be recalculated

      if (insertPos === -1) {
        tasks.push(newTask);
      } else {
        tasks.splice(insertPos, 0, newTask);
      }

      // Recalculate line indices after insertion
      const updated = tasks.map((t, i) => ({ ...t, index: i }));
      await storage.write("TASKS.md", serializeTasks(updated));

      const finalPos = updated.find(t => t.text === text && !t.done)?.index ?? -1;
      return { status: "success", message: `Task inserted at index ${finalPos}: "${text}"` };
    } catch (e: any) {
      return { status: "error", message: e.message };
    }
  },
});
