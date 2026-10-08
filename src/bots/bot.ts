/**
 * Bot opponent.
 *
 * A deterministic, tick-driven controller that plays a real game: it runs a
 * build order, assigns villagers to resources, ages up through landmarks,
 * builds a counter-composed army, defends its base, attacks when it has the
 * numbers, and contests sacred sites.
 *
 * Determinism: the bot only reads World state and the tick counter, and makes
 * every choice with the world RNG or by deterministic sorting. Replaying the
 * same seed therefore reproduces the same match.
 *
 * Difficulty changes how fast the bot reacts and how large an army it commits,
 * it does NOT give the bot free resources (see docs/SPEC.md).
 */
import { Age, FP_ONE, VictoryCondition } from '../sim/constants';
import { CommandType } from '../sim/commands';
import type { Command } from '../sim/commands';
import { BuildingKind, EntityKind, OrderKind, UnitClass, UnitRole, type Entity } from '../sim/types';
import { UNITS } from '../sim/data/units';
import { BUILDINGS } from '../sim/data/buildings';
import { landmarkChoices, techCostFor } from '../sim/data/civs';
import { TECHS } from '../sim/data/techs';
import type { Game } from '../sim/game';
import type { World } from '../sim/world';
import { effectiveBuilding, effectiveUnit } from '../sim/stats';
import { canAfford } from '../sim/systems/build';
import { reservedPopulation } from '../sim/systems/production';
import { villagerCounts } from '../sim/game';

/** Difficulty tuning. Values are deliberately free of resource cheats. */
export interface BotProfile {
  /** Ticks between decision passes. Lower reacts faster. */
  thinkInterval: number;
  /** Villagers the bot wants before it stops training them. */
  villagerTarget: number;
  /** Army size at which it attacks. */
  attackThreshold: number;
  /** Fraction of villagers it keeps on food, percent. */
  foodShare: number;
  woodShare: number;
  goldShare: number;
  /** Whether the bot builds a second Town Center. */
  expands: boolean;
  /** Whether the bot pushes for sacred sites. */
  contestsSites: boolean;
}

export const BOT_PROFILES: BotProfile[] = [
  {
    thinkInterval: 40,
    villagerTarget: 14,
    attackThreshold: 16,
    foodShare: 45,
    woodShare: 30,
    goldShare: 20,
    expands: false,
    contestsSites: false,
  },
  {
    thinkInterval: 24,
    villagerTarget: 24,
    attackThreshold: 14,
    foodShare: 42,
    woodShare: 28,
    goldShare: 24,
    expands: true,
    contestsSites: true,
  },
  {
    thinkInterval: 16,
    villagerTarget: 34,
    attackThreshold: 12,
    foodShare: 40,
    woodShare: 26,
    goldShare: 26,
    expands: true,
    contestsSites: true,
  },
];

type ResourceKey = 'food' | 'wood' | 'gold' | 'stone';

/** Build order: the buildings the bot wants, in priority order. */
interface BuildOrderEntry {
  defId: string;
  /** Minimum age required. */
  age: Age;
  /** Desired count. */
  count: number;
  /** Optional extra gold veins before it is considered. */
  priority: number;
}

const BUILD_ORDER: BuildOrderEntry[] = [
  { defId: 'house', age: Age.Dark, count: 3, priority: 0 },
  { defId: 'barracks', age: Age.Dark, count: 1, priority: 1 },
  { defId: 'mill', age: Age.Dark, count: 1, priority: 2 },
  { defId: 'lumber_camp', age: Age.Dark, count: 2, priority: 2 },
  { defId: 'mining_camp', age: Age.Dark, count: 2, priority: 3 },
  { defId: 'archery_range', age: Age.Feudal, count: 1, priority: 4 },
  { defId: 'stable', age: Age.Feudal, count: 1, priority: 4 },
  { defId: 'blacksmith', age: Age.Feudal, count: 1, priority: 5 },
  { defId: 'market', age: Age.Feudal, count: 1, priority: 7 },
  { defId: 'barracks', age: Age.Feudal, count: 2, priority: 6 },
  { defId: 'archery_range', age: Age.Castle, count: 2, priority: 6 },
  { defId: 'monastery', age: Age.Castle, count: 1, priority: 6 },
  { defId: 'siege_workshop', age: Age.Castle, count: 1, priority: 7 },
  { defId: 'university', age: Age.Imperial, count: 1, priority: 8 },
];

