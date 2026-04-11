import fs from "node:fs/promises";
import path from "node:path";
import { useMission } from "ai-sdk-agentic";

/**
 * useStorage: Hook-style utility to interact with mission data.
 */
export function useStorage() {
  let id: string, context: Record<string, unknown>;
  try {
    ({ id, context } = useMission());
  } catch {
    return null;
  }

  const missionPath = context.storagePath as string | undefined;
  const logFileName = context.logFileName as string | undefined;

  if (!missionPath || !logFileName) return null;

  return {
    path: missionPath,
    id,

    /**
     * Reads a file from the mission directory.
     */
    async read(filename: string): Promise<string | null> {
      try {
        return await fs.readFile(path.join(missionPath, filename), "utf-8");
      } catch {
        return null;
      }
    },

    /**
     * Writes or appends to a file in the mission directory.
     */
    async write(filename: string, content: string, options: { append?: boolean } = {}): Promise<void> {
      const filePath = path.join(missionPath, filename);
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      if (options.append) {
        await fs.appendFile(filePath, content, "utf-8");
      } else {
        await fs.writeFile(filePath, content, "utf-8");
      }
    },

    /**
     * Specialized: Mission Memory (MEMORY.md)
     */
    async readMemory(): Promise<string | null> {
      return this.read("MEMORY.md");
    },

    async writeMemory(content: string): Promise<void> {
      return this.write("MEMORY.md", content);
    },

    /**
     * Specialized: Current Execution Log (logs/{timestamp}.log)
     */
    async writeLog(content: string): Promise<void> {
      return this.write(path.join("logs", logFileName), content, { append: true });
    }
  };
}
