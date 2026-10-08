/**
 * Victory system: landmark destruction, sacred sites, wonders, and total
 * elimination.
 *
 * Rules implemented (documented in docs/SPEC.md):
 *  - Landmarks: a player that has completed at least one landmark is defeated
 *    when every one of their landmarks is destroyed.
 *  - Elimination: a player with no units and no buildings is defeated.
 *  - Sacred sites: hold SACRED_SITE_VICTORY_COUNT sites for the countdown.
 *  - Wonder: finish a Wonder and hold it for the countdown.
 */
import {
  SACRED_SITE_VICTORY_COUNT,
  SACRED_SITE_VICTORY_TICKS,
  VictoryCondition,
  WONDER_VICTORY_TICKS,
} from '../constants';
import { EntityKind, UnitRole } from '../types';
import { UNITS } from '../data/units';
import { BUILDINGS } from '../data/buildings';
import type { World } from '../world';
import { heldSacredSites } from './religion';

export interface MatchResult {
  over: boolean;
  winner: number;
  reason: string;
}

export function victorySystem(world: World, condition: VictoryCondition): MatchResult {
  const result: MatchResult = { over: false, winner: -1, reason: '' };

  // --- Elimination and landmark loss ---
  for (const player of world.players) {
    if (player.defeated) continue;
    let units = 0;
    let buildings = 0;
    let landmarks = 0;
    let everHadLandmark = player.landmarks.length > 0;
    for (let i = 0; i < world.entities.length; i++) {
      const e = world.entities[i];
      if (!e || !e.alive || e.owner !== player.id) continue;
      if (e.kind === EntityKind.Unit) units++;
      else if (e.kind === EntityKind.Building) {
        buildings++;
        const def = BUILDINGS[e.def];
        if (def?.isLandmark && e.construction >= 1000) {
          landmarks++;
          everHadLandmark = true;
        }
      }
    }
    if (units === 0 && buildings === 0) {
      player.defeated = true;
      result.reason = `${player.name} has nothing left`;
      continue;
    }
    if (condition === VictoryCondition.Landmarks && everHadLandmark && landmarks === 0) {
      player.defeated = true;
      result.reason = `${player.name} lost every landmark`;
    }
  }

  const alive = world.players.filter((p) => !p.defeated);

  // --- Sacred site victory ---
  if (condition === VictoryCondition.SacredSites) {
    for (const player of alive) {
      if (player.sacredHoldTicks >= SACRED_SITE_VICTORY_TICKS) {
        return {
          over: true,
          winner: player.id,
          reason: `${player.name} held ${SACRED_SITE_VICTORY_COUNT} sacred sites`,
        };
      }
    }
  }

  // --- Wonder victory ---
  if (condition === VictoryCondition.Wonder) {
    for (const player of alive) {
      let wonder = 0;
      for (let i = 0; i < world.entities.length; i++) {
        const e = world.entities[i];
        if (!e || !e.alive || e.kind !== EntityKind.Building) continue;
        if (e.owner !== player.id) continue;
        if (e.def === 'wonder' && e.construction >= 1000) wonder++;
      }
      if (wonder > 0) {
        if (player.wonderAt === 0) player.wonderAt = world.tick;
        if (world.tick - player.wonderAt >= WONDER_VICTORY_TICKS) {
          return { over: true, winner: player.id, reason: `${player.name} completed a Wonder` };
        }
      } else {
        player.wonderAt = 0;
      }
    }
  }

  // --- Last player standing ---
  const remaining = world.players.filter((p) => !p.defeated);
  if (remaining.length === 1 && world.players.length > 1) {
    return {
      over: true,
      winner: (remaining[0] as { id: number }).id,
      reason: `${(remaining[0] as { name: string }).name} is the last one standing`,
    };
  }
  if (remaining.length === 0) {
    return { over: true, winner: -1, reason: 'Mutual destruction' };
  }

  return result;
}

/** Progress towards each victory condition, for the HUD objectives panel. */
export interface ObjectiveProgress {
  playerId: number;
  landmarksLeft: number;
  sacredSitesHeld: number;
  sacredHoldTicks: number;
  sacredTicksNeeded: number;
  wonderTicks: number;
  wonderTicksNeeded: number;
}

export function objectives(world: World): ObjectiveProgress[] {
  const out: ObjectiveProgress[] = [];
  for (const player of world.players) {
    let landmarks = 0;
    let wonderTicks = 0;
    for (let i = 0; i < world.entities.length; i++) {
      const e = world.entities[i];
      if (!e || !e.alive || e.owner !== player.id) continue;
      if (e.kind !== EntityKind.Building || e.construction < 1000) continue;
      const def = BUILDINGS[e.def];
      if (def?.isLandmark) landmarks++;
      if (e.def === 'wonder' && player.wonderAt > 0) wonderTicks = world.tick - player.wonderAt;
    }
    out.push({
      playerId: player.id,
      landmarksLeft: landmarks,
      sacredSitesHeld: heldSacredSites(world, player.id),
      sacredHoldTicks: player.sacredHoldTicks,
      sacredTicksNeeded: SACRED_SITE_VICTORY_TICKS,
      wonderTicks,
      wonderTicksNeeded: WONDER_VICTORY_TICKS,
    });
  }
  return out;
}

/** Count workers, for the "idle villager" HUD button and bot logic. */
export function idleWorkers(world: World, owner: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (!e || !e.alive || e.kind !== EntityKind.Unit || e.owner !== owner) continue;
    const def = UNITS[e.def];
    if (!def || def.role !== UnitRole.Worker) continue;
    const order = e.orders[0];
    if (!order) out.push(e.id);
    else if (order.kind === 0) out.push(e.id);
  }
  return out;
}
