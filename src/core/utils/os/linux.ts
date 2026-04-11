import { execFileSync, execSync } from "node:child_process";
import { openSync, writeSync, closeSync, existsSync, accessSync, copyFileSync, constants } from "node:fs";
import { createCanvas, loadImage } from "canvas";
import { logger } from "#/core/index.js";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { OS } from "./os.js";

// ─── uinput constants ──────────────────────────────────────────────────────────

const EV_SYN = 0, EV_KEY = 1, EV_REL = 2, EV_ABS = 3;
const SYN_REPORT = 0;

const BTN_LEFT = 0x110, BTN_RIGHT = 0x111, BTN_MIDDLE = 0x112;
const REL_X = 0, REL_Y = 1, REL_HWHEEL = 6, REL_WHEEL = 8;
const ABS_X = 0, ABS_Y = 1;

// ioctl request codes (Linux/ioctl.h — 64-bit)
const UI_SET_EVBIT  = 0x40045564;
const UI_SET_KEYBIT = 0x40045565;
const UI_SET_RELBIT = 0x40045566;
const UI_SET_ABSBIT = 0x40045567;
const UI_DEV_CREATE  = 0x5501;
const UI_DEV_DESTROY = 0x5502;

const O_NONBLOCK = constants.O_NONBLOCK ?? 0x800;

const KEY_LEFTSHIFT = 42;

// ─── keyboard maps ─────────────────────────────────────────────────────────────

const KEY_NAMES: Record<string, number> = {
  enter: 28, return: 28, esc: 1, escape: 1, backspace: 14,
  tab: 15, space: 57, delete: 111, insert: 110,
  home: 102, end: 107, pageup: 104, pagedown: 109,
  up: 103, down: 108, left: 105, right: 106,
  ctrl: 29, control: 29, leftctrl: 29, rightctrl: 97,
  alt: 56, leftalt: 56, rightalt: 100,
  shift: 42, leftshift: 42, rightshift: 54,
  super: 125, meta: 125, win: 125, cmd: 125, command: 125,
  f1: 59, f2: 60, f3: 61, f4: 62, f5: 63, f6: 64,
  f7: 65, f8: 66, f9: 67, f10: 68, f11: 87, f12: 88,
};

// [keycode, needsShift]
const CHAR_MAP: Record<string, [number, boolean]> = {
  a:[30,false],b:[48,false],c:[46,false],d:[32,false],e:[18,false],f:[33,false],
  g:[34,false],h:[35,false],i:[23,false],j:[36,false],k:[37,false],l:[38,false],
  m:[50,false],n:[49,false],o:[24,false],p:[25,false],q:[16,false],r:[19,false],
  s:[31,false],t:[20,false],u:[22,false],v:[47,false],w:[17,false],x:[45,false],
  y:[21,false],z:[44,false],
  A:[30,true],B:[48,true],C:[46,true],D:[32,true],E:[18,true],F:[33,true],
  G:[34,true],H:[35,true],I:[23,true],J:[36,true],K:[37,true],L:[38,true],
  M:[50,true],N:[49,true],O:[24,true],P:[25,true],Q:[16,true],R:[19,true],
  S:[31,true],T:[20,true],U:[22,true],V:[47,true],W:[17,true],X:[45,true],
  Y:[21,true],Z:[44,true],
  "1":[2,false],"2":[3,false],"3":[4,false],"4":[5,false],"5":[6,false],
  "6":[7,false],"7":[8,false],"8":[9,false],"9":[10,false],"0":[11,false],
  " ":[57,false],"\n":[28,false],"\t":[15,false],
  "-":[12,false],"=":[13,false],"[":[26,false],"]":[27,false],"\\":[43,false],
  ";":[39,false],"'":[40,false],",":[51,false],".":[52,false],"/":[53,false],"`":[41,false],
  "!":[2,true],"@":[3,true],"#":[4,true],"$":[5,true],"%":[6,true],
  "^":[7,true],"&":[8,true],"*":[9,true],"(":[10,true],")":[11,true],
  "_":[12,true],"+":[13,true],"{":[26,true],"}":[27,true],"|":[43,true],
  ":":[39,true],'"':[40,true],"<":[51,true],">":[52,true],"?":[53,true],"~":[41,true],
};

// ─── uinput device ─────────────────────────────────────────────────────────────

let screenW = 1920;
let screenH = 1080;
let uinputFd: number | null = null;
let uinputFdPromise: Promise<number> | null = null;