export class BotController {
  private readonly game: Game;
  private readonly world: World;
  /** Where commands go. Defaults to the game queue; tests inject the session. */
  private readonly sink: (command: Command) => boolean;
  readonly playerId: number;
  readonly profile: BotProfile;
  /** Base centre, used as the anchor for building and defence decisions. */
  private homeX = 0;
  private homeY = 0;
  /** Ticks until the next attack push, so attacks arrive in waves. */
  private attackCooldown = 0;
  private attacking = false;
  private lastThink = -999;

  constructor(
    game: Game,
    playerId: number,
    difficulty: number,
    sink?: (command: Command) => boolean,
  ) {
    this.game = game;
    this.world = game.world;
    this.sink = sink ?? ((command) => {
      game.enqueue(command);
      return true;
    });
    this.playerId = playerId;
    this.profile = BOT_PROFILES[Math.max(0, Math.min(BOT_PROFILES.length - 1, difficulty))] as BotProfile;
    const start = game.world.map.startPositions[playerId];
    if (start) {
      this.homeX = (start.x << 10) + 512;
      this.homeY = (start.y << 10) + 512;
    }
  }

  /** Called once per simulation tick by the session. */
  update(): void {
    if (this.world.tick - this.lastThink < this.profile.thinkInterval) return;
    this.lastThink = this.world.tick;
    const player = this.world.players[this.playerId];
    if (!player || player.defeated) return;

    this.economy();
    this.housing();
    this.buildings();
    this.ageUp();
    this.research();
    this.military();
    this.armyControl();
  }

  /* ---------------------------------------------------------------- *
   * Economy
   * ---------------------------------------------------------------- */

  private economy(): void {
    const w = this.world;
    const player = w.players[this.playerId];
    if (!player) return;

    const townCenter = this.findBuilding('town_center');
    const counts = villagerCounts(w, this.playerId);
    const total = counts.food + counts.wood + counts.gold + counts.stone + counts.idle;

    // Train villagers while there is room and we are under the target.
    if (townCenter) {
      const reserved = reservedPopulation(w, this.playerId);
      const canGrow = player.pop + reserved + 1 <= player.popCap;
      const wantsVillagers = total < this.profile.villagerTarget && player.popCap >= 10;
      if (canGrow && wantsVillagers && this.canAffordUnit('villager')) {
        this.send({
          type: CommandType.Train,
          player: this.playerId,
          building: townCenter.id,
          defId: 'villager',
          count: 1,
        });
      }
    }

    // Reassign idle villagers to whichever resource is most behind.
    const idle = this.idleVillagers();
    if (idle.length > 0) {
      const want = this.desiredShares();
      for (const unit of idle) {
        const resource = this.mostNeededResource(counts, want);
        const node = this.findNode(resource);
        if (!node) break;
        this.send({
          type: CommandType.Gather,
          player: this.playerId,
          units: [unit.id],
          target: node.id,
          queue: false,
        });
      }
    }

    // A farm economy is what carries the mid game.
    if (player.age >= Age.Feudal && player.resources.wood >= 150) {
      const farms = this.countBuildings('farm');
      const foodWorkers = counts.food;
      if (farms < Math.ceil(foodWorkers / 2) && this.constructionSites() < 3) {
        this.tryBuild('farm');
      }
    }
  }

  private desiredShares(): Record<ResourceKey, number> {
    const player = this.world.players[this.playerId];
    const age = player?.age ?? Age.Dark;
    const p = this.profile;
    // Gold and stone matter more as the game goes on.
    const gold = p.goldShare + age * 3;
    const stone = age >= Age.Castle ? 10 : 4;
    const food = Math.max(25, p.foodShare - age * 2);
    return { food, wood: p.woodShare, gold, stone };
  }

  private mostNeededResource(
    counts: { food: number; wood: number; gold: number; stone: number; idle: number },
    want: Record<ResourceKey, number>,
  ): ResourceKey {
    const total = counts.food + counts.wood + counts.gold + counts.stone;
    if (total === 0) return 'food';
    let best: ResourceKey = 'food';
    let bestDeficit = -Infinity;
    const keys: ResourceKey[] = ['food', 'wood', 'gold', 'stone'];
    for (const key of keys) {
      const deficit = want[key] - (counts[key] / total) * 100;
      if (deficit > bestDeficit) {
        bestDeficit = deficit;
        best = key;
      }
    }
    return best;
  }

