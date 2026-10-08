/**
 * Game: the deterministic match orchestrator.
 *
 * Owns the World, applies commands, and advances the simulation one fixed tick
 * at a time. Fully headless: this file must run in Node with no DOM.
 */
import {
  Age,
  FOG_UPDATE_INTERVAL,
  FP_ONE,
  POP_CAP_MAX,
  TICK_RATE,
  VictoryCondition,
} from './constants';
import { EntityKind, OrderKind, UnitRole, type Entity, type MatchConfig, type PlayerConfig } from './types';
import type { Command as Cmd } from './commands';
import { CommandType } from './commands';
import { generateMap, type ResourceSpawn } from './map/terrain';
import { World } from './world';
import { UNITS } from './data/units';
import { BUILDINGS } from './data/buildings';
import { START_RESOURCES, START_UNITS } from './data/economy';
import { CIVS } from './data/civs';
import type { CivId, MapSizeKey } from './types';
import { movementSystem, setDestination, faceToward } from './systems/movement';
import { gatherSystem, issueGather, repairSystem } from './systems/gather';
import { buildSystem, placeBuilding, canAfford, pay } from './systems/build';
import { productionSystem, queueUnit, queueResearch, tryAdvanceAge, landmarkTargetAge } from './systems/production';
import { combatSystem } from './systems/combat';
import { religionSystem, pickupRelic, orderDropRelic } from './systems/religion';
import { tradeSystem, orderMerchant } from './systems/trade';
import { victorySystem, objectives, type MatchResult } from './systems/victory';
import { createFog, setRevealAll, updateFog, type PlayerFog } from './systems/fog';
import { effectiveUnit } from './stats';

export interface GameOptions extends Partial<MatchConfig> {
  players?: PlayerConfig[];
}

export interface StateSnapshot {
  tick: number;
  over: boolean;
  winner: number;
  reason: string;
  victory: VictoryCondition;
  players: Array<{
    id: number;
    name: string;
    civ: string;
    team: number;
    bot: number;
    age: number;
    ageName: string;
    resources: { food: number; wood: number; gold: number; stone: number };
    pop: number;
    popCap: number;
    defeated: boolean;
    techs: string[];
    landmarks: number;
    sacredSites: number;
    sacredHoldTicks: number;
    wonderTicks: number;
    stats: Record<string, unknown>;
    villagerCounts: { food: number; wood: number; gold: number; stone: number; idle: number };
  }>;
  entities: EntitySnapshot[];
  productionQueues: Array<{ building: number; owner: number; items: Array<{ defId: string; remaining: number; total: number }> }>;
  globalQueue: Array<{ owner: number; building: number; defId: string; remaining: number; total: number }>;
  objectives: Array<Record<string, number>>;
}

export interface EntitySnapshot {
  id: number;
  kind: number;
  def: string;
  owner: number;
  x: number;
  y: number;
  facing: number;
  hp: number;
  maxHp: number;
  construction: number;
  amount: number;
  carrying: number;
  carryingType: number;
  orders: number[];
  path: number[];
  goalX: number;
  goalY: number;
  hasGoal: boolean;
  relicHeld: number;
  inside: number;
  builders: number;
}

export class Game {
  readonly world: World;
  readonly config: MatchConfig;
  readonly fogs: PlayerFog[] = [];
  readonly results: MatchResult = { over: false, winner: -1, reason: '' };
  /** Commands applied this tick, kept for replay and for the e2e harness. */
  readonly commandLog: Cmd[] = [];
  private pending: Cmd[] = [];
  private over = false;

