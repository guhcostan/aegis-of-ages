/**
 * Shared helpers for the e2e suite.
 *
 * Every test goes through window.__game: it is the same command protocol the
 * player uses, so the tests cannot reach into simulation internals to fake a
 * result.
 */
import { expect, type Page } from '@playwright/test';

export interface ConsoleWatch {
  errors: string[];
  pageErrors: string[];
}

/** Attach console and page-error listeners; call before navigation. */
export function watchConsole(page: Page): ConsoleWatch {
  const watch: ConsoleWatch = { errors: [], pageErrors: [] };
  page.on('console', (msg) => {
    if (msg.type() === 'error') watch.errors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    watch.pageErrors.push(err.message);
  });
  return watch;
}

/** Load the app and wait until the shell has booted. */
export async function loadShell(page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.dataset.aegisReady === 'true', null, {
    timeout: 30_000,
  });
  await expect(page.locator('#menu-root')).toBeVisible();
}

export interface LobbyOverrides {
  civ?: 'english' | 'french';
  mapSize?: 'tiny' | 'small' | 'medium' | 'large' | 'huge';
  mapType?: string;
  bots?: Array<{ civ: 'english' | 'french'; difficulty: 0 | 1 | 2; team: number }>;
  victory?: 0 | 1 | 2;
  startingResources?: 'standard' | 'high' | 'veryhigh';
  seed?: number;
  revealMap?: boolean;
  playerAsBot?: boolean;
  playerBotDifficulty?: 0 | 1 | 2;
}

/** Start a match programmatically and wait for the simulation to be live. */
export async function startMatch(page: Page, overrides: LobbyOverrides = {}): Promise<void> {
  await page.evaluate((o) => {
    window.__aegis?.startMatch(o as never);
  }, overrides);
  await page.waitForFunction(() => window.__game?.ready() === true, null, { timeout: 30_000 });
}

/** Advance the simulation by n ticks, waiting for the page to catch up. */
export async function step(page: Page, ticks: number): Promise<void> {
  await page.evaluate((n) => window.__game?.step(n), ticks);
}

/** Read the current state snapshot. */
export async function state(page: Page) {
  return page.evaluate(() => window.__game?.state());
}

/** Wait until the simulation tick passes a threshold. */
export async function waitForTick(page: Page, tick: number, timeout = 60_000): Promise<void> {
  await page.waitForFunction((t) => (window.__game?.tick() ?? 0) >= t, tick, { timeout });
}

/** Assert that no uncaught error reached the console during the test. */
export function expectNoErrors(watch: ConsoleWatch): void {
  expect(watch.pageErrors, `page errors: ${watch.pageErrors.join(' | ')}`).toHaveLength(0);
  const fatal = watch.errors.filter(
    (e) => !e.includes('favicon') && !e.includes('Download the React DevTools'),
  );
  expect(fatal, `console errors: ${fatal.join(' | ')}`).toHaveLength(0);
}
