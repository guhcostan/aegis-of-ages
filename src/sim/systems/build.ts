/**
 * Construction system: villagers raise buildings, replace farms, and can be
 * redirected mid-build. Progress is integer (0..1000 per building) and scales
 * with the number of villagers actually on site.
 */
import { FP_ONE } from '../constants';
import { fpDist } from '../fixed';
import { BuildingKind, EntityKind, OrderKind, UnitRole, type Entity } from '../types';
import { UNITS } from '../data/units';
import { BUILDINGS } from '../data/buildings';
import type { World } from '../world';
import { setDestination } from './movement';
import { effectiveBuilding } from '../stats';

/**
 * Base reach in fixed point. It must be measured from the building's CENTRE, so
 * the footprint radius is added below: without that, a 3x3 or 4x4 building can
 * never be reached because the villager cannot stand inside its own tiles.
 */
const REACH = Math.trunc(FP_ONE * 1.6);

/** Reach that actually reaches the edge of a building of this definition. */
function reachFor(defId: string): number {
  const def = BUILDINGS[defId];
  if (!def) return REACH;
  return REACH + Math.trunc((Math.max(def.width, def.height) * FP_ONE) / 2);
}

/**
 * Construction speed, in thousandths of a construction point per tick.
 *
 * AoE IV defines a base build time per building (the time one villager needs)
 * and gives every extra villager diminishing returns: the time fraction is
 * 3/(N+2), so two villagers take 75% and ten take 25%.
 *
 *   progress per tick = 1000 * (N + 2) / (3 * baseBuildTime)
 *
 * The value is returned scaled by 1000 and accumulated per site, because for a
 * 190 s landmark the per-tick progress is 0.26 points: truncating it to an
 * integer (or flooring it at 1) made every expensive building finish in exactly
 * 50 seconds instead of its researched build time.
 */
const BUILD_ACCUM_SCALE = 1000;

function constructionRate(builders: number, baseBuildTime: number): number {
  if (builders <= 0 || baseBuildTime <= 0) return 0;
  return Math.trunc((1000 * (builders + 2) * BUILD_ACCUM_SCALE) / (3 * baseBuildTime));
}

/** Existing unfinished building of ours occupying this tile, if any. */
function findUnfinishedSite(
  world: World,
  playerId: number,
  defId: string,
  tileX: number,
  tileY: number,
): Entity | null {
  const def = BUILDINGS[defId];
  if (!def) return null;
  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (!e || !e.alive || e.kind !== EntityKind.Building) continue;
    if (e.owner !== playerId || e.def !== defId) continue;
    if (e.construction >= 1000) continue;
    const ex = e.x >> 10;
    const ey = e.y >> 10;
    const left = ex - (def.width >> 1);
    const top = ey - (def.height >> 1);
    if (tileX >= left && tileX < left + def.width && tileY >= top && tileY < top + def.height) {
      return e;
    }
  }
  return null;
}

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

  // Re-assigning builders to a site that already exists must not charge twice
  // and must not create a second building on the same tiles.
  const existing = findUnfinishedSite(world, playerId, defId, tileX, tileY);
  if (existing) {
    for (const id of builderIds) assignBuilder(world, id, existing, queueOrder);
    return existing;
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

  // Pass 1: walk every builder into range and count who is actually on site.
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
      continue;
    }

    const dist = fpDist(e.x, e.y, site.x, site.y);
    if (dist > reachFor(site.def)) {
      if (!e.hasGoal) setDestination(world, e, site.x, site.y, true);
      continue;
    }
    e.hasGoal = false;
    e.path = [];
    e.pathIndex = 0;
    site.builders++;
  }

  // Pass 2: advance every site by its own build time and builder count.
  for (let i = 0; i < world.entities.length; i++) {
    const site = world.entities[i];
    if (!site || !site.alive || site.kind !== EntityKind.Building) continue;
    if (site.construction >= 1000 || site.builders <= 0) continue;
    const def = BUILDINGS[site.def];
    if (!def) continue;
    const eff = effectiveBuilding(world, site.owner, def);
    site.buildAccum += constructionRate(site.builders, eff.buildTime);
    const whole = Math.trunc(site.buildAccum / BUILD_ACCUM_SCALE);
    if (whole > 0) {
      site.buildAccum -= whole * BUILD_ACCUM_SCALE;
      site.construction = Math.min(1000, site.construction + whole);
    }
    // Hit points grow with construction progress.
    const targetHp = effectiveBuilding(world, site.owner, def).hp;
    site.maxHp = targetHp;
    site.hp = Math.max(1, Math.min(targetHp, Math.trunc((targetHp * site.construction) / 1000)));

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
