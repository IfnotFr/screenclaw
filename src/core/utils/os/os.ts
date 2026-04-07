export interface OS {
  toScreenAbsolute(x: number, y: number): { x: number; y: number };
  toScreenRelative(absoluteX: number, absoluteY: number): { x: number; y: number };
  takeScreenshot(): Promise<Buffer>;
  highlightRegion(x: number, y: number, w: number, h: number): Promise<void>;
  mouseClick(x: number, y: number): Promise<void>;
  mouseRightClick(x: number, y: number): Promise<void>;
  mouseDoubleClick(x: number, y: number): Promise<void>;
  mouseMove(x: number, y: number): Promise<void>;
  mouseDragAndDrop(fromX: number, fromY: number, toX: number, toY: number): Promise<void>;
  mouseScroll(direction: "up" | "down" | "left" | "right", amount: number): Promise<void>;
  keyboardTypeText(text: string): Promise<void>;
  executeHotkey(combination: string): Promise<void>;
}
