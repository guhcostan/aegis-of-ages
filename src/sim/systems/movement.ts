/**
 * Movement system: follows paths, resolves collisions, handles arrival.
 *
 * Units move in integer fixed point. Collision resolution is a symmetric push
 * applied in ascending entity-id order, so the outcome never depends on hash
 * iteration order.
 */
import { ARRIVE_EPSILON, FP_ONE } from '../constants';
import { fpDist, fpDist2, isqrt } from '../fixed';
import { EntityKind, UnitRole, type Entity } from '../types';
import { UNITS } from '../data/units';
import { effectiveUnit } from '../stats';
import type { World } from '../world';

/**
 * Collision radius of a unit in fixed point.
 *
 * This sets the separation floor at 2 x UNIT_RADIUS = 0.5 tiles. It must stay
 * below the melee reach (0.29 tiles plus the attacker's approach), otherwise two
 * units can never close to striking distance and a fight stalls after the first
 * clash.
 */
const UNIT_RADIUS = Math.trunc(FP_ONE / 4);
/** Separation strength: how much of the overlap is resolved per tick (percent). */
const SEPARATION_PERCENT = 60;

export function movementSystem(world: World): void {
  const scratch: Entity[] = [];
  const map = world.map;

  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (!e || !e.alive || e.kind !== EntityKind.Unit) continue;
    if (e.inside !== 0) continue;
    if (!e.hasGoal) continue;

    const def = UNITS[e.def];
    if (!def) continue;
    // Movement speed comes from the effective stats so that Wheelbarrow and
    // Husbandry actually change behaviour.
    const speed = effectiveUnit(world, e.owner, def).speed;
    if (speed <= 0) continue;

    // Once the unit is on the final stretch, walk straight at the goal so that
    // the last few pixels do not zig-zag along the grid.
    const goalDist = fpDist(e.x, e.y, e.goalX, e.goalY);
    if (goalDist <= ARRIVE_EPSILON) {
      arrive(e);
      continue;
    }

    // --- Progress watchdog -------------------------------------------------
    // Units can end up walled in by a building placed around them, or unable to
    // path out of a pocket. AoE IV never leaves a unit permanently stuck, so
    // after three seconds without getting closer we release the goal and, if
    // the unit is standing on or beside blocked ground, nudge it to the nearest
    // walkable tile.
    if (goalDist < e.lastGoalDist - 1) {
      e.lastGoalDist = goalDist;
      e.stuckTicks = 0;
    } else {
      e.stuckTicks++;
      if (e.stuckTicks > 60) {
        e.stuckTicks = 0;
        e.lastGoalDist = goalDist;
        // First try to step off blocked ground, then to reposition next to the
        // goal when a building cluster has sealed the destination off. Without
        // the second case a walled-in farm makes its workers loop forever and
        // the whole base economy freezes.
        if (!unstick(world, e) && !repositionNearGoal(world, e)) {
          // Genuinely unreachable: give up on this goal rather than spinning.
          e.hasGoal = false;
          e.path = [];
          e.pathIndex = 0;
          e.stuckTicks = 0;
        }
      }
    }

    let moved = false;
    if (e.path.length > e.pathIndex * 2) {
      const wx = e.path[e.pathIndex * 2] as number;
      const wy = e.path[e.pathIndex * 2 + 1] as number;
      const d = fpDist(e.x, e.y, wx, wy);
      if (d <= speed) {
        // Reached this waypoint; snap and continue toward the next one.
        e.x = wx;
        e.y = wy;
        e.pathIndex++;
        moved = true;
      } else if (d > 0) {
        e.x += Math.trunc(((wx - e.x) * speed) / d);
        e.y += Math.trunc(((wy - e.y) * speed) / d);
        moved = true;
      }
    }

    if (!moved) {
      // No usable path: try a straight line, otherwise give up and repath later.
      const straight = world.pathfinder.straightWalkable(e.x, e.y, e.goalX, e.goalY, sizeOf(e));
      if (straight) {
        const d = goalDist;
        const step = Math.min(speed, d);
        e.x += Math.trunc(((e.goalX - e.x) * step) / d);
        e.y += Math.trunc(((e.goalY - e.y) * step) / d);
      } else if (world.tick >= e.repathAt) {
        const path = world.pathfinder.findPath(
          e.x >> 10,
          e.y >> 10,
          e.goalX >> 10,
          e.goalY >> 10,
          sizeOf(e),
          6000,
          e.owner,
        );
        if (path && path.length >= 2) {
          e.path = path;
          e.pathIndex = 0;
        } else {
          e.hasGoal = false;
          e.path = [];
          e.pathIndex = 0;
        }
        e.repathAt = world.tick + 12;
      }
    }

    // Update facing from actual displacement.
    updateFacing(e);

    if (fpDist(e.x, e.y, e.goalX, e.goalY) <= ARRIVE_EPSILON) arrive(e);
  }

  // --- Collision resolution ---
  for (let i = 0; i < world.entities.length; i++) {
    const a = world.entities[i];
    if (!a || !a.alive || a.kind !== EntityKind.Unit || a.inside !== 0) continue;
    const neighbours = world.queryRadius(a.x, a.y, UNIT_RADIUS * 2, scratch);
    for (const b of neighbours) {
      if (b.id <= a.id) continue; // handle each pair once, in id order
      if (b.kind !== EntityKind.Unit || b.inside !== 0) continue;
      // Two units locked in melee are fighting, not queuing: pushing them apart
      // would make the fight impossible to finish.
      if (a.attackTarget === b.id || b.attackTarget === a.id) continue;
      const d2 = fpDist2(a.x, a.y, b.x, b.y);
      const minD = UNIT_RADIUS * 2;
      if (d2 >= minD * minD || d2 === 0) continue;
      const d = isqrt(d2);
      if (d === 0) continue;
      const overlap = minD - d;
      let push = Math.trunc((overlap * SEPARATION_PERCENT) / 100);
      if (push < 1) push = 1;
      const dx = Math.trunc(((b.x - a.x) * push) / d / 2);
      const dy = Math.trunc(((b.y - a.y) * push) / d / 2);
      // Only move onto passable ground.
      if (isFree(world, a.x - dx, a.y - dy)) {
        a.x -= dx;
        a.y -= dy;
      }
      if (isFree(world, b.x + dx, b.y + dy)) {
        b.x += dx;
        b.y += dy;
      }
    }
  }

  // Keep every unit inside the map.
  const maxX = (map.width << 10) - 1;
  const maxY = (map.height << 10) - 1;
  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (!e || !e.alive || e.kind !== EntityKind.Unit) continue;
    if (e.x < 0) e.x = 0;
    if (e.y < 0) e.y = 0;
    if (e.x > maxX) e.x = maxX;
    if (e.y > maxY) e.y = maxY;
  }
}

