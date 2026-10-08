/**
 * HUD — the in-match interface, laid out after a classic RTS command bar.
 *
 * CONTRACTS FOR THE SESSION (read before wiring the HUD up)
 * --------------------------------------------------------
 * 1. Minimap canvas. `createHud(...)` returns a HudHandle that adds
 *    `getMinimapCanvas(): HTMLCanvasElement` to the frozen `Hud` interface.
 *    That canvas is live: the session paints it every frame with
 *    `Renderer.renderMinimap(canvas, snapshot, fog)`. The HUD itself never
 *    draws into it, and never resizes it.
 *
 *    Click mapping: the HUD converts a click into fixed-point world
 *    coordinates with `world = (offset / cssSize) * tiles * FP_ONE`
 *    (FP_ONE = 1024, so exactly `tile * 1024`). It needs the map size in
 *    tiles to do that, and the snapshot does not carry one:
 *
 *        hud.setWorldSize(map.width, map.height);   // REQUIRED, once, at match start
 *
 *    Renderer.renderMinimap sizes the canvas to its CSS box times the device
 *    pixel ratio (see src/render/minimap.ts), so canvas.width is *not* the
 *    tile count. Until setWorldSize() is called the HUD falls back to one map
 *    tile per canvas pixel, which is only correct for a canvas that happens to
 *    be sized to the map in tiles.
 *
 * 2. `onMinimapClick(x, y, button)` — `x`/`y` are fixed-point world
 *    coordinates (tile << 10, clamped to the map), `button` is the raw
 *    MouseEvent button (0 = left, 2 = right). Dragging while held repeats.
 *
 * 3. `onCameraKey(key, shift, ctrl)` — the HUD forwards camera input from the
 *    minimap: the canvas takes keyboard focus when clicked, and arrow keys /
 *    Home / Backspace / '[' / ']' pressed there are forwarded (the event is
 *    consumed, so a global handler will not see it twice). The three buttons
 *    under the minimap forward '[', ']' and 'Home'. Key strings used:
 *    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'Backspace',
 *    '[', ']'.
 *
 * 4. Hotkeys on the command card are *rendered*, never handled: the session
 *    owns all key handling. A command whose `hotkey` is empty falls back to
 *    the grid letter of its slot (Q W E R / A S D / Z X C).
 *
 * 5. Data imports. Everything the HUD takes from `src/sim` is type-only
 *    (`import type`) except the two static definition tables `UNITS` and
 *    `BUILDINGS`. The frozen `HudModel` carries no definition table, so the
 *    selection panel reads those two pure-data modules (no DOM, no state, no
 *    behaviour) to show real attack / armour / range / speed values. The HUD
 *    never reads or mutates simulation state.
 *
 * All art is original: every icon and portrait is inline SVG or CSS.
 */
import './hud.css';
import { BUILDINGS } from '../sim/data/buildings';
import { UNITS } from '../sim/data/units';
import type { BuildingDef, UnitDef } from '../sim/types';
import type { Hud, HudCallbacks, HudModel, ObjectiveRow, StateSnapshot } from './types';

/** One entity row of the frozen snapshot (re-exported from src/sim/game.ts). */
type EntitySnapshot = StateSnapshot['entities'][number];

/* ------------------------------------------------------------------ *
 * Mirrored simulation constants.
 * Restated as plain numbers so the HUD keeps a type-only dependency on the
 * simulation; each value is part of the frozen snapshot contract.
 * ------------------------------------------------------------------ */

/** src/sim/constants.ts — one map tile in fixed point. */
const FP_ONE = 1024;
/** src/sim/constants.ts — simulation ticks per second. */
const TICK_RATE = 20;
/** src/sim/types.ts EntityKind. */
const KIND_UNIT = 1;
const KIND_BUILDING = 2;
/** src/sim/constants.ts VictoryCondition order. */
const VICTORY_NAMES: ReadonlyArray<string> = ['Landmarks', 'Sacred Sites', 'Wonder'];
/** src/sim/constants.ts UnitRole order. */
const ROLE_WORKER = 0;
const ROLE_MONK = 2;
const ROLE_SCOUT = 3;
const ROLE_TRADE = 4;
const ROLE_SIEGE = 5;
/** src/sim/types.ts UnitClass order. */
const CLASS_CAVALRY = 1;
const CLASS_RANGED = 2;
const CLASS_SIEGE = 3;
/** src/sim/types.ts BuildingKind order. */
const BK_DROPOFF = 0;
const BK_HOUSE = 1;
const BK_PRODUCTION = 2;
const BK_RESEARCH = 3;
const BK_DEFENSIVE = 4;
const BK_WALL = 5;
const BK_GATE = 6;
const BK_LANDMARK = 7;
const BK_WONDER = 8;
/** Sacred-site / wonder countdowns, in ticks (src/sim/constants.ts). */
const SACRED_SITES_NEEDED = 3;
const SACRED_HOLD_TICKS = TICK_RATE * 60 * 5;
const WONDER_TICKS = TICK_RATE * 60 * 10;
/** Default command-card grid letters (grid-key profile, 4 columns x 3 rows). */
const GRID_KEYS: ReadonlyArray<string> = ['Q', 'W', 'E', 'R', 'A', 'S', 'D', 'F', 'Z', 'X', 'C', 'V'];
/** Player colours by slot, used for portrait rings and score dots. */
const PLAYER_COLORS: ReadonlyArray<string> = ['#5b8dd6', '#c94f3d', '#4fa863', '#c9a13a', '#9b6bd6', '#3fb0a8'];
const AGE_NUMERALS: ReadonlyArray<string> = ['I', 'II', 'III', 'IV'];
const RESOURCE_KEYS = ['food', 'wood', 'gold', 'stone'] as const;
type ResourceKey = (typeof RESOURCE_KEYS)[number];
const RESOURCE_LABELS: Record<ResourceKey, string> = {
  food: 'Food',
  wood: 'Wood',
  gold: 'Gold',
  stone: 'Stone',
};

/* ------------------------------------------------------------------ *
 * Inline SVG icon library (original art, drawn from primitives)
 * ------------------------------------------------------------------ */

function svgWrap(inner: string): string {
  return (
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    inner +
    '</svg>'
  );
}

