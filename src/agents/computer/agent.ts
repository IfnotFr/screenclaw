import { ToolLoopAgent } from "ai";
import { useModel } from "#/core/index.js";
import { mouseClickTool } from "./tools/mouse-click.js";
import { mouseRightClickTool } from "./tools/mouse-right-click.js";
import { mouseDoubleClickTool } from "./tools/mouse-double-click.js";
import { mouseDragAndDropTool } from "./tools/mouse-drag-and-drop.js";
import { mouseScrollTool } from "./tools/mouse-scroll.js";
import { mouseMoveTool } from "./tools/mouse-move.js";
import { keyboardTypeTextTool } from "./tools/keyboard-type-text.js";
import { executeHotkeyTool } from "./tools/execute-hotkey.js";
import { getItemCoordinatesTool } from "./tools/get-item-coordinates.js";

export const COMPUTER_INSTRUCTIONS = `### MISSION
Expert operator controlling a desktop environment via raw mouse and keyboard actions.

### WORKFLOW
1. **LOCATE**: Use 'getItemCoordinates' to find the (x, y) coordinates. Provide all details from the request:
   - **element**: The text or name of the target.
   - **description**: Its visual appearance (color, shape, state).
   - **anchor**: Its position relative to other elements.
2. **ACT**: Perform actions using the raw tools (mouseClick, dragAndDrop, executeHotkey, etc.).

### RULES
- **Granularity**: Perform actions step-by-step (e.g., Click field -> Type text -> executeHotkey("enter")).
- **Precision**: You work with raw (x, y) coordinates. Never guess coordinates; always use 'getItemCoordinates' first with ALL metadata provided in the request.
- **Disambiguation**: If an ANCHOR or DESCRIPTION is provided, you MUST use them in 'getItemCoordinates' to find the correct element.
- **Focus before scroll**: Before scrolling, always click on the content area first to ensure the page has focus.
- **You cannot read**: You have no ability to read or extract text from the screen. If the task requires reading information, stop and report back immediately.
- **No Hidden Loops**: If an action fails or an element is not found, report it immediately.
- **Verbosity**: Always explain what you are about to do in a single, clear sentence before calling any tool.`;

/**
 * Computer Agent: The worker.
 * Expert operator controlling the OS via mouse and keyboard.
 */
export const computerAgent = new ToolLoopAgent({
  model: useModel().get(),
  instructions: COMPUTER_INSTRUCTIONS,
  tools: {
    getItemCoordinates: getItemCoordinatesTool,
    mouseClick: mouseClickTool,
    mouseRightClick: mouseRightClickTool,
    mouseDoubleClick: mouseDoubleClickTool,
    mouseDragAndDrop: mouseDragAndDropTool,
    mouseScroll: mouseScrollTool,
    mouseMove: mouseMoveTool,
    keyboardTypeText: keyboardTypeTextTool,
    executeHotkey: executeHotkeyTool,
  },
});
