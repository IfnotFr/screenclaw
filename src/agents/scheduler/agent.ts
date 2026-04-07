import { ToolLoopAgent } from "ai";
import { useModel } from "#/core/index.js";
import { scanMissionsTool } from "./tools/scan-missions.js";
import { readMissionTool } from "./tools/read-mission.js";
import { updateMissionLogTool } from "./tools/update-mission-log.js";

export const schedulerAgent = new ToolLoopAgent({
  model: useModel().get(),
  instructions: `### MISSION
Strategic Orchestrator. You decide IF and WHEN to launch missions based on mission files and historical logs.

### CORE LOOP
1. **SCAN**: Use 'scanMissions' to list available missions in 'missions/*.md'.
2. **ANALYZE**: Use 'readMission' to read the definition, the journal '.log.md' and the 'currentTime'.
3. **DECIDE**: 
   - Compare current time with the frequency in the mission file.
   - If a run is due: Use the 'handoff' tool (target: runner) with the mission's goal.
4. **LOG**: Use 'updateMissionLog' to record the success or failure of the execution.

### RULES
- Be precise about timing: Follow the requested frequency (e.g., 4 times per day = every 6 hours).
- If a mission fails, log it and plan a retry if appropriate.
- You are the guardian of the schedule.`,
  tools: {
    scanMissions: scanMissionsTool,
    readMission: readMissionTool,
    updateMissionLog: updateMissionLogTool,
  },
});
