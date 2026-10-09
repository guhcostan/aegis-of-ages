import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

/** Short git SHA, or 'nogit', used to stamp the bundle for support/debugging. */
function buildStamp(): string {
  try {
    const sha = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    const when = new Date().toISOString().slice(0, 16).replace('T', ' ');
    return `${sha} ${when}`;
  } catch {
    return 'unknown';
  }
}

export default defineConfig({
  define: {
    __AEGIS_BUILD__: JSON.stringify(buildStamp()),
  },
  resolve: {
    alias: {
      '@sim': resolve(__dirname, 'src/sim'),
      '@render': resolve(__dirname, 'src/render'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@bots': resolve(__dirname, 'src/bots'),
      '@game': resolve(__dirname, 'src/game'),
    },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
  },
  server: {
    port: 5173,
  },
});
