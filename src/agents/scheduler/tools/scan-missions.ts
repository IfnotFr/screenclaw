import { tool } from "ai";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Tool: Scan Missions
 * Lists all .md files in the missions/ directory.
 */
export const scanMissionsTool = tool({
  description: "Scan the missions/ directory for pending tasks.",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const missionsDir = path.join(process.cwd(), "missions");
      const files = await fs.readdir(missionsDir);
      const missions = files.filter((f) => f.endsWith(".md"));
      return { status: "success", missions };
    } catch (e: any) {
      return { status: "error", message: e.message };
    }
  },
});
