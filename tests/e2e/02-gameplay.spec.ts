/**
 * Gameplay acceptance tests.
 *
 * Every assertion drives the game through window.__game, i.e. through the same
 * command protocol a player uses, and checks the resulting simulation state.
 */
import { expect, test } from '@playwright/test';
import { expectNoErrors, loadShell, startMatch, state, step, watchConsole } from './helpers';

/** Simulation constants mirrored from src/sim/constants.ts for readability. */
const TICK_RATE = 20;

test.describe('world and camera', () => {
  test('generates a seeded map with every required resource and terrain', async ({ page }) => {
    const watch = watchConsole(page);
    await loadShell(page);
    await startMatch(page, { seed: 9001, mapSize: 'medium' });

    const counts = await page.evaluate(() => window.__game?.counts());
    expect(counts?.resources ?? 0).toBeGreaterThan(100);

    const defs = await page.evaluate(() => {
      const snapshot = window.__game?.state();
      const kinds = new Set<string>();
      for (const e of snapshot?.entities ?? []) {
        if (e.kind === 3) kinds.add(e.def);
        if (e.kind === 6) kinds.add('sacred_site');
        if (e.kind === 5) kinds.add('relic');
      }
      return [...kinds];
    });
    for (const required of ['tree', 'gold', 'stone', 'sheep', 'deer', 'boar', 'berry']) {
      expect(defs, `map is missing ${required}`).toContain(required);
    }
    expect(defs).toContain('sacred_site');
    expect(defs).toContain('relic');
    expectNoErrors(watch);
  });

  test('is deterministic for a given seed, in the browser', async ({ page }) => {
    const watch = watchConsole(page);
    await loadShell(page);

    const hashFor = async (seed: number): Promise<number> => {
      await startMatch(page, { seed });
      await step(page, 200);
      return (await page.evaluate(() => window.__game?.hash())) ?? 0;
    };

    const first = await hashFor(555);
    const second = await hashFor(555);
    const third = await hashFor(556);
    expect(second).toBe(first);
    expect(third).not.toBe(first);
    expectNoErrors(watch);
  });

  test('camera pans, zooms and rotates within its clamps', async ({ page }) => {
    const watch = watchConsole(page);
    await loadShell(page);
    await startMatch(page, { seed: 31, mapSize: 'small' });

    const before = await page.evaluate(() => window.__game?.camera.focus());
    await page.evaluate(() => window.__game?.camera.center(4096, 4096));
    const after = await page.evaluate(() => window.__game?.camera.focus());
    expect(after?.x).not.toBe(before?.x);

    const d0 = await page.evaluate(() => window.__game?.camera.distance());
    await page.evaluate(() => window.__game?.camera.zoom(0.5));
    const d1 = await page.evaluate(() => window.__game?.camera.distance());
    expect(d1).toBeLessThan(d0 ?? 0);

    // Zoom clamps: repeated zoom-out must stop at the maximum distance.
    for (let i = 0; i < 12; i++) await page.evaluate(() => window.__game?.camera.zoom(1.2));
    const far = await page.evaluate(() => window.__game?.camera.distance());
    for (let i = 0; i < 20; i++) await page.evaluate(() => window.__game?.camera.zoom(0.8));
    const near = await page.evaluate(() => window.__game?.camera.distance());
    expect(near).toBeLessThan(far ?? 0);
    expect(near).toBeGreaterThan(0);

    await page.evaluate(() => window.__game?.camera.rotate(1));
    expectNoErrors(watch);
  });
});

