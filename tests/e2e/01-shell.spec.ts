/**
 * Shell and lobby acceptance tests, run against the deployed production build.
 */
import { expect, test } from '@playwright/test';
import { expectNoErrors, loadShell, startMatch, state, watchConsole } from './helpers';

test.describe('shell and lobby', () => {
  test('loads the menu with no console errors', async ({ page }) => {
    const watch = watchConsole(page);
    await loadShell(page);
    await expect(page.getByRole('heading', { name: 'Aegis of Ages', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Skirmish' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Controls' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Credits' })).toBeVisible();
    expectNoErrors(watch);
  });

  test('skirmish panel exposes every required option', async ({ page }) => {
    const watch = watchConsole(page);
    await loadShell(page);
    await page.getByRole('button', { name: 'Skirmish' }).click();

    // Civilisation choice.
    await expect(page.getByText('English', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('French', { exact: true }).first()).toBeVisible();

    // Map sizes are a select; every size must be offered.
    const sizeSelect = page.getByRole('combobox', { name: 'Map size' });
    await expect(sizeSelect).toBeVisible();
    const sizes = await sizeSelect.locator('option').allTextContents();
    for (const size of ['Tiny', 'Small', 'Medium', 'Large', 'Huge']) {
      expect(sizes.some((s) => s.startsWith(size)), `map size ${size} missing`).toBe(true);
    }

    // 1 to 3 bots.
    const botSelect = page.getByRole('combobox', { name: 'Number of bots' });
    const botCounts = await botSelect.locator('option').allTextContents();
    expect(botCounts.length).toBe(3);

    // 1 to 3 opponents and the three difficulties.
    await expect(page.getByText('Opponents')).toBeVisible();
    const difficultySelect = page.locator('select').filter({ hasText: 'Intermediate' }).first();
    await expect(difficultySelect).toBeAttached();
    const difficulties = await difficultySelect.locator('option').allTextContents();
    for (const difficulty of ['Easy', 'Intermediate', 'Hard']) {
      expect(difficulties, `difficulty ${difficulty} missing`).toContain(difficulty);
    }

    // Every victory condition.
    await expect(page.getByText('Victory condition')).toBeVisible();
    await expect(page.getByText(/Landmarks/i).first()).toBeVisible();
    await expect(page.getByText(/Sacred Sites/i).first()).toBeVisible();
    await expect(page.getByText(/Wonder/i).first()).toBeVisible();

    // Starting resources and seed.
    await expect(page.getByText('Starting resources')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start match' })).toBeVisible();
    expectNoErrors(watch);
  });

  test('controls and credits panels open and return', async ({ page }) => {
    const watch = watchConsole(page);
    await loadShell(page);

    await page.getByRole('button', { name: 'Controls' }).click();
    await expect(page.getByRole('heading', { name: 'Controls' })).toBeVisible();
    await expect(page.getByText(/zoom/i).first()).toBeVisible();
    await page.getByRole('button', { name: /Back/ }).click();

    await page.getByRole('button', { name: 'Credits' }).click();
    await expect(page.getByRole('heading', { name: 'Credits' })).toBeVisible();
    await expect(page.getByText(/procedural/i).first()).toBeVisible();
    await page.getByRole('button', { name: /Back/ }).click();

    await expect(page.getByRole('heading', { name: 'Aegis of Ages', level: 1 })).toBeVisible();
    expectNoErrors(watch);
  });

  test('starting a skirmish from the menu boots the simulation and the HUD', async ({ page }) => {
    const watch = watchConsole(page);
    await loadShell(page);

    // Drive the real UI, not the programmatic hook.
    await page.getByRole('button', { name: 'Skirmish' }).click();
    await page.getByRole('button', { name: 'Start match' }).click();

    await expect(page.locator('#hud-root')).toBeVisible();
    await page.waitForFunction(() => window.__game?.ready() === true, null, { timeout: 30_000 });
    await page.waitForFunction(() => (window.__game?.tick() ?? 0) > 0, null, { timeout: 30_000 });

    const snapshot = await state(page);
    expect(snapshot).toBeTruthy();
    expect(snapshot?.players.length).toBeGreaterThanOrEqual(2);
    expect(snapshot?.entities.some((e) => e.def === 'town_center' && e.owner === 0)).toBe(true);
    const villagers = snapshot?.entities.filter((e) => e.def === 'villager' && e.owner === 0) ?? [];
    expect(villagers.length).toBe(6);
    expectNoErrors(watch);
  });

  test('restarting a match from the API resets the simulation', async ({ page }) => {
    const watch = watchConsole(page);
    await loadShell(page);
    await startMatch(page, { seed: 111 });
    await page.evaluate(() => window.__game?.step(40));
    const first = await state(page);
    expect(first?.tick).toBeGreaterThan(0);

    await startMatch(page, { seed: 222 });
    const second = await state(page);
    expect(second?.tick).toBeLessThan(first?.tick ?? 0);
    expectNoErrors(watch);
  });
});