  constructor(options: GameOptions = {}) {
    const size: MapSizeKey = options.mapSize ?? 'medium';
    const players: PlayerConfig[] = options.players ?? [
      { name: 'You', civ: 'english', team: 0, bot: -1, color: 0 },
      { name: 'Bot 1', civ: 'french', team: 0, bot: 1, color: 1 },
    ];
    const config: MatchConfig = {
      seed: options.seed ?? 1234,
      mapSize: size,
      mapType: options.mapType ?? 'grassland',
      players,
      victory: options.victory ?? VictoryCondition.Landmarks,
      startingResources: options.startingResources ?? { ...START_RESOURCES },
      revealMap: options.revealMap ?? false,
      disableBots: options.disableBots ?? false,
      maxTicks: options.maxTicks ?? TICK_RATE * 60 * 120,
    };
    this.config = config;
    // Apply the lobby's reveal-map option before the first fog update.
    setRevealAll(config.revealMap);

    const generated = generateMap({
      seed: config.seed,
      size,
      playerCount: players.length,
      mapType: config.mapType,
    });
    this.world = new World(generated.map, config.seed);

    // --- Players ---
    for (const pc of players) {
      const start = { ...config.startingResources };
      const civ = CIVS[pc.civ] ?? CIVS.english;
      if (civ && pc.civ in CIVS) {
        start.food += civ.startingBonus.food ?? 0;
        start.wood += civ.startingBonus.wood ?? 0;
        start.gold += civ.startingBonus.gold ?? 0;
        start.stone += civ.startingBonus.stone ?? 0;
      }
      this.world.addPlayer(pc, start);
      this.fogs.push(createFog(generated.map.width, generated.map.height));
    }

    // --- Resource nodes ---
    for (const node of generated.resourceNodes) {
      this.spawnResource(node);
    }

    // --- Sacred sites ---
    for (const spot of generated.map.sacredSiteSpots) {
      const site = this.world.createEntity(
        EntityKind.SacredSite,
        'sacred_site',
        -1,
        (spot.x << 10) + 512,
        (spot.y << 10) + 512,
      );
      site.hp = 1;
      site.maxHp = 1;
      site.amount = 0;
    }

    // --- Relics ---
    for (const spot of generated.map.relicSpots) {
      const relic = this.world.createEntity(
        EntityKind.Relic,
        'relic',
        -1,
        (spot.x << 10) + 512,
        (spot.y << 10) + 512,
      );
      relic.hp = 1;
      relic.maxHp = 1;
      this.world.setBlocking(spot.x, spot.y, 1, 1, relic.id, 0);
    }

    // --- Starting bases, mirrored around each start position ---
    for (let i = 0; i < players.length; i++) {
      const p = players[i] as PlayerConfig;
      const start = generated.starts[i];
      if (!start) continue;
      const tcX = clampTile(start.x - 2, generated.map.width);
      const tcY = clampTile(start.y - 2, generated.map.height);
      const tc = this.world.spawnBuilding({
        owner: i,
        defId: 'town_center',
        tileX: tcX,
        tileY: tcY,
        construction: 1000,
      });
      tc.popProvided = BUILDINGS.town_center?.popProvided ?? 10;

      // Starting units arranged on a small ring so they do not overlap.
      const offsets = [
        [-3, 2],
        [-2, 3],
        [5, 2],
        [6, 3],
        [3, 4],
        [4, 5],
        [2, 6],
      ];
      for (const u of START_UNITS) {
        for (let n = 0; n < u.count; n++) {
          const off = offsets[(n + (u.defId === 'scout' ? 3 : 0)) % offsets.length] as number[];
          const tx = clampTile(tcX + off[0] + (u.defId === 'scout' ? 1 : 0), generated.map.width);
          const ty = clampTile(tcY + off[1], generated.map.height);
          const unit = this.world.spawnUnit({
            owner: i,
            defId: u.defId,
            x: (tx << 10) + 512,
            y: (ty << 10) + 512,
          });
          faceToward(unit, tc.x, tc.y);
          const def = UNITS[u.defId];
          if (def && def.role === UnitRole.Worker) {
            const node = nearestNodeFor(this.world, unit, n === 0 ? 'wood' : n === 1 ? 'wood' : 'food');
            if (node) issueGather(this.world, unit, node.id, false);
          }
          void p;
        }
      }
    }

    this.world.rebuildSpatialIndex();
    for (const player of this.world.players) this.world.recomputePopulation(player);
    for (let i = 0; i < this.world.players.length; i++) {
      updateFog(this.world, this.fogs[i] as PlayerFog, i, true);
    }
  }

  private spawnResource(node: ResourceSpawn): void {
    this.world.spawnResourceNode(node.kind, (node.x << 10) + 512, (node.y << 10) + 512);
  }

