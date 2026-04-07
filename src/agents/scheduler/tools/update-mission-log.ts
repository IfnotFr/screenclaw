import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";
import { tool } from "ai";

/**
 * Tool: Update Mission Log
 * Appends a new entry to the mission's journal.
 */
export const updateMissionLogTool = tool({
  description: "Appends a new execution result to the mission's journal.",
  inputSchema: z.object({
    id: z.string().describe("The mission ID."),
    status: z.string().describe("Status of the execution (SUCCESS/FAILURE)."),
    report: z.string().describe("Brief report of the action taken."),
  }),
  execute: async ({ id, status, report }) => {
    try {
      const logPath = path.join(process.cwd(), "missions", `${id}.log.md`);
      const date = new Date().toISOString();
      const entry = `\n- [${date}] ${status.toUpperCase()}: ${report}`;

      await fs.appendFile(logPath, entry, "utf-8");
      return { status: "success", message: "" };
    } catch (error) {
      return { status: "error", message: String(error) };
    }
  },
});
