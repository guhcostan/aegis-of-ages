/**
 * Core simulation types. This module is the frozen interface between the
 * deterministic simulation, the renderer, the HUD and the bots.
 *
 * Rules:
 *  - No imports from three.js / DOM here. The sim must run in plain Node.
 *  - All gameplay numbers are integers. Positions are fixed point (see fixed.ts).
 */
import type { Age, Resource, VictoryCondition } from './constants';

export const enum EntityKind {
  None = 0,
  Unit = 1,
  Building = 2,
  ResourceNode = 3,
  Projectile = 4,
  Relic = 5,
  SacredSite = 6,
}

/**
 * Classes used by the bonus-damage matrix.
 *
 * AoE IV keys bonuses off unit *types* (there are no AoE2-style armour
 * classes): archers get a bonus against light melee infantry, crossbows
 * against heavy units, spearmen against cavalry, horsemen against ranged and
 * siege. A unit carries every class that applies to it.
 */
export const enum UnitClass {
  Infantry = 0,
  Cavalry = 1,
  Ranged = 2,
  Siege = 3,
  Worker = 4,
  Monk = 5,
  Building = 6,
  /** Wild animals, sheep, deer, boar. */
  Fauna = 7,
  /** Melee infantry without heavy armour: this is what Archers counter. */
  LightInfantry = 8,
  /** Armoured units: this is what Crossbows counter. */
  Heavy = 9,
}

/** Behavioural archetype driving which systems act on a unit. */
export const enum UnitRole {
  Worker = 0,
  Military = 1,
  Monk = 2,
  Scout = 3,
  Trade = 4,
  Siege = 5,
}

export const enum ResourceNodeKind {
  Tree = 0,
  BerryBush = 1,
  GoldMine = 2,
  StoneMine = 3,
  Sheep = 4,
  Deer = 5,
  Boar = 6,
  Farm = 7,
}

/** Cost bundle, always integer amounts per resource. */
export interface Cost {
  food: number;
  wood: number;
  gold: number;
  stone: number;
}

export type ResourceKey = 'food' | 'wood' | 'gold' | 'stone';

export const RESOURCE_KEYS: ResourceKey[] = ['food', 'wood', 'gold', 'stone'];

export function emptyCost(): Cost {
  return { food: 0, wood: 0, gold: 0, stone: 0 };
}

export function costOf(partial: Partial<Cost>): Cost {
  return {
    food: partial.food ?? 0,
    wood: partial.wood ?? 0,
    gold: partial.gold ?? 0,
    stone: partial.stone ?? 0,
  };
}

/** Bonus damage against a class. */
export interface BonusDamage {
  cls: UnitClass;
  amount: number;
}

export interface UnitDef {
  id: string;
  name: string;
  /** Civilization that can train it, or 'any' for shared units. */
  civ: CivId | 'any';
  age: Age;
  cost: Cost;
  /** Training time in ticks. */
  trainTime: number;
  hp: number;
  meleeAttack: number;
  rangedAttack: number;
  meleeArmor: number;
  rangedArmor: number;
  /** Attack range in fixed point. Melee units use a small value. */
  range: number;
  /** Movement speed in fixed point per tick. */
  speed: number;
  /** Line of sight in fixed point. */
  los: number;
  pop: number;
  role: UnitRole;
  /** Every class this unit counts as, for bonus-damage lookups. */
  classes: UnitClass[];
  /** Ticks between attacks (rate of fire). */
  attackSpeed: number;
  bonusVs: BonusDamage[];
  /** Ticks before the attack lands (wind-up). */
  windup: number;
  /** Buildings that can train this unit. */
  trainedAt: string[];
  /** Worker-only: can it build? */
  canBuild: boolean;
  /** Minimum range in fixed point (siege engines cannot fire point blank). */
  minRange: number;
  /** Extra damage on the first strike of a charge, 0 when the unit cannot charge. */
  chargeBonus: number;
  /** Percentage of incoming ranged damage ignored, 0-100. Siege only. */
  rangedResistance: number;
  /** Description shown in the HUD, original wording. */
  blurb: string;
}

export const enum BuildingKind {
  DropOff = 0,
  House = 1,
  Production = 2,
  Research = 3,
  Defensive = 4,
  Wall = 5,
  Gate = 6,
  Landmark = 7,
  Wonder = 8,
}