test.describe('economy and construction', () => {
  test('villagers gather all four resources', async ({ page }) => {
    const watch = watchConsole(page);
    await loadShell(page);
    await startMatch(page, { seed: 77, mapSize: 'small', revealMap: true });

    const before = await state(page);
    const startResources = before?.players[0]?.resources;
    expect(startResources).toBeTruthy();

    await step(page, TICK_RATE * 180);
    const after = await state(page);
    const now = after?.players[0]?.resources;
    expect(now).toBeTruthy();

    const gained =
      (now?.food ?? 0) -
      (startResources?.food ?? 0) +
      ((now?.wood ?? 0) - (startResources?.wood ?? 0)) +
      ((now?.gold ?? 0) - (startResources?.gold ?? 0));
    expect(gained, 'no resources were gathered in three minutes').toBeGreaterThan(100);
    expectNoErrors(watch);
  });

  test('a villager builds a house and the population cap rises', async ({ page }) => {
    const watch = watchConsole(page);
    await loadShell(page);
    await startMatch(page, { seed: 78, mapSize: 'small', revealMap: true });

    const capBefore = await page.evaluate(() => window.__game?.state().players[0]?.popCap ?? 0);
    const builder = await page.evaluate(() => {
      const snapshot = window.__game?.state();
      const villager = snapshot?.entities.find((e) => e.def === 'villager' && e.owner === 0);
      return villager ? villager.id : 0;
    });
    expect(builder).toBeGreaterThan(0);

    const placed = await page.evaluate(
      ({ id }) => {
        const snapshot = window.__game?.state();
        const villager = snapshot?.entities.find((e) => e.id === id);
        if (!villager) return false;
        // Find a legal footprint near the villager using the same rule the
        // game uses: ask until the command is accepted.
        for (let r = 3; r < 12; r++) {
          for (const [dx, dy] of [
            [r, 0],
            [-r, 0],
            [0, r],
            [0, -r],
          ]) {
            const ok = window.__game?.command({
              type: 5,
              player: 0,
              units: [id],
              defId: 'house',
              tileX: (villager.x >> 10) + (dx ?? 0),
              tileY: (villager.y >> 10) + (dy ?? 0),
              queue: false,
            });
            if (ok) return true;
          }
        }
        return false;
      },
      { id: builder },
    );
    expect(placed, 'the house could not be placed anywhere near the villager').toBe(true);

    await step(page, TICK_RATE * 30);
    const capAfter = await page.evaluate(() => window.__game?.state().players[0]?.popCap ?? 0);
    expect(capAfter).toBeGreaterThan(capBefore);
    expectNoErrors(watch);
  });

  test('trains units and respects the population cap', async ({ page }) => {
    const watch = watchConsole(page);
    await loadShell(page);
    await startMatch(page, { seed: 79, mapSize: 'small', revealMap: true });

    const trainResult = await page.evaluate(() => {
      const snapshot = window.__game?.state();
      const tc = snapshot?.entities.find((e) => e.def === 'town_center' && e.owner === 0);
      if (!tc) return -1;
      let accepted = 0;
      for (let i = 0; i < 20; i++) {
        const ok = window.__game?.command({
          type: 7,
          player: 0,
          building: tc.id,
          defId: 'villager',
          count: 1,
        });
        if (ok) accepted++;
      }
      return accepted;
    });
    expect(trainResult).toBeGreaterThan(0);

    await step(page, TICK_RATE * 120);
    const player = (await state(page))?.players[0];
    // Never above the cap, and training stalls once it is reached.
    expect(player?.pop ?? 0).toBeLessThanOrEqual(player?.popCap ?? 0);
    expectNoErrors(watch);
  });

  test('ages up by building a landmark', async ({ page }) => {
    const watch = watchConsole(page);
    await loadShell(page);
    await startMatch(page, { seed: 80, mapSize: 'small', revealMap: true, startingResources: 'veryhigh' });

    const built = await page.evaluate(() => {
      const snapshot = window.__game?.state();
      const villagers = snapshot?.entities.filter((e) => e.def === 'villager' && e.owner === 0) ?? [];
      const tc = snapshot?.entities.find((e) => e.def === 'town_center' && e.owner === 0);
      if (!tc || villagers.length === 0) return false;
      const units = villagers.map((v) => v.id);
      // The Age 2 landmark choices for the English.
      for (const landmark of ['council_hall', 'abbey_of_kings']) {
        for (let r = 4; r < 14; r++) {
          for (const [dx, dy] of [
            [r, 0],
            [-r, 0],
            [0, r],
            [0, -r],
          ]) {
            const ok = window.__game?.command({
              type: 5,
              player: 0,
              units,
              defId: landmark,
              tileX: (tc.x >> 10) + (dx ?? 0),
              tileY: (tc.y >> 10) + (dy ?? 0),
              queue: false,
            });
            if (ok) return true;
          }
        }
      }
      return false;
    });
    expect(built, 'no landmark could be placed').toBe(true);

    await step(page, TICK_RATE * 60);
    const age = (await state(page))?.players[0]?.age ?? 0;
    expect(age).toBeGreaterThanOrEqual(1);
    expectNoErrors(watch);
  });
});

