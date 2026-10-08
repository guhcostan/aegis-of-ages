# Aegis of Ages — Implementation Specification

Single source of truth for what the game implements. Every number in §2 and §4 was read
from the source files listed next to it, not from the research notes; §3 then checks each
value against `docs/research/*.md`.

Revision of record: 2026-10-08, 15:25 local. Sources inspected at this revision:

| File | Role |
|---|---|
| `src/sim/constants.ts` | tick rate, fixed point, ages, victory ids, caps |
| `src/sim/types.ts` | entity/definition/snapshot-facing interfaces |
| `src/sim/fixed.ts`, `src/sim/rng.ts` | integer math and deterministic RNG/hasher |
| `src/sim/data/units.ts`, `buildings.ts`, `techs.ts`, `economy.ts`, `civs.ts` | data tables |
| `src/sim/world.ts`, `game.ts`, `stats.ts` | world state, match orchestrator, stat merging |
| `src/sim/systems/*.ts`, `src/sim/map/*.ts` | the nine per-tick systems, pathfinding, terrain |
| `src/ui/types.ts`, `src/ui/hud.ts` | HUD contract and HUD implementation |
| `src/render/types.ts` | renderer contract (implementation pending) |

Legend used in §2: **V** = verified against `docs/research/*.md`, **M** = modelled or
deviating (reason in §3/§4), **U** = unverified (no research confirmation).
Ages: D = Dark (0), F = Feudal (1), C = Castle (2), I = Imperial (3).

---

## 1. Scope and non-goals

### In scope

* A single-player skirmish RTS in the browser: one deterministic simulation, one local
  player, up to three bots (bot AI still pending — see §5 and `docs/PROGRESS.md`).
* Two asymmetric civilizations, **English** and **French**, each with six landmarks
  (two per age-up step), one to two unique units, and a set of permanent bonuses.
* Ages I–IV advanced by completing a landmark. Landmark victory (default), sacred-site
  victory and wonder victory.
* Land warfare only: 18 unit definitions covering economy, infantry, ranged, cavalry,
  siege and support roles.
* Economy: food, wood, gold and stone; eight gatherable source kinds; drop-off buildings;
  farms; houses and a 200 population ceiling; repair; monasteries, relics, sacred sites
  and trade routes.
* Fog of war with explored/visible grids and stealth forest tiles.
* A HUD laid out after the classic RTS command bar (resource bar with per-resource worker
  counts, selection panel, 12-slot command card, per-building and global production
  queues, minimap, objectives, scoreboard, idle-villager and select-all-military actions).
* All art generated in code: procedural low-poly geometry and canvas textures, original
  inline SVG HUD icons. No third-party or franchise asset is downloaded, embedded or
  referenced. The name "Aegis of Ages" is the only player-facing product name.

### Non-goals (explicitly out)

* **Naval play.** There is no Dock, no water economy, no transport and no naval unit.
  Water tiles are generated as impassable scenery only.
* **Multiplayer.** No networking, no lobby over the wire, no rollback or lockstep protocol.
  The command log exists for replay and tests, not for netcode.
* **Campaign.** No missions, no scripted scenarios, no campaign difficulty, no hero units
  (the English King, Wynguard batches and other campaign-flavoured content are omitted).
* Gunpowder and its technologies, elephants, variant civilizations, Dominion/Regicide
  modes, map-type biomes, and the remaining 21 civilizations of the reference game.

---

## 2. Implemented values

All times are shown twice: the tick count actually stored (`TICK_RATE = 20`), and the
seconds it represents. `Math.round(seconds × 20)` is applied when the data tables are
loaded, so a nominal 3.875 s is stored as 78 ticks = **3.90 s**. Distances are stored in
fixed point (`FP_ONE = 1024` per tile) and shown as tiles. Attack rate is
`attackSpeed` ticks ÷ 20.

### 2.1 Units — `src/sim/data/units.ts`

Classes: `Inf`=Infantry, `LI`=LightInfantry, `Heavy`, `Cav`=Cavalry, `Rng`=Ranged,
`Sge`=Siege, `Wkr`=Worker, `Mnk`=Monk. Costs are F/W/G/S. `RR` = ranged resistance (%),
`Chg` = charge bonus (damage). "Trains at" lists `trainedAt`.

| id | name | civ | age | cost | train | HP | melee/ranged atk | m/r armor | range (t) | speed (t/s) | LOS (t) | pop | classes | bonus damage | rate (ticks/s) | RR | Chg | trains at |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| villager | Villager | any | D | 50/0/0/0 | 400 t / 20 s | 50 | 6 / 3 | 0 / 0 | 0.290 | 1.120 | 6.220 | 1 | Wkr, Inf | — | 78 t / 3.90 s | 0 | 0 | town_center |
| scout | Scout | any | D | 65/0/0/0 | 460 t / 23 s | 110 | 1 / 3 | 0 / 0 | 2.880 | 1.625 | 9.110 | 1 | Cav | — | 40 t / 2.00 s | 0 | 0 | stable |
| monk | Monk | any | C | 0/0/150/0 | 600 t / 30 s | 90 | 0 / 0 | 0 / 0 | 4.750 | 1.120 | 6.670 | 1 | Mnk | — | 40 t / 2.00 s | 0 | 0 | monastery |
| trader | Trader | any | F | 0/60/60/0 | 600 t / 30 s | 90 | 0 / 0 | 0 / 0 | — | 1.000 | 7.780 | 1 | Wkr | — | 30 t / 1.50 s | 0 | 0 | market |
| spearman | Spearman | any | D | 60/20/0/0 | 300 t / 15 s | 80 | 7 / 0 | 0 / 0 | 0.290 | 1.250 | 8.000 | 1 | Inf, LI | +17 vs Cav | 38 t / 1.90 s | 0 | 0 | barracks |
| manatarms | Man-at-Arms | any | C | 90/0/20/0 | 410 t / 20.5 s | 155 | 12 / 0 | 4 / 4 | 0.290 | 1.125 | 8.000 | 1 | Inf, Heavy | — | 28 t / 1.40 s | 0 | 0 | barracks |
| archer | Archer | any | F | 30/50/0/0 | 300 t / 15 s | 70 | 0 / 5 | 0 / 0 | 5.000 | 1.250 | 8.000 | 1 | Rng | +5 vs LI | 33 t / 1.65 s | 0 | 0 | archery_range |
| crossbowman | Crossbowman | any | C | 80/0/40/0 | 450 t / 22.5 s | 80 | 0 / 11 | 0 / 0 | 5.000 | 1.125 | 8.890 | 1 | Rng | +10 vs Heavy | 43 t / 2.15 s | 0 | 0 | archery_range |
| horseman | Horseman | any | F | 100/20/0/0 | 450 t / 22.5 s | 125 | 9 / 0 | 0 / 2 | 0.375 | 1.875 | 6.220 | 1 | Cav | +9 vs Rng, +9 vs Sge | 35 t / 1.75 s | 0 | 0 | stable |
| knight | Knight | any | C | 140/0/100/0 | 700 t / 35 s | 230 | 24 / 0 | 4 / 4 | 0.290 | 1.630 | 6.220 | 1 | Cav, Heavy | — | 30 t / 1.50 s | 0 | 12 | stable |
| battering_ram | Battering Ram | any | F | 0/200/0/0 | 700 t / 35 s | 370 | 0 / 200 | 0 / 0 | 0.500 | 0.750 | 6.670 | 1 | Sge | +300 vs Building | 102 t / 5.10 s | 95 | 0 | siege_workshop |
| siege_tower | Siege Tower | any | F | 0/125/0/0 | 600 t / 30 s | 480 | 0 / 0 | 0 / 0 | — | 0.810 | 8.000 | 1 | Sge | — | 30 t / 1.50 s | 95 | 0 | siege_workshop |
| mangonel | Mangonel | any | C | 0/400/200/0 | 800 t / 40 s | 130 | 0 / 10 | 0 / 0 | 8.000, min 3.000 | 0.750 | 11.560 | 3 | Sge | +30 Building, +10 Rng | 138 t / 6.90 s | 85 | 0 | siege_workshop |
| springald | Springald | any | C | 0/150/100/0 | 400 t / 20 s | 85 | 0 / 15 | 3 / 0 | 7.500 | 0.875 | 12.400 | 2 | Sge | +12 vs LI | 63 t / 3.15 s | 55 | 0 | siege_workshop |
| trebuchet | Counterweight Trebuchet | any | C | 0/400/150/0 | 600 t / 30 s | 140 | 0 / 40 | 0 / 0 | 16.000, min 2.750 | 0.625 | 17.780 | 2 | Sge | +350 Building | 228 t / 11.40 s | 80 | 0 | siege_workshop |
| longbowman | Longbowman | english | F | 40/50/0/0 | 300 t / 15 s | 70 | 0 / 6 | 0 / 0 | 7.000 | 1.125 | 9.780 | 1 | Rng | +6 vs LI | 33 t / 1.65 s | 0 | 0 | archery_range, council_hall |
| royal_knight | Royal Knight | french | F | 140/0/100/0 | 700 t / 35 s | 190 | 19 / 0 | 3 / 3 | 0.290 | 1.625 | 6.220 | 1 | Cav, Heavy | — | 30 t / 1.50 s | 0 | 10 | stable, school_of_cavalry |
| arbaletrier | Arbalétrier | french | C | 80/0/40/0 | 450 t / 22.5 s | 80 | 0 / 11 | 1 / 0 | 5.000 | 1.120 | 8.890 | 1 | Rng | +10 vs Heavy | 43 t / 2.15 s | 0 | 0 | archery_range |

Universal default fields (`def()` in the same file): `age = D`, `trainTime = 400 t`,
`hp = 100`, `meleeAttack = 0`, `rangedAttack = 0`, both armors `0`, `range = 298` fp
(0.29 t), `speed = 1024` (1.0 t/s), `los = 8192` (8 t), `pop = 1`, `attackSpeed = 30 t`,
`windup = 3 t`, `canBuild = false`, `minRange = 0`, `chargeBonus = 0`,
`rangedResistance = 0`, `trainsAt = []`.

Definition counts (verified with `wc`/`grep`): 18 units in `ALL_UNITS`, 15 of them
`civ: 'any'`, 1 English (`longbowman`), 2 French (`royal_knight`, `arbaletrier`).

### 2.2 Buildings — `src/sim/data/buildings.ts`

Costs F/W/G/S; armor is melee/ranged. "Drop-off" lists accepted resources; "Trains" and
"Research" list the ids wired into `BuildingDef.trains` / `.researches`. The default in
`bdef()` is `civ 'any'`, `age D`, `meleeArmor 0`, `rangedArmor 50`, `popProvided 0`,
`garrisonCap 0`, `los 10 t`, `attack 0`, `range 0`, `attackSpeed 30 t`, `isLandmark false`,
`isWallSegment false`, `isGate false`, `walkableTop false`.

