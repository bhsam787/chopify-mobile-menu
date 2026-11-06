import { CANVAS_WIDTH } from "@chopi/menu-core";

/** A phone to preview the canvas on: its screen size in CSS pixels. */
export interface Device {
  id: string;
  label: string;
  width: number;
  height: number;
}

/**
 * Common phone screens (CSS viewport sizes). The canvas is designed at
 * CANVAS_WIDTH and scales to each width, so previewing shows the real size
 * of everything and where the screen ends.
 */
export const DEVICES: Device[] = [
  { id: "iphone-se", label: "iPhone SE", width: 375, height: 667 },
  { id: "iphone-14", label: "iPhone 13 / 14", width: 390, height: 844 },
  { id: "iphone-16", label: "iPhone 15 / 16", width: 393, height: 852 },
  {
    id: "iphone-16-pro-max",
    label: "iPhone 15 / 16 Pro Max",
    width: 430,
    height: 932,
  },
  { id: "pixel-8", label: "Google Pixel 8", width: 412, height: 915 },
  { id: "galaxy-s24", label: "Samsung Galaxy S24", width: 360, height: 780 },
  { id: "android-small", label: "Small Android", width: 360, height: 640 },
];

export const DEFAULT_DEVICE = DEVICES[1];

/** How much bigger or smaller the canvas shows on `device` than at its design width. */
export const deviceScale = (device: Device) => device.width / CANVAS_WIDTH;
