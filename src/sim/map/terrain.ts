/**
 * Seeded 3D map generation: relief, forests, resource nodes, neutral fauna,
 * sacred sites and relic spawn spots.
 *
 * Fully deterministic: driven only by the match seed through Rng, using integer
 * math for the noise field. Same seed => identical map, in Node and browser.
 */
import { FP_ONE, MAP_SIZES, MAX_PLAYERS, type MapSizeName } from '../constants';
import { Rng } from '../rng';
import { clamp } from '../fixed';

export const enum Terrain {
  Grass = 0,
  Dirt = 1,
  Water = 2,
  Forest = 3,
  Hill = 4,
  Rock = 5,
  Farm = 6,
}

/**
 * Minimum number of sacred sites a map must spawn, matching
 * SACRED_SITE_VICTORY_COUNT: fewer than this and the sacred-site victory is
 * impossible to achieve.
 */
const MIN_SACRED_SITES = 3;

/** Elevation is stored in twentieths of a tile, integer. */
export const ELEV_UNIT = 20;

export interface GridPoint {
  x: number;
  y: number;
}

export interface GameMap {
  width: number;
  height: number;
  terrain: Uint8Array;
  /** Elevation, integer units of ELEV_UNIT per tile. */
  elevation: Int32Array;
  passable: Uint8Array;
  buildable: Uint8Array;
  /** Stealth forest tiles hide units inside them. */
  stealth: Uint8Array;
  /** Entity id occupying a tile (blocking), 0 when free. */
  blockers: Int32Array;
  /** Resource node entity id on a tile, 0 when none. */
  resourceAt: Int32Array;
  /** Building footprint entity id on a tile, 0 when none. */
  buildingAt: Int32Array;
  /** Owner+1 of the gate on a tile, 0 when the tile is not a gate. */
  gateOwner: Int32Array;
  startPositions: GridPoint[];
  sacredSiteSpots: GridPoint[];
  relicSpots: GridPoint[];
}

function idx(map: { width: number }, x: number, y: number): number {
  return y * map.width + x;
}

export function inBounds(map: { width: number; height: number }, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < map.width && y < map.height;
}

export function tileAt(map: GameMap, x: number, y: number): Terrain {
  if (!inBounds(map, x, y)) return Terrain.Water;
  return map.terrain[idx(map, x, y)] as Terrain;
}

/** Fixed-point to tile coordinate, flooring. */
export function fpToTile(v: number): number {
  return v >> 10;
}

/* ------------------------------------------------------------------ *
 * Integer value noise
 * ------------------------------------------------------------------ */

/**
 * Deterministic lattice hash. Returns a value in [0, 65535].
 */
function hash2(x: number, y: number, seed: number): number {
  let h = seed | 0;
  h = Math.imul(h ^ (x | 0), 0x27d4eb2d);
  h = Math.imul(h ^ (y | 0), 0x165667b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2545f491);
  return (h ^ (h >>> 13)) >>> 16;
}

/**
 * Bilinear-interpolated value noise. `scale` is the lattice cell size in tiles.
 * Returns an integer in [0, 65535].
 */
function valueNoise(x: number, y: number, scale: number, seed: number): number {
  const fx = Math.trunc(x / scale);
  const fy = Math.trunc(y / scale);
  const rx = x - fx * scale;
  const ry = y - fy * scale;
  // Smoothstep in fixed point for softer ridges.
  const wx = (rx * 1024) / scale;
  const wy = (ry * 1024) / scale;
  const sx = (wx * wx * (3 * 1024 - 2 * wx)) / (1024 * 1024);
  const sy = (wy * wy * (3 * 1024 - 2 * wy)) / (1024 * 1024);

  const n00 = hash2(fx, fy, seed);
  const n10 = hash2(fx + 1, fy, seed);
  const n01 = hash2(fx, fy + 1, seed);
  const n11 = hash2(fx + 1, fy + 1, seed);

  const top = n00 + ((n10 - n00) * sx) / 1024;
  const bot = n01 + ((n11 - n01) * sx) / 1024;
  return Math.trunc(top + ((bot - top) * sy) / 1024);
}

/** Fractal noise combining three octaves, result in [0, 65535]. */
function fbm(x: number, y: number, baseScale: number, seed: number): number {
  const a = valueNoise(x, y, baseScale, seed);
  const b = valueNoise(x + 7919, y + 104729, baseScale >> 1, seed ^ 0x9e3779b9);
  const c = valueNoise(x + 15485863, y + 32452843, baseScale >> 2, seed ^ 0x85ebca6b);
  return Math.trunc((a * 4 + b * 2 + c) / 7);
}

