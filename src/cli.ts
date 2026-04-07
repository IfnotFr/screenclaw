import { fileURLToPath } from "url";
import { dirname, join } from "path";
import * as fs from "fs/promises";
import * as p from "@clack/prompts";
import chalk from "chalk";
import boxen from "boxen";
import screenshot from "screenshot-desktop";
import { execSync } from "child_process";
import * as net from "net";

const PACKAGE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");

async function exists(p: string): Promise<boolean> {
  try { await fs.access(p); return true; } catch { return false; }
}

async function copyDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  for (const entry of await fs.readdir(src, { withFileTypes: true })) {
    const from = join(src, entry.name);
    const to = join(dest, entry.name);
    if (entry.isDirectory()) await copyDir(from, to);
    else await fs.copyFile(from, to);
  }
}

function printHeader() {
  console.log();
  console.log(chalk.cyan("  ███████╗ ██████╗██████╗ ███████╗███████╗███╗   ██╗"));
  console.log(chalk.cyan("  ██╔════╝██╔════╝██╔══██╗██╔════╝██╔════╝████╗  ██║"));
  console.log(chalk.cyan("  ███████╗██║     ██████╔╝█████╗  █████╗  ██╔██╗ ██║"));
  console.log(chalk.cyan("  ╚════██║██║     ██╔══██╗██╔══╝  ██╔══╝  ██║╚██╗██║"));
  console.log(chalk.cyan("  ███████║╚██████╗██║  ██║███████╗███████╗██║ ╚████║"));
  console.log(chalk.cyan("  ╚══════╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚══════╝╚═╝  ╚═══╝"));
  console.log();
  console.log(chalk.cyan("   ██████╗██╗      █████╗ ██╗    ██╗"));
  console.log(chalk.cyan("  ██╔════╝██║     ██╔══██╗██║    ██║"));
  console.log(chalk.cyan("  ██║     ██║     ███████║██║ █╗ ██║"));
  console.log(chalk.cyan("  ██║     ██║     ██╔══██║██║███╗██║"));
  console.log(chalk.cyan("  ╚██████╗███████╗██║  ██║╚███╔███╔╝"));
  console.log(chalk.cyan("   ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ") + chalk.dim("v0.1.0"));
  console.log();
  const adminPort = process.env.ADMIN_PORT || "3010";
  console.log("  " + chalk.white("Admin   ") + chalk.white(`http://localhost:${adminPort}`));
  console.log("  " + chalk.dim("GitHub  ") + chalk.blue.underline("https://github.com/your-org/screen-claw"));
  console.log("  " + chalk.dim("Docs    ") + chalk.blue.underline("https://screen-claw.dev/docs"));
  console.log();
}

