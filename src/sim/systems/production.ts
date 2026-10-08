/**
 * Production system: unit training queues, technology research, population
 * gating and landmark-driven age advancement.
 */
import { Age, TICK_RATE } from '../constants';
import { Age as AgeEnum } from '../constants';
import { EntityKind, OrderKind, UnitRole, type Entity } from '../types';
import { UNITS } from '../data/units';
import { BUILDINGS } from '../data/buildings';
import { TECHS } from '../data/techs';
import { techCostFor } from '../data/civs';
import { effectiveBuilding, effectiveUnit, bumpModVersion } from '../stats';
import type { World } from '../world';
import { canAfford, pay, refund } from './build';
import { setDestination } from './movement';

/** Queue a unit for training. Returns false when refused. */
export function queueUnit(world: World, buildingId: number, defId: string, count = 1): boolean {
  const building = world.get(buildingId);
  if (!building || building.kind !== EntityKind.Building || building.construction < 1000) return false;
  const bdef = BUILDINGS[building.def];
  const udef = UNITS[defId];
  const player = world.players[building.owner];
  if (!bdef || !udef || !player) return false;
  if (!bdef.trains.includes(defId)) return false;
  if (udef.civ !== 'any' && udef.civ !== player.civ) return false;
  if (player.age < udef.age) return false;

  let queued = 0;
  // Population already committed to every queue this player owns, so two
  // barracks cannot together overshoot the cap.
  let reserved = reservedPopulation(world, building.owner);
  for (let i = 0; i < count; i++) {
    const eff = effectiveUnit(world, building.owner, udef);
    if (!canAfford(player.resources, eff.cost)) break;
    if (player.pop + reserved + udef.pop > player.popCap) break;
    pay(player.resources, eff.cost);
    building.production.entries.push({
      defId,
      remaining: eff.trainTime,
      total: eff.trainTime,
      rally: 0,
    });
    reserved += udef.pop;
    queued++;
  }
  return queued > 0;
}

/** Queue a technology. One research per building at a time. */
export function queueResearch(world: World, buildingId: number, techId: string): boolean {
  const building = world.get(buildingId);
  if (!building || building.kind !== EntityKind.Building || building.construction < 1000) return false;
  const bdef = BUILDINGS[building.def];
  const tech = TECHS[techId];
  const player = world.players[building.owner];
  if (!bdef || !tech || !player) return false;
  if (!bdef.researches.includes(techId)) return false;
  if (player.techs.has(techId)) return false;
  if (player.researching.has(techId)) return false;
  if (player.age < tech.age) return false;
  if (tech.civ !== 'any' && tech.civ !== player.civ) return false;
  for (const req of tech.requires) {
    if (!player.techs.has(req)) return false;
  }
  const cost = techCostFor(player.civ, tech.cost, techId);
  if (!canAfford(player.resources, cost)) return false;

  pay(player.resources, cost);
  player.researching.set(techId, {
    remaining: tech.researchTime,
    total: tech.researchTime,
    building: buildingId,
  });
  return true;
}

/** Population already committed to a player's training queues. */
export function reservedPopulation(world: World, playerId: number): number {
  let reserved = 0;
  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (!e || !e.alive || e.kind !== EntityKind.Building || e.owner !== playerId) continue;
    for (const entry of e.production.entries) {
      const d = UNITS[entry.defId];
      if (d) reserved += d.pop;
    }
  }
  return reserved;
}

export function productionSystem(world: World): void {
  for (let i = 0; i < world.entities.length; i++) {
    const b = world.entities[i];
    if (!b || !b.alive || b.kind !== EntityKind.Building) continue;
    if (b.construction < 1000) continue;
    if (b.production.entries.length === 0) continue;

    const entry = b.production.entries[0];
    if (!entry) continue;
    entry.remaining--;

    if (entry.remaining <= 0) {
      const player = world.players[b.owner];
      const udef = UNITS[entry.defId];
      if (!player || !udef) {
        b.production.entries.shift();
        continue;
      }
      if (player.pop + udef.pop > player.popCap) {
        // Blocked by the population cap: wait, do not lose the unit.
        // The player must build another House to make room.
        entry.remaining = 1;
        continue;
      }
      b.production.entries.shift();
      spawnFromBuilding(world, b, entry.defId);
    }
  }

  // --- Technologies ---
  for (const player of world.players) {
    if (player.researching.size === 0) continue;
    // Deterministic order: sort by tech id.
    const ids = Array.from(player.researching.keys()).sort();
    for (const id of ids) {
      const state = player.researching.get(id);
      if (!state) continue;
      const building = world.get(state.building);
      if (!building || building.construction < 1000) {
        // Building destroyed: refund and cancel.
        const tech = TECHS[id];
        if (tech) refund(player.resources, techCostFor(player.civ, tech.cost, id));
        player.researching.delete(id);
        continue;
      }
      state.remaining--;
      if (state.remaining <= 0) {
        player.researching.delete(id);
        player.techs.add(id);
        bumpModVersion(player);
        applyImmediateTechEffects(world, player.id, id);
      }
    }
  }

  // --- Population refresh ---
  for (const player of world.players) {
    world.recomputePopulation(player);
  }
}