/* ------------------------------------------------------------------ *
 * Map generation
 * ------------------------------------------------------------------ */

/**
 * Map presets selectable in the skirmish lobby. `treeDensity` scales the number
 * of forest clumps, the thresholds decide where water and dirt appear.
 */
export interface MapPreset {
  treeDensity: number;
  waterThreshold: number;
  dirtThreshold: number;
  /** Extra gold veins per player. */
  extraGold: number;
}

export const MAP_PRESETS: Record<string, MapPreset> = {
  grassland: { treeDensity: 1, waterThreshold: 7200, dirtThreshold: 9500, extraGold: 0 },
  dry: { treeDensity: 0.45, waterThreshold: 4200, dirtThreshold: 15000, extraGold: 1 },
  forest: { treeDensity: 2.4, waterThreshold: 6800, dirtThreshold: 9000, extraGold: 0 },
};

export interface MapGenOptions {
  seed: number;
  size: MapSizeName;
  /** Number of players to place symmetrically. */
  playerCount: number;
  mapType: string;
}

export interface GeneratedMap {
  map: GameMap;
  /** Resource node spawn requests, resolved to entities by the world. */
  resourceNodes: ResourceSpawn[];
  /** Where each player's starting Town Center should go. */
  starts: GridPoint[];
}

export interface ResourceSpawn {
  kind: 'tree' | 'berry' | 'gold' | 'stone' | 'sheep' | 'deer' | 'boar';
  x: number;
  y: number;
  /** Number of tiles in the clump (trees) or 1 for single nodes. */
  size: number;
}

/**
 * Generate the terrain grid. Landmass shaped by fbm, players placed on a ring
 * with mirrored starts so no player has a positional advantage.
 */
