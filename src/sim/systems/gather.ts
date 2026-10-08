/**
 * Gathering system: extraction, carrying and delivery.
 *
 * A worker cycles: walk to node -> extract until full -> walk to the nearest
 * drop-off -> deposit -> return to the node. All accumulation is integer
 * (progress is in thousandths of a resource unit).
 */
import { FP_ONE, TICK_RATE } from '../constants';
import { fpDist } from '../fixed';
import { EntityKind, OrderKind, ResourceNodeKind, UnitRole, type Entity, type ResourceKey } from '../types';
import { UNITS } from '../data/units';
import { BUILDINGS } from '../data/buildings';
import { GATHER_RATES, NODE_RESOURCE, REPAIR_HP_PER_SECOND } from '../data/economy';
import { gatherMultiplier } from '../stats';
import type { World } from '../world';
import { setDestination } from './movement';

/**
 * Reach distance in fixed point.
 *
 * A worker standing on a tile adjacent to a resource is 1.0 tiles (orthogonal)
 * to 1.45 tiles (diagonal) from the node centre, so the reach must clear the
 * diagonal case or gathering never starts.
 */
const REACH = Math.trunc(FP_ONE * 1.9);
const UNIT_REACH = Math.trunc(FP_ONE * 0.9);

/** Reach for a building, accounting for its footprint radius. */
function buildingReach(defId: string): number {
  const def = BUILDINGS[defId];
  if (!def) return REACH;
  return REACH + Math.trunc((Math.max(def.width, def.height) * FP_ONE) / 2);
}

const RESOURCE_INDEX: ResourceKey[] = ['food', 'wood', 'gold', 'stone'];

const scratch: Entity[] = [];

export function gatherSystem(world: World): void {
  const rateCache = new Map<string, number>();

  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (!e || !e.alive || e.kind !== EntityKind.Unit) continue;
    if (e.inside !== 0) continue;
    const def = UNITS[e.def];
    if (!def || def.role !== UnitRole.Worker) continue;

    const order = e.orders[0];
    if (!order) continue;

    if (order.kind === OrderKind.Gather) {
      runGather(world, e, order.target, rateCache);
    } else if (order.kind === OrderKind.ReturnCargo) {
      runReturn(world, e);
    }
  }
}

/** Attach a gather order to a worker and start walking. */
export function issueGather(world: World, e: Entity, nodeId: number, queueOrder: boolean): void {
  const node = world.get(nodeId);
  if (!node) return;
  const order = {
    kind: OrderKind.Gather,
    target: nodeId,
    x: node.x,
    y: node.y,
    defId: 0,
    issued: world.tick,
    aux: 0,
  };
  if (!queueOrder) e.orders.length = 0;
  e.orders.push(order);
  e.gather.node = nodeId;
  const spec = NODE_RESOURCE[node.def];
  e.gather.resource = spec ? RESOURCE_INDEX.indexOf(spec) : 0;
  setDestination(world, e, node.x, node.y, true);
}

function runGather(world: World, e: Entity, nodeId: number, rateCache: Map<string, number>): void {
  const node = world.get(nodeId);

  // Node depleted or gone: look for the nearest node of the same resource.
  if (!node) {
    const wanted = RESOURCE_INDEX[e.gather.resource] ?? 'food';
    const next = findNearestNode(world, e, wanted);
    if (next) {
      issueGather(world, e, next.id, false);
      return;
    }
    e.orders.length = 0;
    e.gather.node = 0;
    return;
  }

  // A farm is a building with a food pool.
  const nodeKind = node.kind === EntityKind.Building ? 'farm' : node.def;
  const dist = fpDist(e.x, e.y, node.x, node.y);
  if (dist > REACH) {
    // Walk to the node if the destination drifted (node is static, so this is
    // only recomputed when the worker was pushed away).
    if (!e.hasGoal) setDestination(world, e, node.x, node.y, true);
    return;
  }

  // In range: extract.
  if (e.hasGoal) {
    e.hasGoal = false;
    e.path = [];
    e.pathIndex = 0;
  }

  const rate = rateFor(world, e, nodeKind, rateCache);
  const carryCap = carryCapacity(world, e);
  const spec = NODE_RESOURCE[nodeKind] ?? 'food';
  e.gather.resource = RESOURCE_INDEX.indexOf(spec);

  const space = carryCap - e.gather.carried;
  if (space <= 0) {
    sendToDropOff(world, e);
    return;
  }

  // Farms are an unlimited food pool in AoE IV: they are never depleted, only
  // destroyed. Everything else is consumed as it is gathered.
  const infinite = isInfiniteSource(node);

  if (!infinite && node.amount <= 0) {
    world.destroyEntity(node.id);
    e.gather.node = 0;
    const next = findNearestNode(world, e, spec);
    if (next) issueGather(world, e, next.id, false);
    else e.orders.length = 0;
    return;
  }

  e.gather.progress += rate;
  const extracted = Math.trunc(e.gather.progress / 1000);
  if (extracted > 0) {
    e.gather.progress -= extracted * 1000;
    const take = infinite ? Math.min(extracted, space) : Math.min(extracted, space, node.amount);
    e.gather.carried += take;
    if (!infinite) node.amount -= take;
    e.carried = e.gather.carried;
  }

  if (e.gather.carried >= carryCap) sendToDropOff(world, e);
}

/** Farms never run out of food; every other node is a finite pool. */
export function isInfiniteSource(node: Entity): boolean {
  return node.kind === EntityKind.Building && node.def === 'farm';
}

