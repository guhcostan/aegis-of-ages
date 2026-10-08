# Aegis of Ages — Progress

Living status file. Last verified against the working tree: **2026-10-08, 15:26 local**.
Everything under "Done" was checked by reading the files at that revision; "Pending" is what
is still missing. `docs/SPEC.md` is the single source of truth for values; this file only
tracks state.

## Current phase

The simulation core, the data tables, the renderer and the HUD are being built.
The deterministic simulation and the complete data tables are in place and typecheck clean;
the renderer geometry/texture/minimap modules and the HUD + lobby menu have just landed and
are still being wired together. The session layer that owns the browser entry point
(`index.html`, `src/game/`), the bots, the test suites and the deploy pipeline do not exist
yet.

## Done

Simulation core (`src/sim/`, verified by reading every file):

- [x] `constants.ts` — 20 Hz tick rate, `FP_ONE = 1024` fixed point, ages I–IV, three victory
      condition ids, three bot difficulties, 200 population ceiling, five map sizes,
      20 000-entity cap.
- [x] `fixed.ts` — integer fixed-point math (`fp`, `toTiles`, `fpMul`, `fpDiv`, `isqrt`,
      `fpDist`, `fpDist2`, `clamp`, `fpLerp`, `fpNormalize`, `fpMoveToward`, 256-step trig
      table).
- [x] `rng.ts` — mulberry32 + splitmix32 `Rng` and the FNV-1a `Hasher` used by the state
      digest.
- [x] `types.ts` — entity/definition/player/order/production interfaces and the `costOf`
      helper; no DOM or three.js import.
- [x] `commands.ts` — 24 command types with `isCommand` validation.
- [x] `world.ts` — entity storage with id recycling, per-player state, tile blocking and
      placement queries, a per-tick spatial hash, population recomputation, building
      lifecycle hooks and `hashState()`.
- [x] `game.ts` — `Game` orchestrator: map generation, starting bases, command application
      (25 switch arms), the 12-step tick order, victory checks, `snapshot()` and `hash()`.
- [x] `stats.ts` — deterministic stat merging (civ bonuses then techs by id, flat before
      percentage) with `WeakMap` caches keyed by `player.modVersion`, plus
      `gatherMultiplier`, `bumpModVersion`, `clearStatCaches`.
- [x] Nine systems: `production.ts`, `movement.ts`, `gather.ts`, `build.ts`, `combat.ts`,
      `religion.ts`, `trade.ts`, `fog.ts`, `victory.ts` (repair lives in `gather.ts`, age-up
      in `production.ts`/`game.ts`).
- [x] `map/terrain.ts` — integer value-noise map generation (terrain, elevation, forests with
      stealth flags, resource nodes, sacred sites, relics, mirrored ring starts).
- [x] `map/pathfind.ts` — deterministic A* over the 8-connected grid with a binary heap
      ordered by (f, h, index), an expansion budget and a straight-walk fast path.

Data tables (`src/sim/data/`, all counts verified with grep):

- [x] `units.ts` — 18 unit definitions (15 shared, 1 English, 2 French) with cost, train
      time, HP, melee/ranged attack, armors, range, speed, LOS, pop, classes, bonus damage,
      rate of fire, wind-up, charge bonus, ranged resistance and `trainedAt`.
- [x] `buildings.ts` — 21 standard buildings plus 12 landmarks (6 English, 6 French), with
      cost, build time, HP, armors, footprint, pop, garrison, drop-off, trains, researches,
      attack stats and landmark age.
- [x] `techs.ts` — 48 technologies across blacksmith, barracks, archery range, stable, siege
      workshop, university, mill, lumber camp, mining camp and monastery, with ages, costs,
      research times, effects and prerequisite chains.
- [x] `economy.ts` — gather rates, per-source carry, node kinds/amounts, build rates, repair
      rate, conversion/heal rates, relic and sacred-site income, trade constants, starting
      resources/units/sheep.
- [x] `civs.ts` — English and French bonuses, traits, unique units/buildings, landmark tables
      per age, `getCiv`, `landmarkChoices`, `techCostFor`.

Renderer (`src/render/`, read at this revision):