const ICON: Record<string, string> = {
  food: svgWrap(
    '<path d="M12 21V8"/><path d="M12 9C12 6.4 10.2 4.4 7.7 4.4 7.7 7 9.5 9 12 9Z"/>' +
      '<path d="M12 9c0-2.6 1.8-4.6 4.3-4.6C16.3 7 14.5 9 12 9Z"/>' +
      '<path d="M12 15.5c0-2.3-1.6-4.1-3.8-4.1 0 2.3 1.6 4.1 3.8 4.1Z"/>' +
      '<path d="M12 15.5c0-2.3 1.6-4.1 3.8-4.1 0 2.3-1.6 4.1-3.8 4.1Z"/>',
  ),
  wood: svgWrap(
    '<rect x="3" y="14" width="15" height="6" rx="3"/><rect x="6" y="8" width="15" height="6" rx="3"/>' +
      '<circle cx="5" cy="17" r="1.2"/><circle cx="8" cy="11" r="1.2"/>',
  ),
  gold: svgWrap('<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.6"/><path d="M12 3v2M12 19v2"/>'),
  stone: svgWrap(
    '<path d="M4 19h16"/><path d="M6 19v-3.5l2.6-1.8L11 15.5V19"/><path d="M12.6 19v-5l2.6-1.8L18 14v5"/>',
  ),
  pop: svgWrap(
    '<circle cx="9" cy="8" r="3"/><path d="M3.6 19.5c0-3 2.4-5.2 5.4-5.2s5.4 2.2 5.4 5.2"/>' +
      '<path d="M16.2 6.6a3 3 0 0 1 0 5.4"/><path d="M17.2 14.6c2 .6 3.2 2.4 3.2 4.9"/>',
  ),
  age: svgWrap('<path d="M12 3l2.3 5.3 5.7.6-4.3 3.8 1.2 5.6L12 15.5 7.1 18.3l1.2-5.6L4 8.9l5.7-.6z"/>'),
  sword: svgWrap('<path d="M20 3l-9.5 9.5"/><path d="M14.5 3H21v6.5"/><path d="M7 14l3 3"/><path d="M4 20l3.5-3.5"/>'),
  shield: svgWrap('<path d="M12 3l7 2.8v5.4c0 4.2-2.9 7.4-7 9.3-4.1-1.9-7-5.1-7-9.3V5.8z"/><path d="M12 7v8"/>'),
  bow: svgWrap('<path d="M5 4c8.3 0 15 6.7 15 15"/><path d="M5 4l15 15"/><path d="M20 6l-5 5"/>'),
  boot: svgWrap('<path d="M3 12h10"/><path d="M9 7l5 5-5 5"/><path d="M15 7l5 5-5 5"/>'),
  heart: svgWrap(
    '<path d="M12 20.2S4.6 15.8 4.6 10.4A4.2 4.2 0 0 1 12 7.4a4.2 4.2 0 0 1 7.4 3c0 5.4-7.4 9.8-7.4 9.8Z"/>',
  ),
  clock: svgWrap('<circle cx="12" cy="13" r="8"/><path d="M12 9v4.2l3 1.8"/><path d="M9.4 2.4h5.2"/>'),
  score: svgWrap(
    '<path d="M8 4h8v4.6a4 4 0 0 1-8 0z"/><path d="M8 5H5.2v1.8A3 3 0 0 0 8 9.6"/>' +
      '<path d="M16 5h2.8v1.8A3 3 0 0 1 16 9.6"/><path d="M12 12.6V16"/><path d="M9 20h6"/>',
  ),
  idle: svgWrap(
    '<circle cx="9.5" cy="7.5" r="2.8"/><path d="M4 19.5c0-3 2.4-5.2 5.5-5.2"/>' +
      '<path d="M13.5 11.5h6l-6 6h6"/>',
  ),
  army: svgWrap('<path d="M4 4l12 12"/><path d="M20 4L8 16"/><path d="M13.5 19.5L16 17"/><path d="M4.5 13.5L7 11"/>'),
  list: svgWrap('<path d="M4 6.5h16M4 12h16M4 17.5h10"/>'),
  hourglass: svgWrap(
    '<path d="M7 3h10M7 21h10"/><path d="M8.5 3v3.6L12 10l3.5-3.4V3"/><path d="M8.5 21v-3.6L12 14l3.5 3.4V21"/>',
  ),
  cancel: svgWrap('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>'),
  rotateLeft: svgWrap('<path d="M20 13a8 8 0 1 1-2.6-6.4"/><path d="M4.4 3.6v4.2h4.2"/>'),
  rotateRight: svgWrap('<path d="M4 13a8 8 0 1 0 2.6-6.4"/><path d="M19.6 3.6v4.2h-4.2"/>'),
  recenter: svgWrap('<path d="M4 11l8-7 8 7"/><path d="M6.5 11v8.5h11V11"/><path d="M12 14v4"/>'),
  hammer: svgWrap(
    '<path d="M4 20l6.5-6.5"/><path d="M10.5 13.5l3-3 6.5 6.5-3 3z"/><path d="M9 3l4.5 4.5-2 2L7 5z"/>',
  ),
  basket: svgWrap('<path d="M4 10h16l-1.7 9.5H5.7z"/><path d="M8 10c0-2.2 1.8-4 4-4s4 1.8 4 4"/>'),
  move: svgWrap('<path d="M3.5 12h13"/><path d="M12 7l5 5-5 5"/>'),
  flag: svgWrap('<path d="M6 21V4"/><path d="M6 5h11l-2.6 3.4L17 12H6z"/>'),
  flask: svgWrap('<path d="M9.5 3h5v6l4 10.5h-13L9.5 9z"/><path d="M7.6 15.5h8.8"/>'),
  house: svgWrap('<path d="M4 11l8-7 8 7"/><path d="M6.5 11v8.5h11V11"/><path d="M10.5 19.5v-4.5h3v4.5"/>'),
  tower: svgWrap('<path d="M6 20V8l6-4 6 4v12z"/><path d="M6 8h12"/><path d="M10 20v-5h4v5"/>'),
  wall: svgWrap('<path d="M3 19v-6h18v6"/><path d="M7 13v-3h10v3"/><path d="M12 13v6M7 19v-6"/>'),
  crate: svgWrap('<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M4 12h16M12 4v16"/>'),
  person: svgWrap('<circle cx="12" cy="8" r="3.2"/><path d="M5 20c0-3.5 3.1-6.2 7-6.2S19 16.5 19 20"/>'),
  cog: svgWrap(
    '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/>' +
      '<path d="M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/>',
  ),
};

/** Picks an icon for a command-card entry or queue row from its id and label. */
function commandIcon(id: string, label: string): string {
  const key = `${id} ${label}`.toLowerCase();
  const words = key.split(/[^a-z0-9]+/);
  const hasWord = (...candidates: string[]): boolean => candidates.some((word) => words.includes(word));
  const has = (...parts: string[]): boolean => parts.some((part) => key.includes(part));
  if (has('attackmove', 'attack-move', 'attack_move', 'attack move')) return ICON.sword;
  if (has('cancel', 'abort')) return ICON.cancel;
  if (hasWord('stop') || hasWord('hold')) return ICON.shield;
  if (hasWord('move', 'patrol', 'rally')) return ICON.move;
  if (has('gather', 'return', 'drop')) return ICON.basket;
  if (has('build', 'repair')) return ICON.hammer;
  if (has('research', 'tech', 'upgrade', 'unlock')) return ICON.flask;
  // Word match: "villager" contains the substring "age".
  if (hasWord('age', 'advance', 'landmark')) return ICON.age;
  if (has('villager', 'worker', 'peasant')) return ICON.person;
  if (has('monk', 'relic', 'heal', 'convert')) return ICON.heart;
  if (has('trade', 'merchant', 'caravan')) return ICON.basket;
  if (has('trebuchet', 'mangonel', 'springald', 'ram', 'siege', 'bombard')) return ICON.hourglass;
  if (has('longbow', 'crossbow', 'arbalest', 'archer', 'bow')) return ICON.bow;
  if (has('knight', 'horseman', 'scout', 'cavalry', 'lancer')) return ICON.flag;
  if (has('spear', 'manatarms', 'man-at-arms', 'infantry', 'sword', 'militia')) return ICON.sword;
  if (has('farm')) return ICON.food;
  if (has('mill', 'lumber', 'mining', 'camp', 'depot', 'dropoff')) return ICON.crate;
  if (has('shelter', 'garrison', 'bell')) return ICON.house;
  if (has('house')) return ICON.house;
  if (hasWord('tower', 'keep', 'outpost', 'gate', 'wall', 'fort')) return ICON.tower;
  if (has('barracks', 'stable', 'range', 'dock', 'monastery', 'production')) return ICON.house;
  if (has('wonder', 'monument', 'palace', 'cathedral')) return ICON.score;
  return ICON.cog;
}

/* ------------------------------------------------------------------ *
 * Portraits: procedural medallion silhouettes, keyed by role / kind
 * ------------------------------------------------------------------ */

type PortraitKind =
  | 'villager'
  | 'melee'
  | 'ranged'
  | 'cavalry'
  | 'siege'
  | 'monk'
  | 'merchant'
  | 'dropoff'
  | 'house'
  | 'production'
  | 'research'
  | 'defensive'
  | 'wall'
  | 'landmark';

const PORTRAIT: Record<PortraitKind, { icon: string; tint: string }> = {
  villager: { icon: ICON.hammer, tint: '#c9a86a' },
  melee: { icon: ICON.sword, tint: '#c96a5a' },
  ranged: { icon: ICON.bow, tint: '#9fc06a' },
  cavalry: { icon: ICON.flag, tint: '#d09a5a' },
  siege: { icon: ICON.hourglass, tint: '#a98a6a' },
  monk: { icon: ICON.heart, tint: '#d6c48a' },
  merchant: { icon: ICON.basket, tint: '#c9b96a' },
  dropoff: { icon: ICON.crate, tint: '#b08d5a' },
  house: { icon: ICON.house, tint: '#a98f6a' },
  production: { icon: ICON.hammer, tint: '#b5725a' },
  research: { icon: ICON.flask, tint: '#8fb0c9' },
  defensive: { icon: ICON.tower, tint: '#9a9aa6' },
  wall: { icon: ICON.wall, tint: '#8d8d94' },
  landmark: { icon: ICON.score, tint: '#d8b45a' },
};

