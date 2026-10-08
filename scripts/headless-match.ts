/**
 * Headless match runner. Proves the simulation runs in plain Node with no DOM.
 *
 * Usage:
 *   pnpm sim:headless -- --seed 42 --ticks 6000 --players 4 --victory landmarks
 *
 * Prints a per-player summary plus the deterministic state hash, so two runs
 * with the same arguments can be diffed.
 */
import { Game } from '../src/sim/game';
import { TICK_RATE, VictoryCondition } from '../src/sim/constants';
import type { PlayerConfig } from '../src/sim/types';

interface Args {
  seed: number;
  ticks: number;
  players: number;
  victory: VictoryCondition;
  size: 'tiny' | 'small' | 'medium' | 'large' | 'huge';
  quiet: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    seed: 1234,
    ticks: TICK_RATE * 60 * 5,
    players: 2,
    victory: VictoryCondition.Landmarks,
    size: 'medium',
    quiet: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === '--seed' && next) args.seed = Number(next);
    else if (a === '--ticks' && next) args.ticks = Number(next);
    else if (a === '--players' && next) args.players = Number(next);
    else if (a === '--size' && next) args.size = next as Args['size'];
    else if (a === '--quiet') args.quiet = true;
    else if (a === '--victory' && next) {
      args.victory =
        next === 'sacred'
          ? VictoryCondition.SacredSites
          : next === 'wonder'
            ? VictoryCondition.Wonder
            : VictoryCondition.Landmarks;
    }
  }
  return args;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const players: PlayerConfig[] = [];
  for (let i = 0; i < args.players; i++) {
    players.push({
      name: i === 0 ? 'You' : `Bot ${i}`,
      civ: i % 2 === 0 ? 'english' : 'french',
      team: 0,
      bot: i === 0 ? -1 : 1,
      color: i,
    });
  }

  const started = Date.now();
  const game = new Game({
    seed: args.seed,
    mapSize: args.size,
    players,
    victory: args.victory,
    disableBots: true,
  });
  const result = game.runToCompletion(args.ticks);
  const elapsed = Date.now() - started;

  const snap = game.snapshot();
  if (!args.quiet) {
    console.log(`seed=${args.seed} size=${args.size} players=${args.players} victory=${args.victory}`);
    console.log(`ticks=${snap.tick} elapsed=${elapsed}ms hash=${game.hash().toString(16)}`);
    for (const p of snap.players) {
      const r = p.resources;
      console.log(
        `  [${p.id}] ${p.name.padEnd(6)} ${p.civ.padEnd(8)} ${p.ageName.padEnd(12)} ` +
          `pop=${String(p.pop).padStart(3)}/${p.popCap} ` +
          `f=${r.food} w=${r.wood} g=${r.gold} s=${r.stone} ` +
          `units=${snap.entities.filter((e) => e.kind === 1 && e.owner === p.id).length} ` +
          `buildings=${snap.entities.filter((e) => e.kind === 2 && e.owner === p.id).length}` +
          (p.defeated ? ' DEFEATED' : ''),
      );
    }
    if (result.over) console.log(`RESULT: winner=${result.winner} (${result.reason})`);
  } else {
    console.log(`${snap.tick} ${game.hash().toString(16)}`);
  }
}

main();