| id | name | civ | age | cost | build time | HP | m/r armor | foot-print | pop | garri-son | drop-off | trains | LOS (t) | attack / range / rate |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| town_center | Town Center | any | F | 0/400/0/300 | 3000 t / 150 s | 7000 | 11 / 50 | 4×4 | +10 | 15 | food, wood, gold, stone | villager, scout | 14.000 | 8 / 8.000 / 30 t (1.50 s) |
| house | House | any | D | 0/50/0/0 | 300 t / 15 s | 750 | 0 / 50 | 2×2 | +10 | 0 | — | — | 6.000 | — |
| mill | Mill | any | D | 0/50/0/0 | 400 t / 20 s | 750 | 0 / 50 | 2×2 | 0 | 5 | food | — | 8.000 | — |
| farm | Farm | any | D | 0/75/0/0 | 120 t / 6 s | 300 | 0 / 50 | 2×2 | 0 | 0 | — | — | 4.000 | — |
| lumber_camp | Lumber Camp | any | D | 0/50/0/0 | 400 t / 20 s | 750 | 0 / 50 | 2×2 | 0 | 5 | wood | — | 8.000 | — |
| mining_camp | Mining Camp | any | D | 0/50/0/0 | 400 t / 20 s | 750 | 0 / 50 | 2×2 | 0 | 5 | gold, stone | — | 8.000 | — |
| market | Market | any | F | 0/100/0/0 | 400 t / 20 s | 1000 | 0 / 50 | 4×4 | 0 | 5 | gold | trader | 10.000 | — |
| barracks | Barracks | any | D | 0/150/0/0 | 600 t / 30 s | 1500 | 0 / 50 | 3×3 | 0 | 5 | — | spearman, manatarms | 8.000 | — |
| archery_range | Archery Range | any | F | 0/150/0/0 | 600 t / 30 s | 1500 | 0 / 50 | 3×3 | 0 | 5 | — | archer, crossbowman | 8.000 | — |
| stable | Stable | any | F | 0/150/0/0 | 600 t / 30 s | 1500 | 0 / 50 | 3×3 | 0 | 5 | — | scout, horseman, knight | 8.000 | — |
| siege_workshop | Siege Workshop | any | C | 0/250/0/0 | 900 t / 45 s | 2100 | 0 / 50 | 3×3 | 0 | 5 | — | battering_ram, siege_tower, mangonel, springald, trebuchet | 8.000 | — |
| blacksmith | Blacksmith | any | F | 0/150/0/0 | 500 t / 25 s | 1500 | 0 / 50 | 4×4 | 0 | 5 | — | — | 8.000 | — |
| university | University | any | I | 0/450/0/0 | 1200 t / 60 s | 2100 | 0 / 50 | 4×4 | 0 | 5 | — | — | 8.000 | — |
| monastery | Monastery | any | C | 0/200/0/0 | 500 t / 25 s | 2100 | 0 / 50 | 4×4 | 0 | 10 | — | monk | 10.000 | — |
| outpost | Outpost | any | D | 0/100/0/0 | 1200 t / 60 s | 750 | 0 / 50 | 2×2 | 0 | 5 | — | — | 13.330 | 8 / 6.000 / 30 t (1.50 s) |
| palisade_wall | Palisade Wall | any | D | 0/7/0/0 | 160 t / 8 s | 1350 | 2 / 50 | 1×1 | 0 | 0 | — | — | 3.000 | — |
| palisade_gate | Palisade Gate | any | D | 0/25/0/0 | 200 t / 10 s | 1350 | 2 / 50 | 1×1 | 0 | 0 | — | — | 3.000 | — |
| stone_wall | Stone Wall | any | F | 0/0/0/25 | 320 t / 16 s | 3000 | 8 / 50 | 1×1 | 0 | 0 | — | — | 4.000 | — |
| stone_gate | Stone Wall Gate | any | F | 0/0/0/50 | 600 t / 30 s | 3000 | 8 / 50 | 1×1 | 0 | 0 | — | — | 4.000 | — |
| keep | Keep | any | C | 0/0/0/900 | 3600 t / 180 s | 5000 | 10 / 50 | 4×4 | 0 | 15 | — | — | 16.000 | 16 / 8.000 / 24 t (1.20 s) |
| wonder | Wonder | any | I | 5000/5000/5000/5000 | 12000 t / 600 s | 5000 | 10 / 50 | 6×6 | 0 | 0 | — | — | 20.000 | — |

Research lists (`BuildingDef.researches`), as implemented:

| building | technologies |
|---|---|
| mill | survival_techniques, wheelbarrow, horticulture, fertilization |
| lumber_camp | forestry, double_broadaxe, lumber_preservation, crosscut_saw |
| mining_camp | specialized_pick, shaft_mining, cupellation |
| barracks | hardened_spearman, veteran_spearman, elite_spearman, veteran_manatarms, elite_manatarms |
| archery_range | veteran_archer, elite_archer, elite_crossbowman, spyglass |
| stable | veteran_horseman, elite_horseman, veteran_knight, elite_knight |
| siege_workshop | lightweight_beams, greased_axles, adjustable_crossbars |
| blacksmith | forged_blades, tempered_blades, damascus_steel, hardened_shafts, balanced_bows, platecutter_point, iron_undermail, fitted_leather, insulated_helm, padded_armor, leather_armor, mail_armor |
| university | chemistry, siege_works, incendiary_arrows, elite_army_tactics, court_architects, silk_bowstrings |
| monastery | herbal_medicine, piety, tithe_barns |

Wall/gate flags: `palisade_wall`/`palisade_gate` are `isWallSegment`, gates additionally
`isGate`; `stone_wall`/`stone_gate` add `walkableTop`. `farm` has **no** resource pool
field in the definition; it becomes a food source only through the gather system (see §4.6
and the farm bug in `docs/PROGRESS.md`).

#### Landmarks — `src/sim/data/buildings.ts`

Cost tier is the age-up cost; `landmarkAge` is the age advanced **into**. All landmarks
are `kind: Landmark`, `isLandmark: true`, `rangedArmor 50`, footprint 4×4, `researches`
empty unless listed.

| id | name | civ | age built | into | cost | build time | HP | pop | garri-son | trains | attack / range / rate |
|---|---|---|---|---|---|---|---|---|---|---|---|
| council_hall | Council Hall | english | D | F | 400/0/200/0 | 3800 t / 190 s | 5000 | 0 | 5 | longbowman | — |
| abbey_of_kings | Abbey of Kings | english | D | F | 400/0/200/0 | 3800 t / 190 s | 5000 | 0 | 10 | — | — |
| kings_palace | King's Palace | english | F | C | 1200/0/600/0 | 4400 t / 220 s | 5000 | +10 | 10 | villager | — |
| white_tower | The White Tower | english | F | C | 1200/0/600/0 | 4400 t / 220 s | 5000 | 0 | 15 | — | 16 / 8.000 / 24 t (1.20 s) |
| berkshire_palace | Berkshire Palace | english | C | I | 2400/0/1200/0 | 5000 t / 250 s | 6500 | 0 | 20 | — | 20 / 14.500 / 24 t (1.20 s) |
| wynguard_palace | Wynguard Palace | english | C | I | 2400/0/1200/0 | 5000 t / 250 s | 5000 | 0 | 10 | manatarms, longbowman | — |
| chamber_of_commerce | Chamber of Commerce | french | D | F | 400/0/200/0 | 3800 t / 190 s | 5000 | 0 | 5 | — | — |
| school_of_cavalry | School of Cavalry | french | D | F | 400/0/200/0 | 3800 t / 190 s | 5000 | 0 | 5 | royal_knight, horseman | — |
| royal_institute | Royal Institute | french | F | C | 1200/0/600/0 | 4400 t / 220 s | 5000 | 0 | 5 | — | — |
| guild_hall | Guild Hall | french | F | C | 1200/0/600/0 | 4400 t / 220 s | 5000 | 0 | 5 | — | — |
| red_palace | Red Palace | french | C | I | 2400/0/1200/0 | 5000 t / 250 s | 5000 | 0 | 15 | — | 22 / 10.000 / 24 t (1.20 s) |
| college_of_artillery | College of Artillery | french | C | I | 2400/0/1200/0 | 5000 t / 250 s | 5000 | 0 | 5 | mangonel, springald, trebuchet | — |

Other implemented landmark fields: `council_hall` LOS 10 t; `kings_palace` drop-off
food/wood/gold/stone and LOS 12 t; `chamber_of_commerce` drop-off gold, LOS 10 t;
`guild_hall` drop-off food/wood/gold/stone, LOS 10 t; `royal_institute` researches
forged_blades, tempered_blades, damascus_steel, iron_undermail, fitted_leather,
insulated_helm; `school_of_cavalry` researches the four cavalry tier techs;
`white_tower` LOS 16 t; `berkshire_palace` LOS 18 t; `red_palace` LOS 18 t;
`wynguard_palace`/`college_of_artillery` LOS 12 t. There is no functional effect wired for
Abbey of Kings, King's Palace villager speed, White Tower production speed, Chamber of
Commerce free traders, Royal Institute discount, Guild Hall generation or College of
Artillery speed — only the fields above exist (§4).

### 2.3 Technologies — `src/sim/data/techs.ts`

48 technologies. `flat` deltas are integers, `pct` are percentages in the stat named by
`stat`; `appliesTo` selects the unit/building population. Cost F/W/G/S. Time in ticks and
seconds.

| id | name | building | age | cost | time | effect as implemented |
|---|---|---|---|---|---|---|
| forged_blades | Forged Blades | blacksmith | F | 50/0/125/0 | 1200 t / 60 s | MeleeAttack +1, `military` |
| tempered_blades | Tempered Blades | blacksmith | C | 100/0/250/0 | 1200 t / 60 s | MeleeAttack +1, `military`; requires forged_blades |
| damascus_steel | Damascus Steel | blacksmith | I | 150/0/350/0 | 1200 t / 60 s | MeleeAttack +1, `military`; requires tempered_blades |
| hardened_shafts | Hardened Shafts | blacksmith | F | 0/50/125/0 | 1200 t / 60 s | RangedAttack +1, `military` |
| balanced_bows | Balanced Bows | blacksmith | C | 0/100/250/0 | 1200 t / 60 s | RangedAttack +1, `military`; requires hardened_shafts |
| platecutter_point | Platecutter Point | blacksmith | I | 0/150/350/0 | 1200 t / 60 s | RangedAttack +1, `military`; requires balanced_bows |
| iron_undermail | Iron Undermail | blacksmith | F | 50/0/125/0 | 1200 t / 60 s | MeleeArmor +1, `military` |
| fitted_leather | Fitted Leatherwork | blacksmith | C | 100/0/250/0 | 1200 t / 60 s | MeleeArmor +1, `military`; requires iron_undermail |
| insulated_helm | Insulated Helm | blacksmith | I | 150/0/350/0 | 1200 t / 60 s | MeleeArmor +1, `military`; requires fitted_leather |
| padded_armor | Padded Armor | blacksmith | F | 0/50/125/0 | 1200 t / 60 s | RangedArmor +1, `military` |
| leather_armor | Leather Armor | blacksmith | C | 0/100/250/0 | 1200 t / 60 s | RangedArmor +1, `military`; requires padded_armor |
| mail_armor | Mail Armor | blacksmith | I | 0/150/350/0 | 1200 t / 60 s | RangedArmor +1, `military`; requires leather_armor |
| hardened_spearman | Hardened Spearman | barracks | F | 15/0/35/0 | 300 t / 15 s | Hp +10 `all`; MeleeAttack +1 `military` class LightInfantry |
| veteran_spearman | Veteran Spearman | barracks | C | 100/0/250/0 | 1200 t / 60 s | Hp +20 `all`; MeleeAttack +1 LightInfantry; requires hardened_spearman |
| elite_spearman | Elite Spearman | barracks | I | 300/0/700/0 | 1200 t / 60 s | Hp +30 `all`; MeleeAttack +2 LightInfantry; requires veteran_spearman |
| veteran_archer | Veteran Archer | archery_range | C | 100/0/250/0 | 1200 t / 60 s | Hp +10 `all`; RangedAttack +2 class Ranged |
| elite_archer | Elite Archer | archery_range | I | 300/0/700/0 | 1200 t / 60 s | Hp +15 `all`; RangedAttack +1 Ranged; requires veteran_archer |
| elite_crossbowman | Elite Crossbowman | archery_range | I | 300/0/700/0 | 1200 t / 60 s | Hp +15 `all`; RangedAttack +3 Ranged |
| veteran_horseman | Veteran Horseman | stable | C | 100/0/250/0 | 1200 t / 60 s | Hp +30 `all`; MeleeAttack +2 class Cavalry |
| elite_horseman | Elite Horseman | stable | I | 300/0/700/0 | 1200 t / 60 s | Hp +25 `all`; MeleeAttack +2 Cavalry; requires veteran_horseman |
| veteran_knight | Veteran Knight | stable | C | 50/0/125/0 | 600 t / 30 s | Hp +40 `all`; MeleeAttack +5 Cavalry |
| elite_knight | Elite Knight | stable | I | 300/0/700/0 | 1200 t / 60 s | Hp +40 `all`; MeleeAttack +5 Cavalry; requires veteran_knight |
| veteran_manatarms | Veteran Man-at-Arms | barracks | C | 50/0/125/0 | 600 t / 30 s | Hp +25 `all`; MeleeAttack +2 `military` |
| elite_manatarms | Elite Man-at-Arms | barracks | I | 300/0/700/0 | 1200 t / 60 s | Hp +25 `all`; MeleeAttack +2 `military`; requires veteran_manatarms |
| spyglass | Spyglass | archery_range | C | 0/100/50/0 | 900 t / 45 s | Los +20%, `military` |
| lightweight_beams | Lightweight Beams | siege_workshop | C | 0/300/400/0 | 1200 t / 60 s | Speed +15%, `siege` |
| greased_axles | Greased Axles | siege_workshop | C | 0/150/350/0 | 1200 t / 60 s | Speed +15%, `siege` |
| adjustable_crossbars | Adjustable Crossbars | siege_workshop | C | 0/1000/1200/0 | 1800 t / 90 s | RangedAttack +20%, `siege` |
| chemistry | Chemistry | university | I | 200/0/650/0 | 1200 t / 60 s | RangedAttack +20%, `siege` |
| siege_works | Siege Works | university | I | 0/300/600/0 | 1800 t / 90 s | Hp +20%, `siege` |
| incendiary_arrows | Incendiary Arrows | university | I | 0/500/1000/0 | 1800 t / 90 s | RangedAttack +6, `defensive` (buildings with attack > 0) |
| elite_army_tactics | Elite Army Tactics | university | I | 500/0/1000/0 | 1800 t / 90 s | MeleeAttack +20% and RangedAttack +20%, `military` |
| court_architects | Court Architects | university | I | 0/0/700/300 | 1800 t / 90 s | Hp +20%, `building` |
| silk_bowstrings | Silk Bowstrings | university | I | 0/200/500/0 | 1200 t / 60 s | AttackSpeed +15% class Ranged |
| survival_techniques | Survival Techniques | mill | D | 0/25/75/0 | 500 t / 25 s | GatherFood +15%, `worker` |
| wheelbarrow | Wheelbarrow | mill | D | 0/50/150/0 | 1800 t / 90 s | CarryCapacity +5 and Speed +15%, `worker` |
| horticulture | Horticulture | mill | F | 0/50/100/0 | 900 t / 45 s | GatherFood +10%, `worker` |
| fertilization | Fertilization | mill | C | 0/100/250/0 | 1200 t / 60 s | GatherFood +10%, `worker`; requires horticulture |
| forestry | Forestry | lumber_camp | D | 25/0/50/0 | 900 t / 45 s | GatherWood +10%, `worker` |
| double_broadaxe | Double Broadax | lumber_camp | F | 50/0/100/0 | 900 t / 45 s | GatherWood +15%, `worker`; requires forestry |
| lumber_preservation | Lumber Preservation | lumber_camp | C | 100/0/250/0 | 1200 t / 60 s | GatherWood +15%, `worker`; requires double_broadaxe |
| crosscut_saw | Crosscut Saw | lumber_camp | I | 250/0/500/0 | 1500 t / 75 s | GatherWood +15% and CarryCapacity +5, `worker`; requires lumber_preservation |
| specialized_pick | Specialized Pick | mining_camp | D | 0/50/100/0 | 900 t / 45 s | GatherGold +15% and GatherStone +15%, `worker` |
| shaft_mining | Shaft Mining | mining_camp | C | 0/100/250/0 | 1200 t / 60 s | GatherGold +15%, GatherStone +15%; requires specialized_pick |
| cupellation | Cupellation | mining_camp | I | 0/250/500/0 | 1500 t / 75 s | GatherGold +15% only; requires shaft_mining |
| herbal_medicine | Herbal Medicine | monastery | C | 0/0/275/0 | 900 t / 45 s | HealRate +50%, `monk` |
| piety | Piety | monastery | C | 0/0/325/0 | 900 t / 45 s | Speed +15%, `monk` |
| tithe_barns | Tithe Barns | monastery | C | 0/0/500/0 | 1200 t / 60 s | GatherFood +5% and GatherWood +5%, `worker` |