export function generateMap(opts: MapGenOptions): GeneratedMap {
  const size = MAP_SIZES[opts.size] ?? MAP_SIZES.medium;
  const width = size;
  const height = size;
  const rng = new Rng(opts.seed ^ 0x5f3759df);

  // Terrain preset for this map type, read before the terrain loop.
  const preset = MAP_PRESETS[opts.mapType] ?? MAP_PRESETS.grassland;

  const terrain = new Uint8Array(width * height);
  const elevation = new Int32Array(width * height);
  const passable = new Uint8Array(width * height);
  const buildable = new Uint8Array(width * height);
  const stealth = new Uint8Array(width * height);
  const blockers = new Int32Array(width * height);
  const resourceAt = new Int32Array(width * height);
  const buildingAt = new Int32Array(width * height);
  const gateOwner = new Int32Array(width * height);

  const seedA = rng.nextUint32() | 0;
  const seedB = rng.nextUint32() | 0;
  const seedC = rng.nextUint32() | 0;

  const cx = width >> 1;
  const cy = height >> 1;
  // Landmass radius grows with map size; the falloff keeps water at the edges.
  const landRadius = Math.trunc((size * 46) / 100);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx({ width }, x, y);
      const dx = x - cx;
      const dy = y - cy;
      // Chebyshev-ish distance keeps the continent roughly square.
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      const falloff = clamp(1024 - ((dist * 1024) / landRadius - 180), 0, 1024);

      const base = fbm(x, y, 34, seedA);
      const ridge = fbm(x, y, 17, seedB);
      const detail = fbm(x, y, 9, seedC);

      let h = (base * 60 + ridge * 30 + detail * 10) / 100;
      h = (h * falloff) / 1024;
      // Sink the outer ring into water.
      if (dist >= landRadius) h = Math.min(h, 2600);

      elevation[i] = Math.trunc((h * 24) / 65535) - 4;

      let t: Terrain = Terrain.Grass;
      if (h < preset.waterThreshold) t = Terrain.Water;
      else if (h < preset.dirtThreshold) t = Terrain.Dirt;
      else if (h > 40000) t = Terrain.Rock;
      else if (h > 30000) t = Terrain.Hill;
      terrain[i] = t;

      const isWater = t === Terrain.Water;
      const isRock = t === Terrain.Rock;
      passable[i] = isWater || isRock ? 0 : 1;
      buildable[i] = isWater || isRock ? 0 : 1;
    }
  }

  // --- Starting positions ---
  // A fixed ring does not work: on most seeds the ideal ring radius lands in
  // water or on rock, and snapping each point to the nearest land tile clusters
  // every base near the centre (measured: two Town Centers 14-22 tiles apart,
  // which decides the game at t=0). Instead we sample the real land tiles and
  // pick the set that maximises the distance between bases.
  const count = clamp(opts.playerCount, 1, MAX_PLAYERS);
  const starts: GridPoint[] = [];
  // Keep every base well inside the map: a start 10 tiles from the edge puts
  // most of the opening camera view off-map, which reads as a black screen with
  // a strip of terrain. The margin scales with the map so the view around a base
  // is always filled with land.
  const edgeMargin = Math.max(14, Math.round(width * 0.15));
  let candidates = collectLandCandidates(passable, width, height, landRadius, 0.62, edgeMargin);
  if (candidates.length < count) {
    // Tight map: relax the centre distance before relaxing the edge margin.
    candidates = collectLandCandidates(passable, width, height, landRadius, 0.8, edgeMargin);
  }
  if (candidates.length < count) {
    candidates = collectLandCandidates(passable, width, height, landRadius, 0.95, Math.round(width * 0.1));
  }
  if (candidates.length === 0) {
    // Degenerate map: fall back to the centre.
    starts.push({ x: cx, y: cy });
  } else {
    // Seed the first base on the ring angle nearest the map edge so bases end
    // up spread around the landmass rather than all on one side. The angle and
    // radius are jittered from the match RNG: without that, every seed produced
    // the identical layout (measured: starts at exactly (109,58) and (37,91) for
    // seeds 1234, 7, 99 and 2024), which made seeded maps feel fake.
    const angleJitter = rng.nextInt(256);
    const radiusJitter = rng.range(88, 108);
    for (let p = 0; p < count; p++) {
      const angleStep = (Math.trunc((p * 256) / count) + angleJitter) & 255;
      const idealX = cx + Math.trunc((landRadius * 0.55 * radiusJitter * cosTable(angleStep)) / (1024 * 100));
      const idealY = cy + Math.trunc((landRadius * 0.55 * radiusJitter * sinTable(angleStep)) / (1024 * 100));
      let best = candidates[0] as GridPoint;
      let bestD = Number.MAX_SAFE_INTEGER;
      for (const c of candidates) {
        const dx = c.x - idealX;
        const dy = c.y - idealY;
        const d = dx * dx + dy * dy;
        // Keep the farthest-point rule from reusing a tile already taken.
        const tooClose = starts.some(
          (s) => Math.abs(s.x - c.x) < 8 && Math.abs(s.y - c.y) < 8,
        );
        if (tooClose) continue;
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      starts.push({ x: best.x, y: best.y });
    }
    // Then relax the layout: repeatedly move the two closest bases apart by
    // swapping the offender for the candidate farthest from every other base.
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < starts.length; i++) {
        const a = starts[i] as GridPoint;
        let nearest = Number.MAX_SAFE_INTEGER;
        for (let j = 0; j < starts.length; j++) {
          if (i === j) continue;
          const b = starts[j] as GridPoint;
          nearest = Math.min(nearest, Math.hypot(a.x - b.x, a.y - b.y));
        }
        const want = (width * 45) / 100;
        if (nearest >= want) continue;
        let best = a;
        let bestScore = nearest;
        for (const c of candidates) {
          let minOther = Number.MAX_SAFE_INTEGER;
          for (let j = 0; j < starts.length; j++) {
            if (i === j) continue;
            const b = starts[j] as GridPoint;
            minOther = Math.min(minOther, Math.hypot(c.x - b.x, c.y - b.y));
          }
          if (minOther > bestScore) {
            bestScore = minOther;
            best = c;
          }
        }
        starts[i] = best;
      }
    }
  }

  // --- Clear a buildable plateau around every start. ---
  for (const s of starts) {
    clearArea(terrain, passable, buildable, elevation, width, height, s.x, s.y, 6);
  }

  // --- Forests: clustered clumps, denser away from starts. ---
  const resourceNodes: ResourceSpawn[] = [];
  const treeClumps = Math.trunc(((width * height) / 300) * preset.treeDensity);
  for (let c = 0; c < treeClumps; c++) {
    const px = rng.nextInt(width);
    const py = rng.nextInt(height);
    if (nearAnyStart(px, py, starts, 9)) continue;
    const i = idx({ width }, px, py);
    if (!passable[i]) continue;
    const clumpSize = rng.range(7, 20);
    for (let k = 0; k < clumpSize; k++) {
      const ox = px + rng.range(-3, 3);
      const oy = py + rng.range(-3, 3);
      if (!inBounds({ width, height }, ox, oy)) continue;
      const j = idx({ width }, ox, oy);
      if (!passable[j] || buildingAt[j] !== 0) continue;
      // Keep a minimum spacing so the forest has visual gaps.
      if (terrain[j] === Terrain.Forest) continue;
      if (hasNeighbourOfKind(terrain, width, height, ox, oy, Terrain.Forest, 1) && rng.chance(1, 2)) {
        continue;
      }
      terrain[j] = Terrain.Forest;
      passable[j] = 0;
      buildable[j] = 0;
      stealth[j] = 1;
      resourceNodes.push({ kind: 'tree', x: ox, y: oy, size: 1 });
    }
  }

  // --- Per-player economy: gold, stone, berries, sheep, deer, boar. ---
  const goldSpots: GridPoint[] = [];
  const stoneSpots: GridPoint[] = [];
  for (let p = 0; p < starts.length; p++) {
    const s = starts[p] as GridPoint;
    for (let n = 0; n < 3 + preset.extraGold; n++) {
      const spot = findResourceSpot(passable, buildable, width, height, rng, s.x, s.y, 7, 16);
      if (spot) {
        goldSpots.push(spot);
        resourceNodes.push({ kind: 'gold', x: spot.x, y: spot.y, size: 1 });
      }
    }
    for (let n = 0; n < 2; n++) {
      const spot = findResourceSpot(passable, buildable, width, height, rng, s.x, s.y, 7, 16);
      if (spot) {
        stoneSpots.push(spot);
        resourceNodes.push({ kind: 'stone', x: spot.x, y: spot.y, size: 1 });
      }
    }
    const berry = findResourceSpot(passable, buildable, width, height, rng, s.x, s.y, 6, 14);
    if (berry) {
      for (let b = 0; b < 4; b++) {
        resourceNodes.push({
          kind: 'berry',
          x: berry.x + rng.range(-1, 1),
          y: berry.y + rng.range(-1, 1),
          size: 1,
        });
      }
    }
    for (let n = 0; n < 4; n++) {
      const spot = findResourceSpot(passable, buildable, width, height, rng, s.x, s.y, 4, 10);
      if (spot) resourceNodes.push({ kind: 'sheep', x: spot.x, y: spot.y, size: 1 });
    }
  }

  // --- Neutral contested economy: extra gold/stone mid-map + hunts. ---
  const neutralGold = Math.trunc(count * 2) + 4;
  for (let n = 0; n < neutralGold; n++) {
    const a = rng.nextInt(256);
    const r = Math.trunc((landRadius * rng.range(30, 85)) / 100);
    const px = cx + Math.trunc((r * cosTable(a)) / 1024);
    const py = cy + Math.trunc((r * sinTable(a)) / 1024);
    const spot = findNearestClear(passable, width, height, px, py, 14);
    if (nearAnyStart(spot.x, spot.y, starts, 6)) continue;
    const kind = rng.chance(3, 5) ? 'gold' : 'stone';
    resourceNodes.push({ kind, x: spot.x, y: spot.y, size: 1 });
  }

  const hunts: Array<'deer' | 'boar'> = ['deer', 'deer', 'deer', 'boar', 'boar'];
  for (const kind of hunts) {
    const px = rng.nextInt(width);
    const py = rng.nextInt(height);
    if (nearAnyStart(px, py, starts, 8)) continue;
    const i = idx({ width }, px, py);
    if (!passable[i]) continue;
    resourceNodes.push({ kind, x: px, y: py, size: 1 });
  }

  // --- Sacred sites and relic spots, spread around the map. ---
  const sacredSiteSpots: GridPoint[] = [];
  const relicSpots: GridPoint[] = [];
  // The sacred-site victory needs MIN_SACRED_SITES sites held at once, so the
  // generator must always place at least that many, on contested ground: as far
  // from every base as the map allows, and spread out from each other. A ring
  // radius does not work here because it lands in water on most seeds and the
  // fallback then dropped the sites into the players' laps.
  const siteCount = clamp(count + 2, MIN_SACRED_SITES, 6);
  const minDistanceFromBase = Math.trunc(width * 0.16);
  const siteCandidates = candidates.filter(
    (c) => !starts.some((st) => Math.hypot(st.x - c.x, st.y - c.y) < minDistanceFromBase),
  );
  // If the map is too tight to honour that distance, relax it rather than
  // dropping the sites.
  const pool = siteCandidates.length >= siteCount ? siteCandidates : candidates;
  for (let n = 0; n < siteCount; n++) {
    let best: GridPoint | null = null;
    let bestScore = -1;
    for (const c of pool) {
      let nearestBase = Number.MAX_SAFE_INTEGER;
      for (const st of starts) nearestBase = Math.min(nearestBase, Math.hypot(st.x - c.x, st.y - c.y));
      let nearestSite = Number.MAX_SAFE_INTEGER;
      for (const site of sacredSiteSpots) {
        nearestSite = Math.min(nearestSite, Math.hypot(site.x - c.x, site.y - c.y));
      }
      // Balance "far from the bases" against "spread from the other sites".
      const score = Math.min(nearestBase, nearestSite * 1.5);
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    if (!best) break;
    sacredSiteSpots.push(best);
  }

  for (let n = 0; n < 6; n++) {
    const px = rng.nextInt(width);
    const py = rng.nextInt(height);
    const i = idx({ width }, px, py);
    if (!passable[i] || terrain[i] === Terrain.Forest) continue;
    if (nearAnyStart(px, py, starts, 5)) continue;
    relicSpots.push({ x: px, y: py });
  }

  // Every resource node must be approachable: clear the four orthogonal
  // neighbours of each one so a villager always has somewhere to stand. Sheep,
  // mines and bushes placed inside a rock or forest pocket were ungatherable and
  // the workers assigned to them stood next to the node forever.
  for (const node of resourceNodes) {
    if (node.kind === 'tree') continue; // forests are meant to be dense
    const i0 = node.y * width + node.x;
    passable[i0] = 0; // the node itself blocks its own tile
    const neighbours: Array<[number, number]> = [
      [node.x + 1, node.y],
      [node.x - 1, node.y],
      [node.x, node.y + 1],
      [node.x, node.y - 1],
    ];
    for (const [nx, ny] of neighbours) {
      if (nx < 1 || ny < 1 || nx >= width - 1 || ny >= height - 1) continue;
      const j = ny * width + nx;
      if (resourceAt[j] !== 0) continue;
      if (terrain[j] === Terrain.Water || terrain[j] === Terrain.Rock) {
        terrain[j] = Terrain.Dirt;
        elevation[j] = 6;
      }
      if (terrain[j] === Terrain.Forest) terrain[j] = Terrain.Grass;
      passable[j] = 1;
      stealth[j] = 0;
    }
  }

  // Reserve the tiles used by sacred sites so buildings cannot overlap them.
  for (const s of sacredSiteSpots) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = s.x + dx;
        const y = s.y + dy;
        if (!inBounds({ width, height }, x, y)) continue;
        const i = idx({ width }, x, y);
        passable[i] = 1;
        buildable[i] = 0;
        terrain[i] = Terrain.Dirt;
      }
    }
  }

  const map: GameMap = {
    width,
    height,
    terrain,
    elevation,
    passable,
    buildable,
    stealth,
    blockers,
    resourceAt,
    buildingAt,
    gateOwner,
    startPositions: starts,
    sacredSiteSpots,
    relicSpots,
  };

  return { map, resourceNodes, starts };
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/**
 * Land tiles a starting base could use, subsampled on a grid so the search
 * stays cheap. Only tiles with room around them are kept, so a base never ends
 * up wedged against water or a cliff.
 */
