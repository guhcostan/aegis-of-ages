/**
 * Economy tuning constants: gather rates, carry capacity, build/repair speeds,
 * trade yields and religious income.
 *
 * NUMBER PROVENANCE: docs/research/economy.md and docs/research/victory.md.
 * Rates are the game's base gather rates (gathering animation only, excluding
 * walking), expressed as units per second scaled by 1000 so that all
 * accumulation stays in integer arithmetic: 750 == 0.75 resources/second.
 */
import { TICK_RATE } from '../constants';
import type { ResourceKey } from '../types';

export interface GatherRate {
  /** Resource units gathered per second, x1000. */
  perSecond: number;
  /** Amount a villager can carry before returning, for this source. */
  carry: number;
}

/**
 * Base gather rates. Hunted meat uses a larger carry capacity (25) in the
 * original; we model that per source, which is why `carry` lives here.
 */
export const GATHER_RATES: Record<string, GatherRate> = {
  sheep: { perSecond: 750, carry: 10 },
  berry: { perSecond: 690, carry: 10 },
  farm: { perSecond: 750, carry: 10 },
  deer: { perSecond: 825, carry: 25 },
  boar: { perSecond: 900, carry: 25 },
  tree: { perSecond: 750, carry: 10 },
  gold: { perSecond: 750, carry: 10 },
  stone: { perSecond: 750, carry: 10 },
};

/** Mapping from resource node kind to the resource key it yields. */
export const NODE_RESOURCE: Record<string, ResourceKey> = {
  sheep: 'food',
  farm: 'food',
  berry: 'food',
  deer: 'food',
  boar: 'food',
  tree: 'wood',
  gold: 'gold',
  stone: 'stone',
};

/** How much of each resource a node holds, from the SPEC. */
export const NODE_AMOUNTS: Record<string, number> = {
  // A single tree is 150 wood; we split a forest tile into one tree each.
  tree: 150,
  berry: 250,
  gold: 4000, // gold vein, small
  stone: 1200, // stone outcropping, small
  sheep: 200,
  deer: 350,
  boar: 2400,
};

/** Farms never deplete in AoE IV: they are destroyed, not exhausted. */
export const FARM_INFINITE = true;

/** Default carry capacity for a villager before technologies. */
export const BASE_CARRY = 10;

/** Build progress a single villager adds per tick, in 1/1000 of a building. */
export const BUILD_RATE_PER_VILLAGER = 1000 / (TICK_RATE * 16);

/**
 * Build speed with N villagers: time fraction is 3/(N+2).
 * One villager = 100%, two = 75%, three = 60%, ten = 25%.
 */
export function buildSpeedFactor(villagers: number): number {
  if (villagers <= 0) return 0;
  return (3 * 1) / (villagers + 2);
}

/** Repair rate: hit points restored per second by one villager. */
export const REPAIR_HP_PER_SECOND = 25;

/** Conversion: a monk takes this many seconds of uninterrupted focus. */
export const CONVERT_SECONDS = 8;

/** Monks heal this many hit points per second. */
export const HEAL_PER_SECOND = 7;

/** Relic gold per minute (80 gold/min since patch 24916). */
export const RELIC_GOLD_PER_MIN = 80;

/** Sacred site gold per minute while controlled. */
export const SACRED_SITE_GOLD_PER_MIN = 100;

/** How long a unit must stand on a sacred site to capture it, in seconds. */
export const SACRED_SITE_CAPTURE_SECONDS = 30;

/** Trade gold per trip = TRADE_BASE + TRADE_PER_TILE * roundTripTiles. */
export const TRADE_BASE = 6;
export const TRADE_PER_TILE = 2;

/** Starting resources: the AoE IV "Standard" preset. */
export const START_RESOURCES = { food: 200, wood: 200, gold: 100, stone: 0 };

/** Starting units for every player. */
export const START_UNITS: Array<{ defId: string; count: number }> = [
  { defId: 'villager', count: 6 },
  { defId: 'scout', count: 1 },
];

/** Sheep spawned next to the starting Town Center (AoE IV gives 5). */
export const START_SHEEP = 5;
