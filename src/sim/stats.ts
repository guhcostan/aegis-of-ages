/**
 * Effective stat computation: merges base unit/building definitions with
 * civilization bonuses and researched technologies.
 *
 * Determinism: effects are applied in a fixed order (civ bonuses, then techs
 * sorted by id), flat before percentage, using integer math with truncation.
 * Results are cached per (player, def) and invalidated by `player.modVersion`.
 */
import { FP_ONE } from './constants';
import { TechStat, UnitClass, UnitRole } from './types';
import type { BuildingDef, Cost, PlayerState, TechEffect, UnitDef } from './types';
import { getCiv } from './data/civs';
import { TECHS } from './data/techs';
import type { World } from './world';

export interface EffectiveUnit {
  hp: number;
  meleeAttack: number;
  rangedAttack: number;
  meleeArmor: number;
  rangedArmor: number;
  speed: number;
  range: number;
  los: number;
  attackSpeed: number;
  trainTime: number;
  cost: Cost;
  carry: number;
}

export interface EffectiveBuilding {
  hp: number;
  meleeArmor: number;
  rangedArmor: number;
  attack: number;
  range: number;
  los: number;
  buildTime: number;
  cost: Cost;
}

interface ModTable {
  version: number;
  effects: TechEffect[];
}

const modCache = new WeakMap<PlayerState, ModTable>();
interface CachedUnit {
  version: number;
  value: EffectiveUnit;
}
interface CachedBuilding {
  version: number;
  value: EffectiveBuilding;
}
const unitCache = new WeakMap<PlayerState, Map<string, CachedUnit>>();
const buildingCache = new WeakMap<PlayerState, Map<string, CachedBuilding>>();

/** Gather every effect that applies to a player, in a stable order. */
function effectsFor(player: PlayerState): TechEffect[] {
  const cached = modCache.get(player);
  if (cached && cached.version === player.modVersion) return cached.effects;

  const effects: TechEffect[] = [];
  // Civilization bonuses first.
  effects.push(...getCiv(player.civ).bonuses);
  // Then technologies, sorted by id so the order never depends on Set order.
  const ids = Array.from(player.techs).sort();
  for (const id of ids) {
    const tech = TECHS[id];
    if (tech) effects.push(...tech.effects);
  }
  modCache.set(player, { version: player.modVersion, effects });
  return effects;
}

/** True when an effect's target selector covers this unit. */
function appliesToUnit(effect: TechEffect, def: UnitDef): boolean {
  switch (effect.appliesTo) {
    case 'all':
      return true;
    case 'worker':
      return def.role === UnitRole.Worker;
    case 'military':
      return def.role === UnitRole.Military;
    case 'siege':
      return def.role === UnitRole.Siege;
    case 'monk':
      return def.role === UnitRole.Monk;
    case 'building':
    case 'defensive':
      return false;
    default:
      return false;
  }
}

function appliesToBuilding(effect: TechEffect, def: BuildingDef): boolean {
  switch (effect.appliesTo) {
    case 'all':
      return true;
    case 'building':
      return true;
    case 'defensive':
      return def.attack > 0;
    default:
      return false;
  }
}

function classMatches(effect: TechEffect, classes: UnitClass[]): boolean {
  return effect.cls === null || classes.includes(effect.cls);
}

/** Apply the flat+percentage accumulation for a single stat. */
function applyStat(
  base: number,
  effects: TechEffect[],
  stat: TechStat,
  pred: (e: TechEffect) => boolean,
): number {
  let value = base;
  // Two passes: all flat deltas, then all percentages. This keeps the result
  // independent of the order in which the player researched things.
  for (const e of effects) {
    if (e.stat !== stat || !pred(e)) continue;
    value += e.flat;
  }
  let pct = 0;
  for (const e of effects) {
    if (e.stat !== stat || !pred(e)) continue;
    pct += e.pct;
  }
  if (pct !== 0) value = Math.trunc((value * (100 + pct)) / 100);
  return value;
}

/**
 * Apply a stat where a positive percentage means "faster": the duration is
 * divided by (1 + pct/100) instead of multiplied.
 */
function applyRateStat(
  base: number,
  effects: TechEffect[],
  stat: TechStat,
  pred: (e: TechEffect) => boolean,
): number {
  let value = base;
  for (const e of effects) {
    if (e.stat !== stat || !pred(e)) continue;
    value += e.flat;
  }
  let pct = 0;
  for (const e of effects) {
    if (e.stat !== stat || !pred(e)) continue;
    pct += e.pct;
  }
  if (pct !== 0) value = Math.trunc((value * 100) / (100 + pct));
  return Math.max(1, value);
}

