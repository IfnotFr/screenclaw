export const KEY_NAMES: Record<string, number> = {
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

export function resolveKeyCode(name: string): number | undefined {
  return KEY_NAMES[name.toLowerCase()];
}
