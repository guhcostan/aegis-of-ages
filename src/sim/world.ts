/**
 * World: the single mutable container of simulation state.
 *
 * Contains entity storage, per-player state, the map, a rebuilt-each-tick
 * spatial hash used by combat/gathering queries, and the deterministic RNG.
 * Nothing in this file touches the DOM or three.js.
 */
import { Age, FP_HALF, FP_ONE, MAX_ENTITIES, MAX_PLAYERS, POP_CAP_MAX, TICK_RATE } from './constants';
import { Hasher, Rng } from './rng';
import { fpDist2, isqrt } from './fixed';
import type { GameMap } from './map/terrain';
import { Pathfinder } from './map/pathfind';
import {
  EntityKind,
  OrderKind,
  ResourceNodeKind,
  UnitClass,
  UnitRole,
  emptyCost,
  type Cost,
  type Entity,
  type Order,
  type PlayerConfig,
  type PlayerState,
} from './types';
import { BUILDINGS } from './data/buildings';
import { UNITS } from './data/units';

/** Cell size in tiles for the spatial hash. */
const CELL_SIZE = 4;

export interface SpawnUnitOptions {
  owner: number;
  defId: string;
  x: number;
  y: number;
  facing?: number;
}

export interface SpawnBuildingOptions {
  owner: number;
  defId: string;
  tileX: number;
  tileY: number;
  /** 0..1000. Buildings start at 0 unless spawned completed. */
  construction?: number;
}

export class World {
  readonly map: GameMap;
  readonly pathfinder: Pathfinder;
  readonly rng: Rng;
  readonly entities: Entity[] = [];
  readonly players: PlayerState[] = [];
  tick = 0;
  /** Incremented whenever a player's techs or age change, invalidating caches. */
  modVersion = 0;
  readonly seed: number;

  /** Spatial hash, rebuilt every tick. */
  private readonly cellHead: Int32Array;
  private readonly cellNext: Int32Array;
  private readonly cellCount: number;
  private readonly cellsX: number;
  private readonly cellsY: number;

  private freeIds: number[] = [];
  /** Number of alive units per player, maintained incrementally. */
  private readonly unitCounts: Int32Array = new Int32Array(MAX_PLAYERS);

  constructor(map: GameMap, seed: number) {
    this.map = map;
    this.seed = seed;
    this.rng = new Rng(seed);
    this.pathfinder = new Pathfinder(map);
    this.cellsX = Math.ceil(map.width / CELL_SIZE);
    this.cellsY = Math.ceil(map.height / CELL_SIZE);
    this.cellCount = this.cellsX * this.cellsY;
    this.cellHead = new Int32Array(this.cellCount).fill(-1);
    this.cellNext = new Int32Array(MAX_ENTITIES).fill(-1);
  }

  /* ---------------------------------------------------------------- *
   * Players
   * ---------------------------------------------------------------- */

  addPlayer(config: PlayerConfig, startingResources: Cost): PlayerState {
    const player: PlayerState = {
      id: this.players.length,
      name: config.name,
      civ: config.civ,
      team: config.team,
      bot: config.bot,
      age: Age.Dark,
      resources: { ...startingResources },
      pop: 0,
      popCap: 0,
      techs: new Set<string>(),
      researching: new Map(),
      landmarks: [],
      defeated: false,
      sacredHoldTicks: 0,
      wonderAt: 0,
      stats: {
        unitsTrained: 0,
        unitsLost: 0,
        unitsKilled: 0,
        buildingsBuilt: 0,
        buildingsLost: 0,
        resourcesGathered: emptyCost(),
        relicsHeld: 0,
        peakPop: 0,
      },
      modVersion: 0,
    };
    this.players.push(player);
    return player;
  }

  /* ---------------------------------------------------------------- *
   * Entity lifecycle
   * ---------------------------------------------------------------- */

  private allocateId(): number {
    const recycled = this.freeIds.pop();
    if (recycled !== undefined) return recycled;
    return this.entities.length;
  }

