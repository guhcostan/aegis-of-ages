/**
 * Unit definitions.
 *
 * NUMBER PROVENANCE: every value below is taken from docs/research/units.md and
 * docs/research/combat.md, which cite the Age of Empires Wiki and the
 * aoe4world/data game-file extraction (patch 16.1.9737). docs/SPEC.md records
 * which numbers are verified, which are contested and what we chose.
 *
 * Conventions: times in ticks (TICK_RATE = 20/s), distances in fixed point
 * (FP_ONE = 1024 == one tile), speeds in fixed point per tick.
 *
 * Tiers: AoE IV gives units Regular/Veteran/Elite versions. We model the tier
 * ladder as technologies (see data/techs.ts) that modify the base stats below,
 * exactly as the original does: advancing an age alone does not upgrade a unit.
 */
import { Age, FP_ONE, TICK_RATE } from '../constants';
import { UnitClass, UnitRole, costOf } from '../types';
import type { UnitDef } from '../types';

const T = (seconds: number): number => Math.round(seconds * TICK_RATE);
const TILES = (tiles: number): number => Math.round(tiles * FP_ONE);

function def(d: Partial<UnitDef> & Pick<UnitDef, 'id' | 'name' | 'role' | 'classes'>): UnitDef {
  return {
    civ: 'any',
    age: Age.Dark,
    cost: costOf({}),
    trainTime: T(20),
    hp: 100,
    meleeAttack: 0,
    rangedAttack: 0,
    meleeArmor: 0,
    rangedArmor: 0,
    range: TILES(0.29),
    speed: Math.round(FP_ONE * 1.0),
    los: TILES(8),
    pop: 1,
    attackSpeed: T(1.5),
    bonusVs: [],
    windup: T(0.125),
    trainedAt: [],
    canBuild: false,
    minRange: 0,
    chargeBonus: 0,
    rangedResistance: 0,
    blurb: '',
    ...d,
  };
}

/* ------------------------------------------------------------------ *
 * Economy and support
 * ------------------------------------------------------------------ */

export const VILLAGER = def({
  id: 'villager',
  name: 'Villager',
  role: UnitRole.Worker,
  classes: [UnitClass.Worker, UnitClass.Infantry],
  age: Age.Dark,
  cost: costOf({ food: 50 }),
  trainTime: T(20),
  hp: 50,
  meleeAttack: 6,
  rangedAttack: 3,
  meleeArmor: 0,
  rangedArmor: 0,
  range: TILES(0.29),
  speed: Math.round(FP_ONE * 1.12),
  los: TILES(6.22),
  pop: 1,
  attackSpeed: T(3.875),
  trainedAt: ['town_center'],
  canBuild: true,
  blurb: 'Gathers resources, builds and repairs. The backbone of the economy.',
});

export const SCOUT = def({
  id: 'scout',
  name: 'Scout',
  role: UnitRole.Scout,
  classes: [UnitClass.Cavalry],
  age: Age.Dark,
  cost: costOf({ food: 65 }),
  trainTime: T(23),
  hp: 110,
  meleeAttack: 1,
  rangedAttack: 3,
  meleeArmor: 0,
  rangedArmor: 0,
  range: TILES(2.88),
  speed: Math.round(FP_ONE * 1.625),
  los: TILES(9.11),
  pop: 1,
  attackSpeed: T(2.0),
  trainedAt: ['stable'],
  blurb: 'Fast and far-sighted. Explores the map and harasses villagers.',
});

export const MONK = def({
  id: 'monk',
  name: 'Monk',
  role: UnitRole.Monk,
  classes: [UnitClass.Monk],
  age: Age.Castle,
  cost: costOf({ gold: 150 }),
  trainTime: T(30),
  hp: 90,
  meleeAttack: 0,
  rangedAttack: 0,
  range: TILES(4.75),
  speed: Math.round(FP_ONE * 1.12),
  los: TILES(6.67),
  pop: 1,
  attackSpeed: T(2),
  trainedAt: ['monastery'],
  blurb: 'Heals allies, carries relics, and can convert an enemy unit.',
});

