import { createOpenAI } from "@ai-sdk/openai";

const base = (process.env.LLM_SERVER_URL || "http://localhost:11434").replace(/\/+$/, "");
const openai = createOpenAI({
  baseURL: `${base}/v1`,
  apiKey: "none",
});

export function getModel() {
  const model = process.env.MODEL_ID;
  if (!model) throw new Error("MODEL_ID is not set in .env");
  return openai.chat(model);
}