function collectLandCandidates(
  passable: Uint8Array,
  width: number,
  height: number,
  landRadius: number,
  maxCentreDistance = 0.62,
  minEdgeMargin = 0,
): GridPoint[] {
  const out: GridPoint[] = [];
  const step = 3;
  const cx = width >> 1;
  const cy = height >> 1;
  const maxDist = Math.trunc(landRadius * maxCentreDistance);
  const margin = Math.max(minEdgeMargin, 4);
  for (let y = margin; y < height - margin; y += step) {
    for (let x = margin; x < width - margin; x += step) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy > maxDist * maxDist) continue;
      // Require a clear 5x5 neighbourhood so the base plateau fits.
      let clear = true;
      for (let oy = -2; oy <= 2 && clear; oy++) {
        for (let ox = -2; ox <= 2; ox++) {
          if (!passable[(y + oy) * width + (x + ox)]) {
            clear = false;
            break;
          }
        }
      }
      if (clear) out.push({ x, y });
    }
  }
  return out;
}

/** 16-entry direction table, index 0..255 => unit vector scaled by 1024. */
const SIN16: number[] = [
  0, 25, 50, 74, 98, 121, 142, 162, 181, 198, 213, 226, 237, 245, 251, 255, 256, 255, 251, 245, 237,
  226, 213, 198, 181, 162, 142, 121, 98, 74, 50, 25, 0, -25, -50, -74, -98, -121, -142, -162, -181,
  -198, -213, -226, -237, -245, -251, -255, -256, -255, -251, -245, -237, -226, -213, -198, -181,
  -162, -142, -121, -98, -74, -50, -25,
];

