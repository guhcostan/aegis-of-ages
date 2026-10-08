/**
 * Technology definitions: blacksmith, university, economic, unit-tier and
 * monastery upgrades.
 *
 * NUMBER PROVENANCE: docs/research/techs.md and docs/research/units.md, which
 * cite the aoe4world/data game-file extraction (patch 16.1.9737) and the Age of
 * Empires Wiki. docs/SPEC.md records conflicts and our choices.
 *
 * Effects are integer deltas (`flat`) and percentages (`pct`) applied by
 * src/sim/stats.ts in a deterministic order: civilisation bonuses first, then
 * technologies sorted by id, flat before percentage.
 *
 * Unit tier upgrades replace the AoE IV Regular/Veteran/Elite ladder: each tech
 * applies the *delta* between two tiers of the same unit.
 */
import { Age, FP_ONE, TICK_RATE } from '../constants';
import { TechStat, UnitClass, costOf } from '../types';
import type { TechDef, TechEffect } from '../types';

const T = (seconds: number): number => Math.round(seconds * TICK_RATE);

function tech(
  d: Partial<TechDef> & Pick<TechDef, 'id' | 'name' | 'age' | 'cost' | 'building' | 'effects'>,
): TechDef {
  return {
    civ: 'any',
    researchTime: T(30),
    requires: [],
    blurb: '',
    ...d,
  };
}

function e(
  stat: TechStat,
  appliesTo: TechEffect['appliesTo'],
  flat: number,
  pct = 0,
  cls: UnitClass | null = null,
  only: string | null = null,
): TechEffect {
  return { stat, appliesTo, flat, pct, cls, only };
}

/* ------------------------------------------------------------------ *
 * Blacksmith — offence (three chained tiers per line)
 * ------------------------------------------------------------------ */

export const FORGED_BLADES = tech({
  id: 'forged_blades',
  name: 'Forged Blades',
  age: Age.Feudal,
  cost: costOf({ food: 50, gold: 125 }),
  researchTime: T(60),
  building: 'blacksmith',
  effects: [e(TechStat.MeleeAttack, 'military', 1)],
  blurb: 'Melee infantry and cavalry strike for +1 damage.',
});

export const TEMPERED_BLADES = tech({
  id: 'tempered_blades',
  name: 'Tempered Blades',
  age: Age.Castle,
  cost: costOf({ food: 100, gold: 250 }),
  researchTime: T(60),
  building: 'blacksmith',
  effects: [e(TechStat.MeleeAttack, 'military', 1)],
  requires: ['forged_blades'],
  blurb: 'A second tier of melee damage.',
});

export const DAMASCUS_STEEL = tech({
  id: 'damascus_steel',
  name: 'Damascus Steel',
  age: Age.Imperial,
  cost: costOf({ food: 150, gold: 350 }),
  researchTime: T(60),
  building: 'blacksmith',
  effects: [e(TechStat.MeleeAttack, 'military', 1)],
  requires: ['tempered_blades'],
  blurb: 'The finest blades in the world. A third tier of melee damage.',
});

export const HARDENED_SHAFTS = tech({
  id: 'hardened_shafts',
  name: 'Hardened Shafts',
  age: Age.Feudal,
  cost: costOf({ wood: 50, gold: 125 }),
  researchTime: T(60),
  building: 'blacksmith',
  effects: [e(TechStat.RangedAttack, 'military', 1)],
  blurb: 'Ranged units deal +1 damage.',
});

export const BALANCED_BOWS = tech({
  id: 'balanced_bows',
  name: 'Balanced Bows',
  age: Age.Castle,
  cost: costOf({ wood: 100, gold: 250 }),
  researchTime: T(60),
  building: 'blacksmith',
  effects: [e(TechStat.RangedAttack, 'military', 1)],
  requires: ['hardened_shafts'],
  blurb: 'A second tier of ranged damage.',
});

export const PLATECUTTER_POINT = tech({
  id: 'platecutter_point',
  name: 'Platecutter Point',
  age: Age.Imperial,
  cost: costOf({ wood: 150, gold: 350 }),
  researchTime: T(60),
  building: 'blacksmith',
  effects: [e(TechStat.RangedAttack, 'military', 1)],
  requires: ['balanced_bows'],
  blurb: 'Armour-piercing heads. A third tier of ranged damage.',
});

/* ------------------------------------------------------------------ *
 * Blacksmith — armour
 * ------------------------------------------------------------------ */

