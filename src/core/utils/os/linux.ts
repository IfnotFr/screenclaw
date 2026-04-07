import { execFileSync } from "node:child_process";
import { createCanvas, loadImage } from "canvas";
import screenshot from "screenshot-desktop";
import { config } from "#/core/config.js";
import { logger } from "#/core/index.js";
import fs from "node:fs/promises";
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

export const linux: OS = {
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
    const buffer = await screenshot({ format: "png", screen: config.screen.id });

    const originalImg = await loadImage(buffer);
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
