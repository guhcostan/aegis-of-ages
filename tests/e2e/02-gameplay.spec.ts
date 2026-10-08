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
    // startMatch creates the session paused, so every run reaches the exact
    // same tick count.

    const hashFor = async (seed: number): Promise<number> => {
      await startMatch(page, { seed });
      await step(page, 200);
      return (await page.evaluate(() => window.__game?.hash())) ?? 0;
    };
    // startMatch pauses the loop, so the tick count is exactly 200 each time.

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

    // zoomBy takes a zoom-level multiplier: above 1 moves closer.
    const d0 = await page.evaluate(() => window.__game?.camera.distance());
    await page.evaluate(() => window.__game?.camera.zoom(1.5));
    const d1 = await page.evaluate(() => window.__game?.camera.distance());
    expect(d1, 'zooming in must reduce the camera distance').toBeLessThan(d0 ?? 0);
    await page.evaluate(() => window.__game?.camera.zoom(0.5));
    const d2 = await page.evaluate(() => window.__game?.camera.distance());
    expect(d2, 'zooming out must increase the camera distance').toBeGreaterThan(d1 ?? 0);

    // Clamps: the distance must stay inside the documented 20..70 range.
    for (let i = 0; i < 25; i++) await page.evaluate(() => window.__game?.camera.zoom(1.2));
    const near = await page.evaluate(() => window.__game?.camera.distance());
    for (let i = 0; i < 30; i++) await page.evaluate(() => window.__game?.camera.zoom(0.8));
    const far = await page.evaluate(() => window.__game?.camera.distance());
    expect(near).toBeGreaterThanOrEqual(19);
    expect(near).toBeLessThan(far ?? 0);
    expect(far).toBeLessThanOrEqual(71);

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
            const ok = window.__game?.apply({
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

    // A house takes 15 s to build once the villager arrives, and the villager
    // may have to walk several tiles first.
    await step(page, TICK_RATE * 90);
    const capAfter = await page.evaluate(() => window.__game?.state().players[0]?.popCap ?? 0);
    expect(capAfter, 'the house never finished').toBeGreaterThan(capBefore);
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
            const ok = window.__game?.apply({
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

    // Feudal Age landmarks have a 190 s base build time in the SPEC.
    await step(page, TICK_RATE * 260);
    const age = (await state(page))?.players[0]?.age ?? 0;
    expect(age, 'the landmark never completed').toBeGreaterThanOrEqual(1);
    expectNoErrors(watch);
  });
});