export const IRON_UNDERMAIL = tech({
  id: 'iron_undermail',
  name: 'Iron Undermail',
  age: Age.Feudal,
  cost: costOf({ food: 50, gold: 125 }),
  researchTime: T(60),
  building: 'blacksmith',
  effects: [e(TechStat.MeleeArmor, 'military', 1)],
  blurb: '+1 melee armour for all military units.',
});

export const FITTED_LEATHER = tech({
  id: 'fitted_leather',
  name: 'Fitted Leatherwork',
  age: Age.Castle,
  cost: costOf({ food: 100, gold: 250 }),
  researchTime: T(60),
  building: 'blacksmith',
  effects: [e(TechStat.MeleeArmor, 'military', 1)],
  requires: ['iron_undermail'],
  blurb: 'A second tier of melee armour.',
});

export const INSULATED_HELM = tech({
  id: 'insulated_helm',
  name: 'Insulated Helm',
  age: Age.Imperial,
  cost: costOf({ food: 150, gold: 350 }),
  researchTime: T(60),
  building: 'blacksmith',
  effects: [e(TechStat.MeleeArmor, 'military', 1)],
  requires: ['fitted_leather'],
  blurb: 'A third tier of melee armour.',
});

export const PADDED_ARMOR = tech({
  id: 'padded_armor',
  name: 'Padded Armor',
  age: Age.Feudal,
  cost: costOf({ wood: 50, gold: 125 }),
  researchTime: T(60),
  building: 'blacksmith',
  effects: [e(TechStat.RangedArmor, 'military', 1)],
  blurb: '+1 ranged armour against arrows and bolts.',
});

export const LEATHER_ARMOR = tech({
  id: 'leather_armor',
  name: 'Leather Armor',
  age: Age.Castle,
  cost: costOf({ wood: 100, gold: 250 }),
  researchTime: T(60),
  building: 'blacksmith',
  effects: [e(TechStat.RangedArmor, 'military', 1)],
  requires: ['padded_armor'],
  blurb: 'A second tier of ranged armour.',
});

export const MAIL_ARMOR = tech({
  id: 'mail_armor',
  name: 'Mail Armor',
  age: Age.Imperial,
  cost: costOf({ wood: 150, gold: 350 }),
  researchTime: T(60),
  building: 'blacksmith',
  effects: [e(TechStat.RangedArmor, 'military', 1)],
  requires: ['leather_armor'],
  blurb: 'A third tier of ranged armour.',
});

/* ------------------------------------------------------------------ *
 * Unit tier upgrades
 * Deltas are the difference between consecutive tiers of the same unit,
 * taken from docs/research/units.md (Table 4).
 * ------------------------------------------------------------------ */

export const HARDENED_SPEARMAN = tech({
  id: 'hardened_spearman',
  name: 'Hardened Spearman',
  age: Age.Feudal,
  cost: costOf({ food: 15, gold: 35 }),
  researchTime: T(15),
  building: 'barracks',
  effects: [
    e(TechStat.Hp, 'military', 10, 0, null, 'spearman'),
    e(TechStat.MeleeAttack, 'military', 1, 0, null, 'spearman'),
  ],
  blurb: 'Spearmen gain hardened shafts and sturdier shields.',
});

export const VETERAN_SPEARMAN = tech({
  id: 'veteran_spearman',
  name: 'Veteran Spearman',
  age: Age.Castle,
  cost: costOf({ food: 100, gold: 250 }),
  researchTime: T(60),
  building: 'barracks',
  effects: [
    e(TechStat.Hp, 'military', 20, 0, null, 'spearman'),
    e(TechStat.MeleeAttack, 'military', 1, 0, null, 'spearman'),
  ],
  requires: ['hardened_spearman'],
  blurb: 'Veteran spearmen hold the line far longer.',
});

export const ELITE_SPEARMAN = tech({
  id: 'elite_spearman',
  name: 'Elite Spearman',
  age: Age.Imperial,
  cost: costOf({ food: 300, gold: 700 }),
  researchTime: T(60),
  building: 'barracks',
  effects: [
    e(TechStat.Hp, 'military', 30, 0, null, 'spearman'),
    e(TechStat.MeleeAttack, 'military', 2, 0, null, 'spearman'),
  ],
  requires: ['veteran_spearman'],
  blurb: 'Elite spearmen are the end of every cavalry charge.',
});