Costs are modified by `techCostFor(civ, cost, techId)` in `src/sim/data/civs.ts`: for the
French, the 11 economic techs (mill, lumber camp and mining camp lines) cost 65 % of the
listed price (`Math.trunc` per resource).

Stat merging (`src/sim/stats.ts`): effects are collected as **civilization bonuses first,
then researched technologies sorted by id**; `applyStat` adds every flat delta, then sums
every percentage and applies `Math.trunc(value × (100 + pct) / 100)`. Results are cached per
`(player, definition id)` in `WeakMap`s invalidated by `player.modVersion`, which
`bumpModVersion()` increments when a tech completes or an age advances.

### 2.4 Civilization bonuses — `src/sim/data/civs.ts`

#### English

| # | Trait text (as shown) | Implemented modifier |
|---|---|---|
| 1 | Farms cost 50 % less wood | CostWood −50 % for `only: 'farm'`, `building` |
| 2 | Villagers gathering food work 20 % faster (Mill influence, modelled globally) | GatherFood +20 %, `worker` |
| 3 | Men-at-Arms are trained 30 % faster | TrainTime −30 %, `military`, `only: 'manatarms'` |
| 4 | Longbowmen have two extra tiles of range and hit harder | Range +2048 fp (2 tiles) and RangedAttack +1, `military`, `only: 'longbowman'` |
| 5 | Network of Castles: your army attacks 20 % faster | AttackSpeed +20 %, `military` |

Unique units: `longbowman`. Unique buildings/landmarks: council_hall, abbey_of_kings,
kings_palace, white_tower, berkshire_palace, wynguard_palace. Landmark choices:
Feudal → council_hall / abbey_of_kings; Castle → kings_palace / white_tower;
Imperial → berkshire_palace / wynguard_palace. `startingBonus: {}`.

#### French

| # | Trait text (as shown) | Implemented modifier |
|---|---|---|
| 1 | Drop-off buildings (Mill, Lumber Camp, Mining Camp) cost 50 % less wood | CostWood −50 % for each of `mill`, `lumber_camp`, `mining_camp` |
| 2 | Keeps cost 10 % less stone | CostStone −10 %, `building`, `only: 'keep'` |
| 3 | Villagers are trained 13 % faster | TrainTime −13 %, `all`, `only: 'villager'` |
| 4 | Economic technologies cost 35 % less | `techCostFor` ×0.65 on the 11 listed economic techs |
| 5 | Royal Knights are available an age early | `royal_knight.age = Feudal` (generic Knight is Castle) |
| 6 | Arbalétriers bring heavy crossbows | `arbaletrier` definition (melee armor 1, +10 vs Heavy) |

Unique units: `royal_knight`, `arbaletrier`. Landmark choices: Feudal →
chamber_of_commerce / school_of_cavalry; Castle → royal_institute / guild_hall;
Imperial → red_palace / college_of_artillery. `startingBonus: {}`.

`landmarkChoices(civ, age)` returns the pair for the age being advanced into (`['','']`
when absent); `getCiv(id)` throws on an unknown id.

### 2.5 Victory conditions — `src/sim/constants.ts`, `src/sim/systems/victory.ts`

| Condition | Id | Implemented rule |
|---|---|---|
| Landmarks (default) | 0 | A player who has completed at least one landmark (`player.landmarks` or a finished landmark entity) is defeated when they have no finished landmark left. Elimination is checked every tick regardless of the selected condition. |
| Sacred sites | 1 | Hold **3** sites (`SACRED_SITE_VICTORY_COUNT = 3`) continuously for **6000 ticks = 5 min** (`SACRED_SITE_VICTORY_TICKS`). Dropping below 3 resets `sacredHoldTicks` to 0. |
| Wonder | 2 | Have a finished `wonder`; the countdown starts on the tick the victory system first sees it (`player.wonderAt`) and wins after **12000 ticks = 10 min** (`WONDER_VICTORY_TICKS`). Losing the wonder resets `wonderAt`. |
| Elimination (always on) | — | A player with **0 units AND 0 buildings** is defeated with reason "has nothing left". |
| Last player standing | — | With more than one player configured, the last non-defeated player wins ("is the last one standing"); if nobody is left the result is winner −1, "Mutual destruction". |

Match end is recorded in `Game.results` (`{ over, winner, reason }`) and surfaced in
`StateSnapshot`. `victorySystem` returns a fresh `MatchResult` each tick and only its
`over/winner/reason` fields are copied into the game. There is no Dominion, Regicide,
relic-hunt or annihilation mode.

### 2.6 Population and economy rules

Population (`src/sim/world.ts`, `src/sim/systems/production.ts`):

| Rule | Value |
|---|---|
| Hard ceiling | `POP_CAP_MAX = 200` |
| Cap from buildings | Sum of `popProvided` over **finished** buildings: House +10, Town Center +10, King's Palace +10 |
| Unit costs | 1 per standard unit; Mangonel 3; Springald 2; Counterweight Trebuchet 2 |
| Training gate | `queueUnit` refuses only when `player.pop >= POP_CAP_MAX`; when a finished unit would exceed `POP_CAP_MAX`, production stalls with `remaining = 1` |
| Housing gate | **Not enforced**: a player with cap 10 can train to 200 (see §4, bug list) |

Starting state (`src/sim/game.ts` constructor, `src/sim/data/economy.ts`):

| Item | Value |
|---|---|
| Resources | `START_RESOURCES = { food: 200, wood: 200, gold: 100, stone: 0 }` plus `civ.startingBonus` (both civs: none) |
| Units | 6 Villagers + 1 Scout per player (`START_UNITS`) |
| Buildings | 1 Town Center, spawned finished (`construction = 1000`) at `(start.x − 2, start.y − 2)` clamped to the map |
| Initial orders | Villagers 0 and 1 are sent to the nearest wood node, the rest to the nearest food node |
| Sheep | `START_SHEEP = 5` is declared but unused; map generation places **4** `sheep` nodes per player (see §4) |
| Fog | One `PlayerFog` per player, filled once in the constructor |

Gathering (`src/sim/data/economy.ts`, `src/sim/systems/gather.ts`):

| Source kind | Resource | Rate (per second) | Rate as stored (`perSecond`, ×1000) | Carry |
|---|---|---|---|---|
| sheep | food | 0.750 | 750 | 10 |
| berry | food | 0.690 | 690 | 10 |
| farm | food | 0.750 | 750 | 10 |
| deer | food | 0.825 | 825 | 25 (declared, **not used**) |
| boar | food | 0.900 | 900 | 25 (declared, **not used**) |
| tree | wood | 0.750 | 750 | 10 |
| gold | gold | 0.750 | 750 | 10 |
| stone | stone | 0.750 | 750 | 10 |

* Per-tick extraction is `Math.trunc(perSecond × gatherMultiplier / (100 × TICK_RATE))`
  thousandths of a resource; progress accumulates in `gather.progress` and whole units move
  to `gather.carried`.
* Carry capacity in use: **10** plus 5 if the player has researched `wheelbarrow`
  (`carryCapacity()` in `gather.ts` hard-codes the tech check; `crosscut_saw`'s CarryCapacity
  effect is therefore inert, and the per-source 25 for hunted meat is ignored).
* Drop-off: the nearest own **finished** building whose `dropOff` includes the resource;
  with no drop-off building the cargo is banked instantly.
* Node pools as spawned (`RESOURCE_SPECS` in `src/sim/world.ts`): tree 100 wood,
  berry 120 food, gold 600, stone 400, sheep 100 food, deer 140 food, boar 200 food.
  `NODE_AMOUNTS` in `economy.ts` (tree 150, gold 4000, stone 1200, sheep 200, berry 250,
  deer 350, boar 2400) is **not used** by any code path.
* Repair: 1 HP per tick (20 HP/s) on buildings and units, no resource cost
  (`REPAIR_HP_PER_SECOND = 25` truncated by `TICK_RATE`).
* Healing: `HEAL_PER_SECOND = 7` divided by `TICK_RATE` truncates to **0 HP per tick** —
  healing is a no-op (§4).
* Conversion: a Monk keeps an enemy unit in range for 8 s (`CONVERT_SECONDS`), then the
  unit changes owner; the monk receives a 2 s cooldown. No relic requirement, no ring.
* Relics: a Monastery holding a relic accumulates `RELIC_GOLD_PER_MIN = 80` gold as
  `trunc(80 × 1000 / (60 × 20)) = 66` thousandths per tick ≈ 79.2 gold/min, split out when
  it reaches whole gold.
* Sacred sites: any non-worker unit within 4 tiles contests a site; the player with the
  most such units owns it, ties resolved by lowest player id. No capture timer and **no gold
  income** (`SACRED_SITE_GOLD_PER_MIN = 100` is exported but never applied).
* Trade: on arrival at the target market the trader is paid
  `TRADE_BASE + TRADE_PER_TILE × max(1, tilesToHome + tilesTargetToHome)` = 6 + 2 × tiles,
  where each distance is `fpDist >> 10` (whole tiles). Merchants with no order auto-pick the
  nearest market that is not their home market.
