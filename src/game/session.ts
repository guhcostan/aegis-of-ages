/**
 * Game session: binds the deterministic simulation to the renderer and the HUD.
 *
 * The loop is a classic fixed-timestep accumulator: the simulation always
 * advances in whole TICK_MS steps regardless of frame rate, and the renderer
 * receives an interpolation alpha so motion looks smooth on a 60 Hz display
 * while the simulation stays at 20 Hz.
 */
import { FP_ONE, TICK_RATE, VictoryCondition, type MapSizeName } from '../sim/constants';
import { CommandType } from '../sim/commands';
import type { Command } from '../sim/commands';
import { Game, type StateSnapshot } from '../sim/game';
import { EntityKind, UnitRole, type Entity, type PlayerConfig } from '../sim/types';
import { UNITS } from '../sim/data/units';
import { BUILDINGS } from '../sim/data/buildings';
import { TECHS } from '../sim/data/techs';
import { landmarkChoices } from '../sim/data/civs';
import { canAfford } from '../sim/systems/build';
import { effectiveUnit } from '../sim/stats';
import { BotController } from '../bots/bot';
import type { Renderer, ScreenRect } from '../render/types';
import { createRenderer } from '../render/renderer';
import { createHud } from '../ui/hud';
import type { CommandButton, Hud, HudModel, HudCallbacks, LobbySettings, ObjectiveRow, ScoreRow } from '../ui/types';
import { InputController } from './input';
import { buildId } from './build';
import { AudioEngine } from '../audio/audio';

/** Starting resource presets offered in the lobby. */
const STARTING_RESOURCES: Record<LobbySettings['startingResources'], { food: number; wood: number; gold: number; stone: number }> = {
  standard: { food: 200, wood: 200, gold: 100, stone: 0 },
  high: { food: 2000, wood: 2000, gold: 1000, stone: 800 },
  veryhigh: { food: 50000, wood: 50000, gold: 25000, stone: 10000 },
};

const PLAYER_COLORS = [0x2f6fdb, 0xd4443a, 0x3fa34d, 0xd8a12a];

export interface SessionServices {
  canvas: HTMLCanvasElement;
  hudRoot: HTMLElement;
  settings: LobbySettings;
}

export class GameSession {
  readonly game: Game;
  readonly renderer: Renderer;
  readonly hud: Hud;
  readonly bots: BotController[] = [];
  readonly input: InputController;
  readonly audio: AudioEngine;

  selection: number[] = [];
  controlGroups: number[][] = Array.from({ length: 10 }, () => []);
  hovered = 0;

  private running = false;
  private rafHandle = 0;
  private lastTime = 0;
  private accumulator = 0;
  /** Simulation speed multiplier, 1 == real time. */
  private speed = 1;
  /**
   * When paused, the render loop keeps drawing but the simulation only advances
   * through explicit fastForward() calls. This is what makes the acceptance
   * tests exact: otherwise real time races the explicit stepping.
   */
  private paused = false;
  private fps = 0;
  private frameTimes: number[] = [];
  private elapsedTicks = 0;
  private minimapCanvas: HTMLCanvasElement | null = null;
  private selectionBox: ScreenRect | null = null;
  private lastSnapshot: StateSnapshot;
  /** Diagnostics for the last rendered frame, exposed through window.__game. */
  private lastModelCommands = -1;
  private lastDrawError: string | null = null;
  /** Why the command card came out empty, for diagnostics. */
  private commandTrace = '';
  /** Last render error already logged, to avoid flooding the console. */
  private reportedDrawError: string | null = null;
  /** Home base position, held while the camera is still ours to place. */
  private homeFocusX: number | null = null;
  private homeFocusY: number | null = null;
  private homeZoomApplied = false;
  /** True once the player has moved the camera themselves. */
  private cameraTouched = false;
  /** Frames actually executed by the animation loop; frozen means the loop died. */
  private frames = 0;