export const VETERAN_ARCHER = tech({
  id: 'veteran_archer',
  name: 'Veteran Archer',
  age: Age.Castle,
  cost: costOf({ food: 100, gold: 250 }),
  researchTime: T(60),
  building: 'archery_range',
  effects: [
    e(TechStat.Hp, 'military', 10, 0, null, 'archer'),
    e(TechStat.RangedAttack, 'military', 2, 0, null, 'archer'),
  ],
  blurb: 'Veteran archers draw heavier bows and shoot further.',
});

export const ELITE_ARCHER = tech({
  id: 'elite_archer',
  name: 'Elite Archer',
  age: Age.Imperial,
  cost: costOf({ food: 300, gold: 700 }),
  researchTime: T(60),
  building: 'archery_range',
  effects: [
    e(TechStat.Hp, 'military', 15, 0, null, 'archer'),
    e(TechStat.RangedAttack, 'military', 1, 0, null, 'archer'),
  ],
  requires: ['veteran_archer'],
  blurb: 'Elite archers are the finest marksmen in the realm.',
});

export const ELITE_CROSSBOWMAN = tech({
  id: 'elite_crossbowman',
  name: 'Elite Crossbowman',
  age: Age.Imperial,
  cost: costOf({ food: 300, gold: 700 }),
  researchTime: T(60),
  building: 'archery_range',
  effects: [
    e(TechStat.Hp, 'military', 15, 0, null, 'crossbowman'),
    e(TechStat.RangedAttack, 'military', 3, 0, null, 'crossbowman'),
  ],
  blurb: 'Elite crossbows punch through the heaviest plate.',
});

export const VETERAN_HORSEMAN = tech({
  id: 'veteran_horseman',
  name: 'Veteran Horseman',
  age: Age.Castle,
  cost: costOf({ food: 100, gold: 250 }),
  researchTime: T(60),
  building: 'stable',
  effects: [
    e(TechStat.Hp, 'military', 30, 0, null, 'horseman'),
    e(TechStat.MeleeAttack, 'military', 2, 0, null, 'horseman'),
  ],
  blurb: 'Veteran horsemen ride harder and hit sooner.',
});

export const ELITE_HORSEMAN = tech({
  id: 'elite_horseman',
  name: 'Elite Horseman',
  age: Age.Imperial,
  cost: costOf({ food: 300, gold: 700 }),
  researchTime: T(60),
  building: 'stable',
  effects: [
    e(TechStat.Hp, 'military', 25, 0, null, 'horseman'),
    e(TechStat.MeleeAttack, 'military', 2, 0, null, 'horseman'),
  ],
  requires: ['veteran_horseman'],
  blurb: 'Elite horsemen run down anything that cannot outrun them.',
});

export const VETERAN_KNIGHT = tech({
  id: 'veteran_knight',
  name: 'Veteran Knight',
  age: Age.Castle,
  cost: costOf({ food: 50, gold: 125 }),
  researchTime: T(30),
  building: 'stable',
  effects: [
    e(TechStat.Hp, 'military', 40, 0, null, 'knight'),
    e(TechStat.MeleeAttack, 'military', 5, 0, null, 'knight'),
  ],
  blurb: 'Veteran knights are armoured head to toe.',
});

export const ELITE_KNIGHT = tech({
  id: 'elite_knight',
  name: 'Elite Knight',
  age: Age.Imperial,
  cost: costOf({ food: 300, gold: 700 }),
  researchTime: T(60),
  building: 'stable',
  effects: [
    e(TechStat.Hp, 'military', 40, 0, null, 'knight'),
    e(TechStat.MeleeAttack, 'military', 5, 0, null, 'knight'),
  ],
  requires: ['veteran_knight'],
  blurb: 'Elite knights break infantry lines on the charge.',
});

export const VETERAN_MANATARMS = tech({
  id: 'veteran_manatarms',
  name: 'Veteran Man-at-Arms',
  age: Age.Castle,
  cost: costOf({ food: 50, gold: 125 }),
  researchTime: T(30),
  building: 'barracks',
  effects: [
    e(TechStat.Hp, 'military', 25, 0, null, 'manatarms'),
    e(TechStat.MeleeAttack, 'military', 2, 0, null, 'manatarms'),
  ],
  blurb: 'Veteran men-at-arms advance under a wall of shields.',
});