  private idleVillagers(): Entity[] {
    const out: Entity[] = [];
    for (const e of this.world.all()) {
      if (e.owner !== this.playerId || e.kind !== EntityKind.Unit) continue;
      const def = UNITS[e.def];
      if (!def || def.role !== UnitRole.Worker) continue;
      const order = e.orders[0];
      if (!order) out.push(e);
    }
    return out;
  }

  private findNode(resource: ResourceKey): Entity | null {
    let best: Entity | null = null;
    let bestD = Number.MAX_SAFE_INTEGER;
    for (const e of this.world.all()) {
      const isFarm = e.kind === EntityKind.Building && e.def === 'farm' && e.owner === this.playerId;
      if (e.kind !== EntityKind.ResourceNode && !isFarm) continue;
      if (e.kind === EntityKind.ResourceNode && e.amount <= 0) continue;
      const kind = isFarm ? 'farm' : e.def;
      const res =
        kind === 'tree'
          ? 'wood'
          : kind === 'gold'
            ? 'gold'
            : kind === 'stone'
              ? 'stone'
              : 'food';
      if (res !== resource) continue;
      const d = (e.x - this.homeX) * (e.x - this.homeX) + (e.y - this.homeY) * (e.y - this.homeY);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  /* ---------------------------------------------------------------- *
   * Construction
   * ---------------------------------------------------------------- */

  private housing(): void {
    const player = this.world.players[this.playerId];
    if (!player) return;
    const reserved = reservedPopulation(this.world, this.playerId);
    const headroom = player.popCap - (player.pop + reserved);
    if (headroom > 4) return;
    const pending = this.constructionSitesOf('house');
    if (pending >= 2) return;
    this.tryBuild('house');
  }

  private buildings(): void {
    const player = this.world.players[this.playerId];
    if (!player) return;
    const sorted = [...BUILD_ORDER].sort((a, b) => a.priority - b.priority);
    for (const entry of sorted) {
      if (entry.age > player.age) continue;
      const have = this.countBuildings(entry.defId) + this.constructionSitesOf(entry.defId);
      if (have >= entry.count) continue;
      if (entry.defId === 'market' && player.age < Age.Feudal) continue;
      if (this.constructionSites() >= 3) return;
      if (this.tryBuild(entry.defId)) return;
    }
  }

  /** Build a landmark to advance the age. */
  private ageUp(): void {
    const player = this.world.players[this.playerId];
    if (!player || player.age >= Age.Imperial) return;
    const nextAge = (player.age + 1) as Age;
    const choices = landmarkChoices(player.civ, nextAge);
    if (this.constructionSitesOf(choices[0]) + this.constructionSitesOf(choices[1]) > 0) return;

    // Prefer the economically stronger landmark per civ and age.
    const preferred = this.pickLandmark(choices);
    if (!preferred) return;
    const def = BUILDINGS[preferred];
    if (!def) return;
    const eff = effectiveBuilding(this.world, this.playerId, def);
    // Keep a small reserve so the bot can still train while it ages up.
    if (!this.canAffordWithReserve(eff.cost, 100)) return;
    this.tryBuild(preferred);
  }

  private pickLandmark(choices: [string, string]): string | null {
    const [a, b] = choices;
    if (!a && !b) return null;
    // English: Council Hall for the Feudal push, King's Palace for economy.
    // French: School of Cavalry early, Guild Hall for the long game.
    const order: Record<string, number> = {
      council_hall: 0,
      school_of_cavalry: 0,
      kings_palace: 0,
      guild_hall: 0,
      abbey_of_kings: 1,
      chamber_of_commerce: 1,
      white_tower: 1,
      royal_institute: 1,
      wynguard_palace: 0,
      berkshire_palace: 1,
      red_palace: 0,
      college_of_artillery: 1,
    };
    const sa = order[a] ?? 0;
    const sb = order[b] ?? 0;
    if (sa <= sb) return a;
    return b;
  }

  /** Try to place a building near the base using idle villagers. */
  private tryBuild(defId: string): boolean {
    const def = BUILDINGS[defId];
    if (!def) return false;
    const eff = effectiveBuilding(this.world, this.playerId, def);
    if (!canAfford(this.world.players[this.playerId]?.resources ?? { food: 0, wood: 0, gold: 0, stone: 0 }, eff.cost)) {
      return false;
    }

    const spot = this.findBuildSpot(defId, def.width, def.height);
    if (!spot) return false;

    let builders = this.idleVillagers().slice(0, 2).map((e) => e.id);
    if (builders.length === 0) {
      // Pull the closest villager off its job rather than idling the bot.
      const closest = this.closestVillager(spot.x << 10, spot.y << 10);
      if (closest) builders = [closest.id];
    }
    if (builders.length === 0) return false;

    this.send({
      type: CommandType.Build,
      player: this.playerId,
      units: builders,
      defId,
      tileX: spot.x,
      tileY: spot.y,
      queue: false,
    });
    return true;
  }

  /** Spiral search for a legal footprint near the base. */
  private findBuildSpot(defId: string, width: number, height: number): { x: number; y: number } | null {
    const w = this.world;
    const map = w.map;
    const baseX = this.homeX >> 10;
    const baseY = this.homeY >> 10;
    for (let r = 3; r < 26; r += 1) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const x = baseX + dx;
          const y = baseY + dy;
          if (x < 1 || y < 1) continue;
          if (x + width >= map.width || y + height >= map.height) continue;
          if (w.canPlaceBuilding(defId, x, y)) {
            // Do not wall ourselves in: keep the footprint clear of the TC ring.
            if (Math.abs(dx) < 3 && Math.abs(dy) < 3) continue;
            return { x, y };
          }
        }
      }
    }
    return null;
  }

  private constructionSites(): number {
    let n = 0;
    for (const e of this.world.all()) {
      if (e.owner !== this.playerId || e.kind !== EntityKind.Building) continue;
      if (e.construction < 1000) n++;
    }
    return n;
  }

  private constructionSitesOf(defId: string): number {
    let n = 0;
    for (const e of this.world.all()) {
      if (e.owner !== this.playerId || e.kind !== EntityKind.Building) continue;
      if (e.def !== defId) continue;
      if (e.construction < 1000) n++;
    }
    return n;
  }

  private countBuildings(defId: string): number {
    let n = 0;
    for (const e of this.world.all()) {
      if (e.owner !== this.playerId || e.kind !== EntityKind.Building) continue;
      if (e.def === defId && e.construction >= 1000) n++;
    }
    return n;
  }

  private findBuilding(defId: string): Entity | null {
    for (const e of this.world.all()) {
      if (e.owner !== this.playerId || e.kind !== EntityKind.Building) continue;
      if (e.def === defId && e.construction >= 1000) return e;
    }
    return null;
  }

  private closestVillager(x: number, y: number): Entity | null {
    let best: Entity | null = null;
    let bestD = Number.MAX_SAFE_INTEGER;
    for (const e of this.world.all()) {
      if (e.owner !== this.playerId || e.kind !== EntityKind.Unit) continue;
      const def = UNITS[e.def];
      if (!def || def.role !== UnitRole.Worker) continue;
      const d = (e.x - x) * (e.x - x) + (e.y - y) * (e.y - y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  /* ---------------------------------------------------------------- *
   * Technology
   * ---------------------------------------------------------------- */

  private research(): void {
    const w = this.world;
    const player = w.players[this.playerId];
    if (!player) return;
    if (player.researching.size >= 2) return;

    // Priority list of economic and military upgrades.
    const wishlist = [
      'wheelbarrow',
      'forged_blades',
      'hardened_shafts',
      'iron_undermail',
      'horticulture',
      'double_broadaxe',
      'specialized_pick',
      'padded_armor',
      'tempered_blades',
      'balanced_bows',
      'fitted_leather',
      'leather_armor',
      'veteran_spearman',
      'veteran_archer',
      'veteran_knight',
      'chemistry',
      'elite_army_tactics',
    ];

    for (const techId of wishlist) {
      if (player.techs.has(techId) || player.researching.has(techId)) continue;
      const building = this.findResearchBuilding(techId);
      if (!building) continue;
      if (!this.canAffordTech(building.id, techId)) continue;
      this.send({
        type: CommandType.Research,
        player: this.playerId,
        building: building.id,
        techId,
      });
      return;
    }
  }

  private findResearchBuilding(techId: string): Entity | null {
    for (const e of this.world.all()) {
      if (e.owner !== this.playerId || e.kind !== EntityKind.Building) continue;
      if (e.construction < 1000) continue;
      const def = BUILDINGS[e.def];
      if (def?.researches.includes(techId)) return e;
    }
    return null;
  }

  private canAffordTech(_buildingId: number, techId: string): boolean {
    const player = this.world.players[this.playerId];
    const tech = TECHS[techId];
    if (!player || !tech) return false;
    if (player.age < tech.age) return false;
    if (player.techs.has(techId) || player.researching.has(techId)) return false;
    for (const req of tech.requires) {
      if (!player.techs.has(req)) return false;
    }
    return canAfford(player.resources, techCostFor(player.civ, tech.cost, techId));
  }

  /* ---------------------------------------------------------------- *
   * Military
   * ---------------------------------------------------------------- */

  private military(): void {
    const w = this.world;
    const player = w.players[this.playerId];
    if (!player) return;

    const composition = this.enemyComposition();
    for (const e of w.all()) {
      if (e.owner !== this.playerId || e.kind !== EntityKind.Building) continue;
      if (e.construction < 1000) continue;
      const def = BUILDINGS[e.def];
      if (!def || def.kind !== BuildingKind.Production) continue;
      if (e.production.entries.length >= 3) continue;

      const unit = this.pickUnitToTrain(def.trains, composition, player.age);
      if (!unit) continue;
      if (!this.canAffordUnit(unit)) continue;
      this.send({
        type: CommandType.Train,
        player: this.playerId,
        building: e.id,
        defId: unit,
        count: 1,
      });
    }
  }

  /** Choose the best counter unit available from a building's roster. */
  private pickUnitToTrain(options: string[], enemy: Record<string, number>, age: Age): string | null {
    let best: string | null = null;
    let bestScore = -1;
    for (const id of options) {
      const def = UNITS[id];
      if (!def) continue;
      if (def.age > age) continue;
      if (def.civ !== 'any' && def.civ !== this.world.players[this.playerId]?.civ) continue;
      if (def.role !== UnitRole.Military && def.role !== UnitRole.Siege) continue;
      let score = 1;
      // Score by how well it counters what the enemy actually fields.
      for (const bonus of def.bonusVs) {
        score += (enemy[String(bonus.cls)] ?? 0) * bonus.amount * 0.05;
      }
      // Prefer a balanced army: fewer of a type we already have many of.
      const have = this.countUnitsOfType(id);
      score -= have * 0.35;
      if (score > bestScore) {
        bestScore = score;
        best = id;
      }
    }
    return best;
  }

  private countUnitsOfType(defId: string): number {
    let n = 0;
    for (const e of this.world.all()) {
      if (e.owner === this.playerId && e.kind === EntityKind.Unit && e.def === defId) n++;
    }
    return n;
  }

  /** Enemy army composition by class, weighted by count. */
  private enemyComposition(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const e of this.world.all()) {
      if (e.owner === this.playerId) continue;
      if (e.owner < 0 || e.kind !== EntityKind.Unit) continue;
      const def = UNITS[e.def];
      if (!def || def.role === UnitRole.Worker) continue;
      for (const cls of def.classes) {
        out[String(cls)] = (out[String(cls)] ?? 0) + 1;
      }
    }
    return out;
  }

  private canAffordUnit(defId: string): boolean {
    const player = this.world.players[this.playerId];
    const def = UNITS[defId];
    if (!player || !def) return false;
    const eff = effectiveUnit(this.world, this.playerId, def);
    return canAfford(player.resources, eff.cost);
  }

  private canAffordWithReserve(
    cost: { food: number; wood: number; gold: number; stone: number },
    reserve: number,
  ): boolean {
    const player = this.world.players[this.playerId];
    if (!player) return false;
    return (
      player.resources.food >= cost.food + reserve &&
      player.resources.wood >= cost.wood + reserve &&
      player.resources.gold >= cost.gold + reserve &&
      player.resources.stone >= cost.stone
    );
  }

  /* ---------------------------------------------------------------- *
   * Army control
   * ---------------------------------------------------------------- */

  private armyControl(): void {
    const w = this.world;
    const player = w.players[this.playerId];
    if (!player) return;

    const army: Entity[] = [];
    for (const e of w.all()) {
      if (e.owner !== this.playerId || e.kind !== EntityKind.Unit) continue;
      const def = UNITS[e.def];
      if (!def) continue;
      if (def.role === UnitRole.Military || def.role === UnitRole.Siege) army.push(e);
    }
    if (army.length === 0) return;

    // Defend first: any enemy inside our base radius takes priority.
    const threat = this.findThreat();
    if (threat) {
      for (const u of army) {
        this.send({
          type: CommandType.Attack,
          player: this.playerId,
          units: [u.id],
          target: threat.id,
          queue: false,
        });
      }
      this.attacking = false;
      return;
    }

    // Sacred sites, when the victory condition or the profile calls for it.
    const objective = this.sacredSiteTarget();
    if (objective && army.length >= 6) {
      for (const u of army) {
        this.send({
          type: CommandType.AttackMove,
          player: this.playerId,
          units: [u.id],
          x: objective.x,
          y: objective.y,
          queue: false,
        });
      }
      return;
    }

    const threshold = this.profile.attackThreshold;
    if (!this.attacking && army.length >= threshold && this.attackCooldown <= 0) {
      this.attacking = true;
      this.attackCooldown = 600;
    }
    if (this.attackCooldown > 0) this.attackCooldown--;

    if (this.attacking) {
      const target = this.findAttackTarget();
      if (!target) {
        this.attacking = false;
        return;
      }
      for (const u of army) {
        this.send({
          type: CommandType.AttackMove,
          player: this.playerId,
          units: [u.id],
          x: target.x,
          y: target.y,
          queue: false,
        });
      }
    } else {
      // Hold near the base, slightly forward of it.
      const gx = this.homeX + 4 * FP_ONE;
      const gy = this.homeY + 4 * FP_ONE;
      let needOrder = 0;
      for (const u of army) {
        const dx = u.x - gx;
        const dy = u.y - gy;
        if (dx * dx + dy * dy > (5 * FP_ONE) * (5 * FP_ONE)) needOrder++;
      }
      if (needOrder > army.length / 2) {
        for (const u of army) {
          this.send({
            type: CommandType.Move,
            player: this.playerId,
            units: [u.id],
            x: gx,
            y: gy,
            queue: false,
          });
        }
      }
    }
  }

  /** Nearest enemy inside our defensive radius. */
  private findThreat(): Entity | null {
    const radius = 22 * FP_ONE;
    const radius2 = radius * radius;
    let best: Entity | null = null;
    let bestD = Number.MAX_SAFE_INTEGER;
    for (const e of this.world.all()) {
      if (e.owner === this.playerId || e.owner < 0) continue;
      const dx = e.x - this.homeX;
      const dy = e.y - this.homeY;
      const d = dx * dx + dy * dy;
      if (d > radius2) continue;
      if (e.kind === EntityKind.Unit || e.kind === EntityKind.Building) {
        if (d < bestD) {
          bestD = d;
          best = e;
        }
      }
    }
    return best;
  }

  private sacredSiteTarget(): Entity | null {
    if (!this.profile.contestsSites && this.game.config.victory !== VictoryCondition.SacredSites) {
      return null;
    }
    let best: Entity | null = null;
    let bestD = Number.MAX_SAFE_INTEGER;
    for (const e of this.world.all()) {
      if (e.kind !== EntityKind.SacredSite) continue;
      if (e.owner === this.playerId) continue;
      const d = (e.x - this.homeX) * (e.x - this.homeX) + (e.y - this.homeY) * (e.y - this.homeY);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  /** The enemy building we should march on: their Town Center, else anything. */
  private findAttackTarget(): Entity | null {
    let tc: Entity | null = null;
    let any: Entity | null = null;
    let bestD = Number.MAX_SAFE_INTEGER;
    for (const e of this.world.all()) {
      if (e.owner === this.playerId || e.owner < 0) continue;
      if (e.kind !== EntityKind.Building) continue;
      const d = (e.x - this.homeX) * (e.x - this.homeX) + (e.y - this.homeY) * (e.y - this.homeY);
      if (e.def === 'town_center' || BUILDINGS[e.def]?.isLandmark) {
        if (d < bestD) {
          bestD = d;
          tc = e;
        }
      } else if (!any) {
        any = e;
      }
    }
    return tc ?? any;
  }

  /* ---------------------------------------------------------------- *
   * Command plumbing
   * ---------------------------------------------------------------- */

  private send(command: Command): void {
    this.sink(command);
  }
}

export { UnitClass, OrderKind };

