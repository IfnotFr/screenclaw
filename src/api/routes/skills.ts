import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";

export const skillsRouter = Router();

const dir = () => path.join(process.cwd(), "skills");

async function listSkills(): Promise<{ id: string; description: string }[]> {
  const results: { id: string; description: string }[] = [];
  for (const type of ["app", "website"]) {
    try {
      const entries = await fs.readdir(path.join(dir(), type), { withFileTypes: true });
      for (const e of entries.filter(e => e.isDirectory())) {
        const id = `${type}/${e.name}`;
        try {
          const raw = await fs.readFile(path.join(dir(), type, e.name, "SKILL.md"), "utf-8");
          const description = raw.match(/description:\s*"?([^"\n]+)"?/)?.[1] || "";
          results.push({ id, description });
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }
  return results;
}

skillsRouter.get("/", async (_req, res) => {
  res.json(await listSkills());
});

skillsRouter.get("/:type/:name", async (req, res) => {
  try {
    const filePath = path.join(dir(), req.params.type, req.params.name, "SKILL.md");
    const content = await fs.readFile(filePath, "utf-8");
    res.json({ id: `${req.params.type}/${req.params.name}`, content });
  } catch { res.status(404).json({ error: "Not found" }); }
});

skillsRouter.put("/:type/:name", async (req, res) => {
  const { content } = req.body;
  if (content === undefined) return res.status(400).json({ error: "content required" });
  const filePath = path.join(dir(), req.params.type, req.params.name, "SKILL.md");
  await fs.writeFile(filePath, content);
  res.json({ ok: true });
});