* Construction: the builder count divides a fixed **16 s** of work
  (`BASE_RATE = 1000 / (TICK_RATE × 16)` per tick per villager). `BuildingDef.buildTime` is
  **not consulted**; `buildSpeedFactor(N) = 3 / (N + 2)` is declared but unused. Measured in
  a headless probe: a House (nominal 15 s) completes in 334 ticks ≈ **16.7 s** with one
  villager, 167 ticks ≈ 8.35 s with two, 112 ticks ≈ 5.6 s with three — linear, no
  diminishing returns.
* Repair reach: 1.9 tiles plus half the building footprint; build reach 1.8 tiles.
* Farms: see §4.6 — a finished farm has `amount = 0`, so the first gather attempt destroys
  it; `rebuildFarm` (which would set `amount = 350`) is never called.

---

## 3. Verified against research

Verdicts are for the **implemented** value against the named research file. `V` means the
research file states the same value; `M` means the implementation models or changes it
(reason given); `U` means the research file does not confirm it.

### 3.1 Units — `docs/research/units.md`, `docs/research/combat.md`

| Unit | Verdict | Evidence and notes |
|---|---|---|
| Villager | V (one M) | Table 1: 50 food, 20 s, 50 HP, 6 melee, 0/0, 0.29 t, 6.22 LOS, 1 pop; Table 3: 3.875 s knife; economy.md §9.4: 1.125 (wiki 1.12) t/s — matches. **M:** `rangedAttack = 3` gives every villager a ranged attack; research says villagers have no ranged attack (the English bow is a civ bonus, 5 damage). |
| Scout | V (one M) | 65 food, 23 s, 110 HP, 1 melee, 0/0, 1.625 t/s, 9.11 LOS, Town Center + Stable. **M:** `rangedAttack = 3` and `range = 2.88` t are invented; research lists no ranged attack (torch only). |
| Monk | V | Table 1 (150 gold, 30 s, 90 HP, 1.125 t/s, 6.67 LOS) and victory.md §1.5 (1.12 t/s); `src/sim/data/units.ts` uses 1.12. `attackSpeed = 2 s` is not a research value (no attack) — cosmetic. |
| Trader | V | victory.md §3.3: 60 wood + 60 gold, 30 s, 90 HP, 0/0, 1.00 t/s, 7.778 LOS, pop 1, Feudal, Market. All match. |
| Spearman | V (one M) | Tables 1–3: 60/20, 15 s, 80 HP, 7 attack, 0/0, 0.30 t, 1.25 t/s, 8 LOS, +17 vs Cavalry, 1.875 s. **M:** the implementation makes the Spearman Dark-Age for every civ; units.md note [a] gives it Age II for the English. |
| Man-at-Arms | V (one M) | Tables 1–3: 90/20 gold, 20.5 s, 155 HP, 12, 4/4, 1.125 t/s, 8 LOS, 1.375 s — the Regular (Age III) row. **M:** English Vanguard Man-at-Arms in the Dark Age (note [d], civs.md §1.1 "Call to Arms") is not implemented, so the documented +40 % train bonus in `civs.ts` is modelled as −30 % and applies to an Age-Castle unit. |
| Archer | V | Tables 1–3: 30/50, 15 s, 70 HP, ranged 5, 5 t, 1.25 t/s, 8 LOS, +5 vs light melee infantry, 1.625 s. |
| Crossbowman | V | Tables 1–3: 80/40 gold, 22.5 s, 80 HP, ranged 11, 5 t, 1.125 t/s, 8.89 LOS, +10 vs Heavy, 2.125 s. |
| Horseman | V | Tables 1–3: 100/20, 22.5 s, 125 HP, 9, ranged armor 2, 0.38 t, 1.875 t/s, 6.22 LOS, +9 vs Ranged and Siege, 1.75 s. |
| Knight | V (charge M) | Tables 1–3: 140/100 gold, 35 s, 230 HP, 24, 4/4, 0.29 t, 1.625 t/s, 6.22 LOS, 1.5 s; combat.md §10 charge +12 at Regular — the value is stored as `chargeBonus = 12`. **M:** no system applies it (§4). |
| Battering Ram | V (training M) | Tables 1–3 and combat.md §3: 200 wood, 35 s, 370 HP, 200 siege damage, +300 vs walls, 95 % ranged resistance, 0.75 t/s, 6.67 LOS, 5.12 s (stored 5.10 s after tick rounding). **M:** trainable only at the Siege Workshop; the research also documents infantry field construction at 70 s. Range 0.5 t vs the research's 0.54 t (tick rounding). |
| Siege Tower | V (training M) | 125 wood, 30 s, 480 HP, 0.8125 t/s (stored 0.81), 8 LOS, 95 % RR. **M:** trained at the Siege Workshop rather than built by infantry via Siege Engineering. |
| Mangonel | V (three M) | 400 wood + 200 gold, 40 s, 130 HP, 10 siege ×3, +30 vs buildings, +10 vs ranged, 8 t range / min 3 t, 0.75 t/s, 11.56 LOS, 3 pop, 6.875 s, 85 % RR. **M:** one `boulder` projectile with a 1.2-tile splash instead of three projectiles; `minRange` and `rangedResistance` are stored but never read. |
| Springald | V (two M) | 150 wood + 100 gold, 20 s, 85 HP, 15 damage, melee armor 3, 7.5 t, 0.875 t/s, 12.44 LOS (stored 12.40), 2 pop, 3.125 s, 55 % RR, +12 vs melee infantry. **M:** trained at the Siege Workshop (research notes the parsed 20 s vs wiki 30 s conflict — the implementation takes the newer 20 s); `rangedResistance` unused. |
| Counterweight Trebuchet | V (two M) | 400 wood + 150 gold, 30 s, 140 HP, 40 siege +350 vs buildings, 16 t / min 2.75 t, 0.625 t/s, 17.78 LOS, 2 pop, 11.375 s, 80 % RR. **M:** `minRange` and RR unused. |
| Longbowman | V | Tables 1–3: 40 food + 50 wood, 15 s, 70 HP, ranged 6, +6 vs light melee infantry, 7 t, 1.125 t/s, 9.78 LOS, 1.625 s; civs.md §1.2 confirms +2 range and +1 damage versus the Archer. |
| Royal Knight | V (charge M) | Tables 1–3 and civs.md §2.2: 140 food + 100 gold, 35 s, 190 HP, 19, 3/3, 1.625 t/s, 6.22 LOS, 1.5 s, charge +10 — stored as `chargeBonus = 10`. **M:** never applied. |
| Arbalétrier | V | Tables 1–3: 80 food + 40 gold, 22.5 s, 80 HP, ranged 11, +10 vs Heavy, melee armor 1, 5 t, 1.125 t/s (implementation uses the wiki's 1.12), 8.89 LOS, 2.125 s. |

Universal modelling notes for the whole unit table: `attackSpeed`, `range`, `los` and
`speed` are integer tick/fixed-point quantisations of the research decimals, so a nominal
1.875 s becomes 38 ticks = 1.90 s and a nominal 12.44 LOS becomes 12698 fp = 12.4004 tiles.
Classes (`LightInfantry`, `Heavy`) are an invention of this codebase; research expresses the
same counters through unit *types* (combat.md §1: "AoE4 has no AoE2-style armour classes").

### 3.2 Buildings — `docs/research/buildings.md`, `docs/research/economy.md`

| Building | Verdict | Evidence and notes |
|---|---|---|
| House | V | Table 1: 50 wood, 15 s, 750 HP, 50/0, 2×2, +10 pop. |
| Mill | V (one M) | 50 wood, 20 s, 750 HP, 2×2, food drop-off, hosts the four food techs. **M:** garrison 5 (research: 0). |
| Farm | V by the numbers (M in behaviour) | 75 wood, 6 s, 300 HP, 2×2, one worker. **M:** intended infinite food, but the live code gives a new farm no food pool, so it is destroyed on first harvest; also not restricted to one worker. |
| Lumber Camp | V (one M) | 50 wood, 20 s, 750 HP, 2×2, wood drop-off, four wood techs. **M:** garrison 5. |
| Mining Camp | V (one M) | 50 wood, 20 s, 750 HP, 2×2, gold + stone drop-off, three mining techs. **M:** garrison 5. |
| Market | V (one M) | 100 wood, 20 s, 1000 HP, 4×4, trains Traders. **M:** garrison 5; buy/sell is not implemented. |
| Barracks | V (one M) | 150 wood, 30 s, 1500 HP, 3×3. **M:** garrison 5. |
| Archery Range | V (one M) | 150 wood, 30 s, 1500 HP, 3×3. **M:** garrison 5; hosts `spyglass`, which research places at the Stable. |
| Stable | V (one M) | 150 wood, 30 s, 1500 HP, 3×3. **M:** garrison 5. |
| Siege Workshop | V | 250 wood (current value), 45 s, 2100 HP, 3×3. |
| Blacksmith | V (one M) | 150 wood, 25 s, 1500 HP, 4×4. **M:** garrison 5. |
| University | V (one M) | 450 wood, 60 s, 2100 HP, 4×4, Imperial. **M:** garrison 5. |
| Monastery | V (one M) | 200 wood, 25 s, 2100 HP, 4×4, Castle. **M:** garrison 10 (research: 0, 1 for HRE). |
| Outpost | V + M | Table 1: 100 wood, 60 s, 750 HP, 2×2, garrison 5, 13.33 LOS, 6-tile range. The attack value (8) and rate (1.5 s) are modelled; the research table gives no Outpost attack figure. |
| Palisade Wall | V (armor M) | 7 wood, 8 s, 1350 HP. Melee armor 2 is modelled (research: 50 pierce / 0 fire, i.e. no melee armor concept). |
| Palisade Gate | V (armor M) | 25 wood, 10 s, 1350 HP; melee armor 2 modelled. |
| Stone Wall | V (two M) | 25 stone, 16 s, 3000 HP. **M:** melee armor 8; footprint 1×1 (research marks the wall footprint UNVERIFIED). |
| Stone Wall Gate | V (one M) | 50 stone, 30 s, 3000 HP; melee armor 8 modelled. |
| Keep | V + M | 900 stone, 180 s, 5000 HP, 4×4, garrison 15, 8-tile range. **M:** melee armor 10 and attack 16 at 1.2 s; research gives fire armor 6 and "garrison adds extra attacks". |
| Wonder | V + M | 5000 of each resource, 600 s, 5000 HP, 6×6, pierce armor 50. **M:** research notes the Fandom cost is map-size scaled (5000 micro → 8000 large); the flat 5000 is the data-dump floor. |
| Town Center | M | The implementation has one definition carrying the **Capital** Town Center's 7000 HP and 15 garrison with the buildable Town Center's 400 wood + 300 stone / 150 s / 4×4 / +10 pop. Research distinguishes them (buildable: 2500 HP, 8 garrison; capital: 7000 HP, 15 garrison, not buildable, counts as a landmark). The attack (8) matches the capital's arrowslit value; the 1.5 s rate differs from the documented 1.88 s. |

Building armor: every building is `rangedArmor 50`, which matches the research's uniform
50 pierce armor. Melee armor values (0 by default, 2/8/10/11 on walls and fortifications)
are a modelling decision, not a researched value — see §4.1.

### 3.3 Landmarks — `docs/research/buildings.md` Table 2, `docs/research/civs.md`

| Landmark | Verdict | Evidence and notes |
|---|---|---|
| Council Hall | V cost (M effect) | 400 food + 200 gold, 190 s, 5000 HP, 4×4, produces Longbowmen. **M:** no +100 % production speed and no 5 % Longbowman discount; it does not also produce Archers/Crossbowmen. |
| Abbey of Kings | V cost (M effect) | Same cost tier. **M:** the 7.5-tile / 6 HP-per-second out-of-combat heal and the King are not implemented; only a 10-slot garrison exists. |
| King's Palace | V cost (M effect) | 1200 food + 600 gold, 220 s, 5000 HP, +10 population, 10 garrison, trains Villagers. **M:** no faster Villager production; garrison 10 matches. |
| The White Tower | V cost (M effect) | Same tier, 5000 HP, garrison 15, 8-tile range. **M:** attack modelled as 16 at 1.2 s rather than the documented arrowslit burst; no +75 % workspeed. |
| Berkshire Palace | V cost and HP | 2400 food + 1200 gold, 250 s, 6500 HP, 14.5-tile range (implemented `range = 14848 fp`), attack 20 modelled. |
| Wynguard Palace | V cost (M effect) | Same tier; 5000 HP. **M:** trains Man-at-Arms and Longbowmen directly instead of the four batch options; garrison 10 (research documents 20). |
| Chamber of Commerce | V cost (M effect) | Same tier. **M:** an extra gold drop-off; no free Trader per economic technology, no buy/sell Market behaviour. |
| School of Cavalry | V cost (M effect) | Same tier; trains Royal Knights and Horsemen and hosts the cavalry tier techs. **M:** no +20 % Stable production aura. |
| Royal Institute | V cost (M effect) | Same tier; hosts six Blacksmith techs. **M:** no −30 % research discount and no Age-requirement bypass; the French-unique technologies it should host do not exist in this build. |
| Guild Hall | V cost (M effect) | Same tier. **M:** acts as a four-resource drop-off; the documented resource generation (20 resources per 20 s tick, rising 20/min, cap 200/tick, stone at half) is not implemented. |
| Red Palace | V cost (M range/attack) | Same tier; 10-tile range and garrison 15 both match the research. **M:** attack modelled as a flat 22 at 1.2 s rather than 60 in two bursts at 1.5 s, and garrisoned units add no arbalest. |
| College of Artillery | V cost (M effect) | Same tier. **M:** trains the existing siege engines (gunpowder is out of scope) and has no 50 % speed bonus. |

Landmark costs, build times and HP are all confirmed by both `buildings.md` Table 2 and
`civs.md` §1.4/§2.4; the age-up cost tiers (400/200, 1200/600, 2400/1200 at 190/220/250 s)
are additionally confirmed by `victory.md` §6.3.

### 3.4 Technologies — `docs/research/techs.md`, `docs/research/economy.md`

| Tech | Verdict | Evidence and notes |
|---|---|---|
| forged_blades, tempered_blades, damascus_steel | V (names M) | techs.md §1: Bloomery / Decarbonization / Damascus Steel, 50 food + 125 gold → 100/250 → 150/350, 60 s each, +1 melee attack per tier. Implementation effects, ages and costs match; names differ deliberately (original wording). Scope is `military` only, while research extends attack upgrades to religious units and villagers per the Blacksmith page. |
| hardened_shafts, balanced_bows, platecutter_point | V (names M) | Steeled Arrow / Balanced Projectiles / Platecutter Point: 50 wood + 125 gold → 100/250 → 150/350, 60 s, +1 ranged damage per tier. |
| iron_undermail, fitted_leather, insulated_helm | V costs, M naming | The costs/ages/effects correspond to Fitted Leatherwork (Feudal), Insulated Helm (Castle) and Master Smiths (Imperial), each +1 melee armor at 50/125 → 100/250 → 150/350. The implementation reuses two of those names one tier lower and introduces "Iron Undermail". |
| padded_armor, leather_armor, mail_armor | V costs, M naming | Same shape as the melee line, matching Iron Undermesh (Feudal), Wedge Rivets (Castle) and Angled Surfaces (Imperial), +1 ranged armor each. |
| hardened_spearman | V | techs.md §12: Feudal, 15 food + 35 gold, 15 s. Deltas match units.md Table 4b (80 → 90 HP, attack 7 → 8). **M:** the HP delta is applied with `appliesTo: 'all'`, so it also targets every other unit. |
| veteran_spearman, elite_spearman | V | 100/250 at 60 s (110 HP, 9 attack) and 300/700 at 60 s (140 HP, 11 attack); deltas +20/+30 HP and +1/+2 attack match Table 4b. |
| veteran_archer, elite_archer | V | 100/250 and 300/700 at 60 s; deltas +10/+15 HP and +2/+1 ranged attack match Table 4b. |
| elite_crossbowman | V | 300/700 at 60 s; +15 HP and +3 ranged attack match Table 4b (80 → 95, 11 → 14). |
| veteran_horseman, elite_horseman | V (armor M) | 100/250 and 300/700 at 60 s; HP +30/+25 and attack +2/+2 match Table 4b, but the documented ranged-armor increase (2 → 3 → 5) is not applied. |
| veteran_knight, elite_knight | V values, M ladder | 50 food + 125 gold at 30 s and 300/700 at 60 s, +40 HP and +5 attack each, matching the Royal Knight ladder (190 → 230 → 270, 19 → 24 → 29). **M:** the implementation applies that ladder to the *generic* Knight (research: only the Rus Knight has a 50/125/30 s tier) and adds two rungs where research gives one. Armor 4/4 → 5/5 is not applied. |
| veteran_manatarms, elite_manatarms | V cost for the first, M ladder | The Castle tech matches the "Man-at-Arms" upgrade (50 food + 125 gold, 30 s). **M:** research's Man-at-Arms line ends at Elite (180 HP / 14 attack, armor 5/6); the implementation adds +25 HP/+2 attack twice, reaching 205/16 with armor unchanged. |
| spyglass | M | Research: Stable, Imperial, 100 wood + 50 gold, 45 s, **Scout** sight +30 %. Implementation: Archery Range, Castle, same cost/time, Los +20 % for all `military`. |
| lightweight_beams | M | Research: Siege Workshop, Imperial, 300 wood + 400 gold, 60 s, Rams attack 20 % faster and construct 50 % faster in the field. Implementation: Castle, Speed +15 % for siege — which is the *Greased Axles* effect. |
| greased_axles | V (effect inert) | Castle, 150 wood + 350 gold, 60 s, siege speed +15 % — exactly the research row. The Speed stat is never read by the movement system. |
| adjustable_crossbars | M | Cost matches (1000 wood + 1200 gold, 90 s) but research lists Imperial and the effect "Mangonel +1 range, +1 projectile, +75 % blast radius"; the implementation applies RangedAttack +20 % to all siege. |
| chemistry | M | Cost/time match (200 food + 650 gold, 60 s). Research: gunpowder siege +25 % bonus damage; implementation: all siege +20 % ranged attack. |
| siege_works | V | 300 wood + 600 gold, 90 s, siege engines +20 % hit points. |
| incendiary_arrows | M | Cost/time match (500 wood + 1000 gold, 90 s). Research: non-gunpowder ranged units +20 % ranged damage and a siege attack; implementation: defensive buildings +6 ranged attack. |
| elite_army_tactics | M | Cost/time match (500 food + 1000 gold, 90 s). Research: melee infantry +15 % damage and +15 % hit points; implementation: +20 % melee and ranged attack for all military. |
| court_architects | M | Cost/time match (300 stone + 700 gold, 90 s). Research: buildings +30 % HP; implementation: +20 %. |
| silk_bowstrings | M | Cost/time match (200 wood + 500 gold, 60 s). Research: archers +1 range, mounted archers +0.5; implementation: AttackSpeed +15 % for ranged (and the cached stat is a cooldown multiplier, the opposite direction, and is never read). |
| survival_techniques | V cost (M scope) | Dark, 25 wood + 75 gold, 25 s, +15 %. Research limits it to hunted meat; the implementation applies it to all food. |
| wheelbarrow | V (partly inert) | Dark, 50 wood + 150 gold, 90 s, carry +5, movement +15 %. Carry is applied through a hard-coded tech check in `gather.ts`; the speed half is inert (movement ignores techs). |
| horticulture, fertilization | V | 50 wood + 100 gold at 45 s and 100 wood + 250 gold at 60 s, +10 % food each, chained. |
| forestry | M | Dark, 25 food + 50 gold, 45 s. Research: "trees are chopped down twice as fast"; implementation: +10 % wood gather rate. |
| double_broadaxe, lumber_preservation | V | +15 % wood each at the researched costs and times (45 s / 60 s). |
| crosscut_saw | V cost (M effect) | Imperial, 250 food + 500 gold, 75 s, +15 % wood and +5 carry. The CarryCapacity effect is inert because `carryCapacity()` only checks `wheelbarrow`. |
| specialized_pick | M age | Research: Feudal; implementation: Dark. Cost, time and +15 % gold/stone match. |
| shaft_mining | V | Castle, 100 wood + 250 gold, 60 s, +15 % gold and stone. |
| cupellation | V gold, M stone | Imperial, 250 wood + 500 gold, 75 s, +15 %. The implementation boosts gold only; the in-game tooltip also lists stone. |
| herbal_medicine | M | Castle, 275 gold, 45 s (cost/time match). Research: +60 % healing; implementation: +50 %, and `HealRate` is never read by the religion system. |
| piety | M | Research: Imperial, 325 gold, 45 s, religious units +40 hit points; implementation: Castle, monk Speed +15 %. |
| tithe_barns | M | Research: Imperial, 500 gold, 60 s, relics also give +40 food, +40 wood, +10 stone per minute; implementation: Castle, +5 % food and wood gathering for workers. |

No technology carries a `civ` restriction (all are `civ: 'any'`), so the civilian-specific
availability lists in `techs.md` are not modelled.

### 3.5 Civilizations — `docs/research/civs.md`

| Civ | Trait as implemented | Verdict | Evidence |
|---|---|---|---|
| English | Farms −50 % wood | V | §1.1 Island of Agriculture (75 → 37.5, stored 37). |
| English | Food gather +20 % globally | M | §1.1 Mill influence is 20/25/30/30 % by age, applies only to farms within 2 tiles of a Mill, and is an aura; the implementation flattens it to a global all-food bonus. |
| English | Man-at-Arms train −30 % | M | §1.1 gives +40 % faster (14.65 s vs 20.5 s) and requires the Dark-Age Vanguard Man-at-Arms, which is not implemented. |
| English | Longbowman +2 range, +1 damage | V | §1.2: "+2 range (7 vs 5), +1 damage". The range half is inert in combat (§4). |
| English | Army attack speed +20 % | M | §1.1 Network of Castles is a 12.5-tile aura from Town Centers, Outposts, Stone Wall Towers and Keeps while enemies are near; the implementation is a permanent global modifier (and the stat is unused). |
| English | Missing traits | — | Call to Arms (Dark-Age Man-at-Arms), Defensive Byrig (extra Town Center arrow, villager bow), Network of Citadels, Shipwrights, Keep Production, Kingswood campfire, Enclosures, and all six English unique technologies are absent. |
| French | Drop-off buildings −50 % wood | V | §2.1 Mainland Economy — drop-offs: Mill/Lumber Camp/Mining Camp 25 wood. |
| French | Keep −10 % stone | V | §2.1: 810 stone vs 900. |
| French | Villagers trained 13 % faster | M | §2.1 Mainland Economy — Town Centers work +15/15/20/25 % faster by age; the implementation converts that into a flat −13 % villager train time. |
| French | Economic techs −35 % | V | §2.1 and economy.md §9.4 (35 % since patch 11.1.1201); applied to the 11 economy techs in `FRENCH_ECONOMIC_TECHS`. |
| French | Royal Knight one age early | V | §2.1 Royal Stallions: Feudal availability; `royal_knight.age = Feudal`. |
| French | Arbalétrier | V | §2.2: melee armor 1, +10 vs Heavy. |
| French | Starting wood 200 | M | §2.1 states French starting resources are 200 food / **150 wood** / 100 gold; `startingBonus` is empty, so the implementation uses the shared 200 wood. |
| French | Missing traits | — | Smithy's Grace (free melee techs), Trade Economy resource choice and Trade Post visibility, Dock population, Keep influence −20 % unit cost, Enlistment Incentives, and all eight French unique technologies are absent. |

### 3.6 Victory, economy and AI — `docs/research/victory.md`, `docs/research/economy.md`, `docs/research/ui-camera-ai.md`

| Value | Verdict | Evidence |
|---|---|---|
| Relic gold 80/min | V | victory.md §1.3: 13.33 gold per 10 s = 80/min (current). `constants.ts` still exports an unused `RELIC_GOLD_PER_MINUTE = 60`, which contradicts the live `economy.ts` value. |
| Healing 7 HP/s | V as a constant, M as behaviour | victory.md §1.5: automatic 7 HP/s. The implementation stores 7 but truncates 7/20 to 0 HP per tick (bug). |
| Monk 150 gold / 30 s / 90 HP / 1.12 t/s | V | victory.md §1.5. |
| Sacred site gold 100/min | U (declared, not applied) | victory.md §2.3 gives 100 gold/min; `SACRED_SITE_GOLD_PER_MIN = 100` exists but no code path pays it. |
| Sacred site capture 30 s, Castle Age, religious unit | U in the code | victory.md §2.2 documents all three; the implementation uses any non-worker unit, has no capture timer and no age gate. `SACRED_SITE_CAPTURE_SECONDS = 30` is unused. |
| Sacred victory = all sites for 10 min | U in the code | victory.md §2.4 and §7; implementation uses 3 sites for 5 min (constants). |
| Wonder victory 15 min | U in the code | victory.md §4.2 and §7; implementation uses 10 min. |
| Trader gold formula | M | victory.md §3.2 gives a quadratic `≈ 0.008x² + 0.1x` with map-size and settlement multipliers; the implementation is linear (6 + 2 × tiles). |
| Population 200 cap, over-cap production waits | V | economy.md §7 (200 cap; training continues and the unit appears when space frees). The implementation's wait behaviour matches, but the gate uses the 200 ceiling rather than the house-derived cap. |
| Starting 6 villagers + 1 scout + 5 sheep | V/M | economy.md §8 confirms 6 Villagers, 1 Scout, 5 Sheep. The implementation spawns 6 + 1 and only 4 sheep (`START_SHEEP` unused). |
| Build speed `t = 3/(N+2)` | U in the code | economy.md §5 gives that law; `buildSpeedFactor` implements it but is never called. |
| Repair 25 HP/s for buildings | M | economy.md §6 gives 25 HP/s and a wood cost; the implementation restores 1 HP/tick (20 HP/s) and charges nothing. |
| Three bot difficulties | M | ui-camera-ai.md §7.1 documents **seven** AI levels (Easy → Absurd) with 1.2×/1.5×/2× resource boosts for the top three. `Difficulty` in `constants.ts` has three tiers (Easy, Intermediate, Hard) and no bot code exists yet. |
| Fog of war: 3D line-of-sight volume | M | ui-camera-ai.md §6.2–6.3 gives inner/outer radii and heights; the implementation reveals an integer-radius circle per entity and recomputes every 4 ticks. |

---

## 4. Known deviations from Age of Empires IV

Every item below is a deliberate or discovered difference between this build and the
reference game. Item numbers are stable and are referenced from `docs/PROGRESS.md`.

1. **Torches against buildings are modelled as ordinary melee attacks against a small
   melee armor.** In the reference game melee units (except elephants) throw a torch that
   deals *fire* damage, scaled by Age (10/13/17/21), resisted by fire armor, which only
   Keeps and Keep-type landmarks have (6). This build has no fire damage type: a melee
   attack against a building subtracts the building's `meleeArmor`, which is 0 for almost
   everything, 2 for palisades, 8 for stone walls and 10–11 for the Keep, Wonder and Town
   Center. Reason: one damage channel and one armor subtraction keep the combat resolver
   small and integer-exact; the small armor values exist so that rams and massed infantry do
   not one-shot structures.
2. **Area-effect auras are modelled as global modifiers.** The English Network of Castles
   (+20 % attack speed within 12.5 tiles of Town Centers, Outposts, Stone Wall Towers and
   Keeps while enemies are near) and the English Mill influence (farms within 2 tiles gather
   +20/25/30/30 % by age) are both flattened into permanent civilization-wide modifiers.
   Reason: auras need per-tick spatial queries and stacking rules that the stat cache cannot
   express; the flat version keeps `stats.ts` a pure function of (civ, techs).
3. **The Regular/Veteran/Elite ladder is compressed into technology deltas.** The reference
   game keeps four named tiers per unit line with per-tier armor gains. Here each tier
   technology adds the *difference* between two tiers as flat HP/attack deltas, gated by Age
   and by the previous tier. Consequences: armor never improves with tier; the Man-at-Arms
   and Knight lines gain an extra rung; the Royal Knight ladder is applied to the generic
   Knight; and a tech whose HP delta is declared `appliesTo: 'all'` nominally targets every
   unit. The HP deltas do not reach spawned units at all (deviation 16).
4. **One wall segment occupies one tile.** A wall drag walks a supercover line and places an
   independent 1-tile building per tile. There is no adjacency requirement, no automatic gap
   filler, no "destroying a segment destroys its neighbours", and a gate is just a wall
   segment that the sim never treats specially (`isGate` is unused by every system). Reason:
   the reference's wall-connection rules are a graph over segments; per-tile buildings reuse
   the existing placement and blocking code.
5. **Stealth forests are a terrain flag with a partial consumption path.** Forest tiles are
   impassable and carry `stealth = 1`; `isVisibleTo()` would hide anything standing on a
   stealth tile unless a friendly unit is within one tile. The function is exported but never
   called (the fog system only produces the visible grid and the `Renderer` implementation
   that would consume it does not exist yet), so stealth currently has no gameplay effect.
   When wired, it will also hide buildings and resource nodes, which the reference does not.
6. **Farms are specified as an unlimited food pool but are not functional.** `economy.ts`
   declares `FARM_INFINITE = true` and the Farm has a 6-second build time and 300 HP, but a
   newly built farm entity is created with `amount = 0`; the gather system destroys a node
   whose amount is exhausted, so the first villager to work a farm deletes it. `rebuildFarm`
   (which would set `amount = 350`) is never called from anywhere. Reason: the farm-as-node
   path was designed but never joined up; `farms` are also not limited to one worker.
7. **Three bot difficulties instead of seven AI levels.** `Difficulty` has Easy,
   Intermediate and Hard. The research scale is Easy, Intermediate, Hard, Hardest,
   Ridiculous, Outrageous, Absurd, with 1.2×/1.5×/2× resource boosts for the top three; none
   of that (or any bot code) exists yet. `MatchConfig.disableBots` is stored and never read.
8. **Trade gold uses a simplified linear formula.** Payout is `6 + 2 × (tiles home +
   tiles to the far market)`, computed from straight-line fixed-point distances, versus the
   reference's quadratic distance curve with map-size and settlement multipliers. Traders
   also pick their own partner market when idle, and payout happens on arrival at the far
   end only. Reason: a legible, distance-driven number that cannot overflow and needs no map
   metadata.
9. **Sacred-site victory requires three sites held for five minutes, not all sites for
   ten.** `SACRED_SITE_VICTORY_COUNT = 3` and `SACRED_SITE_VICTORY_TICKS = 6000` (5 min).
   Capture is proximity-based for any non-worker unit with no 30-second progress bar, no
   Castle-Age gate, no monk requirement, no decapitation, no contesting rules and no gold
   income. Reason: a simple majority-holding countdown that cannot stall a match forever on
   a map with four sites.
10. **Wonder victory is ten minutes and starts when the Wonder completes.** The reference
    uses fifteen minutes and starts the timer when construction *begins* (warning all
    enemies). `WONDER_VICTORY_TICKS = 12000`. The Wonder cost is a flat 5000 of each
    resource rather than the map-size-scaled Fandom table; the flat value is the data-dump
    floor, chosen because map-size scaling is not modelled.
11. **Landmark victory semantics are simplified.** The Capital Town Center is not counted
    as a landmark (it is a plain Town Center entity); destroyed landmarks cannot be repaired
    back into the set; there is no team-wide landmark check; and a player with no units and
    no buildings is eliminated regardless of the selected victory condition.
12. **Ranged resistance is stored but never applied.** Battering Ram 95 %, Mangonel 85 %,
    Springald 55 %, Trebuchet 80 % are in the data and read by nothing, so siege engines take
    full ranged damage after subtracting their (zero) ranged armor. Reason: the resistance
    step belongs in the damage pipeline and has not been added.
13. **Charge attacks do not exist.** `chargeBonus` (Knight 12, Royal Knight 10) is stored
    but no system reads it; there is no charge state, reach, cooldown, bracing or the
    documented 2.5-second stun. Reason: charge is an ability with its own animation and
    cancellation rules; the flat-bonus version would misrepresent it.
14. **Minimum range is not enforced.** Mangonel 3 tiles and Trebuchet 2.75 tiles are stored
    in `minRange` and never consulted, so siege engines can fire point-blank.
15. **Population is capped only by the 200 ceiling.** The house-derived `popCap` is computed
    and shown but never gates training; a player on 10/10 can queue indefinitely. Verified in
    a probe: 10 villagers queued at 7/10 population produced pop 17/10.
16. **Several stat-modifier families are inert.** `World.statMod()` is a stub returning 0,
    so `spawnUnit`/`spawnBuilding` and `onBuildingComplete` ignore `hp` modifiers — HP
    technologies and `court_architects` never change a unit or building's hit points (the
    build system does recompute a *site's* HP while it is under construction, so the
    building case works only during construction). The movement system reads
    `UNITS[e.def].speed` directly, so every Speed effect (wheelbarrow, lightweight beams,
    greased axles, piety) is inert. Combat reads `def.range` and `def.attackSpeed` directly,
    so the English Longbowman's +2 range and every AttackSpeed effect are inert. `healRate`
    is never read. This is a single systemic gap, not 20 separate ones: only
    `meleeAttack`, `rangedAttack`, `armor`, `los`, `trainTime` and `cost` flow through
    `effectiveUnit`/`effectiveBuilding` into gameplay.