export interface BuildingDef {
  id: string;
  name: string;
  civ: CivId | 'any';
  age: Age;
  cost: Cost;
  /** Build time in ticks for a single villager; scales with builder count. */
  buildTime: number;
  hp: number;
  meleeArmor: number;
  rangedArmor: number;
  /** Footprint in tiles. */
  width: number;
  height: number;
  kind: BuildingKind;
  /** Population provided to the owner. */
  popProvided: number;
  /** Resources this building accepts as a drop-off point. */
  dropOff: ResourceKey[];
  /** Unit ids trainable here. */
  trains: string[];
  /** Technology ids researchable here. */
  researches: string[];
  garrisonCap: number;
  los: number;
  /** Attack stats for defensive buildings. */
  attack: number;
  range: number;
  attackSpeed: number;
  bonusVs: BonusDamage[];
  /** True when this building counts as a landmark for the landmark victory. */
  isLandmark: boolean;
  /** Age this landmark advances to, when it is a landmark. */
  landmarkAge: Age | null;
  /** Wall/gate specific. */
  isWallSegment: boolean;
  isGate: boolean;
  /** Units may stand on top of stone walls. */
  walkableTop: boolean;
  blurb: string;
}

/** One effect applied by a technology. */
export interface TechEffect {
  /** Which stat to modify. */
  stat: TechStat;
  /** Which units/buildings it applies to. */
  appliesTo: 'all' | 'worker' | 'military' | 'siege' | 'monk' | 'building' | 'defensive';
  /** Flat integer delta. */
  flat: number;
  /** Percentage delta, in percent (e.g. 10 == +10%). */
  pct: number;
  /** Optional restriction to a single armour class. */
  cls: UnitClass | null;
  /**
   * Optional restriction to one definition id (used by the asymmetric
   * civilisation bonuses: English farms, French drop-off buildings, and so on).
   */
  only: string | null;
}

export const enum TechStat {
  MeleeAttack = 0,
  RangedAttack = 1,
  MeleeArmor = 2,
  RangedArmor = 3,
  Hp = 4,
  Speed = 5,
  TrainTime = 6,
  GatherFood = 7,
  GatherWood = 8,
  GatherGold = 9,
  GatherStone = 10,
  BuildSpeed = 11,
  CarryCapacity = 12,
  CostFood = 13,
  CostWood = 14,
  CostGold = 15,
  CostStone = 16,
  Los = 17,
  AttackSpeed = 18,
  HealRate = 19,
  Range = 20,
}

export interface TechDef {
  id: string;
  name: string;
  civ: CivId | 'any';
  age: Age;
  cost: Cost;
  researchTime: number;
  /** Building id that researches it. */
  building: string;
  effects: TechEffect[];
  requires: string[];
  blurb: string;
}

export interface CivDef {
  id: CivId;
  name: string;
  blurb: string;
  /** Permanent civilization modifiers, applied like techs. */
  bonuses: TechEffect[];
  /** Free-text list of the civ's signature traits, shown in the lobby/HUD. */
  traits: string[];
  /** Unique unit ids. */
  uniqueUnits: string[];
  /** Landmark choices, indexed by the age being advanced INTO (Feudal..Imperial). */
  landmarks: Record<number, [string, string]>;
  /** Units trainable that are not universal. */
  uniqueBuildings: string[];
  /** Starting resource bonus. */
  startingBonus: Partial<Cost>;
}

export type CivId = 'english' | 'french';

/** Order kinds a unit can be given. */
export const enum OrderKind {
  Idle = 0,
  Move = 1,
  Attack = 2,
  AttackMove = 3,
  Gather = 4,
  ReturnCargo = 5,
  Build = 6,
  Repair = 7,
  Train = 8,
  Garrison = 9,
  Heal = 10,
  Convert = 11,
  Trade = 12,
  Hold = 13,
  Patrol = 14,
  AdvanceAge = 15,
  PickupRelic = 16,
  DropRelic = 17,
  Capture = 18,
}

export interface Order {
  kind: OrderKind;
  /** Target entity, or 0 when unused. */
  target: number;
  /** Target position in fixed point, when the order is positional. */
  x: number;
  y: number;
  /** Definition id for Train orders. */
  defId: number;
  /** Tick at which this order was issued, used for stable tie-breaks. */
  issued: number;
  /** For rally points and follow-up state. */
  aux: number;
}

export interface GatherState {
  /** Resource the worker is currently extracting. */
  resource: Resource;
  /** Node entity currently being gathered from, 0 when none. */
  node: number;
  /** Progress accumulator in integer milli-units. */
  progress: number;
  /** Amount currently carried. */
  carried: number;
  /** Drop-off building being walked to, 0 when gathering. */
  dropOff: number;
}

export interface BuildState {
  /** Building under construction, 0 when not building. */
  site: number;
  /** Accumulated build progress in integer units. */
  progress: number;
}

export interface ProductionEntry {
  defId: string;
  /** Ticks remaining until completion. */
  remaining: number;
  /** Total ticks for the entry, for the progress bar. */
  total: number;
  /** Entity id of the rally target, 0 for default. */
  rally: number;
}