  createEntity(kind: EntityKind, def: string, owner: number, x: number, y: number): Entity {
    if (this.entities.length >= MAX_ENTITIES) {
      throw new Error(`entity cap reached (${MAX_ENTITIES})`);
    }
    const id = this.allocateId();
    const e: Entity = {
      id,
      kind,
      def,
      owner,
      alive: true,
      x,
      y,
      facing: 0,
      hp: 1,
      maxHp: 1,
      orders: [],
      cooldown: 0,
      windup: -1,
      attackTarget: 0,
      path: [],
      pathIndex: 0,
      goalX: x,
      goalY: y,
      hasGoal: false,
      repathAt: 0,
      gather: { resource: 0, node: 0, progress: 0, carried: 0, dropOff: 0 },
      build: { site: 0, progress: 0 },
      carried: 0,
      inside: 0,
      production: { entries: [], rallyX: -1, rallyY: -1, rallyTarget: 0 },
      construction: 1000,
      popProvided: 0,
      builders: 0,
      relicHeld: 0,
      amount: 0,
      resourceKind: 0,
      stunUntil: 0,
      lastDamageTick: -1,
      healAccum: 0,
      chargeReady: 1,
      target: 0,
      damage: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      z: 0,
      ttl: 0,
      source: 0,
    };
    this.entities[id] = e;
    if (kind === EntityKind.Unit) this.unitCounts[owner] = (this.unitCounts[owner] | 0) + 1;
    return e;
  }

  /** Spawn a fully-formed unit. */
  spawnUnit(opts: SpawnUnitOptions): Entity {
    const def = UNITS[opts.defId];
    if (!def) throw new Error(`unknown unit def: ${opts.defId}`);
    const e = this.createEntity(EntityKind.Unit, opts.defId, opts.owner, opts.x, opts.y);
    e.facing = opts.facing ?? 0;
    const player = this.players[opts.owner];
    const hpBonus = player ? this.statMod(opts.owner, 'hp') : 0;
    e.maxHp = def.hp + hpBonus;
    e.hp = e.maxHp;
    return e;
  }

  /** Spawn a resource node (tree, mine, animal, bush). */
  spawnResourceNode(kind: string, x: number, y: number, owner = -1): Entity {
    const e = this.createEntity(EntityKind.ResourceNode, kind, owner, x, y);
    const spec = RESOURCE_SPECS[kind];
    if (!spec) throw new Error(`unknown resource kind: ${kind}`);
    e.amount = spec.amount;
    e.resourceKind = spec.resource;
    e.maxHp = spec.hp;
    e.hp = spec.hp;
    this.setBlocking(x >> 10, y >> 10, 1, 1, e.id, kind === 'tree' ? 1 : 0);
    const t = (y >> 10) * this.map.width + (x >> 10);
    this.map.resourceAt[t] = e.id;
    return e;
  }

  /** Spawn a building, either under construction or finished. */
  spawnBuilding(opts: SpawnBuildingOptions): Entity {
    const def = BUILDINGS[opts.defId];
    if (!def) throw new Error(`unknown building def: ${opts.defId}`);
    const x = (opts.tileX << 10) + ((def.width << 10) >> 1);
    const y = (opts.tileY << 10) + ((def.height << 10) >> 1);
    const e = this.createEntity(EntityKind.Building, opts.defId, opts.owner, x, y);
    const hpBonus = this.statMod(opts.owner, 'hp');
    e.maxHp = def.hp + hpBonus;
    e.construction = opts.construction ?? 0;
    e.hp = Math.max(1, Math.trunc((e.maxHp * e.construction) / 1000));
    this.setBlocking(
      opts.tileX,
      opts.tileY,
      def.width,
      def.height,
      e.id,
      0,
      def.isGate ? opts.owner + 1 : 0,
    );
    if (e.construction >= 1000) this.onBuildingComplete(e);
    return e;
  }