17. **Construction and repair are simplified.** `BuildingDef.buildTime` is ignored: every
    building costs a flat 16 seconds of villager work per builder, with no diminishing
    returns (`buildSpeedFactor` is unused) and no build-speed technologies. Repair restores
    1 HP/tick (20 HP/s) with no wood cost; healing truncates to 0 HP/tick, so monks cannot
    heal; conversion is an 8-second single-target channel with a 2-second cooldown and no
    relic requirement or area effect.
18. **Resource node pools and carry capacities are scaled down.** The live
    `RESOURCE_SPECS` values are 100 wood per tree, 600 gold per vein, 400 stone, 100–200
    food per animal, versus the researched 150/4000/1200/200–2400. `NODE_AMOUNTS` — which
    matches the research — is dead code. Carry capacity is a flat 10 (+5 with wheelbarrow)
    instead of 10 with 25 for hunted meat and a separate +5 wood from Crosscut Saw.
19. **Technology availability is uniform.** All 48 technologies are `civ: 'any'`, no tech is
    civilization-unique, and no building has a civ restriction beyond units'
    (`isBuildingAvailableTo` is a helper only). `spyglass` is hosted at the Archery Range at
    Castle Age instead of the Stable at Imperial, and blacksmith/armor effects only target
    `military`, so villagers and monks never benefit while the research says they do.
