/**
 * Civilization definitions.
 *
 * Both civilizations are asymmetric: different bonuses, different unique units,
 * and a fully distinct landmark set for every age. Bonuses are expressed with
 * the same modifier vocabulary as technologies so that src/sim/stats.ts applies
 * them through one deterministic code path.
 *
 * NUMBER PROVENANCE: docs/research/civs.md. Where a bonus is an area aura in
 * the original (English Mill influence, Network of Castles) we model it as a
 * global modifier and record the simplification in docs/SPEC.md.
 */
import { Age } from '../constants';
import { TechStat, UnitClass, costOf } from '../types';
import type { CivDef, CivId, TechEffect } from '../types';

function bonus(
  stat: TechStat,
  appliesTo: TechEffect['appliesTo'],
  flat: number,
  pct = 0,
  cls: UnitClass | null = null,
  only: string | null = null,
): TechEffect {
  return { stat, appliesTo, flat, pct, cls, only };
}

export const ENGLISH: CivDef = {
  id: 'english',
  name: 'English',
  blurb:
    'A patient, defensive kingdom. Farms and Town Centers work harder, and the longbow rules the open field.',
  traits: [
    'Farms cost 50% less wood.',
    'Villagers gathering food work 20% faster (Mill influence, modelled globally).',
    'Men-at-Arms are trained 30% faster.',
    'Longbowmen have two extra tiles of range and hit harder.',
    'Network of Castles: your army attacks 20% faster.',
  ],
  bonuses: [
    bonus(TechStat.CostWood, 'building', 0, -50, null, 'farm'),
    bonus(TechStat.GatherFood, 'worker', 0, 20),
    bonus(TechStat.TrainTime, 'military', 0, -30, null, 'manatarms'),
    bonus(TechStat.Range, 'military', Math.round(2 * 1024), 0, null, 'longbowman'),
    bonus(TechStat.RangedAttack, 'military', 1, 0, null, 'longbowman'),
    bonus(TechStat.AttackSpeed, 'military', 0, 20),
  ],
  uniqueUnits: ['longbowman'],
  uniqueBuildings: [
    'council_hall',
    'abbey_of_kings',
    'kings_palace',
    'white_tower',
    'berkshire_palace',
    'wynguard_palace',
  ],
  landmarks: {
    [Age.Feudal]: ['council_hall', 'abbey_of_kings'],
    [Age.Castle]: ['kings_palace', 'white_tower'],
    [Age.Imperial]: ['berkshire_palace', 'wynguard_palace'],
  },
  startingBonus: {},
};

export const FRENCH: CivDef = {
  id: 'french',
  name: 'French',
  blurb:
    'A cavalry kingdom built for the charge. Cheaper economic upgrades and the finest knights in the world.',
  traits: [
    'Drop-off buildings (Mill, Lumber Camp, Mining Camp) cost 50% less wood.',
    'Economic technologies cost 35% less.',
    'Villagers are trained 13% faster.',
    'Keeps cost 10% less stone.',
    'Royal Knights are available an age early; Arbalétriers bring heavy crossbows.',
  ],
  bonuses: [
    bonus(TechStat.CostWood, 'building', 0, -50, null, 'mill'),
    bonus(TechStat.CostWood, 'building', 0, -50, null, 'lumber_camp'),
    bonus(TechStat.CostWood, 'building', 0, -50, null, 'mining_camp'),
    bonus(TechStat.CostStone, 'building', 0, -10, null, 'keep'),
    bonus(TechStat.TrainTime, 'all', 0, -13, null, 'villager'),
  ],
  uniqueUnits: ['royal_knight', 'arbaletrier'],
  uniqueBuildings: [
    'chamber_of_commerce',
    'school_of_cavalry',
    'royal_institute',
    'guild_hall',
    'red_palace',
    'college_of_artillery',
  ],
  landmarks: {
    [Age.Feudal]: ['chamber_of_commerce', 'school_of_cavalry'],
    [Age.Castle]: ['royal_institute', 'guild_hall'],
    [Age.Imperial]: ['red_palace', 'college_of_artillery'],
  },
  startingBonus: {},
};

export const CIVS: Record<CivId, CivDef> = {
  english: ENGLISH,
  french: FRENCH,
};

export const CIV_LIST: CivDef[] = [ENGLISH, FRENCH];

export function getCiv(id: CivId): CivDef {
  const c = CIVS[id];
  if (!c) throw new Error(`unknown civ: ${id}`);
  return c;
}

/** Landmark options for advancing into `age` with `civ`. */
export function landmarkChoices(civ: CivId, age: Age): [string, string] {
  const choices = getCiv(civ).landmarks[age];
  return (choices ?? ['', '']) as [string, string];
}

/** Technologies whose cost the French discount applies to. */
const FRENCH_ECONOMIC_TECHS = new Set([
  'survival_techniques',
  'wheelbarrow',
  'horticulture',
  'fertilization',
  'forestry',
  'double_broadaxe',
  'lumber_preservation',
  'crosscut_saw',
  'specialized_pick',
  'shaft_mining',
  'cupellation',
]);

/**
 * Cost of a technology for a civ, applying civ-specific discounts.
 * French economic technologies cost 35% less (docs/research/civs.md).
 */
export function techCostFor(
  civ: CivId,
  cost: { food: number; wood: number; gold: number; stone: number },
  techId?: string,
) {
  if (civ === 'french' && techId !== undefined && FRENCH_ECONOMIC_TECHS.has(techId)) {
    return costOf({
      food: Math.trunc(cost.food * 0.65),
      wood: Math.trunc(cost.wood * 0.65),
      gold: Math.trunc(cost.gold * 0.65),
      stone: Math.trunc(cost.stone * 0.65),
    });
  }
  return cost;
}
