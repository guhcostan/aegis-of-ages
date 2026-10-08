/**
 * Deterministic grid pathfinding.
 *
 * A* over the 8-connected tile grid with an explicit binary heap. Ordering is
 * fully deterministic (f, then h, then tile index), so the same query always
 * yields the same path. Expansion work is capped per call and drained through a
 * budget queue so that hundreds of units can repath without a frame spike.
 */
import { FP_ONE, ARRIVE_EPSILON } from '../constants';
import { isqrt } from '../fixed';
import type { GameMap } from './terrain';

/** Cardinal cost and diagonal cost in fixed point (diagonal = sqrt(2)). */
const COST_STRAIGHT = FP_ONE;
const COST_DIAGONAL = 1448; // 1024 * sqrt(2), rounded

const NEIGHBOURS: ReadonlyArray<readonly [number, number, number]> = [
  [1, 0, COST_STRAIGHT],
  [-1, 0, COST_STRAIGHT],
  [0, 1, COST_STRAIGHT],
  [0, -1, COST_STRAIGHT],
  [1, 1, COST_DIAGONAL],
  [1, -1, COST_DIAGONAL],
  [-1, 1, COST_DIAGONAL],
  [-1, -1, COST_DIAGONAL],
];

/**
 * Binary min-heap keyed by (f, h, index) for deterministic ordering.
 * Reused across queries to avoid per-path allocation.
 */
class Heap {
  private f: Int32Array;
  private h: Int32Array;
  private node: Int32Array;
  private size = 0;
  private capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.f = new Int32Array(capacity);
    this.h = new Int32Array(capacity);
    this.node = new Int32Array(capacity);
  }

  clear(): void {
    this.size = 0;
  }

  get length(): number {
    return this.size;
  }

  private less(i: number, j: number): boolean {
    const fi = this.f[i] as number;
    const fj = this.f[j] as number;
    if (fi !== fj) return fi < fj;
    const hi = this.h[i] as number;
    const hj = this.h[j] as number;
    if (hi !== hj) return hi < hj;
    return (this.node[i] as number) < (this.node[j] as number);
  }

  private swap(i: number, j: number): void {
    let t = this.f[i] as number;
    this.f[i] = this.f[j] as number;
    this.f[j] = t;
    t = this.h[i] as number;
    this.h[i] = this.h[j] as number;
    this.h[j] = t;
    t = this.node[i] as number;
    this.node[i] = this.node[j] as number;
    this.node[j] = t;
  }

  push(node: number, f: number, h: number): void {
    if (this.size >= this.capacity) return;
    let i = this.size++;
    this.f[i] = f;
    this.h[i] = h;
    this.node[i] = node;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.less(i, parent)) {
        this.swap(i, parent);
        i = parent;
      } else break;
    }
  }

  pop(): number {
    const top = this.node[0] as number;
    this.size--;
    if (this.size > 0) {
      this.f[0] = this.f[this.size] as number;
      this.h[0] = this.h[this.size] as number;
      this.node[0] = this.node[this.size] as number;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let smallest = i;
        if (l < this.size && this.less(l, smallest)) smallest = l;
        if (r < this.size && this.less(r, smallest)) smallest = r;
        if (smallest === i) break;
        this.swap(i, smallest);
        i = smallest;
      }
    }
    return top;
  }
}

export interface PathfinderStats {
  expansions: number;
  queries: number;
  failures: number;
}

/**
 * Pathfinder bound to one map. Holds reusable scratch buffers sized to the map,
 * so steady-state pathing allocates nothing.
 */
export class Pathfinder {
  readonly map: GameMap;
  private readonly tileCount: number;
  private readonly gScore: Int32Array;
  private readonly cameFrom: Int32Array;
  private readonly closed: Uint8Array;
  private readonly stamp: Int32Array;
  private generation = 1;
  private readonly heap: Heap;
  readonly stats: PathfinderStats = { expansions: 0, queries: 0, failures: 0 };

  constructor(map: GameMap) {
    this.map = map;
    this.tileCount = map.width * map.height;
    this.gScore = new Int32Array(this.tileCount);
    this.cameFrom = new Int32Array(this.tileCount);
    this.closed = new Uint8Array(this.tileCount);
    this.stamp = new Int32Array(this.tileCount);
    this.heap = new Heap(Math.min(this.tileCount, 1 << 16));
  }

