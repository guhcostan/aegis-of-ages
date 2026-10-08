/**
 * Global simulation constants.
 *
 * DETERMINISM CONTRACT
 * --------------------
 * The simulation never uses floating point for gameplay state, never calls
 * Math.random / Date.now / performance.now, and never uses transcendental
 * Math functions (sin/cos/atan2/pow) whose results are not bit-identical
 * across JS engines. All positions, speeds, distances and timers are plain
 * integers. Same seed + same command list => identical state hash, in Node
 * and in the browser.
 */

/** Simulation ticks per second. Fixed, never varies with frame rate. */
export const TICK_RATE = 20;

/** Milliseconds of simulated time per tick. */
export const TICK_MS = 1000 / TICK_RATE;

/**
 * Fixed point scale: one map tile equals FP_ONE fixed-point units.
 * Powers of two keep division/multiplication exact.
 */
export const FP_SHIFT = 10;
export const FP_ONE = 1 << FP_SHIFT; // 1024
export const FP_HALF = FP_ONE >> 1;

/** Resource kinds. Order is part of the state hash and the wire protocol. */
export const enum Resource {
  Food = 0,
  Wood = 1,
  Gold = 2,
  Stone = 3,
}

export const RESOURCE_COUNT = 4;
export const RESOURCE_NAMES = ['Food', 'Wood', 'Gold', 'Stone'] as const;

/** Ages. Age 0 is the starting age. */
export const enum Age {
  Dark = 0,
  Feudal = 1,
  Castle = 2,
  Imperial = 3,
}

export const AGE_COUNT = 4;
export const AGE_NAMES = ['Dark Age', 'Feudal Age', 'Castle Age', 'Imperial Age'] as const;

/** Victory conditions selectable in the skirmish lobby. */
export const enum VictoryCondition {
  Landmarks = 0,
  SacredSites = 1,
  Wonder = 2,
}

/** Bot difficulty tiers. */
export const enum Difficulty {
  Easy = 0,
  Intermediate = 1,
  Hard = 2,
}

export const DIFFICULTY_NAMES = ['Easy', 'Intermediate', 'Hard'] as const;

/** Population cap mandated by the design spec. */
export const POP_CAP_MAX = 200;

/** Fixed set of map sizes (tiles, square). */
export const MAP_SIZES = {
  tiny: 80,
  small: 112,
  medium: 144,
  large: 176,
  huge: 208,
} as const;

export type MapSizeName = keyof typeof MAP_SIZES;

/** Teams are 0-based; team 0 is always the human/simulated player by default. */
export const MAX_PLAYERS = 4;

/** Sacred site victory requires holding this many sites for this long (ticks). */
export const SACRED_SITE_VICTORY_COUNT = 3;
export const SACRED_SITE_VICTORY_TICKS = TICK_RATE * 60 * 5; // 5 minutes

/** Wonder victory countdown (ticks). */
export const WONDER_VICTORY_TICKS = TICK_RATE * 60 * 10; // 10 minutes

/** Relic gold: integer "gold-milli" accumulated per tick, scaled by 1000. */
export const RELIC_GOLD_PER_MINUTE = 60;

/** Trade: gold per trip scales with distance; see trade.ts. */
export const TRADE_GOLD_PER_TILE = 2;

/** Fog of war: how often (in ticks) visibility is recomputed. */
export const FOG_UPDATE_INTERVAL = 4;

/** Maximum number of queued orders per unit (shift-queue depth). */
export const MAX_ORDER_QUEUE = 16;

/** Garrison / building capacity defaults. */
export const DEFAULT_GARRISON_CAP = 10;

/** Entity hard cap. Guards against runaway spawns in headless runs. */
export const MAX_ENTITIES = 20000;

/** Distance (tiles, fixed point) at which units are considered "at" a point. */
export const ARRIVE_EPSILON = FP_ONE / 2;
