/**
 * Golden path: the complete playable loop, end to end, against production.
 *
 * This is the acceptance test for "a playable version": menu -> match -> four
 * resources gathered -> construction -> age up by landmark -> army -> combat
 * with counters -> a victory condition. It drives the real UI wherever a player
 * would (buttons, canvas clicks) and reads state through window.__game, which is
 * the surface the brief requires.
 */
import { expect, test, type Page } from '@playwright/test';
import { expectNoErrors, loadShell, watchConsole } from './helpers';

const TICK_RATE = 20;

/** Read the live state. */
async function state(page: Page) {
  return page.evaluate(() => window.__game?.state());
}

/** Advance the simulation by n ticks and let the HUD catch up. */
async function step(page: Page, ticks: number): Promise<void> {
  await page.evaluate((n) => window.__game?.step(n), ticks);
  await page.waitForTimeout(80);
}

/** Resource totals for the local player. */
async function resources(page: Page) {
  const s = await state(page);
  const r = s?.players[0]?.resources;
  return { food: r?.food ?? 0, wood: r?.wood ?? 0, gold: r?.gold ?? 0, stone: r?.stone ?? 0 };
}

/** Village counts per resource, from the HUD model the player sees. */
async function villagerSplit(page: Page) {
  return page.evaluate(() => {
    const p = window.__game?.state().players[0];
    return p?.villagerCounts ?? { food: 0, wood: 0, gold: 0, stone: 0, idle: 0 };
  });
}

/**
 * Click the command-card button whose data-cmd matches.
 *
 * The card is rebuilt on the animation frame after the selection changes. Under
 * the software rasteriser used in CI a frame can take several hundred
 * milliseconds, so this waits for the button instead of assuming a fixed delay.
 */
async function clickCommand(page: Page, cmd: string): Promise<boolean> {
  const button = page.locator(`#hud-root .aoe-cmd[data-cmd="${cmd}"]`).first();
  try {
    await button.waitFor({ state: 'visible', timeout: 30_000 });
  } catch {
    return false;
  }
  await button.click({ timeout: 20_000 });
  return true;
}

/** Wait until the command card reflects the current selection. */
async function waitForCard(page: Page, expectedAtLeast = 1): Promise<void> {
  await page.waitForFunction(
    (n) => document.querySelectorAll('#hud-root .aoe-cmd[data-cmd]').length >= n,
    expectedAtLeast,
    { timeout: 30_000 },
  );
}

/** Diagnostics for a missing command button: what the card actually offers. */
async function cardContents(page: Page): Promise<string> {
  return page.evaluate(() => {
    const cells = [...document.querySelectorAll('#hud-root .aoe-cmd')].map(
      (b) => (b as HTMLElement).dataset.cmd ?? '(empty)',
    );
    const selection = window.__game?.selection() ?? [];
    const kinds = selection.map((id) => {
      const e = window.__game?.state().entities.find((x) => x.id === id);
      return e ? `${e.def}#${e.id}` : `gone#${id}`;
    });
    const frame = window.__game?.debugFrame();
    return `selection=[${kinds.join(', ')}] frame=${JSON.stringify(frame)} card=[${cells.join(', ')}]`;
  });
}

/**
 * Place the pending building on a tile the workers can actually walk to.
 *
 * Searches outward from the first selected worker rather than from the Town
 * Center, and rejects tiles the pathfinder cannot reach: a site placed inside a
 * pocket would never be built and the test would simply time out.
 */
async function placePendingBuildNear(page: Page, radiusStart = 3): Promise<boolean> {
  return page.evaluate((start) => {
    const api = window.__game;
    if (!api) return false;
    const session = window.__aegis?.session;
    if (!session) return false;
    const defId = session.pendingBuild;
    if (!defId) return false;
    const snapshot = api.state();
    const worker = snapshot.entities.find(
      (e) => e.owner === 0 && (e.def === 'villager' || e.def === 'scout'),
    );
    if (!worker) return false;
    const tx = worker.x >> 10;
    const ty = worker.y >> 10;
    const pathfinder = session.game.world.pathfinder;
    for (let r = start; r < start + 18; r++) {
      for (const [dx, dy] of [
        [r, 0],
        [-r, 0],
        [0, r],
        [0, -r],
        [r, r],
        [-r, -r],
        [r, -r],
        [-r, r],
      ]) {
        const gx = tx + (dx ?? 0);
        const gy = ty + (dy ?? 0);
        // Reject anything the worker cannot path to.
        if (!pathfinder.findPath(tx, ty, gx, gy, 1, 4000, 0)) continue;
        const worldX = (gx << 10) + 512;
        const worldY = (gy << 10) + 512;
        if (session.placePendingBuild(worldX, worldY)) return true;
      }
    }
    return false;
  }, radiusStart);
}

