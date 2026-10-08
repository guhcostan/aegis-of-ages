/**
 * Building definitions, including age-up landmarks for both civilizations.
 *
 * NUMBER PROVENANCE: docs/research/buildings.md, verified against the
 * aoe4world/data game-file extraction (Season 13 / patch 16.1.9737) and the
 * Age of Empires Wiki. docs/SPEC.md lists which rows are cross-verified and
 * which are single-sourced.
 *
 * Buildings in AoE IV have ranged armor 50 and no melee armor: melee attackers
 * use a torch (fire damage). We keep a small melee armor value so that rams and
 * torch attacks do not trivially one-shot structures, and record the deviation
 * in docs/SPEC.md.
 */
import { Age, FP_ONE, TICK_RATE } from '../constants';
import { BuildingKind, costOf } from '../types';
import type { BuildingDef } from '../types';

const T = (seconds: number): number => Math.round(seconds * TICK_RATE);
const TILES = (t: number): number => Math.round(t * FP_ONE);

function bdef(
  d: Partial<BuildingDef> &
    Pick<BuildingDef, 'id' | 'name' | 'cost' | 'buildTime' | 'hp' | 'width' | 'height' | 'kind'>,
): BuildingDef {
  return {
    civ: 'any',
    age: Age.Dark,
    meleeArmor: 0,
    rangedArmor: 50,
    fireArmor: 0,
    popProvided: 0,
    dropOff: [],
    trains: [],
    researches: [],
    garrisonCap: 0,
    los: TILES(10),
    attack: 0,
    range: 0,
    attackSpeed: T(1.5),
    bonusVs: [],
    isLandmark: false,
    landmarkAge: null,
    isWallSegment: false,
    isGate: false,
    walkableTop: false,
    blurb: '',
    ...d,
  };
}

/* ------------------------------------------------------------------ *
 * Core economy
 * ------------------------------------------------------------------ */

export const TOWN_CENTER = bdef({
  id: 'town_center',
  name: 'Town Center',
  cost: costOf({ wood: 400, stone: 300 }),
  buildTime: T(150),
  hp: 7000,
  rangedArmor: 50,
  meleeArmor: 0,
  width: 4,
  height: 4,
  kind: BuildingKind.DropOff,
  age: Age.Feudal,
  popProvided: 10,
  dropOff: ['food', 'wood', 'gold', 'stone'],
  trains: ['villager', 'scout'],
  garrisonCap: 15,
  los: TILES(14),
  attack: 8,
  range: TILES(8),
  attackSpeed: T(1.5),
  blurb:
    'Trains villagers, accepts every resource, and shelters your people. The starting Town Center is your capital.',
});

export const HOUSE = bdef({
  id: 'house',
  name: 'House',
  cost: costOf({ wood: 50 }),
  buildTime: T(15),
  hp: 750,
  width: 2,
  height: 2,
  kind: BuildingKind.House,
  popProvided: 10,
  los: TILES(6),
  blurb: 'Adds 10 population space.',
});

export const MILL = bdef({
  id: 'mill',
  name: 'Mill',
  cost: costOf({ wood: 50 }),
  buildTime: T(20),
  hp: 750,
  width: 2,
  height: 2,
  kind: BuildingKind.DropOff,
  dropOff: ['food'],
  researches: ['survival_techniques', 'wheelbarrow', 'horticulture', 'fertilization'],
  garrisonCap: 5,
  los: TILES(8),
  blurb: 'Food drop-off. Researches farming and foraging upgrades.',
});

export const FARM = bdef({
  id: 'farm',
  name: 'Farm',
  cost: costOf({ wood: 75 }),
  buildTime: T(6),
  hp: 300,
  width: 2,
  height: 2,
  kind: BuildingKind.DropOff,
  los: TILES(4),
  blurb: 'An endless source of food. Only one villager can work a farm.',
});

export const LUMBER_CAMP = bdef({
  id: 'lumber_camp',
  name: 'Lumber Camp',
  cost: costOf({ wood: 50 }),
  buildTime: T(20),
  hp: 750,
  width: 2,
  height: 2,
  kind: BuildingKind.DropOff,
  dropOff: ['wood'],
  researches: ['forestry', 'double_broadaxe', 'lumber_preservation', 'crosscut_saw'],
  garrisonCap: 5,
  los: TILES(8),
  blurb: 'Wood drop-off. Researches felling upgrades.',
});

