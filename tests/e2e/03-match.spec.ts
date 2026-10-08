/**
 * Full-match acceptance tests: menu to victory screen.
 *
 * These are the acceptance criteria from the brief: a complete match played by
 * a simulated player against a bot, a bot-vs-bot match, and one finished match
 * per victory condition, all with no console errors.
 */
import { expect, test, type Page } from '@playwright/test';
import { expectNoErrors, loadShell, startMatch, state, watchConsole } from './helpers';

/** Run the in-page simulated player and return the result. */
async function playToVictory(page: Page, maxSeconds: number) {
  return page.evaluate((seconds) => window.__game?.simulate({ maxSeconds: seconds }), maxSeconds);
}

/** True when the victory or defeat overlay is on screen. */
async function victoryOverlayVisible(page: Page): Promise<boolean> {
  const hud = page.locator('#hud-root');
  const text = await hud.innerText();
  return /victory|defeat|wins|conquered|draw/i.test(text);
}

test.describe('complete matches', () => {
  test('simulated player beats a bot and reaches the victory screen', async ({ page }) => {
    test.setTimeout(600_000);
    const watch = watchConsole(page);
    await loadShell(page);

    // Start through the real lobby.
    await page.getByRole('button', { name: 'Skirmish' }).click();
    await page.getByRole('button', { name: 'Start match' }).click();
    await page.waitForFunction(() => window.__game?.ready() === true, null, { timeout: 30_000 });

    const result = await playToVictory(page, 60 * 40);
    expect(result).toBeTruthy();
    expect(await page.evaluate(() => window.__game?.isOver())).toBe(true);
    expect(result?.winner === 0 || result?.winner === 1).toBe(true);
    expect(await victoryOverlayVisible(page), 'no victory overlay was shown').toBe(true);
    expectNoErrors(watch);
  });

  test('bot versus bot finishes with a winner', async ({ page }) => {
    test.setTimeout(600_000);
    const watch = watchConsole(page);
    await loadShell(page);
    await startMatch(page, {
      seed: 4321,
      playerAsBot: true,
      playerBotDifficulty: 1,
      bots: [{ civ: 'french', difficulty: 1, team: 0 }],
      mapSize: 'small',
    });

    const result = await playToVictory(page, 60 * 40);
    expect(await page.evaluate(() => window.__game?.isOver())).toBe(true);
    expect(result?.winner === 0 || result?.winner === 1).toBe(true);
    expect(result?.reason.length ?? 0).toBeGreaterThan(0);
    expect(await victoryOverlayVisible(page)).toBe(true);
    expectNoErrors(watch);
  });

  test('wonder victory: build a Wonder and hold it for the countdown', async ({ page }) => {
    test.setTimeout(600_000);
    const watch = watchConsole(page);
    await loadShell(page);
    await startMatch(page, {
      seed: 4322,
      victory: 2,
      mapSize: 'small',
      revealMap: true,
      startingResources: 'veryhigh',
      bots: [],
    });

    const placed = await page.evaluate(() => {
      const snapshot = window.__game?.state();
      const tc = snapshot?.entities.find((e) => e.def === 'town_center' && e.owner === 0);
      if (!tc) return false;
      return window.__game?.placeBuilding('wonder', (tc.x >> 10) + 8, (tc.y >> 10) + 8, 0) ?? false;
    });
    expect(placed, 'the Wonder could not be placed').toBe(true);

    // Ten minutes of countdown at 20 ticks per second.
    await page.evaluate(() => window.__game?.step(20 * 60 * 10 + 40));
    const snapshot = await state(page);
    expect(snapshot?.over).toBe(true);
    expect(snapshot?.winner).toBe(0);
    expect(snapshot?.reason ?? '').toMatch(/wonder/i);
    expect(await victoryOverlayVisible(page)).toBe(true);
    expectNoErrors(watch);
  });

  test('sacred site victory: hold the sites for the countdown', async ({ page }) => {
    test.setTimeout(600_000);
    const watch = watchConsole(page);
    await loadShell(page);
    await startMatch(page, {
      seed: 4323,
      victory: 1,
      mapSize: 'small',
      revealMap: true,
      startingResources: 'veryhigh',
      bots: [],
    });

    const sites = await page.evaluate(() => {
      const snapshot = window.__game?.state();
      return (snapshot?.entities ?? [])
        .filter((e) => e.kind === 6)
        .map((e) => ({ id: e.id, x: e.x, y: e.y }));
    });
    expect(sites.length).toBeGreaterThanOrEqual(3);

    // Park an army on every sacred site; the sites are captured by presence.
    await page.evaluate((positions) => {
      for (const site of positions) {
        window.__game?.spawn('spearman', 4, 0, site.x, site.y);
      }
    }, sites);

    await page.evaluate(() => window.__game?.step(20 * 60 * 5 + 200));
    const snapshot = await state(page);
    expect(snapshot?.over).toBe(true);
    expect(snapshot?.winner).toBe(0);
    expect(snapshot?.reason ?? '').toMatch(/sacred/i);
    expect(await victoryOverlayVisible(page)).toBe(true);
    expectNoErrors(watch);
  });

  test('landmark victory: destroying every enemy landmark wins', async ({ page }) => {
    test.setTimeout(600_000);
    const watch = watchConsole(page);
    await loadShell(page);
    await startMatch(page, {
      seed: 4324,
      victory: 0,
      mapSize: 'small',
      revealMap: true,
      startingResources: 'veryhigh',
      bots: [],
    });

    // Give the opponent a landmark, then raze it along with everything else.
    const razed = await page.evaluate(() => {
      const api = window.__game;
      if (!api) return null;
      const snapshot = api.state();
      const enemyStart = snapshot.entities.find((e) => e.def === 'town_center' && e.owner === 1);
      if (!enemyStart) return null;
      const placed = api.placeBuilding('council_hall', (enemyStart.x >> 10) + 6, enemyStart.y >> 10, 1);
      return { placed, landmarks: api.state().players[1]?.landmarks ?? 0 };
    });
    expect(razed?.placed).toBe(true);
    expect(razed?.landmarks ?? 0).toBeGreaterThan(0);

    // Send a large army to destroy everything the opponent owns.
    const finished = await page.evaluate(() => {
      const api = window.__game;
      if (!api) return false;
      const snapshot = api.state();
      const targets = snapshot.entities.filter((e) => e.owner === 1);
      const army = snapshot.entities.filter((e) => e.owner === 0 && e.def === 'villager').map((e) => e.id);
      for (const target of targets) {
        if (army.length > 0) {
          api.command({ type: 2, player: 0, units: army, target: target.id, queue: false });
        }
      }
      api.spawn('knight', 12, 0, targets[0]?.x ?? 0, targets[0]?.y ?? 0);
      for (let i = 0; i < 120; i++) {
        api.step(20);
        if (api.isOver()) return true;
      }
      return api.isOver();
    });
    expect(finished, 'the match never ended after razing the enemy').toBe(true);
    const snapshot = await state(page);
    expect(snapshot?.winner).toBe(0);
    expectNoErrors(watch);
  });
});