- [x] `types.ts` — frozen `Renderer`, `CameraController`, `FogView`, `ScreenRect` contracts.
- [x] `terrain-mesh.ts` — terrain and water meshes from `GameMap`, per-tile shading, height
      sampling, row-window draw ranges.
- [x] `models.ts` — procedural low-poly unit/building/resource/projectile geometry,
      instanced material with team tint and per-instance alpha.
- [x] `textures.ts` — canvas-generated noise and disc textures, fog `DataTexture`.
- [x] `minimap.ts` — `MinimapPainter` that draws a snapshot + fog into a canvas.

HUD and lobby (`src/ui/`):

- [x] `types.ts` — `HudModel`, `CommandButton`, `ScoreRow`, `ObjectiveRow`, `HudCallbacks`,
      `Hud`, `LobbySettings`, `Menu`.
- [x] `hud.ts` + `hud.css` — full DOM HUD: resource/top bar, objectives panel, hidden
      scoreboard, bottom bar (selection panel, global queue, control groups, per-building
      queue, 12-slot command card), minimap column with camera buttons and quick actions,
      toast and result overlay; `createHud` returns `HudHandle` with `getMinimapCanvas()`
      and `setWorldSize()`.
- [x] `menu.ts` + `menu.css` — `createMenu(root)` returning the `Menu` interface.

Tooling and configuration:

- [x] `scripts/headless-match.ts` — headless Node runner with `--seed/--ticks/--players/
      --size/--victory/--quiet`, printing the final tick and state hash.
- [x] `package.json` scripts (`dev`, `build`, `lint`, `test`, `test:unit`, `test:e2e`,
      `deploy`, `sim:headless`), `tsconfig.json` (strict, `noUnusedLocals`,
      `noUnusedParameters`, `verbatimModuleSyntax`), `eslint.config.js` with the
      determinism guard banning `Date`/`Math.random`/`performance.now` in `src/sim` and
      `src/bots`, `vite.config.ts` and `vitest.config.ts` with the `@sim`/`@render`/`@ui`/
      `@bots`/`@game` aliases, `wrangler.jsonc` for a static Cloudflare deploy.
- [x] `docs/SPEC.md` — full specification: scope, implemented values, verification against
      the research files, 25 numbered deviations, architecture, HUD layout and sources.

Verified behaviours at this revision:

- [x] Headless determinism: `npx tsx scripts/headless-match.ts --seed 42 --ticks 2400
      --players 2 --size small --quiet` printed `2400 3017be87` on two consecutive runs.
- [x] Construction timing measured in a probe: House (nominal 15 s) completes in 334 ticks
      (16.7 s) with one builder, 167 ticks (8.35 s) with two, 112 ticks (5.6 s) with three.
- [x] Population gating probed: at pop 7 / cap 10 the game accepted a 10-villager queue and
      reached pop 17 / cap 10 (see Open bugs).
- [x] Farm harvesting probed: a freshly built farm has `amount = 0` and is destroyed on the
      first gather (see Open bugs).
- [x] Stat pipeline probed: `effectiveUnit` reports English Longbowman range 9 and attack 7
      (bonus applied) but `spawnUnit` gives a spearman `maxHp = 80` despite an HP tech, and
      combat/movement read raw definition values (see Open bugs).

## Pending

- [ ] **Session layer and browser entry point**: `index.html`, `src/main.ts` (or
      `src/game/`), the `Renderer` implementation that composes `terrain-mesh`, `models`,
      `textures` and `minimap`, the frame loop with snapshot interpolation, input handling
      (selection, bandbox, orders, control groups, camera), and the code that translates
      `HudCallbacks` into `Game.enqueue(...)` commands.
- [ ] **`window.__game` test surface**: no `window.__game` (or `globalThis`) assignment
      exists anywhere in `src/`, `tests/` or `scripts/`. The session must publish the game
      object exposing at least `snapshot()`, `hash()`, the tick, `enqueue()`/`step()` and
      the command log so Playwright can drive it.
- [ ] **Bots**: `src/bots/` is empty. No build orders, scouting, army control, difficulty
      tiers or resource scaling exist; `MatchConfig.disableBots` is stored and never read.
