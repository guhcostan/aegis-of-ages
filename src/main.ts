/**
 * Application entry point.
 *
 * Boots the shell (canvas + HUD root + menu root), shows the skirmish menu and
 * starts a match when the player hits Start. Also installs `window.__game`, the
 * automation surface the Playwright suite drives.
 */
import './style.css';
import { createMenu } from './ui/menu';
import { GameSession } from './game/session';
import { installGameApi } from './game/api';
import { DEFAULT_LOBBY, type LobbySettings } from './ui/types';

function require<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Aegis of Ages: index.html is missing #${id}`);
  return el as T;
}

const canvas = require<HTMLCanvasElement>('view');
const hudRoot = require<HTMLElement>('hud-root');
const menuRoot = require<HTMLElement>('menu-root');

/** The running match, or null while the menu is up. */
let session: GameSession | null = null;

const menu = createMenu(menuRoot);

function startMatch(settings: LobbySettings): void {
  session?.dispose();
  session = null;
  menu.hide();
  hudRoot.classList.remove('hidden');
  canvas.classList.remove('hidden');

  try {
    session = new GameSession({ canvas, hudRoot, settings });
    session.start();
    session.toast(`Match started — ${settings.civ === 'english' ? 'English' : 'French'}`);
  } catch (error) {
    // Surface boot failures in the page rather than only in the console, so the
    // e2e suite can assert on a visible message.
    const message = error instanceof Error ? error.message : String(error);
    menuRoot.innerHTML = '';
    const fatal = document.createElement('div');
    fatal.className = 'fatal-error';
    fatal.textContent = `Failed to start the match: ${message}`;
    menuRoot.appendChild(fatal);
    menuRoot.classList.remove('hidden');
    hudRoot.classList.add('hidden');
    console.error(error);
  }
}

function showMenu(): void {
  session?.dispose();
  session = null;
  hudRoot.classList.add('hidden');
  canvas.classList.add('hidden');
  menu.show(startMatch);
}

installGameApi({
  session: () => session,
  startMatch: (overrides) => {
    startMatch({ ...DEFAULT_LOBBY, ...(overrides as Partial<LobbySettings>) });
  },
  showMenu,
});

/** Programmatic hook used by the e2e tests to start and stop matches. */
window.__aegis = {
  get session() {
    return session;
  },
  startMatch: (overrides) => startMatch({ ...DEFAULT_LOBBY, ...overrides }),
  showMenu,
};

// Resize handling: the canvas always fills its container.
const resize = (): void => {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  canvas.width = Math.floor(width * Math.min(2, window.devicePixelRatio || 1));
  canvas.height = Math.floor(height * Math.min(2, window.devicePixelRatio || 1));
  session?.renderer.resize(width, height);
};
window.addEventListener('resize', resize);

// Mark the shell as ready for the e2e suite.
document.body.dataset.aegisReady = 'true';
resize();
showMenu();
