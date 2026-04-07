import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";

export const missionsRouter = Router();

const dir = () => path.join(process.cwd(), "missions");

missionsRouter.get("/", async (_req, res) => {
  try {
    const files = (await fs.readdir(dir())).filter(f => f.endsWith(".md") && !f.endsWith(".log.md"));
    const missions = files.map(f => ({ id: f.replace(/\.md$/, ""), title: f.replace(/\.md$/, "") }));
    res.json(missions);
  } catch { res.json([]); }
});

missionsRouter.get("/:id", async (req, res) => {
  try {
    const content = await fs.readFile(path.join(dir(), `${req.params.id}.md`), "utf-8");
    res.json({ id: req.params.id, content });
  } catch { res.status(404).json({ error: "Not found" }); }
});

missionsRouter.post("/", async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: "title required" });
  const id = title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const filePath = path.join(dir(), `${id}.md`);
  const content = `# ${title}\n\n## Goal\n\n## Frequency\n`;
  await fs.writeFile(filePath, content);
  res.json({ id, content });
});

missionsRouter.put("/:id", async (req, res) => {
  const { content } = req.body;
  if (content === undefined) return res.status(400).json({ error: "content required" });
  await fs.writeFile(path.join(dir(), `${req.params.id}.md`), content);
  res.json({ ok: true });
});

missionsRouter.delete("/:id", async (req, res) => {
  try {
    await fs.unlink(path.join(dir(), `${req.params.id}.md`));
    res.json({ ok: true });
  } catch { res.status(404).json({ error: "Not found" }); }
});