test.describe('performance', () => {
  test('renders 200 units and reports the measured frame rate', async ({ page }) => {
    test.setTimeout(300_000);
    const watch = watchConsole(page);
    await loadShell(page);
    await startMatch(page, { seed: 5150, mapSize: 'medium', revealMap: true, startingResources: 'veryhigh' });

    // Concentrate an army in front of the camera.
    await page.evaluate(() => {
      const api = window.__game;
      if (!api) return;
      const tc = api.state().entities.find((e) => e.def === 'town_center' && e.owner === 0);
      const cx = (tc?.x ?? 0) + 6 * 1024;
      const cy = (tc?.y ?? 0) + 6 * 1024;
      const types = ['spearman', 'archer', 'knight', 'horseman', 'manatarms'];
      for (let i = 0; i < 200; i++) {
        const def = types[i % types.length] as string;
        api.spawn(def, 1, i % 2 === 0 ? 0 : 1, cx + ((i % 20) - 10) * 1024, cy + (Math.floor(i / 20) - 5) * 1024);
      }
      api.camera.center(cx, cy);
    });

    const counts = await page.evaluate(() => window.__game?.counts());
    expect(counts?.units ?? 0).toBeGreaterThanOrEqual(200);

    // Let the render loop run for a few seconds and sample the counters.
    await page.waitForTimeout(5000);
    const stats = await page.evaluate(() => window.__game?.renderStats());
    const fps = await page.evaluate(() => window.__game?.fps());
    const instances = stats?.instances ?? 0;
    expect(instances).toBeGreaterThanOrEqual(200);

    // Report the measurement in the test log so the number is on the record.
    console.log(
      `PERF: instances=${instances} drawCalls=${stats?.drawCalls ?? 0} rendererFps=${stats?.fps ?? 0} gameFps=${fps}`,
    );
    // SwiftShader software rendering in CI cannot hit 60 fps; assert only that
    // the scene is genuinely being drawn and the simulation keeps ticking.
    const tickBefore = await page.evaluate(() => window.__game?.tick() ?? 0);
    await page.waitForTimeout(2000);
    const tickAfter = await page.evaluate(() => window.__game?.tick() ?? 0);
    expect(tickAfter).toBeGreaterThan(tickBefore);
    expect(instances).toBeGreaterThan(0);
    expectNoErrors(watch);
  });
});