  private passable(x: number, y: number, size: number, ownerId = -1): boolean {
    const { width, height, passable } = this.map;
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    if (!passable[y * width + x]) {
      // A gate belongs to its builder: that player's units walk through it,
      // everyone else is stopped by it.
      if (ownerId >= 0 && this.map.gateOwner[y * width + x] === ownerId + 1) {
        return true;
      }
      return false;
    }
    if (size > 1) {
      // Wider units need a clear 3x3 neighbourhood to squeeze through.
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) return false;
          if (!passable[ny * width + nx]) return false;
        }
      }
    }
    return true;
  }

  /** True when a unit of `size` tiles can stand on this tile. */
  canStand(x: number, y: number, size: number): boolean {
    return this.passable(x, y, size);
  }

  /**
   * Find a path from (sx,sy) to (gx,gy) in tile coordinates.
   * Returns a flat array of fixed-point waypoint pairs, or null when no path
   * exists within `maxExpansions`.
   */
  findPath(
    sx: number,
    sy: number,
    gx: number,
    gy: number,
    size = 1,
    maxExpansions = 6000,
    ownerId = -1,
  ): number[] | null {
    const { width } = this.map;
    const start = sy * width + sx;
    let goal = gy * width + gx;
    this.stats.queries++;

    if (sx === gx && sy === gy) return [];

    // If the goal is blocked, retarget to the closest passable tile near it.
    if (!this.passable(gx, gy, size, ownerId)) {
      const alt = this.nearestPassable(gx, gy, size, 8);
      if (!alt) {
        this.stats.failures++;
        return null;
      }
      goal = alt.y * width + alt.x;
      if (goal === start) return [];
      gx = alt.x;
      gy = alt.y;
    }

    this.generation++;
    this.heap.clear();
    this.closed.fill(0);
    this.stamp[start] = this.generation;
    this.gScore[start] = 0;
    this.cameFrom[start] = -1;
    this.heap.push(start, this.heuristic(sx, sy, gx, gy), this.heuristic(sx, sy, gx, gy));

    let expansions = 0;
    while (this.heap.length > 0) {
      const current = this.heap.pop();
      if (this.closed[current]) continue;
      this.closed[current] = 1;
      expansions++;

      if (current === goal) {
        this.stats.expansions += expansions;
        return this.reconstruct(current, width);
      }
      if (expansions >= maxExpansions) break;

      const cx = current % width;
      const cy = (current / width) | 0;
      const gCur = this.gScore[current] as number;

      for (let n = 0; n < NEIGHBOURS.length; n++) {
        const nb = NEIGHBOURS[n] as readonly [number, number, number];
        const nx = cx + nb[0];
        const ny = cy + nb[1];
        if (!this.passable(nx, ny, size, ownerId)) continue;
        // Prevent cutting corners through blocked diagonals.
        if (nb[0] !== 0 && nb[1] !== 0) {
          if (
            !this.passable(cx + nb[0], cy, size, ownerId) ||
            !this.passable(cx, cy + nb[1], size, ownerId)
          ) {
            continue;
          }
        }
        const ni = ny * width + nx;
        if (this.closed[ni]) continue;
        const tentative = gCur + nb[2];
        const seen = this.stamp[ni] === this.generation;
        if (seen && tentative >= (this.gScore[ni] as number)) continue;
        this.stamp[ni] = this.generation;
        this.gScore[ni] = tentative;
        this.cameFrom[ni] = current;
        const h = this.heuristic(nx, ny, gx, gy);
        this.heap.push(ni, tentative + h, h);
      }
    }

    // No complete path: fall back to the best partial path towards the goal.
    this.stats.failures++;
    const best = this.bestPartial(goal, maxExpansions);
    if (best >= 0) {
      this.stats.expansions += expansions;
      return this.reconstruct(best, width);
    }
    return null;
  }

  private heuristic(ax: number, ay: number, bx: number, by: number): number {
    const dx = Math.abs(ax - bx);
    const dy = Math.abs(ay - by);
    // Octile distance.
    const min = dx < dy ? dx : dy;
    const max = dx < dy ? dy : dx;
    return min * COST_DIAGONAL + (max - min) * COST_STRAIGHT;
  }

  private reconstruct(goalNode: number, width: number): number[] {
    const tiles: number[] = [];
    let cur = goalNode;
    let guard = 0;
    while (cur !== -1 && guard++ < this.tileCount) {
      tiles.push(cur);
      cur = this.cameFrom[cur] as number;
    }
    tiles.reverse();
    // Drop the starting tile: the unit already stands there.
    if (tiles.length > 1) tiles.shift();
    return this.smooth(TilePath.fromTiles(tiles, width));
  }

  /**
   * Pick the deepest reachable node near the goal; used when the goal itself is
   * unreachable (walled-off target).
   */
  private bestPartial(goalNode: number, _maxExpansions: number): number {
    const width = this.map.width;
    const gx = goalNode % width;
    const gy = (goalNode / width) | 0;
    let best = -1;
    let bestScore = 0x7fffffff;
    for (let i = 0; i < this.tileCount; i++) {
      if (!this.closed[i]) continue;
      const x = i % width;
      const y = (i / width) | 0;
      const dx = Math.abs(x - gx);
      const dy = Math.abs(y - gy);
      const min = dx < dy ? dx : dy;
      const max = dx < dy ? dy : dx;
      const score = min * COST_DIAGONAL + (max - min) * COST_STRAIGHT;
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    }
    return best;
  }

  /**
   * Reduce a tile path to the minimal set of waypoints by skipping nodes that
   * are mutually visible along a straight line.
   */
  private smooth(tiles: Array<{ x: number; y: number }>): number[] {
    const out: number[] = [];
    if (tiles.length === 0) return out;
    let anchor = 0;
    while (anchor < tiles.length) {
      let furthest = anchor;
      for (let probe = anchor + 1; probe < tiles.length; probe++) {
        if (this.lineOfSight(tiles[anchor] as TilePoint, tiles[probe] as TilePoint)) furthest = probe;
        else break;
      }
      const t = tiles[furthest] as TilePoint;
      out.push((t.x << 10) + FP_ONE / 2, (t.y << 10) + FP_ONE / 2);
      if (furthest === anchor) break;
      anchor = furthest;
    }
    return out;
  }

  /** Integer supercover line walk; true when every tile on the line is walkable. */
  lineOfSight(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
    let x0 = a.x;
    let y0 = a.y;
    const x1 = b.x;
    const y1 = b.y;
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let guard = 0;
    while (guard++ < 4096) {
      if (!this.passable(x0, y0, 1)) return false;
      if (x0 === x1 && y0 === y1) return true;
      const e2 = err * 2;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
    return false;
  }

  /** Spiral search for a passable tile near the given one. */
  nearestPassable(x: number, y: number, size: number, radius: number): { x: number; y: number } | null {
    if (this.passable(x, y, size)) return { x, y };
    for (let r = 1; r <= radius; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (this.passable(nx, ny, size)) return { x: nx, y: ny };
        }
      }
    }
    return null;
  }

  /** Straight-line walkability between two fixed-point points. */
  straightWalkable(ax: number, ay: number, bx: number, by: number, size: number): boolean {
    const steps = Math.max(1, Math.trunc(isqrt((bx - ax) * (bx - ax) + (by - ay) * (by - ay)) / (FP_ONE / 2)));
    for (let i = 0; i <= steps; i++) {
      const t = Math.trunc((i * FP_ONE) / steps);
      const x = ax + Math.trunc(((bx - ax) * t) / FP_ONE);
      const y = ay + Math.trunc(((by - ay) * t) / FP_ONE);
      if (!this.passable(x >> 10, y >> 10, size)) return false;
    }
    return true;
  }
}

interface TilePoint {
  x: number;
  y: number;
}

/** Small helper so `reconstruct` can reuse the smoothing code. */
const TilePath = {
  fromTiles(tiles: number[], width: number): TilePoint[] {
    const out: TilePoint[] = new Array(tiles.length);
    for (let i = 0; i < tiles.length; i++) {
      const n = tiles[i] as number;
      out[i] = { x: n % width, y: (n / width) | 0 };
    }
    return out;
  },
};

export { ARRIVE_EPSILON };
