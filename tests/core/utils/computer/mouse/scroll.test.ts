import { useComputer } from "#/core/index.js";
import { bootstrap as initExecutor } from "#/bootstrap.js";

async function test() {
  await initExecutor();
  const amount = 5;
  console.log(`🛠️  Manual Test: Scrolling DOWN by ${amount} units in 2 seconds...`);
  console.log("👉 ACTION: Focus a scrollable area. The screen should scroll down.");

  await new Promise(r => setTimeout(r, 2000));
  await useComputer().mouseScroll("down", amount);

  console.log("✅ Action performed.");
}

test().catch(console.error);
