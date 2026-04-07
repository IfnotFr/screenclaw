import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    cli: "src/cli.ts",
    "run-agent": "src/run-agent.ts",
  },
  format: ["esm"],
  platform: "node",
  target: "node20",
  outDir: "dist",
  bundle: true,
  // Bundle the local file: deps, keep real npm packages external
  noExternal: ["ai-sdk-agentic", "ai-sdk-office-server"],
  external: [
    "canvas",
    "screenshot-desktop",
    "node-cron",
    "dotenv",
    "chalk",
    "zod",
    "ai",
    "@ai-sdk/openai",
    "@clack/prompts",
  ],
  clean: true,
  banner: {
    js: "#!/usr/bin/env node\nimport { createRequire } from 'module';\nconst require = createRequire(import.meta.url);",
  },
});
