import { useComputer } from "#/core/index.js";
import { bootstrap as initExecutor } from "#/bootstrap.js";

async function test() {
  await initExecutor();
  console.log("🛠️  Manual Test: Executing 'win' hotkey in 2 seconds...");
  console.log("👉 ACTION: Ensure no other shortcuts are being pressed. The Start menu should open.");

  await new Promise(r => setTimeout(r, 2000));
  await useComputer().executeHotkey("win");

  console.log("✅ Action performed.");
}

test().catch(console.error);