  constructor(services: SessionServices) {
    const s = services.settings;
    const localBot = s.playerAsBot ? (s.playerBotDifficulty ?? 1) : -1;
    const players: PlayerConfig[] = [
      { name: s.playerName || 'You', civ: s.civ, team: 0, bot: localBot, color: PLAYER_COLORS[0] as number },
    ];
    s.bots.forEach((bot, i) => {
      players.push({
        name: `Bot ${i + 1}`,
        civ: bot.civ,
        team: bot.team,
        bot: bot.difficulty,
        color: PLAYER_COLORS[(i + 1) % PLAYER_COLORS.length] as number,
      });
    });

    this.game = new Game({
      seed: s.seed,
      mapSize: s.mapSize as MapSizeName,
      mapType: s.mapType,
      players,
      victory: s.victory as VictoryCondition,
      startingResources: STARTING_RESOURCES[s.startingResources],
      revealMap: s.revealMap,
      disableBots: false,
    });

    this.renderer = createRenderer(services.canvas);
    this.renderer.setMap(this.game.world.map);
    // Open the match looking at the player's own base, not at the whole map.
    // setMap() frames the entire map, which left the player staring at a mostly
    // fogged, zoomed-out screen with their Town Center off-centre.
    this.openOnHomeBase();

    const callbacks: HudCallbacks = {
      onCommand: (id) => this.runCommandButton(id),
      onSelectEntity: (id, additive) => this.selectEntity(id, additive),
      onIdleVillager: () => this.selectIdleVillager(),
      onSelectAllMilitary: () => this.selectAllMilitary(),
      onMinimapClick: (x, y) => {
        this.renderer.camera.centerOn(x, y);
        this.notifyCameraInput();
      },
      onControlGroup: (index, additive) => this.selectControlGroup(index, additive),
      onAssignControlGroup: (index) => this.assignControlGroup(index),
      onCancelQueue: (building, index) =>
        this.issue({ type: CommandType.CancelProduction, player: 0, building, index }),
      onToggleScoreboard: () => {
        /* the scoreboard is always visible in this build */
      },
      onCameraKey: () => {
        /* camera keys are handled by the input controller */
      },
    };
    this.hud = createHud(services.hudRoot, callbacks);
    this.minimapCanvas = this.hud.getMinimapCanvas();
    this.hud.setWorldSize(this.game.world.map.width, this.game.world.map.height);

    this.input = new InputController(services.canvas, this);
    this.audio = new AudioEngine({ enabled: s.audioEnabled !== false, volume: 0.35 });

    if (!this.game.config.disableBots) {
      for (const player of this.game.world.players) {
        if (player.bot >= 0) this.bots.push(new BotController(this.game, player.id, player.bot));
      }
    }

    if (s.startPaused) this.paused = true;

    this.lastSnapshot = this.game.snapshot();
  }

  /**
   * Centre the camera on the player's starting Town Center and pull in to a
   * working zoom, the way a match opens in the original.
   *
   * The framing is re-asserted for the first few seconds (see `holdHomeFraming`)
   * so that nothing which touches the camera during start-up — a late map
   * rebuild, a resize, a re-init — can leave the player looking at the empty
   * middle of the map.
   */
  private openOnHomeBase(): void {
    let home: Entity | undefined;
    for (const e of this.game.world.all()) {
      if (e.owner === 0 && e.def === 'town_center') {
        home = e;
        break;
      }
    }
    if (!home) {
      // No Town Center (should not happen): fall back to anything we own rather
      // than leaving the camera on the map centre.
      for (const e of this.game.world.all()) {
        if (e.owner === 0 && e.kind === EntityKind.Building) {
          home = e;
          break;
        }
      }
    }
    if (!home) return;
    this.homeFocusX = home.x;
    this.homeFocusY = home.y;
    const camera = this.renderer.camera;
    camera.centerOn(home.x, home.y);
    // zoomBy takes a zoom-level multiplier; 1.6 brings the camera in from the
    // map-framing distance to roughly the default play distance.
    camera.zoomBy(1.6);
    this.homeZoomApplied = true;
  }

  /**
   * Keep the camera on the home base until the player takes control of it.
   * Returns true when the framing was re-applied.
   */
  private holdHomeFraming(): boolean {
    if (this.cameraTouched || this.homeFocusX === null || this.homeFocusY === null) return false;
    // Only during start-up: a few seconds of frames is plenty, and after that
    // the player owns the camera.
    if (this.frames > 240) return false;
    const camera = this.renderer.camera;
    const focus = camera.focus();
    const drift = Math.hypot(focus.x - this.homeFocusX, focus.y - this.homeFocusY);
    const coverage = this.renderer.groundCoverage();
    if (drift < FP_ONE && coverage > 0.9) return false;
    camera.centerOn(this.homeFocusX, this.homeFocusY);
    if (!this.homeZoomApplied) {
      camera.zoomBy(1.6);
      this.homeZoomApplied = true;
    }
    return true;
  }

  /** Called by any player camera action, which hands the camera over. */
  notifyCameraInput(): void {
    this.cameraTouched = true;
  }