20. **Garrisoning is a flag, not a system.** Units are teleported in and out (`inside`), do
    not walk to the door, do not add attacks while garrisoned, and standard buildings carry a
    garrison capacity of 5 (research: 0) so that villagers can shelter anywhere. The
    `walkableTop` flag for stone walls is likewise stored and never read.
21. **Buildings shoot only at units.** Defensive buildings pick the nearest enemy unit in
    range and fire a single-target projectile; siege engines, buildings under construction
    and buildings are never targeted by towers, and garrisoned units add nothing.
22. **Map generation ignores map type and biome.** `MapGenOptions.mapType` is accepted and
    never read; every match is the same fbm grassland continent with 80/112/144/176/208-tile
    sizes, four sheep per player, 3 gold and 2 stone nodes near each start plus two neutral
    contested veins per player, and 3–6 sacred sites depending on player count.
23. **Start conditions differ slightly.** The French start with 200 wood instead of the
    documented 150; each player gets 4 sheep rather than 5; the starting Town Center is a
    normal Town Center and does not count as a landmark; there is no Nomad mode.
24. **Ability and adjacency content is absent** by design: no Place Palings, Arrow Volley,
    Pavise, royal artillery variants, garrison arrows, wall-top infantry bonuses, siege
    towers ferrying infantry, unit stances (Hold exists as an order but not as a stance
    system), formations (move orders only use a simple square spread), or patrol routes that
    loop.
25. **Naval, gunpowder, elephants and 21 other civilizations** are out of scope (§1): no
    Dock, no ships, no Cannon, no Bombard, no Biology/Serpentine Powder/Roller Shutter
    Triggers/Geometry, no variant civs, no Dominion or Regicide, no campaign.

---

## 5. Architecture

### 5.1 Deterministic fixed-tick simulation

