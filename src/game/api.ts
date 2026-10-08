/**
 * window.__game: the automation surface.
 *
 * Every e2e assertion and every headless script goes through this object. It is
 * read-only with respect to simulation internals: state is always taken from a
 * fresh snapshot, and mutations go through the same command protocol the player
 * uses, so tests cannot bypass the rules.
 */
import type { Command } from '../sim/commands';
import type { StateSnapshot } from '../sim/game';
import type { GameSession } from './session';
import { runSimulatedPlayer, type SimulatedPlayerConfig } from './simulated-player';

export interface GameApi {
  /** Version stamp so tests can assert they are talking to the right build. */
  readonly version: string;
  /** True once a match is running. */
  ready(): boolean;
  /** Current simulation tick. */
  tick(): number;
  /** Full serialisable state. */
  state(): StateSnapshot;
  /** Deterministic 32-bit digest of the simulation state. */
  hash(): number;
  /** Enqueue a command through the normal protocol. */
  command(command: Command): boolean;
  /** Apply a command immediately, bypassing the queue (tests only). */
  apply(command: Command): boolean;
  /** Advance the simulation by n ticks without waiting for frames. */
  step(ticks: number): void;
  /** Simulation speed multiplier. */
  speed(multiplier: number): void;
  /** Smoothed frames per second as measured by the render loop. */
  fps(): number;
  /** Renderer counters: draw calls, live instances and the renderer's own fps. */
  renderStats(): { drawCalls: number; instances: number; fps: number };
  /** Current selection. */
  selection(): number[];
  /** Replace the selection. */
  select(ids: number[]): void;
  /** Camera helpers for tests. */
  camera: {
    center(x: number, y: number): void;
    zoom(factor: number): void;
    rotate(steps: number): void;
    focus(): { x: number; y: number };
    distance(): number;
  };
  /** Entity count by kind, a cheap assertion target. */
  counts(): { units: number; buildings: number; resources: number; projectiles: number };
  /** Play the match automatically with a scripted player. */
  simulate(config: SimulatedPlayerConfig): Promise<{ winner: number; reason: string; ticks: number }>;
  /** True when the match is finished. */
  isOver(): boolean;
  /** Spawn units at the centre of the map (test helper). */
  spawn(defId: string, count: number, player?: number, x?: number, y?: number): boolean;
  /** Give resources to a player (test helper). */
  grant(amount: number, player?: number): boolean;
}

declare global {
  interface Window {
    __game?: GameApi;
    __aegis?: {
      session: GameSession | null;
      startMatch: (settings?: Partial<import('../ui/types').LobbySettings>) => void;
      showMenu: () => void;
    };
  }
}

export interface ApiHooks {
  /** Returns the running session, or null while the menu is open. */
  session: () => GameSession | null;
  startMatch: (settings?: Record<string, unknown>) => void;
  showMenu: () => void;
}

export const API_VERSION = '1.0.0';

export function installGameApi(hooks: ApiHooks): GameApi {
  const requireSession = (): GameSession | null => hooks.session();

  const api: GameApi = {
    version: API_VERSION,

    ready: () => requireSession() !== null,

    tick: () => requireSession()?.snapshot().tick ?? 0,

    state: () => {
      const session = requireSession();
      if (!session) throw new Error('no match is running');
      return session.snapshot();
    },

    hash: () => requireSession()?.hash() ?? 0,

    command: (command) => requireSession()?.issue(command) ?? false,

    apply: (command) => requireSession()?.applyNow(command) ?? false,

    step: (ticks) => {
      const session = requireSession();
      if (!session) return;
      const n = Math.max(0, Math.min(200000, Math.floor(ticks)));
      session.fastForward(n);
    },

    speed: (multiplier) => requireSession()?.setSpeed(multiplier),

    fps: () => requireSession()?.currentFps() ?? 0,

    renderStats: () =>
      requireSession()?.renderer.stats() ?? { drawCalls: 0, instances: 0, fps: 0 },

    selection: () => requireSession()?.selection ?? [],

    select: (ids) => requireSession()?.setSelection(ids),

    camera: {
      center: (x, y) => requireSession()?.renderer.camera.centerOn(x, y),
      zoom: (factor) => requireSession()?.renderer.camera.zoomBy(factor),
      rotate: (steps) => requireSession()?.renderer.camera.rotateBy(steps),
      focus: () => requireSession()?.renderer.camera.focus() ?? { x: 0, y: 0 },
      distance: () => requireSession()?.renderer.camera.distance() ?? 0,
    },

    counts: () => {
      const session = requireSession();
      const out = { units: 0, buildings: 0, resources: 0, projectiles: 0 };
      if (!session) return out;
      for (const e of session.game.world.all()) {
        if (e.kind === 1) out.units++;
        else if (e.kind === 2) out.buildings++;
        else if (e.kind === 3) out.resources++;
        else if (e.kind === 4) out.projectiles++;
      }
      return out;
    },

    simulate: async (config) => {
      const session = requireSession();
      if (!session) throw new Error('no match is running');
      return runSimulatedPlayer(session, config);
    },

    isOver: () => requireSession()?.isOver ?? false,

    spawn: (defId, count, player = 0, x, y) =>
      requireSession()?.applyNow({
        type: 99,
        player,
        kind: 'spawn',
        defId,
        count,
        x: x ?? ((requireSession()?.game.world.map.width ?? 2) << 10) / 2,
        y: y ?? ((requireSession()?.game.world.map.height ?? 2) << 10) / 2,
      }) ?? false,

    grant: (amount, player = 0) =>
      requireSession()?.applyNow({ type: 99, player, kind: 'resources', amount }) ?? false,
  };

  window.__game = api;
  return api;
}
