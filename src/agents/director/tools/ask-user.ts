import { tool } from "ai";
import { z } from "zod";
import readline from "node:readline";
import { logger } from "#/core/index.js";

export const askUserTool = tool({
  description: "Ask the user a question and wait for their answer. Use this to validate the plan, request credentials, confirm a risky action, or resolve an ambiguity.",
  inputSchema: z.object({
    question: z.string().describe("The question to ask the user."),
  }),
  execute: async ({ question }) => {
    try {
      logger.log(`❓ ${question}`);

      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const answer = await new Promise<string>(resolve => {
        rl.question("> ", resolve);
      });
      rl.close();

      logger.log(`💬 User: ${answer}`);
      return { status: "success", answer };
    } catch (e: any) {
      return { status: "error", message: e.message };
    }
  },
});
