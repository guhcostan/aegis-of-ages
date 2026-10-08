/**
 * Religion: monks, healing, conversion, relics and sacred sites.
 */
import { FP_ONE, SACRED_SITE_VICTORY_COUNT, TICK_RATE } from '../constants';
import { fpDist } from '../fixed';
import { EntityKind, OrderKind, UnitRole, type Entity } from '../types';
import { UNITS } from '../data/units';
import { BUILDINGS } from '../data/buildings';
import { CONVERT_SECONDS, HEAL_PER_SECOND, RELIC_GOLD_PER_MIN, SACRED_SITE_GOLD_PER_MIN } from '../data/economy';
import type { World } from '../world';
import { healMultiplier } from '../stats';
import { setDestination } from './movement';

/** Radius within which a monk can reach its target, in fixed point. */
const REACH = Math.trunc(FP_ONE * 3.5);
/** Radius in which units contest a sacred site, in fixed point. */
const SITE_RADIUS = Math.trunc(FP_ONE * 4);

const scratch: Entity[] = [];

export function religionSystem(world: World): void {
  monkSystem(world);
  relicSystem(world);
  sacredSiteSystem(world);
}

/* ------------------------------------------------------------------ *
 * Monks
 * ------------------------------------------------------------------ */

function monkSystem(world: World): void {
  for (let i = 0; i < world.entities.length; i++) {
    const m = world.entities[i];
    if (!m || !m.alive || m.kind !== EntityKind.Unit) continue;
    const def = UNITS[m.def];
    if (!def || def.role !== UnitRole.Monk) continue;
    const order = m.orders[0];
    if (!order) continue;

    if (order.kind === OrderKind.PickupRelic) {
      const relic = world.get(order.target);
      if (!relic || relic.kind !== EntityKind.Relic) {
        // Someone else took it, or it is gone: look for another one.
        const next = findNearestRelic(world, m);
        if (next) {
          order.target = next.id;
          order.x = next.x;
          order.y = next.y;
          setDestination(world, m, next.x, next.y, true);
        } else {
          m.orders.length = 0;
        }
        continue;
      }
      if (fpDist(m.x, m.y, relic.x, relic.y) > REACH) {
        if (!m.hasGoal) setDestination(world, m, relic.x, relic.y, true);
        continue;
      }
      m.hasGoal = false;
      if (m.relicHeld > 0) {
        m.orders.length = 0;
        continue;
      }
      pickupRelic(world, m.id, relic.id);
      m.orders.length = 0;
      continue;
    }

    if (order.kind === OrderKind.Heal) {
      const target = world.get(order.target);
      if (!target || target.hp >= target.maxHp) {
        const next = findWounded(world, m);
        if (next) {
          order.target = next.id;
          setDestination(world, m, next.x, next.y, true);
        } else {
          m.orders.length = 0;
        }
        continue;
      }
      if (!inRange(m, target)) {
        if (!m.hasGoal) setDestination(world, m, target.x, target.y, true);
        continue;
      }
      m.hasGoal = false;
      // Healing is a fractional rate (7 HP/s at 20 ticks/s), so accumulate in
      // thousandths instead of truncating to zero every tick.
      const mult = healMultiplier(world, m.owner);
      m.healAccum += Math.trunc((HEAL_PER_SECOND * 1000 * mult) / (100 * TICK_RATE));
      const healed = Math.trunc(m.healAccum / 1000);
      if (healed > 0) {
        m.healAccum -= healed * 1000;
        target.hp = Math.min(target.maxHp, target.hp + healed);
      }
    } else if (order.kind === OrderKind.Convert) {
      const target = world.get(order.target);
      if (!target || target.owner === m.owner) {
        // Retarget to the nearest enemy military unit.
        const next = findConvertTarget(world, m);
        if (next) {
          order.target = next.id;
          order.aux = 0;
          setDestination(world, m, next.x, next.y, true);
        } else {
          m.orders.length = 0;
        }
        continue;
      }
      if (!inRange(m, target)) {
        if (!m.hasGoal) setDestination(world, m, target.x, target.y, true);
        continue;
      }
      m.hasGoal = false;
      order.aux++;
      const needed = CONVERT_SECONDS * TICK_RATE;
      if (order.aux >= needed) {
        convertUnit(world, target, m.owner);
        m.orders.length = 0;
        m.cooldown = TICK_RATE * 2;
      }
    }
  }
}