export const ELITE_MANATARMS = tech({
  id: 'elite_manatarms',
  name: 'Elite Man-at-Arms',
  age: Age.Imperial,
  cost: costOf({ food: 300, gold: 700 }),
  researchTime: T(60),
  building: 'barracks',
  effects: [
    e(TechStat.Hp, 'military', 25, 0, null, 'manatarms'),
    e(TechStat.MeleeAttack, 'military', 2, 0, null, 'manatarms'),
  ],
  requires: ['veteran_manatarms'],
  blurb: 'Elite men-at-arms are almost impossible to remove from a position.',
});

export const SPYGLASS = tech({
  id: 'spyglass',
  name: 'Spyglass',
  age: Age.Castle,
  cost: costOf({ wood: 100, gold: 50 }),
  researchTime: T(45),
  building: 'archery_range',
  effects: [e(TechStat.Los, 'military', 0, 20)],
  blurb: 'Ranged units see 20% further.',
});

/* ------------------------------------------------------------------ *
 * Siege Workshop
 * ------------------------------------------------------------------ */

export const LIGHTWEIGHT_BEAMS = tech({
  id: 'lightweight_beams',
  name: 'Lightweight Beams',
  age: Age.Castle,
  cost: costOf({ wood: 300, gold: 400 }),
  researchTime: T(60),
  building: 'siege_workshop',
  effects: [e(TechStat.Speed, 'siege', 0, 15)],
  blurb: 'Siege engines move 15% faster.',
});

export const GREASED_AXLES = tech({
  id: 'greased_axles',
  name: 'Greased Axles',
  age: Age.Castle,
  cost: costOf({ wood: 150, gold: 350 }),
  researchTime: T(60),
  building: 'siege_workshop',
  effects: [e(TechStat.Speed, 'siege', 0, 15)],
  blurb: 'A second tier of siege mobility.',
});

export const ADJUSTABLE_CROSSBARS = tech({
  id: 'adjustable_crossbars',
  name: 'Adjustable Crossbars',
  age: Age.Castle,
  cost: costOf({ wood: 1000, gold: 1200 }),
  researchTime: T(90),
  building: 'siege_workshop',
  effects: [e(TechStat.RangedAttack, 'siege', 0, 20)],
  blurb: 'Siege engines deal +20% damage.',
});

/* ------------------------------------------------------------------ *
 * University (Imperial)
 * ------------------------------------------------------------------ */

export const CHEMISTRY = tech({
  id: 'chemistry',
  name: 'Chemistry',
  age: Age.Imperial,
  cost: costOf({ food: 200, gold: 650 }),
  researchTime: T(60),
  building: 'university',
  effects: [e(TechStat.RangedAttack, 'siege', 0, 20)],
  blurb: 'Incendiary compounds: siege weapons deal +20% damage.',
});

export const SIEGE_WORKS = tech({
  id: 'siege_works',
  name: 'Siege Works',
  age: Age.Imperial,
  cost: costOf({ wood: 300, gold: 600 }),
  researchTime: T(90),
  building: 'university',
  effects: [e(TechStat.Hp, 'siege', 0, 20)],
  blurb: 'Siege engines are 20% tougher.',
});

export const INCENDIARY_ARROWS = tech({
  id: 'incendiary_arrows',
  name: 'Incendiary Arrows',
  age: Age.Imperial,
  cost: costOf({ wood: 500, gold: 1000 }),
  researchTime: T(90),
  building: 'university',
  effects: [e(TechStat.RangedAttack, 'defensive', 6)],
  blurb: 'Towers, keeps and Town Centers burn what they hit.',
});

export const ELITE_ARMY_TACTICS = tech({
  id: 'elite_army_tactics',
  name: 'Elite Army Tactics',
  age: Age.Imperial,
  cost: costOf({ food: 500, gold: 1000 }),
  researchTime: T(90),
  building: 'university',
  effects: [e(TechStat.MeleeAttack, 'military', 0, 20), e(TechStat.RangedAttack, 'military', 0, 20)],
  blurb: 'Every soldier fights 20% harder.',
});

export const COURT_ARCHITECTS = tech({
  id: 'court_architects',
  name: 'Court Architects',
  age: Age.Imperial,
  cost: costOf({ stone: 300, gold: 700 }),
  researchTime: T(90),
  building: 'university',
  effects: [e(TechStat.Hp, 'building', 0, 20)],
  blurb: 'All buildings gain +20% hit points.',
});

