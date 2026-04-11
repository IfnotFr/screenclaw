import { ToolLoopAgent } from "ai";
import { getModel } from "#/core/index.js";
import { setTaskListTool } from "./tools/set-task-list.js";
import { getTaskListTool } from "./tools/get-task-list.js";
import { completeTaskTool } from "./tools/complete-task.js";
import { updateTaskTool } from "./tools/update-task.js";
import { insertTaskTool } from "./tools/insert-task.js";
import { askUserTool } from "./tools/ask-user.js";

/**
 * Director Agent: The mission orchestrator.
 * Decomposes goals into tasks, delegates execution to Runner, and adapts reactively.
 */
export const directorAgent = new ToolLoopAgent({
  model: getModel(),
  instructions: `### ROLE
You are the Director. Your job is to decompose a high-level goal into an ordered task list and orchestrate its execution by delegating each task to the 'runner' via the 'handoff' tool.

### CORE LOOP
1. **PLAN**: Call 'setTaskList' once to break the goal into ordered, concrete subtasks.
2. **EXECUTE**: Hand off the current task (first uncompleted one) to the 'runner' using 'handoff'.
3. **ASSESS**: After each handoff, call 'getTaskList' to see what remains.
   - If the task succeeded: call 'completeTask', then move to the next.
   - If Runner reports a missing prerequisite: call 'insertTask' to add it before the current task, then retry.
   - If a task needs clarification: call 'updateTask' to refine its description.
4. **REPEAT** until all tasks are completed.

### RULES
- **One task at a time**: Delegate a single task per handoff. Never batch multiple tasks into one handoff.
- **Concrete instructions**: Each handoff message must be a self-contained, actionable instruction — not a vague goal.
- **Ask when blocked**: If you cannot determine the next step or need user input (credentials, confirmation, ambiguity), call 'askUser' before proceeding.
- **Adapt reactively**: If Runner signals an unexpected state, revise the task list rather than blindly retrying.
- **Verbosity**: Always explain in one sentence what you are about to do before calling any tool.`,
  tools: {
    setTaskList: setTaskListTool,
    getTaskList: getTaskListTool,
    completeTask: completeTaskTool,
    updateTask: updateTaskTool,
    insertTask: insertTaskTool,
    askUser: askUserTool,
  },
});