export const TRADER = def({
  id: 'trader',
  name: 'Trader',
  role: UnitRole.Trade,
  classes: [UnitClass.Worker],
  age: Age.Feudal,
  cost: costOf({ wood: 60, gold: 60 }),
  trainTime: T(30),
  hp: 90,
  speed: Math.round(FP_ONE * 1.0),
  los: TILES(7.78),
  pop: 1,
  trainedAt: ['market'],
  blurb: 'Runs a trade route between markets. The longer the road, the richer you are.',
});

/* ------------------------------------------------------------------ *
 * Infantry
 * ------------------------------------------------------------------ */

export const SPEARMAN = def({
  id: 'spearman',
  name: 'Spearman',
  role: UnitRole.Military,
  classes: [UnitClass.Infantry, UnitClass.LightInfantry],
  age: Age.Dark,
  cost: costOf({ food: 60, wood: 20 }),
  trainTime: T(15),
  hp: 80,
  meleeAttack: 7,
  meleeArmor: 0,
  rangedArmor: 0,
  range: TILES(0.29),
  speed: Math.round(FP_ONE * 1.25),
  los: TILES(8),
  pop: 1,
  attackSpeed: T(1.875),
  bonusVs: [{ cls: UnitClass.Cavalry, amount: 17 }],
  trainedAt: ['barracks'],
  blurb: 'Anti-cavalry infantry. A wall of points that stops any charge.',
});

export const MAN_AT_ARMS = def({
  id: 'manatarms',
  name: 'Man-at-Arms',
  role: UnitRole.Military,
  classes: [UnitClass.Infantry, UnitClass.Heavy],
  age: Age.Castle,
  cost: costOf({ food: 90, gold: 20 }),
  trainTime: T(20.5),
  hp: 155,
  meleeAttack: 12,
  meleeArmor: 4,
  rangedArmor: 4,
  range: TILES(0.29),
  speed: Math.round(FP_ONE * 1.125),
  los: TILES(8),
  pop: 1,
  attackSpeed: T(1.375),
  trainedAt: ['barracks'],
  blurb: 'Armoured infantry. Shrugs off arrows and grinds through anything.',
});

/* ------------------------------------------------------------------ *
 * Ranged
 * ------------------------------------------------------------------ */

export const ARCHER = def({
  id: 'archer',
  name: 'Archer',
  role: UnitRole.Military,
  classes: [UnitClass.Ranged],
  age: Age.Feudal,
  cost: costOf({ food: 30, wood: 50 }),
  trainTime: T(15),
  hp: 70,
  rangedAttack: 5,
  meleeArmor: 0,
  rangedArmor: 0,
  range: TILES(5),
  speed: Math.round(FP_ONE * 1.25),
  los: TILES(8),
  pop: 1,
  attackSpeed: T(1.625),
  bonusVs: [{ cls: UnitClass.LightInfantry, amount: 5 }],
  trainedAt: ['archery_range'],
  blurb: 'Cheap ranged infantry. Melts unarmoured troops, dies to horsemen.',
});

export const CROSSBOWMAN = def({
  id: 'crossbowman',
  name: 'Crossbowman',
  role: UnitRole.Military,
  classes: [UnitClass.Ranged],
  age: Age.Castle,
  cost: costOf({ food: 80, gold: 40 }),
  trainTime: T(22.5),
  hp: 80,
  rangedAttack: 11,
  meleeArmor: 0,
  rangedArmor: 0,
  range: TILES(5),
  speed: Math.round(FP_ONE * 1.125),
  los: TILES(8.89),
  pop: 1,
  attackSpeed: T(2.125),
  bonusVs: [{ cls: UnitClass.Heavy, amount: 10 }],
  trainedAt: ['archery_range'],
  blurb: 'Punches through heavy armour. Slow to reload.',
});

/* ------------------------------------------------------------------ *
 * Cavalry
 * ------------------------------------------------------------------ */

export const HORSEMAN = def({
  id: 'horseman',
  name: 'Horseman',
  role: UnitRole.Military,
  classes: [UnitClass.Cavalry],
  age: Age.Feudal,
  cost: costOf({ food: 100, wood: 20 }),
  trainTime: T(22.5),
  hp: 125,
  meleeAttack: 9,
  meleeArmor: 0,
  rangedArmor: 2,
  range: TILES(0.375),
  speed: Math.round(FP_ONE * 1.875),
  los: TILES(6.22),
  pop: 1,
  attackSpeed: T(1.75),
  bonusVs: [
    { cls: UnitClass.Ranged, amount: 9 },
    { cls: UnitClass.Siege, amount: 9 },
  ],
  trainedAt: ['stable'],
  blurb: 'The fastest unit on the field. Hunts archers and siege engines.',
});