- [ ] **Menu integration**: `createMenu` exists but nothing calls it, and `LobbySettings` is
      never converted into a `MatchConfig`/`PlayerConfig` list.
- [ ] **Audio**: no audio module, no sound generation, no mixer.
- [ ] **Tests**: `tests/unit/` and `tests/e2e/` are empty; `pnpm test` currently passes with
      no test files, `pnpm test:e2e` has no Playwright config or specs.
- [ ] **CI**: `.github/workflows/` is empty.
- [ ] **Cloudflare deploy**: `wrangler.jsonc` points at `./dist` and `public/` is empty, but
      nothing has been built or deployed; there is no `dist/` yet.
- [ ] **Balance and polish pass** on the deviations listed in `docs/SPEC.md` §4 — notably
      wiring the inert stat modifiers, ranged resistance, charge, minimum range, population
      gating and the farm food pool.

## Decisions

- **2026-10-08** — Model: `deepseek-v4.1-flash` (DeepSeek Harness agent teams). Recorded
  here so the branch history is traceable.
- **2026-10-08** — Project name: **Aegis of Ages**. All art is generated in code (procedural
  low-poly geometry, canvas textures, inline SVG HUD icons); no third-party or franchise
  asset, logo, sound or product name is downloaded, embedded or shown to the player.
- **2026-10-08** — Tick rate: **20 Hz** (`TICK_RATE = 20`, 50 ms per tick), fixed and
  independent of frame rate; the renderer interpolates between snapshots instead of driving
  the simulation.
- **2026-10-08** — Simulation arithmetic: **fixed-point integers** (`FP_ONE = 1024` per tile,
  all positions, speeds, ranges, timers and progress values integer; `Math.trunc` division;
  `isqrt` instead of floating-point square roots). No `Math.random`, `Date.now`,
  `performance.now` or transcendental calls on the tick path — enforced by ESLint in
  `src/sim/**` and `src/bots/**`.
- **2026-10-08** — Determinism: the state hash is reproducible across repeated headless runs.
  Verified with `npx tsx scripts/headless-match.ts --seed 42 --ticks 2400 --players 2
  --size small --quiet` → `2400 3017be87` twice in a row (hash = `World.hashState()`).
  Same seed + same command list must continue to produce the same digest as systems are
  added; any change to the hash for an unchanged input is a regression.
- **2026-10-08** — Data provenance: every implemented number traces to `docs/research/*.md`,
  which cite the aoe4world/data game-file extraction (patch 16.1.9737) and the Age of Empires
  Wiki. Values that could not be corroborated are tagged in `docs/SPEC.md` §3 as UNVERIFIED
  or MODELLED.

## Open bugs

Found while reading the code at this revision. `docs/SPEC.md` §4 explains which of these are
deliberate modelling choices; the entries below are defects, not decisions.

1. **Typecheck fails in `src/render/minimap.ts`** (two `noUnusedLocals` errors):
   `src/render/minimap.ts(67,11): error TS6133: 'cssWidth' is declared but its value is never
   read.` and `(68,11): error TS6133: 'cssHeight' is declared but its value is never read.`
   `npx tsc -p tsconfig.json --noEmit` therefore exits 2. Not my file — reported rather than
   edited. (An earlier error in `src/ui/hud.ts` — `EntitySnapshot` imported from `./types`
   instead of `../sim/game` — was fixed by its owner while this document was being written.)
2. **Population cap is not enforced.** `queueUnit` refuses only at `player.pop >=
   POP_CAP_MAX` (200) and `productionSystem` stalls only at the 200 ceiling, so the
   house-derived `popCap` never gates training. Probe: pop 7/10 accepted a 10-villager queue
   and ended at pop 17/10.
3. **Farms are unusable.** `spawnBuilding` creates a farm with `amount = 0`, and `runGather`
   destroys a node whose amount is exhausted, so the first villager to work a farm deletes it.
   `rebuildFarm()` (which would set `amount = 350`) is never called. `FARM_INFINITE = true`
   is declared but nothing reads it.