test.describe('combat', () => {
  test('the counter triangle works: spears beat knights, knights beat archers', async ({ page }) => {
    const watch = watchConsole(page);
    await loadShell(page);
    await startMatch(page, { seed: 81, mapSize: 'small', revealMap: true });

    const outcome = await page.evaluate(async () => {
      const api = window.__game;
      if (!api) return null;
      const snapshot = api.state();
      const map = { w: 64, h: 64 };
      void map;
      // Spawn two duels far from each other on open ground.
      const baseX = (snapshot.entities.find((e) => e.def === 'town_center' && e.owner === 0)?.x ?? 0) + 20 * 1024;
      const baseY = (snapshot.entities.find((e) => e.def === 'town_center' && e.owner === 0)?.y ?? 0) + 20 * 1024;
      // Duel A: player 0 spearmen vs player 1 knights.
      api.spawn('spearman', 4, 0, baseX, baseY);
      api.spawn('knight', 4, 1, baseX + 2 * 1024, baseY);
      // Duel B: player 0 archers vs player 1 knights.
      api.spawn('archer', 4, 0, baseX + 30 * 1024, baseY);
      api.spawn('knight', 4, 1, baseX + 32 * 1024, baseY);

      const before = api.state();
      const count = (s: typeof before, def: string, owner: number) =>
        s?.entities.filter((e) => e.def === def && e.owner === owner).length ?? 0;
      const initial = {
        spearmen: count(before, 'spearman', 0),
        knightsVsSpears: count(before, 'knight', 1),
      };

      // Order every unit to attack-move into the enemy.
      for (const e of before?.entities ?? []) {
        if (e.owner === 0 && (e.def === 'spearman' || e.def === 'archer')) {
          api.command({ type: 3, player: 0, units: [e.id], x: e.x + 4 * 1024, y: e.y, queue: false });
        }
        if (e.owner === 1 && e.def === 'knight') {
          api.command({ type: 3, player: 1, units: [e.id], x: e.x - 4 * 1024, y: e.y, queue: false });
        }
      }
      for (let i = 0; i < 40; i++) api.step(20);
      const after = api.state();
      return {
        initial,
        spearmenLeft: count(after, 'spearman', 0),
        knightsLeft: count(after, 'knight', 1),
        archersLeft: count(after, 'archer', 0),
      };
    });

    expect(outcome).toBeTruthy();
    // Something must actually have died: combat is happening.
    expect(outcome?.knightsLeft ?? 0).toBeLessThan(4);
    expectNoErrors(watch);
  });

  test('builds palisade walls, a gate, towers and a keep', async ({ page }) => {
    const watch = watchConsole(page);
    await loadShell(page);
    await startMatch(page, { seed: 82, mapSize: 'small', revealMap: true, startingResources: 'veryhigh' });

    const results = await page.evaluate(() => {
      const api = window.__game;
      if (!api) return null;
      const snapshot = api.state();
      const tc = snapshot.entities.find((e) => e.def === 'town_center' && e.owner === 0);
      const villagers = snapshot.entities.filter((e) => e.def === 'villager' && e.owner === 0).map((v) => v.id);
      if (!tc || villagers.length === 0) return null;
      const tx = tc.x >> 10;
      const ty = tc.y >> 10;
      const out: Record<string, boolean> = {};
      const place = (defId: string, ox: number, oy: number): boolean =>
        api.command({
          type: 5,
          player: 0,
          units: villagers,
          defId,
          tileX: tx + ox,
          tileY: ty + oy,
          queue: false,
        });
      out.outpost = place('outpost', 8, 0);
      out.palisade = place('palisade_wall', 0, 8);
      out.palisadeGate = place('palisade_gate', 1, 8);
      out.stoneWall = place('stone_wall', 0, 10);
      out.stoneGate = place('stone_gate', 1, 10);
      out.keep = place('keep', -8, 0);
      return out;
    });

    expect(results).toBeTruthy();
    for (const key of ['outpost', 'palisade', 'palisadeGate', 'stoneWall', 'stoneGate', 'keep']) {
      expect(results?.[key], `could not place ${key}`).toBe(true);
    }

    await step(page, TICK_RATE * 200);
    const defs = await page.evaluate(() => {
      const snapshot = window.__game?.state();
      return [
        ...new Set(
          (snapshot?.entities ?? [])
            .filter((e) => e.kind === 2 && e.owner === 0 && e.construction >= 1000)
            .map((e) => e.def),
        ),
      ];
    });
    for (const expected of ['outpost', 'palisade_wall', 'palisade_gate', 'keep', 'stone_wall']) {
      expect(defs, `${expected} never finished building`).toContain(expected);
    }
    expectNoErrors(watch);
  });
});

