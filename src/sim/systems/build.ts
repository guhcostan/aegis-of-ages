/**
 * Construction system: villagers raise buildings, replace farms, and can be
 * redirected mid-build. Progress is integer (0..1000 per building) and scales
 * with the number of villagers actually on site.
 */
import { FP_ONE, TICK_RATE } from '../constants';
import { fpDist } from '../fixed';
import { BuildingKind, EntityKind, OrderKind, UnitRole, type Entity } from '../types';
import { UNITS } from '../data/units';
import { BUILDINGS } from '../data/buildings';
import type { World } from '../world';
import { setDestination } from './movement';
import { effectiveBuilding } from '../stats';

/** How far a villager can reach the building footprint, in fixed point. */
const REACH = Math.trunc(FP_ONE * 1.8);

/** Base construction fraction per tick for one villager (1/1000 units). */
const BASE_RATE = 1000 / (TICK_RATE * 16);

/** Attempt to place a building site and order the workers to build it. */
export function placeBuilding(
  world: World,
  playerId: number,
  defId: string,
  tileX: number,
  tileY: number,
  builderIds: number[],
  queueOrder: boolean,
  endX?: number,
  endY?: number,
): Entity | null {
  const def = BUILDINGS[defId];
  if (!def) return null;

  // Wall drag: place a run of segments between two points.
  if (def.isWallSegment && endX !== undefined && endY !== undefined) {
    return placeWallRun(world, playerId, defId, tileX, tileY, endX, endY, builderIds);
  }

  if (!world.canPlaceBuilding(defId, tileX, tileY)) return null;
  const player = world.players[playerId];
  if (!player) return null;
  const eff = effectiveBuilding(world, playerId, def);
  if (!canAfford(player.resources, eff.cost)) return null;

  pay(player.resources, eff.cost);

  const site = world.spawnBuilding({
    owner: playerId,
    defId,
    tileX,
    tileY,
    construction: 0,
  });
  site.hp = Math.max(1, Math.trunc(site.maxHp / 10));

  for (const id of builderIds) {
    assignBuilder(world, id, site, queueOrder);
  }
  return site;
}

function placeWallRun(
  world: World,
  playerId: number,
  defId: string,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  builderIds: number[],
): Entity | null {
  const def = BUILDINGS[defId];
  const player = world.players[playerId];
  if (!def || !player) return null;

  // Supercover line between the two endpoints, placing one segment per tile.
  const tiles: Array<[number, number]> = [];
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let guard = 0;
  while (guard++ < 512) {
    tiles.push([x, y]);
    if (x === x1 && y === y1) break;
    const e2 = err * 2;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }

  let first: Entity | null = null;
  let index = 0;
  for (const [tx, ty] of tiles) {
    if (!world.canPlaceBuilding(defId, tx, ty)) continue;
    const eff = effectiveBuilding(world, playerId, def);
    if (!canAfford(player.resources, eff.cost)) break;
    pay(player.resources, eff.cost);
    const seg = world.spawnBuilding({ owner: playerId, defId, tileX: tx, tileY: ty, construction: 0 });
    seg.hp = Math.max(1, Math.trunc(seg.maxHp / 10));
    if (!first) first = seg;
    const builder = builderIds[index % Math.max(1, builderIds.length)];
    if (builder !== undefined) assignBuilder(world, builder, seg, index > 0);
    index++;
  }
  return first;
}

function assignBuilder(world: World, unitId: number, site: Entity, queueOrder: boolean): void {
  const e = world.get(unitId);
  if (!e) return;
  const def = UNITS[e.def];
  if (!def || def.role !== UnitRole.Worker) return;
  const order = {
    kind: OrderKind.Build,
    target: site.id,
    x: site.x,
    y: site.y,
    defId: 0,
    issued: world.tick,
    aux: 0,
  };
  if (!queueOrder) e.orders.length = 0;
  e.orders.push(order);
  e.build.site = site.id;
  setDestination(world, e, site.x, site.y, true);
}