`src/sim/constants.ts` fixes the clock: `TICK_RATE = 20` ticks per second (`TICK_MS = 50`).
`Game.step()` advances exactly one tick; nothing in `src/sim/**` reads wall-clock time
(ESLint forbids `Date`, `Date.now`, `performance.now` and `Math.random` there — see
`eslint.config.js`), and the renderer interpolates between snapshots rather than driving the
simulation. The world is a single mutable object graph (`World`), owned by `Game`, and the
only way to change it is `Game.enqueue(command)` / `Game.apply(command)`. A match is exactly
`(seed, MatchConfig, ordered command list)`: `Game.commandLog` records every accepted
command with the tick it executed on.

### 5.2 Fixed-point integer contract

`src/sim/fixed.ts` defines the arithmetic contract: `FP_SHIFT = 10`, `FP_ONE = 1024`
sub-units per tile, `fp(tiles) = tiles << 10`, `toTiles(v) = v >> 10`, `fpMul`/`fpDiv` using
`Math.trunc` (with `fpDiv` returning 0 on a zero divisor so no `NaN` can enter the state),
`isqrt` as an integer square root, `fpDist`/`fpDist2`, `clamp`, `fpLerp`, `fpNormalize` and
`fpMoveToward`. Angles are 1/256th of a turn in an `Int32Array` sine table built once at
module load with `Math.sin` and then pinned at the four cardinal points; `fpSin`/`fpCos`
(index masked with `& 255`) and the octant-based `angleTo` in `combat.ts` avoid
transcendental calls on the tick path. Every gameplay quantity — positions, speeds, ranges,
line of sight, resource counters, construction progress, gather progress (thousandths),
relic gold (thousandths) — is a plain integer, so accumulation is exact on any engine.

### 5.3 Seeded RNG and state hashing

`src/sim/rng.ts` implements mulberry32 seeded through a splitmix32 finaliser
(`Rng.mix`), all in 32-bit integer arithmetic: `nextUint32`, `nextInt(bound)` with rejection
sampling, `range`, `nextFixedUnit`, `chance(numerator, denominator)`, an in-place Fisher–Yates
`shuffle`, and `getState`/`setState`. `World` owns one `Rng(seed)`; map generation creates its
own `Rng(seed ^ 0x5f3759df)` and derives three noise seeds from it, so the same seed yields the
same continent. **No gameplay system currently draws from the RNG** (`World.rng` is only
hashed), so randomness cannot yet diverge between runs; the generator is in place for combat
scatter, AI choices and map decoration.

`Hasher` is FNV-1a over `int`/`string`/`bool`; `World.hashState()` feeds it, in order: the
tick, the RNG state, then for every alive entity (id, kind, def string, owner, x, y, facing,
hp, construction, amount, order count, the first order's kind, carried amount, production
queue length), then per player (id, age, the four resources, pop, popCap, defeated flag,
tech count). It intentionally omits paths, cooldowns, wind-up, gather progress, queue
contents, tech identities, `sacredHoldTicks`, `wonderAt` and all statistics, so the digest is
a coarse-but-cheap regression check rather than a full state fingerprint.

Reproducibility was verified at this revision:

```
npx tsx scripts/headless-match.ts --seed 42 --ticks 2400 --players 2 --size small --quiet
→ 2400 3017be87   (identical on the second run)
```

### 5.4 Per-tick order of systems

`Game.step()`, in order:

1. **Commands.** Everything queued since the last tick is applied in enqueue order with
   `issued = world.tick`; commands the world refuses (bad owner, defeated player, match over,
   unaffordable, illegal placement) are dropped, accepted ones are appended to `commandLog`.
2. `productionSystem` — training queues tick down and spawn units when ready (blocked at the
   200 ceiling), research ticks down per player in tech-id order, completed techs bump
   `modVersion` and run `applyImmediateTechEffects`, then population is recomputed for every
   player.
3. `movementSystem` — waypoint following, straight-line fallback, A* repath every 12–15 ticks,
   symmetric collision separation in ascending id order, map clamping.
4. `gatherSystem` — extraction, carry limits, drop-off selection, deposit; depleted nodes are
   destroyed and the worker retargets.
5. `buildSystem` — builder counts reset, per-site progress accumulated and applied, completed
   sites get `onBuildingComplete` and their builders are released back to gathering.
6. `repairSystem` — repair orders move the villager into reach and restore 1 HP/tick.
7. `combatSystem` — defensive buildings fire first, then units resolve orders and auto-acquire
   inside 7 tiles, wind-up and cooldown run, projectiles step and resolve (boulders splash),
   deaths are applied through `applyDamage`/`applyDamageTyped`.
8. `religionSystem` — monks heal/convert, monastery relic income, monk relic deposit, sacred
   site ownership and the hold counter.
9. `tradeSystem` — merchants walk their route and are paid on arrival.
10. `advanceAgeOnLandmark` — any finished landmark whose `landmarkAge` is above the owner's
    age promotes the owner immediately.
11. **Bookkeeping** — `world.tick++`, fog of war refreshed every `FOG_UPDATE_INTERVAL = 4`
    ticks for non-defeated players, spatial hash rebuilt.
12. `victorySystem` — elimination, landmark loss, sacred/wonder countdowns, last player
    standing; a result ends the match by setting `Game.over`.

### 5.5 World internals

`World` (`src/sim/world.ts`) owns the `GameMap`, the `Pathfinder`, the `Rng`, the entity
array (indexed by id, holes filled from a free list; `MAX_ENTITIES = 20000` throws when
exceeded), per-player `PlayerState`, and a spatial hash of 4×4-tile cells rebuilt every tick
that `queryRadius` walks in cell-then-id order and sorts by id, so every neighbourhood query
is deterministic. `setBlocking`/`clearBlocking` keep `blockers`, `passable`, `buildingAt` and
`stealth` in sync with the map; `canPlaceBuilding` requires every footprint tile to be
buildable, unblocked and free of a resource node. `spawnUnit`/`spawnBuilding` add hit points
through `statMod` (currently 0, see §4.16) and `onBuildingComplete` registers landmarks.
`recomputePopulation` sums unit `pop` and finished-building `popProvided` and clamps the cap
to 200.

Map generation (`src/sim/map/terrain.ts`) is integer value noise: three octaves of bilinear
hash noise shaped by a Chebyshev falloff, terrain classes Grass/Dirt/Water/Forest/Hill/Rock,
elevation in twentieths of a tile, start positions on a ring with a 16-entry direction table
and a spiral search for clear land, forest clumps with a minimum spacing, gold/stone/berry/
sheep nodes around each start, contested neutral veins, hunts, 3–6 sacred sites and six relic
spots whose tiles are reserved. Pathfinding (`src/sim/map/pathfind.ts`) is A* on the
8-connected grid with a binary heap ordered by `(f, h, tile index)`, a per-call expansion
budget, and a `straightWalkable` fast path.

### 5.6 Headless Node path

The simulation has no DOM or three.js dependency, so it runs in plain Node:

* `scripts/headless-match.ts` builds a `Game` from CLI flags
  (`--seed`, `--ticks`, `--players`, `--size`, `--victory landmarks|sacred|wonder`, `--quiet`),
  runs `runToCompletion(ticks)`, then prints the final tick, the state hash and a per-player
  line (name, civ, age, pop/popCap, resources, live unit and building counts, defeated flag).
  `--quiet` prints exactly `<ticks> <hash>` so two runs can be diffed byte for byte.
* `pnpm sim:headless -- --seed 42 --ticks 6000` is the packaged entry (`tsx`).
* `pnpm test` runs `vitest run` over `tests/unit/**` (no unit tests exist yet;
  `vitest.config.ts` uses the Node environment and the `@sim`/`@render`/`@ui`/`@bots`/`@game`
  aliases).

### 5.7 `window.__game` test surface

**Not implemented at this revision.** A grep across `src/`, `tests/` and `scripts/` finds no
`window.__game`, no `globalThis` assignment and no browser entry point at all (`src/game/` is
empty); there is also no `index.html`, no `src/main.ts` and no `public/` content. The intended
surface — a session object on `window.__game` exposing the snapshot, hash, tick, command
queue and the e2e seams the Playwright tests will drive — is an interface the session layer
must add; the pieces it needs already exist (`Game.snapshot()`, `Game.hash()`,
`Game.enqueue()`, `Game.step()`, `Game.results`, `Game.commandLog`, `Game.fogs`). Until it is
wired, browser-based end-to-end testing is impossible and the only executable path is the
headless Node runner in §5.6. This is tracked as pending work in `docs/PROGRESS.md`.

### 5.8 Snapshot surface

`Game.snapshot()` returns a `StateSnapshot`: tick, over/winner/reason, the victory condition,
one row per player (id, name, civ, team, bot, age + age name, resources, pop/popCap, defeated,
sorted tech ids, landmark count, sacred sites held, `sacredHoldTicks`, `wonderTicks`,
`PlayerStats`, villager counts per resource plus idle), one `EntitySnapshot` per alive entity
(id, kind, def, owner, position, facing, hp/maxHp, construction, amount, carried + carried
type, order kinds, path, goal, hasGoal, relicHeld, inside, builders), per-building production
queues, a flattened global queue and `objectives` (always an empty array — the
`objectives()` helper in `victory.ts` is never called). `src/render/types.ts` and
`src/ui/types.ts` both consume this snapshot and nothing else.

---

## 6. HUD layout

Implementation: `src/ui/hud.ts` (1486 lines, revision `31ec1d5b`, 15:26) with
`src/ui/hud.css`. The DOM is assembled by `buildDom()` and styled by class names; the pixel
values below are read from `src/ui/hud.css`, and the panel contents from the DOM assembly and
`src/ui/types.ts`. The HUD is a pure view: it renders `HudModel` and reports every
interaction through `HudCallbacks`; it never mutates simulation state and takes no
simulation import except the two static definition tables (`UNITS`, `BUILDINGS`) used by the
selection panel. `src/ui/menu.ts` + `menu.css` provide the skirmish lobby (`createMenu(root)`
returning the frozen `Menu` interface), and the renderer modules exist in `src/render/`
(`terrain-mesh.ts`, `models.ts`, `textures.ts`, `minimap.ts`); the `Renderer` implementation
that ties them together and the session that owns `window.__game` are still pending (§5.7).

### 6.1 Panels

| Region (class) | Position as implemented | Contents as implemented |
|---|---|---|
| Top bar — resource block (`aoe-topbar` / `aoe-topleft` / `aoe-respanel`) | Full-width bar pinned to `top: 0; left: 0; right: 0`; resource panel `min-width: 430px` | Four resource cells (food, wood, gold, stone), each with icon, stockpile amount and the number of villagers gathering it (`villagerCounts`), plus a status row with population `current/max` and the age numeral + age name |
| Top bar — right (`aoe-topright`) | Inside the top bar, right-aligned (`margin-left: auto`) | Match clock `m:ss`, an fps readout, a "Scores" toggle button and a compact score bar (`min-width: 178px`) |
| Scoreboard (`aoe-scoreboard`) | Absolute, `top: 92px; right: 12px; width: 392px`, hidden until toggled | Heading plus one row per player: colour dot, name, civ, age, score, pop, defeated marker |
| Objectives (`aoe-objectives`) | Absolute, `top: 96px; left: 12px; width: 306px` | Heading, the active victory condition name, and the objective list (progress bars or binary rows) |
| Selection panel (`aoe-selection`) | In the bottom bar, first grid column `330px` | Portrait medallion, name, type subtitle, HP bar with text, stat rows (for a single selection) — or a grid of up to 24 selectable unit tiles when several units are selected |
| Global production queue (`aoe-globalqueue`) | In the bottom bar, second grid column `236px`, `max-height: 190px` | Heading "Production", one row per queued unit/tech across all buildings (icon, name, progress bar, remaining time, cancel), or "Nothing in production." |
| Bottom bar (`aoe-bottombar`) | Absolute, `left: 0; right: 0; bottom: 0`, grid `330px 236px minmax(300px, 1fr) 244px` | The four lower-bar regions below |
| Control groups (`aoe-groups`) | Bottom bar, centre column (top row) | Ten buttons `0`–`9`; click selects the group, shift+click adds, ctrl/cmd+click assigns; each shows its entity count |
| Per-building queue (`aoe-prodqueue`) | Bottom bar, centre column, hidden unless a single producing building is selected, `max-width: 330px` | Heading "Queue" plus the selected building's queued units/techs with cancel buttons |
| Command card (`aoe-command` / `aoe-command-grid`) | Bottom bar, centre column; grid `repeat(4, 70px) × repeat(3, 70px)` = 280×210 px | A fixed 4×3 grid of 12 buttons (`HUD_GRID_SLOTS = 12`); each shows its hotkey letter, an SVG icon, a label and a cost line. The button list comes from `HudModel.commands`; the HUD renders and never decides |
| Minimap (`aoe-miniwrap` / `aoe-minimap`) | Bottom bar, right column `244px`; canvas CSS size 208×208 px, `tabIndex = 0` | One canvas that the **session** paints every frame via `Renderer.renderMinimap(canvas, snapshot, fog)`; three buttons under it for rotate left `[`, rotate right `]` and recentre `Home` |
| Quick actions (`aoe-actions`) | Bottom bar, right column, beside the minimap | "Idle villager" with a count badge, and "All military" |
| Toast (`aoe-toast`) | Absolute, horizontally centred (`left: 50%`), `top: 21%`, transient | Single-line message shown for 2.5 s |
| Result (`aoe-result`) | Fixed full-screen overlay, centred card | Title, winning player, reason text when the match ends |

