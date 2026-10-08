/**
 * Minimap painter.
 *
 * The terrain and the fog are rasterised once into two ImageData buffers at one
 * pixel per tile; every frame only the entities (a few hundred rects) and the
 * camera footprint are drawn on top, so a minimap refresh costs well under a
 * millisecond. Everything is painted with the 2D canvas API and scaled to the
 * device pixel ratio of the target canvas.
 */
import { BuildingKind, EntityKind } from '../sim/types';
import type { StateSnapshot } from '../sim/game';
import type { GameMap } from '../sim/map/terrain';
import { BUILDINGS } from '../sim/data/buildings';
import { terrainColorHex, terrainShade } from './terrain-mesh';
import type { FogView } from './types';

/** Resource node colours on the minimap. */
const RESOURCE_COLORS: Record<string, number> = {
  tree: 0x2f5c2c,
  berry: 0xc2403c,
  gold: 0xe0bd45,
  stone: 0xa9a69c,
  sheep: 0xe8e2d4,
  deer: 0xa8764a,
  boar: 0x50403a,
  relic: 0x54d6ea,
  sacred_site: 0xf2eede,
};

/** Owner colours, in player-id order (blue first, like the default skirmish). */
export const PLAYER_COLORS: number[] = [
  0x3f7bff, 0xff4a3d, 0x4bd45a, 0xffd23d, 0x35d3d3, 0xb463ff, 0xff9a1f, 0x9fd14b,
];

export function playerColor(owner: number): number {
  const n = PLAYER_COLORS.length;
  return PLAYER_COLORS[((owner % n) + n) % n] as number;
}

export function cssColor(hex: number, alpha = 1): string {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  return alpha >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
}

/** Owner colours as CSS strings, precomputed so the minimap allocates nothing. */
const PLAYER_CSS: string[] = PLAYER_COLORS.map((hex) => cssColor(hex));

function playerCss(owner: number): string {
  const n = PLAYER_CSS.length;
  return PLAYER_CSS[((owner % n) + n) % n] as string;
}

/** Resource colours as CSS strings. */
const RESOURCE_CSS: Record<string, string> = Object.fromEntries(
  Object.entries(RESOURCE_COLORS).map(([key, hex]) => [key, cssColor(hex)]),
);
const FALLBACK_RESOURCE_CSS = cssColor(0x9fd14b);
const WALL_CSS = cssColor(0xcfc7b4);

export interface MinimapRenderOptions {
  /** Owner treated as "mine": own entities are always drawn. */
  localPlayer: number;
  /** True when the fog arrays are all ones (revealMap): skip visibility tests. */
  revealed: boolean;
  /** Camera footprint in world tiles: x0,y0,x1,y1,x2,y2,x3,y3. */
  viewQuad: Float32Array | null;
}

const FOG_REBUILD_MS = 60;

export class MinimapPainter {
  private map: GameMap | null = null;
  private tileCanvas: HTMLCanvasElement | null = null;
  private tileCtx: CanvasRenderingContext2D | null = null;
  private terrainImage: ImageData | null = null;
  private compositeImage: ImageData | null = null;
  private fog: FogView | null = null;
  private revealed = false;
  private lastFogBuild = -1e9;

  setMap(map: GameMap): void {
    this.map = map;
    this.tileCanvas = null;
    this.tileCtx = null;
    this.terrainImage = null;
    this.compositeImage = null;
    this.lastFogBuild = -1e9;
  }

  setFog(fog: FogView | null, revealed: boolean): void {
    this.fog = fog;
    this.revealed = revealed;
  }

  /** Force the terrain + fog raster to be rebuilt on the next frame. */
  invalidate(): void {
    this.lastFogBuild = -1e9;
  }

