import { useComputer } from "#/core/index.js";
import { bootstrap as initExecutor } from "#/bootstrap.js";

async function test() {
  await initExecutor();
  const x = 800;
  const y = 200;
  console.log(`🛠️  Manual Test: Moving mouse to (${x}, ${y}) in 2 seconds...`);
  console.log("👉 ACTION: The mouse cursor should move to the top-center area.");

  await new Promise(r => setTimeout(r, 2000));
  await useComputer().mouseMove(x, y);

  console.log("✅ Action performed.");
  console.log(`🕵️  VERIFICATION: Is the mouse cursor now at (${x}, ${y})?`);
}

test().catch(console.error);