/**
 * Move a stranded unit to the closest walkable tile within a small radius.
 * Returns false when the unit is already on open ground (nothing to fix).
 */
function unstick(world: World, e: Entity): boolean {
  const tx = e.x >> 10;
  const ty = e.y >> 10;
  const { width, height, passable } = world.map;
  if (tx >= 0 && ty >= 0 && tx < width && ty < height && passable[ty * width + tx] === 1) {
    // Standing on open ground: the goal is simply unreachable.
    return false;
  }
  // Find the nearest walkable tile and step onto it.
  for (let r = 1; r <= 6; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const x = tx + dx;
        const y = ty + dy;
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        if (passable[y * width + x] !== 1) continue;
        e.x = (x << 10) + 512;
        e.y = (y << 10) + 512;
        e.path = [];
        e.pathIndex = 0;
        e.hasGoal = false;
        return true;
      }
    }
  }
  return false;
}

/**
 * Maximum distance, in tiles, over which a stuck unit may be repositioned.
 * Keeping it small makes this a local nudge rather than a teleport, so units
 * cannot use it to cross walls or reach across the map.
 */
const REPOSITION_RANGE_TILES = 12;

/**
 * Place a stuck unit on the nearest walkable tile to its goal, but only when
 * the goal is close by. Returns false when the unit is not eligible.
 */