  /* ---------------------------------------------------------------- *
   * Commands
   * ---------------------------------------------------------------- */

  enqueue(command: Cmd): void {
    this.pending.push(command);
  }

  /** Apply one command immediately. Returns whether it was accepted. */
  apply(command: Cmd): boolean {
    const w = this.world;
    const player = w.players[command.player];
    if (!player || player.defeated) return false;
    if (this.over) return false;

    switch (command.type) {
      case CommandType.Move: {
        const targets = this.resolveUnits(command.player, command.units);
        // Formation offset so a group does not pile onto one pixel.
        const spread = Math.max(1, Math.ceil(Math.sqrt(targets.length)));
        for (let i = 0; i < targets.length; i++) {
          const e = targets[i] as Entity;
          const col = i % spread;
          const row = Math.trunc(i / spread);
          const gx = command.x + (col - (spread - 1) / 2) * (FP_ONE * 0.8) | 0;
          const gy = command.y + row * (FP_ONE * 0.8) | 0;
          e.orders.length = 0;
          e.orders.push({
            kind: OrderKind.Move,
            target: 0,
            x: gx,
            y: gy,
            defId: 0,
            issued: w.tick,
            aux: 0,
          });
          // Do not clear the queue here: the Move order was just installed.
          setDestination(w, e, gx, gy, true);
          e.attackTarget = 0;
        }
        return targets.length > 0;
      }
      case CommandType.Attack: {
        const targets = this.resolveUnits(command.player, command.units);
        const victim = w.get(command.target);
        if (!victim) return false;
        for (const e of targets) {
          e.orders.length = 0;
          e.orders.push({
            kind: OrderKind.Attack,
            target: victim.id,
            x: victim.x,
            y: victim.y,
            defId: 0,
            issued: w.tick,
            aux: 0,
          });
          e.attackTarget = victim.id;
        }
        return targets.length > 0;
      }
      case CommandType.AttackMove: {
        const targets = this.resolveUnits(command.player, command.units);
        for (const e of targets) {
          e.orders.length = 0;
          e.orders.push({
            kind: OrderKind.AttackMove,
            target: 0,
            x: command.x,
            y: command.y,
            defId: 0,
            issued: w.tick,
            aux: 0,
          });
          e.attackTarget = 0;
          setDestination(w, e, command.x, command.y, true);
        }
        return targets.length > 0;
      }
      case CommandType.Gather: {
        const targets = this.resolveUnits(command.player, command.units);
        for (const e of targets) issueGather(w, e, command.target, command.queue);
        return targets.length > 0;
      }
      case CommandType.Build: {
        const workers = this.resolveUnits(command.player, command.units);
        const site = placeBuilding(
          w,
          command.player,
          command.defId,
          command.tileX,
          command.tileY,
          workers.map((e) => e.id),
          command.queue,
          command.endX,
          command.endY,
        );
        return site !== null;
      }
      case CommandType.Repair: {
        const targets = this.resolveUnits(command.player, command.units);
        const victim = w.get(command.target);
        if (!victim) return false;
        for (const e of targets) {
          e.orders.length = 0;
          e.orders.push({
            kind: OrderKind.Repair,
            target: victim.id,
            x: victim.x,
            y: victim.y,
            defId: 0,
            issued: w.tick,
            aux: 0,
          });
          setDestination(w, e, victim.x, victim.y, true);
        }
        return targets.length > 0;
      }
      case CommandType.Train:
        return queueUnit(w, command.building, command.defId, command.count);
      case CommandType.Research:
        return queueResearch(w, command.building, command.techId);
      case CommandType.CancelProduction: {
        const b = w.get(command.building);
        if (!b || b.owner !== command.player) return false;
        if (command.index === undefined) {
          const refundTotal = { food: 0, wood: 0, gold: 0, stone: 0 };
          for (const entry of b.production.entries) {
            const def = UNITS[entry.defId];
            if (!def) continue;
            refundTotal.food += Math.trunc((def.cost.food * entry.remaining) / Math.max(1, entry.total));
            refundTotal.wood += Math.trunc((def.cost.wood * entry.remaining) / Math.max(1, entry.total));
            refundTotal.gold += Math.trunc((def.cost.gold * entry.remaining) / Math.max(1, entry.total));
            refundTotal.stone += Math.trunc((def.cost.stone * entry.remaining) / Math.max(1, entry.total));
          }
          b.production.entries.length = 0;
          player.resources.food += refundTotal.food;
          player.resources.wood += refundTotal.wood;
          player.resources.gold += refundTotal.gold;
          player.resources.stone += refundTotal.stone;
          return true;
        }
        const entry = b.production.entries[command.index];
        if (!entry) return false;
        const def = UNITS[entry.defId];
        if (def) {
          player.resources.food += Math.trunc((def.cost.food * entry.remaining) / Math.max(1, entry.total));
          player.resources.wood += Math.trunc((def.cost.wood * entry.remaining) / Math.max(1, entry.total));
          player.resources.gold += Math.trunc((def.cost.gold * entry.remaining) / Math.max(1, entry.total));
          player.resources.stone += Math.trunc((def.cost.stone * entry.remaining) / Math.max(1, entry.total));
        }
        b.production.entries.splice(command.index, 1);
        return true;
      }
      case CommandType.SetRally: {
        const b = w.get(command.building);
        if (!b || b.owner !== command.player) return false;
        b.production.rallyX = command.x;
        b.production.rallyY = command.y;
        b.production.rallyTarget = command.target ?? 0;
        return true;
      }
      case CommandType.Stop: {
        const targets = this.resolveUnits(command.player, command.units);
        for (const e of targets) {
          e.orders.length = 0;
          e.hasGoal = false;
          e.path = [];
          e.pathIndex = 0;
          e.attackTarget = 0;
        }
        return targets.length > 0;
      }
      case CommandType.Hold: {
        const targets = this.resolveUnits(command.player, command.units);
        for (const e of targets) {
          e.orders.length = 0;
          e.orders.push({ kind: OrderKind.Hold, target: 0, x: e.x, y: e.y, defId: 0, issued: w.tick, aux: 0 });
          e.hasGoal = false;
          e.path = [];
        }
        return targets.length > 0;
      }
      case CommandType.Garrison: {
        const targets = this.resolveUnits(command.player, command.units);
        const b = w.get(command.building);
        if (!b) return false;
        const def = BUILDINGS[b.def];
        if (!def || def.garrisonCap <= 0) return false;
        let used = garrisonCount(w, b.id);
        for (const e of targets) {
          if (used >= def.garrisonCap) break;
          e.inside = b.id;
          e.hasGoal = false;
          e.path = [];
          used++;
        }
        return true;
      }
      case CommandType.Ungarrison: {
        const b = w.get(command.building);
        if (!b) return false;
        this.ungarrison(b);
        return true;
      }
      case CommandType.Heal:
      case CommandType.Convert: {
        const targets = this.resolveUnits(command.player, command.units);
        const victim = w.get(command.target);
        if (!victim) return false;
        for (const e of targets) {
          e.orders.length = 0;
          e.orders.push({
            kind: command.type === CommandType.Heal ? OrderKind.Heal : OrderKind.Convert,
            target: victim.id,
            x: victim.x,
            y: victim.y,
            defId: 0,
            issued: w.tick,
            aux: 0,
          });
          setDestination(w, e, victim.x, victim.y, true);
        }
        return targets.length > 0;
      }
      case CommandType.Trade: {
        const targets = this.resolveUnits(command.player, command.units);
        for (const e of targets) orderMerchant(w, e, command.market);
        return targets.length > 0;
      }
      case CommandType.AdvanceAge: {
        // Advancing happens by completing the chosen landmark. If the landmark
        // already exists and is finished, promote immediately.
        const b = w.get(command.building);
        if (b) return tryAdvanceAge(w, b.id);
        return false;
      }
      case CommandType.Delete: {
        const targets = this.resolveUnits(command.player, command.units);
        for (const e of targets) w.destroyEntity(e.id);
        return true;
      }
      case CommandType.Patrol: {
        const targets = this.resolveUnits(command.player, command.units);
        for (const e of targets) {
          e.orders.length = 0;
          e.orders.push({
            kind: OrderKind.Patrol,
            target: 0,
            x: command.x,
            y: command.y,
            defId: 0,
            issued: w.tick,
            aux: 0,
          });
          setDestination(w, e, command.x, command.y, true);
        }
        return true;
      }
      case CommandType.PickupRelic: {
        const monks = this.resolveUnits(command.player, command.units);
        let ok = false;
        const relic = w.get(command.target);
        if (!relic) return false;
        for (const m of monks) {
          // Walk to the relic first when out of reach, then pick it up.
          const dist = Math.abs(m.x - relic.x) + Math.abs(m.y - relic.y);
          if (dist > FP_ONE * 3) {
            m.orders.length = 0;
            m.orders.push({
              kind: OrderKind.PickupRelic,
              target: relic.id,
              x: relic.x,
              y: relic.y,
              defId: 0,
              issued: w.tick,
              aux: 0,
            });
            setDestination(w, m, relic.x, relic.y, true);
            ok = true;
          } else {
            ok = pickupRelic(w, m.id, relic.id) || ok;
          }
        }
        return ok;
      }
      case CommandType.DropRelic: {
        const monks = this.resolveUnits(command.player, command.units);
        let ok = false;
        for (const m of monks) ok = orderDropRelic(w, m.id, command.target) || ok;
        return ok;
      }
      case CommandType.ReturnCargo: {
        const targets = this.resolveUnits(command.player, command.units);
        for (const e of targets) {
          e.orders.length = 0;
          e.orders.push({ kind: OrderKind.ReturnCargo, target: 0, x: 0, y: 0, defId: 0, issued: w.tick, aux: 0 });
        }
        return targets.length > 0;
      }
      case CommandType.Cheat: {
        if (command.kind === 'resources') {
          const amount = command.amount ?? 10000;
          player.resources.food += amount;
          player.resources.wood += amount;
          player.resources.gold += amount;
          player.resources.stone += amount;
          return true;
        }
        if (command.kind === 'reveal') {
          this.config.revealMap = true;
          for (const fog of this.fogs) fog.explored.fill(1);
          return true;
        }
        if (command.kind === 'building' && command.defId) {
          // Place a finished building at an explicit tile. Used by the
          // acceptance tests to set up wonder and sacred-site scenarios.
          const def = BUILDINGS[command.defId];
          if (!def) return false;
          const tileX = command.tileX ?? command.x ?? 0;
          const tileY = command.tileY ?? command.y ?? 0;
          const building = w.spawnBuilding({
            owner: command.player,
            defId: command.defId,
            tileX,
            tileY,
            construction: 1000,
          });
          void building;
          for (const p of w.players) w.recomputePopulation(p);
          return true;
        }
        if (command.kind === 'spawn' && command.defId) {
          const count = command.count ?? 1;
          const x = command.x ?? this.world.map.width * FP_ONE / 2;
          const y = command.y ?? this.world.map.height * FP_ONE / 2;
          for (let i = 0; i < count; i++) {
            const ox = (i % 10) * FP_ONE;
            const oy = Math.trunc(i / 10) * FP_ONE;
            w.spawnUnit({ owner: command.player, defId: command.defId, x: x + ox, y: y + oy });
          }
          for (const p of w.players) w.recomputePopulation(p);
          return true;
        }
        return false;
      }
      default:
        return false;
    }
  }