export const MINING_CAMP = bdef({
  id: 'mining_camp',
  name: 'Mining Camp',
  cost: costOf({ wood: 50 }),
  buildTime: T(20),
  hp: 750,
  width: 2,
  height: 2,
  kind: BuildingKind.DropOff,
  dropOff: ['gold', 'stone'],
  researches: ['specialized_pick', 'shaft_mining', 'cupellation'],
  garrisonCap: 5,
  los: TILES(8),
  blurb: 'Gold and stone drop-off. Researches mining upgrades.',
});

export const MARKET = bdef({
  id: 'market',
  name: 'Market',
  cost: costOf({ wood: 100 }),
  buildTime: T(20),
  hp: 1000,
  width: 4,
  height: 4,
  kind: BuildingKind.Research,
  age: Age.Feudal,
  dropOff: ['gold'],
  trains: ['trader'],
  garrisonCap: 5,
  los: TILES(10),
  blurb: 'Sends traders along a trade route. The farther they walk, the more gold.',
});

/* ------------------------------------------------------------------ *
 * Military production
 * ------------------------------------------------------------------ */

export const BARRACKS = bdef({
  id: 'barracks',
  name: 'Barracks',
  cost: costOf({ wood: 150 }),
  buildTime: T(30),
  hp: 1500,
  width: 3,
  height: 3,
  kind: BuildingKind.Production,
  age: Age.Dark,
  trains: ['spearman', 'manatarms'],
  researches: ['hardened_spearman', 'veteran_spearman', 'elite_spearman', 'veteran_manatarms', 'elite_manatarms'],
  garrisonCap: 5,
  los: TILES(8),
  blurb: 'Trains infantry: spearmen and men-at-arms.',
});

export const ARCHERY_RANGE = bdef({
  id: 'archery_range',
  name: 'Archery Range',
  cost: costOf({ wood: 150 }),
  buildTime: T(30),
  hp: 1500,
  width: 3,
  height: 3,
  kind: BuildingKind.Production,
  age: Age.Feudal,
  trains: ['archer', 'crossbowman', 'longbowman', 'arbaletrier'],
  researches: ['veteran_archer', 'elite_archer', 'elite_crossbowman', 'spyglass'],
  garrisonCap: 5,
  los: TILES(8),
  blurb: 'Trains ranged infantry.',
});

export const STABLE = bdef({
  id: 'stable',
  name: 'Stable',
  cost: costOf({ wood: 150 }),
  buildTime: T(30),
  hp: 1500,
  width: 3,
  height: 3,
  kind: BuildingKind.Production,
  age: Age.Feudal,
  trains: ['scout', 'horseman', 'knight', 'royal_knight'],
  researches: ['veteran_horseman', 'elite_horseman', 'veteran_knight', 'elite_knight'],
  garrisonCap: 5,
  los: TILES(8),
  blurb: 'Trains cavalry.',
});

export const SIEGE_WORKSHOP = bdef({
  id: 'siege_workshop',
  name: 'Siege Workshop',
  cost: costOf({ wood: 250 }),
  buildTime: T(45),
  hp: 2100,
  width: 3,
  height: 3,
  kind: BuildingKind.Production,
  age: Age.Castle,
  trains: ['battering_ram', 'siege_tower', 'mangonel', 'springald', 'trebuchet'],
  researches: ['lightweight_beams', 'greased_axles', 'adjustable_crossbars'],
  garrisonCap: 5,
  los: TILES(8),
  blurb: 'Builds siege engines: rams, towers, mangonels and trebuchets.',
});

/* ------------------------------------------------------------------ *
 * Research & support
 * ------------------------------------------------------------------ */

export const BLACKSMITH = bdef({
  id: 'blacksmith',
  name: 'Blacksmith',
  cost: costOf({ wood: 150 }),
  buildTime: T(25),
  hp: 1500,
  width: 4,
  height: 4,
  kind: BuildingKind.Research,
  age: Age.Feudal,
  researches: [
    'forged_blades',
    'tempered_blades',
    'damascus_steel',
    'hardened_shafts',
    'balanced_bows',
    'platecutter_point',
    'iron_undermail',
    'fitted_leather',
    'insulated_helm',
    'padded_armor',
    'leather_armor',
    'mail_armor',
  ],
  garrisonCap: 5,
  los: TILES(8),
  blurb: 'Weapons and armour upgrades for your whole army.',
});

export const UNIVERSITY = bdef({
  id: 'university',
  name: 'University',
  cost: costOf({ wood: 450 }),
  buildTime: T(60),
  hp: 2100,
  width: 4,
  height: 4,
  kind: BuildingKind.Research,
  age: Age.Imperial,
  researches: [
    'chemistry',
    'siege_works',
    'incendiary_arrows',
    'elite_army_tactics',
    'court_architects',
    'silk_bowstrings',
  ],
  garrisonCap: 5,
  los: TILES(8),
  blurb: 'Advanced military and defensive engineering.',
});