Callbacks the HUD emits (all defined in `src/ui/types.ts` and wired in `wireInteractions`):
`onCommand`, `onSelectEntity`, `onIdleVillager`, `onSelectAllMilitary`, `onMinimapClick`,
`onControlGroup`, `onAssignControlGroup`, `onCancelQueue`, `onToggleScoreboard`,
`onCameraKey`. `createHud(root, callbacks)` returns a `HudHandle` extending `Hud`
(`update`, `setVisible`, `toast`, `dispose`) with `getMinimapCanvas()` and
`setWorldSize(widthTiles, heightTiles)`. The minimap click contract: the session sizes the
canvas to the map **in tiles**, and the HUD converts a click to fixed-point world
coordinates (`offset / cssSize × tiles × 1024`, clamped).

Hotkeys are **rendered, never handled**: the session owns key handling, and a command whose
`hotkey` string is empty falls back to the grid letter of its slot
(`GRID_KEYS = Q W E R / A S D F / Z X C V`, row-major, 12 slots).

### 6.2 Hotkey table

Letters on the command card are the implemented grid; the remaining bindings are the
reference defaults from `docs/research/interface-and-match-setup.md` §2 and
`docs/research/ui-camera-ai.md` §2 that the session layer must implement.

| Action | Key(s) | Status |
|---|---|---|
| Command card slot 1–12 | `Q` `W` `E` `R` / `A` `S` `D` `F` / `Z` `X` `C` `V` | Implemented as rendering (`GRID_KEYS`) |
| Villager build-card age tabs | `Q` (I), `W` (II), `E` (III), `R` (IV) | Research (interface §2, ui-camera-ai §1.2) |
| Cancel last production item | `B` | Research (in-game controls screenshot) |
| Cancel all production in selected buildings | `N` | Research |
| Pan camera | Arrow keys, `Alt+W/A/S/D` | Research; the HUD forwards arrows only while the minimap has focus |
| Rotate camera 45° left / right | `[` / `]` | Implemented as minimap buttons and forwarded keys |
| Recentre camera | `Home` (also `Backspace` globally) | Implemented as a minimap button; `Backspace` is a forwarded key |
| Zoom camera | Mouse wheel | Research (renderer) |
| Idle villager (cycle) | `.` (secondary `N`) | Session pending; the HUD exposes an "Idle villager" button with a count |
| Select all idle villagers | `Ctrl+.` | Research |
| Cycle / select idle military | `,` / `Ctrl+,` | Research |
| Cycle Town Centers / focus capital | `H` / `Ctrl+H` | Research |
| Select all military units | `Ctrl+Shift+C` | Session pending; the HUD exposes an "All military" button |
| Select all on screen | `Ctrl+A` | Research |
| Control groups — select / add / assign | `0`–`9` / `Shift+0`–`9` / `Ctrl+0`–`9` | Implemented on the HUD buttons (click / shift+click / ctrl+click) |
| Building-type selects | `F1` (military), `F2` (economic), `F3` (research), `F4` (landmarks/wonders) | Research |
| Attack-move / Stop / Hold | `A` (UNVERIFIED), Stop and Hold have no confirmed key | The orders exist in the command protocol; keys are unverified |
| Shift to queue orders | `Shift` + command | Research |
| Game menu / deselect | `F10` / `Esc` | Research |

---

## 7. Sources

### Research files in this repository

| File | Contents used here |
|---|---|
| `docs/research/units.md` | Tables 1–4: base stats, bonus damage, rate of fire, tier ladder and per-tier HP/attack/armor |
| `docs/research/buildings.md` | Table 1 standard buildings, Table 2 English/French landmarks, conflicts and gaps |
| `docs/research/techs.md` | Blacksmith, University, Barracks, Archery Range, Stable, Siege Workshop, Mill, Lumber Camp, Mining Camp, Market, Monastery and unit-tier technologies |
| `docs/research/economy.md` | Gather rates, node amounts, carry capacity, drop-offs, farms, construction speed, repair, population, starting conditions, economic tech multipliers |
| `docs/research/combat.md` | Damage formula and resolution order, damage types and armor, siege ranged resistance, rate of fire, torch attacks, charge attacks |
| `docs/research/civs.md` | English and French bonuses, unique units, unique technologies, landmarks |
| `docs/research/victory.md` | Relics, sacred sites, trade, wonders, landmark destruction and elimination, ages and the age-up mechanic, mode rules |
| `docs/research/interface-and-match-setup.md` | HUD regions and contents, default hotkeys, camera and selection behaviour, lobby options |
| `docs/research/ui-camera-ai.md` | HUD regions, command-card grid and build cards, minimap, hotkeys, camera values, fog of war and line of sight, AI difficulty ladder |

### Primary sources cited by the research files

* **aoe4world/data** — parsed game-file extraction (Season 13 / patch 16.1.9737):
  `units/`, `buildings/all.json`, `technologies/all-unified.json`, `upgrades/all-unified.json`
  (<https://github.com/aoe4world/data>). Most numeric values in §2 trace here.
* **Age of Empires Wiki (Fandom)** — per-unit, per-building, per-technology pages and the
  pages for Attack, Armor, Resist, Rate of Fire, Line of Sight, Sacred Site, Relic, Trade,
  Victory, Landmark, Influence, Resource and Population.
* **Official Age of Empires IV news and support articles** — "Shortcuts Revealed", the
  Keyboard and Mouse Setup controls list, the Xbox accessibility page, and the Season Four
  patch notes (AI difficulty tiers; `https://www.ageofempires.com/news/`).
* **aoemods/attrib** — engine attribute dumps used for charge-weapon data and farm resource
  extensions (<https://github.com/aoemods/attrib>).

No asset, logo, sound or product name from the reference game is copied into this project;
only factual game statistics are used, and every visual and textual element of Aegis of Ages
is generated in code or written for this project.

## 8. Hardening round — verified behaviour and new deviations (2026-10-08)

This section records what the acceptance suite proved about the live build, and the deviations
that were introduced or made explicit while fixing the bugs it found. It supersedes anything
above that contradicts it.

### 8.1 Verified by running, not by reading

* **Determinism.** Same seed and command stream produce the same FNV-1a state digest, in Node
  (`tests/unit/match.test.ts`) and in the browser (`tests/e2e/02-gameplay.spec.ts`). Two runs at
  seed 555 matched exactly; seed 556 differed.
* **Map guarantees.** Across 4 map sizes x 2 player counts x 25 seeds, every generated map has
  at least 4 sacred sites, which is what the sacred-site victory needs
  (`SACRED_SITE_VICTORY_COUNT = 3`).
* **Build times.** A building takes `def.buildTime` seconds with one villager, and the
  multi-villager factor is the researched `3 / (N + 2)`: two villagers finish in 75% of the
  time, ten in 25%.
* **Counters.** With equal resources (12 spearmen vs 4 knights; 8 archers vs 3 knights),
  spearmen inflict losses on knights and cavalry kills archers. Verified as an e2e duel.
* **Victory conditions.** All three conditions reach a victory screen with no console errors:
  landmarks (raze every enemy landmark with siege), sacred sites (hold the sites for the
  countdown), wonder (build a Wonder and hold it for the countdown).
* **Performance.** With 200+ units on screen the renderer reports 728 live instances in 23 draw
  calls. The measured frame rate in CI is low because the test browser uses the SwiftShader
  software rasteriser; the hardware-independent evidence is the instance and draw-call count
  plus the renderer's own per-frame CPU cost recorded by the builder (0.68 ms/frame).

### 8.2 Deviations introduced or clarified this round

1. **Torch attacks are implemented (this deviation is now resolved).** Melee attacks against
   structures use the researched per-age torch damage (10/13/17/21 for Dark/Feudal/Castle/
   Imperial) against a building fire armour of 0, or 6 for keep-class buildings. Siege engines
   hit structures directly with their engine damage, and arrows are reduced by the building's
   ranged armour of 50, so archers are as ineffective against masonry as they are in the
   original. Buildings keep a melee armour of 0, matching the research.
2. **Siege ranged resistance is applied before armour, multiplicatively.** Ram 95%, siege tower
   95%, mangonel 85%, trebuchet 80%, springald 55%, matching the researched values.
3. **Only three bot difficulties.** The original exposes seven AI levels. Easy, Intermediate and
   Hard differ in reaction interval, villager target, army size before attacking and whether the
   bot expands or contests sacred sites. No difficulty receives free resources.
4. **Bots are honest about resources.** In the original the top three AI levels receive gathering
   multipliers. Ours never do, which is why prolonged Standard-resource games can become
   economic rather than decisive.
5. **Area auras are global modifiers.** English Mill influence and Network of Castles apply to
   the whole economy/army rather than to buildings and units inside a radius.
6. **Trade gold is linear in distance.** `TRADE_BASE + TRADE_PER_TILE x roundTripTiles` rather
   than the original's quadratic curve, so very long routes underpay.
7. **Landmark loss is sticky.** A player is defeated under the landmark condition when every
   landmark they ever completed has been destroyed. The flag is sticky on purpose: the live list
   of landmarks is empty by the time the last one falls.
8. **Sacred-site victory requires 3 sites held for 5 minutes** (`SACRED_SITE_VICTORY_COUNT`,
   `SACRED_SITE_VICTORY_TICKS`) rather than "all sites for 10 minutes".
9. **Gates are owner-passable, everything else is fully blocking.** In the original most
   buildings leave a passable sliver; ours block their whole footprint. To stop that from
   stranding units, movement has a progress watchdog that releases an unreachable goal and
   repositions a sealed-in unit to a nearby walkable tile (bounded to 12 tiles, so it cannot be
   used to cross the map or climb walls).
10. **Farms are unlimited and never deplete.** They are destroyed, not exhausted, and only one
    villager can work each one.
11. **Unit tiers are technologies.** The Regular/Veteran/Elite ladder is expressed as technology
    deltas, exactly as the original does it: advancing an age alone does not upgrade a unit.
    Each tier technology is restricted to its own unit line (`only`), so Veteran Man-at-Arms
    upgrades men-at-arms and nothing else.
13. **A player who cannot recover is eliminated.** A player with no units and no finished
    building that trains villagers is declared defeated. The original only ends a game by
    annihilation, but without this rule a player reduced to a few houses sits on the map
    forever and the match never resolves.
14. **Map layout is generated by farthest-point sampling.** Starting bases are chosen to
    maximise the distance between them (measured minimum 39/52/66 tiles on tiny/small/medium)
    and sacred sites are placed on contested ground at least 16% of the map width from any
    base (measured 21-70 tiles). A ring-based layout put the bases 14-22 tiles apart and the
    sites in the players' opening line of sight.
15. **The zoom range is 22-44** (a 2.0x span), matching the original's measured 1.89x range,
    rather than the 3.5x the build shipped with.
12. **Wall and gate segments occupy exactly one tile.** The original places walls freeform.

### 8.3 Acceptance-test conventions

The e2e suite starts matches paused (`startPaused`) and advances them with explicit
`step(ticks)` calls. Without this, the animation-frame loop advances the simulation in parallel
with the test and tick-accurate assertions (determinism, gathered amounts) become flaky. Full
match scenarios use the lobby's **Very High** starting preset so a decisive result fits inside
the test budget; bot-vs-bot with standard resources is proven separately in the unit suite.