export function effectiveUnit(world: World, playerId: number, def: UnitDef): EffectiveUnit {
  const player = world.players[playerId];
  if (!player) {
    return {
      hp: def.hp,
      meleeAttack: def.meleeAttack,
      rangedAttack: def.rangedAttack,
      meleeArmor: def.meleeArmor,
      rangedArmor: def.rangedArmor,
      speed: def.speed,
      range: def.range,
      los: def.los,
      attackSpeed: def.attackSpeed,
      trainTime: def.trainTime,
      cost: { ...def.cost },
      carry: 10,
    };
  }
  let cache = unitCache.get(player);
  if (!cache) {
    cache = new Map();
    unitCache.set(player, cache);
  }
  const key = `${def.id}`;
  const hit = cache.get(key);
  // A completed technology or an age-up bumps modVersion; the cache must follow.
  if (hit && hit.version === player.modVersion) return hit.value;

  const effects = effectsFor(player);
  const targets = (e: TechEffect): boolean => e.only === null || e.only === def.id;
  const pred = (e: TechEffect): boolean =>
    appliesToUnit(e, def) && classMatches(e, def.classes) && targets(e);
  const predArmor = pred;

  const result: EffectiveUnit = {
    hp: applyStat(def.hp, effects, TechStat.Hp, (e) => appliesToUnit(e, def)),
    meleeAttack: applyStat(def.meleeAttack, effects, TechStat.MeleeAttack, pred),
    rangedAttack: applyStat(def.rangedAttack, effects, TechStat.RangedAttack, pred),
    meleeArmor: applyStat(def.meleeArmor, effects, TechStat.MeleeArmor, predArmor),
    rangedArmor: applyStat(def.rangedArmor, effects, TechStat.RangedArmor, predArmor),
    speed: applyStat(def.speed, effects, TechStat.Speed, pred),
    range: applyStat(def.range, effects, TechStat.Range, pred),
    los: applyStat(def.los, effects, TechStat.Los, pred),
    // Attack speed is a RATE, not a duration: a +20% bonus must shorten the
    // cooldown. applyStat adds the percentage, which for a cooldown would make
    // the unit slower, so the percentage is inverted here.
    attackSpeed: applyRateStat(def.attackSpeed, effects, TechStat.AttackSpeed, pred),
    trainTime: applyStat(def.trainTime, effects, TechStat.TrainTime, pred),
    cost: {
      food: applyStat(def.cost.food, effects, TechStat.CostFood, pred),
      wood: applyStat(def.cost.wood, effects, TechStat.CostWood, pred),
      gold: applyStat(def.cost.gold, effects, TechStat.CostGold, pred),
      stone: applyStat(def.cost.stone, effects, TechStat.CostStone, pred),
    },
    carry: applyStat(10, effects, TechStat.CarryCapacity, pred),
  };
  cache.set(key, { version: player.modVersion, value: result });
  return result;
}

export function effectiveBuilding(
  world: World,
  playerId: number,
  def: BuildingDef,
): EffectiveBuilding {
  const player = world.players[playerId];
  if (!player) {
    return {
      hp: def.hp,
      meleeArmor: def.meleeArmor,
      rangedArmor: def.rangedArmor,
      attack: def.attack,
      range: def.range,
      los: def.los,
      buildTime: def.buildTime,
      cost: { ...def.cost },
    };
  }
  let cache = buildingCache.get(player);
  if (!cache) {
    cache = new Map();
    buildingCache.set(player, cache);
  }
  const hit = cache.get(def.id);
  if (hit && hit.version === player.modVersion) return hit.value;

  const effects = effectsFor(player);
  const targets = (e: TechEffect): boolean => e.only === null || e.only === def.id;
  const ap = (stat: TechStat, e: TechEffect): boolean => appliesToBuilding(e, def) && targets(e) && e.stat === stat;
  const result: EffectiveBuilding = {
    hp: applyStat(def.hp, effects, TechStat.Hp, (e) => ap(TechStat.Hp, e)),
    meleeArmor: applyStat(def.meleeArmor, effects, TechStat.MeleeArmor, (e) => ap(TechStat.MeleeArmor, e)),
    rangedArmor: applyStat(def.rangedArmor, effects, TechStat.RangedArmor, (e) => ap(TechStat.RangedArmor, e)),
    attack: applyStat(def.attack, effects, TechStat.RangedAttack, (e) => ap(TechStat.RangedAttack, e)),
    range: def.range,
    los: applyStat(def.los, effects, TechStat.Los, (e) => ap(TechStat.Los, e)),
    buildTime: applyStat(def.buildTime, effects, TechStat.BuildSpeed, () => false),
    cost: {
      food: applyStat(def.cost.food, effects, TechStat.CostFood, (e) => ap(TechStat.CostFood, e)),
      wood: applyStat(def.cost.wood, effects, TechStat.CostWood, (e) => ap(TechStat.CostWood, e)),
      gold: applyStat(def.cost.gold, effects, TechStat.CostGold, (e) => ap(TechStat.CostGold, e)),
      stone: applyStat(def.cost.stone, effects, TechStat.CostStone, (e) => ap(TechStat.CostStone, e)),
    },
  };
  cache.set(def.id, { version: player.modVersion, value: result });
  return result;
}

/** Gathering speed multiplier for a resource, as a percentage (100 = base). */
export function gatherMultiplier(world: World, playerId: number, resource: 'food' | 'wood' | 'gold' | 'stone'): number {
  const player = world.players[playerId];
  if (!player) return 100;
  const effects = effectsFor(player);
  const stat =
    resource === 'food'
      ? TechStat.GatherFood
      : resource === 'wood'
        ? TechStat.GatherWood
        : resource === 'gold'
          ? TechStat.GatherGold
          : TechStat.GatherStone;
  let pct = 0;
  for (const e of effects) {
    if (e.stat === stat) pct += e.pct;
  }
  return 100 + pct;
}

/** Healing multiplier for a player's monks, as a percentage (100 = base). */
export function healMultiplier(world: World, playerId: number): number {
  const player = world.players[playerId];
  if (!player) return 100;
  let pct = 0;
  for (const e of effectsFor(player)) {
    if (e.stat === TechStat.HealRate) pct += e.pct;
  }
  return 100 + pct;
}

/** Invalidate caches for a player after a tech completes or the age changes. */
export function bumpModVersion(player: PlayerState): void {
  player.modVersion++;
}

/** Reset every cache (used by tests when restoring a snapshot). */
export function clearStatCaches(): void {
  // WeakMaps cannot be cleared; new PlayerState objects simply start empty.
}

export { FP_ONE };