export interface ProductionQueue {
  entries: ProductionEntry[];
  /** Rally point in fixed point, -1 when unset. */
  rallyX: number;
  rallyY: number;
  rallyTarget: number;
}

export interface Entity {
  id: number;
  kind: EntityKind;
  /** Definition id: index into the unit/building/resource table. */
  def: string;
  owner: number;
  alive: boolean;
  x: number;
  y: number;
  /** Facing angle in 1/256 turns. */
  facing: number;
  hp: number;
  maxHp: number;

  // --- unit ---
  orders: Order[];
  /** Current attack cooldown in ticks. */
  cooldown: number;
  /** Attack wind-up remaining, -1 when not attacking. */
  windup: number;
  /** Entity this unit is currently swinging at. */
  attackTarget: number;
  /** Path waypoints, packed into a flat array of fixed-point pairs. */
  path: number[];
  /** Index into `path` (in pairs). */
  pathIndex: number;
  /** Movement goal. */
  goalX: number;
  goalY: number;
  hasGoal: boolean;
  /** Repath cooldown so a stuck unit does not path every tick. */
  repathAt: number;
  /** Last distance to goal, used to detect that a unit is making no progress. */
  lastGoalDist: number;
  /** Ticks during which the unit has failed to get closer to its goal. */
  stuckTicks: number;
  gather: GatherState;
  build: BuildState;
  /** Worker carrying type. */
  carried: number;
  /** Entity the worker is standing on / inside, 0 when free. */
  inside: number;

  // --- building ---
  production: ProductionQueue;
  /** 0..1000 build progress; 1000 means finished. */
  construction: number;
  /** Population currently provided by this building (for houses). */
  popProvided: number;
  /** Workers currently constructing, tracked for progress speed. */
  builders: number;
  /** Relic held inside this building/monk, 0 when none. */
  relicHeld: number;

  // --- resource node ---
  /** Remaining amount for resource nodes. */
  amount: number;
  /** Resource kind produced by this node. */
  resourceKind: number;

  // --- combat shared ---
  /** Ticks until this entity can act again (stun, etc). */
  stunUntil: number;
  /** Accumulated damage taken this tick for damage-flash. */
  lastDamageTick: number;
  /** Integer accumulator so slow effects are not lost to truncation (healing). */
  healAccum: number;
  /** 1 when a charging cavalry unit's next strike carries its charge bonus. */
  chargeReady: number;

  // --- projectiles ---
  target: number;
  damage: number;
  /** Physics for projectiles/arrows. */
  vx: number;
  vy: number;
  vz: number;
  z: number;
  ttl: number;
  /** Source entity for kill credit. */
  source: number;
}

/** Per-player state. */
export interface PlayerState {
  id: number;
  name: string;
  civ: CivId;
  team: number;
  /** -1 for human, else Difficulty. */
  bot: number;
  age: Age;
  resources: Cost;
  /** Population currently used. */
  pop: number;
  popCap: number;
  /** Completed technology ids. */
  techs: Set<string>;
  /** Techs currently being researched: defId -> ticks remaining. */
  researching: Map<string, { remaining: number; total: number; building: number }>;
  /** Landmarks constructed (entity ids), used for the landmark victory. */
  landmarks: number[];
  defeated: boolean;
  /** Ticks spent holding enough sacred sites. */
  sacredHoldTicks: number;
  /** Wonder completion tick, 0 when no wonder. */
  wonderAt: number;
  /** Aggregated lifetime statistics for the scoreboard. */
  stats: PlayerStats;
  /** Cached stat modifiers, rebuilt when techs/age change. */
  modVersion: number;
}

export interface PlayerStats {
  unitsTrained: number;
  unitsLost: number;
  unitsKilled: number;
  buildingsBuilt: number;
  buildingsLost: number;
  resourcesGathered: Cost;
  relicsHeld: number;
  peakPop: number;
}

export interface MatchConfig {
  seed: number;
  mapSize: MapSizeKey;
  /** Terrain preset: 'grassland' | 'dry' | 'forest'. */
  mapType: string;
  players: PlayerConfig[];
  victory: VictoryCondition;
  startingResources: Cost;
  /** Extra units/resources for testing. */
  revealMap: boolean;
  /** Disable the bots entirely (used by unit tests). */
  disableBots: boolean;
  /** Hard limit for headless runs. */
  maxTicks: number;
}

export type MapSizeKey = 'tiny' | 'small' | 'medium' | 'large' | 'huge';

export interface PlayerConfig {
  name: string;
  civ: CivId;
  team: number;
  bot: number;
  color: number;
}