  render(
    canvas: HTMLCanvasElement,
    snapshot: StateSnapshot,
    fog: FogView | null,
    options: MinimapRenderOptions,
  ): void {
    const map = this.map;
    if (!map) return;
    this.ensureTerrain(map);

    const dpr = Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1, 2);
    const cssWidth = Math.max(1, Math.round(canvas.clientWidth || canvas.width / dpr || 160));
    const cssHeight = Math.max(1, Math.round(canvas.clientHeight || canvas.height / dpr || cssWidth));
    if (canvas.width !== Math.round(cssWidth * dpr) || canvas.height !== Math.round(cssHeight * dpr)) {
      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    // 1. Terrain + fog, one pixel per tile, blitted up to the widget size.
    this.rebuildComposite(fog, options.revealed);
    const tileCtx = this.tileCtx;
    const tileCanvas = this.tileCanvas;
    const composite = this.compositeImage;
    if (tileCtx && tileCanvas && composite) {
      tileCtx.putImageData(composite, 0, 0);
      ctx.drawImage(tileCanvas, 0, 0, map.width, map.height, 0, 0, cssWidth, cssHeight);
    }

    const sx = cssWidth / map.width;
    const sy = cssHeight / map.height;

    // 2. Entities.
    for (let i = 0; i < snapshot.entities.length; i++) {
      const e = snapshot.entities[i];
      if (!e) continue;
      if (e.kind === EntityKind.Projectile) continue;
      if (!options.revealed && e.owner !== options.localPlayer) {
        const tx = Math.max(0, Math.min(map.width - 1, e.x >> 10));
        const ty = Math.max(0, Math.min(map.height - 1, e.y >> 10));
        const tile = ty * map.width + tx;
        if (e.owner < 0) {
          if (fog && !fog.explored[tile]) continue;
        } else if (fog && !fog.visible[tile]) {
          continue;
        }
      }
      const px = (e.x / 1024) * sx;
      const py = (e.y / 1024) * sy;
      switch (e.kind) {
        case EntityKind.Unit: {
          ctx.fillStyle = playerCss(e.owner);
          const r = e.def === 'battering_ram' || e.def === 'trebuchet' ? 2.2 : 1.7;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case EntityKind.Building: {
          const def = BUILDINGS[e.def];
          const w = Math.max(2.5, (def?.width ?? 1) * sx);
          const h = Math.max(2.5, (def?.height ?? 1) * sy);
          ctx.fillStyle = def && def.isWallSegment ? WALL_CSS : playerCss(e.owner);
          ctx.fillRect(px - w / 2, py - h / 2, w, h);
          if (def && (def.isLandmark || def.kind === BuildingKind.Wonder)) {
            ctx.strokeStyle = 'rgba(255,235,160,0.95)';
            ctx.lineWidth = 1;
            ctx.strokeRect(px - w / 2 - 0.5, py - h / 2 - 0.5, w + 1, h + 1);
          }
          break;
        }
        case EntityKind.ResourceNode: {
          ctx.fillStyle = RESOURCE_CSS[e.def] ?? FALLBACK_RESOURCE_CSS;
          ctx.fillRect(px - 1.2, py - 1.2, 2.4, 2.4);
          break;
        }
        case EntityKind.Relic: {
          ctx.fillStyle = RESOURCE_CSS.relic ?? FALLBACK_RESOURCE_CSS;
          ctx.beginPath();
          ctx.arc(px, py, 1.8, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case EntityKind.SacredSite: {
          ctx.fillStyle = RESOURCE_CSS.sacred_site ?? FALLBACK_RESOURCE_CSS;
          ctx.beginPath();
          ctx.moveTo(px, py - 2.4);
          ctx.lineTo(px + 2.4, py);
          ctx.lineTo(px, py + 2.4);
          ctx.lineTo(px - 2.4, py);
          ctx.closePath();
          ctx.fill();
          break;
        }
        default:
          break;
      }
    }

    // 3. Camera footprint.
    const quad = options.viewQuad;
    if (quad && quad.length >= 8) {
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const x = quad[i * 2] as number;
        const y = quad[i * 2 + 1] as number;
        const px = x * sx;
        const py = y * sy;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 4. Frame.
    ctx.strokeStyle = 'rgba(10,12,16,0.85)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, cssWidth - 2, cssHeight - 2);
  }

  dispose(): void {
    this.map = null;
    this.tileCanvas = null;
    this.tileCtx = null;
    this.terrainImage = null;
    this.compositeImage = null;
    this.fog = null;
  }

  /* ---------------------------------------------------------------- *
   * Raster caches
   * ---------------------------------------------------------------- */

  private ensureTerrain(map: GameMap): void {
    if (this.terrainImage && this.terrainImage.width === map.width && this.terrainImage.height === map.height) {
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = map.width;
    canvas.height = map.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const image = ctx.createImageData(map.width, map.height);
    const data = image.data;
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const hex = terrainColorHex(map, x, y);
        const jitter = 0.88 + terrainShade(x, y) * 0.24;
        const o = (y * map.width + x) * 4;
        data[o] = Math.min(255, ((hex >> 16) & 255) * jitter);
        data[o + 1] = Math.min(255, ((hex >> 8) & 255) * jitter);
        data[o + 2] = Math.min(255, (hex & 255) * jitter);
        data[o + 3] = 255;
      }
    }
    this.tileCanvas = canvas;
    this.tileCtx = ctx;
    this.terrainImage = image;
    this.compositeImage = ctx.createImageData(map.width, map.height);
    this.lastFogBuild = -1e9;
  }

  private rebuildComposite(fog: FogView | null, revealed: boolean): void {
    const terrain = this.terrainImage;
    const composite = this.compositeImage;
    if (!terrain || !composite) return;
    const now = performance.now();
    const fogChanged = fog !== this.fog || revealed !== this.revealed;
    if (!fogChanged && now - this.lastFogBuild < FOG_REBUILD_MS) return;
    this.lastFogBuild = now;
    this.fog = fog;
    this.revealed = revealed;

    const src = terrain.data;
    const dst = composite.data;
    dst.set(src);
    if (!fog || revealed) return;

    const tiles = composite.width * composite.height;
    for (let i = 0; i < tiles; i++) {
      if (fog.visible[i]) continue;
      const o = i * 4;
      if (fog.explored[i]) {
        dst[o] = dst[o] * 0.45;
        dst[o + 1] = dst[o + 1] * 0.45;
        dst[o + 2] = dst[o + 2] * 0.45;
      } else {
        dst[o] = 4;
        dst[o + 1] = 5;
        dst[o + 2] = 8;
      }
    }
  }
}