export function buildSystem(world: World): void {
  // Reset the live builder count so progress reflects only villagers on site.
  for (let i = 0; i < world.entities.length; i++) {
    const b = world.entities[i];
    if (b && b.alive && b.kind === EntityKind.Building) b.builders = 0;
  }

  const progress = new Map<number, number>();

  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (!e || !e.alive || e.kind !== EntityKind.Unit) continue;
    const order = e.orders[0];
    if (!order || order.kind !== OrderKind.Build) continue;
    const def = UNITS[e.def];
    if (!def || def.role !== UnitRole.Worker) continue;

    const site = world.get(order.target);
    if (!site || site.kind !== EntityKind.Building) {
      e.orders.length = 0;
      e.build.site = 0;
      continue;
    }
    if (site.construction >= 1000) {
      e.orders.length = 0;
      e.build.site = 0;
      // Fall through to whatever the villager should do next.
      const queued = e.orders[0];
      if (!queued) e.build.site = 0;
      continue;
    }

    const dist = fpDist(e.x, e.y, site.x, site.y);
    const reach = REACH + Math.trunc((site.def === 'town_center' ? FP_ONE : 0));
    if (dist > reach) {
      if (!e.hasGoal) setDestination(world, e, site.x, site.y, true);
      continue;
    }
    e.hasGoal = false;
    e.path = [];
    e.pathIndex = 0;
    site.builders++;
    const prev = progress.get(site.id) ?? 0;
    const speedPct = 100; // Architecture-style bonuses applied via effective buildTime.
    progress.set(site.id, prev + Math.max(1, Math.trunc((BASE_RATE * speedPct) / 100)));
  }

  for (const [siteId, amount] of progress) {
    const site = world.get(siteId);
    if (!site) continue;
    site.construction = Math.min(1000, site.construction + amount);
    // Hit points grow with construction progress.
    const def = BUILDINGS[site.def];
    if (def) {
      const target = effectiveBuilding(world, site.owner, def).hp;
      site.maxHp = target;
      site.hp = Math.max(1, Math.min(target, Math.trunc((target * site.construction) / 1000)));
    }
    if (site.construction >= 1000) {
      world.onBuildingComplete(site);
      // Send the builders back to work: gather the nearest resource.
      releaseBuilders(world, site);
    }
  }
}

function releaseBuilders(world: World, site: Entity): void {
  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (!e || !e.alive || e.kind !== EntityKind.Unit) continue;
    const order = e.orders[0];
    if (!order || order.kind !== OrderKind.Build || order.target !== site.id) continue;
    e.orders.length = 0;
    e.build.site = 0;
    // Idle builders auto-resume the last resource they were on when possible.
    const want = RESOURCE_INDEX[e.gather.resource] ?? 'wood';
    const node = findNearestOf(world, e, want);
    if (node) {
      e.gather.node = node.id;
      e.orders.push({
        kind: OrderKind.Gather,
        target: node.id,
        x: node.x,
        y: node.y,
        defId: 0,
        issued: world.tick,
        aux: 0,
      });
      setDestination(world, e, node.x, node.y, true);
    }
  }
}

const RESOURCE_INDEX = ['food', 'wood', 'gold', 'stone'] as const;

function findNearestOf(world: World, e: Entity, resource: string): Entity | null {
  let best: Entity | null = null;
  let bestD = Number.MAX_SAFE_INTEGER;
  for (let i = 0; i < world.entities.length; i++) {
    const n = world.entities[i];
    if (!n || !n.alive || n.kind !== EntityKind.ResourceNode) continue;
    if (n.amount <= 0) continue;
    const kind = n.def;
    const res =
      kind === 'tree' ? 'wood' : kind === 'gold' ? 'gold' : kind === 'stone' ? 'stone' : 'food';
    if (res !== resource) continue;
    const d = fpDist(e.x, e.y, n.x, n.y);
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return best;
}

/** Farm rebuild: a spent farm is replaced in place for the same cost. */
export function rebuildFarm(world: World, farmId: number): boolean {
  const farm = world.get(farmId);
  if (!farm || farm.kind !== EntityKind.Building || farm.def !== 'farm') return false;
  const def = BUILDINGS.farm;
  const player = world.players[farm.owner];
  if (!def || !player) return false;
  if (!canAfford(player.resources, def.cost)) return false;
  pay(player.resources, def.cost);
  farm.amount = 350;
  return true;
}

export function canAfford(resources: { food: number; wood: number; gold: number; stone: number }, cost: { food: number; wood: number; gold: number; stone: number }): boolean {
  return (
    resources.food >= cost.food &&
    resources.wood >= cost.wood &&
    resources.gold >= cost.gold &&
    resources.stone >= cost.stone
  );
}

export function pay(resources: { food: number; wood: number; gold: number; stone: number }, cost: { food: number; wood: number; gold: number; stone: number }): void {
  resources.food -= cost.food;
  resources.wood -= cost.wood;
  resources.gold -= cost.gold;
  resources.stone -= cost.stone;
}

export function refund(resources: { food: number; wood: number; gold: number; stone: number }, cost: { food: number; wood: number; gold: number; stone: number }): void {
  resources.food += cost.food;
  resources.wood += cost.wood;
  resources.gold += cost.gold;
  resources.stone += cost.stone;
}

export { BuildingKind };
