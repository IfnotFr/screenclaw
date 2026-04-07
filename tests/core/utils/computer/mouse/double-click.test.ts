import { useComputer } from "#/core/index.js";
import { bootstrap as initExecutor } from "#/bootstrap.js";
import { config } from "#/core/config.js";

async function test() {
  await initExecutor();
  const x = 100;
  const y = 100;
  console.log(`🛠️  Manual Test: Double-clicking at (${x}, ${y}) on screen ${config.screen.id} in 2 seconds...`);
  console.log("👉 ACTION: The mouse should move to the top-left area and perform a double-click.");

  await new Promise(r => setTimeout(r, 2000));
  await useComputer().mouseDoubleClick(x, y);

  console.log("✅ Action performed.");
  console.log(`🕵️  VERIFICATION: Did the mouse move to ${x},${y} and perform a double-click? (e.g. opened a folder or selected a word)`);
}

test().catch(console.error);
