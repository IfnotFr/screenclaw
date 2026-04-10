import { execFileSync, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createCanvas, loadImage } from "canvas";
import { config } from "#/core/config.js";
import { logger } from "#/core/index.js";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { OS } from "./os.js";

const MULTIPLE = 32;

const XDOTOOL_KEYS: Record<string, string> = {
  enter: "Return",
  return: "Return",
  tab: "Tab",
  space: "space",
  backspace: "BackSpace",
  esc: "Escape",
  escape: "Escape",
  del: "Delete",
  delete: "Delete",
  ins: "Insert",
  insert: "Insert",
  pgup: "Prior",
  pageup: "Prior",
  pgdn: "Next",
  pagedown: "Next",
  home: "Home",
  end: "End",
  up: "Up",
  down: "Down",
  left: "Left",
  right: "Right",
  ctrl: "Control",
  control: "Control",
  alt: "Alt",
  shift: "Shift",
  win: "Super",
  meta: "Super",
  super: "Super",
  command: "Super",
  cmd: "Super",
};

function mapKey(key: string): string {
  return XDOTOOL_KEYS[key.toLowerCase()] ?? key;
}

function xdo(...args: string[]) {
  execFileSync("xdotool", args);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseXrandrDisplays() {
  const output = execSync("xrandr --query", { encoding: "utf8" });
  const displays: Array<{ id: string; width: number; height: number; x: number; y: number; primary: boolean }> = [];
  for (const line of output.split("\n")) {
    const match = line.match(/^(\S+) connected (primary )?(\d+)x(\d+)\+(\d+)\+(\d+)/);
    if (match) {
      displays.push({
        id: match[1],
        primary: !!match[2],
        width: parseInt(match[3]),
        height: parseInt(match[4]),
        x: parseInt(match[5]),
        y: parseInt(match[6]),
      });
    }
  }
  return displays;
}

export const linux: OS = {
  setupDisplay() {
    if (!process.env.DISPLAY) process.env.DISPLAY = ":0";
    if (!process.env.XAUTHORITY) {
      try {
        const xpid = execSync("pgrep -x Xorg || pgrep -x Xwayland", { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }).trim().split("\n")[0];
        if (xpid) {
          const env = execSync(`cat /proc/${xpid}/environ`, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
          const match = env.split("\0").find(e => e.startsWith("XAUTHORITY="));
          if (match) { process.env.XAUTHORITY = match.slice("XAUTHORITY=".length); return; }
        }
      } catch {}
      const uid = process.getuid?.();
      if (uid !== undefined && existsSync(`/run/user/${uid}/Xauthority`)) {
        process.env.XAUTHORITY = `/run/user/${uid}/Xauthority`; return;
      }
      const home = process.env.HOME;
      if (home && existsSync(`${home}/.Xauthority`)) process.env.XAUTHORITY = `${home}/.Xauthority`;
    }
  },

  async listDisplays() {
    return parseXrandrDisplays();
  },

  toScreenAbsolute(x, y) {
    return { x: config.screen.xOffset + x, y: config.screen.yOffset + y };
  },

  toScreenRelative(absoluteX, absoluteY) {
    return {
      x: absoluteX - config.screen.xOffset,
      y: absoluteY - config.screen.yOffset,
    };
  },

  async takeScreenshot() {
    const displays = parseXrandrDisplays();
    const display = displays.find(d => d.id === config.screen.id) ?? displays[0];

    const tmpFile = path.join(os.tmpdir(), `screenclaw-${Date.now()}.png`);
    execFileSync("scrot", ["-a", `${display.x},${display.y},${display.width},${display.height}`, tmpFile]);
    const raw = await fs.readFile(tmpFile);
    await fs.unlink(tmpFile).catch(() => {});

    const originalImg = await loadImage(raw);
    const targetW = Math.ceil(originalImg.width / MULTIPLE) * MULTIPLE;
    const targetH = Math.ceil(originalImg.height / MULTIPLE) * MULTIPLE;

    const padCanvas = createCanvas(targetW, targetH);
    const ctx = padCanvas.getContext("2d");
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(originalImg, 0, 0);

    return padCanvas.toBuffer("image/png");
  },

  async highlightRegion(_x, _y, _w, _h) {
    // No-op on Linux for now
  },

  async mouseClick(x, y) {
    logger.log(`🖱️  Click at ${x}, ${y}`);
    const p = this.toScreenAbsolute(x, y);
    xdo("mousemove", "--sync", String(p.x), String(p.y));
    xdo("click", "1");
    await delay(500);
  },

  async mouseRightClick(x, y) {
    logger.log(`🖱️  Right Click at ${x}, ${y}`);
    const p = this.toScreenAbsolute(x, y);
    xdo("mousemove", "--sync", String(p.x), String(p.y));
    xdo("click", "3");
    await delay(500);
  },

  async mouseDoubleClick(x, y) {
    logger.log(`🖱️🖱️ Double Click at ${x}, ${y}`);
    const p = this.toScreenAbsolute(x, y);
    xdo("mousemove", "--sync", String(p.x), String(p.y));
    xdo("click", "--repeat", "2", "--delay", "100", "1");
    await delay(500);
  },

  async mouseMove(x, y) {
    logger.log(`🖱️ Move to ${x}, ${y}`);
    const p = this.toScreenAbsolute(x, y);
    xdo("mousemove", "--sync", String(p.x), String(p.y));
    await delay(500);
  },

  async mouseDragAndDrop(fromX, fromY, toX, toY) {
    logger.log(`🖱️ Drag from (${fromX}, ${fromY}) to (${toX}, ${toY})`);
    const from = this.toScreenAbsolute(fromX, fromY);
    const to = this.toScreenAbsolute(toX, toY);
    xdo("mousemove", "--sync", String(from.x), String(from.y));
    xdo("mousedown", "1");
    xdo("mousemove", "--sync", String(to.x), String(to.y));
    xdo("mouseup", "1");
    await delay(500);
  },

  async mouseScroll(direction, amount) {
    logger.log(`🖱️ Scroll ${direction} : ${amount}`);
    const buttonMap = { up: "4", down: "5", left: "6", right: "7" };
    xdo("click", "--repeat", String(amount), buttonMap[direction]);
    await delay(500);
  },

  async keyboardTypeText(text) {
    logger.log(`⌨️  Type text : "${text}"`);
    xdo("type", "--clearmodifiers", "--delay", "20", "--", text);
    await delay(500);
  },

  async executeHotkey(combination) {
    logger.log(`⌨️ Hotkey: ${combination.toUpperCase()}`);
    const mapped = combination
      .toLowerCase()
      .split("+")
      .map(mapKey)
      .join("+");
    xdo("key", "--clearmodifiers", mapped);
    await delay(500);
  },
};