export const KNIGHT = def({
  id: 'knight',
  name: 'Knight',
  role: UnitRole.Military,
  classes: [UnitClass.Cavalry, UnitClass.Heavy],
  age: Age.Castle,
  cost: costOf({ food: 140, gold: 100 }),
  trainTime: T(35),
  hp: 230,
  meleeAttack: 24,
  meleeArmor: 4,
  rangedArmor: 4,
  range: TILES(0.29),
  speed: Math.round(FP_ONE * 1.63),
  los: TILES(6.22),
  pop: 1,
  attackSpeed: T(1.5),
  chargeBonus: 12,
  trainedAt: ['stable'],
  blurb: 'Heavy cavalry. The charge decides battles; spears decide charges.',
});

/* ------------------------------------------------------------------ *
 * Siege
 * ------------------------------------------------------------------ */

export const BATTERING_RAM = def({
  id: 'battering_ram',
  name: 'Battering Ram',
  role: UnitRole.Siege,
  classes: [UnitClass.Siege],
  age: Age.Feudal,
  cost: costOf({ wood: 200 }),
  trainTime: T(35),
  hp: 370,
  rangedAttack: 200,
  range: TILES(0.5),
  speed: Math.round(FP_ONE * 0.75),
  los: TILES(6.67),
  pop: 1,
  attackSpeed: T(5.12),
  rangedResistance: 95,
  bonusVs: [{ cls: UnitClass.Building, amount: 300 }],
  trainedAt: ['siege_workshop'],
  blurb: 'Breaks gates and walls. Helpless without an escort.',
});

export const SIEGE_TOWER = def({
  id: 'siege_tower',
  name: 'Siege Tower',
  role: UnitRole.Siege,
  classes: [UnitClass.Siege],
  age: Age.Feudal,
  cost: costOf({ wood: 125 }),
  trainTime: T(30),
  hp: 480,
  speed: Math.round(FP_ONE * 0.81),
  los: TILES(8),
  pop: 1,
  rangedResistance: 95,
  trainedAt: ['siege_workshop'],
  blurb: 'Rolls up to a stone wall so infantry can storm the parapet.',
});

export const MANGONEL = def({
  id: 'mangonel',
  name: 'Mangonel',
  role: UnitRole.Siege,
  classes: [UnitClass.Siege],
  age: Age.Castle,
  cost: costOf({ wood: 400, gold: 200 }),
  trainTime: T(40),
  hp: 130,
  rangedAttack: 10,
  meleeArmor: 0,
  range: TILES(8),
  minRange: TILES(3),
  speed: Math.round(FP_ONE * 0.75),
  los: TILES(11.56),
  pop: 3,
  attackSpeed: T(6.875),
  rangedResistance: 85,
  bonusVs: [
    { cls: UnitClass.Building, amount: 30 },
    { cls: UnitClass.Ranged, amount: 10 },
  ],
  trainedAt: ['siege_workshop'],
  blurb: 'Three stones per volley. Devastating against clustered infantry.',
});

export const SPRINGALD = def({
  id: 'springald',
  name: 'Springald',
  role: UnitRole.Siege,
  classes: [UnitClass.Siege],
  age: Age.Castle,
  cost: costOf({ wood: 150, gold: 100 }),
  trainTime: T(20),
  hp: 85,
  rangedAttack: 15,
  meleeArmor: 3,
  range: TILES(7.5),
  speed: Math.round(FP_ONE * 0.875),
  los: TILES(12.4),
  pop: 2,
  attackSpeed: T(3.125),
  rangedResistance: 55,
  bonusVs: [{ cls: UnitClass.LightInfantry, amount: 12 }],
  trainedAt: ['siege_workshop'],
  blurb: 'Long-range bolt thrower built to snipe enemy siege engines.',
});

