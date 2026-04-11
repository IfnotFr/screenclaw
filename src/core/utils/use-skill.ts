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

  async function get(fullId: string): Promise<{ id: string, content: string, raw: string, subtype: string | null } | null> {
    try {
      const [type, name] = fullId.split("/");
      if (!type || !name) return null;
      const raw = await fs.readFile(path.join(rootSkillsDir, type, name, "SKILL.md"), "utf-8");
      const subtype = raw.match(/^subtype:\s*(\S+)/m)?.[1] ?? null;
      return { id: fullId, raw, content: raw.replace(/^---[\s\S]*?---/, "").trim(), subtype };
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
    const level1Before = context.level1Skill as string | null;
    const level2Before = context.level2Skill as string | null;

    logger.log("💡 Sync Skills: Detecting active context...");

    const screenshot = await useComputer().takeScreenshot();
    const model = getModel();

    // --- DETECT LEVEL 1 (app) ---
    const appResult = await generateText({
      model,
      output: Output.object({ schema: z.object({ skillId: z.string().nullable() }) }),
      messages: [{
        role: "user", content: [
          { type: "text", text: `IDENTIFY APP:\n${await getCategoryGuide("app")}\n\nAVAILABLE APPS:\n${(await getRegistry("app")).map(s => `- ${s.id}: ${s.description}`).join("\n")}` },
          { type: "image", image: screenshot },
        ]
      }],
    });
    const { skillId: detectedLevel1 } = appResult.output;

    if (detectedLevel1 !== level1Before) {
      logger.log(`  - SKILL L1: ${level1Before || "none"} -> ${detectedLevel1 || "none"}`);
      if (level1Before) await disable(level1Before);
      if (level2Before) await disable(level2Before);
      if (detectedLevel1) await enable(detectedLevel1);
      context.level1Skill = detectedLevel1;
      context.level2Skill = null;
    }

    // --- DETECT LEVEL 2 (if the active level-1 skill declares a subtype) ---
    const level1Skill = detectedLevel1 ? await get(detectedLevel1) : null;
    const subtype = level1Skill?.subtype ?? null;

    if (subtype) {
      const subResult = streamText({
        model,
        output: Output.object({ schema: z.object({ skillId: z.string().nullable() }) }),
        messages: [{
          role: "user", content: [
            { type: "text", text: `IDENTIFY ${subtype.toUpperCase()}:\n${await getCategoryGuide(subtype)}\n\nAVAILABLE:\n${(await getRegistry(subtype)).map(s => `- ${s.id}: ${s.description}`).join("\n")}` },
            { type: "image", image: screenshot },
          ]
        }],
      });
      await logger.chat(subResult.textStream);
      const { skillId: detectedLevel2 } = await subResult.output;

      const currentLevel2 = context.level2Skill as string | null;
      if (detectedLevel2 !== currentLevel2) {
        logger.log(`  - SKILL L2: ${currentLevel2 || "none"} -> ${detectedLevel2 || "none"}`);
        if (currentLevel2) await disable(currentLevel2);
        if (detectedLevel2) await enable(detectedLevel2);
        context.level2Skill = detectedLevel2;
      }
    } else if (context.level2Skill) {
      await disable(context.level2Skill as string);
      context.level2Skill = null;
    }

    const level1After = context.level1Skill as string | null;
    const level2After = context.level2Skill as string | null;
    if (level1Before === level1After && level2Before === level2After) return null;

    let instructions = "";
    const skill1 = await get(level1After as string);
    const skill2 = await get(level2After as string);
    if (skill1) instructions += `\n--- SKILL LEVEL 1 GUIDE (${level1After}) ---\n${skill1.content}\n`;
    if (skill2) instructions += `\n--- SKILL LEVEL 2 GUIDE (${level2After}) ---\n${skill2.content}\n`;
    return instructions || null;
  }

  return { list, getActiveVisualAnchors, sync };
}