function tableLookup(angle: number, table: number[]): number {
  // 64 entries cover 0..255 in steps of 4; interpolate linearly.
  const a = angle & 255;
  const i = a >> 2;
  const f = a & 3;
  const v0 = table[i % 64] as number;
  const v1 = table[(i + 1) % 64] as number;
  return v0 + Math.trunc(((v1 - v0) * f) / 4);
}

function sinTable(angle: number): number {
  return tableLookup(angle, SIN16);
}

function cosTable(angle: number): number {
  return tableLookup((angle + 64) & 255, SIN16);
}

function idxOf(width: number, x: number, y: number): number {
  return y * width + x;
}

/** Spiral search for the nearest tile satisfying `ok`. */
function findNearestClear(
  passable: Uint8Array,
  width: number,
  height: number,
  sx: number,
  sy: number,
  maxRadius: number,
): GridPoint {
  sx = clamp(sx, 0, width - 1);
  sy = clamp(sy, 0, height - 1);
  if (passable[idxOf(width, sx, sy)]) return { x: sx, y: sy };
  for (let r = 1; r <= maxRadius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const x = sx + dx;
        const y = sy + dy;
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        if (passable[idxOf(width, x, y)]) return { x, y };
      }
    }
  }
  return { x: sx, y: sy };
}

