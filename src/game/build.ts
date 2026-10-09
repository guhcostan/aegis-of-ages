/**
 * Build stamp for the running bundle.
 *
 * Vite injects `__AEGIS_BUILD__` (git short SHA plus build time) at build time.
 * It is surfaced through `window.__game.buildId()` and `window.__game.diagnose()`
 * so a bug report can name the exact bundle it came from.
 */
declare const __AEGIS_BUILD__: string | undefined;

export function buildId(): string {
  return typeof __AEGIS_BUILD__ === 'string' ? __AEGIS_BUILD__ : 'dev';
}