  /* ---------------------------------------------------------------- *
   * Lifecycle
   * ---------------------------------------------------------------- */

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    const frame = (now: number): void => {
      if (!this.running) return;
      this.frames++;
      try {
        this.tick(now);
      } catch (error) {
        // The loop must survive anything a frame throws.
        this.lastDrawError = error instanceof Error ? error.message : String(error);
        if (this.lastDrawError !== this.reportedDrawError) {
          this.reportedDrawError = this.lastDrawError;
          console.error('frame loop error', error);
        }
      }
      this.rafHandle = requestAnimationFrame(frame);
    };
    this.rafHandle = requestAnimationFrame(frame);
  }

  stop(): void {
    this.running = false;
    if (this.rafHandle) cancelAnimationFrame(this.rafHandle);
    this.rafHandle = 0;
  }

  dispose(): void {
    this.stop();
    this.input.dispose();
    this.renderer.dispose();
    this.audio.dispose();
    this.hud.dispose();
  }

  private tick(now: number): void {
    const dt = Math.min(250, now - this.lastTime);
    this.lastTime = now;

    // fps: rolling average over the last 30 frames.
    this.frameTimes.push(dt);
    if (this.frameTimes.length > 30) this.frameTimes.shift();
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.fps = avg > 0 ? Math.round(1000 / avg) : 0;

    if (this.paused) {
      this.accumulator = 0;
    } else {
      this.accumulator += dt * this.speed;
      const stepMs = 1000 / TICK_RATE;
      let steps = 0;
      // Cap the catch-up work so a stalled tab cannot freeze the browser.
      while (this.accumulator >= stepMs && steps < 8) {
        this.stepOnce();
        this.accumulator -= stepMs;
        steps++;
      }
      if (steps >= 8) this.accumulator = 0;
    }
    const stepMs = 1000 / TICK_RATE;

    const alpha = Math.min(1, this.accumulator / stepMs);
    this.renderer.setInterpolation(alpha);
    this.draw();
  }

  /** Advance the simulation exactly one tick. */
  stepOnce(): void {
    for (const bot of this.bots) bot.update();
    this.game.step();
    this.elapsedTicks++;
  }

  /**
   * Draw one frame.
   *
   * The whole body is guarded: an exception anywhere in the render, audio or
   * HUD path used to escape `tick()`, which meant `requestAnimationFrame` was
   * never re-armed and the game froze permanently — the simulation kept running
   * underneath while the screen and the command card stopped updating. A render
   * error must never be able to kill the game loop.
   */
  private draw(): void {
    try {
      this.drawFrame();
      this.lastDrawError = null;
    } catch (error) {
      this.lastDrawError = error instanceof Error ? error.message : String(error);
      // Log once per distinct message so a repeating error cannot flood.
      if (this.lastDrawError !== this.reportedDrawError) {
        this.reportedDrawError = this.lastDrawError;
        console.error('frame failed', error);
      }
    }
  }

  private drawFrame(): void {
    this.holdHomeFraming();
    const snapshot = this.game.snapshot();
    this.lastSnapshot = snapshot;

    // A selected entity that died must not stay "selected".
    if (this.selection.length > 0) {
      const alive = new Set(snapshot.entities.map((e) => e.id));
      this.selection = this.selection.filter((id) => alive.has(id));
    }

    const fog = this.game.fogs[0];
    if (fog) {
      this.renderer.setFog({ visible: fog.visible, explored: fog.explored });
      if (this.minimapCanvas) this.renderer.renderMinimap(this.minimapCanvas, snapshot, {
        visible: fog.visible,
        explored: fog.explored,
      });
    }
    this.renderer.sync(snapshot, this.selection, this.hovered);
    this.renderer.draw();
    this.audio.update(snapshot, 0);
    const model = this.buildModel(snapshot);
    this.lastModelCommands = model.commands.length;
    this.hud.update(model);
  }

  /* ---------------------------------------------------------------- *
   * Commands
   * ---------------------------------------------------------------- */

  /** Enqueue a simulation command. Returns false when the game refused it. */
  issue(command: Command): boolean {
    if (this.game.isOver) return false;
    this.game.enqueue(command);
    return true;
  }

  /** Apply a command immediately (used by tests through window.__game). */
  applyNow(command: Command): boolean {
    return this.game.apply(command);
  }

  private selectedEntities(): Entity[] {
    const out: Entity[] = [];
    for (const id of this.selection) {
      const e = this.game.world.get(id);
      if (e) out.push(e);
    }
    return out;
  }

  selectEntity(id: number, additive: boolean): void {
    const e = this.game.world.get(id);
    if (!e) return;
    if (additive) {
      if (!this.selection.includes(id)) this.selection.push(id);
    } else {
      this.selection = [id];
    }
  }

  setSelection(ids: number[]): void {
    this.selection = ids.filter((id) => this.game.world.get(id) !== undefined).slice(0, 60);
  }

  /** Left click: select whatever is under the cursor. */
  clickSelect(worldX: number, worldY: number, cssX: number, cssY: number, additive: boolean): void {
    const id = this.pickAt(cssX, cssY);
    if (id !== 0) {
      this.selectEntity(id, additive);
      return;
    }
    // Clicking empty ground with nothing to select clears the selection.
    if (!additive) this.selection = [];
    void worldX;
    void worldY;
  }

  private pickAt(cssX: number, cssY: number): number {
    return this.renderer.pickEntity(cssX, cssY, this.lastSnapshot);
  }

  /** Drag box selection: only the local player's units. */
  boxSelect(rect: ScreenRect, additive: boolean): void {
    const ids = this.renderer.pickRect(rect, this.lastSnapshot);
    const mine = ids.filter((id) => {
      const e = this.game.world.get(id);
      return e !== undefined && e.owner === 0 && e.kind === EntityKind.Unit;
    });
    this.setSelection(additive ? [...this.selection, ...mine] : mine);
  }

  /** Double click: select every visible unit of the same type. */
  selectAllOfType(id: number): void {
    const target = this.game.world.get(id);
    if (!target) return;
    const ids: number[] = [];
    for (const e of this.game.world.all()) {
      if (e.owner !== 0 || e.kind !== target.kind) continue;
      if (e.def !== target.def) continue;
      ids.push(e.id);
    }
    this.setSelection(ids);
  }

  selectIdleVillager(): void {
    for (const e of this.game.world.all()) {
      if (e.owner !== 0 || e.kind !== EntityKind.Unit) continue;
      const def = UNITS[e.def];
      if (!def || def.role !== UnitRole.Worker) continue;
      if (e.orders.length > 0) continue;
      this.setSelection([e.id]);
      const terrain = this.game.world.map;
      this.renderer.camera.centerOn(e.x, e.y);
      void terrain;
      return;
    }
    this.hud.toast('No idle villagers');
  }

  selectAllMilitary(): void {
    const ids: number[] = [];
    for (const e of this.game.world.all()) {
      if (e.owner !== 0 || e.kind !== EntityKind.Unit) continue;
      const def = UNITS[e.def];
      if (!def) continue;
      if (def.role === UnitRole.Military || def.role === UnitRole.Siege) ids.push(e.id);
    }
    if (ids.length === 0) {
      this.hud.toast('No military units');
      return;
    }
    this.setSelection(ids);
  }

  assignControlGroup(index: number): void {
    this.controlGroups[index] = [...this.selection];
    this.hud.toast(`Control group ${index} set (${this.selection.length} units)`);
  }

  selectControlGroup(index: number, additive: boolean): void {
    const group = this.controlGroups[index] ?? [];
    const alive = group.filter((id) => this.game.world.get(id) !== undefined);
    if (alive.length === 0) return;
    this.setSelection(additive ? [...this.selection, ...alive] : alive);
  }

  /** Right click: issue a contextual order at a world position. */
  orderAt(worldX: number, worldY: number, cssX: number, cssY: number, queue: boolean, attackMove: boolean): void {
    const units = this.selectedEntities().filter((e) => e.owner === 0 && e.kind === EntityKind.Unit);
    if (units.length === 0) {
      // With a building selected, right click sets its rally point.
      const building = this.selectedEntities().find((e) => e.kind === EntityKind.Building && e.owner === 0);
      if (building) {
        this.issue({
          type: CommandType.SetRally,
          player: 0,
          building: building.id,
          x: worldX,
          y: worldY,
        });
      }
      return;
    }

    const targetId = this.pickAt(cssX, cssY);
    const target = targetId !== 0 ? this.game.world.get(targetId) : undefined;

    if (attackMove) {
      this.issue({
        type: CommandType.AttackMove,
        player: 0,
        units: units.map((e) => e.id),
        x: worldX,
        y: worldY,
        queue,
      });
      this.renderer.showOrderMarker(worldX, worldY, 'attack');
      return;
    }

    if (target) {
      if (target.owner !== 0) {
        this.issue({
          type: CommandType.Attack,
          player: 0,
          units: units.map((e) => e.id),
          target: target.id,
          queue,
        });
        this.renderer.showOrderMarker(target.x, target.y, 'attack');
        return;
      }
      if (target.kind === EntityKind.ResourceNode || target.def === 'farm') {
        this.issue({
          type: CommandType.Gather,
          player: 0,
          units: units.map((e) => e.id),
          target: target.id,
          queue,
        });
        this.renderer.showOrderMarker(target.x, target.y, 'gather');
        return;
      }
      if (target.kind === EntityKind.Building && target.owner === 0) {
        const def = BUILDINGS[target.def];
        if (def && def.garrisonCap > 0) {
          this.issue({
            type: CommandType.Garrison,
            player: 0,
            units: units.map((e) => e.id),
            building: target.id,
          });
          return;
        }
      }
      if (target.kind === EntityKind.Relic) {
        this.issue({
          type: CommandType.PickupRelic,
          player: 0,
          units: units.map((e) => e.id),
          target: target.id,
        });
        return;
      }
    }

    this.issue({
      type: CommandType.Move,
      player: 0,
      units: units.map((e) => e.id),
      x: worldX,
      y: worldY,
      queue,
    });
    this.renderer.showOrderMarker(worldX, worldY, 'move');
  }

  /* ---------------------------------------------------------------- *
   * Command card
   * ---------------------------------------------------------------- */

  /** Build the command card for the current selection. */
  computeCommands(): CommandButton[] {
    const buttons: CommandButton[] = [];
    const selected = this.selectedEntities();
    if (selected.length === 0) {
      this.commandTrace = 'no selection resolved';
      return buttons;
    }

    const player = this.game.world.players[0];
    if (!player) {
      this.commandTrace = 'no local player';
      return buttons;
    }

    // Buildings: train units, research, age up.
    const building = selected.find((e) => e.kind === EntityKind.Building);
    if (building) {
      this.commandTrace = `building branch: ${building.def} construction=${building.construction}`;
      const def = BUILDINGS[building.def];
      if (def && building.construction >= 1000) {
        let slot = 0;
        for (const unitId of def.trains) {
          const unit = UNITS[unitId];
          if (!unit) continue;
          if (unit.civ !== 'any' && unit.civ !== player.civ) continue;
          const eff = effectiveUnit(this.game.world, 0, unit);
          const affordable = canAfford(player.resources, eff.cost);
          const ageOk = player.age >= unit.age;
          buttons.push({
            id: `train:${unitId}:${building.id}`,
            slot: slot++,
            label: unit.name,
            hotkey: HOTKEYS[slot - 1] ?? '',
            cost: costLine(eff.cost),
            enabled: affordable && ageOk,
            affordable,
            tooltip: `${unit.name} — ${unit.blurb}`,
          });
          if (slot >= 12) break;
        }
        for (const techId of def.researches) {
          if (slot >= 12) break;
          const tech = TECHS[techId];
          if (!tech) continue;
          if (player.techs.has(techId) || player.researching.has(techId)) continue;
          if (tech.civ !== 'any' && tech.civ !== player.civ) continue;
          const affordable = canAfford(player.resources, tech.cost);
          buttons.push({
            id: `research:${techId}:${building.id}`,
            slot: slot++,
            label: tech.name,
            hotkey: HOTKEYS[slot - 1] ?? '',
            cost: costLine(tech.cost),
            enabled: affordable && player.age >= tech.age,
            affordable,
            tooltip: `${tech.name} — ${tech.blurb}`,
          });
        }
        // Ungarrison when someone is inside.
        let garrisoned = 0;
        for (const e of this.game.world.all()) if (e.inside === building.id) garrisoned++;
        if (garrisoned > 0 && slot < 12) {
          buttons.push({
            id: `ungarrison:${building.id}`,
            slot: slot++,
            label: 'Ungarrison',
            hotkey: HOTKEYS[slot - 1] ?? '',
            cost: '',
            enabled: true,
            affordable: true,
            tooltip: 'Release the units sheltering inside',
          });
        }
      }
      return buttons;
    }

    // Villagers: the build menu plus economic commands.
    const villagers = selected.filter((e) => UNITS[e.def]?.role === UnitRole.Worker);
    this.commandTrace = `villager branch: ${villagers.length}/${selected.length} workers, kinds=[${selected
      .map((e) => `${e.def}:${e.kind}`)
      .join(',')}]`;
    if (villagers.length > 0) {
      let slot = 0;
      for (const defId of BUILDABLE) {
        if (slot >= 10) break;
        const def = BUILDINGS[defId];
        if (!def) continue;
        if (def.civ !== 'any' && def.civ !== player.civ) continue;
        if (def.age > player.age) continue;
        const affordable = canAfford(player.resources, def.cost);
        buttons.push({
          id: `build:${defId}`,
          slot: slot++,
          label: def.name,
          hotkey: HOTKEYS[slot - 1] ?? '',
          cost: costLine(def.cost),
          enabled: affordable,
          affordable,
          tooltip: `${def.name} — ${def.blurb}`,
        });
      }
      const landmarkAge = (player.age + 1) as 1 | 2 | 3;
      if (player.age < 3) {
        for (const landmarkId of landmarkChoices(player.civ, landmarkAge)) {
          if (!landmarkId || slot >= 12) continue;
          const def = BUILDINGS[landmarkId];
          if (!def) continue;
          const affordable = canAfford(player.resources, def.cost);
          buttons.push({
            id: `build:${landmarkId}`,
            slot: slot++,
            label: `Age up: ${def.name}`,
            hotkey: HOTKEYS[slot - 1] ?? '',
            cost: costLine(def.cost),
            enabled: affordable,
            affordable,
            tooltip: `Advance to ${
              ['Dark Age', 'Feudal Age', 'Castle Age', 'Imperial Age'][landmarkAge] ?? ''
            } — ${def.blurb}`,
          });
        }
      }
      return buttons;
    }

    // Military: stances and orders.
    let slot = 0;
    const push = (id: string, label: string, tooltip: string): void => {
      buttons.push({
        id,
        slot: slot,
        label,
        hotkey: HOTKEYS[slot] ?? '',
        cost: '',
        enabled: true,
        affordable: true,
        tooltip,
      });
      slot++;
    };
    push('order:stop', 'Stop', 'Cancel all orders');
    push('order:hold', 'Stand Ground', 'Hold position and fight only in reach');
    if (selected.some((e) => UNITS[e.def]?.role === UnitRole.Monk)) {
      push('order:heal', 'Heal', 'Heal the nearest wounded ally');
    }
    return buttons;
  }

  /** Execute a command card button. */
  private runCommandButton(id: string): void {
    const [kind, arg, extra] = id.split(':');
    const selected = this.selectedEntities();
    const unitIds = selected.filter((e) => e.kind === EntityKind.Unit && e.owner === 0).map((e) => e.id);

    if (kind === 'train' && arg) {
      const building = extra ? Number(extra) : 0;
      this.issue({ type: CommandType.Train, player: 0, building, defId: arg, count: 1 });
      return;
    }
    if (kind === 'research' && arg) {
      const building = extra ? Number(extra) : 0;
      this.issue({ type: CommandType.Research, player: 0, building, techId: arg });
      return;
    }
    if (kind === 'ungarrison' && arg) {
      this.issue({ type: CommandType.Ungarrison, player: 0, building: Number(arg) });
      return;
    }
    if (kind === 'build' && arg) {
      this.pendingBuild = arg;
      this.hud.toast('Click the ground to place the building');
      return;
    }
    if (kind === 'order') {
      if (arg === 'stop') this.issue({ type: CommandType.Stop, player: 0, units: unitIds });
      else if (arg === 'hold') this.issue({ type: CommandType.Hold, player: 0, units: unitIds });
      else if (arg === 'heal') this.orderHeal(unitIds);
    }
  }

  private orderHeal(monkIds: number[]): void {
    let best: Entity | null = null;
    let bestRatio = 1;
    for (const e of this.game.world.all()) {
      if (e.owner !== 0) continue;
      if (e.kind !== EntityKind.Unit && e.kind !== EntityKind.Building) continue;
      const ratio = e.hp / Math.max(1, e.maxHp);
      if (ratio < bestRatio) {
        bestRatio = ratio;
        best = e;
      }
    }
    if (!best) {
      this.hud.toast('Nothing to heal');
      return;
    }
    this.issue({ type: CommandType.Heal, player: 0, units: monkIds, target: best.id, queue: false });
  }

  /** Set when the player picked a building from the command card. */
  pendingBuild: string | null = null;

  /** Place the pending building at a world position. */
  placePendingBuild(worldX: number, worldY: number): boolean {
    const defId = this.pendingBuild;
    if (!defId) return false;
    const def = BUILDINGS[defId];
    if (!def) return false;
    const tileX = (worldX >> 10) - (def.width >> 1);
    const tileY = (worldY >> 10) - (def.height >> 1);
    const workers = this.selectedEntities()
      .filter((e) => e.kind === EntityKind.Unit && UNITS[e.def]?.canBuild)
      .map((e) => e.id);
    // Apply immediately so the caller learns whether the spot is actually legal.
    // Enqueuing always "succeeded", so a blocked placement was reported as
    // accepted: the player lost the ghost and no building ever appeared.
    const ok = this.applyNow({
      type: CommandType.Build,
      player: 0,
      units: workers,
      defId,
      tileX,
      tileY,
      queue: false,
    });
    if (!ok) {
      // Stay armed so the player can try another spot.
      this.hud.toast('Cannot build there — try another spot');
      return false;
    }
    this.pendingBuild = null;
    this.renderer.showOrderMarker(worldX, worldY, 'build');
    return true;
  }

  cancelPendingBuild(): void {
    this.pendingBuild = null;
  }

  /* ---------------------------------------------------------------- *
   * HUD model
   * ---------------------------------------------------------------- */

  private buildModel(snapshot: StateSnapshot): HudModel {
    const score: ScoreRow[] = snapshot.players.map((p) => ({
      playerId: p.id,
      name: p.name,
      civ: p.civ,
      color: PLAYER_COLORS[p.id % PLAYER_COLORS.length] as number,
      age: p.age,
      score: scoreOf(p),
      pop: p.pop,
      popCap: p.popCap,
      defeated: p.defeated,
      isLocal: p.id === 0,
      isAlly: false,
    }));

    const objectives: ObjectiveRow[] = this.buildObjectives(snapshot);
    let idle = 0;
    for (const e of this.game.world.all()) {
      if (e.owner !== 0 || e.kind !== EntityKind.Unit) continue;
      const def = UNITS[e.def];
      if (def?.role === UnitRole.Worker && e.orders.length === 0) idle++;
    }

    return {
      snapshot,
      selection: this.selection,
      hovered: this.hovered,
      commands: this.computeCommands(),
      controlGroups: this.controlGroups,
      score,
      objectives,
      idleVillagers: idle,
      localPlayer: 0,
      elapsed: snapshot.tick / TICK_RATE,
      result: snapshot.over
        ? { over: true, winner: snapshot.winner, reason: snapshot.reason }
        : null,
      fps: this.fps,
    };
  }

  private buildObjectives(snapshot: StateSnapshot): ObjectiveRow[] {
    const rows: ObjectiveRow[] = [];
    const condition = snapshot.victory;
    if (condition === VictoryCondition.Landmarks) {
      for (const p of snapshot.players) {
        if (p.id === 0) continue;
        rows.push({
          label: `Destroy ${p.name}'s landmarks`,
          progress: -1,
          detail: `${p.landmarks} landmark(s) standing`,
          done: p.defeated,
        });
      }
    } else if (condition === VictoryCondition.SacredSites) {
      const progress = snapshot.objectives.find((o) => o.playerId === 0);
      const held = progress ? Number(progress.sacredSitesHeld ?? 0) : 0;
      const ticks = progress ? Number(progress.sacredHoldTicks ?? 0) : 0;
      const needed = progress ? Number(progress.sacredTicksNeeded ?? 1) : 1;
      rows.push({
        label: 'Hold the sacred sites',
        progress: Math.min(1, ticks / Math.max(1, needed)),
        detail: `${held} site(s) held — ${Math.round(ticks / TICK_RATE)}s / ${Math.round(needed / TICK_RATE)}s`,
        done: ticks >= needed,
      });
    } else {
      const progress = snapshot.objectives.find((o) => o.playerId === 0);
      const ticks = progress ? Number(progress.wonderTicks ?? 0) : 0;
      const needed = progress ? Number(progress.wonderTicksNeeded ?? 1) : 1;
      rows.push({
        label: 'Complete a Wonder and hold it',
        progress: Math.min(1, ticks / Math.max(1, needed)),
        detail: `${Math.round(ticks / TICK_RATE)}s / ${Math.round(needed / TICK_RATE)}s`,
        done: ticks >= needed,
      });
    }
    return rows;
  }

  /* ---------------------------------------------------------------- *
   * Test surface
   * ---------------------------------------------------------------- */

  snapshot(): StateSnapshot {
    return this.game.snapshot();
  }

  hash(): number {
    return this.game.hash();
  }

  currentFps(): number {
    return this.fps;
  }

  /** Stop the real-time loop from advancing the simulation. */
  pause(): void {
    this.paused = true;
    this.accumulator = 0;
  }

  /** Resume normal real-time simulation. */
  resume(): void {
    this.paused = false;
    this.lastTime = performance.now();
  }

  isPaused(): boolean {
    return this.paused;
  }

  setSpeed(multiplier: number): void {
    this.speed = Math.max(0.25, Math.min(8, multiplier));
  }

  /** Advance the simulation by n ticks without waiting for real time. */
  fastForward(ticks: number): void {
    for (let i = 0; i < ticks; i++) this.stepOnce();
  }

  get isOver(): boolean {
    return this.game.isOver;
  }

  setSelectionBox(rect: ScreenRect | null): void {
    this.selectionBox = rect;
    this.renderer.setSelectionBox(rect);
  }

  getSelectionBox(): ScreenRect | null {
    return this.selectionBox;
  }

  toast(message: string): void {
    this.hud.toast(message);
  }

  /**
   * One-shot diagnostic blob for support: everything needed to tell a broken
   * viewport apart from a working one without a back-and-forth.
   */
  diagnose(): Record<string, unknown> {
    const canvas = this.renderer.canvasInfo();
    const fog = this.game.fogs[0];
    let visibleTiles = 0;
    let exploredTiles = 0;
    if (fog) {
      for (let i = 0; i < fog.visible.length; i++) {
        if (fog.visible[i]) visibleTiles++;
        if (fog.explored[i]) exploredTiles++;
      }
    }
    const camera = this.renderer.camera;
    const focus = camera.focus();
    let units = 0;
    let buildings = 0;
    let resources = 0;
    for (const e of this.game.world.all()) {
      if (e.kind === EntityKind.Unit) units++;
      else if (e.kind === EntityKind.Building) buildings++;
      else if (e.kind === EntityKind.ResourceNode) resources++;
    }
    return {
      build: buildId(),
      canvas,
      webgl: this.renderer.contextKind(),
      dpr: typeof window === 'undefined' ? 1 : window.devicePixelRatio,
      camera: {
        focusTiles: [Math.round(focus.x / 1024), Math.round(focus.y / 1024)],
        distance: Math.round(camera.distance() * 10) / 10,
        rotation: camera.rotation(),
        coverage: Math.round(this.renderer.groundCoverage() * 100) / 100,
      },
      mapTiles: [this.game.world.map.width, this.game.world.map.height],
      terrainBounds: this.renderer.terrainBounds(),
      fog: { visibleTiles, exploredTiles, totalTiles: fog ? fog.visible.length : 0 },
      renderer: this.renderer.stats(),
      counts: { units, buildings, resources },
      frame: this.debugFrame(),
      match: { tick: this.game.world.tick, over: this.game.isOver },
    };
  }

  /** Frame diagnostics: how many commands the HUD was given, and any error. */
  debugFrame(): {
    commands: number;
    selection: number;
    resolved: number;
    selectionIds: number[];
    error: string | null;
    frames: number;
    running: boolean;
    trace: string;
    tick: number;
  } {
    return {
      commands: this.lastModelCommands,
      selection: this.selection.length,
      resolved: this.selectedEntities().length,
      selectionIds: [...this.selection],
      error: this.lastDrawError,
      frames: this.frames,
      running: this.running,
      trace: this.commandTrace,
      tick: this.game.world.tick,
    };
  }

  /** Enable or mute procedural audio. */
  setAudioEnabled(enabled: boolean): void {
    this.audio.setEnabled(enabled);
  }

  setHovered(id: number): void {
    this.hovered = id;
  }

  /** World position of the local player's Town Center, for the Home key. */
  homePosition(): { x: number; y: number } {
    for (const e of this.game.world.all()) {
      if (e.owner === 0 && e.def === 'town_center') return { x: e.x, y: e.y };
    }
    return { x: (this.game.world.map.width << 10) / 2, y: (this.game.world.map.height << 10) / 2 };
  }

  selectAllTownCenters(): void {
    const ids: number[] = [];
    for (const e of this.game.world.all()) {
      if (e.owner === 0 && e.kind === EntityKind.Building && e.def === 'town_center') ids.push(e.id);
    }
    if (ids.length === 0) {
      this.hud.toast('No Town Center');
      return;
    }
    this.setSelection(ids);
    const first = ids[0] !== undefined ? this.game.world.get(ids[0]) : undefined;
    if (first) this.renderer.camera.centerOn(first.x, first.y);
  }

  /** Called by the input controller for keyboard shortcuts. */
  handleHotkey(key: string, ctrl: boolean, shift: boolean): boolean {
    if (key >= '0' && key <= '9' && ctrl) {
      this.assignControlGroup(Number(key));
      return true;
    }
    if (key >= '0' && key <= '9') {
      this.selectControlGroup(Number(key), shift);
      return true;
    }
    switch (key.toLowerCase()) {
      case 'h':
        this.selectAllTownCenters();
        return true;
      case '.':
        this.selectIdleVillager();
        return true;
      case 'a':
        this.input.armAttackMove();
        return true;
      case 's': {
        const units = this.selectedEntities().filter((e) => e.kind === EntityKind.Unit).map((e) => e.id);
        this.issue({ type: CommandType.Stop, player: 0, units });
        return true;
      }
      case 'g': {
        this.hud.toast('Right click a resource to gather');
        return true;
      }
      case 'delete':
      case 'backspace': {
        const units = this.selectedEntities().filter((e) => e.kind === EntityKind.Unit).map((e) => e.id);
        this.issue({ type: CommandType.Delete, player: 0, units });
        return true;
      }
      case 'escape':
        this.cancelPendingBuild();
        this.input.disarmAttackMove();
        return true;
      default:
        return false;
    }
  }

  get now(): number {
    return this.game.world.tick / TICK_RATE;
  }

  /** Seconds of simulated time elapsed. */
  get simulatedSeconds(): number {
    return this.elapsedTicks / TICK_RATE;
  }
}