function rateFor(world: World, e: Entity, nodeKind: string, cache: Map<string, number>): number {
  const spec = NODE_RESOURCE[nodeKind] ?? 'food';
  const key = `${e.owner}:${spec}`;
  let mult = cache.get(key);
  if (mult === undefined) {
    mult = gatherMultiplier(world, e.owner, spec as 'food' | 'wood' | 'gold' | 'stone');
    cache.set(key, mult);
  }
  const base = GATHER_RATES[nodeKind]?.perSecond ?? 700;
  // perSecond is per second x1000; convert to per tick x1000.
  return Math.trunc((base * mult) / (100 * TICK_RATE));
}

function carryCapacity(world: World, e: Entity): number {
  const def = UNITS[e.def];
  const base = GATHER_RATES.tree?.carry ?? 10;
  if (!def) return base;
  // Technologies add capacity; keep it simple and integer.
  const wb = world.players[e.owner]?.techs.has('wheelbarrow') ? 5 : 0;
  return base + wb;
}

/** Walk to the closest drop-off that accepts the carried resource. */
function sendToDropOff(world: World, e: Entity): void {
  const target = findDropOff(world, e);
  if (!target) {
    // No drop-off: bank the resources immediately so the worker keeps working.
    deposit(world, e);
    return;
  }
  const order = {
    kind: OrderKind.ReturnCargo,
    target: target.id,
    x: target.x,
    y: target.y,
    defId: 0,
    issued: world.tick,
    aux: 0,
  };
  e.orders.length = 0;
  e.orders.push(order);
  e.gather.dropOff = target.id;
  setDestination(world, e, target.x, target.y, true);
}

function runReturn(world: World, e: Entity): void {
  const order = e.orders[0];
  if (!order) return;
  const target = world.get(order.target);
  if (!target || target.kind !== EntityKind.Building || target.construction < 1000) {
    const alt = findDropOff(world, e);
    if (!alt) {
      deposit(world, e);
      return;
    }
    order.target = alt.id;
    setDestination(world, e, alt.x, alt.y, true);
    return;
  }
  const dist = fpDist(e.x, e.y, target.x, target.y);
  if (dist > buildingReach(target.def)) {
    if (!e.hasGoal) setDestination(world, e, target.x, target.y, true);
    return;
  }
  e.hasGoal = false;
  deposit(world, e);
  // Return to the node we came from, or the nearest of the same resource.
  const node = world.get(e.gather.node);
  if (node) {
    issueGather(world, e, node.id, false);
  } else {
    const wanted = RESOURCE_INDEX[e.gather.resource] ?? 'food';
    const next = findNearestNode(world, e, wanted);
    if (next) issueGather(world, e, next.id, false);
    else {
      e.orders.length = 0;
      e.gather.dropOff = 0;
    }
  }
}

function deposit(world: World, e: Entity): void {
  const amount = e.gather.carried;
  if (amount <= 0) return;
  const player = world.players[e.owner];
  if (player) {
    const res = RESOURCE_INDEX[e.gather.resource] ?? 'food';
    player.resources[res] += amount;
    player.stats.resourcesGathered[res] += amount;
  }
  e.gather.carried = 0;
  e.carried = 0;
  e.gather.dropOff = 0;
}

/** Nearest building of ours that accepts this resource and is finished. */
export function findDropOff(world: World, e: Entity): Entity | null {
  const res = RESOURCE_INDEX[e.gather.resource] ?? 'food';
  let best: Entity | null = null;
  let bestD = Number.MAX_SAFE_INTEGER;
  for (let i = 0; i < world.entities.length; i++) {
    const b = world.entities[i];
    if (!b || !b.alive || b.kind !== EntityKind.Building) continue;
    if (b.owner !== e.owner) continue;
    if (b.construction < 1000) continue;
    const def = BUILDINGS[b.def];
    if (!def) continue;
    if (!def.dropOff.includes(res)) continue;
    const d = fpDist(e.x, e.y, b.x, b.y);
    if (d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return best;
}

/** Nearest resource node of a given resource key, weighted by distance. */
export function findNearestNode(world: World, e: Entity, resource: ResourceKey): Entity | null {
  let best: Entity | null = null;
  let bestD = Number.MAX_SAFE_INTEGER;
  for (let i = 0; i < world.entities.length; i++) {
    const n = world.entities[i];
    if (!n || !n.alive) continue;
    if (n.kind !== EntityKind.ResourceNode && !(n.kind === EntityKind.Building && n.def === 'farm')) {
      continue;
    }
    if (!isInfiniteSource(n) && n.amount <= 0) continue;
    const kind = n.kind === EntityKind.Building ? 'farm' : n.def;
    if (NODE_RESOURCE[kind] !== resource) continue;
    const d = fpDist(e.x, e.y, n.x, n.y);
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return best;
}

/** Repair a damaged building or siege unit. */
export function repairSystem(world: World): void {
  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (!e || !e.alive || e.kind !== EntityKind.Unit) continue;
    const order = e.orders[0];
    if (!order || order.kind !== OrderKind.Repair) continue;
    const target = world.get(order.target);
    if (!target) {
      e.orders.length = 0;
      continue;
    }
    const dist = fpDist(e.x, e.y, target.x, target.y);
    const reach = target.kind === EntityKind.Building ? buildingReach(target.def) : UNIT_REACH;
    if (dist > reach) {
      if (!e.hasGoal) setDestination(world, e, target.x, target.y, true);
      continue;
    }
    e.hasGoal = false;
    if (target.hp >= target.maxHp) {
      e.orders.length = 0;
      continue;
    }
    target.hp = Math.min(target.maxHp, target.hp + Math.trunc(REPAIR_HP_PER_SECOND / TICK_RATE));
  }
}

export { scratch as gatherScratch, ResourceNodeKind };