export const MONASTERY = bdef({
  id: 'monastery',
  name: 'Monastery',
  cost: costOf({ wood: 200 }),
  buildTime: T(25),
  hp: 2100,
  width: 4,
  height: 4,
  kind: BuildingKind.Research,
  age: Age.Castle,
  trains: ['monk'],
  researches: ['herbal_medicine', 'piety', 'tithe_barns'],
  garrisonCap: 10,
  los: TILES(10),
  blurb: 'Trains monks to heal, carry relics and contest sacred sites.',
});

/* ------------------------------------------------------------------ *
 * Defences
 * ------------------------------------------------------------------ */

export const OUTPOST = bdef({
  id: 'outpost',
  name: 'Outpost',
  cost: costOf({ wood: 100 }),
  buildTime: T(60),
  hp: 750,
  width: 2,
  height: 2,
  kind: BuildingKind.Defensive,
  age: Age.Dark,
  attack: 8,
  range: TILES(6),
  attackSpeed: T(1.5),
  garrisonCap: 5,
  los: TILES(13.33),
  blurb: 'Cheap watchtower. Fires arrows and extends your sight.',
});

export const PALISADE_WALL = bdef({
  id: 'palisade_wall',
  name: 'Palisade Wall',
  cost: costOf({ wood: 7 }),
  buildTime: T(8),
  hp: 1350,
  meleeArmor: 2,
  width: 1,
  height: 1,
  kind: BuildingKind.Wall,
  age: Age.Dark,
  isWallSegment: true,
  los: TILES(3),
  blurb: 'A wooden barrier. Cheap, quick, and it buys time.',
});

export const PALISADE_GATE = bdef({
  id: 'palisade_gate',
  name: 'Palisade Gate',
  cost: costOf({ wood: 25 }),
  buildTime: T(10),
  hp: 1350,
  meleeArmor: 2,
  width: 1,
  height: 1,
  kind: BuildingKind.Gate,
  age: Age.Dark,
  isWallSegment: true,
  isGate: true,
  los: TILES(3),
  blurb: 'A gate your own units pass through freely.',
});

export const STONE_WALL = bdef({
  id: 'stone_wall',
  name: 'Stone Wall',
  cost: costOf({ stone: 25 }),
  buildTime: T(16),
  hp: 3000,
  meleeArmor: 8,
  width: 1,
  height: 1,
  kind: BuildingKind.Wall,
  age: Age.Feudal,
  isWallSegment: true,
  walkableTop: true,
  los: TILES(4),
  blurb: 'Heavy fortification. Only siege engines can break it, and your infantry can stand on top.',
});

export const STONE_GATE = bdef({
  id: 'stone_gate',
  name: 'Stone Wall Gate',
  cost: costOf({ stone: 50 }),
  buildTime: T(30),
  hp: 3000,
  meleeArmor: 8,
  width: 1,
  height: 1,
  kind: BuildingKind.Gate,
  age: Age.Feudal,
  isWallSegment: true,
  isGate: true,
  walkableTop: true,
  los: TILES(4),
  blurb: 'Reinforced gate for a stone curtain wall.',
});

export const KEEP = bdef({
  id: 'keep',
  name: 'Keep',
  cost: costOf({ stone: 900 }),
  buildTime: T(180),
  hp: 5000,
  meleeArmor: 10,
  fireArmor: 6,
  width: 4,
  height: 4,
  kind: BuildingKind.Defensive,
  age: Age.Castle,
  attack: 16,
  range: TILES(8),
  attackSpeed: T(1.2),
  garrisonCap: 15,
  los: TILES(16),
  blurb: 'The strongest defensive building. It stops armies.',
});

export const WONDER = bdef({
  id: 'wonder',
  name: 'Wonder',
  cost: costOf({ food: 5000, wood: 5000, gold: 5000, stone: 5000 }),
  buildTime: T(600),
  hp: 5000,
  meleeArmor: 10,
  width: 6,
  height: 6,
  kind: BuildingKind.Wonder,
  age: Age.Imperial,
  los: TILES(20),
  blurb: 'Build it, hold it for fifteen minutes, and the match is yours.',
});

/* ------------------------------------------------------------------ *
 * Landmark cost tiers (AoE IV): the cost IS the age-up cost.
 *   Feudal   400 food + 200 gold, 190 s, 5000 HP
 *   Castle  1200 food + 600 gold, 220 s, 5000 HP
 *   Imperial 2400 food + 1200 gold, 250 s, 5000 HP
 * ------------------------------------------------------------------ */

