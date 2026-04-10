import { config } from "#/core/config.js";
import { useComputer } from "#/core/utils/use-computer.js";

export async function bootstrap() {
  const computer = useComputer();
  computer.setupDisplay();

  const targetId = process.env.SCREEN_ID;
  if (!targetId) throw new Error("SCREEN_ID is not set in .env — run screen-claw to configure it.");

  config.screen.id = targetId;

  const displays = await computer.listDisplays();
  const display = displays.find(d => d.id === targetId);
  if (display) {
    config.screen.xOffset = display.x;
    config.screen.yOffset = display.y;
  }
}
