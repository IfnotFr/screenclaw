import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";
import { tool } from "ai";

/**
 * Tool: Read Mission
 * Reads the definition and the current log of a mission.
 */
export const readMissionTool = tool({
  description: "Reads the content of a mission file and its corresponding log.",
  inputSchema: z.object({
    id: z.string().describe("The mission ID (filename without extension)."),
  }),
  execute: async ({ id }) => {
    try {
      const missionPath = path.join(process.cwd(), "missions", `${id}.md`);
      const logPath = path.join(process.cwd(), "missions", `${id}.log.md`);

      const content = await fs.readFile(missionPath, "utf-8");
      let log = "";
      try {
        log = await fs.readFile(logPath, "utf-8");
      } catch (e) {
        log = "No log found.";
      }

      return {
        status: "success",
        content,
        log,
        currentTime: new Date().toISOString(),
        message: "",
      };
    } catch (error) {
      return {
        status: "error",
        content: "",
        log: "",
        currentTime: "",
        message: String(error),
      };
    }
  },
});