  destroyEntity(id: number, killer = -1): void {
    const e = this.entities[id];
    if (!e || !e.alive) return;
    e.alive = false;
    if (e.kind === EntityKind.Building) {
      const def = BUILDINGS[e.def];
      if (def) {
        this.clearBlocking(e.x >> 10, e.y >> 10, def.width, def.height);
        this.onBuildingDestroyed(e);
      }
    } else if (e.kind === EntityKind.ResourceNode) {
      const t = (e.y >> 10) * this.map.width + (e.x >> 10);
      if (this.map.resourceAt[t] === id) this.map.resourceAt[t] = 0;
      this.clearBlocking(e.x >> 10, e.y >> 10, 1, 1);
    } else if (e.kind === EntityKind.Unit) {
      const owner = e.owner;
      if (owner >= 0 && owner < MAX_PLAYERS) {
        this.unitCounts[owner] = Math.max(0, (this.unitCounts[owner] | 0) - 1);
        const p = this.players[owner];
        if (p) {
          p.stats.unitsLost++;
          const kp = this.players[killer];
          if (kp && killer !== owner) kp.stats.unitsKilled++;
        }
      }
    } else if (e.kind === EntityKind.Relic) {
      // Free the tile the relic occupied.
    }
    this.freeIds.push(id);
    this.entities[id] = undefined as unknown as Entity;
    this.unlinkFromCells(id);
  }

  get(id: number): Entity | undefined {
    if (id <= 0) return undefined;
    const e = this.entities[id];
    return e && e.alive ? e : undefined;
  }

  /** All alive entities, in deterministic id order. */
  *all(): Generator<Entity> {
    for (let i = 0; i < this.entities.length; i++) {
      const e = this.entities[i];
      if (e && e.alive) yield e;
    }
  }

  unitCount(owner: number): number {
    return this.unitCounts[owner] | 0;
  }

  /** Alive units of a player, appended into `out` to avoid allocation. */
  unitsOf(owner: number, out: Entity[]): Entity[] {
    out.length = 0;
    for (let i = 0; i < this.entities.length; i++) {
      const e = this.entities[i];
      if (e && e.alive && e.kind === EntityKind.Unit && e.owner === owner) out.push(e);
    }
    return out;
  }

  buildingsOf(owner: number, out: Entity[]): Entity[] {
    out.length = 0;
    for (let i = 0; i < this.entities.length; i++) {
      const e = this.entities[i];
      if (e && e.alive && e.kind === EntityKind.Building && e.owner === owner) out.push(e);
    }
    return out;
  }

  /* ---------------------------------------------------------------- *
   * Tile occupancy
   * ---------------------------------------------------------------- */

  setBlocking(
    tx: number,
    ty: number,
    w: number,
    h: number,
    id: number,
    stealthBlock: number,
    gateOwner = 0,
  ): void {
    const { width, height } = this.map;
    for (let y = ty; y < ty + h; y++) {
      for (let x = tx; x < tx + w; x++) {
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        const i = y * width + x;
        this.map.blockers[i] = id;
        this.map.passable[i] = 0;
        this.map.buildingAt[i] = id;
        if (stealthBlock) this.map.stealth[i] = 1;
        // Gates stay blocking for enemies but are walkable for their owner.
        if (gateOwner > 0) this.map.gateOwner[i] = gateOwner;
      }
    }
  }

  clearBlocking(tx: number, ty: number, w: number, h: number): void {
    const { width, height } = this.map;
    for (let y = ty; y < ty + h; y++) {
      for (let x = tx; x < tx + w; x++) {
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        const i = y * width + x;
        this.map.blockers[i] = 0;
        this.map.buildingAt[i] = 0;
        this.map.gateOwner[i] = 0;
        // Restore passability from terrain.
        const t = this.map.terrain[i];
        this.map.passable[i] = t === 2 || t === 5 ? 0 : 1; // Water | Rock
        this.map.stealth[i] = t === 3 ? 1 : 0; // Forest
      }
    }
  }