function unitPortraitKind(def: UnitDef): PortraitKind {
  const role = def.role as number;
  if (role === ROLE_WORKER) return 'villager';
  if (role === ROLE_MONK) return 'monk';
  if (role === ROLE_TRADE) return 'merchant';
  if (role === ROLE_SIEGE) return 'siege';
  if (role === ROLE_SCOUT) return 'cavalry';
  const classes = def.classes as ReadonlyArray<number>;
  if (classes.includes(CLASS_SIEGE)) return 'siege';
  if (classes.includes(CLASS_CAVALRY)) return 'cavalry';
  if (classes.includes(CLASS_RANGED)) return 'ranged';
  return 'melee';
}

function buildingPortraitKind(def: BuildingDef): PortraitKind {
  switch (def.kind as number) {
    case BK_DROPOFF:
      return 'dropoff';
    case BK_HOUSE:
      return 'house';
    case BK_PRODUCTION:
      return 'production';
    case BK_RESEARCH:
      return 'research';
    case BK_DEFENSIVE:
      return 'defensive';
    case BK_WALL:
    case BK_GATE:
      return 'wall';
    case BK_LANDMARK:
    case BK_WONDER:
      return 'landmark';
    default:
      return 'house';
  }
}

/** Portrait kind for any snapshot entity. */
function entityPortraitKind(entity: EntitySnapshot): PortraitKind {
  // The capital Town Center gets the gold landmark portrait: it is the one
  // building every player recognises instantly on the selection panel.
  if (entity.def === 'town_center' || entity.def === 'capital_town_center') return 'landmark';
  if (entity.kind === KIND_UNIT) {
    const def = unitDef(entity.def);
    return def ? unitPortraitKind(def) : 'melee';
  }
  if (entity.kind === KIND_BUILDING) {
    const def = buildingDef(entity.def);
    return def ? buildingPortraitKind(def) : 'house';
  }
  return 'dropoff';
}

/* ------------------------------------------------------------------ *
 * Definition lookups (static data tables only — never simulation state)
 * ------------------------------------------------------------------ */

function unitDef(def: string): UnitDef | undefined {
  const found = UNITS[def];
  return found ? found : undefined;
}

function buildingDef(def: string): BuildingDef | undefined {
  const found = BUILDINGS[def];
  return found ? found : undefined;
}