function buildDeviceStruct(): Buffer {
  // struct uinput_user_dev: name(80) + input_id(8) + ff_effects_max(4) + absmax/min/fuzz/flat(256 each)
  const buf = Buffer.alloc(1116);
  buf.write("screenclaw", 0, "utf8");              // name
  buf.writeUInt16LE(3,  80);                        // bustype: BUS_USB
  buf.writeUInt16LE(1,  82);                        // vendor
  buf.writeUInt16LE(1,  84);                        // product
  buf.writeUInt16LE(1,  86);                        // version
  // ff_effects_max at offset 88: 0 (already zeroed)
  buf.writeInt32LE(65535, 92 + ABS_X * 4);         // absmax[ABS_X]
  buf.writeInt32LE(65535, 92 + ABS_Y * 4);         // absmax[ABS_Y]
  // absmin / absfuzz / absflat remain 0
  return buf;
}

async function getUinputFd(): Promise<number> {
  if (uinputFd !== null) return uinputFd;
  if (uinputFdPromise) return uinputFdPromise;

  uinputFdPromise = (async () => {
    // @ts-ignore — ioctl is a CJS native addon
    const { default: ioctl } = await import("ioctl");

    const fd = openSync("/dev/uinput", constants.O_WRONLY | O_NONBLOCK);

    for (const ev of [EV_SYN, EV_KEY, EV_REL, EV_ABS]) ioctl(fd, UI_SET_EVBIT,  ev);
    for (const btn of [BTN_LEFT, BTN_RIGHT, BTN_MIDDLE])  ioctl(fd, UI_SET_KEYBIT, btn);
    for (let k = 0; k < 256; k++)                         ioctl(fd, UI_SET_KEYBIT, k);
    for (const rel of [REL_X, REL_Y, REL_WHEEL, REL_HWHEEL]) ioctl(fd, UI_SET_RELBIT, rel);
    for (const abs of [ABS_X, ABS_Y])                    ioctl(fd, UI_SET_ABSBIT, abs);

    writeSync(fd, buildDeviceStruct());
    ioctl(fd, UI_DEV_CREATE);

    await delay(200); // let the kernel expose the virtual device

    process.on("exit", () => {
      try { ioctl(fd, UI_DEV_DESTROY); } catch {}
      try { closeSync(fd); } catch {}
    });

    uinputFd = fd;
    return fd;
  })().catch(e => { uinputFdPromise = null; throw e; });

  return uinputFdPromise;
}

// ─── input event helpers ───────────────────────────────────────────────────────

function emitEvent(fd: number, type: number, code: number, value: number): void {
  const now  = Date.now();
  const sec  = Math.floor(now / 1000);
  const usec = (now % 1000) * 1000;
  const buf  = Buffer.alloc(24);
  buf.writeBigInt64LE(BigInt(sec),  0);
  buf.writeBigInt64LE(BigInt(usec), 8);
  buf.writeUInt16LE(type,  16);
  buf.writeUInt16LE(code,  18);
  buf.writeInt32LE(value,  20);
  writeSync(fd, buf);
}

function syncDevice(fd: number): void { emitEvent(fd, EV_SYN, SYN_REPORT, 0); }

function toAbs(x: number, y: number) {
  return {
    x: Math.round((x / Math.max(screenW - 1, 1)) * 65535),
    y: Math.round((y / Math.max(screenH - 1, 1)) * 65535),
  };
}

function pressKey(fd: number, code: number, pressed: boolean): void {
  emitEvent(fd, EV_KEY, code, pressed ? 1 : 0);
  syncDevice(fd);
}

function typeChar(fd: number, char: string): void {
  const entry = CHAR_MAP[char];
  if (!entry) return;
  const [code, shift] = entry;
  if (shift) { emitEvent(fd, EV_KEY, KEY_LEFTSHIFT, 1); syncDevice(fd); }
  emitEvent(fd, EV_KEY, code, 1); syncDevice(fd);
  emitEvent(fd, EV_KEY, code, 0); syncDevice(fd);
  if (shift) { emitEvent(fd, EV_KEY, KEY_LEFTSHIFT, 0); syncDevice(fd); }
}

function resolveKeyCode(name: string): number | undefined {
  const lower = name.toLowerCase();
  if (lower in KEY_NAMES) return KEY_NAMES[lower];
  if (name.length === 1 && name in CHAR_MAP) return CHAR_MAP[name][0];
  return undefined;
}

// ─── screenshot helpers ────────────────────────────────────────────────────────

const MULTIPLE = 32;

type Dependency = { name: string; installCmd: string; available: () => boolean };