  private ungarrison(b: Entity): void {
    const w = this.world;
    const def = BUILDINGS[b.def];
    const w2 = def?.width ?? 1;
    const h2 = def?.height ?? 1;
    for (let i = 0; i < w.entities.length; i++) {
      const e = w.entities[i];
      if (!e || !e.alive || e.inside !== b.id) continue;
      e.inside = 0;
      const tx = (b.x >> 10) + (i % 2 === 0 ? w2 : -1);
      const ty = (b.y >> 10) + (i % 3 === 0 ? h2 : 0);
      if (tx >= 0 && ty >= 0 && tx < w.map.width && ty < w.map.height && w.map.passable[ty * w.map.width + tx]) {
        e.x = (tx << 10) + 512;
        e.y = (ty << 10) + 512;
      }
      e.orders.length = 0;
    }
  }

  private resolveUnits(playerId: number, ids: number[]): Entity[] {
    const out: Entity[] = [];
    for (const id of ids) {
      const e = this.world.get(id);
      if (!e) continue;
      if (e.owner !== playerId) continue;
      if (e.kind !== EntityKind.Unit) continue;
      out.push(e);
    }
    return out;
  }

  /* ---------------------------------------------------------------- *
   * Tick
   * ---------------------------------------------------------------- */

  step(): void {
    if (this.over) return;
    const w = this.world;

    // 1. Commands first, so orders take effect the same tick they arrive.
    if (this.pending.length > 0) {
      const sorted = this.pending;
      this.pending = [];
      for (const c of sorted) {
        c.issued = w.tick;
        if (this.apply(c)) this.commandLog.push(c);
      }
    }

    // 2. Systems, in a fixed order.
    productionSystem(w);
    movementSystem(w);
    gatherSystem(w);
    buildSystem(w);
    repairSystem(w);
    combatSystem(w);
    religionSystem(w);
    tradeSystem(w);
    advanceAgeOnLandmark(w);

    // 3. Bookkeeping.
    w.tick++;
    if (w.tick % FOG_UPDATE_INTERVAL === 0) {
      for (let i = 0; i < this.fogs.length; i++) {
        const player = w.players[i];
        if (!player || player.defeated) continue;
        updateFog(w, this.fogs[i] as PlayerFog, i);
      }
    }
    w.rebuildSpatialIndex();

    // 4. Victory.
    const result = victorySystem(w, this.config.victory);
    if (result.over) {
      this.over = true;
      this.results.over = true;
      this.results.winner = result.winner;
      this.results.reason = result.reason;
    }
  }

