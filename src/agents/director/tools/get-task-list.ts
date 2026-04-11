import { tool } from "ai";
import { z } from "zod";
import { useStorage } from "#/core/index.js";

export type Task = { index: number; done: boolean; text: string };

export function parseTasks(content: string): Task[] {
  return content.split("\n").flatMap((line, i) => {
    const match = line.match(/^- \[([ x])\] (.+)$/);
    if (!match) return [];
    return [{ index: i, done: match[1] === "x", text: match[2] }];
  });
}

export function serializeTasks(tasks: Task[]): string {
  return tasks.map(t => `- [${t.done ? "x" : " "}] ${t.text}`).join("\n") + "\n";
}

export const getTaskListTool = tool({
  description: "Read the current task list. Returns all tasks with their index, status, and the next pending task.",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const storage = useStorage();
      if (!storage) throw new Error("Storage not available.");
      const content = await storage.read("TASKS.md");
      if (!content) return { status: "error", message: "No task list found. Call setTaskList first." };

      const tasks = parseTasks(content);
      const current = tasks.find(t => !t.done) ?? null;

      return { status: "success", tasks, current };
    } catch (e: any) {
      return { status: "error", message: e.message };
    }
  },
});
