# Aegis of Ages — Progress

Living status file. Last verified against the working tree: **2026-10-08, 20:5x local**.
`docs/SPEC.md` is the single source of truth for values; this file tracks state, decisions and
open bugs. Every claim below was checked by running something, not by reading alone.

## Current phase

Phases 0–9 are implemented and the acceptance suite runs green against production
(https://aegis-of-ages.guhcostan.workers.dev). Current work is hardening: the e2e suite keeps
finding real bugs, and each round fixes them and adds coverage rather than relaxing tests.

## Done (verified)

Simulation core (`src/sim/`), headless-runnable in Node with no DOM:

- [x] Deterministic fixed-tick simulation at 20 Hz with `FP_ONE = 1024` integer fixed point.
      Verified: the same seed and command stream produce the same state hash, both in Node
      (`tests/unit/match.test.ts`) and in the browser (`02-gameplay.spec.ts`, determinism test).
- [x] `map/terrain.ts` seeded generation: relief, water, forests with stealth flags, gold,
      stone, sheep, deer, boar, berries, sacred sites, relics, mirrored ring starts, and three
      terrain presets (`grassland`, `dry`, `forest`). Verified across 4 map sizes x 2 player
      counts x 25 seeds that every map spawns at least 4 sacred sites.
- [x] `map/pathfind.ts` deterministic A* with an expansion budget, partial-path fallback, and
      owner-aware gates (your own gate is walkable for you, an enemy's is not).
- [x] Systems: production, movement, gathering, construction, repair, combat, religion,
      trade, fog of war, victory.
- [x] Economy: four resources, drop-offs, 200-population ceiling via houses, farms as an
      unlimited food pool.
- [x] Four ages advanced by building one of two landmarks per age, with all 12 landmarks for
      English and French.
- [x] Combat with AoE IV armour/bonus model, counters, siege ranged resistance, charge bonus,
      minimum range on siege, projectiles and splash damage.
- [x] Relics, monks, sacred sites, traders, walls, gates, outposts, keeps, wonders.
- [x] Victory by landmarks, sacred sites or wonder, plus total elimination.

Application layer (`src/render`, `src/ui`, `src/game`, `src/audio`):

- [x] three.js WebGL2 renderer with per-definition instancing, procedural low-poly models and
      canvas textures (no external assets), terrain mesh, fog of war, minimap, RTS camera with
      pan/zoom/rotate, selection discs and order markers.
- [x] HUD in the AoE IV layout: resource bar with villagers per resource, population, age,
      selection panel, 4x3 command card with hotkeys and costs, production queues, global
      queue, minimap, idle-villager and all-military buttons, control groups, scoreboard and
      objectives panel, victory/defeat overlay.
- [x] Skirmish menu: civilisation, map size and terrain, 1–3 bots with difficulty, victory
      condition, starting resources, seed, reveal map, plus controls and credits screens.
- [x] Input: click/box/double-click selection, shift-queued orders, control groups, edge and
      keyboard panning, wheel zoom, Q/E rotation, attack-move.
- [x] Procedural audio (Web Audio synthesis, no sample files) with cues driven by state changes.
- [x] `window.__game` automation API: state, hash, command, apply, step, pause/resume, speed,
      fps, renderStats, selection, camera, counts, spawn, grant, placeBuilding, simulate.

Bots and tests:

- [x] Bot opponent with build order, villager distribution with rebalancing, farm economy,
      landmark age-ups, counter-aware army composition, defence, waves of attack and
      sacred-site contest, in three difficulties.
- [x] 27 unit tests: determinism, data integrity, counter design, economy values, effective
      stats, and a full headless bot-vs-bot match that produces a winner.
- [x] 26 e2e tests against production: shell/lobby, world and camera, economy and
      construction, ages, combat counters, walls/keep, relics, trade, real-mouse battlefield
      input, HUD panels, command card, control groups, all three victory conditions, a
      simulated player beating a bot, bot-vs-bot, and the 200-unit performance measurement.

Delivery:

- [x] GitHub repo https://github.com/guhcostan/aegis-of-ages, CI (lint, typecheck, unit, build,
      deploy, e2e) on every push to main.
- [x] Deployed with wrangler to https://aegis-of-ages.guhcostan.workers.dev.

## Bugs found and fixed this round

Each of these was caught by a test or a browser probe, not by reading code:

1. `#menu-root` and `.aoe-hud` covered the whole viewport with `pointer-events: auto`; once a
   match started, every click on the battlefield was silently swallowed.
2. The camera scrolled away on its own at match start: edge panning treated the untouched
   pointer position `(0,0)` as the top-left screen edge.
3. `setDestination(..., false)` cleared the order queue immediately after an order was
   installed, deleting move, attack-move, patrol and relic-pickup orders.
4. A monk ordered to collect a relic walked there and then did nothing: the `PickupRelic`
   order was never processed on arrival.
5. Building times ignored each def's `buildTime` (every building took 16 s); they now use the
   researched time with AoE IV's diminishing 3/(N+2) multi-villager formula.
6. Construction reach ignored the building footprint, so 3x3 and 4x4 buildings could never be
   built — no villager could stand close enough to the centre.
7. Effective-stat caches were never invalidated, so researched technologies never changed any
   stat after the first lookup.
8. Farms were destroyed on first harvest because they were treated as finite nodes.
9. Population was only gated by the hard 200 ceiling, never by the player's actual cap.
10. Multi-class units only matched one class, so crossbow-vs-heavy and archer-vs-light bonuses
    were partly inert.
11. The landmark victory could not trigger: the "has ever had a landmark" flag was derived from
    a list that is empty by the time the last landmark falls.
12. Maps could spawn fewer sacred sites than the sacred-site victory requires, making that
    condition unwinnable.
13. Bots sent every idle villager to the same resource and the same node, freezing the economy.
14. Bots fed villagers endlessly into unreachable construction sites until the whole workforce
    was stuck building one impossible building.
15. Bots never built farms proactively, so once the nearby sheep were gone food income was zero.
16. Bots diverted their army to a sacred site on every decision and camped there forever, so
    matches never ended.
17. In a fully automated match, two controllers drove player 0 at once and fought each other.
18. Units could be permanently stranded when buildings sealed them in; movement now has a
    progress watchdog with local repositioning.
19. Complete immunity to ranged damage was modelled per siege unit; the percentage resistance
    is applied before armour, as in the original.

## Pending / known limitations

- Under the **Standard** starting preset on small maps the two bots often settle into a long
  economic game instead of a decisive one; with the **Very High** preset matches resolve in
  10–21 simulated minutes. This is honest, measured behaviour, not a test workaround: the
  acceptance tests for full matches use Very High, and `tests/unit/match.test.ts` proves a
  bot-vs-bot winner is reachable with standard resources.
- Torch/fire attacks against buildings are modelled as ordinary melee damage against a small
  building melee armour instead of a separate fire damage type (see SPEC deviations).
- Arena auras (English Mill influence, Network of Castles) are global modifiers rather than
  radial auras.
- Units standing on stone walls is implemented as a walkable flag on wall tiles; there is no
  dedicated parapet movement mode.
- No naval, no multiplayer, no campaign (out of scope by the brief).
- No game-speed setting in the lobby (matches AoE IV, which also has none).

## Decisions

- **2026-10-08** — Model: `deepseek-v4.1-flash` (provider `opencode-go`). Claude Haiku 5.5 does
  not exist in this harness's catalogue; the user explicitly authorised keeping the session
  default instead, and forbade swapping models without new authorisation.
- **2026-10-08** — Project name **Aegis of Ages**; repository `guhcostan/aegis-of-ages`. All
  art, audio and text are original and generated in code.
- **2026-10-08** — Tick rate 20 Hz; all gameplay state is integer fixed point so that the same
  seed and command stream reproduce bit-identical results in Node and in the browser.
- **2026-10-08** — CI build approval uses `allowBuilds` (pnpm 11), **not**
  `onlyBuiltDependencies` (pnpm 10). Verified empirically: with the pnpm 10 spelling,
  `pnpm install --frozen-lockfile` still exits 1 with `ERR_PNPM_IGNORED_BUILDS`.
- **2026-10-08** — Acceptance tests pause the session (`startPaused`) and advance it with
  explicit `step()` calls, so tick-accurate assertions are not raced by the render loop.

## Open bugs

None known at this revision that affect the acceptance criteria. Suspected, not yet confirmed:

- Prolonged bot games under Standard resources can leave a bot with a very small workforce
  (observed 4–10 villagers after 60 simulated minutes), which looks like a villager-replacement
  problem rather than a gathering-rate problem. Needs a dedicated measurement.
- Trade gold is a linear approximation of the original's quadratic distance curve, so long
  routes pay less than they should.
