/**
 * Pixel-level checks on the rendered viewport.
 *
 * The camera-maths assertions elsewhere (`viewCoverage`, focus distance) prove
 * where the camera is pointing, not what the screen shows. A black viewport with
 * a working camera would pass all of those, which is exactly the bug that was
 * reported twice. These helpers measure the actual pixels instead.
 */
import { PNG } from 'pngjs';
import type { Page } from '@playwright/test';

export interface BrightnessReport {
  /** Mean luminance of the sampled region, 0-255. */
  mean: number;
  /** Fraction of sampled pixels that are near black, 0..1. */
  darkFraction: number;
  /** Distinct-ish colour count, a cheap "is anything drawn here" signal. */
  colourSpread: number;
  width: number;
  height: number;
}

/**
 * Screenshot a clip of the page and measure how bright it is.
 * The clip must avoid the HUD, which is bright and would mask a black viewport.
 */
export async function measureBrightness(
  page: Page,
  clip: { x: number; y: number; width: number; height: number },
): Promise<BrightnessReport> {
  const buffer = await page.screenshot({ clip });
  const png = PNG.sync.read(buffer);
  let total = 0;
  let dark = 0;
  const buckets = new Set<number>();
  const count = png.width * png.height;
  for (let i = 0; i < count; i++) {
    const o = i * 4;
    const r = png.data[o] ?? 0;
    const g = png.data[o + 1] ?? 0;
    const b = png.data[o + 2] ?? 0;
    // Rec. 601 luma.
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    total += luma;
    if (luma < 16) dark++;
    buckets.add(((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4));
  }
  return {
    mean: total / count,
    darkFraction: dark / count,
    colourSpread: buckets.size,
    width: png.width,
    height: png.height,
  };
}

/**
 * The part of the viewport that shows the 3D scene: the middle of the canvas,
 * clear of the top bar, the objectives panel, the command card and the minimap.
 */
export function sceneClip(viewport: { width: number; height: number }): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  return {
    x: Math.round(viewport.width * 0.32),
    y: Math.round(viewport.height * 0.12),
    width: Math.round(viewport.width * 0.28),
    height: Math.round(viewport.height * 0.28),
  };
}
