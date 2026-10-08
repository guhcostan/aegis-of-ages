/**
 * Simulated player.
 *
 * Drives the local player with the same command protocol a human uses, so an
 * end-to-end test can play a complete match from the lobby to the victory
 * screen without a person at the keyboard. It yields to the event loop between
 * chunks so the page keeps rendering while the match is played.
 */
import { TICK_RATE } from '../sim/constants';
import { BotController } from '../bots/bot';
import type { GameSession } from './session';

export interface SimulatedPlayerConfig {
  /** Hard cap on simulated seconds. */
  maxSeconds?: number;
  /** Which bot profile plays the local player. 0 easy, 1 intermediate, 2 hard. */
  difficulty?: number;
  /** Ticks simulated between yields to the browser. */
  chunkTicks?: number;
  /** Called after every chunk, for progress reporting in tests. */
  onProgress?: (tick: number, over: boolean) => void;
}

export interface SimulatedPlayerResult {
  winner: number;
  reason: string;
  ticks: number;
}

export async function runSimulatedPlayer(
  session: GameSession,
  config: SimulatedPlayerConfig = {},
): Promise<SimulatedPlayerResult> {
  const maxTicks = (config.maxSeconds ?? 60 * 45) * TICK_RATE;
  const difficulty = config.difficulty ?? 1;
  const chunk = config.chunkTicks ?? TICK_RATE * 5;

  // If the session already drives the local player (a fully automated bot-vs-bot
  // match), reuse that controller: two controllers issuing orders for the same
  // player fight each other and the match never settles.
  const existing = session.bots.find((bot) => bot.playerId === 0);
  const controller =
    existing ??
    new BotController(session.game, 0, difficulty, (command) => session.issue(command));

  // Run the match.
  let tick = session.snapshot().tick;
  while (!session.isOver && tick < maxTicks) {
    for (let i = 0; i < chunk && !session.isOver; i++) {
      // The session steps its own bots; only drive player 0 when it has none.
      if (!existing) controller.update();
      session.stepOnce();
      tick++;
    }
    config.onProgress?.(tick, session.isOver);
    // Yield so the browser can paint and so Playwright can observe progress.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  const snapshot = session.snapshot();
  return {
    winner: snapshot.winner,
    reason: snapshot.reason || (snapshot.over ? 'match over' : 'time limit reached'),
    ticks: snapshot.tick,
  };
}