const FEUDAL_LANDMARK = { cost: costOf({ food: 400, gold: 200 }), buildTime: T(190), hp: 5000 };
const CASTLE_LANDMARK = { cost: costOf({ food: 1200, gold: 600 }), buildTime: T(220), hp: 5000 };
const IMPERIAL_LANDMARK = { cost: costOf({ food: 2400, gold: 1200 }), buildTime: T(250), hp: 5000 };

/* ------------------------------------------------------------------ *
 * English landmarks
 * ------------------------------------------------------------------ */

export const COUNCIL_HALL = bdef({
  ...FEUDAL_LANDMARK,
  id: 'council_hall',
  name: 'Council Hall',
  civ: 'english',
  width: 4,
  height: 4,
  kind: BuildingKind.Landmark,
  age: Age.Dark,
  isLandmark: true,
  landmarkAge: Age.Feudal,
  trains: ['longbowman'],
  garrisonCap: 5,
  los: TILES(10),
  blurb: 'Acts as an Archery Range that works twice as fast and makes Longbowmen cheaper.',
});

export const ABBEY_OF_KINGS = bdef({
  ...FEUDAL_LANDMARK,
  id: 'abbey_of_kings',
  name: 'Abbey of Kings',
  civ: 'english',
  width: 4,
  height: 4,
  kind: BuildingKind.Landmark,
  age: Age.Dark,
  isLandmark: true,
  landmarkAge: Age.Feudal,
  garrisonCap: 10,
  los: TILES(10),
  blurb: 'Heals nearby friendly units out of combat, forever.',
});

export const KINGS_PALACE = bdef({
  ...CASTLE_LANDMARK,
  id: 'kings_palace',
  name: "King's Palace",
  civ: 'english',
  width: 4,
  height: 4,
  kind: BuildingKind.Landmark,
  age: Age.Feudal,
  isLandmark: true,
  landmarkAge: Age.Castle,
  popProvided: 10,
  dropOff: ['food', 'wood', 'gold', 'stone'],
  trains: ['villager'],
  garrisonCap: 10,
  los: TILES(12),
  blurb: 'A second Town Center in all but name, with villagers trained faster.',
});

export const WHITE_TOWER = bdef({
  ...CASTLE_LANDMARK,
  id: 'white_tower',
  name: 'The White Tower',
  civ: 'english',
  width: 4,
  height: 4,
  kind: BuildingKind.Landmark,
  age: Age.Feudal,
  isLandmark: true,
  landmarkAge: Age.Castle,
  attack: 16,
  range: TILES(8),
  attackSpeed: T(1.2),
  garrisonCap: 15,
  los: TILES(16),
  blurb: 'A Keep with all its behaviours and technologies, working 75% faster.',
});

export const BERKSHIRE_PALACE = bdef({
  ...IMPERIAL_LANDMARK,
  hp: 6500,
  id: 'berkshire_palace',
  name: 'Berkshire Palace',
  civ: 'english',
  width: 4,
  height: 4,
  kind: BuildingKind.Landmark,
  age: Age.Castle,
  isLandmark: true,
  landmarkAge: Age.Imperial,
  attack: 20,
  range: TILES(14.5),
  attackSpeed: T(1.2),
  garrisonCap: 20,
  los: TILES(18),
  blurb: 'An improved Keep whose incendiary arrows reach 14.5 tiles.',
});

export const WYNGUARD_PALACE = bdef({
  ...IMPERIAL_LANDMARK,
  id: 'wynguard_palace',
  name: 'Wynguard Palace',
  civ: 'english',
  width: 4,
  height: 4,
  kind: BuildingKind.Landmark,
  age: Age.Castle,
  isLandmark: true,
  landmarkAge: Age.Imperial,
  trains: ['manatarms', 'longbowman'],
  garrisonCap: 10,
  los: TILES(12),
  blurb: 'Musters a royal army on demand.',
});

/* ------------------------------------------------------------------ *
 * French landmarks
 * ------------------------------------------------------------------ */

export const CHAMBER_OF_COMMERCE = bdef({
  ...FEUDAL_LANDMARK,
  id: 'chamber_of_commerce',
  name: 'Chamber of Commerce',
  civ: 'french',
  width: 4,
  height: 4,
  kind: BuildingKind.Landmark,
  age: Age.Dark,
  isLandmark: true,
  landmarkAge: Age.Feudal,
  dropOff: ['gold'],
  garrisonCap: 5,
  los: TILES(10),
  blurb: 'Turns every trade route into a river of gold.',
});