function nearAnyStart(x: number, y: number, starts: GridPoint[], radius: number): boolean {
  for (const s of starts) {
    if (Math.abs(s.x - x) <= radius && Math.abs(s.y - y) <= radius) return true;
  }
  return false;
}

function hasNeighbourOfKind(
  terrain: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
  kind: Terrain,
  radius: number,
): boolean {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      if (terrain[idxOf(width, nx, ny)] === kind) return true;
    }
  }
  return false;
}

/** Find a buildable spot in a distance band from a start position. */
function findResourceSpot(
  passable: Uint8Array,
  buildable: Uint8Array,
  width: number,
  height: number,
  rng: Rng,
  sx: number,
  sy: number,
  minDist: number,
  maxDist: number,
): GridPoint | null {
  for (let attempt = 0; attempt < 60; attempt++) {
    const angle = rng.nextInt(256);
    const dist = rng.range(minDist, maxDist);
    const x = sx + Math.trunc((dist * cosTable(angle)) / 1024);
    const y = sy + Math.trunc((dist * sinTable(angle)) / 1024);
    if (x < 1 || y < 1 || x >= width - 1 || y >= height - 1) continue;
    const i = idxOf(width, x, y);
    if (!passable[i] || !buildable[i]) continue;
    return { x, y };
  }
  return null;
}

/** Clear every non-passable tile inside a square, for starting plateaus. */
function clearArea(
  terrain: Uint8Array,
  passable: Uint8Array,
  buildable: Uint8Array,
  elevation: Int32Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
): void {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const i = idxOf(width, x, y);
      if (terrain[i] === Terrain.Water || terrain[i] === Terrain.Rock) {
        terrain[i] = Terrain.Grass;
        elevation[i] = 6;
      }
      if (terrain[i] === Terrain.Forest) {
        terrain[i] = Terrain.Grass;
      }
      passable[i] = 1;
      buildable[i] = 1;
    }
  }
}

/** Convert a tile coordinate to the fixed-point centre of that tile. */
export function tileCenter(t: number): number {
  return (t << 10) + FP_ONE / 2;
}
