import { bootstrap } from "./bootstrap.js";
import { agents, AgentRole } from "./hub.js";

async function main() {
  await bootstrap();

  const args = process.argv.slice(2);

  let agentKey: AgentRole = "runner";
  let prompt = "";

  if (args.length === 1) {
    prompt = args[0];
  } else if (args.length >= 2) {
    const firstArg = args[0].toLowerCase();
    if (firstArg in agents) {
      agentKey = firstArg as AgentRole;
      prompt = args.slice(1).join(" ");
    } else {
      prompt = args.join(" ");
    }
  }

  if (!prompt) {
    console.log("\x1b[31m%s\x1b[0m", "Error: No prompt provided.");
    console.log(
      'Usage: npm run agent [runner|computer|scheduler] "Your prompt"',
    );
    process.exit(1);
  }

  const agent = agents[agentKey];

  console.log(`--- 🤖 Agentic CLI (${agentKey.toUpperCase()} Mode) ---`);
  console.log(`🚀 Task: "${prompt}"\n`);

  // Mission ID for storage directory naming
  const missionId = `cli-${Date.now()}`;

  try {
    // Switch to stream() for real-time log updates
    const result = await agent.stream({ id: missionId, prompt });

    // We wait for the stream to complete
    const text = await result.text;

    console.log("\n--- ✅ MISSION COMPLETED ---");
    console.log(text);
  } catch (e) {
    console.error(`\n❌ Error: ${e}`);
  } finally {
    setTimeout(() => process.exit(0), 1000);
  }
}

main();
