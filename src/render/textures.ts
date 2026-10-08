/**
 * Procedural canvas textures.
 *
 * Every pixel is generated in code at load time: nothing is downloaded and
 * nothing is derived from any third-party game asset. The textures are small,
 * tileable and deliberately low contrast so they break up flat vertex colours
 * without fighting the low-poly silhouette.
 */
import * as THREE from 'three';

export interface NoiseTextureOptions {
  /** Square texture edge in pixels. Defaults to 256. */
  size?: number;
  /** Peak-to-peak brightness swing, 0..1. Defaults to 0.16 (subtle). */
  contrast?: number;
  /** Mean brightness, 0..1. Defaults to 0.94. */
  brightness?: number;
  /** Value-noise seed. */
  seed?: number;
  /** Number of octaves combined. Defaults to 3. */
  octaves?: number;
}

export interface DiscTextureOptions {
  /** Square texture edge in pixels. Defaults to 128. */
  size?: number;
  /** Radius (0..1 of the half size) of the bright rim. Defaults to 0.78. */
  rim?: number;
  /** Brightness of the flat interior, 0..1. Defaults to 0.12. */
  fill?: number;
}

/** Deterministic 2D hash in [0, 1). */
function hash2d(x: number, y: number, seed: number): number {
  let h = (seed ^ Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1)) | 0;
  h = Math.imul(h ^ (h >>> 15), 0x2545f491);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Bilinear value noise with lattice period `period` pixels. Returns 0..1. */
function valueNoise(x: number, y: number, period: number, seed: number): number {
  const p = Math.max(1, period);
  const fx = Math.floor(x / p);
  const fy = Math.floor(y / p);
  const rx = smoothstep(x / p - fx);
  const ry = smoothstep(y / p - fy);
  const n00 = hash2d(fx, fy, seed);
  const n10 = hash2d(fx + 1, fy, seed);
  const n01 = hash2d(fx, fy + 1, seed);
  const n11 = hash2d(fx + 1, fy + 1, seed);
  const top = n00 + (n10 - n00) * rx;
  const bottom = n01 + (n11 - n01) * rx;
  return top + (bottom - top) * ry;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Greyscale fractal noise, tiling every texture edge. Multiply it onto a
 * surface to break up large flat vertex-coloured areas (terrain, water).
 */
export function createNoiseTexture(options: NoiseTextureOptions = {}): THREE.CanvasTexture {
  const size = Math.max(16, Math.floor(options.size ?? 256));
  const contrast = options.contrast ?? 0.16;
  const brightness = options.brightness ?? 0.94;
  const octaves = Math.max(1, Math.floor(options.octaves ?? 3));
  const seed = options.seed ?? 0x5eed;

  const canvas = makeCanvas(size, size);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('aegis: 2d canvas context unavailable for the noise texture');
  const image = ctx.createImageData(size, size);
  const data = image.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sum = 0;
      let amplitude = 1;
      let total = 0;
      let period = size / 2;
      for (let octave = 0; octave < octaves; octave++) {
        sum += valueNoise(x, y, period, seed + octave * 977) * amplitude;
        total += amplitude;
        amplitude *= 0.5;
        period = Math.max(2, period * 0.5);
      }
      const value = sum / total;
      const grey = Math.round(clamp01(brightness + (value - 0.5) * contrast) * 255);
      const i = (y * size + x) * 4;
      data[i] = grey;
      data[i + 1] = grey;
      data[i + 2] = grey;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.name = 'aegis-noise';
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Soft disc with a bright rim on a transparent background. Used for selection
 * discs, the hover ring and the expanding order markers; the material colour
 * tints it per player or per order kind.
 */
export function createDiscTexture(options: DiscTextureOptions = {}): THREE.CanvasTexture {
  const size = Math.max(16, Math.floor(options.size ?? 128));
  const rim = clamp01(options.rim ?? 0.78);
  const fill = clamp01(options.fill ?? 0.12);

  const canvas = makeCanvas(size, size);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('aegis: 2d canvas context unavailable for the disc texture');
  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, `rgba(255,255,255,${fill})`);
  gradient.addColorStop(Math.max(0, rim - 0.32), `rgba(255,255,255,${fill + 0.06})`);
  gradient.addColorStop(Math.max(0, rim - 0.06), 'rgba(255,255,255,0.92)');
  gradient.addColorStop(Math.min(0.99, rim + 0.08), 'rgba(255,255,255,0.30)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(half, half, half, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.name = 'aegis-disc';
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Fog-of-war map: one texel per tile, RGBA where R = visible and G = explored.
 * Linear filtering gives the soft edge between the visible and explored bands.
 */
export function createFogTexture(width: number, height: number): THREE.DataTexture {
  const w = Math.max(1, Math.floor(width));
  const h = Math.max(1, Math.floor(height));
  const data = new Uint8Array(w * h * 4);
  const texture = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.name = 'aegis-fog';
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}