function which(bin: string): boolean {
  try { execSync(`which ${bin}`, { stdio: "ignore" }); return true; } catch { return false; }
}

function uinputWritable(): boolean {
  try { accessSync("/dev/uinput", constants.W_OK); return true; } catch { return false; }
}

const DEPS = {
  scrot: { name: "scrot", installCmd: "sudo apt install -y scrot", available: () => which("scrot") },
} satisfies Record<string, Dependency>;

const UINPUT_SETUP_CMD =
  `sudo groupadd -f input && sudo usermod -aG input $USER && ` +
  `echo 'KERNEL=="uinput", GROUP="input", MODE="0660"' | sudo tee /etc/udev/rules.d/60-uinput.rules && ` +
  `sudo udevadm control --reload-rules && sudo udevadm trigger && ` +
  `sudo modprobe uinput`;

function portalAvailable(): boolean {
  try {
    execFileSync("gdbus", [
      "call", "--session",
      "--dest",        "org.freedesktop.portal.Desktop",
      "--object-path", "/org/freedesktop/portal/desktop",
      "--method",      "org.freedesktop.DBus.Peer.Ping",
    ], { stdio: "ignore" });
    return true;
  } catch { return false; }
}

async function captureViaPortal(outFile: string): Promise<void> {
  const { sessionBus, Variant } = await import("dbus-next");
  const bus = sessionBus();

  try {
    // Request a stable well-known name so xdg-desktop-portal can persist
    // the screenshot permission across sessions (identifies us as "screenclaw").
    try { await bus.requestName("io.screenclaw.App", 4 /* DO_NOT_QUEUE */); } catch {}

    const obj = await bus.getProxyObject(
      "org.freedesktop.portal.Desktop",
      "/org/freedesktop/portal/desktop",
    );
    const iface = obj.getInterface("org.freedesktop.portal.Screenshot");

    const token = `sc${Date.now()}`;
    const requestPath: string = await iface.Screenshot("", {
      handle_token: new Variant("s", token),
      interactive:  new Variant("b", false),
    });

    const uri = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("xdg-desktop-portal screenshot timed out (60s)")),
        60_000,
      );

      bus.getProxyObject("org.freedesktop.portal.Desktop", requestPath)
        .then((reqObj: any) => {
          reqObj.getInterface("org.freedesktop.portal.Request")
            .on("Response", (response: number, results: Record<string, any>) => {
              clearTimeout(timer);
              if (response !== 0) reject(new Error(`Portal screenshot failed (response=${response})`));
              else resolve(results["uri"].value as string);
            });
        })
        .catch((e: unknown) => { clearTimeout(timer); reject(e); });
    });

    copyFileSync(new URL(uri).pathname, outFile);
  } finally {
    bus.disconnect();
  }
}

async function captureScreen(outFile: string): Promise<void> {
  if (process.env.WAYLAND_DISPLAY) {
    await captureViaPortal(outFile);
  } else {
    execFileSync("scrot", [outFile]);
  }
}

// ─── misc ──────────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── OS implementation ─────────────────────────────────────────────────────────

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
    } else {
      if (!DEPS.scrot.available()) {
        errors.push(`  - ${DEPS.scrot.name} missing: ${DEPS.scrot.installCmd}`);
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

  async takeScreenshot() {
    const tmpFile = path.join(os.tmpdir(), `screenclaw-${Date.now()}.png`);
    await captureScreen(tmpFile);

    const raw = await fs.readFile(tmpFile);
    await fs.unlink(tmpFile).catch(() => {});

    const originalImg = await loadImage(raw);

    // Update screen dimensions used for uinput coordinate scaling
    screenW = originalImg.width;
    screenH = originalImg.height;

    const targetW = Math.ceil(originalImg.width  / MULTIPLE) * MULTIPLE;
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
    const fd = await getUinputFd();
    for (const char of text) {
      typeChar(fd, char);
      await delay(20);
    }
    await delay(200);
  },

  async executeHotkey(combination) {
    logger.log(`⌨️ Hotkey: ${combination.toUpperCase()}`);
    const fd = await getUinputFd();
    const codes = combination.toLowerCase().split("+")
      .map(resolveKeyCode)
      .filter((c): c is number => c !== undefined);
    for (const code of codes)          { emitEvent(fd, EV_KEY, code, 1); syncDevice(fd); }
    await delay(20);
    for (const code of [...codes].reverse()) { emitEvent(fd, EV_KEY, code, 0); syncDevice(fd); }
    await delay(200);
  },
};
