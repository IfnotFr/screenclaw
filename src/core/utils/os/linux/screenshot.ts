import { execFileSync, execSync } from "node:child_process";
import { copyFileSync } from "node:fs";
import { createCanvas, loadImage } from "canvas";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setScreenDimensions } from "./uinput.js";

export const MULTIPLE = 32;

type Dependency = { name: string; installCmd: string; available: () => boolean };

export function which(bin: string): boolean {
  try { execSync(`which ${bin}`, { stdio: "ignore" }); return true; } catch { return false; }
}

export const DEPS = {
  scrot:  { name: "scrot",   installCmd: "sudo apt install -y scrot",        available: () => which("scrot") },
  wlCopy: { name: "wl-copy", installCmd: "sudo apt install -y wl-clipboard", available: () => which("wl-copy") },
  xclip:  { name: "xclip",   installCmd: "sudo apt install -y xclip",        available: () => which("xclip") },
} satisfies Record<string, Dependency>;

export function portalAvailable(): boolean {
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

export async function captureViaPortal(outFile: string): Promise<void> {
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

export async function takeScreenshot(): Promise<Buffer> {
  const tmpFile = path.join(os.tmpdir(), `screenclaw-${Date.now()}.png`);
  await captureScreen(tmpFile);

  const raw = await fs.readFile(tmpFile);
  await fs.unlink(tmpFile).catch(() => {});

  const originalImg = await loadImage(raw);

  // Update screen dimensions used for uinput coordinate scaling
  setScreenDimensions(originalImg.width, originalImg.height);

  const targetW = Math.ceil(originalImg.width  / MULTIPLE) * MULTIPLE;
  const targetH = Math.ceil(originalImg.height / MULTIPLE) * MULTIPLE;

  const padCanvas = createCanvas(targetW, targetH);
  const ctx = padCanvas.getContext("2d");
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(originalImg, 0, 0);

  return padCanvas.toBuffer("image/png");
}
