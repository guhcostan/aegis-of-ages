/**
 * HUD and menu contracts.
 *
 * The HUD mirrors the Age of Empires IV layout: resource bar with
 * villagers-per-resource, selection panel, command card grid, production
 * queues, minimap, age indicator, idle-villager and select-all-military
 * buttons, global queue, scoreboard and objectives panel.
 *
 * The HUD is a pure view: every interaction is reported through HudCallbacks,
 * which the session translates into simulation commands.
 */
import type { StateSnapshot } from '../sim/game';

/** One button in the command card grid (bottom centre of the HUD). */
export interface CommandButton {
  /** Stable id, used by tests and by the keyboard grid (Q W E R / A S D / Z X C). */
  id: string;
  /** Grid slot, row-major, 0-based (4 columns x 3 rows). */
  slot: number;
  /** Short label shown under the icon. */
  label: string;
  /** Hotkey letter displayed on the button. */
  hotkey: string;
  /** Resource cost line, e.g. "60F 20W". Empty for free actions. */
  cost: string;
  /** False when the player cannot currently afford or use it. */
  enabled: boolean;
  /** Tooltip text. */
  tooltip: string;
  /** Which resource to tint the cost text with, when unaffordable. */
  affordable: boolean;
}

export interface ScoreRow {
  playerId: number;
  name: string;
  civ: string;
  color: number;
  age: number;
  score: number;
  pop: number;
  popCap: number;
  defeated: boolean;
  isLocal: boolean;
  isAlly: boolean;
}

export interface ObjectiveRow {
  label: string;
  /** 0..1 progress, or -1 for a binary objective. */
  progress: number;
  detail: string;
  done: boolean;
}

/** Everything the HUD needs for one frame. */
export interface HudModel {
  snapshot: StateSnapshot;
  /** Entity ids currently selected by the local player. */
  selection: number[];
  /** Entity id under the cursor, or 0. */
  hovered: number;
  /** Command card contents for the current selection. */
  commands: CommandButton[];
  /** Control groups 0-9, by entity id. */
  controlGroups: number[][];
  /** Rows for the scoreboard. */
  score: ScoreRow[];
  /** Rows for the objectives panel. */
  objectives: ObjectiveRow[];
  /** Number of idle villagers owned by the local player. */
  idleVillagers: number;
  /** Local player id. */
  localPlayer: number;
  /** Match elapsed time in seconds. */
  elapsed: number;
  /** Set once the match ends, to show the victory screen. */
  result: { over: boolean; winner: number; reason: string } | null;
  /** Client-side fps counter value. */
  fps: number;
}

export interface HudCallbacks {
  /** A command card button was pressed. */
  onCommand(id: string): void;
  /** The player clicked a unit in the selection panel. */
  onSelectEntity(id: number, additive: boolean): void;
  /** The player clicked the idle villager button. */
  onIdleVillager(): void;
  /** The player clicked the select-all-military button. */
  onSelectAllMilitary(): void;
  /** The player clicked the minimap at a world position (fixed point). */
  onMinimapClick(x: number, y: number, button: number): void;
  /** The player selected a control group. */
  onControlGroup(index: number, additive: boolean): void;
  /** The player assigned the current selection to a control group. */
  onAssignControlGroup(index: number): void;
  /** The player cancelled the current production queue entry. */
  onCancelQueue(building: number, index: number): void;
  /** The player toggled the scoreboard. */
  onToggleScoreboard(): void;
  /** Camera shortcuts that the HUD forwards (arrow keys, Home, etc). */
  onCameraKey(key: string, shift: boolean, ctrl: boolean): void;
}

export interface Hud {
  /** Rebuild the DOM from a model. Cheap enough to call every frame. */
  update(model: HudModel): void;
  /** The live minimap canvas, which the session paints every frame. */
  getMinimapCanvas(): HTMLCanvasElement;
  /** Map dimensions in tiles, so minimap clicks resolve to the right world point. */
  setWorldSize(widthTiles: number, heightTiles: number): void;
  /** Show or hide the whole HUD. */
  setVisible(visible: boolean): void;
  /** Flash a short message in the middle of the screen. */
  toast(message: string): void;
  dispose(): void;
}

/** Skirmish lobby configuration produced by the main menu. */
export interface LobbySettings {
  playerName: string;
  civ: 'english' | 'french';
  mapSize: 'tiny' | 'small' | 'medium' | 'large' | 'huge';
  mapType: string;
  bots: Array<{ civ: 'english' | 'french'; difficulty: 0 | 1 | 2; team: number }>;
  victory: 0 | 1 | 2;
  startingResources: 'standard' | 'high' | 'veryhigh';
  seed: number;
  revealMap: boolean;
  /**
   * When true the local player is driven by the AI as well, which is how the
   * bot-vs-bot acceptance test runs. Not exposed in the menu.
   */
  playerAsBot?: boolean;
  /** Bot profile used for the local player when `playerAsBot` is set. */
  playerBotDifficulty?: 0 | 1 | 2;
}

export interface Menu {
  /** Show the menu; `onStart` receives the chosen settings. */
  show(onStart: (settings: LobbySettings) => void, onQuit?: () => void): void;
  hide(): void;
  dispose(): void;
}

export type { StateSnapshot };

/** Default skirmish settings: English vs one Intermediate French bot. */
export const DEFAULT_LOBBY: LobbySettings = {
  playerName: 'You',
  civ: 'english',
  mapSize: 'medium',
  mapType: 'grassland',
  bots: [{ civ: 'french', difficulty: 1, team: 0 }],
  victory: 0,
  startingResources: 'standard',
  seed: 1234,
  revealMap: false,
};
