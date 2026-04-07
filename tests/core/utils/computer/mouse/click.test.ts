import { useComputer } from "#/core/index.js";
import { bootstrap as initExecutor } from "#/bootstrap.js";
import { config } from "#/core/config.js";

async function test() {
  await initExecutor();
  const x = 500;
  const y = 500;
  console.log(`🛠️  Manual Test: Clicking at (${x}, ${y}) on screen ${config.screen.id} in 2 seconds...`);
  console.log("👉 ACTION: The mouse should jump to the middle of the screen and perform a left click.");

  await new Promise(r => setTimeout(r, 2000));
  await useComputer().mouseClick(x, y);

  console.log("✅ Action performed.");
  console.log(`🕵️  VERIFICATION: Did the mouse move to ${x},${y} and click?`);
}

test().catch(console.error);
