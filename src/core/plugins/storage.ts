import { AgentPlugin } from "ai-sdk-agentic";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * withStorage: Mission-specific directory storage plugin.
 * Structure:
 * .storage/missions/{missionId}/MEMORY.md
 * .storage/missions/{missionId}/logs/{timestamp}.log
 */
export const withStorage = (): AgentPlugin => async (options, mission) => {
  const missionPath = path.join(process.cwd(), ".storage", "missions", mission.id);
  const logsPath = path.join(missionPath, "logs");
  
  // Ensure directories exist
  await fs.mkdir(logsPath, { recursive: true });
  
  // Generate a unique log filename for this specific run
  const timestamp = new Date(mission.metadata.startTime).toISOString().replace(/[:.]/g, "-");
  const logFileName = `${timestamp}.log`;

  // Expose paths in the shared context
  mission.context.storagePath = missionPath;
  mission.context.logFileName = logFileName;

  return {};
};