export const TREBUCHET = def({
  id: 'trebuchet',
  name: 'Counterweight Trebuchet',
  role: UnitRole.Siege,
  classes: [UnitClass.Siege],
  age: Age.Castle,
  cost: costOf({ wood: 400, gold: 150 }),
  trainTime: T(30),
  hp: 140,
  rangedAttack: 40,
  range: TILES(16),
  minRange: TILES(2.75),
  speed: Math.round(FP_ONE * 0.625),
  los: TILES(17.78),
  pop: 2,
  attackSpeed: T(11.375),
  rangedResistance: 80,
  bonusVs: [{ cls: UnitClass.Building, amount: 350 }],
  trainedAt: ['siege_workshop'],
  blurb: 'Outranges everything on the map. Rains stones on fortifications.',
});

/* ------------------------------------------------------------------ *
 * English unique
 * ------------------------------------------------------------------ */

export const LONGBOWMAN = def({
  id: 'longbowman',
  name: 'Longbowman',
  civ: 'english',
  role: UnitRole.Military,
  classes: [UnitClass.Ranged],
  age: Age.Feudal,
  cost: costOf({ food: 40, wood: 50 }),
  trainTime: T(15),
  hp: 70,
  rangedAttack: 6,
  meleeArmor: 0,
  rangedArmor: 0,
  range: TILES(7),
  speed: Math.round(FP_ONE * 1.125),
  los: TILES(9.78),
  pop: 1,
  attackSpeed: T(1.625),
  bonusVs: [{ cls: UnitClass.LightInfantry, amount: 6 }],
  trainedAt: ['archery_range', 'council_hall'],
  blurb: 'English unique archer. Two tiles more range than any other archer.',
});

/* ------------------------------------------------------------------ *
 * French unique
 * ------------------------------------------------------------------ */

export const ROYAL_KNIGHT = def({
  id: 'royal_knight',
  name: 'Royal Knight',
  civ: 'french',
  role: UnitRole.Military,
  classes: [UnitClass.Cavalry, UnitClass.Heavy],
  age: Age.Feudal,
  cost: costOf({ food: 140, gold: 100 }),
  trainTime: T(35),
  hp: 190,
  meleeAttack: 19,
  meleeArmor: 3,
  rangedArmor: 3,
  range: TILES(0.29),
  speed: Math.round(FP_ONE * 1.625),
  los: TILES(6.22),
  pop: 1,
  attackSpeed: T(1.5),
  chargeBonus: 10,
  trainedAt: ['stable', 'school_of_cavalry'],
  blurb: 'French unique knight. Available a whole age earlier than anyone else.',
});

export const ARBALETRIER = def({
  id: 'arbaletrier',
  name: 'Arbalétrier',
  civ: 'french',
  role: UnitRole.Military,
  classes: [UnitClass.Ranged],
  age: Age.Castle,
  cost: costOf({ food: 80, gold: 40 }),
  trainTime: T(22.5),
  hp: 80,
  rangedAttack: 11,
  meleeArmor: 1,
  rangedArmor: 0,
  range: TILES(5),
  speed: Math.round(FP_ONE * 1.12),
  los: TILES(8.89),
  pop: 1,
  attackSpeed: T(2.125),
  bonusVs: [{ cls: UnitClass.Heavy, amount: 10 }],
  trainedAt: ['archery_range'],
  blurb: 'French unique crossbowman. Braces a pavise shield against return fire.',
});

/* ------------------------------------------------------------------ *
 * Table
 * ------------------------------------------------------------------ */

export const ALL_UNITS: UnitDef[] = [
  VILLAGER,
  SCOUT,
  MONK,
  TRADER,
  SPEARMAN,
  MAN_AT_ARMS,
  ARCHER,
  CROSSBOWMAN,
  HORSEMAN,
  KNIGHT,
  BATTERING_RAM,
  SIEGE_TOWER,
  MANGONEL,
  SPRINGALD,
  TREBUCHET,
  LONGBOWMAN,
  ROYAL_KNIGHT,
  ARBALETRIER,
];

export const UNITS: Record<string, UnitDef> = Object.fromEntries(
  ALL_UNITS.map((u) => [u.id, u]),
);

export function unitsForCiv(civ: string): UnitDef[] {
  return ALL_UNITS.filter((u) => u.civ === 'any' || u.civ === civ);
}

export function isUnitAvailableTo(unit: UnitDef, civ: string): boolean {
  return unit.civ === 'any' || unit.civ === civ;
}
