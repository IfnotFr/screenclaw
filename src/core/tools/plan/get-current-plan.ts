import { tool } from "ai";
import { z } from "zod";
import { useStorage } from "#/core/index.js";

const inputSchema = z.object({});

/**
 * Tool: Get Current Plan
 * Reads the ongoing mission memory (Markdown checklist).
 */
export const getCurrentPlanTool = tool({
  description: "Read the mission memory to see what's done and what's next.",
  inputSchema,
  execute: async () => {
    try {
      const storage = useStorage();
      if (!storage) throw new Error("Storage not available.");
      const plan = await storage.readMemory();
      return { 
        status: "success", 
        plan: plan || "No memory found. Please create one with updateCurrentPlan." 
      };
    } catch (e: any) {
      return { status: "error", message: e.message };
    }
  }
});
