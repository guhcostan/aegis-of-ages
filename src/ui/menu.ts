/**
 * Main menu — title screen, skirmish lobby, controls reference and credits.
 *
 * The lobby returns a `LobbySettings` object through `Menu.show(onStart)`; the
 * session turns that into a MatchConfig and starts the simulation. The menu
 * owns no game state, spawns no simulation and loads no external assets: all
 * styling is CSS and every visual is drawn from gradients and primitives.
 *
 * Only types are imported from the simulation (`import type`).
 */
import './menu.css';
import type { LobbySettings, Menu } from './types';

/* ------------------------------------------------------------------ *
 * Lobby data
 * ------------------------------------------------------------------ */

interface CivChoice {
  id: LobbySettings['civ'];
  name: string;
  blurb: string;
  traits: string[];
}

/** Trait copy mirrors the civilization definitions in src/sim/data/civs.ts. */
const CIV_CHOICES: CivChoice[] = [
  {
    id: 'english',
    name: 'English',
    blurb: 'A patient, defensive kingdom built on farms and the longbow.',
    traits: [
      'Farms cost 50% less wood.',
      'Villagers gathering food work 20% faster.',
      'Men-at-Arms train 30% faster.',
      'Longbowmen gain two tiles of range and hit harder.',
      'Network of Castles: your army attacks 20% faster.',
    ],
  },
  {
    id: 'french',
    name: 'French',
    blurb: 'A cavalry kingdom built for the charge, with cheaper economy.',
    traits: [
      'Drop-off buildings cost 50% less wood.',
      'Economic technologies cost 35% less.',
      'Villagers train 13% faster.',
      'Keeps cost 10% less stone.',
      'Royal Knights arrive an age early; Arbalétriers bring heavy crossbows.',
    ],
  },
];

interface MapSizeChoice {
  id: LobbySettings['mapSize'];
  label: string;
  tiles: number;
}

/** Tile counts mirror MAP_SIZES in src/sim/constants.ts. */
const MAP_SIZE_CHOICES: MapSizeChoice[] = [
  { id: 'tiny', label: 'Tiny', tiles: 80 },
  { id: 'small', label: 'Small', tiles: 112 },
  { id: 'medium', label: 'Medium', tiles: 144 },
  { id: 'large', label: 'Large', tiles: 176 },
  { id: 'huge', label: 'Huge', tiles: 208 },
];

interface MapTypeChoice {
  id: string;
  label: string;
  blurb: string;
}

const MAP_TYPE_CHOICES: MapTypeChoice[] = [
  { id: 'grassland', label: 'Grassland', blurb: 'Open green fields with scattered woods.' },
  { id: 'dry', label: 'Dry', blurb: 'Sparse scrub, long sight lines, less timber.' },
  { id: 'forest', label: 'Forest', blurb: 'Dense stealth woods that hide units.' },
];

interface VictoryChoice {
  id: 0 | 1 | 2;
  label: string;
  blurb: string;
}

const VICTORY_CHOICES: VictoryChoice[] = [
  { id: 0, label: 'Landmarks', blurb: 'Raze every enemy landmark.' },
  { id: 1, label: 'Sacred Sites', blurb: 'Capture and hold the sacred sites.' },
  { id: 2, label: 'Wonder', blurb: 'Complete a Wonder and defend it.' },
];

interface StartChoice {
  id: LobbySettings['startingResources'];
  label: string;
  blurb: string;
}

const START_CHOICES: StartChoice[] = [
  { id: 'standard', label: 'Standard', blurb: '200 food · 150 wood · 100 gold' },
  { id: 'high', label: 'High', blurb: '2,000 food · 2,000 wood · 1,000 gold · 800 stone' },
  { id: 'veryhigh', label: 'Very High', blurb: '50,000 food · 50,000 wood · 25,000 gold · 10,000 stone' },
];

const DIFFICULTY_LABELS: ReadonlyArray<string> = ['Easy', 'Intermediate', 'Hard'];

const MAX_BOTS = 3;

interface HotkeyRow {
  action: string;
  keys: string;
  note: string;
}

/**
 * Default bindings actually used by this build. `src/game/input.ts` does not
 * exist yet in this repository, so this table is the authoritative list the
 * session's input layer implements.
 */
