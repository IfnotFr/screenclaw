import { useComputer } from "#/core/index.js";
import { bootstrap as initExecutor } from "#/bootstrap.js";
import fs from "node:fs/promises";

async function test() {
  await initExecutor();
  console.log("🛠️  Manual Test: Taking a screenshot in 2 seconds...");

  await new Promise(r => setTimeout(r, 2000));
  const buffer = await useComputer().takeScreenshot();

  const filename = `test-screenshot-${Date.now()}.png`;
  await fs.writeFile(filename, buffer);

  console.log(`✅ Screenshot saved as: ${filename}`);
}

test().catch(console.error);
