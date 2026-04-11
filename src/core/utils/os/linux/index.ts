import { execSync, execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { logger } from "#/core/index.js";
import type { OS } from "../os.js";
import {
  EV_KEY, EV_REL, EV_ABS,
  BTN_LEFT, BTN_RIGHT, BTN_MIDDLE,
  REL_WHEEL, REL_HWHEEL,
  ABS_X, ABS_Y,
  getUinputFd, emitEvent, syncDevice, toAbs, pressKey, delay,
  uinputWritable, UINPUT_SETUP_CMD,
} from "./uinput.js";
import { typeChar, resolveKeyCode } from "./keyboard.js";
import { takeScreenshot, captureViaPortal, portalAvailable, DEPS } from "./screenshot.js";

export const linux: OS = {
  async setup() {
    if (!process.env.DISPLAY) process.env.DISPLAY = ":0";

    const needFromProc = ["XAUTHORITY", "WAYLAND_DISPLAY", "XDG_CURRENT_DESKTOP", "DBUS_SESSION_BUS_ADDRESS"]
      .filter(k => !process.env[k]);

    if (needFromProc.length > 0) {
      try {
        const xpid = execSync("pgrep -x Xorg || pgrep -x Xwayland", {
          encoding: "utf8", stdio: ["pipe", "pipe", "ignore"],
        }).trim().split("\n")[0];
        if (xpid) {
          const vars = execSync(`cat /proc/${xpid}/environ`, {
            encoding: "utf8", stdio: ["pipe", "pipe", "ignore"],
          }).split("\0");
          for (const key of needFromProc) {
            const v = vars.find(e => e.startsWith(`${key}=`));
            if (v) process.env[key] = v.slice(key.length + 1);
          }
        }
      } catch {}
    }

    if (!process.env.XAUTHORITY) {
      const uid = process.getuid?.();
      if (uid !== undefined && existsSync(`/run/user/${uid}/Xauthority`)) {
        process.env.XAUTHORITY = `/run/user/${uid}/Xauthority`;
      } else {
        const home = process.env.HOME;
        if (home && existsSync(`${home}/.Xauthority`)) process.env.XAUTHORITY = `${home}/.Xauthority`;
      }
    }

    const uid = process.getuid?.();
    const runtimeDir = process.env.XDG_RUNTIME_DIR ?? (uid !== undefined ? `/run/user/${uid}` : undefined);

    if (!process.env.WAYLAND_DISPLAY && runtimeDir && existsSync(`${runtimeDir}/wayland-0`)) {
      process.env.WAYLAND_DISPLAY = "wayland-0";
    }

    if (!process.env.DBUS_SESSION_BUS_ADDRESS && runtimeDir && existsSync(`${runtimeDir}/bus`)) {
      process.env.DBUS_SESSION_BUS_ADDRESS = `unix:path=${runtimeDir}/bus`;
    }

    // ── requirements ──────────────────────────────────────────────────────────
    const errors: string[] = [];

    if (process.env.WAYLAND_DISPLAY) {
      if (!portalAvailable()) {
        errors.push(
          `  - xdg-desktop-portal not available (required for screenshots on Wayland)\n` +
          `    Run: sudo apt install -y xdg-desktop-portal xdg-desktop-portal-gnome  # or -kde, -gtk`,
        );
      }
      if (!DEPS.wlCopy.available()) {
        errors.push(`  - ${DEPS.wlCopy.name} missing: ${DEPS.wlCopy.installCmd}`);
      }
    } else {
      if (!DEPS.scrot.available()) {
        errors.push(`  - ${DEPS.scrot.name} missing: ${DEPS.scrot.installCmd}`);
      }
      if (!DEPS.xclip.available()) {
        errors.push(`  - ${DEPS.xclip.name} missing: ${DEPS.xclip.installCmd}`);
      }
    }

    if (!uinputWritable()) {
      errors.push(
        `  - /dev/uinput not writable (required for mouse/keyboard input)\n` +
        `    Run once: ${UINPUT_SETUP_CMD}\n` +
        `    Then log out and back in.`,
      );
    }

    if (errors.length > 0) throw new Error(`Requirements not met:\n${errors.join("\n")}`);

    // On Wayland, trigger the portal screenshot permission dialog now so the user
    // grants access upfront and it never interrupts the agent mid-task.
    if (process.env.WAYLAND_DISPLAY) {
      const tmpFile = path.join(os.tmpdir(), `screenclaw-perm-check.png`);
      await captureViaPortal(tmpFile);
      await fs.unlink(tmpFile).catch(() => {});
    }
  },

  takeScreenshot,

  async highlightRegion(_x, _y, _w, _h) {
    // No-op on Linux for now
  },

  async mouseClick(x, y) {
    logger.log(`🖱️  Click at ${x}, ${y}`);
    const fd = await getUinputFd();
    const abs = toAbs(x, y);
    emitEvent(fd, EV_ABS, ABS_X, abs.x);
    emitEvent(fd, EV_ABS, ABS_Y, abs.y);
    syncDevice(fd);
    await delay(50);
    pressKey(fd, BTN_LEFT, true);
    await delay(50);
    pressKey(fd, BTN_LEFT, false);
    await delay(200);
  },

  async mouseRightClick(x, y) {
    logger.log(`🖱️  Right Click at ${x}, ${y}`);
    const fd = await getUinputFd();
    const abs = toAbs(x, y);
    emitEvent(fd, EV_ABS, ABS_X, abs.x);
    emitEvent(fd, EV_ABS, ABS_Y, abs.y);
    syncDevice(fd);
    await delay(50);
    pressKey(fd, BTN_RIGHT, true);
    await delay(50);
    pressKey(fd, BTN_RIGHT, false);
    await delay(200);
  },

  async mouseDoubleClick(x, y) {
    logger.log(`🖱️🖱️ Double Click at ${x}, ${y}`);
    const fd = await getUinputFd();
    const abs = toAbs(x, y);
    emitEvent(fd, EV_ABS, ABS_X, abs.x);
    emitEvent(fd, EV_ABS, ABS_Y, abs.y);
    syncDevice(fd);
    await delay(50);
    pressKey(fd, BTN_LEFT, true);
    await delay(50);
    pressKey(fd, BTN_LEFT, false);
    await delay(80);
    pressKey(fd, BTN_LEFT, true);
    await delay(50);
    pressKey(fd, BTN_LEFT, false);
    await delay(200);
  },

  async mouseMove(x, y) {
    logger.log(`🖱️ Move to ${x}, ${y}`);
    const fd = await getUinputFd();
    const abs = toAbs(x, y);
    emitEvent(fd, EV_ABS, ABS_X, abs.x);
    emitEvent(fd, EV_ABS, ABS_Y, abs.y);
    syncDevice(fd);
    await delay(100);
  },

  async mouseDragAndDrop(fromX, fromY, toX, toY) {
    logger.log(`🖱️ Drag from (${fromX}, ${fromY}) to (${toX}, ${toY})`);
    const fd = await getUinputFd();
    const from = toAbs(fromX, fromY);
    const to   = toAbs(toX, toY);
    emitEvent(fd, EV_ABS, ABS_X, from.x);
    emitEvent(fd, EV_ABS, ABS_Y, from.y);
    syncDevice(fd);
    await delay(50);
    pressKey(fd, BTN_LEFT, true);
    await delay(100);
    emitEvent(fd, EV_ABS, ABS_X, to.x);
    emitEvent(fd, EV_ABS, ABS_Y, to.y);
    syncDevice(fd);
    await delay(100);
    pressKey(fd, BTN_LEFT, false);
    await delay(200);
  },

  async mouseScroll(direction, amount) {
    logger.log(`🖱️ Scroll ${direction} : ${amount}`);
    const fd = await getUinputFd();
    const axis  = direction === "up"    || direction === "down"  ? REL_WHEEL  : REL_HWHEEL;
    const value = direction === "up"    || direction === "right" ? amount     : -amount;
    emitEvent(fd, EV_REL, axis, value);
    syncDevice(fd);
    await delay(100);
  },

  async keyboardTypeText(text) {
    logger.log(`⌨️  Type text : "${text}"`);

    // Write text to clipboard (layout-agnostic, supports full Unicode)
    if (process.env.WAYLAND_DISPLAY) {
      execFileSync("wl-copy", [], { input: text });
    } else {
      execFileSync("xclip", ["-selection", "clipboard"], { input: text });
    }

    // Paste via Ctrl+V
    const fd = await getUinputFd();
    const KEY_LEFTCTRL = 29;
    const KEY_V = 47;
    emitEvent(fd, EV_KEY, KEY_LEFTCTRL, 1); syncDevice(fd);
    emitEvent(fd, EV_KEY, KEY_V, 1);        syncDevice(fd);
    await delay(50);
    emitEvent(fd, EV_KEY, KEY_V, 0);        syncDevice(fd);
    emitEvent(fd, EV_KEY, KEY_LEFTCTRL, 0); syncDevice(fd);
    await delay(200);
  },

  async executeHotkey(combination) {
    logger.log(`⌨️ Hotkey: ${combination.toUpperCase()}`);
    const fd = await getUinputFd();
    const codes = combination.toLowerCase().split("+")
      .map(resolveKeyCode)
      .filter((c): c is number => c !== undefined);
    for (const code of codes)                   { emitEvent(fd, EV_KEY, code, 1); syncDevice(fd); }
    await delay(20);
    for (const code of [...codes].reverse())    { emitEvent(fd, EV_KEY, code, 0); syncDevice(fd); }
    await delay(200);
  },
};
