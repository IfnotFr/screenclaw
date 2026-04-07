import screenshot from "screenshot-desktop";
import "dotenv/config";
import { config } from "#/core/config.js";

export async function bootstrap() {
  const targetId = process.env.SCREEN_ID;
  if (!targetId) throw new Error("SCREEN_ID is not set in .env — run screen-claw to configure it.");

  const displays = await (screenshot as any).listDisplays() as any[];
  const selected = displays.find(d => String(d.id) === targetId || String(d.name) === targetId);
  if (!selected) throw new Error(`SCREEN_ID "${targetId}" not found. Available: ${displays.map(d => d.id || d.name).join(", ")}`);

  config.screen = {
    id: String(selected.id || selected.name),
    xOffset: Number(selected.offsetX || 0),
    yOffset: Number(selected.offsetY || 0),
    width: Number(selected.width || 1920),
    height: Number(selected.height || 1080),
  };
}