export const SILK_BOWSTRINGS = tech({
  id: 'silk_bowstrings',
  name: 'Silk Bowstrings',
  age: Age.Imperial,
  cost: costOf({ wood: 200, gold: 500 }),
  researchTime: T(60),
  building: 'university',
  effects: [e(TechStat.AttackSpeed, 'military', 0, 15, UnitClass.Ranged)],
  blurb: 'Ranged units fire 15% faster.',
});

/* ------------------------------------------------------------------ *
 * Economy — Mill
 * ------------------------------------------------------------------ */

export const SURVIVAL_TECHNIQUES = tech({
  id: 'survival_techniques',
  name: 'Survival Techniques',
  age: Age.Dark,
  cost: costOf({ wood: 25, gold: 75 }),
  researchTime: T(25),
  building: 'mill',
  effects: [e(TechStat.GatherFood, 'worker', 0, 15)],
  blurb: 'Villagers butcher hunted animals 15% faster.',
});

export const WHEELBARROW = tech({
  id: 'wheelbarrow',
  name: 'Wheelbarrow',
  age: Age.Dark,
  cost: costOf({ wood: 50, gold: 150 }),
  researchTime: T(90),
  building: 'mill',
  effects: [e(TechStat.CarryCapacity, 'worker', 5), e(TechStat.Speed, 'worker', 0, 15)],
  blurb: 'Villagers carry 5 more and walk 15% faster.',
});

export const HORTICULTURE = tech({
  id: 'horticulture',
  name: 'Horticulture',
  age: Age.Feudal,
  cost: costOf({ wood: 50, gold: 100 }),
  researchTime: T(45),
  building: 'mill',
  effects: [e(TechStat.GatherFood, 'worker', 0, 10)],
  blurb: 'Villagers gather food 10% faster.',
});

export const FERTILIZATION = tech({
  id: 'fertilization',
  name: 'Fertilization',
  age: Age.Castle,
  cost: costOf({ wood: 100, gold: 250 }),
  researchTime: T(60),
  building: 'mill',
  effects: [e(TechStat.GatherFood, 'worker', 0, 10)],
  requires: ['horticulture'],
  blurb: 'A second 10% boost to food gathering.',
});

/* ------------------------------------------------------------------ *
 * Economy — Lumber Camp
 * ------------------------------------------------------------------ */

export const FORESTRY = tech({
  id: 'forestry',
  name: 'Forestry',
  age: Age.Dark,
  cost: costOf({ food: 25, gold: 50 }),
  researchTime: T(45),
  building: 'lumber_camp',
  effects: [e(TechStat.GatherWood, 'worker', 0, 10)],
  blurb: 'Villagers fell trees 10% faster.',
});

export const DOUBLE_BROADAXE = tech({
  id: 'double_broadaxe',
  name: 'Double Broadax',
  age: Age.Feudal,
  cost: costOf({ food: 50, gold: 100 }),
  researchTime: T(45),
  building: 'lumber_camp',
  effects: [e(TechStat.GatherWood, 'worker', 0, 15)],
  requires: ['forestry'],
  blurb: 'A heavier axe: 15% more wood per swing.',
});

export const LUMBER_PRESERVATION = tech({
  id: 'lumber_preservation',
  name: 'Lumber Preservation',
  age: Age.Castle,
  cost: costOf({ food: 100, gold: 250 }),
  researchTime: T(60),
  building: 'lumber_camp',
  effects: [e(TechStat.GatherWood, 'worker', 0, 15)],
  requires: ['double_broadaxe'],
  blurb: 'Seasoned timber: another 15% wood.',
});

export const CROSSCUT_SAW = tech({
  id: 'crosscut_saw',
  name: 'Crosscut Saw',
  age: Age.Imperial,
  cost: costOf({ food: 250, gold: 500 }),
  researchTime: T(75),
  building: 'lumber_camp',
  effects: [e(TechStat.GatherWood, 'worker', 0, 15), e(TechStat.CarryCapacity, 'worker', 5)],
  requires: ['lumber_preservation'],
  blurb: 'A final 15% wood, and villagers carry more of it.',
});

/* ------------------------------------------------------------------ *
 * Economy — Mining Camp
 * ------------------------------------------------------------------ */

export const SPECIALIZED_PICK = tech({
  id: 'specialized_pick',
  name: 'Specialized Pick',
  age: Age.Dark,
  cost: costOf({ wood: 50, gold: 100 }),
  researchTime: T(45),
  building: 'mining_camp',
  effects: [e(TechStat.GatherGold, 'worker', 0, 15), e(TechStat.GatherStone, 'worker', 0, 15)],
  blurb: 'Villagers mine gold and stone 15% faster.',
});