const HOTKEY_ROWS: HotkeyRow[] = [
  { action: 'Pan camera', keys: 'W A S D / Arrow keys / edge scroll', note: 'Screen-edge scrolling can be disabled in settings' },
  { action: 'Zoom camera', keys: 'Mouse wheel', note: 'Notch based' },
  { action: 'Rotate camera', keys: 'Q / E, or middle-mouse drag', note: 'The minimap also has rotate buttons' },
  { action: 'Select all Town Centers', keys: 'H', note: 'Cycles through your Town Centers' },
  { action: 'Idle villager', keys: '. (period)', note: 'Selects the next idle villager' },
  { action: 'Attack-move', keys: 'A', note: 'Then click a target position' },
  { action: 'Stop', keys: 'S', note: 'Cancels the current orders' },
  { action: 'Gather', keys: 'G', note: 'Then click a resource node' },
  { action: 'Build menu', keys: 'B', note: 'Opens the villager build card' },
  { action: 'Assign control group', keys: 'Ctrl + 1 … 0', note: 'The HUD control-group bar assigns on ctrl+click' },
  { action: 'Select control group', keys: '1 … 0', note: 'Shift adds the group to the selection' },
  { action: 'Delete selected', keys: 'Delete', note: 'Deletes units and buildings you own' },
  { action: 'Cancel / deselect', keys: 'Escape', note: 'Closes menus and clears the selection' },
  { action: 'Command card', keys: 'Q W E R / A S D / Z X C', note: 'Context-sensitive grid on the bottom bar' },
  { action: 'Minimap order', keys: 'Left click / right click / drag', note: 'Left moves the camera, right issues an order' },
];

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

function button(label: string, className: string): HTMLButtonElement {
  const node = el('button', className, label);
  node.type = 'button';
  return node;
}

function randomSeed(): number {
  const value = Math.floor(Math.random() * 0x100000000);
  return value >>> 0;
}

function clampSeed(value: number): number {
  if (!Number.isFinite(value)) return randomSeed();
  const int = Math.floor(value);
  if (int < 0) return 0;
  if (int > 0xffffffff) return 0xffffffff;
  return int >>> 0;
}

function asCiv(value: string): LobbySettings['civ'] {
  return value === 'french' ? 'french' : 'english';
}

function asDifficulty(value: string | number): 0 | 1 | 2 {
  const n = typeof value === 'number' ? value : Number.parseInt(value, 10);
  return n === 0 || n === 1 || n === 2 ? n : 1;
}

function asMapSize(value: string): LobbySettings['mapSize'] {
  for (const choice of MAP_SIZE_CHOICES) if (choice.id === value) return choice.id;
  return 'medium';
}

function select(
  options: Array<{ value: string; label: string }>,
  initial: string,
  onChange: (value: string) => void,
): HTMLSelectElement {
  const node = el('select', 'aoe-select');
  for (const option of options) {
    const item = el('option', undefined, option.label);
    item.value = option.value;
    node.appendChild(item);
  }
  node.value = initial;
  node.addEventListener('change', () => onChange(node.value));
  return node;
}

interface Segments<T> {
  root: HTMLDivElement;
  /** Move the highlight without firing the change callback. */
  mark(value: T): void;
}

function segments<T extends string | number>(
  options: Array<{ id: T; label: string; blurb: string }>,
  initial: T,
  onPick: (id: T) => void,
): Segments<T> {
  const root = el('div', 'aoe-segments');
  const buttons = new Map<T, HTMLButtonElement>();
  const mark = (value: T): void => {
    for (const [id, node] of buttons) node.classList.toggle('is-active', id === value);
  };
  for (const option of options) {
    // No text on the button itself: the label and blurb spans below are the
    // only children, so the label is not rendered twice.
    const node = button('', 'aoe-segment');
    node.title = option.blurb;
    node.addEventListener('click', () => {
      mark(option.id);
      onPick(option.id);
    });
    node.appendChild(el('span', 'aoe-segment-label', option.label));
    node.appendChild(el('span', 'aoe-segment-blurb', option.blurb));
    root.appendChild(node);
    buttons.set(option.id, node);
  }
  mark(initial);
  return { root, mark };
}

function field(legend: string): HTMLFieldSetElement {
  const node = el('fieldset', 'aoe-field');
  node.appendChild(el('legend', 'aoe-legend', legend));
  return node;
}