function repositionNearGoal(world: World, e: Entity): boolean {
  const { width, height, passable } = world.map;
  const gx = e.goalX >> 10;
  const gy = e.goalY >> 10;
  const ux = e.x >> 10;
  const uy = e.y >> 10;
  const dx = Math.abs(gx - ux);
  const dy = Math.abs(gy - uy);
  if (dx > REPOSITION_RANGE_TILES || dy > REPOSITION_RANGE_TILES) return false;

  for (let r = 1; r <= 4; r++) {
    for (let oy = -r; oy <= r; oy++) {
      for (let ox = -r; ox <= r; ox++) {
        if (Math.abs(ox) !== r && Math.abs(oy) !== r) continue;
        const x = gx + ox;
        const y = gy + oy;
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        if (passable[y * width + x] !== 1) continue;
        e.x = (x << 10) + 512;
        e.y = (y << 10) + 512;
        e.path = [];
        e.pathIndex = 0;
        e.hasGoal = false;
        return true;
      }
    }
  }
  return false;
}

function isFree(world: World, x: number, y: number): boolean {
  if (x < 0 || y < 0) return false;
  if (x >= world.map.width << 10 || y >= world.map.height << 10) return false;
  return world.map.passable[(y >> 10) * world.map.width + (x >> 10)] === 1;
}

/** Collision size class: siege engines need wider clearance. */
export function sizeOf(e: Entity): number {
  const def = UNITS[e.def];
  if (!def) return 1;
  return def.role === UnitRole.Siege ? 2 : 1;
}

function updateFacing(e: Entity): void {
  const dx = e.goalX - e.x;
  const dy = e.goalY - e.y;
  if (dx === 0 && dy === 0) return;
  e.facing = octantAngle(dx, dy);
}

/**
 * Angle from a direction vector, in 1/256 turns, using integer octant math.
 * Shared by movement and combat so facing is computed one single way.
 */
export function octantAngle(dx: number, dy: number): number {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax === 0 && ay === 0) return 0;
  const ratio = ay === 0 ? 0 : Math.trunc((ax * 64) / (ax + ay));
  let angle: number;
  if (dx >= 0 && dy >= 0) angle = ratio;
  else if (dx < 0 && dy >= 0) angle = 128 - ratio;
  else if (dx < 0 && dy < 0) angle = 128 + ratio;
  else angle = 256 - ratio;
  return angle & 255;
}

/** Clear the movement goal when the unit has arrived. */
function arrive(e: Entity): void {
  e.x = e.goalX;
  e.y = e.goalY;
  e.hasGoal = false;
  e.path = [];
  e.pathIndex = 0;
}

/** Give a unit a new destination, computing a path lazily. */
export function setDestination(world: World, e: Entity, x: number, y: number, queueOrder = false): void {
  if (!queueOrder) {
    e.orders.length = 0;
  }
  const path = world.pathfinder.findPath(
    e.x >> 10,
    e.y >> 10,
    x >> 10,
    y >> 10,
    sizeOf(e),
    6000,
    e.owner,
  );
  e.path = path ?? [];
  e.pathIndex = 0;
  e.goalX = x;
  e.goalY = y;
  e.hasGoal = true;
  e.repathAt = world.tick + 15;
  // Moving re-arms a cavalry charge: the bonus is spent on the next strike and
  // only comes back once the unit has ridden somewhere.
  if (e.chargeReady === 0) e.chargeReady = 1;
}

/** Teleport-free helper for tests and spawn logic. */
export function faceToward(e: Entity, x: number, y: number): void {
  e.facing = octantAngle(x - e.x, y - e.y);
}
