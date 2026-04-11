import * as fs from "node:fs/promises";
import * as path from "node:path";
import { streamText, Output, generateText } from "ai";
import { z } from "zod";
import { useMission } from "ai-sdk-agentic";
import { useComputer, getModel, logger } from "#/core/index.js";

export function useSkill() {
  const rootSkillsDir = path.join(process.cwd(), "skills");

  async function list(type: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(path.join(rootSkillsDir, type), { withFileTypes: true });
      return entries.filter(e => e.isDirectory()).map(e => `${type}/${e.name}`);
    } catch {
      return [];
    }
  }

  async function get(fullId: string): Promise<{ id: string, content: string, raw: string } | null> {
    try {
      const [type, name] = fullId.split("/");
      if (!type || !name) return null;
      const raw = await fs.readFile(path.join(rootSkillsDir, type, name, "SKILL.md"), "utf-8");
      return { id: fullId, raw, content: raw.replace(/^---[\s\S]*?---/, "").trim() };
    } catch {
      return null;
    }
  }

  async function getRegistry(type: string): Promise<{ id: string, description: string }[]> {
    const ids = await list(type);
    const skills = await Promise.all(ids.map(get));
    return skills.flatMap((skill, i) => {
      if (!skill) return [];
      const description = skill.raw.match(/description:\s*"?([^"\n]+)"?/)?.[1] || "";
      return [{ id: ids[i], description }];
    });
  }

  async function getCategoryGuide(type: string): Promise<string> {
    try {
      return await fs.readFile(path.join(rootSkillsDir, type, "SKILL.md"), "utf-8");
    } catch {
      return `Identify the ${type} matching the current screen.`;
    }
  }

  async function enable(fullId: string): Promise<void> {
    const { context } = useMission();
    const loadedSkills = (context.loadedSkills as string[]) || [];
    if (!loadedSkills.includes(fullId) && await get(fullId)) {
      context.loadedSkills = [...loadedSkills, fullId];
    }
  }

  async function disable(fullId: string): Promise<void> {
    const { context } = useMission();
    const loadedSkills = (context.loadedSkills as string[]) || [];
    context.loadedSkills = loadedSkills.filter(id => id !== fullId);
  }

  async function getActiveVisualAnchors(): Promise<string> {
    const { context } = useMission();
    const loadedSkills = (context.loadedSkills as string[]) || [];
    if (loadedSkills.length === 0) return "";

    const sections: string[] = [];
    for (const id of loadedSkills) {
      const skill = await get(id);
      if (!skill) continue;
      const title = skill.content.match(/^#\s+(.+)$/m)?.[1];
      const anchors = skill.content.match(/^## Visual Anchors\n([\s\S]*?)(?=\n^#|$)/m)?.[1];
      if (title && anchors) sections.push(`\n[${title.toUpperCase()}]\n${anchors.trim()}`);
    }

    return sections.length > 0 ? `\n### ACTIVE VISUAL MAPS\n${sections.join("\n")}` : "";
  }

  async function sync(): Promise<string | null> {
    const { context } = useMission();
    const primaryBefore = context.primarySkill as string | null;
    const secondaryBefore = context.secondarySkill as string | null;

    logger.log("💡 Sync Skills: Detecting active context...");

    const screenshot = await useComputer().takeScreenshot();
    const model = getModel();

    // --- DETECT APP ---
    const { appId: detectedApp } = generateText({
      model,
      output: Output.object({ schema: z.object({ appId: z.string().nullable() }) }),
      messages: [{
        role: "user", content: [
          { type: "text", text: `IDENTIFY APP:\n${await getCategoryGuide("app")}\n\nAVAILABLE APPS:\n${(await getRegistry("app")).map(s => `- ${s.id}: ${s.description}`).join("\n")}` },
          { type: "image", image: screenshot },
        ]
      }],
    }) as any

    if (detectedApp !== primaryBefore) {
      logger.log(`💡 SKILL: ${primaryBefore || "none"} -> ${detectedApp || "none"}`);
      if (primaryBefore) await disable(primaryBefore);
      if (secondaryBefore) await disable(secondaryBefore);
      if (detectedApp) await enable(detectedApp);
      context.primarySkill = detectedApp;
      context.secondarySkill = null;
    }

    // --- DETECT WEBSITE (only if browser is active) ---
    if (context.primarySkill === "app/browser") {
      const webResult = streamText({
        model,
        output: Output.object({ schema: z.object({ websiteId: z.string().nullable() }) }),
        messages: [{
          role: "user", content: [
            { type: "text", text: `IDENTIFY WEBSITE:\n${await getCategoryGuide("website")}\n\nAVAILABLE WEBSITES:\n${(await getRegistry("website")).map(s => `- ${s.id}: ${s.description}`).join("\n")}` },
            { type: "image", image: screenshot },
          ]
        }],
      });
      await logger.chat(webResult.textStream);
      const { websiteId: detectedWeb } = await webResult.output;

      if (detectedWeb !== secondaryBefore) {
        logger.log(`💡 SUB-SKILL: ${secondaryBefore || "none"} -> ${detectedWeb || "none"}`);
        if (secondaryBefore) await disable(secondaryBefore);
        if (detectedWeb) await enable(detectedWeb);
        context.secondarySkill = detectedWeb;
      }
    }

    const primaryAfter = context.primarySkill as string | null;
    const secondaryAfter = context.secondarySkill as string | null;
    if (primaryBefore === primaryAfter && secondaryBefore === secondaryAfter) return null;

    let instructions = "";
    const primary = await get(primaryAfter as string);
    const secondary = await get(secondaryAfter as string);
    if (primary) instructions += `\n--- PRIMARY SKILL GUIDE (${primaryAfter}) ---\n${primary.content}\n`;
    if (secondary) instructions += `\n--- SECONDARY SKILL GUIDE (${secondaryAfter}) ---\n${secondary.content}\n`;
    return instructions || null;
  }

  return { list, getActiveVisualAnchors, sync };
}
