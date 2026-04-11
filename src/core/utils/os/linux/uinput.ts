import { openSync, writeSync, closeSync, accessSync, constants } from "node:fs";

// ─── event type constants ──────────────────────────────────────────────────────

export const EV_SYN = 0, EV_KEY = 1, EV_REL = 2, EV_ABS = 3;
export const SYN_REPORT = 0;

export const BTN_LEFT = 0x110, BTN_RIGHT = 0x111, BTN_MIDDLE = 0x112;
export const REL_X = 0, REL_Y = 1, REL_HWHEEL = 6, REL_WHEEL = 8;
export const ABS_X = 0, ABS_Y = 1;

// ─── ioctl request codes (Linux/ioctl.h — 64-bit) ─────────────────────────────

const UI_SET_EVBIT  = 0x40045564;
const UI_SET_KEYBIT = 0x40045565;
const UI_SET_RELBIT = 0x40045566;
const UI_SET_ABSBIT = 0x40045567;
const UI_DEV_CREATE  = 0x5501;
const UI_DEV_DESTROY = 0x5502;

const O_NONBLOCK = constants.O_NONBLOCK ?? 0x800;

// ─── setup helpers ─────────────────────────────────────────────────────────────

export const UINPUT_SETUP_CMD =
  `sudo groupadd -f input && sudo usermod -aG input $USER && ` +
  `echo 'KERNEL=="uinput", GROUP="input", MODE="0660"' | sudo tee /etc/udev/rules.d/60-uinput.rules && ` +
  `sudo udevadm control --reload-rules && sudo udevadm trigger && ` +
  `sudo modprobe uinput`;

export function uinputWritable(): boolean {
  try { accessSync("/dev/uinput", constants.W_OK); return true; } catch { return false; }
}

// ─── screen dimensions (updated after each screenshot) ────────────────────────

let screenW = 1920;
let screenH = 1080;

export function setScreenDimensions(w: number, h: number): void {
  screenW = w;
  screenH = h;
}

// ─── device lifecycle ──────────────────────────────────────────────────────────

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

export async function getUinputFd(): Promise<number> {
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

export function emitEvent(fd: number, type: number, code: number, value: number): void {
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

export function syncDevice(fd: number): void { emitEvent(fd, EV_SYN, SYN_REPORT, 0); }

export function toAbs(x: number, y: number) {
  return {
    x: Math.round((x / Math.max(screenW - 1, 1)) * 65535),
    y: Math.round((y / Math.max(screenH - 1, 1)) * 65535),
  };
}

export function pressKey(fd: number, code: number, pressed: boolean): void {
  emitEvent(fd, EV_KEY, code, pressed ? 1 : 0);
  syncDevice(fd);
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