export const SHAFT_MINING = tech({
  id: 'shaft_mining',
  name: 'Shaft Mining',
  age: Age.Castle,
  cost: costOf({ wood: 100, gold: 250 }),
  researchTime: T(60),
  building: 'mining_camp',
  effects: [e(TechStat.GatherGold, 'worker', 0, 15), e(TechStat.GatherStone, 'worker', 0, 15)],
  requires: ['specialized_pick'],
  blurb: 'Deeper shafts: another 15% mining speed.',
});

export const CUPELLATION = tech({
  id: 'cupellation',
  name: 'Cupellation',
  age: Age.Imperial,
  cost: costOf({ wood: 250, gold: 500 }),
  researchTime: T(75),
  building: 'mining_camp',
  effects: [e(TechStat.GatherGold, 'worker', 0, 15)],
  requires: ['shaft_mining'],
  blurb: 'Refining ore: a final 15% gold.',
});

/* ------------------------------------------------------------------ *
 * Monastery
 * ------------------------------------------------------------------ */

export const HERBAL_MEDICINE = tech({
  id: 'herbal_medicine',
  name: 'Herbal Medicine',
  age: Age.Castle,
  cost: costOf({ gold: 275 }),
  researchTime: T(45),
  building: 'monastery',
  effects: [e(TechStat.HealRate, 'monk', 0, 50)],
  blurb: 'Monks heal 50% faster.',
});

export const PIETY = tech({
  id: 'piety',
  name: 'Piety',
  age: Age.Castle,
  cost: costOf({ gold: 325 }),
  researchTime: T(45),
  building: 'monastery',
  effects: [e(TechStat.Speed, 'monk', 0, 15)],
  blurb: 'Monks move 15% faster and convert more reliably.',
});

export const TITHE_BARNS = tech({
  id: 'tithe_barns',
  name: 'Tithe Barns',
  age: Age.Castle,
  cost: costOf({ gold: 500 }),
  researchTime: T(60),
  building: 'monastery',
  effects: [e(TechStat.GatherFood, 'worker', 0, 5), e(TechStat.GatherWood, 'worker', 0, 5)],
  blurb: 'Each relic also yields food, wood and stone alongside its gold.',
});

/* ------------------------------------------------------------------ *
 * Table
 * ------------------------------------------------------------------ */

export const ALL_TECHS: TechDef[] = [
  FORGED_BLADES,
  TEMPERED_BLADES,
  DAMASCUS_STEEL,
  HARDENED_SHAFTS,
  BALANCED_BOWS,
  PLATECUTTER_POINT,
  IRON_UNDERMAIL,
  FITTED_LEATHER,
  INSULATED_HELM,
  PADDED_ARMOR,
  LEATHER_ARMOR,
  MAIL_ARMOR,
  HARDENED_SPEARMAN,
  VETERAN_SPEARMAN,
  ELITE_SPEARMAN,
  VETERAN_ARCHER,
  ELITE_ARCHER,
  ELITE_CROSSBOWMAN,
  VETERAN_HORSEMAN,
  ELITE_HORSEMAN,
  VETERAN_KNIGHT,
  ELITE_KNIGHT,
  VETERAN_MANATARMS,
  ELITE_MANATARMS,
  SPYGLASS,
  LIGHTWEIGHT_BEAMS,
  GREASED_AXLES,
  ADJUSTABLE_CROSSBARS,
  CHEMISTRY,
  SIEGE_WORKS,
  INCENDIARY_ARROWS,
  ELITE_ARMY_TACTICS,
  COURT_ARCHITECTS,
  SILK_BOWSTRINGS,
  SURVIVAL_TECHNIQUES,
  WHEELBARROW,
  HORTICULTURE,
  FERTILIZATION,
  FORESTRY,
  DOUBLE_BROADAXE,
  LUMBER_PRESERVATION,
  CROSSCUT_SAW,
  SPECIALIZED_PICK,
  SHAFT_MINING,
  CUPELLATION,
  HERBAL_MEDICINE,
  PIETY,
  TITHE_BARNS,
];

export const TECHS: Record<string, TechDef> = Object.fromEntries(
  ALL_TECHS.map((t) => [t.id, t]),
);

export { FP_ONE };