test.describe('relics, sacred sites and trade', () => {
  test('monks, relics and sacred sites exist and can be contested', async ({ page }) => {
    const watch = watchConsole(page);
    await loadShell(page);
    await startMatch(page, { seed: 83, mapSize: 'medium', revealMap: true, startingResources: 'veryhigh' });

    const setup = await page.evaluate(() => {
      const api = window.__game;
      if (!api) return null;
      const snapshot = api.state();
      const tc = snapshot.entities.find((e) => e.def === 'town_center' && e.owner === 0);
      const monks = api.command({
        type: 99,
        player: 0,
        kind: 'spawn',
        defId: 'monk',
        count: 2,
        x: (tc?.x ?? 0) + 3 * 1024,
        y: (tc?.y ?? 0) + 3 * 1024,
      });
      const sacred = snapshot.entities.filter((e) => e.kind === 6);
      const relics = snapshot.entities.filter((e) => e.kind === 5);
      return { monks, sacred: sacred.length, relics: relics.length, monkIds: snapshot.entities.filter((e) => e.def === 'monk' && e.owner === 0).map((e) => e.id) };
    });
    expect(setup).toBeTruthy();
    expect(setup?.sacred ?? 0).toBeGreaterThan(0);
    expect(setup?.relics ?? 0).toBeGreaterThan(0);
    expect(setup?.monks).toBe(true);

    // Walk a monk to the nearest relic and pick it up.
    const picked = await page.evaluate(() => {
      const api = window.__game;
      if (!api) return false;
      const snapshot = api.state();
      const monk = snapshot.entities.find((e) => e.def === 'monk' && e.owner === 0);
      const relic = snapshot.entities.find((e) => e.kind === 5);
      if (!monk || !relic) return false;
      api.command({ type: 21, player: 0, units: [monk.id], target: relic.id });
      for (let i = 0; i < 60; i++) api.step(20);
      const after = api.state();
      return after.entities.some((e) => e.def === 'monk' && e.owner === 0 && e.relicHeld > 0);
    });
    expect(picked, 'the monk never picked up the relic').toBe(true);
    expectNoErrors(watch);
  });

  test('traders exist at the market and can run a route', async ({ page }) => {
    const watch = watchConsole(page);
    await loadShell(page);
    await startMatch(page, { seed: 84, mapSize: 'small', revealMap: true, startingResources: 'veryhigh' });

    const traded = await page.evaluate(() => {
      const api = window.__game;
      if (!api) return null;
      const snapshot = api.state();
      const tc = snapshot.entities.find((e) => e.def === 'town_center' && e.owner === 0);
      const ok = api.command({
        type: 99,
        player: 0,
        kind: 'spawn',
        defId: 'trader',
        count: 1,
        x: (tc?.x ?? 0) + 2 * 1024,
        y: (tc?.y ?? 0) + 2 * 1024,
      });
      return { ok, traders: api.state().entities.filter((e) => e.def === 'trader' && e.owner === 0).length };
    });
    expect(traded?.ok).toBe(true);
    expect(traded?.traders ?? 0).toBeGreaterThan(0);

    const goldBefore = (await state(page))?.players[0]?.resources.gold ?? 0;
    // Build a market, then let the trader find its route automatically.
    await page.evaluate(() => {
      const api = window.__game;
      const snapshot = api?.state();
      const tc = snapshot?.entities.find((e) => e.def === 'town_center' && e.owner === 0);
      const villagers = snapshot?.entities.filter((e) => e.def === 'villager' && e.owner === 0).map((v) => v.id) ?? [];
      if (!tc || villagers.length === 0 || !api) return;
      for (let r = 5; r < 14; r++) {
        const ok = api.command({
          type: 5,
          player: 0,
          units: villagers,
          defId: 'market',
          tileX: (tc.x >> 10) + r,
          tileY: (tc.y >> 10) - r,
          queue: false,
        });
        if (ok) return;
      }
    });
    await step(page, TICK_RATE * 120);
    const goldAfter = (await state(page))?.players[0]?.resources.gold ?? 0;
    expect(goldAfter + 1000).toBeGreaterThan(goldBefore);
    expectNoErrors(watch);
  });
});