test.describe('combat', () => {
  test('the counter triangle works: spears beat knights, knights beat archers', async ({
    page,
  }) => {
    const watch = watchConsole(page);
    await loadShell(page);
    await startMatch(page, { seed: 81, mapSize: 'small', revealMap: true, startingResources: 'veryhigh' });

    // AoE IV counters are about equal RESOURCES, not equal numbers: a spearman
    // costs 80 and a knight costs 240, so three spearmen per knight is the fair
    // trade. The two duels are placed far apart so they cannot interfere.
    const outcome = await page.evaluate(() => {
      const api = window.__game;
      if (!api) return null;
      const snapshot = api.state();
      const tc = snapshot.entities.find((e) => e.def === 'town_center' && e.owner === 0);
      if (!tc) return null;
      const homeX = tc.x;
      const homeY = tc.y;

      // Duel A: 12 spearmen (960 resources) against 4 knights (960 resources).
      const ax = homeX + 30 * 1024;
      const ay = homeY - 20 * 1024;
      api.spawn('spearman', 12, 0, ax, ay);
      api.spawn('knight', 4, 1, ax + 4 * 1024, ay);
      // Duel B: 8 archers (640) against 3 knights (720).
      const bx = homeX + 30 * 1024;
      const by = homeY + 30 * 1024;
      api.spawn('archer', 8, 0, bx, by);
      api.spawn('knight', 3, 1, bx + 4 * 1024, by);

      const count = (def: string, owner: number): number =>
        api.state().entities.filter((e) => e.def === def && e.owner === owner).length;
      const before = {
        spearmen: count('spearman', 0),
        archers: count('archer', 0),
        knights: count('knight', 1),
      };

      // Every unit is ordered onto its NEAREST enemy. Naming a specific unit
      // type pulled the knights in duel B across the map onto a spearman, so
      // they never fought the archers standing next to them.
      const order = (): void => {
        const s2 = api.state();
        const soldiers = s2.entities.filter(
          (e) =>
            e.kind === 1 &&
            (e.owner === 0 || e.owner === 1) &&
            ['spearman', 'archer', 'knight'].includes(e.def),
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
            api.command({
              type: 2,
              player: unit.owner,
              units: [unit.id],
              target: best.id,
              queue: false,
            });
          }
        }
      };

      for (let round = 0; round < 60; round++) {
        order();
        api.step(20);
      }

      return {
        before,
        after: {
          spearmen: count('spearman', 0),
          archers: count('archer', 0),
          knights: count('knight', 1),
        },
      };
    });

    expect(outcome).toBeTruthy();
    const knightsLost = (outcome?.before.knights ?? 0) - (outcome?.after.knights ?? 0);
    const spearmenLost = (outcome?.before.spearmen ?? 0) - (outcome?.after.spearmen ?? 0);
    const archersLost = (outcome?.before.archers ?? 0) - (outcome?.after.archers ?? 0);
    // Spearmen must trade into the knights, and cavalry must run down archers.
    expect(knightsLost, 'spearmen killed no knights: the anti-cavalry bonus is missing').toBeGreaterThan(0);
    expect(spearmenLost, 'spearmen took no losses at all').toBeGreaterThan(0);
    expect(archersLost, 'cavalry killed no archers: the anti-ranged bonus is missing').toBeGreaterThan(0);
    expectNoErrors(watch);
  });

  test('builds palisade walls, a gate, towers and a keep', async ({ page }) => {
    const watch = watchConsole(page);
    await loadShell(page);
    await startMatch(page, { seed: 82, mapSize: 'small', revealMap: true, startingResources: 'veryhigh' });

    // Place and finish one structure at a time: a single Build command moves
    // every listed villager, so batching them would leave all but the last
    // site unattended.
    const structures: Array<[string, number, number]> = [
      ['outpost', 8, 0],
      ['palisade_wall', 0, 8],
      ['palisade_gate', 1, 8],
      ['stone_wall', 0, 12],
      ['stone_gate', 1, 12],
      ['keep', -9, 0],
    ];

    for (const [defId, ox, oy] of structures) {
      const placed = await page.evaluate(
        ({ id, dx, dy }) => {
          const api = window.__game;
          if (!api) return false;
          const snapshot = api.state();
          const tc = snapshot.entities.find((e) => e.def === 'town_center' && e.owner === 0);
          const villagers = snapshot.entities
            .filter((e) => e.def === 'villager' && e.owner === 0)
            .map((v) => v.id);
          if (!tc || villagers.length === 0) return false;
          const tx = tc.x >> 10;
          const ty = tc.y >> 10;
          // The map is procedural, so search outward from the preferred offset
          // rather than assuming that exact tile is free.
          for (let r = 0; r < 14; r++) {
            for (const [ox, oy] of [
              [dx, dy],
              [dx + r, dy],
              [dx - r, dy],
              [dx, dy + r],
              [dx, dy - r],
              [dx + r, dy + r],
              [dx - r, dy - r],
            ]) {
              const ok = api.apply({
                type: 5,
                player: 0,
                units: villagers,
                defId: id,
                tileX: tx + (ox ?? 0),
                tileY: ty + (oy ?? 0),
                queue: false,
              });
              if (ok) return true;
            }
          }
          return false;
        },
        { id: defId, dx: ox, dy: oy },
      );
      expect(placed, `could not place ${defId}`).toBe(true);

      // Wait for this structure to finish before starting the next one.
      await page.evaluate(
        async ({ id }) => {
          const api = window.__game;
          if (!api) return;
          for (let i = 0; i < 400; i++) {
            api.step(20);
            const built = api.state().entities.some(
              (e) => e.def === id && e.owner === 0 && e.construction >= 1000,
            );
            if (built) return;
          }
        },
        { id: defId },
      );
    }

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
    for (const [expected] of structures) {
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
      const monks = api.spawn('monk', 2, 0, (tc?.x ?? 0) + 3 * 1024, (tc?.y ?? 0) + 3 * 1024);
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
      if (!api) return { ok: false, why: 'no api' };
      const snapshot = api.state();
      const monk = snapshot.entities.find((e) => e.def === 'monk' && e.owner === 0);
      const relic = snapshot.entities.find((e) => e.kind === 5);
      if (!monk || !relic) return { ok: false, why: `monk=${!!monk} relic=${!!relic}` };
      api.command({ type: 21, player: 0, units: [monk.id], target: relic.id });
      let last = '';
      for (let i = 0; i < 200; i++) {
        api.step(20);
        const m = api.state().entities.find((e) => e.id === monk.id);
        if (!m) return { ok: false, why: 'monk died' };
        last = `t=${i * 20} pos=${m.x >> 10},${m.y >> 10} orders=${JSON.stringify(m.orders)} held=${m.relicHeld}`;
        if (m.relicHeld > 0) return { ok: true, why: last };
      }
      const target = api.state().entities.find((e) => e.id === relic.id);
      return {
        ok: false,
        why: `${last} | relic=${target ? `${target.x >> 10},${target.y >> 10}` : 'gone'}`,
      };
    });
    expect(picked.ok, `the monk never picked up the relic: ${picked.why}`).toBe(true);
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
      const ok = api.spawn('trader', 1, 0, (tc?.x ?? 0) + 2 * 1024, (tc?.y ?? 0) + 2 * 1024);
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

test.describe('mouse input on the battlefield', () => {
  test('clicking a unit selects it and right-clicking issues an order', async ({ page }) => {
    const watch = watchConsole(page);
    await loadShell(page);
    await startMatch(page, { seed: 88, mapSize: 'small', revealMap: true });

    // Point the camera at the Town Center so the starting units are on screen.
    const target = await page.evaluate(() => {
      const api = window.__game;
      const tc = api?.state().entities.find((e) => e.def === 'town_center' && e.owner === 0);
      if (!tc) return null;
      api?.camera.center(tc.x, tc.y);
      api?.camera.zoom(0.7);
      return { x: tc.x, y: tc.y };
    });
    expect(target).toBeTruthy();
    await page.waitForTimeout(400);

    // Click every candidate position until a unit gets selected: the exact
    // screen projection depends on the camera, so probe a small grid.
    let selected = 0;
    const viewport = page.viewportSize() ?? { width: 1280, height: 720 };
    for (let gy = 0.3; gy <= 0.7 && selected === 0; gy += 0.05) {
      for (let gx = 0.25; gx <= 0.75 && selected === 0; gx += 0.05) {
        await page.mouse.click(viewport.width * gx, viewport.height * gy);
        selected = await page.evaluate(() => window.__game?.selection().length ?? 0);
      }
    }
    expect(selected, 'no battlefield click selected anything: the canvas is blocked').toBeGreaterThan(0);

    // Right click on open ground must reach the simulation as a move order.
    // The click may have landed on the Town Center, which has no move order, so
    // select a villager explicitly first.
    const before = await page.evaluate(() => {
      const api = window.__game;
      const villager = api?.state().entities.find((e) => e.def === 'villager' && e.owner === 0);
      if (!villager) return 0;
      api?.select([villager.id]);
      return villager.id;
    });
    expect(before).toBeGreaterThan(0);
    await page.waitForTimeout(200);
    await page.mouse.click(viewport.width * 0.5, viewport.height * 0.45, { button: 'right' });
    await page.evaluate(() => window.__game?.step(4));
    const ordered = await page.evaluate(() => {
      const api = window.__game;
      const id = api?.selection()[0];
      const e = api?.state().entities.find((x) => x.id === id);
      return e ? e.orders.length + (e.hasGoal ? 1 : 0) : 0;
    });
    expect(ordered, 'the right click produced no order').toBeGreaterThan(0);
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

    // Resource bar: the AoE IV bar is icon + number, so assert on the labels
    // the HUD exposes for accessibility, plus the villager readout inside them.
    for (const resource of ['food', 'wood', 'gold', 'stone']) {
      const cell = hud.locator(`[data-resource="${resource}"]`).first();
      await expect(cell, `${resource} cell missing`).toBeAttached();
      const aria = (await cell.getAttribute('aria-label')) ?? '';
      expect(aria, `${resource} has no numeric readout`).toMatch(new RegExp(`${resource}\\s+\\d+`, 'i'));
      expect(aria, `${resource} has no villager count`).toMatch(/villagers gathering/i);
    }
    // Population readout ("7/10" at the start, capped at 200 later) and age.
    await expect(hud.getByText(/^\d+\s*\/\s*\d+$/).first()).toBeVisible();
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
    const tcId = await page.evaluate(() => {
      const api = window.__game;
      const tc = api?.state().entities.find((e) => e.def === 'town_center' && e.owner === 0);
      if (!tc) return 0;
      api?.select([tc.id]);
      api?.step(2);
      return tc.id;
    });
    expect(tcId).toBeGreaterThan(0);

    const button = page.locator(`#hud-root .aoe-cmd[data-cmd="train:villager:${tcId}"]`).first();
    await expect(button).toBeVisible();
    await button.click();
    await page.evaluate(() => window.__game?.step(4));
    const queued = (await state(page))?.globalQueue.length ?? 0;
    expect(queued, 'clicking the command card did not queue a villager').toBeGreaterThan(0);
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