/**
 * Some technologies change state beyond stat modifiers (population, healing).
 * Kept explicit so the effect is auditable against the SPEC.
 */
function applyImmediateTechEffects(world: World, playerId: number, techId: string): void {
  const player = world.players[playerId];
  if (!player) return;
  if (techId === 'architecture' || techId === 'masonry') {
    // Retroactively top up buildings that are already finished.
    for (let i = 0; i < world.entities.length; i++) {
      const b = world.entities[i];
      if (!b || !b.alive || b.kind !== EntityKind.Building) continue;
      if (b.owner !== playerId || b.construction < 1000) continue;
      const def = BUILDINGS[b.def];
      if (!def) continue;
      const target = effectiveBuilding(world, playerId, def).hp;
      if (target > b.maxHp) {
        b.hp += target - b.maxHp;
        b.maxHp = target;
      }
    }
  }
}

/** Spawn a trained unit at the building exit and send it to the rally point. */
function spawnFromBuilding(world: World, b: Entity, defId: string): void {
  const spawn = findSpawnTile(world, b);
  const x = spawn.x * 1024 + 512;
  const y = spawn.y * 1024 + 512;
  const unit = world.spawnUnit({ owner: b.owner, defId, x, y, facing: 0 });
  const player = world.players[b.owner];
  if (player) player.stats.unitsTrained++;

  // Rally point: explicit position, a rally target, or the front of the base.
  const q = b.production;
  if (q.rallyTarget !== 0) {
    const target = world.get(q.rallyTarget);
    if (target) {
      unit.orders.push({
        kind: OrderKind.Attack,
        target: target.id,
        x: target.x,
        y: target.y,
        defId: 0,
        issued: world.tick,
        aux: 0,
      });
      setDestination(world, unit, target.x, target.y, true);
      return;
    }
  }
  if (q.rallyX >= 0 && q.rallyY >= 0) {
    unit.orders.push({
      kind: OrderKind.Move,
      target: 0,
      x: q.rallyX,
      y: q.rallyY,
      defId: 0,
      issued: world.tick,
      aux: 0,
    });
    setDestination(world, unit, q.rallyX, q.rallyY, true);
  } else {
    // Default: gather the nearest resource if a villager, else guard.
    const udef = UNITS[defId];
    if (udef && udef.role === UnitRole.Worker) {
      const order = {
        kind: OrderKind.Gather,
        target: 0,
        x: 0,
        y: 0,
        defId: 0,
        issued: world.tick,
        aux: 0,
      };
      unit.orders.push(order);
    }
  }
}

/** Find a free tile adjacent to a building, for units leaving it. */
function findSpawnTile(world: World, b: Entity): { x: number; y: number } {
  const def = BUILDINGS[b.def];
  const w = def?.width ?? 1;
  const h = def?.height ?? 1;
  const tx = b.x >> 10;
  const ty = b.y >> 10;
  const left = tx - (w >> 1);
  const top = ty - (h >> 1);
  const candidates: Array<[number, number]> = [];
  for (let x = left - 1; x <= left + w; x++) {
    candidates.push([x, top - 1], [x, top + h]);
  }
  for (let y = top - 1; y <= top + h; y++) {
    candidates.push([left - 1, y], [left + w, y]);
  }
  for (const [x, y] of candidates) {
    if (x < 0 || y < 0 || x >= world.map.width || y >= world.map.height) continue;
    if (world.map.passable[y * world.map.width + x] === 1) return { x, y };
  }
  return { x: tx, y: ty };
}

/* ------------------------------------------------------------------ *
 * Ages and landmarks
 * ------------------------------------------------------------------ */

/**
 * Called by the build system when a landmark finishes: advances the owner's age
 * to the landmark's target age.
 */
export function tryAdvanceAge(world: World, buildingId: number): boolean {
  const b = world.get(buildingId);
  if (!b || b.kind !== EntityKind.Building) return false;
  const def = BUILDINGS[b.def];
  const player = world.players[b.owner];
  if (!def || !player) return false;
  if (!def.isLandmark || def.landmarkAge === null) return false;
  if (b.construction < 1000) return false;
  if (player.age >= def.landmarkAge) return false;
  player.age = def.landmarkAge as AgeEnum;
  bumpModVersion(player);
  return true;
}

/** Age a landmark advances to, for HUD display. */
export function landmarkTargetAge(defId: string): AgeEnum | null {
  return BUILDINGS[defId]?.landmarkAge ?? null;
}

export { Age, TICK_RATE };