function prettyId(id: string): string {
  return id
    .split(/[_-]/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** Human name for a definition id, falling back to the prettified id. */
function defName(def: string): string {
  const unit = unitDef(def);
  if (unit) return unit.name;
  const building = buildingDef(def);
  if (building) return building.name;
  if (def === 'relic') return 'Relic';
  if (def === 'sacred_site') return 'Sacred Site';
  return prettyId(def);
}

/* ------------------------------------------------------------------ *
 * DOM helpers
 * ------------------------------------------------------------------ */

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function iconEl(markup: string, className: string): HTMLSpanElement {
  const span = el('span', className);
  span.innerHTML = markup;
  return span;
}

function setText(node: HTMLElement, text: string): void {
  if (node.textContent !== text) node.textContent = text;
}

function setClass(node: Element, name: string, on: boolean): void {
  if (node.classList.contains(name) !== on) node.classList.toggle(name, on);
}

function setWidth(node: HTMLElement, pct: number): void {
  const value = pct.toFixed(1);
  if (node.dataset.pct !== value) {
    node.dataset.pct = value;
    node.style.width = `${value}%`;
  }
}

function panel(className: string): HTMLDivElement {
  return el('div', `aoe-panel ${className}`);
}

function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  const two = (n: number): string => (n < 10 ? `0${n}` : String(n));
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`;
}

function formatTicks(ticks: number): string {
  return formatClock(Math.ceil(Math.max(0, ticks) / TICK_RATE));
}

/* ------------------------------------------------------------------ *
 * Snapshot queries
 * ------------------------------------------------------------------ */

function playerById(snapshot: StateSnapshot, id: number): StateSnapshot['players'][number] | undefined {
  for (const player of snapshot.players) if (player.id === id) return player;
  return undefined;
}

function entityById(snapshot: StateSnapshot, id: number): EntitySnapshot | undefined {
  for (const entity of snapshot.entities) if (entity.id === id) return entity;
  return undefined;
}

function ownerColor(owner: number): string {
  const index = owner < 0 ? 0 : owner % PLAYER_COLORS.length;
  return PLAYER_COLORS[index] ?? '#d8b45a';
}

/** How many entities are sheltered inside a building this frame. */
function garrisonCount(snapshot: StateSnapshot, building: number): number {
  let count = 0;
  for (const entity of snapshot.entities) if (entity.inside === building) count++;
  return count;
}

interface StatRow {
  label: string;
  value: string;
  icon: string;
}

function unitStatRows(def: UnitDef): StatRow[] {
  const melee = def.meleeAttack;
  const ranged = def.rangedAttack;
  const attack = melee > 0 && ranged > 0 ? `${melee} / ${ranged}` : String(Math.max(melee, ranged));
  const rows: StatRow[] = [
    { label: 'Attack', value: attack, icon: ICON.sword },
    { label: 'Armor', value: `${def.meleeArmor} / ${def.rangedArmor}`, icon: ICON.shield },
    { label: 'Range', value: `${(def.range / FP_ONE).toFixed(2)} tiles`, icon: ICON.bow },
    { label: 'Speed', value: `${((def.speed / FP_ONE) * TICK_RATE).toFixed(2)} t/s`, icon: ICON.boot },
  ];
  if (def.pop > 1) rows.push({ label: 'Pop', value: String(def.pop), icon: ICON.pop });
  return rows;
}

function buildingStatRows(def: BuildingDef, entity: EntitySnapshot, snapshot: StateSnapshot): StatRow[] {
  const rows: StatRow[] = [];
  if (entity.construction < 1000) {
    rows.push({ label: 'Built', value: `${Math.floor(entity.construction / 10)}%`, icon: ICON.hammer });
  }
  if (def.garrisonCap > 0) {
    rows.push({
      label: 'Garrison',
      value: `${garrisonCount(snapshot, entity.id)} / ${def.garrisonCap}`,
      icon: ICON.house,
    });
  }
  rows.push({ label: 'Armor', value: `${def.meleeArmor} / ${def.rangedArmor}`, icon: ICON.shield });
  if (def.attack > 0) {
    rows.push({ label: 'Attack', value: String(def.attack), icon: ICON.sword });
    rows.push({ label: 'Range', value: `${(def.range / FP_ONE).toFixed(2)} tiles`, icon: ICON.bow });
  }
  if (def.popProvided > 0) rows.push({ label: 'Pop cap', value: `+${def.popProvided}`, icon: ICON.pop });
  if (entity.builders > 0 && entity.construction < 1000) {
    rows.push({ label: 'Builders', value: String(entity.builders), icon: ICON.hammer });
  }
  return rows;
}

/* ------------------------------------------------------------------ *
 * Cached DOM
 * ------------------------------------------------------------------ */

interface ResCellDom {
  root: HTMLDivElement;
  amount: HTMLSpanElement;
  workers: HTMLSpanElement;
}

interface CommandCellDom {
  root: HTMLButtonElement;
  icon: HTMLSpanElement;
  label: HTMLSpanElement;
  hotkey: HTMLSpanElement;
  cost: HTMLSpanElement;
}

interface QueueRowDom {
  root: HTMLDivElement;
  icon: HTMLSpanElement;
  name: HTMLSpanElement;
  bar: HTMLSpanElement;
  time: HTMLSpanElement;
  cancel: HTMLButtonElement | null;
}

interface SelectTileDom {
  root: HTMLButtonElement;
  icon: HTMLSpanElement;
}

interface HudDom {
  root: HTMLDivElement;
  minimap: HTMLCanvasElement;

  resources: ResCellDom[];
  pop: HTMLSpanElement;
  ageNumeral: HTMLSpanElement;
  ageName: HTMLSpanElement;
  timer: HTMLSpanElement;
  fps: HTMLSpanElement;

  scoreToggle: HTMLButtonElement;
  scorebar: HTMLDivElement;
  scoreboard: HTMLDivElement;
  scoreboardBody: HTMLDivElement;

  objectiveVictory: HTMLSpanElement;
  objectiveList: HTMLDivElement;

  selPortrait: HTMLDivElement;
  selName: HTMLDivElement;
  selSub: HTMLDivElement;
  hpBar: HTMLDivElement;
  hpFill: HTMLSpanElement;
  hpText: HTMLSpanElement;
  selStats: HTMLDivElement;
  selGrid: HTMLDivElement;
  selTiles: SelectTileDom[];

  commandCells: CommandCellDom[];

  prodQueue: HTMLDivElement;
  prodHeading: HTMLSpanElement;
  prodRows: QueueRowDom[];

  globalQueue: HTMLDivElement;
  globalBody: HTMLDivElement;
  globalEmpty: HTMLDivElement;
  globalRows: QueueRowDom[];

  groups: HTMLButtonElement[];
  groupCounts: HTMLSpanElement[];

  idleBtn: HTMLButtonElement;
  idleCount: HTMLSpanElement;

  toast: HTMLDivElement;
  result: HTMLDivElement;
  resultTitle: HTMLDivElement;
  resultWinner: HTMLDivElement;
  resultReason: HTMLDivElement;

  /** Per-section dirty checks: section name -> last rendered signature. */
  sig: Record<string, string>;
  /** Last model handed to update(), so on-demand panels can fill immediately. */
  lastModel: HudModel | null;
  toastTimer: number;
  scoreboardOpen: boolean;
  worldW: number;
  worldH: number;
  worldOverride: boolean;
  resultKey: string;
}

function makeQueueRow(callbacks: HudCallbacks, withCancel: boolean): QueueRowDom {
  const root = el('div', 'aoe-queue-row');
  const icon = iconEl(ICON.cog, 'aoe-icon aoe-queue-icon');
  const body = el('div', 'aoe-queue-body');
  const name = el('span', 'aoe-queue-name', '');
  const track = el('div', 'aoe-bar aoe-queue-track');
  const bar = el('span', 'aoe-bar-fill');
  const time = el('span', 'aoe-queue-time', '');
  track.appendChild(bar);
  body.appendChild(name);
  body.appendChild(track);
  root.appendChild(icon);
  root.appendChild(body);
  root.appendChild(time);
  let cancel: HTMLButtonElement | null = null;
  if (withCancel) {
    cancel = el('button', 'aoe-queue-cancel');
    cancel.type = 'button';
    cancel.title = 'Cancel this item';
    cancel.appendChild(iconEl(ICON.cancel, 'aoe-icon'));
    cancel.addEventListener('click', (event) => {
      event.stopPropagation();
      const building = Number(root.dataset.building ?? '0');
      const index = Number(root.dataset.index ?? '-1');
      if (building > 0 && index >= 0) callbacks.onCancelQueue(building, index);
    });
    root.appendChild(cancel);
  }
  return { root, icon, name, bar, time, cancel };
}

/** Command card geometry: 4 columns x 3 rows (see .aoe-command-grid in hud.css). */
const COMMAND_COLUMNS = 4;
const HUD_GRID_SLOTS = COMMAND_COLUMNS * 3;
const SELECTION_TILE_LIMIT = 24;

function buildDom(root: HTMLElement, callbacks: HudCallbacks): HudDom {
  const hud = el('div', 'aoe-hud');

  /* --- top bar: resources, population, age, score, timer ------------ */
  const topbar = el('div', 'aoe-topbar');
  const topLeft = el('div', 'aoe-topleft');
  const resPanel = panel('aoe-respanel');
  const resourceRow = el('div', 'aoe-resrow');
  const resources: ResCellDom[] = [];
  for (const key of RESOURCE_KEYS) {
    const cell = el('div', 'aoe-res');
    const icon = iconEl(ICON[key] ?? ICON.cog, `aoe-icon aoe-res-icon aoe-res-${key}`);
    const amount = el('span', 'aoe-res-amount', '0');
    const workersRow = el('div', 'aoe-res-workers');
    workersRow.appendChild(iconEl(ICON.person, 'aoe-icon aoe-res-workericon'));
    const workers = el('span', 'aoe-res-workercount', '0');
    workersRow.appendChild(workers);
    cell.appendChild(icon);
    cell.appendChild(amount);
    cell.appendChild(workersRow);
    resourceRow.appendChild(cell);
    resources.push({ root: cell, amount, workers });
  }
  const statusRow = el('div', 'aoe-statusrow');
  const popBox = el('div', 'aoe-status aoe-pop');
  popBox.title = 'Population';
  popBox.appendChild(iconEl(ICON.pop, 'aoe-icon'));
  const pop = el('span', 'aoe-pop-text', '0/0');
  popBox.appendChild(pop);
  const ageBox = el('div', 'aoe-status aoe-age');
  ageBox.title = 'Current age';
  ageBox.appendChild(iconEl(ICON.age, 'aoe-icon aoe-age-icon'));
  const ageNumeral = el('span', 'aoe-age-numeral', 'I');
  const ageName = el('span', 'aoe-age-name', 'Dark Age');
  ageBox.appendChild(ageNumeral);
  ageBox.appendChild(ageName);
  statusRow.appendChild(popBox);
  statusRow.appendChild(ageBox);
  resPanel.appendChild(resourceRow);
  resPanel.appendChild(statusRow);
  topLeft.appendChild(resPanel);

  const topRight = el('div', 'aoe-topright');
  const timerBox = panel('aoe-timerbox');
  timerBox.appendChild(iconEl(ICON.clock, 'aoe-icon'));
  const timer = el('span', 'aoe-timer-text', '0:00');
  timerBox.appendChild(timer);
  const fps = el('span', 'aoe-fps', '');
  timerBox.appendChild(fps);
  const scoreToggle = el('button', 'aoe-bigbtn aoe-score-toggle');
  scoreToggle.type = 'button';
  scoreToggle.title = 'Show or hide the detailed scoreboard';
  scoreToggle.appendChild(iconEl(ICON.score, 'aoe-icon'));
  scoreToggle.appendChild(el('span', 'aoe-btn-label', 'Scores'));
  const scorebar = panel('aoe-scorebar');
  topRight.appendChild(timerBox);
  topRight.appendChild(scoreToggle);
  topRight.appendChild(scorebar);
  topbar.appendChild(topLeft);
  topbar.appendChild(topRight);

  /* --- expanded scoreboard ------------------------------------------ */
  const scoreboard = panel('aoe-scoreboard');
  scoreboard.hidden = true;
  scoreboard.appendChild(el('div', 'aoe-heading', 'Scoreboard'));
  const scoreboardBody = el('div', 'aoe-scoreboard-body');
  scoreboard.appendChild(scoreboardBody);

  /* --- objectives ---------------------------------------------------- */
  const objectives = panel('aoe-objectives');
  const objectiveHead = el('div', 'aoe-panel-head');
  objectiveHead.appendChild(iconEl(ICON.list, 'aoe-icon'));
  objectiveHead.appendChild(el('span', 'aoe-heading', 'Objectives'));
  const objectiveVictory = el('span', 'aoe-objective-victory', 'Landmarks');
  objectiveHead.appendChild(objectiveVictory);
  const objectiveList = el('div', 'aoe-objective-list');
  objectives.appendChild(objectiveHead);
  objectives.appendChild(objectiveList);

  /* --- bottom bar: selection panel ------------------------------------ */
  const bottom = el('div', 'aoe-bottombar');
  const selection = panel('aoe-selection');
  const selHead = el('div', 'aoe-sel-head');
  const selPortrait = el('div', 'aoe-portrait');
  const selInfo = el('div', 'aoe-sel-info');
  const selName = el('div', 'aoe-sel-name', 'Nothing selected');
  const selSub = el('div', 'aoe-sel-sub', 'Click a unit or drag a box');
  const hpBar = el('div', 'aoe-hpbar');
  const hpFill = el('span', 'aoe-hpfill');
  const hpText = el('span', 'aoe-hptext', '');
  hpBar.appendChild(hpFill);
  hpBar.appendChild(hpText);
  selInfo.appendChild(selName);
  selInfo.appendChild(selSub);
  selInfo.appendChild(hpBar);
  selHead.appendChild(selPortrait);
  selHead.appendChild(selInfo);
  const selStats = el('div', 'aoe-sel-stats');
  const selGrid = el('div', 'aoe-sel-grid');
  const selTiles: SelectTileDom[] = [];
  for (let i = 0; i < SELECTION_TILE_LIMIT; i++) {
    const tile = el('button', 'aoe-seltile');
    tile.type = 'button';
    tile.hidden = true;
    const icon = iconEl(ICON.person, 'aoe-icon');
    tile.appendChild(icon);
    tile.addEventListener('click', (event) => {
      const id = Number(tile.dataset.entity ?? '0');
      if (id > 0) callbacks.onSelectEntity(id, event.shiftKey);
    });
    selGrid.appendChild(tile);
    selTiles.push({ root: tile, icon });
  }
  selGrid.hidden = true;
  selection.appendChild(selHead);
  selection.appendChild(selStats);
  selection.appendChild(selGrid);

  /* --- bottom bar: global production queue ----------------------------- */
  const globalQueue = panel('aoe-globalqueue');
  const globalHead = el('div', 'aoe-panel-head');
  globalHead.appendChild(iconEl(ICON.hourglass, 'aoe-icon'));
  globalHead.appendChild(el('span', 'aoe-heading', 'Production'));
  const globalBody = el('div', 'aoe-queue-list');
  const globalEmpty = el('div', 'aoe-empty', 'Nothing in production.');
  globalQueue.appendChild(globalHead);
  globalQueue.appendChild(globalBody);
  globalQueue.appendChild(globalEmpty);

  /* --- bottom bar: control groups, building queue, command card --------- */
  const centre = el('div', 'aoe-centre');
  const groups = panel('aoe-groups');
  const groupButtons: HTMLButtonElement[] = [];
  const groupCounts: HTMLSpanElement[] = [];
  for (let i = 0; i < 10; i++) {
    const slot = el('button', 'aoe-group');
    slot.type = 'button';
    slot.title = `Control group ${i} — click to select, shift+click to add, ctrl+click to assign`;
    slot.appendChild(el('span', 'aoe-group-key', String(i)));
    const count = el('span', 'aoe-group-count', '');
    slot.appendChild(count);
    slot.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey) callbacks.onAssignControlGroup(i);
      else callbacks.onControlGroup(i, event.shiftKey);
    });
    groups.appendChild(slot);
    groupButtons.push(slot);
    groupCounts.push(count);
  }

  const prodQueue = panel('aoe-prodqueue');
  prodQueue.hidden = true;
  const prodHead = el('div', 'aoe-panel-head');
  prodHead.appendChild(iconEl(ICON.hourglass, 'aoe-icon'));
  const prodHeading = el('span', 'aoe-heading', 'Queue');
  prodHead.appendChild(prodHeading);
  prodQueue.appendChild(prodHead);

  const commandPanel = panel('aoe-command');
  const commandGrid = el('div', 'aoe-command-grid');
  const commandCells: CommandCellDom[] = [];
  for (let slot = 0; slot < HUD_GRID_SLOTS; slot++) {
    const button = el('button', 'aoe-cmd');
    button.type = 'button';
    button.dataset.slot = String(slot);
    // Pin every cell to its own grid slot: empty slots are hidden, and without
    // an explicit placement the visible buttons would auto-flow and shift.
    button.style.gridColumn = String((slot % COMMAND_COLUMNS) + 1);
    button.style.gridRow = String(Math.floor(slot / COMMAND_COLUMNS) + 1);
    const hotkey = el('span', 'aoe-cmd-hotkey', GRID_KEYS[slot] ?? '');
    const icon = iconEl(ICON.cog, 'aoe-cmd-icon');
    const label = el('span', 'aoe-cmd-label', '');
    const cost = el('span', 'aoe-cmd-cost', '');
    button.appendChild(hotkey);
    button.appendChild(icon);
    button.appendChild(label);
    button.appendChild(cost);
    button.addEventListener('click', () => {
      const id = button.dataset.cmd;
      if (id !== undefined && id.length > 0 && !button.disabled) callbacks.onCommand(id);
    });
    button.addEventListener('contextmenu', (event) => event.preventDefault());
    commandGrid.appendChild(button);
    commandCells.push({ root: button, icon, label, hotkey, cost });
  }
  commandPanel.appendChild(commandGrid);
  centre.appendChild(groups);
  centre.appendChild(prodQueue);
  centre.appendChild(commandPanel);

  /* --- bottom bar: minimap, camera buttons, quick actions --------------- */
  const rightCol = el('div', 'aoe-rightcol');
  const miniWrap = panel('aoe-miniwrap');
  const minimap = el('canvas', 'aoe-minimap');
  minimap.width = 200;
  minimap.height = 200;
  minimap.tabIndex = 0;
  minimap.title = 'Minimap — click to move the camera';
  miniWrap.appendChild(minimap);
  const miniButtons = el('div', 'aoe-minibtns');
  const cameraKeys: Array<{ key: string; icon: string; title: string }> = [
    { key: '[', icon: ICON.rotateLeft, title: 'Rotate the camera left ([)' },
    { key: ']', icon: ICON.rotateRight, title: 'Rotate the camera right (])' },
    { key: 'Home', icon: ICON.recenter, title: 'Recentre the camera (Home)' },
  ];
  for (const entry of cameraKeys) {
    const button = el('button', 'aoe-minibtn');
    button.type = 'button';
    button.title = entry.title;
    button.appendChild(iconEl(entry.icon, 'aoe-icon'));
    button.addEventListener('click', () => callbacks.onCameraKey(entry.key, false, false));
    miniButtons.appendChild(button);
  }
  miniWrap.appendChild(miniButtons);

  const actions = el('div', 'aoe-actions');
  const idleBtn = el('button', 'aoe-action');
  idleBtn.type = 'button';
  idleBtn.appendChild(iconEl(ICON.idle, 'aoe-icon'));
  idleBtn.appendChild(el('span', 'aoe-btn-label', 'Idle villager'));
  const idleCount = el('span', 'aoe-badge', '0');
  idleBtn.appendChild(idleCount);
  idleBtn.addEventListener('click', () => callbacks.onIdleVillager());
  const militaryBtn = el('button', 'aoe-action');
  militaryBtn.type = 'button';
  militaryBtn.title = 'Select every military unit you own';
  militaryBtn.appendChild(iconEl(ICON.army, 'aoe-icon'));
  militaryBtn.appendChild(el('span', 'aoe-btn-label', 'All military'));
  militaryBtn.addEventListener('click', () => callbacks.onSelectAllMilitary());
  actions.appendChild(idleBtn);
  actions.appendChild(militaryBtn);
  rightCol.appendChild(miniWrap);
  rightCol.appendChild(actions);

  bottom.appendChild(selection);
  bottom.appendChild(globalQueue);
  bottom.appendChild(centre);
  bottom.appendChild(rightCol);

  /* --- overlays --------------------------------------------------------- */
  const toast = el('div', 'aoe-toast');
  const result = el('div', 'aoe-result');
  result.hidden = true;
  const resultCard = el('div', 'aoe-result-card');
  const resultTitle = el('div', 'aoe-result-title', '');
  const resultWinner = el('div', 'aoe-result-winner', '');
  const resultReason = el('div', 'aoe-result-reason', '');
  resultCard.appendChild(resultTitle);
  resultCard.appendChild(resultWinner);
  resultCard.appendChild(resultReason);
  result.appendChild(resultCard);

  hud.appendChild(topbar);
  hud.appendChild(scoreboard);
  hud.appendChild(objectives);
  hud.appendChild(bottom);
  hud.appendChild(toast);
  hud.appendChild(result);
  root.appendChild(hud);

  return {
    root: hud,
    minimap,
    resources,
    pop,
    ageNumeral,
    ageName,
    timer,
    fps,
    scoreToggle,
    scorebar,
    scoreboard,
    scoreboardBody,
    objectiveVictory,
    objectiveList,
    selPortrait,
    selName,
    selSub,
    hpBar,
    hpFill,
    hpText,
    selStats,
    selGrid,
    selTiles,
    commandCells,
    prodQueue,
    prodHeading,
    prodRows: [],
    globalQueue,
    globalBody,
    globalEmpty,
    globalRows: [],
    groups: groupButtons,
    groupCounts,
    idleBtn,
    idleCount,
    toast,
    result,
    resultTitle,
    resultWinner,
    resultReason,
    sig: {},
    lastModel: null,
    toastTimer: 0,
    scoreboardOpen: false,
    worldW: minimap.width,
    worldH: minimap.height,
    worldOverride: false,
    resultKey: '',
  };
}

/* ------------------------------------------------------------------ *
 * Interaction wiring
 * ------------------------------------------------------------------ */

const CAMERA_KEYS: ReadonlyArray<string> = [
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'Backspace',
  '[',
  ']',
];

function wireInteractions(dom: HudDom, callbacks: HudCallbacks): void {
  dom.scoreToggle.addEventListener('click', () => {
    dom.scoreboardOpen = !dom.scoreboardOpen;
    dom.scoreboard.hidden = !dom.scoreboardOpen;
    setClass(dom.scoreToggle, 'is-active', dom.scoreboardOpen);
    dom.sig.scoreboard = '';
    // Fill the table on the same click instead of waiting for the next frame.
    if (dom.scoreboardOpen && dom.lastModel) syncTopRight(dom, dom.lastModel);
    callbacks.onToggleScoreboard();
  });

  const canvas = dom.minimap;
  let dragging = false;
  let dragButton = 0;

  const send = (clientX: number, clientY: number, button: number): void => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const tilesX = dom.worldW > 0 ? dom.worldW : canvas.width;
    const tilesY = dom.worldH > 0 ? dom.worldH : canvas.height;
    const nx = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const ny = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    const x = Math.min(tilesX * FP_ONE - 1, Math.round(nx * tilesX * FP_ONE));
    const y = Math.min(tilesY * FP_ONE - 1, Math.round(ny * tilesY * FP_ONE));
    callbacks.onMinimapClick(x, y, button);
  };

  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  canvas.addEventListener('pointerdown', (event) => {
    dragging = true;
    dragButton = event.button;
    if (event.button !== 2) canvas.focus();
    canvas.setPointerCapture(event.pointerId);
    send(event.clientX, event.clientY, event.button);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (dragging) send(event.clientX, event.clientY, dragButton);
  });
  const stop = (event: PointerEvent): void => {
    if (!dragging) return;
    dragging = false;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  };
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);
  canvas.addEventListener('keydown', (event) => {
    if (!CAMERA_KEYS.includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    callbacks.onCameraKey(event.key, event.shiftKey, event.ctrlKey || event.metaKey);
  });
}

/* ------------------------------------------------------------------ *
 * Per-section synchronisation (each one dirty-checked)
 * ------------------------------------------------------------------ */

function syncResources(dom: HudDom, model: HudModel): void {
  const player = playerById(model.snapshot, model.localPlayer);
  const resources = player ? player.resources : { food: 0, wood: 0, gold: 0, stone: 0 };
  const villagers = player ? player.villagerCounts : { food: 0, wood: 0, gold: 0, stone: 0, idle: 0 };
  const pop = player ? player.pop : 0;
  const popCap = player ? player.popCap : 0;
  const age = player ? player.age : 0;
  const ageName = player ? player.ageName : 'Dark Age';
  const sig = [
    resources.food,
    resources.wood,
    resources.gold,
    resources.stone,
    villagers.food,
    villagers.wood,
    villagers.gold,
    villagers.stone,
    pop,
    popCap,
    age,
    ageName,
  ].join('|');
  if (dom.sig.resources === sig) return;
  dom.sig.resources = sig;

  for (let i = 0; i < RESOURCE_KEYS.length; i++) {
    const key = RESOURCE_KEYS[i];
    const cell = dom.resources[i];
    setText(cell.amount, String(resources[key]));
    setText(cell.workers, String(villagers[key]));
    setClass(cell.root, 'is-empty', villagers[key] === 0);
    cell.root.title = `${RESOURCE_LABELS[key]}: ${resources[key]} — ${villagers[key]} villagers gathering`;
  }
  setText(dom.pop, `${pop}/${popCap}`);
  setClass(dom.pop, 'is-capped', popCap > 0 && pop >= popCap);
  setText(dom.ageNumeral, AGE_NUMERALS[age] ?? 'I');
  setText(dom.ageName, ageName);
}

function syncTopRight(dom: HudDom, model: HudModel): void {
  setText(dom.timer, formatClock(model.elapsed));
  setText(dom.fps, `${Math.round(model.fps)} fps`);

  const rows = model.score;
  const rowSignature = (row: (typeof rows)[number]): string =>
    `${row.playerId}:${row.name}:${row.civ}:${row.age}:${row.score}:${row.pop}:${row.popCap}:${row.defeated ? 1 : 0}:${
      row.isLocal ? 1 : 0
    }:${row.isAlly ? 1 : 0}`;
  const sig = rows.map(rowSignature).join(',');

  if (dom.sig.scorebar !== sig) {
    dom.sig.scorebar = sig;
    dom.scorebar.textContent = '';
    for (const row of rows) {
      const line = el('div', 'aoe-scoreline');
      if (row.isLocal) line.classList.add('is-local');
      if (row.defeated) line.classList.add('is-defeated');
      const dot = el('span', 'aoe-dot');
      dot.style.background = ownerColor(row.playerId);
      line.appendChild(dot);
      line.appendChild(el('span', 'aoe-scoreline-name', row.name));
      line.appendChild(el('span', 'aoe-scoreline-age', AGE_NUMERALS[row.age] ?? 'I'));
      line.appendChild(el('span', 'aoe-scoreline-score', String(row.score)));
      line.title = `${row.name} — ${row.civ} — ${AGE_NUMERALS[row.age] ?? 'I'} — score ${row.score} — ${row.pop}/${row.popCap} pop`;
      dom.scorebar.appendChild(line);
    }
  }

  if (dom.scoreboardOpen && dom.sig.scoreboard !== sig) {
    dom.sig.scoreboard = sig;
    dom.scoreboardBody.textContent = '';
    const header = el('div', 'aoe-scoreboard-row is-header');
    for (const label of ['Player', 'Civ', 'Age', 'Score', 'Pop', 'Status']) {
      header.appendChild(el('span', 'aoe-scoreboard-cell', label));
    }
    dom.scoreboardBody.appendChild(header);
    for (const row of rows) {
      const line = el('div', 'aoe-scoreboard-row');
      if (row.isLocal) line.classList.add('is-local');
      if (row.defeated) line.classList.add('is-defeated');
      const nameCell = el('span', 'aoe-scoreboard-cell aoe-scoreboard-name');
      const dot = el('span', 'aoe-dot');
      dot.style.background = ownerColor(row.playerId);
      nameCell.appendChild(dot);
      nameCell.appendChild(el('span', undefined, row.name));
      line.appendChild(nameCell);
      line.appendChild(el('span', 'aoe-scoreboard-cell', row.civ));
      line.appendChild(el('span', 'aoe-scoreboard-cell', AGE_NUMERALS[row.age] ?? 'I'));
      line.appendChild(el('span', 'aoe-scoreboard-cell', String(row.score)));
      line.appendChild(el('span', 'aoe-scoreboard-cell', `${row.pop}/${row.popCap}`));
      const status = row.defeated ? (row.isLocal ? 'Defeated' : 'Eliminated') : row.isAlly ? 'Ally' : 'Enemy';
      const statusCell = el('span', 'aoe-scoreboard-cell', status);
      if (row.isAlly && !row.defeated) statusCell.classList.add('is-ally');
      line.appendChild(statusCell);
      dom.scoreboardBody.appendChild(line);
    }
  }
}

/**
 * Objective rows derived from the snapshot, used when the session sends none.
 * The victory condition is always shown either way.
 */
function derivedObjectives(model: HudModel): ObjectiveRow[] {
  const snapshot = model.snapshot;
  const local = playerById(snapshot, model.localPlayer);
  if (!local) return [];
  const victory = snapshot.victory as number;
  if (victory === 1) {
    const progress = Math.min(1, local.sacredSites / SACRED_SITES_NEEDED);
    const held = Math.max(0, Math.floor(local.sacredHoldTicks));
    return [
      {
        label: `Hold ${SACRED_SITES_NEEDED} sacred sites`,
        progress,
        detail: `${local.sacredSites}/${SACRED_SITES_NEEDED} held · ${formatTicks(held)} / ${formatTicks(SACRED_HOLD_TICKS)}`,
        done: held >= SACRED_HOLD_TICKS,
      },
    ];
  }
  if (victory === 2) {
    const ticks = Math.max(0, Math.floor(local.wonderTicks));
    return [
      {
        label: 'Defend your Wonder',
        progress: Math.min(1, ticks / WONDER_TICKS),
        detail: ticks > 0 ? `${formatTicks(ticks)} / ${formatTicks(WONDER_TICKS)}` : 'No Wonder completed yet',
        done: ticks >= WONDER_TICKS,
      },
    ];
  }
  let enemyLandmarks = 0;
  for (const player of snapshot.players) {
    if (player.id === local.id || player.team === local.team) continue;
    enemyLandmarks += player.landmarks;
  }
  return [{ label: 'Destroy every enemy landmark', progress: -1, detail: `${enemyLandmarks} remaining`, done: false }];
}

function syncObjectives(dom: HudDom, model: HudModel): void {
  const rows: ObjectiveRow[] = model.objectives.length > 0 ? model.objectives : derivedObjectives(model);
  const victoryName = VICTORY_NAMES[model.snapshot.victory as number] ?? 'Landmarks';
  const sig = `${victoryName}|${rows.map((r) => `${r.label}:${r.progress}:${r.detail}:${r.done ? 1 : 0}`).join(',')}`;
  if (dom.sig.objectives === sig) return;
  dom.sig.objectives = sig;

  setText(dom.objectiveVictory, victoryName);
  dom.objectiveList.textContent = '';
  for (const row of rows) {
    const item = el('div', 'aoe-objective');
    if (row.done) item.classList.add('is-done');
    const head = el('div', 'aoe-objective-head');
    head.appendChild(el('span', 'aoe-objective-label', row.label));
    head.appendChild(el('span', 'aoe-objective-detail', row.detail));
    item.appendChild(head);
    if (row.progress >= 0) {
      const track = el('div', 'aoe-bar');
      const fill = el('span', 'aoe-bar-fill');
      fill.style.width = `${Math.round(Math.min(1, row.progress) * 100)}%`;
      track.appendChild(fill);
      item.appendChild(track);
    } else {
      item.appendChild(el('div', 'aoe-objective-binary', row.done ? 'Complete' : 'In progress'));
    }
    dom.objectiveList.appendChild(item);
  }
}

function syncSelection(dom: HudDom, model: HudModel): void {
  const snapshot = model.snapshot;
  const ids = model.selection;
  const parts: string[] = [String(ids.length)];
  for (const id of ids) {
    const entity = entityById(snapshot, id);
    if (!entity) {
      parts.push(`${id}:missing`);
      continue;
    }
    const garrison = entity.kind === KIND_BUILDING ? garrisonCount(snapshot, id) : 0;
    parts.push(
      `${id}:${entity.def}:${entity.kind}:${entity.hp}:${entity.maxHp}:${entity.construction}:${entity.builders}:${garrison}`,
    );
  }
  const sig = parts.join('|');
  if (dom.sig.selection === sig) return;
  dom.sig.selection = sig;

  const first = ids.length > 0 ? entityById(snapshot, ids[0]) : undefined;
  if (!first) {
    dom.selPortrait.textContent = '';
    dom.selPortrait.appendChild(iconEl(ICON.cog, 'aoe-portrait-icon'));
    dom.selPortrait.style.borderColor = '';
    dom.selPortrait.style.color = '';
    dom.selPortrait.title = '';
    setText(dom.selName, 'Nothing selected');
    setText(dom.selSub, 'Click a unit or drag a box');
    dom.hpBar.hidden = true;
    dom.hpText.textContent = '';
    dom.selStats.textContent = '';
    dom.selGrid.hidden = true;
    for (const tile of dom.selTiles) tile.root.hidden = true;
    return;
  }

  const unit = first.kind === KIND_UNIT ? unitDef(first.def) : undefined;
  const building = first.kind === KIND_BUILDING ? buildingDef(first.def) : undefined;
  const name = unit ? unit.name : building ? building.name : defName(first.def);
  const kind = entityPortraitKind(first);
  const art = PORTRAIT[kind];
  const count = ids.length;

  dom.selPortrait.textContent = '';
  dom.selPortrait.appendChild(iconEl(art.icon, 'aoe-portrait-icon'));
  dom.selPortrait.style.borderColor = ownerColor(first.owner);
  dom.selPortrait.style.color = art.tint;
  dom.selPortrait.title = `${name} (${Math.round(first.hp)}/${Math.round(first.maxHp)} HP)`;

  setText(dom.selName, count > 1 ? `${name} ×${count}` : name);
  const blurb = unit ? unit.blurb : building ? building.blurb : 'Selected';
  setText(dom.selSub, count > 1 ? `${count} selected` : blurb);

  const hpPct = first.maxHp > 0 ? (first.hp / first.maxHp) * 100 : 0;
  dom.hpBar.hidden = false;
  setWidth(dom.hpFill, Math.max(0, Math.min(100, hpPct)));
  setClass(dom.hpFill, 'is-low', hpPct <= 33);
  setClass(dom.hpFill, 'is-mid', hpPct > 33 && hpPct <= 66);
  setText(dom.hpText, `${Math.max(0, Math.round(first.hp))} / ${Math.round(first.maxHp)} HP`);

  dom.selStats.textContent = '';
  if (count === 1) {
    dom.selGrid.hidden = true;
    for (const tile of dom.selTiles) tile.root.hidden = true;
    // Classic RTS panels drop the numeric block when a group is selected, so
    // the full stat block is only shown for a single entity.
    const rows: StatRow[] = unit
      ? unitStatRows(unit)
      : building
        ? buildingStatRows(building, first, snapshot)
        : [{ label: 'HP', value: `${Math.round(first.hp)}`, icon: ICON.heart }];
    for (const row of rows) {
      const line = el('div', 'aoe-stat');
      line.appendChild(iconEl(row.icon, 'aoe-icon aoe-stat-icon'));
      line.appendChild(el('span', 'aoe-stat-label', row.label));
      line.appendChild(el('span', 'aoe-stat-value', row.value));
      dom.selStats.appendChild(line);
    }
    return;
  }

  dom.selGrid.hidden = false;
  const shown = Math.min(count, dom.selTiles.length);
  for (let i = 0; i < dom.selTiles.length; i++) {
    const tile = dom.selTiles[i];
    const entity = i < shown ? entityById(snapshot, ids[i]) : undefined;
    if (!entity) {
      tile.root.hidden = true;
      continue;
    }
    const tileUnit = entity.kind === KIND_UNIT ? unitDef(entity.def) : undefined;
    const tileBuilding = entity.kind === KIND_BUILDING ? buildingDef(entity.def) : undefined;
    const tileName = tileUnit ? tileUnit.name : tileBuilding ? tileBuilding.name : defName(entity.def);
    const tileArt = PORTRAIT[entityPortraitKind(entity)];
    tile.icon.innerHTML = tileArt.icon;
    tile.icon.style.color = tileArt.tint;
    tile.root.hidden = false;
    tile.root.dataset.entity = String(entity.id);
    tile.root.style.borderColor = ownerColor(entity.owner);
    tile.root.title = `${tileName} — ${Math.round(entity.hp)}/${Math.round(entity.maxHp)} HP`;
  }
  const summary = el('div', 'aoe-stat');
  summary.appendChild(iconEl(ICON.list, 'aoe-icon aoe-stat-icon'));
  summary.appendChild(el('span', 'aoe-stat-label', 'Selected'));
  summary.appendChild(
    el('span', 'aoe-stat-value', count > dom.selTiles.length ? `${count} (showing ${shown})` : String(count)),
  );
  dom.selStats.appendChild(summary);
}

function syncCommands(dom: HudDom, model: HudModel): void {
  const sig = model.commands
    .map(
      (c) =>
        `${c.slot}:${c.id}:${c.label}:${c.hotkey}:${c.cost}:${c.enabled ? 1 : 0}:${c.affordable ? 1 : 0}:${c.tooltip}`,
    )
    .join(',');
  if (dom.sig.commands === sig) return;
  dom.sig.commands = sig;

  for (const cell of dom.commandCells) {
    cell.root.hidden = true;
    delete cell.root.dataset.cmd;
    cell.root.disabled = false;
    cell.root.title = '';
    cell.root.classList.remove('is-unaffordable', 'is-disabled');
    setText(cell.label, '');
    setText(cell.cost, '');
    setClass(cell.cost, 'is-red', false);
  }

  for (const command of model.commands) {
    const slot = ((command.slot % HUD_GRID_SLOTS) + HUD_GRID_SLOTS) % HUD_GRID_SLOTS;
    const cell = dom.commandCells[slot];
    if (!cell.root.hidden) continue; // first command wins its slot
    cell.root.hidden = false;
    cell.root.dataset.cmd = command.id;
    cell.root.disabled = !command.enabled;
    cell.root.title = command.tooltip;
    cell.root.classList.toggle('is-disabled', !command.enabled);
    cell.root.classList.toggle('is-unaffordable', command.enabled && !command.affordable);
    cell.icon.innerHTML = commandIcon(command.id, command.label);
    setText(cell.label, command.label);
    setText(cell.hotkey, command.hotkey.length > 0 ? command.hotkey : GRID_KEYS[slot] ?? '');
    setText(cell.cost, command.cost);
    setClass(cell.cost, 'is-red', !command.affordable);
  }
}

type QueueItem = { defId: string; remaining: number; total: number };

function rebuildQueueRows(
  rows: QueueRowDom[],
  items: QueueItem[],
  building: number,
  withCancel: boolean,
  callbacks: HudCallbacks,
  container: HTMLElement,
): void {
  while (rows.length > items.length) {
    const row = rows.pop();
    if (row) row.root.remove();
  }
  for (let i = 0; i < items.length; i++) {
    let row = rows[i];
    if (!row) {
      row = makeQueueRow(callbacks, withCancel);
      rows.push(row);
      container.appendChild(row.root);
    }
    const item = items[i];
    const itemName = defName(item.defId);
    row.root.dataset.building = String(building);
    row.root.dataset.index = String(i);
    row.root.title = `${itemName} — ${formatTicks(item.remaining)} left`;
    row.icon.innerHTML = commandIcon(item.defId, itemName);
    setText(row.name, itemName);
  }
}

function updateQueueProgress(rows: QueueRowDom[], items: QueueItem[]): void {
  for (let i = 0; i < items.length && i < rows.length; i++) {
    const row = rows[i];
    const item = items[i];
    const pct = item.total > 0 ? ((item.total - item.remaining) / item.total) * 100 : 0;
    setWidth(row.bar, Math.max(0, Math.min(100, pct)));
    setText(row.time, formatTicks(item.remaining));
  }
}

/** The first selected building owned by the local player, or 0. */
function selectedBuilding(model: HudModel): number {
  for (const id of model.selection) {
    const entity = entityById(model.snapshot, id);
    if (entity && entity.kind === KIND_BUILDING && entity.owner === model.localPlayer) return entity.id;
  }
  return 0;
}

function syncProduction(dom: HudDom, model: HudModel, callbacks: HudCallbacks): void {
  const building = selectedBuilding(model);
  let items: QueueItem[] = [];
  if (building > 0) {
    for (const queue of model.snapshot.productionQueues) {
      if (queue.building === building) {
        items = queue.items;
        break;
      }
    }
  }
  const name = building > 0 ? defName(entityById(model.snapshot, building)?.def ?? '') : '';
  const sig = `${building}:${name}:${items.map((item) => item.defId).join(',')}`;
  if (dom.sig.prodQueue !== sig) {
    dom.sig.prodQueue = sig;
    dom.prodQueue.hidden = items.length === 0;
    setText(dom.prodHeading, name.length > 0 ? `Queue — ${name}` : 'Queue');
    rebuildQueueRows(dom.prodRows, items, building, true, callbacks, dom.prodQueue);
  }
  if (items.length > 0) updateQueueProgress(dom.prodRows, items);
}

function syncGlobalQueue(dom: HudDom, model: HudModel, callbacks: HudCallbacks): void {
  const items: QueueItem[] = [];
  let firstBuilding = 0;
  for (const entry of model.snapshot.globalQueue) {
    if (entry.owner !== model.localPlayer) continue;
    if (firstBuilding === 0) firstBuilding = entry.building;
    items.push({ defId: entry.defId, remaining: entry.remaining, total: entry.total });
  }
  const sig = items.map((item) => item.defId).join(',');
  if (dom.sig.globalQueue !== sig) {
    dom.sig.globalQueue = sig;
    dom.globalEmpty.hidden = items.length > 0;
    setClass(dom.globalQueue, 'is-empty-queue', items.length === 0);
    rebuildQueueRows(dom.globalRows, items, firstBuilding, false, callbacks, dom.globalBody);
  }
  if (items.length > 0) updateQueueProgress(dom.globalRows, items);
}

function syncQuickActions(dom: HudDom, model: HudModel): void {
  const idle = Math.max(0, Math.floor(model.idleVillagers));
  const selectionKey = [...model.selection].sort((a, b) => a - b).join(',');
  const sig = `${idle}|${model.controlGroups.map((group) => group.length).join(',')}|${selectionKey}`;
  if (dom.sig.groups === sig) return;
  dom.sig.groups = sig;

  setText(dom.idleCount, String(idle));
  setClass(dom.idleBtn, 'is-empty', idle === 0);
  dom.idleBtn.title = idle === 0 ? 'No idle villagers (.)' : `${idle} idle villager${idle === 1 ? '' : 's'} (.)`;

  for (let i = 0; i < dom.groups.length; i++) {
    const group = model.controlGroups[i] ?? [];
    const active = group.length > 0 && [...group].sort((a, b) => a - b).join(',') === selectionKey;
    setText(dom.groupCounts[i], group.length > 0 ? String(group.length) : '');
    setClass(dom.groups[i], 'is-filled', group.length > 0);
    setClass(dom.groups[i], 'is-active', active);
    dom.groups[i].title = `Control group ${i} — ${group.length} unit${
      group.length === 1 ? '' : 's'
    } (ctrl+click to assign)`;
  }
}

function syncResult(dom: HudDom, model: HudModel): void {
  const result = model.result;
  if (!result || !result.over) {
    if (dom.resultKey !== '') {
      dom.resultKey = '';
      dom.result.hidden = true;
    }
    return;
  }
  const key = `${result.winner}:${result.reason}`;
  if (dom.resultKey !== key) {
    dom.resultKey = key;
    const snapshot = model.snapshot;
    const local = playerById(snapshot, model.localPlayer);
    const winner = result.winner >= 0 ? playerById(snapshot, result.winner) : undefined;
    const localTeam = local ? local.team : 0;
    const won = winner !== undefined && winner.team === localTeam;
    dom.result.classList.toggle('is-victory', won);
    dom.result.classList.toggle('is-defeat', !won);
    dom.resultTitle.textContent = winner === undefined ? 'Match Over' : won ? 'Victory' : 'Defeat';
    dom.resultWinner.textContent =
      winner === undefined
        ? 'No winner — the match ended without a victor.'
        : `Winner: ${winner.name} (${winner.civ})`;
    dom.resultReason.textContent = result.reason.length > 0 ? result.reason : 'The match is over.';
  }
  dom.result.hidden = false;
}

/* ------------------------------------------------------------------ *
 * createHud
 * ------------------------------------------------------------------ */

/** `Hud` plus the session-facing extras documented at the top of this file. */
/**
 * The concrete HUD handle. `getMinimapCanvas` and `setWorldSize` are also part
 * of the `Hud` contract, so callers may depend on the interface alone.
 */
export type HudHandle = Hud;

export function createHud(root: HTMLElement, callbacks: HudCallbacks): Hud {
  const dom = buildDom(root, callbacks);
  wireInteractions(dom, callbacks);
  let disposed = false;

  return {
    update(model: HudModel): void {
      if (disposed) return;
      dom.lastModel = model;
      if (!dom.worldOverride) {
        dom.worldW = dom.minimap.width;
        dom.worldH = dom.minimap.height;
      }
      syncResources(dom, model);
      syncTopRight(dom, model);
      syncObjectives(dom, model);
      syncSelection(dom, model);
      syncCommands(dom, model);
      syncProduction(dom, model, callbacks);
      syncGlobalQueue(dom, model, callbacks);
      syncQuickActions(dom, model);
      syncResult(dom, model);
    },
    setVisible(visible: boolean): void {
      dom.root.style.display = visible ? '' : 'none';
      dom.root.setAttribute('aria-hidden', visible ? 'false' : 'true');
    },
    toast(message: string): void {
      if (disposed) return;
      dom.toast.textContent = message;
      dom.toast.classList.add('is-visible');
      if (dom.toastTimer !== 0) window.clearTimeout(dom.toastTimer);
      dom.toastTimer = window.setTimeout(() => {
        dom.toast.classList.remove('is-visible');
        dom.toastTimer = 0;
      }, 2500);
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      if (dom.toastTimer !== 0) window.clearTimeout(dom.toastTimer);
      dom.toastTimer = 0;
      dom.root.remove();
    },
    getMinimapCanvas(): HTMLCanvasElement {
      return dom.minimap;
    },
    setWorldSize(widthTiles: number, heightTiles: number): void {
      dom.worldW = Math.max(1, Math.floor(widthTiles));
      dom.worldH = Math.max(1, Math.floor(heightTiles));
      dom.worldOverride = true;
    },
  };
}
