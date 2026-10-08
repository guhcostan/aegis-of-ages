/**
 * Full-match headless tests.
 *
 * These run real matches with bots on both sides, in plain Node, with no DOM.
 * They are the strongest single check that the simulation, the economy, the
 * age-up path, the military AI and the victory system all work together.
 */
import { describe, expect, it } from 'vitest';
import { Age, TICK_RATE, VictoryCondition } from '../../src/sim/constants';
import { Game } from '../../src/sim/game';
import { BotController } from '../../src/bots/bot';
import { UNITS } from '../../src/sim/data/units';
import { EntityKind, UnitRole, type PlayerConfig } from '../../src/sim/types';

interface MatchOutcome {
  winner: number;
  reason: string;
  ticks: number;
  ages: number[];
  buildings: number[];
  military: number[];
  defeated: boolean[];
  gathered: number[];
  hash: number;
}

function playBotMatch(options: {
  seed: number;
  victory: VictoryCondition;
  mapSize?: 'tiny' | 'small' | 'medium';
  maxSeconds?: number;
  difficulties?: [number, number];
}): MatchOutcome {
  const difficulties = options.difficulties ?? [1, 1];
  const players: PlayerConfig[] = [
    { name: 'Bot A', civ: 'english', team: 0, bot: difficulties[0], color: 0 },
    { name: 'Bot B', civ: 'french', team: 0, bot: difficulties[1], color: 1 },
  ];
  const game = new Game({
    seed: options.seed,
    mapSize: options.mapSize ?? 'small',
    players,
    victory: options.victory,
    disableBots: true,
  });

  const controllers = game.world.players.map(
    (player) => new BotController(game, player.id, player.bot),
  );

  const maxTicks = (options.maxSeconds ?? 60 * 30) * TICK_RATE;
  while (!game.isOver && game.world.tick < maxTicks) {
    for (const controller of controllers) controller.update();
    game.step();
  }

  const snapshot = game.snapshot();
  const ages: number[] = [];
  const buildings: number[] = [];
  const military: number[] = [];
  const gathered: number[] = [];
  const defeated: boolean[] = [];
  for (const player of game.world.players) {
    ages.push(player.age);
    defeated.push(player.defeated);
    let b = 0;
    let m = 0;
    for (const e of game.world.all()) {
      if (e.owner !== player.id) continue;
      if (e.kind === EntityKind.Building) b++;
      if (e.kind === EntityKind.Unit) {
        const def = UNITS[e.def];
        if (def && (def.role === UnitRole.Military || def.role === UnitRole.Siege)) m++;
      }
    }
    buildings.push(b);
    military.push(m);
    const stats = player.stats.resourcesGathered;
    gathered.push(stats.food + stats.wood + stats.gold + stats.stone);
  }

  return {
    winner: snapshot.winner,
    reason: snapshot.reason,
    ticks: snapshot.tick,
    ages,
    buildings,
    military,
    gathered,
    defeated,
    hash: game.hash(),
  };
}

describe('bot vs bot matches', () => {
  it('plays a complete landmark match and produces a winner', () => {
    const result = playBotMatch({ seed: 2024, victory: VictoryCondition.Landmarks });
    // The match must actually be decided, not run out of ticks.
    expect(result.winner, 'the match produced no winner').toBeGreaterThanOrEqual(0);
    // The winning bot must have played a real economy, not been handed the game.
    const winner = result.winner >= 0 ? result.winner : 0;
    expect(result.gathered[winner], `the winner gathered nothing`).toBeGreaterThan(300);
    expect(result.buildings[winner], `the winner built nothing`).toBeGreaterThan(2);
    // And it must have converted that economy into an army.
    expect(result.military[winner], 'the winner trained no army').toBeGreaterThan(0);
    expect(result.ticks).toBeGreaterThan(TICK_RATE * 30);
    // The beaten side is marked defeated rather than left in limbo.
    const loser = winner === 0 ? 1 : 0;
    expect(result.defeated[loser], 'the losing player was never marked defeated').toBe(true);
  }, 240_000);

  it('is reproducible: the same seed produces the same match', () => {
    const a = playBotMatch({ seed: 777, victory: VictoryCondition.Landmarks, maxSeconds: 300 });
    const b = playBotMatch({ seed: 777, victory: VictoryCondition.Landmarks, maxSeconds: 300 });
    expect(a.hash).toBe(b.hash);
    expect(a.ticks).toBe(b.ticks);
  }, 240_000);

  it('lets bots advance beyond the Dark Age', () => {
    const result = playBotMatch({
      seed: 99,
      victory: VictoryCondition.Landmarks,
      mapSize: 'medium',
      maxSeconds: 60 * 20,
    });
    expect(Math.max(...result.ages)).toBeGreaterThanOrEqual(Age.Feudal);
  }, 240_000);
});

describe('victory conditions', () => {
  it('declares a winner when every enemy landmark is destroyed', () => {
    const game = new Game({
      seed: 12,
      mapSize: 'tiny',
      players: [
        { name: 'A', civ: 'english', team: 0, bot: -1, color: 0 },
        { name: 'B', civ: 'french', team: 0, bot: -1, color: 1 },
      ],
      victory: VictoryCondition.Landmarks,
      disableBots: true,
    });

    // Give player 0 a landmark, then destroy it and everything else player 1 owns.
    const bStart = game.world.map.startPositions[1];
    expect(bStart).toBeDefined();
    if (bStart) {
      const landmark = game.world.spawnBuilding({
        owner: 1,
        defId: 'council_hall',
        tileX: bStart.x,
        tileY: bStart.y,
        construction: 1000,
      });
      expect(game.world.players[1]?.landmarks.length).toBe(1);
      game.world.destroyEntity(landmark.id, 0);
    }

    // Remove the rest of player 1's assets so elimination is unambiguous.
    for (const e of [...game.world.all()]) {
      if (e.owner === 1) game.world.destroyEntity(e.id, 0);
    }
    game.step();
    expect(game.isOver).toBe(true);
    expect(game.results.winner).toBe(0);
  });

  it('ends the match when only one player is left standing', () => {
    const game = new Game({
      seed: 13,
      mapSize: 'tiny',
      players: [
        { name: 'A', civ: 'english', team: 0, bot: -1, color: 0 },
        { name: 'B', civ: 'french', team: 0, bot: -1, color: 1 },
      ],
      disableBots: true,
    });
    for (const e of [...game.world.all()]) {
      if (e.owner === 1) game.world.destroyEntity(e.id, 0);
    }
    game.step();
    expect(game.isOver).toBe(true);
    expect(game.results.winner).toBe(0);
    expect(game.results.reason).toMatch(/last one standing|nothing left|lost every landmark/i);
  });
});