async function onboard(cwd: string): Promise<void> {
  p.intro(chalk.bgCyan(chalk.black(" Setting up screen-claw ")));

  if (process.platform !== "linux") {
    p.log.error(`Unsupported OS: ${process.platform}. screen-claw requires Linux.`);
    process.exit(1);
  }

  try {
    execSync("which xdotool", { stdio: "ignore" });
  } catch {
    p.log.error("Missing dependency: xdotool\nRun: sudo apt install -y xdotool");
    process.exit(1);
  }

  p.note(
    [
      `${chalk.cyan("missions/")}    your agent mission files`,
      `${chalk.cyan("skills/")}      domain-specific instruction files`,
      `${chalk.cyan(".storage/")}    runtime state and logs`,
      `${chalk.cyan(".env.example")} environment variables template`,
    ].join("\n"),
    "The following will be created in " + chalk.dim(cwd)
  );

  const proceed = await p.confirm({ message: "Proceed with setup?" });

  if (p.isCancel(proceed) || !proceed) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  const spinner = p.spinner();
  spinner.start("Copying files...");

  await copyDir(join(PACKAGE_DIR, "skills"), join(cwd, "skills"));
  await copyDir(join(PACKAGE_DIR, "missions"), join(cwd, "missions"));
  await fs.mkdir(join(cwd, ".storage"), { recursive: true });
  await fs.copyFile(join(PACKAGE_DIR, ".env.example"), join(cwd, ".env.example"));

  spinner.stop("Files created.");

  const configureEnv = await p.confirm({ message: "Configure your .env now?" });

  if (p.isCancel(configureEnv)) { p.cancel("Setup cancelled."); process.exit(0); }

  if (configureEnv) {
    const values = await p.group(
      {
        adminPort: () => p.text({
          message: "Admin panel port",
          defaultValue: "3010",
          placeholder: "3010",
        }),
        llmServerUrl: () => p.text({
          message: "LLM server URL",
          placeholder: "http://localhost:4000",
          defaultValue: "http://localhost:4000",
        }),
        modelId: () => p.text({
          message: "Model ID " + chalk.dim("(the model name served by your LLM server)"),
          placeholder: "qwen3.5-9b",
          defaultValue: "qwen3.5-9b",
        }),
        schedulerCron: async () => {
          const preset = await p.select({
            message: "Scheduler frequency",
            options: [
              { value: "* * * * *",    label: "Every minute",   hint: "* * * * *" },
              { value: "*/5 * * * *",  label: "Every 5 min",   hint: "*/5 * * * *" },
              { value: "*/15 * * * *", label: "Every 15 min",  hint: "*/15 * * * *" },
              { value: "*/30 * * * *", label: "Every 30 min",  hint: "*/30 * * * *" },
              { value: "0 * * * *",    label: "Every hour",    hint: "0 * * * *" },
              { value: "custom",       label: "Custom cron expression" },
            ],
          });
          if (p.isCancel(preset)) { p.cancel("Setup cancelled."); process.exit(0); }
          if (preset !== "custom") return preset as string;
          return p.text({
            message: "Cron expression",
            placeholder: "0 */6 * * *",
            validate: v => !v ? "Required" : undefined,
          });
        },
        screenId: async () => {
          const displays = await (screenshot as any).listDisplays() as any[];
          return p.select({
            message: "Select screen to capture",
            options: displays.map(d => ({
              value: String(d.id || d.name),
              label: `${d.id || d.name}`,
              hint: `${d.width}x${d.height}${d.primary ? " · primary" : ""}`,
            })),
          });
        },
      },
      { onCancel: () => { p.cancel("Setup cancelled."); process.exit(0); } }
    );

    const envContent = [
      `ADMIN_PORT=${values.adminPort || "3010"}`,
      `LLM_SERVER_URL=${values.llmServerUrl}`,
      `MODEL_ID=${values.modelId}`,
      `SCHEDULER_CRON=${values.schedulerCron || "* * * * *"}`,
      `SCREEN_ID=${values.screenId || ""}`,
    ].join("\n") + "\n";

    await fs.writeFile(join(cwd, ".env"), envContent);
    p.log.success(".env created.");

    // --- Verify configuration ---
    const baseUrl = (values.llmServerUrl || "http://localhost:4000").replace(/\/+$/, "");

    const s1 = p.spinner();
    s1.start("Checking LLM server...");
    try {
      const res = await fetch(`${baseUrl}/v1/models`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      s1.stop(chalk.green("✓") + " LLM server reachable.");

      const s2 = p.spinner();
      s2.start(`Checking model "${values.modelId}"...`);
      const data = await res.json() as any;
      const models: string[] = (data.data ?? []).map((m: any) => m.id);
      if (models.length && !models.includes(values.modelId)) {
        s2.stop(chalk.yellow("⚠") + ` Model "${values.modelId}" not found. Available: ${models.join(", ")}`);
      } else {
        s2.stop(chalk.green("✓") + ` Model "${values.modelId}" available.`);
      }
    } catch (e: any) {
      s1.stop(chalk.yellow("⚠") + ` LLM server unreachable (${e.message}). You can start it later.`);
    }

    const s3 = p.spinner();
    s3.start(`Checking port ${values.adminPort || "3010"}...`);
    const port = Number(values.adminPort || 3010);
    const portFree = await new Promise<boolean>(resolve => {
      const srv = net.createServer();
      srv.once("error", () => resolve(false));
      srv.once("listening", () => { srv.close(); resolve(true); });
      srv.listen(port);
    });
    portFree
      ? s3.stop(chalk.green("✓") + ` Port ${port} is available.`)
      : s3.stop(chalk.yellow("⚠") + ` Port ${port} is already in use. Change ADMIN_PORT in .env if needed.`);
  } else {
    p.log.info(`Edit ${chalk.cyan(".env.example")}, rename it to ${chalk.cyan(".env")}, and fill in your values.`);
  }

  p.outro(chalk.green("You're all set! Run screen-claw again to start."));
  process.exit(0);
}

async function main() {
  printHeader();

  const cwd = process.cwd();
  const isSetup = await exists(join(cwd, "missions")) && await exists(join(cwd, "skills"));

  if (!isSetup) await onboard(cwd);

  const missionsDir = join(cwd, "missions");
  const missionFiles = await fs.readdir(missionsDir).then(f => f.filter(f => f.endsWith(".md") && !f.endsWith(".log.md"))).catch(() => []);
  if (missionFiles.length === 0) {
    const adminPort = process.env.ADMIN_PORT || "3010";
    console.log(boxen(
      chalk.yellow.bold("⚠  No missions found") + "\n\n" +
      `${chalk.dim("→")} Create one via the dashboard:\n` +
      `  ${chalk.white(`http://localhost:${adminPort}`)}\n\n` +
      `${chalk.dim("→")} Or drop a ${chalk.white(".md")} file in:\n` +
      `  ${chalk.white(missionsDir)}`,
      { padding: 1, margin: { top: 0, bottom: 1, left: 2, right: 2 }, borderStyle: "round", borderColor: "yellow" }
    ));
  }

  const { start } = await import("./run-server.js");
  await start();
}

main().catch(e => { console.error(e); process.exit(1); });