function inRange(a: Entity, b: Entity): boolean {
  return fpDist(a.x, a.y, b.x, b.y) <= REACH;
}

/** Nearest relic on the map, for monks that have no assigned one. */
function findNearestRelic(world: World, m: Entity): Entity | null {
  let best: Entity | null = null;
  let bestD = Number.MAX_SAFE_INTEGER;
  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (!e || !e.alive || e.kind !== EntityKind.Relic) continue;
    const d = fpDist(m.x, m.y, e.x, e.y);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

function findWounded(world: World, m: Entity): Entity | null {
  let best: Entity | null = null;
  let bestD = Number.MAX_SAFE_INTEGER;
  const found = world.queryRadius(m.x, m.y, REACH, scratch);
  for (const t of found) {
    if (t.owner !== m.owner) continue;
    if (t.hp >= t.maxHp) continue;
    if (t.kind === EntityKind.Projectile) continue;
    const d = fpDist(m.x, m.y, t.x, t.y);
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  }
  return best;
}

function findConvertTarget(world: World, m: Entity): Entity | null {
  const found = world.queryRadius(m.x, m.y, REACH * 2, scratch);
  for (const t of found) {
    if (t.owner === m.owner || t.owner < 0) continue;
    if (t.kind !== EntityKind.Unit) continue;
    const def = UNITS[t.def];
    if (!def || def.role === UnitRole.Monk) continue;
    return t;
  }
  return null;
}

/** Hand a unit over to a new owner, preserving its orders queue. */
function convertUnit(world: World, target: Entity, newOwner: number): void {
  const oldOwner = target.owner;
  if (oldOwner === newOwner) return;
  target.owner = newOwner;
  target.orders.length = 0;
  const oldPlayer = world.players[oldOwner];
  if (oldPlayer) oldPlayer.stats.unitsLost++;
  const newPlayer = world.players[newOwner];
  if (newPlayer) newPlayer.stats.unitsTrained++;
}

/* ------------------------------------------------------------------ *
 * Relics
 * ------------------------------------------------------------------ */

function relicSystem(world: World): void {
  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (!e || !e.alive) continue;

    // Relics sitting inside a monastery generate gold for its owner.
    if (e.kind === EntityKind.Building) {
      const def = BUILDINGS[e.def];
      if (!def || def.id !== 'monastery') continue;
      if (e.relicHeld > 0) {
        const player = world.players[e.owner];
        if (player) {
          // Accumulate gold in thousandths to keep integer math exact.
          e.amount += Math.trunc((RELIC_GOLD_PER_MIN * 1000) / (60 * TICK_RATE));
          const gold = Math.trunc(e.amount / 1000);
          if (gold > 0) {
            e.amount -= gold * 1000;
            player.resources.gold += gold;
            player.stats.resourcesGathered.gold += gold;
          }
        }
      }
      continue;
    }

    if (e.kind !== EntityKind.Unit) continue;
    const def = UNITS[e.def];

    // A monk carrying a relic should deliver it to a monastery when idle.
    if (def && def.role === UnitRole.Monk && e.relicHeld > 0) {
      const order = e.orders[0];
      if (order && order.kind === OrderKind.DropRelic) {
        const monastery = world.get(order.target);
        if (!monastery) {
          e.orders.length = 0;
          continue;
        }
        if (fpDist(e.x, e.y, monastery.x, monastery.y) > REACH) {
          if (!e.hasGoal) setDestination(world, e, monastery.x, monastery.y, true);
          continue;
        }
        e.hasGoal = false;
        monastery.relicHeld++;
        e.relicHeld = 0;
        const player = world.players[e.owner];
        if (player) player.stats.relicsHeld = countRelics(world, e.owner);
        e.orders.length = 0;
      }
    }
  }
}