/* ------------------------------------------------------------------ *
 * createMenu
 * ------------------------------------------------------------------ */

export function createMenu(root: HTMLElement): Menu {
  /* --- lobby state, kept across show() calls ------------------------ */
  const state = {
    playerName: 'Commander',
    civ: 'english' as LobbySettings['civ'],
    mapSize: 'medium' as LobbySettings['mapSize'],
    mapType: 'grassland',
    botCount: 1,
    botCivs: ['french', 'english', 'french'] as Array<LobbySettings['civ']>,
    botDifficulties: [1, 1, 1] as Array<0 | 1 | 2>,
    victory: 0 as 0 | 1 | 2,
    startingResources: 'standard' as LobbySettings['startingResources'],
    seed: 1234,
    revealMap: false,
  };

  const menu = el('div', 'aoe-menu');
  menu.hidden = true;

  type ScreenName = 'title' | 'skirmish' | 'controls' | 'credits';
  const screenNames: ScreenName[] = ['title', 'skirmish', 'controls', 'credits'];
  const screens = new Map<ScreenName, HTMLDivElement>();
  for (const name of screenNames) {
    const screen = el('div', `aoe-screen aoe-screen-${name}`);
    screen.hidden = true;
    screens.set(name, screen);
    menu.appendChild(screen);
  }

  let currentScreen: ScreenName = 'title';
  const showScreen = (name: ScreenName): void => {
    currentScreen = name;
    for (const [key, node] of screens) node.hidden = key !== name;
    menu.querySelectorAll('.aoe-scroll').forEach((node) => {
      if (node instanceof HTMLElement) node.scrollTop = 0;
    });
  };

  /* --- title screen -------------------------------------------------- */
  const titleScreen = screens.get('title') as HTMLDivElement;
  const titleCard = el('div', 'aoe-titlecard');
  titleCard.appendChild(el('div', 'aoe-title-kicker', 'A browser real-time strategy game'));
  titleCard.appendChild(el('h1', 'aoe-title', 'Aegis of Ages'));
  titleCard.appendChild(
    el(
      'p',
      'aoe-subtitle',
      'Raise a settlement, gather, advance through four ages and out-manoeuvre your rivals on a deterministic battlefield.',
    ),
  );
  const titleButtons = el('div', 'aoe-titlebuttons');
  const skirmishBtn = button('Skirmish', 'aoe-btn aoe-btn-primary');
  const controlsBtn = button('Controls', 'aoe-btn');
  const creditsBtn = button('Credits', 'aoe-btn');
  const quitBtn = button('Quit', 'aoe-btn aoe-btn-quiet');
  quitBtn.hidden = true;
  titleButtons.appendChild(skirmishBtn);
  titleButtons.appendChild(controlsBtn);
  titleButtons.appendChild(creditsBtn);
  titleButtons.appendChild(quitBtn);
  titleCard.appendChild(titleButtons);
  titleCard.appendChild(
    el(
      'p',
      'aoe-title-note',
      'Every model, texture, icon and sound is generated in code at runtime. No third-party assets.',
    ),
  );
  titleScreen.appendChild(titleCard);
  titleScreen.appendChild(el('div', 'aoe-vignette'));

  /* --- shared screen header ------------------------------------------ */
  const screenHeader = (title: string): HTMLDivElement => {
    const header = el('div', 'aoe-screenhead');
    const back = button('\u2039 Back', 'aoe-btn aoe-btn-quiet aoe-back');
    back.addEventListener('click', () => showScreen('title'));
    header.appendChild(back);
    header.appendChild(el('h2', 'aoe-screen-title', title));
    return header;
  };

  /* --- skirmish lobby -------------------------------------------------- */
  const skirmish = screens.get('skirmish') as HTMLDivElement;
  skirmish.appendChild(screenHeader('Skirmish'));
  const scroll = el('div', 'aoe-scroll');
  skirmish.appendChild(scroll);

  // Commander name.
  const nameField = field('Commander');
  const nameInput = el('input', 'aoe-input');
  nameInput.type = 'text';
  nameInput.maxLength = 18;
  nameInput.value = state.playerName;
  nameInput.placeholder = 'Your name';
  nameInput.addEventListener('input', () => {
    state.playerName = nameInput.value;
  });
  const nameRow = el('label', 'aoe-row');
  nameRow.appendChild(el('span', 'aoe-row-label', 'Player name'));
  nameRow.appendChild(nameInput);
  nameField.appendChild(nameRow);
  scroll.appendChild(nameField);

  // Civilization picker.
  const civField = field('Civilization');
  const civGrid = el('div', 'aoe-civgrid');
  const civCards = new Map<LobbySettings['civ'], HTMLButtonElement>();
  const markCiv = (): void => {
    for (const [id, card] of civCards) card.classList.toggle('is-active', id === state.civ);
  };
  for (const civ of CIV_CHOICES) {
    const card = button('', `aoe-civcard aoe-civ-${civ.id}`);
    card.classList.add('aoe-civcard');
    card.appendChild(el('span', 'aoe-civ-name', civ.name));
    card.appendChild(el('span', 'aoe-civ-blurb', civ.blurb));
    const traits = el('span', 'aoe-civ-traits');
    for (const trait of civ.traits) traits.appendChild(el('span', 'aoe-civ-trait', trait));
    card.appendChild(traits);
    card.addEventListener('click', () => {
      state.civ = civ.id;
      markCiv();
    });
    civGrid.appendChild(card);
    civCards.set(civ.id, card);
  }
  markCiv();
  civField.appendChild(civGrid);
  scroll.appendChild(civField);

  // Map options.
  const mapField = field('Map');
  const sizeRow = el('label', 'aoe-row');
  sizeRow.appendChild(el('span', 'aoe-row-label', 'Map size'));
  const sizeSelect = select(
    MAP_SIZE_CHOICES.map((choice) => ({ value: choice.id, label: `${choice.label} — ${choice.tiles} × ${choice.tiles}` })),
    state.mapSize,
    (value) => {
      state.mapSize = asMapSize(value);
    },
  );
  sizeRow.appendChild(sizeSelect);
  mapField.appendChild(sizeRow);

  const typeRow = el('div', 'aoe-row aoe-row-block');
  typeRow.appendChild(el('span', 'aoe-row-label', 'Terrain'));
  const terrain = segments(
    MAP_TYPE_CHOICES.map((choice) => ({ id: choice.id, label: choice.label, blurb: choice.blurb })),
    state.mapType,
    (id) => {
      state.mapType = id;
    },
  );
  typeRow.appendChild(terrain.root);
  mapField.appendChild(typeRow);

  const seedRow = el('label', 'aoe-row');
  seedRow.appendChild(el('span', 'aoe-row-label', 'Map seed'));
  const seedInput = el('input', 'aoe-input aoe-input-small');
  seedInput.type = 'number';
  seedInput.min = '0';
  seedInput.max = '4294967295';
  seedInput.step = '1';
  seedInput.value = String(state.seed);
  seedInput.addEventListener('input', () => {
    const parsed = Number.parseInt(seedInput.value, 10);
    if (Number.isFinite(parsed)) state.seed = clampSeed(parsed);
  });
  const seedRandom = button('Randomise', 'aoe-btn aoe-btn-small');
  seedRandom.addEventListener('click', () => {
    state.seed = randomSeed();
    seedInput.value = String(state.seed);
  });
  seedRow.appendChild(seedInput);
  seedRow.appendChild(seedRandom);
  mapField.appendChild(seedRow);

  const revealRow = el('label', 'aoe-checkrow');
  const revealInput = el('input', 'aoe-check');
  revealInput.type = 'checkbox';
  revealInput.checked = state.revealMap;
  revealInput.addEventListener('change', () => {
    state.revealMap = revealInput.checked;
  });
  revealRow.appendChild(revealInput);
  revealRow.appendChild(el('span', 'aoe-check-label', 'Reveal map (no fog of war)'));
  mapField.appendChild(revealRow);
  scroll.appendChild(mapField);

  // Opponents.
  const botField = field('Opponents');
  const botCountRow = el('label', 'aoe-row');
  botCountRow.appendChild(el('span', 'aoe-row-label', 'Number of bots'));
  const botList = el('div', 'aoe-botlist');
  const botCountSelect = select(
    [1, 2, 3].map((n) => ({ value: String(n), label: `${n} bot${n === 1 ? '' : 's'}` })),
    String(state.botCount),
    (value) => {
      const parsed = Number.parseInt(value, 10);
      state.botCount = parsed >= 1 && parsed <= MAX_BOTS ? parsed : 1;
      renderBots();
    },
  );
  botCountRow.appendChild(botCountSelect);
  botField.appendChild(botCountRow);

  const renderBots = (): void => {
    botList.textContent = '';
    for (let i = 0; i < state.botCount; i++) {
      const row = el('div', 'aoe-botrow');
      row.appendChild(el('span', 'aoe-botname', `Bot ${i + 1}`));
      const civSelect = select(
        CIV_CHOICES.map((civ) => ({ value: civ.id, label: civ.name })),
        state.botCivs[i] ?? 'french',
        (value) => {
          state.botCivs[i] = asCiv(value);
        },
      );
      const diffSelect = select(
        DIFFICULTY_LABELS.map((label, index) => ({ value: String(index), label })),
        String(state.botDifficulties[i] ?? 1),
        (value) => {
          state.botDifficulties[i] = asDifficulty(value);
        },
      );
      row.appendChild(civSelect);
      row.appendChild(diffSelect);
      botList.appendChild(row);
    }
  };
  renderBots();
  botField.appendChild(botList);
  scroll.appendChild(botField);

  // Victory condition.
  const victoryField = field('Victory condition');
  const victorySegments = segments(
    VICTORY_CHOICES.map((choice) => ({ id: choice.id, label: choice.label, blurb: choice.blurb })),
    state.victory,
    (id) => {
      state.victory = id;
    },
  );
  victoryField.appendChild(victorySegments.root);
  scroll.appendChild(victoryField);

  // Starting resources.
  const startField = field('Starting resources');
  const startSegments = segments(
    START_CHOICES.map((choice) => ({ id: choice.id, label: choice.label, blurb: choice.blurb })),
    state.startingResources,
    (id) => {
      state.startingResources = id;
    },
  );
  startField.appendChild(startSegments.root);
  scroll.appendChild(startField);

  const startFooter = el('div', 'aoe-footer');
  const startBtn = button('Start match', 'aoe-btn aoe-btn-primary aoe-btn-large');
  startFooter.appendChild(startBtn);
  startFooter.appendChild(el('span', 'aoe-footer-note', 'Esc returns to the title screen.'));
  skirmish.appendChild(startFooter);

  /* --- controls screen -------------------------------------------------- */
  const controls = screens.get('controls') as HTMLDivElement;
  controls.appendChild(screenHeader('Controls'));
  const controlsScroll = el('div', 'aoe-scroll');
  controls.appendChild(controlsScroll);
  const keyCard = el('div', 'aoe-keycard');
  keyCard.appendChild(
    el(
      'p',
      'aoe-keyintro',
      'Default bindings. Hotkeys are shown on the command card in game; the interface renders the letters and the input layer handles the keys.',
    ),
  );
  const keyTable = el('table', 'aoe-keytable');
  const keyHead = el('thead');
  const keyHeadRow = el('tr');
  for (const label of ['Action', 'Keys', 'Notes']) keyHeadRow.appendChild(el('th', undefined, label));
  keyHead.appendChild(keyHeadRow);
  keyTable.appendChild(keyHead);
  const keyBody = el('tbody');
  for (const row of HOTKEY_ROWS) {
    const tr = el('tr');
    tr.appendChild(el('td', 'aoe-keyaction', row.action));
    tr.appendChild(el('td', 'aoe-keykeys', row.keys));
    tr.appendChild(el('td', 'aoe-keynote', row.note));
    keyBody.appendChild(tr);
  }
  keyTable.appendChild(keyBody);
  keyCard.appendChild(keyTable);
  controlsScroll.appendChild(keyCard);

  /* --- credits screen --------------------------------------------------- */
  const credits = screens.get('credits') as HTMLDivElement;
  credits.appendChild(screenHeader('Credits'));
  const creditsScroll = el('div', 'aoe-scroll');
  credits.appendChild(creditsScroll);
  const creditsCard = el('div', 'aoe-keycard');
  creditsCard.appendChild(el('h3', 'aoe-credits-title', 'Aegis of Ages'));
  creditsCard.appendChild(
    el('p', 'aoe-credits-line', 'An original browser real-time strategy game: deterministic simulation, low-poly 3D battlefield, command-card interface.'),
  );
  creditsCard.appendChild(el('h4', 'aoe-credits-head', 'Design, simulation and code'));
  creditsCard.appendChild(
    el('p', 'aoe-credits-line', 'Built by the Aegis of Ages project. Fixed-tick simulation, pathfinding, economy, combat, bots and interface are all written for this project.'),
  );
  creditsCard.appendChild(el('h4', 'aoe-credits-head', 'Art and audio'));
  creditsCard.appendChild(
    el(
      'p',
      'aoe-credits-line',
      'Every unit, building, portrait, icon, terrain texture and sound effect is generated procedurally in code at runtime — inline SVG, CSS gradients and low-poly geometry, with synthesised audio. No third-party art, audio or font assets are bundled or downloaded.',
    ),
  );
  creditsCard.appendChild(el('h4', 'aoe-credits-head', 'Technology'));
  creditsCard.appendChild(
    el('p', 'aoe-credits-line', 'TypeScript, Vite and three.js for rendering. The simulation runs headless in Node for reproducible tests and replays.'),
  );
  creditsCard.appendChild(el('h4', 'aoe-credits-head', 'Statement'));
  creditsCard.appendChild(
    el(
      'p',
      'aoe-credits-line',
      'This is an original work inspired by the real-time strategy genre. It is not affiliated with, endorsed by or derived from any commercial game, and it contains no assets from any other title.',
    ),
  );
  creditsScroll.appendChild(creditsCard);

  root.appendChild(menu);

  /* --- wiring ------------------------------------------------------------ */
  let startCallback: ((settings: LobbySettings) => void) | null = null;
  let quitCallback: (() => void) | null = null;
  let visible = false;

  const buildSettings = (): LobbySettings => {
    const bots: LobbySettings['bots'] = [];
    for (let i = 0; i < state.botCount; i++) {
      bots.push({
        civ: state.botCivs[i] ?? 'french',
        difficulty: asDifficulty(state.botDifficulties[i] ?? 1),
        // Every bot is its own team: a free-for-all skirmish.
        team: i + 1,
      });
    }
    return {
      playerName: state.playerName.trim().length > 0 ? state.playerName.trim() : 'Commander',
      civ: state.civ,
      mapSize: state.mapSize,
      mapType: state.mapType,
      bots,
      victory: state.victory,
      startingResources: state.startingResources,
      seed: clampSeed(state.seed),
      revealMap: state.revealMap,
    };
  };

  skirmishBtn.addEventListener('click', () => showScreen('skirmish'));
  controlsBtn.addEventListener('click', () => showScreen('controls'));
  creditsBtn.addEventListener('click', () => showScreen('credits'));
  quitBtn.addEventListener('click', () => {
    if (quitCallback) quitCallback();
  });
  startBtn.addEventListener('click', () => {
    const settings = buildSettings();
    hide();
    if (startCallback) startCallback(settings);
  });

  const onKeyDown = (event: KeyboardEvent): void => {
    if (!visible) return;
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement) {
      if (event.key !== 'Escape') return;
    }
    if (event.key === 'Escape' && currentScreen !== 'title') {
      event.preventDefault();
      showScreen('title');
    }
  };

  function hide(): void {
    visible = false;
    menu.hidden = true;
    document.removeEventListener('keydown', onKeyDown);
  }

  function show(onStart: (settings: LobbySettings) => void, onQuit?: () => void): void {
    startCallback = onStart;
    quitCallback = onQuit ?? null;
    quitBtn.hidden = onQuit === undefined;
    nameInput.value = state.playerName;
    seedInput.value = String(state.seed);
    revealInput.checked = state.revealMap;
    sizeSelect.value = state.mapSize;
    terrain.mark(state.mapType);
    victorySegments.mark(state.victory);
    startSegments.mark(state.startingResources);
    botCountSelect.value = String(state.botCount);
    markCiv();
    renderBots();
    showScreen('title');
    visible = true;
    menu.hidden = false;
    document.addEventListener('keydown', onKeyDown);
  }

  function dispose(): void {
    hide();
    menu.remove();
    startCallback = null;
    quitCallback = null;
  }

  return { show, hide, dispose };
}
