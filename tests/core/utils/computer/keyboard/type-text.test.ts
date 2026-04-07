import { useComputer } from "#/core/index.js";
import { bootstrap as initExecutor } from "#/bootstrap.js";

async function test() {
  await initExecutor();
  console.log("🛠️  Manual Test: Typing 'Hello World' in 2 seconds...");
  console.log("👉 ACTION: Focus a text input field now.");

  await new Promise(r => setTimeout(r, 2000));
  await useComputer().keyboardTypeText("Hello World");

  console.log("✅ Action performed.");
}

test().catch(console.error);
