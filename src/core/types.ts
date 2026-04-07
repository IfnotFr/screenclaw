export interface ImageItem {
  label: string;
  bbox: [number, number, number, number];
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}