  /** Run until the match is over or the tick budget is exhausted. */
  runToCompletion(maxTicks = this.config.maxTicks): MatchResult {
    while (!this.over && this.world.tick < maxTicks) this.step();
    return this.results;
  }

  get isOver(): boolean {
    return this.over;
  }

  /* ---------------------------------------------------------------- *
   * Introspection
   * ---------------------------------------------------------------- */

  hash(): number {
    return this.world.hashState();
  }

  snapshot(): StateSnapshot {
    const w = this.world;
    const entities: EntitySnapshot[] = [];
    for (let i = 0; i < w.entities.length; i++) {
      const e = w.entities[i];
      if (!e || !e.alive) continue;
      entities.push({
        id: e.id,
        kind: e.kind,
        def: e.def,
        owner: e.owner,
        x: e.x,
        y: e.y,
        facing: e.facing,
        hp: e.hp,
        maxHp: e.maxHp,
        construction: e.construction,
        amount: e.amount,
        carrying: e.gather.carried,
        carryingType: e.gather.resource,
        orders: e.orders.map((o) => o.kind),
        path: e.path,
        goalX: e.goalX,
        goalY: e.goalY,
        hasGoal: e.hasGoal,
        relicHeld: e.relicHeld,
        inside: e.inside,
        builders: e.builders,
      });
    }

    const productionQueues: StateSnapshot['productionQueues'] = [];
    const globalQueue: StateSnapshot['globalQueue'] = [];
    for (const e of entities) {
      if (e.kind !== EntityKind.Building) continue;
      const entity = w.get(e.id);
      if (!entity || entity.production.entries.length === 0) continue;
      productionQueues.push({
        building: e.id,
        owner: e.owner,
        items: entity.production.entries.map((en) => ({
          defId: en.defId,
          remaining: en.remaining,
          total: en.total,
        })),
      });
      for (const en of entity.production.entries) {
        globalQueue.push({
          owner: e.owner,
          building: e.id,
          defId: en.defId,
          remaining: en.remaining,
          total: en.total,
        });
      }
    }

    return {
      tick: w.tick,
      over: this.over,
      winner: this.results.winner,
      reason: this.results.reason,
      victory: this.config.victory,
      players: w.players.map((p) => ({
        id: p.id,
        name: p.name,
        civ: p.civ,
        team: p.team,
        bot: p.bot,
        age: p.age,
        ageName: ['Dark Age', 'Feudal Age', 'Castle Age', 'Imperial Age'][p.age] ?? 'Dark Age',
        resources: { ...p.resources },
        pop: p.pop,
        popCap: p.popCap,
        defeated: p.defeated,
        techs: Array.from(p.techs).sort(),
        landmarks: p.landmarks.length,
        sacredSites: countSites(w, p.id),
        sacredHoldTicks: p.sacredHoldTicks,
        wonderTicks: p.wonderAt > 0 ? w.tick - p.wonderAt : 0,
        stats: p.stats as unknown as Record<string, unknown>,
        villagerCounts: villagerCounts(w, p.id),
      })),
      entities,
      productionQueues,
      globalQueue,
      objectives: objectives(w).map((o) => ({
        playerId: o.playerId,
        landmarksLeft: o.landmarksLeft,
        sacredSitesHeld: o.sacredSitesHeld,
        sacredHoldTicks: o.sacredHoldTicks,
        sacredTicksNeeded: o.sacredTicksNeeded,
        wonderTicks: o.wonderTicks,
        wonderTicksNeeded: o.wonderTicksNeeded,
      })),
    };
  }
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function clampTile(v: number, size: number): number {
  return v < 0 ? 0 : v >= size ? size - 1 : v;
}

/** How many units are currently sheltered inside a building. */
export function garrisonCount(w: World, buildingId: number): number {
  let n = 0;
  for (let i = 0; i < w.entities.length; i++) {
    const e = w.entities[i];
    if (!e || !e.alive) continue;
    if (e.inside === buildingId) n++;
  }
  return n;
}

function countSites(w: World, owner: number): number {
  let n = 0;
  for (let i = 0; i < w.entities.length; i++) {
    const e = w.entities[i];
    if (!e || !e.alive || e.kind !== EntityKind.SacredSite) continue;
    if (e.owner === owner) n++;
  }
  return n;
}

/** Villagers assigned to each resource, plus idle — the HUD resource readout. */
export function villagerCounts(
  w: World,
  owner: number,
): { food: number; wood: number; gold: number; stone: number; idle: number } {
  const out = { food: 0, wood: 0, gold: 0, stone: 0, idle: 0 };
  for (let i = 0; i < w.entities.length; i++) {
    const e = w.entities[i];
    if (!e || !e.alive || e.kind !== EntityKind.Unit || e.owner !== owner) continue;
    const def = UNITS[e.def];
    if (!def || def.role !== UnitRole.Worker) continue;
    const order = e.orders[0];
    if (!order || order.kind === OrderKind.Idle) {
      out.idle++;
      continue;
    }
    if (order.kind === OrderKind.Gather || order.kind === OrderKind.ReturnCargo) {
      const res = e.gather.resource;
      if (res === 0) out.food++;
      else if (res === 1) out.wood++;
      else if (res === 2) out.gold++;
      else out.stone++;
    } else if (order.kind === OrderKind.Build) {
      // Builders count as wood workers: they are spending wood-like effort.
      out.wood++;
    } else {
      out.idle++;
    }
  }
  return out;
}

function nearestNodeFor(world: World, unit: Entity, resource: string): Entity | null {
  let best: Entity | null = null;
  let bestD = Number.MAX_SAFE_INTEGER;
  for (let i = 0; i < world.entities.length; i++) {
    const n = world.entities[i];
    if (!n || !n.alive || n.kind !== EntityKind.ResourceNode) continue;
    const kind = n.def;
    const res = kind === 'tree' ? 'wood' : kind === 'gold' ? 'gold' : kind === 'stone' ? 'stone' : 'food';
    if (res !== resource) continue;
    const dx = n.x - unit.x;
    const dy = n.y - unit.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return best;
}

function advanceAgeOnLandmark(w: World): void {
  for (let i = 0; i < w.entities.length; i++) {
    const b = w.entities[i];
    if (!b || !b.alive || b.kind !== EntityKind.Building) continue;
    const def = BUILDINGS[b.def];
    if (!def?.isLandmark) continue;
    if (b.construction < 1000) continue;
    const player = w.players[b.owner];
    if (!player) continue;
    const target = landmarkTargetAge(b.def);
    if (target !== null && player.age < target) {
      tryAdvanceAge(w, b.id);
    }
  }
}

export { Age, CommandType, canAfford, pay, effectiveUnit, POP_CAP_MAX };
export type { Cmd as Command, CivId };