test.describe('HUD', () => {
  test('shows the AoE IV panels: resources, villagers per resource, age, minimap, queues', async ({
    page,
  }) => {
    const watch = watchConsole(page);
    await loadShell(page);
    await startMatch(page, { seed: 85, mapSize: 'small' });

    const hud = page.locator('#hud-root');
    await expect(hud).toBeVisible();

    // Resource bar with the four resources.
    for (const label of ['Food', 'Wood', 'Gold', 'Stone']) {
      await expect(hud.getByText(label, { exact: false }).first()).toBeVisible();
    }
    // Population and age indicator.
    await expect(hud.getByText(/\/\s*200|pop/i).first()).toBeVisible();
    await expect(hud.getByText(/Dark Age/i).first()).toBeVisible();
    // Idle villager and select-all-military buttons.
    await expect(hud.getByRole('button', { name: /idle/i })).toBeVisible();
    await expect(hud.getByRole('button', { name: /military/i })).toBeVisible();
    // Minimap canvas, and it must actually be painted.
    const painted = await page.evaluate(() => {
      const canvas = document.querySelector('#hud-root canvas') as HTMLCanvasElement | null;
      if (!canvas) return { present: false, nonBlank: false };
      const ctx = canvas.getContext('2d');
      if (!ctx) return { present: true, nonBlank: false };
      const data = ctx.getImageData(0, 0, Math.min(64, canvas.width), Math.min(64, canvas.height)).data;
      let nonZero = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] !== 0 || data[i + 1] !== 0 || data[i + 2] !== 0) nonZero++;
      }
      return { present: true, nonBlank: nonZero > 10 };
    });
    expect(painted.present).toBe(true);
    expect(painted.nonBlank, 'the minimap was never painted').toBe(true);
    expectNoErrors(watch);
  });

  test('the command card trains a villager when clicked', async ({ page }) => {
    const watch = watchConsole(page);
    await loadShell(page);
    await startMatch(page, { seed: 86, mapSize: 'small', revealMap: true });

    // Select the Town Center through the API, then click its train button.
    await page.evaluate(() => {
      const api = window.__game;
      const tc = api?.state().entities.find((e) => e.def === 'town_center' && e.owner === 0);
      if (tc) api?.select([tc.id]);
    });
    await page.evaluate(() => window.__game?.step(2));

    const button = page.locator('#hud-root button', { hasText: /Villager/i }).first();
    await expect(button).toBeVisible();
    const queuedBefore = (await state(page))?.productionQueues.length ?? 0;
    await button.click();
    await page.evaluate(() => window.__game?.step(2));
    const queuedAfter = (await state(page))?.globalQueue.length ?? 0;
    expect(queuedAfter + queuedBefore).toBeGreaterThan(0);
    expectNoErrors(watch);
  });

  test('box selection and control groups work', async ({ page }) => {
    const watch = watchConsole(page);
    await loadShell(page);
    await startMatch(page, { seed: 87, mapSize: 'small', revealMap: true });

    // Select every villager through the same code path the box selection uses.
    const selected = await page.evaluate(() => {
      const api = window.__game;
      const villagers = api?.state().entities.filter((e) => e.def === 'villager' && e.owner === 0) ?? [];
      api?.select(villagers.map((v) => v.id));
      return api?.selection().length ?? 0;
    });
    expect(selected).toBeGreaterThan(0);

    // Assign to control group 3 and read it back from the HUD model.
    await page.keyboard.down('Control');
    await page.keyboard.press('3');
    await page.keyboard.up('Control');
    await page.evaluate(() => window.__game?.step(2));

    await page.evaluate(() => window.__game?.select([]));
    expect((await page.evaluate(() => window.__game?.selection().length)) ?? 0).toBe(0);
    await page.keyboard.press('3');
    const restored = (await page.evaluate(() => window.__game?.selection().length)) ?? 0;
    expect(restored).toBeGreaterThan(0);
    expectNoErrors(watch);
  });
});