  /** Whether a building footprint fits and is clear. */
  canPlaceBuilding(defId: string, tx: number, ty: number): boolean {
    const def = BUILDINGS[defId];
    if (!def) return false;
    const { width, height } = this.map;
    for (let y = ty; y < ty + def.height; y++) {
      for (let x = tx; x < tx + def.width; x++) {
        if (x < 0 || y < 0 || x >= width || y >= height) return false;
        const i = y * width + x;
        if (!this.map.buildable[i]) return false;
        if (this.map.blockers[i] !== 0) return false;
        if (this.map.resourceAt[i] !== 0) return false;
      }
    }
    return true;
  }

  /* ---------------------------------------------------------------- *
   * Spatial hash
   * ---------------------------------------------------------------- */

  rebuildSpatialIndex(): void {
    this.cellHead.fill(-1);
    for (let i = 0; i < this.entities.length; i++) {
      this.cellNext[i] = -1;
    }
    for (let i = 0; i < this.entities.length; i++) {
      const e = this.entities[i];
      if (!e || !e.alive) continue;
      if (e.kind === EntityKind.Projectile) continue;
      const c = this.cellOf(e);
      this.cellNext[i] = this.cellHead[c] as number;
      this.cellHead[c] = i;
    }
  }

  private unlinkFromCells(_id: number): void {
    // The index is fully rebuilt each tick, so removal needs no extra work.
  }

  private cellOf(e: Entity): number {
    const cx = Math.min(this.cellsX - 1, Math.max(0, e.x >> (10 + 2)));
    const cy = Math.min(this.cellsY - 1, Math.max(0, e.y >> (10 + 2)));
    return cy * this.cellsX + cx;
  }

  /**
   * Collect alive entities whose centre lies within `radius` (fixed point) of
   * (x,y). Results are appended to `out` in deterministic cell-then-id order.
   */
  queryRadius(x: number, y: number, radius: number, out: Entity[]): Entity[] {
    out.length = 0;
    const r2 = radius * radius;
    const cellRadius = Math.max(1, ((radius >> 10) / CELL_SIZE + 1) | 0);
    const cx = Math.min(this.cellsX - 1, Math.max(0, x >> 12));
    const cy = Math.min(this.cellsY - 1, Math.max(0, y >> 12));
    for (let gy = cy - cellRadius; gy <= cy + cellRadius; gy++) {
      if (gy < 0 || gy >= this.cellsY) continue;
      for (let gx = cx - cellRadius; gx <= cx + cellRadius; gx++) {
        if (gx < 0 || gx >= this.cellsX) continue;
        let id = this.cellHead[gy * this.cellsX + gx] as number;
        let guard = 0;
        while (id !== -1 && guard++ < MAX_ENTITIES) {
          const e = this.entities[id];
          if (e && e.alive && fpDist2(x, y, e.x, e.y) <= r2) out.push(e);
          id = this.cellNext[id] as number;
        }
      }
    }
    out.sort((a, b) => a.id - b.id);
    return out;
  }