4. **`World.statMod()` is a stub returning 0.** Every HP modifier (unit tier HP deltas,
   `court_architects`) is therefore ignored by `spawnUnit`, `spawnBuilding` and
   `onBuildingComplete`; a spearman spawned after researching `veteran_spearman` still has
   `maxHp = 80`. `effectiveUnit().hp`, `.speed`, `.range` and `.attackSpeed` are computed but
   never read by the systems that need them: `movementSystem` uses `def.speed`,
   `combatSystem` uses `def.range` and `def.attackSpeed` for reach and cooldown. Consequently
   Wheelbarrow/Lightweight Beams/Greased Axles/Piety are inert, the English Longbowman's +2
   range and Network of Castles are inert, and Silk Bowstrings would slow units down if it
   were ever read (higher `attackSpeed` ticks is a longer cooldown while the tech means
   "fires 15 % faster").
5. **Monks cannot heal.** `religionSystem` restores `Math.trunc(HEAL_PER_SECOND / TICK_RATE)`
   = `trunc(7 / 20)` = **0** HP per tick. `REPAIR_HP_PER_SECOND` survives the same division
   only because 25 / 20 truncates to 1.
6. **Tech HP deltas leak across units.** The tier HP effects use `appliesTo: 'all'`
   (`hardened_spearman`, `veteran_spearman`, `elite_spearman`, `veteran_archer`,
   `elite_archer`, `elite_crossbowman`, `veteran_horseman`, `elite_horseman`,
   `veteran_knight`, `elite_knight`, `veteran_manatarms`, `elite_manatarms`), and
   `appliesToUnit` returns true for `'all'`, so each of them nominally grants its HP delta to
   every unit of the player. The bug is masked today by bug 4.
7. **Dead configuration that contradicts live values.** `economy.NODE_AMOUNTS` (research
   values) is unused while `world.RESOURCE_SPECS` (scaled-down values) is live;
   `economy.BUILD_RATE_PER_VILLAGER` and `buildSpeedFactor` are unused while `build.ts`
   defines its own rate; `economy.BASE_CARRY`, `FARM_INFINITE`, `START_SHEEP`,
   `SACRED_SITE_CAPTURE_SECONDS`, `SACRED_SITE_GOLD_PER_MIN` and
   `constants.RELIC_GOLD_PER_MINUTE` (60, contradicting the live 80) are unused;
   `techs.ts` re-exports `FP_ONE` for no consumer; `production.ts` re-exports `Age` and
   `TICK_RATE`; `applyImmediateTechEffects` branches on tech ids (`architecture`,
   `masonry`) that do not exist in `TECHS`.
8. **`spawnBuilding` centres buildings half a tile off.** The centre is
   `(tileX << 10) + ((def.width << 10) >> 1)`, i.e. the footprint's right edge rather than
   `tileX + (width - 1) / 2`; for a 4×4 building the entity centre sits on the third tile of
   the footprint. Cosmetic for combat reach and gather distance, but it shifts every
   building's effective position.
9. **Command queue is not sorted despite the comment.** `Game.step()` says "Commands first"
   and applies the pending list in insertion order; a `sort` by `issued`/sequence was
   intended. It is currently deterministic because insertion order is the caller's, but two
   callers enqueueing in different orders diverge.
10. **`Game.snapshot().objectives` is always empty.** `objectives()` in `victory.ts` computes
    landmark/sacred/wonder progress for the HUD but is never called, so the objectives panel
    has no data source.
11. **Stealth and wall flags are inert.** `fog.isVisibleTo` is exported and never called, so
    forest stealth has no effect; `walkableTop` and `isGate` on wall definitions are never
    read, so gates do not pass friendly units differently and stone-wall tops are not
    walkable; `stunUntil` is never written or read.
12. **`mapType` is ignored.** `generateMap` accepts `opts.mapType` and never uses it, so every
    map on every size is the same grassland continent; the lobby's map-type choice would
    therefore be cosmetic.
13. **Missing browser entry points.** There is no `index.html`, no `src/main.ts`, no
    `src/game/` content and no `public/` asset, so `pnpm dev` / `pnpm build` cannot yet
    produce a playable page even though `vite.config.ts` is configured for one.