/** Wait until a building of this type is finished for the local player. */
async function waitForBuilding(page: Page, defId: string, maxSeconds: number): Promise<boolean> {
  return page.evaluate(
    ({ id, seconds }) => {
      const api = window.__game;
      if (!api) return false;
      for (let i = 0; i < seconds * 4; i++) {
        api.step(5);
        const done = api
          .state()
          .entities.some((e) => e.def === id && e.owner === 0 && e.construction >= 1000);
        if (done) return true;
      }
      return false;
    },
    { id: defId, seconds: maxSeconds },
  );
}

test.describe('golden path: a playable match from the menu to victory', () => {
  test('the whole loop works end to end', async ({ page }) => {
    test.setTimeout(900_000);
    const watch = watchConsole(page);

    /* ---------------------------------------------------------------- *
     * 1. Menu -> start a match through the real lobby UI
     * ---------------------------------------------------------------- */
    await loadShell(page);
    await page.getByRole('button', { name: 'Skirmish' }).click();
    await expect(page.getByRole('button', { name: 'Start match' })).toBeVisible();
    await page.getByRole('button', { name: 'Start match' }).click();
    await page.waitForFunction(() => window.__game?.ready() === true, null, { timeout: 30_000 });

    // Pause so every later stage advances exactly the ticks it asks for.
    await page.evaluate(() => window.__game?.pause());
    await step(page, 2);

    const opening = await state(page);
    expect(opening?.players.length).toBeGreaterThanOrEqual(2);
    expect(opening?.entities.some((e) => e.def === 'town_center' && e.owner === 0)).toBe(true);

    /* ---------------------------------------------------------------- *
     * 2. The camera opens on the player's base, not on the whole map
     * ---------------------------------------------------------------- */
    const framing = await page.evaluate(() => {
      const api = window.__game;
      const tc = api?.state().entities.find((e) => e.def === 'town_center' && e.owner === 0);
      const focus = api?.camera.focus();
      const distance = api?.camera.distance() ?? 0;
      if (!tc || !focus) return null;
      return { dx: Math.abs((tc.x >> 10) - (focus.x >> 10)), dy: Math.abs((tc.y >> 10) - (focus.y >> 10)), distance };
    });
    expect(framing).toBeTruthy();
    expect(framing?.dx ?? 99, 'the camera did not open on the Town Center').toBeLessThanOrEqual(2);
    expect(framing?.dy ?? 99).toBeLessThanOrEqual(2);
    expect(framing?.distance ?? 0, 'the camera opened too far out').toBeLessThan(45);

    /* ---------------------------------------------------------------- *
     * 3. Villagers gather all four resources
     * ---------------------------------------------------------------- */
    const before = await resources(page);
    // Send the starting villagers to the four resources through the game's own
    // command protocol, the same path a right click takes.
    const assigned = await page.evaluate(() => {
      const api = window.__game;
      if (!api) return null;
      const snapshot = api.state();
      const villagers = snapshot.entities.filter((e) => e.def === 'villager' && e.owner === 0);
      const pick = (kind: string) => snapshot.entities.find((e) => e.kind === 3 && e.def === kind);
      const plan: Array<[string, number]> = [
        ['tree', 2],
        ['gold', 1],
        ['stone', 1],
        ['sheep', 2],
      ];
      let sent = 0;
      let index = 0;
      for (const [kind, count] of plan) {
        const node = pick(kind);
        if (!node) continue;
        for (let i = 0; i < count && index < villagers.length; i++, index++) {
          const unit = villagers[index];
          if (!unit) break;
          api.command({ type: 4, player: 0, units: [unit.id], target: node.id, queue: false });
          sent++;
        }
      }
      return { sent, total: villagers.length };
    });
    expect(assigned?.sent ?? 0).toBeGreaterThanOrEqual(4);

    await step(page, TICK_RATE * 240);
    const after = await resources(page);
    expect(after.food, 'no food was gathered').toBeGreaterThan(before.food);
    expect(after.wood, 'no wood was gathered').toBeGreaterThan(before.wood);
    expect(after.gold, 'no gold was gathered').toBeGreaterThan(before.gold);
    expect(after.stone, 'no stone was gathered').toBeGreaterThan(before.stone);

    const split = await villagerSplit(page);
    const working = split.food + split.wood + split.gold + split.stone;
    expect(working, 'the HUD reports no villagers working').toBeGreaterThanOrEqual(4);

    /* ---------------------------------------------------------------- *
     * 4. Construction: a house and a farm, through the command card
     * ---------------------------------------------------------------- */
    const selectedVillagers = await page.evaluate(() => {
      const api = window.__game;
      const villagers = api?.state().entities.filter((e) => e.def === 'villager' && e.owner === 0) ?? [];
      api?.select(villagers.slice(0, 3).map((v) => v.id));
      api?.step(2);
      return villagers.length;
    });
    expect(selectedVillagers).toBeGreaterThan(0);
    await waitForCard(page, 4);

    // House: click the card, then click the ground.
    const houseOk = await clickCommand(page, 'build:house');
    expect(houseOk, `no house button on the villager card: ${await cardContents(page)}`).toBe(true);
    expect(await placePendingBuildNear(page), 'the house could not be placed').toBe(true);
    expect(await waitForBuilding(page, 'house', 120), 'the house never finished').toBe(true);

    const capWithHouse = (await state(page))?.players[0]?.popCap ?? 0;
    expect(capWithHouse, 'the house did not raise the population cap').toBeGreaterThan(10);

    // Farm: same flow, then confirm a villager actually works it.
    const farmOk = await clickCommand(page, 'build:farm');
    expect(farmOk, `no farm button: ${await cardContents(page)}`).toBe(true);
    expect(await placePendingBuildNear(page), 'the farm could not be placed').toBe(true);
    expect(await waitForBuilding(page, 'farm', 120), 'the farm never finished').toBe(true);

    const farmed = await page.evaluate(() => {
      const api = window.__game;
      if (!api) return false;
      const snapshot = api.state();
      const farm = snapshot.entities.find((e) => e.def === 'farm' && e.owner === 0);
      const villager = snapshot.entities.find((e) => e.def === 'villager' && e.owner === 0);
      if (!farm || !villager) return false;
      api.command({ type: 4, player: 0, units: [villager.id], target: farm.id, queue: false });
      for (let i = 0; i < 400; i++) {
        api.step(5);
        const v = api.state().entities.find((e) => e.id === villager.id);
        if (v && v.carrying > 0) return true;
      }
      return false;
    });
    expect(farmed, 'a villager never gathered food from the farm').toBe(true);

    /* ---------------------------------------------------------------- *
     * 5. Age up by building a landmark
     * ---------------------------------------------------------------- */
    await page.evaluate(() => window.__game?.grant(20000, 0));
    const ageBefore = (await state(page))?.players[0]?.age ?? 0;
    await page.evaluate(() => {
      const api = window.__game;
      const villagers = api?.state().entities.filter((e) => e.def === 'villager' && e.owner === 0) ?? [];
      api?.select(villagers.map((v) => v.id));
      api?.step(2);
    });
    await waitForCard(page, 4);

    const landmarkClicked = await page.evaluate(() => {
      const button = document.querySelector('#hud-root .aoe-cmd[data-cmd^="build:council_hall"]') as HTMLButtonElement | null;
      const alt = document.querySelector('#hud-root .aoe-cmd[data-cmd^="build:abbey_of_kings"]') as HTMLButtonElement | null;
      const target = button ?? alt;
      if (!target) return null;
      target.click();
      return window.__aegis?.session?.pendingBuild ?? null;
    });
    expect(landmarkClicked, 'no landmark button on the command card').toBeTruthy();
    expect(await placePendingBuildNear(page, 6), 'the landmark could not be placed').toBe(true);
    // A Feudal Age landmark has a 190 s base build time.
    expect(await waitForBuilding(page, landmarkClicked as string, 240), 'the landmark never finished').toBe(true);

    const ageAfter = (await state(page))?.players[0]?.age ?? 0;
    expect(ageAfter, 'the age did not advance').toBeGreaterThan(ageBefore);

    /* ---------------------------------------------------------------- *
     * 6. Train an army
     * ---------------------------------------------------------------- */
    await page.evaluate(() => window.__game?.grant(30000, 0));
    await page.evaluate(() => {
      const api = window.__game;
      const villagers = api?.state().entities.filter((e) => e.def === 'villager' && e.owner === 0) ?? [];
      api?.select(villagers.map((v) => v.id));
      api?.step(2);
    });
    await waitForCard(page, 4);
    const barracksOk = await clickCommand(page, 'build:barracks');
    expect(barracksOk, `no barracks button: ${await cardContents(page)}`).toBe(true);
    expect(await placePendingBuildNear(page), 'the barracks could not be placed').toBe(true);
    const barracksDone = await waitForBuilding(page, 'barracks', 180);
    const barracksWhy = barracksDone
      ? ''
      : await page.evaluate(() => {
          const api = window.__game;
          if (!api) return 'no api';
          const snapshot = api.state();
          const sites = snapshot.entities
            .filter((e) => e.def === 'barracks' && e.owner === 0)
            .map((e) => `construction=${e.construction} builders=${e.builders} at=${e.x >> 10},${e.y >> 10}`);
          const workers = snapshot.entities.filter((e) => e.owner === 0 && e.def === 'villager');
          const building = workers.filter((w) => w.orders.includes(6));
          return `sites=[${sites.join(' | ') || 'none'}] villagers=${workers.length} buildOrders=${building.length} where=[${building
            .slice(0, 3)
            .map((w) => `${w.x >> 10},${w.y >> 10}`)
            .join(' ')}]`;
        });
    expect(barracksDone, `the barracks never finished: ${barracksWhy}`).toBe(true);

    // Select the barracks, wait for its card to render, then train through it.
    const barracksId = await page.evaluate(() => {
      const api = window.__game;
      const barracks = api?.state().entities.find((e) => e.def === 'barracks' && e.owner === 0);
      if (!barracks || !api) return 0;
      api.select([barracks.id]);
      return barracks.id;
    });
    expect(barracksId, 'the barracks disappeared before training').toBeGreaterThan(0);
    const trained = await clickCommand(page, `train:spearman:${barracksId}`);
    expect(trained, `the barracks card has no spearman button: ${await cardContents(page)}`).toBe(true);

    await step(page, TICK_RATE * 90);
    const army = await page.evaluate(
      () =>
        window.__game
          ?.state()
          .entities.filter(
            (e) => e.owner === 0 && ['spearman', 'manatarms', 'archer', 'knight'].includes(e.def),
          ).length ?? 0,
    );
    expect(army, 'no soldier was ever trained').toBeGreaterThan(0);

    /* ---------------------------------------------------------------- *
     * 7. Combat with counters
     * ---------------------------------------------------------------- */
    const combat = await page.evaluate(() => {
      const api = window.__game;
      if (!api) return null;
      const snapshot = api.state();
      const tc = snapshot.entities.find((e) => e.def === 'town_center' && e.owner === 0);
      if (!tc) return null;
      // Fight on the cleared plateau around the Town Center: spawning 25 tiles
      // away could drop the units into water or rock, where they cannot move.
      // A fair trade: spearmen cost 80, knights 240, so three per knight.
      const ax = tc.x + 6 * 1024;
      const ay = tc.y + 6 * 1024;
      api.spawn('spearman', 9, 0, ax, ay);
      api.spawn('knight', 3, 1, ax + 4 * 1024, ay);
      const count = (def: string, owner: number) =>
        api.state().entities.filter((e) => e.def === def && e.owner === owner).length;
      const before = { spearmen: count('spearman', 0), knights: count('knight', 1) };
      for (let round = 0; round < 60; round++) {
        const s2 = api.state();
        const soldiers = s2.entities.filter(
          (e) => e.kind === 1 && (e.owner === 0 || e.owner === 1) && ['spearman', 'knight'].includes(e.def),
        );
        for (const unit of soldiers) {
          let best: (typeof soldiers)[number] | null = null;
          let bestD = Number.MAX_SAFE_INTEGER;
          for (const other of soldiers) {
            if (other.owner === unit.owner) continue;
            const dx = other.x - unit.x;
            const dy = other.y - unit.y;
            const d = dx * dx + dy * dy;
            if (d < bestD) {
              bestD = d;
              best = other;
            }
          }
          if (best) {
            api.command({ type: 2, player: unit.owner, units: [unit.id], target: best.id, queue: false });
          }
        }
        api.step(20);
      }
      return { before, after: { spearmen: count('spearman', 0), knights: count('knight', 1) } };
    });
    expect(combat).toBeTruthy();
    expect(
      (combat?.before.knights ?? 0) - (combat?.after.knights ?? 0),
      'the spearmen killed no knights: the counter bonus is not reaching combat',
    ).toBeGreaterThan(0);

    /* ---------------------------------------------------------------- *
     * 8. A victory condition, reached by playing the match out
     * ---------------------------------------------------------------- */
    const result = await page.evaluate(() => window.__game?.simulate({ maxSeconds: 60 * 35, difficulty: 2 }));
    expect(result).toBeTruthy();
    expect(await page.evaluate(() => window.__game?.isOver()), 'the match never ended').toBe(true);
    expect(result?.winner === 0 || result?.winner === 1).toBe(true);

    const overlay = page.locator('#hud-root .aoe-result');
    await expect(overlay).toBeVisible({ timeout: 30_000 });
    await expect(overlay).toContainText(/victory|defeat/i);

    expectNoErrors(watch);
  });
});