  /** Nearest entity matching `filter` within `maxRadius`. */
  nearest(
    x: number,
    y: number,
    maxRadius: number,
    filter: (e: Entity) => boolean,
    scratch: Entity[],
  ): Entity | null {
    const found = this.queryRadius(x, y, maxRadius, scratch);
    let best: Entity | null = null;
    let bestD = 0x7ffffffffffff;
    for (const e of found) {
      if (!filter(e)) continue;
      const d = fpDist2(x, y, e.x, e.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  /* ---------------------------------------------------------------- *
   * Population
   * ---------------------------------------------------------------- */

  recomputePopulation(player: PlayerState): void {
    let pop = 0;
    let cap = 0;
    for (const e of this.all()) {
      if (e.owner !== player.id) continue;
      if (e.kind === EntityKind.Unit) {
        const def = UNITS[e.def];
        if (def) pop += def.pop;
      } else if (e.kind === EntityKind.Building && e.construction >= 1000) {
        const def = BUILDINGS[e.def];
        if (def) cap += def.popProvided;
      }
    }
    player.pop = pop;
    player.popCap = Math.min(POP_CAP_MAX, cap);
    if (pop > player.stats.peakPop) player.stats.peakPop = pop;
  }

  /* ---------------------------------------------------------------- *
   * Building lifecycle hooks (implemented by systems that care)
   * ---------------------------------------------------------------- */

  onBuildingComplete(e: Entity): void {
    const def = BUILDINGS[e.def];
    if (!def) return;
    e.construction = 1000;
    e.maxHp = def.hp + this.statMod(e.owner, 'hp');
    e.hp = e.maxHp;
    const player = this.players[e.owner];
    if (player) {
      player.stats.buildingsBuilt++;
      if (def.isLandmark && !player.landmarks.includes(e.id)) {
        player.landmarks.push(e.id);
      }
    }
  }

  onBuildingDestroyed(e: Entity): void {
    const def = BUILDINGS[e.def];
    const player = this.players[e.owner];
    if (player) {
      player.stats.buildingsLost++;
      if (def && def.isLandmark) {
        const i = player.landmarks.indexOf(e.id);
        if (i >= 0) player.landmarks.splice(i, 1);
      }
    }
  }

  /* ---------------------------------------------------------------- *
   * Stat modifiers (civ bonuses + technologies)
   * ---------------------------------------------------------------- */

  /**
   * Aggregated percentage modifier for a simple stat key. Kept intentionally
   * small: the tech system writes into the caches below whenever the player's
   * tech set changes.
   */
  statMod(_playerId: number, _stat: string): number {
    // Filled in by stats.ts; kept here so World has no dependency cycle.
    return 0;
  }

  /* ---------------------------------------------------------------- *
   * Snapshot / hashing
   * ---------------------------------------------------------------- */

  /**
   * Stable digest of the gameplay state. Used by tests to prove that the same
   * seed and same command stream produce the same result.
   */
  hashState(): number {
    const h = new Hasher();
    h.int(this.tick);
    h.int(this.rng.getState());
    for (let i = 0; i < this.entities.length; i++) {
      const e = this.entities[i];
      if (!e || !e.alive) continue;
      h.int(e.id);
      h.int(e.kind);
      h.string(e.def);
      h.int(e.owner);
      h.int(e.x);
      h.int(e.y);
      h.int(e.facing);
      h.int(e.hp);
      h.int(e.construction);
      h.int(e.amount);
      h.int(e.orders.length);
      if (e.orders.length > 0) h.int((e.orders[0] as Order).kind);
      h.int(e.gather.carried);
      h.int(e.production.entries.length);
    }
    for (const p of this.players) {
      h.int(p.id);
      h.int(p.age);
      h.int(p.resources.food);
      h.int(p.resources.wood);
      h.int(p.resources.gold);
      h.int(p.resources.stone);
      h.int(p.pop);
      h.int(p.popCap);
      h.int(p.defeated ? 1 : 0);
      h.int(p.techs.size);
    }
    return h.digest();
  }
}

/* ------------------------------------------------------------------ *
 * Resource node specifications
 * ------------------------------------------------------------------ */

export interface ResourceSpec {
  amount: number;
  resource: number;
  hp: number;
}

export const RESOURCE_SPECS: Record<string, ResourceSpec> = {
  tree: { amount: 100, resource: 1, hp: 20 },
  berry: { amount: 120, resource: 0, hp: 10 },
  gold: { amount: 600, resource: 2, hp: 10 },
  stone: { amount: 400, resource: 3, hp: 10 },
  sheep: { amount: 100, resource: 0, hp: 10 },
  deer: { amount: 140, resource: 0, hp: 12 },
  boar: { amount: 200, resource: 0, hp: 30 },
};

export { FP_HALF, FP_ONE, TICK_RATE, isqrt, OrderKind, ResourceNodeKind, UnitClass, UnitRole };