/**
 * Player score, following the AoE IV idea of military + economy + technology
 * + society, expressed with the statistics the simulation actually tracks.
 */
function scoreOf(p: StateSnapshot['players'][number]): number {
  const stats = p.stats as {
    unitsKilled?: number;
    unitsTrained?: number;
    buildingsBuilt?: number;
    resourcesGathered?: { food: number; wood: number; gold: number; stone: number };
  };
  const gathered = stats.resourcesGathered;
  const resources = gathered
    ? gathered.food + gathered.wood + gathered.gold + gathered.stone
    : 0;
  return Math.round(
    (stats.unitsKilled ?? 0) * 10 +
      (stats.unitsTrained ?? 0) * 2 +
      (stats.buildingsBuilt ?? 0) * 5 +
      resources / 100 +
      p.techs.length * 20 +
      p.landmarks * 30,
  );
}

/** Build menu contents for villagers, in AoE IV priority order. */
const BUILDABLE = [
  'house',
  'mill',
  'farm',
  'lumber_camp',
  'mining_camp',
  'barracks',
  'archery_range',
  'stable',
  'blacksmith',
  'market',
  'monastery',
  'siege_workshop',
  'university',
  'outpost',
  'palisade_wall',
  'palisade_gate',
  'stone_wall',
  'stone_gate',
  'keep',
  'wonder',
  'town_center',
];

/** Command card hotkey letters, AoE IV's Q W E R / A S D / Z X C grid. */
const HOTKEYS = ['Q', 'W', 'E', 'R', 'A', 'S', 'D', 'Z', 'X', 'C', 'V', 'F'];

function costLine(cost: { food: number; wood: number; gold: number; stone: number }): string {
  const parts: string[] = [];
  if (cost.food) parts.push(`${cost.food}F`);
  if (cost.wood) parts.push(`${cost.wood}W`);
  if (cost.gold) parts.push(`${cost.gold}G`);
  if (cost.stone) parts.push(`${cost.stone}S`);
  return parts.join(' ');
}

export { FP_ONE, costLine, HOTKEYS, PLAYER_COLORS, STARTING_RESOURCES };