export const SCHOOL_OF_CAVALRY = bdef({
  ...FEUDAL_LANDMARK,
  id: 'school_of_cavalry',
  name: 'School of Cavalry',
  civ: 'french',
  width: 4,
  height: 4,
  kind: BuildingKind.Landmark,
  age: Age.Dark,
  isLandmark: true,
  landmarkAge: Age.Feudal,
  trains: ['royal_knight', 'horseman'],
  researches: ['veteran_horseman', 'elite_horseman', 'veteran_knight', 'elite_knight'],
  garrisonCap: 5,
  los: TILES(10),
  blurb: 'Trains Royal Knights, and trains them cheaply.',
});

export const ROYAL_INSTITUTE = bdef({
  ...CASTLE_LANDMARK,
  id: 'royal_institute',
  name: 'Royal Institute',
  civ: 'french',
  width: 4,
  height: 4,
  kind: BuildingKind.Landmark,
  age: Age.Feudal,
  isLandmark: true,
  landmarkAge: Age.Castle,
  researches: [
    'forged_blades',
    'tempered_blades',
    'damascus_steel',
    'iron_undermail',
    'fitted_leather',
    'insulated_helm',
  ],
  garrisonCap: 5,
  los: TILES(10),
  blurb: 'Houses military upgrades and researches them 30% cheaper.',
});

export const GUILD_HALL = bdef({
  ...CASTLE_LANDMARK,
  id: 'guild_hall',
  name: 'Guild Hall',
  civ: 'french',
  width: 4,
  height: 4,
  kind: BuildingKind.Landmark,
  age: Age.Feudal,
  isLandmark: true,
  landmarkAge: Age.Castle,
  dropOff: ['food', 'wood', 'gold', 'stone'],
  garrisonCap: 5,
  los: TILES(10),
  blurb: 'Produces resources on its own, forever, without a single villager.',
});

export const RED_PALACE = bdef({
  ...IMPERIAL_LANDMARK,
  id: 'red_palace',
  name: 'Red Palace',
  civ: 'french',
  width: 4,
  height: 4,
  kind: BuildingKind.Landmark,
  age: Age.Castle,
  isLandmark: true,
  landmarkAge: Age.Imperial,
  attack: 22,
  range: TILES(10),
  attackSpeed: T(1.2),
  garrisonCap: 15,
  los: TILES(18),
  blurb: 'A Keep with arbalest emplacements that shred anything in reach.',
});

export const COLLEGE_OF_ARTILLERY = bdef({
  ...IMPERIAL_LANDMARK,
  id: 'college_of_artillery',
  name: 'College of Artillery',
  civ: 'french',
  width: 4,
  height: 4,
  kind: BuildingKind.Landmark,
  age: Age.Castle,
  isLandmark: true,
  landmarkAge: Age.Imperial,
  trains: ['mangonel', 'springald', 'trebuchet'],
  garrisonCap: 5,
  los: TILES(12),
  blurb: 'Royal artillery, built where you need it.',
});

/* ------------------------------------------------------------------ *
 * Table
 * ------------------------------------------------------------------ */

export const ALL_BUILDINGS: BuildingDef[] = [
  TOWN_CENTER,
  HOUSE,
  MILL,
  FARM,
  LUMBER_CAMP,
  MINING_CAMP,
  MARKET,
  BARRACKS,
  ARCHERY_RANGE,
  STABLE,
  SIEGE_WORKSHOP,
  BLACKSMITH,
  UNIVERSITY,
  MONASTERY,
  OUTPOST,
  PALISADE_WALL,
  PALISADE_GATE,
  STONE_WALL,
  STONE_GATE,
  KEEP,
  WONDER,
  COUNCIL_HALL,
  ABBEY_OF_KINGS,
  KINGS_PALACE,
  WHITE_TOWER,
  BERKSHIRE_PALACE,
  WYNGUARD_PALACE,
  CHAMBER_OF_COMMERCE,
  SCHOOL_OF_CAVALRY,
  ROYAL_INSTITUTE,
  GUILD_HALL,
  RED_PALACE,
  COLLEGE_OF_ARTILLERY,
];

export const BUILDINGS: Record<string, BuildingDef> = Object.fromEntries(
  ALL_BUILDINGS.map((b) => [b.id, b]),
);

export function buildingsForCiv(civ: string): BuildingDef[] {
  return ALL_BUILDINGS.filter((b) => b.civ === 'any' || b.civ === civ);
}

export function isBuildingAvailableTo(def: BuildingDef, civ: string): boolean {
  return def.civ === 'any' || def.civ === civ;
}