export function countRelics(world: World, owner: number): number {
  let count = 0;
  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (!e || !e.alive) continue;
    if (e.kind === EntityKind.Building && e.owner === owner && e.relicHeld > 0) {
      count += e.relicHeld;
    }
  }
  return count;
}

/** A monk picks up a nearby relic. */
export function pickupRelic(world: World, monkId: number, relicId: number): boolean {
  const monk = world.get(monkId);
  const relic = world.get(relicId);
  if (!monk || !relic) return false;
  if (relic.kind !== EntityKind.Relic) return false;
  if (monk.relicHeld > 0) return false;
  const def = UNITS[monk.def];
  if (!def || def.role !== UnitRole.Monk) return false;
  if (fpDist(monk.x, monk.y, relic.x, relic.y) > REACH) return false;
  monk.relicHeld = relic.id + 1; // store id+1 so 0 means "none"
  world.destroyEntity(relic.id);
  return true;
}

/** Order a relic-carrying monk to deposit into a monastery. */
export function orderDropRelic(world: World, monkId: number, monasteryId: number): boolean {
  const monk = world.get(monkId);
  if (!monk || monk.relicHeld === 0) return false;
  monk.orders.length = 0;
  monk.orders.push({
    kind: OrderKind.DropRelic,
    target: monasteryId,
    x: 0,
    y: 0,
    defId: 0,
    issued: world.tick,
    aux: 0,
  });
  return true;
}

/* ------------------------------------------------------------------ *
 * Sacred sites
 * ------------------------------------------------------------------ */

function sacredSiteSystem(world: World): void {
  for (let i = 0; i < world.entities.length; i++) {
    const site = world.entities[i];
    if (!site || !site.alive || site.kind !== EntityKind.SacredSite) continue;

    // Count military presence per player around the site.
    const found = world.queryRadius(site.x, site.y, SITE_RADIUS, scratch);
    let bestOwner = -1;
    let bestCount = 0;
    const counts = new Map<number, number>();
    for (const u of found) {
      if (u.kind !== EntityKind.Unit) continue;
      if (u.owner < 0) continue;
      const def = UNITS[u.def];
      if (!def || def.role === UnitRole.Worker) continue;
      counts.set(u.owner, (counts.get(u.owner) ?? 0) + 1);
    }
    // Deterministic winner: highest count, then lowest player id.
    const owners = Array.from(counts.keys()).sort((a, b) => a - b);
    for (const owner of owners) {
      const c = counts.get(owner) ?? 0;
      if (c > bestCount) {
        bestCount = c;
        bestOwner = owner;
      }
    }

    if (bestOwner >= 0) {
      site.owner = bestOwner;
      site.amount++; // ticks held by the current owner
    } else {
      site.amount = 0;
    }
  }

  // Tally each player's held sites and track the victory countdown.
  for (const player of world.players) {
    let held = 0;
    for (let i = 0; i < world.entities.length; i++) {
      const site = world.entities[i];
      if (!site || !site.alive || site.kind !== EntityKind.SacredSite) continue;
      if (site.owner === player.id) held++;
    }
    if (held >= SACRED_SITE_VICTORY_COUNT) player.sacredHoldTicks++;
    else player.sacredHoldTicks = 0;
  }
}

export function heldSacredSites(world: World, owner: number): number {
  let held = 0;
  for (let i = 0; i < world.entities.length; i++) {
    const site = world.entities[i];
    if (!site || !site.alive || site.kind !== EntityKind.SacredSite) continue;
    if (site.owner === owner) held++;
  }
  return held;
}

export { SACRED_SITE_GOLD_PER_MIN };
