import { EV_KEY, emitEvent, syncDevice } from "./uinput.js";

export const KEY_LEFTSHIFT = 42;

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

// [keycode, needsShift]
export const CHAR_MAP: Record<string, [number, boolean]> = {
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

export function typeChar(fd: number, char: string): void {
  const entry = CHAR_MAP[char];
  if (!entry) return;
  const [code, shift] = entry;
  if (shift) { emitEvent(fd, EV_KEY, KEY_LEFTSHIFT, 1); syncDevice(fd); }
  emitEvent(fd, EV_KEY, code, 1); syncDevice(fd);
  emitEvent(fd, EV_KEY, code, 0); syncDevice(fd);
  if (shift) { emitEvent(fd, EV_KEY, KEY_LEFTSHIFT, 0); syncDevice(fd); }
}

export function resolveKeyCode(name: string): number | undefined {
  const lower = name.toLowerCase();
  if (lower in KEY_NAMES) return KEY_NAMES[lower];
  if (name.length === 1 && name in CHAR_MAP) return CHAR_MAP[name][0];
  return undefined;
}
