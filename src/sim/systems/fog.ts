/**
 * Fog of war: per-player visible and explored grids.
 *
 * Visibility is derived from the line of sight of every entity a player owns.
 * Stealth forests hide units standing inside them unless an enemy unit is
 * adjacent, which is how AoE IV's "hidden in the trees" behaves.
 */
import { FOG_UPDATE_INTERVAL, FP_ONE } from '../constants';
import { EntityKind, type Entity } from '../types';
import { UNITS } from '../data/units';
import { BUILDINGS } from '../data/buildings';
import { effectiveBuilding, effectiveUnit } from '../stats';
import type { World } from '../world';

export interface PlayerFog {
  /** 1 when the tile is currently visible. */
  visible: Uint8Array;
  /** 1 once the tile has ever been seen. */
  explored: Uint8Array;
  /** Tick of the last refresh, to throttle recomputation. */
  lastUpdate: number;
}

export function createFog(width: number, height: number): PlayerFog {
  return {
    visible: new Uint8Array(width * height),
    explored: new Uint8Array(width * height),
    lastUpdate: -999,
  };
}

/** Recompute one player's visibility grid. */
export function updateFog(world: World, fog: PlayerFog, playerId: number, force = false): void {
  if (!force && world.tick - fog.lastUpdate < FOG_UPDATE_INTERVAL) return;
  fog.lastUpdate = world.tick;
  fog.visible.fill(0);

  const { width, height } = world.map;
  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (!e || !e.alive || e.owner !== playerId) continue;
    if (e.kind === EntityKind.Projectile) continue;
    let los = 0;
    if (e.kind === EntityKind.Building) {
      const def = BUILDINGS[e.def];
      if (!def) continue;
      los = effectiveBuilding(world, playerId, def).los;
    } else if (e.kind === EntityKind.Unit) {
      const def = UNITS[e.def];
      if (!def) continue;
      los = effectiveUnit(world, playerId, def).los;
    } else {
      continue;
    }
    revealCircle(fog, width, height, e.x >> 10, e.y >> 10, los >> 10);
  }
}

function revealCircle(
  fog: PlayerFog,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
): void {
  const r2 = radius * radius;
  for (let y = cy - radius; y <= cy + radius; y++) {
    if (y < 0 || y >= height) continue;
    for (let x = cx - radius; x <= cx + radius; x++) {
      if (x < 0 || x >= width) continue;
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy > r2) continue;
      const i = y * width + x;
      fog.visible[i] = 1;
      fog.explored[i] = 1;
    }
  }
}

/**
 * Whether `target` is currently visible to `playerId`. Units hidden inside a
 * stealth forest are only revealed by an enemy unit standing right next to them.
 */
export function isVisibleTo(world: World, fog: PlayerFog, playerId: number, target: Entity): boolean {
  if (target.owner === playerId) return true;
  const tile = (target.y >> 10) * world.map.width + (target.x >> 10);
  if (world.map.stealth[tile] === 1) {
    return hasAdjacentEnemy(world, playerId, target);
  }
  return fog.visible[tile] === 1;
}

function hasAdjacentEnemy(world: World, playerId: number, target: Entity): boolean {
  const scratch: Entity[] = [];
  const found = world.queryRadius(target.x, target.y, FP_ONE, scratch);
  for (const u of found) {
    if (u.kind !== EntityKind.Unit) continue;
    if (u.owner !== playerId) continue;
    return true;
  }
  return false;
}
