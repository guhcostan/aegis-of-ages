## Age of Empires IV — Combat Model Reference

Transcription rules used below: every number comes from a linked source; where two sources disagree both readings are shown and the newer one is named; anything not confirmable from a source is tagged **UNVERIFIED**. `VERIFIED` = stated by a cited source; `INFERRED` = arithmetic derived only from cited values. Scope: generic (non-unique) units, current retail balance (Fandom pages as of update 16.1.9737), English variant where a civ-specific stat is quoted. Player-facing names follow the in-game UI ("Lancer/Knight" = the same unit template; "Attack Speed" in the UI is really attack *duration*).

Two classes of source are used and they have different vintage:

| Source class | Examples | Reliability |
|---|---|---|
| Wiki / parsed-stat pages | Fandom AoE4 pages, aoe4world/data JSON (`units/<civ>/<id>.json`) | Live balance. aoe4world/data is parsed from game files and mirrors in-game tooltips |
| Raw engine ATTRIB dumps | aoemods/attrib `weapon/races/**` | Structural truth, **stale magnitudes**: the checked-in snapshot predates update 12.0.1974 (Mangonel 12 damage / 9-tile range, Trebuchet 100 damage, Mangonel 0.5 s aim + 2.25 s wind-down). Use it for damage *types*, component timings, AoE geometry and charge options — not for current damage numbers |

Sources: [Attack (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Attack_(Age_of_Empires_IV)) (wiki side), [aoe4world/data](https://github.com/aoe4world/data) (parsed-stats side), [aoemods/attrib](https://github.com/aoemods/attrib) (raw engine side).

### 1. Damage formula and order of operations

The damage formula, exactly as documented:

```
Damage = max(1, (A_Base + U_Base) * M_Base + (A_Bonus + U_Bonus) * M_Bonus - Armor)
```

| Term | Meaning |
|---|---|
| `A_Base` | attacker's default base attack damage |
| `A_Bonus` | that attack's bonus damage vs the matched unit type (0 if no type matches) |
| `U_Base` / `U_Bonus` | **additive** upgrades to base / bonus damage (Blacksmith techs, Serpentine Powder) |
| `M_Base` / `M_Bonus` | **multiplicative** (percent) modifiers to base / bonus damage (Elite Army Tactics both, Incendiary Arrows base only, Chemistry bonus only, Camel Unease debuff) |
| `Armor` | defender's matching armor: melee armor vs melee damage, ranged armor vs ranged damage, fire armor vs fire damage |
| `max(1, …)` | the floor: any landed attack removes at least 1 HP |

Sources: [Attack (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Attack_(Age_of_Empires_IV)), [Armor (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Armor_(Age_of_Empires_IV)).

Resolution order, outermost last:

| Step | Operation | Kind |
|---|---|---|
| 1 | Add upgrades to base and bonus damage separately (`A + U`) | additive |
| 2 | Apply percent modifiers (`× M`), base and bonus independently | multiplicative |
| 3 | Apply damage **resistance** (percentage, if the defender has one) to the attack multipliers | multiplicative |
| 4 | Subtract the matching **armor** value | subtractive, integral |
| 5 | Clamp to a minimum of 1 | floor |

Sources: [Attack (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Attack_(Age_of_Empires_IV)), [Armor (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Armor_(Age_of_Empires_IV)), [Resist](https://ageofempires.fandom.com/wiki/Resist).

Key consequences, all stated by the sources:

- **Additive upgrades land before multiplicative modifiers**, so a percent tech also scales the flat tech bonuses. Documented example: Elite Man-at-Arms base 14, Elite Army Tactics alone = `14 × 1.2 = 16.8` (rounded to 17); with all three Blacksmith upgrades plus Two-Handed Weapons (+5 total) the result is `(14 + 5) × 1.2 = 22.8` (rounded to 23), **not** `17 + 5 = 22`.
- **Armor is the last modifier applied** and is "subtractive on top of all other bonuses or penalties".
- **Resistance is applied before armor**: with both, incoming damage is first reduced by the percentage, then armor is subtracted from the remainder.
- **Armor works in whole points**, so it is strongest against many small hits and nearly irrelevant against large ones. The wiki's own example: vs a 5-damage Archer, going from 0 to 1 ranged armor is −20% damage, and from 3 to 4 is −50% (double the hits to kill); vs a 38-damage Handcannoneer the same steps are only ~3%.

Sources: [Attack (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Attack_(Age_of_Empires_IV)), [Armor (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Armor_(Age_of_Empires_IV)), [Resist](https://ageofempires.fandom.com/wiki/Resist).

**Is bonus damage reduced by armor? Yes.** AoE4 has no AoE2-style armor classes: "attack bonuses do not interact with separate armor classes, and are affected by standard melee and ranged armor just like base attack damage". Bonus damage is added to base damage and the single relevant armor value is subtracted from the sum. Bracket note from the same source: many bonuses are tuned to be an integer multiple of the base attack (e.g. 2× for Archers vs light melee infantry).

Source: [Attack (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Attack_(Age_of_Empires_IV)).

Worked interactions (INFERRED — arithmetic on the cited values only):

| Attacker → target | Arithmetic | Damage per hit |
|---|---|---|
| Veteran Crossbowman → Regular Man-at-Arms | `(11 + 10) − 4 ranged armor` | 17 |
| Veteran Crossbowman → Regular Knight/Lancer | `(11 + 10) − 4 ranged armor` | 17 |
| Veteran Spearman → Regular Knight/Lancer | `(9 + 23) − 4 melee armor` | 28 |
| Archer → Mangonel | `5 × (1 − 0.85) = 0.75 → floor` | 1 |

Sources: [Crossbowman (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Crossbowman_(Age_of_Empires_IV)), [Man-at-Arms (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Man-at-Arms_(Age_of_Empires_IV)), [Lancer (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Lancer_(Age_of_Empires_IV)), [Spearman (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Spearman_(Age_of_Empires_IV)), [Archer (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Archer_(Age_of_Empires_IV)), [Mangonel (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Mangonel_(Age_of_Empires_IV)).

**Minimum damage rule.** The `max(1, …)` clamp is absolute and is applied after resistance and armor. A 5-damage Archer arrow at an 85 %-ranged-resistance Mangonel removes 1 HP; the same is true for any number of stacked reductions. The wiki contrasts this with resistance: with armor, damage stays pinned at 1 until it exceeds the armor value, whereas with resistance (or negative resistance) damage scales linearly from the first point.

Sources: [Armor (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Armor_(Age_of_Empires_IV)), [Resist](https://ageofempires.fandom.com/wiki/Resist).

### 2. Damage types and the armor that counters them

The engine has four damage types; any single attack deals exactly one of them, but one unit may carry several attacks with different types. Armor values are integers ≥ 0 (no negative armor exists in AoE4). There are four matching armor types, but no entity has siege armor > 0, so there are effectively three.

| Damage type | Dealt by | Reduced by | Notes |
|---|---|---|---|
| **Melee** | melee infantry, melee cavalry, non-English Villagers | melee armor | range typically < 1 tile; used against units only, except elephant tusk attacks which also hit buildings |
| **Ranged** | almost all ranged infantry, all ranged cavalry, some siege (Springald), some ships, defensive buildings | ranged armor | range at least 3.5 tiles for all units; used against units **and** buildings |
| **Siege** ("true" damage) | most siege engines, gunpowder naval units, some human units, some defensive emplacements | siege armor — **no entity has siege armor > 0** | unreducible in practice; the only type used both at ~0.5 tile (Ram) and at long range (Bombard, Trebuchet) |
| **Fire** | torch attacks of all torch-thrower units, Manjaniq incendiary projectile, HKT Hulk after Crusader Fleets, campaign incendiary arrows | fire armor | by default only Keeps and Keep-type landmarks have fire armor (Keep = 6, was 5 before patch 12.1.2454) |

Which armor value the UI shows: human units show melee + ranged armor; buildings and ships show fire + ranged armor; siege engines show melee armor + ranged **resistance**. The third value still exists and is visible in detailed statistics.

Sources: [Attack (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Attack_(Age_of_Empires_IV)), [Armor (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Armor_(Age_of_Empires_IV)), [Keep (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Keep_(Age_of_Empires_IV)).

**Armor vs resistance mechanics.**

| Property | Armor | Resistance |
|---|---|---|
| Mathematics | additive, integer | multiplicative, percentage |
| Effect on small hits | strong (can pin damage at the 1-HP floor) | proportional (linear at every damage value) |
| Effect on large hits | weak | proportional |
| Can be negative | no (AoE4 has no negative armor) | yes (e.g. Battering Ram −20 % melee, i.e. takes +20 % melee damage) |
| Where it is applied | last, after all multipliers | before armor |

Sources: [Armor (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Armor_(Age_of_Empires_IV)), [Resist](https://ageofempires.fandom.com/wiki/Resist).

### 3. Siege engine ranged resistance

Since update 12.0.1974 all siege engines use a percentage ranged **resistance** instead of ranged armor; the values were then retuned in patches 12.0.2246 and 13.1.4420.

| Siege engine | Ranged resistance | Ranged armor | Melee armor | Notes |
|---|---|---|---|---|
| Battering Ram | **95 %** | — (was 50 before 12.0.1974) | 0 | also −20 % melee resistance (takes +20 % melee damage, since patch 9.2.628) |
| Mangonel | **85 %** | — (30 before 12.0.1974) | 0 | 80 % when introduced in 12.0.1974, raised to 85 % in patch 12.0.2246 |
| Nest of Bees | **85 %** | — (30 before 12.0.1974) | 0 | same history as the Mangonel |
| Bombard | **85 %** | — (40 before 12.0.1974) | 0 | — |
| Great Bombard | **85 %** | — (40 before 12.0.1974) | 0 | — |
| Culverin | **85 %** | — | 0 | — |
| Counterweight Trebuchet | **80 %** | — (30 before 12.0.1974) | 0 | — |
| Traction Trebuchet | **80 %** | — (30 before 12.0.1974) | 0 | — |
| Huihui Pao | **80 %** | — (20 before 12.0.1974) | 0 | — |
| Springald | **55 %** | — | 3 | 60 % before patch 13.1.4420 |
| Ribauldequin | **35 %** | — | 10 | lowest of all siege engines |

Sources: [Mangonel (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Mangonel_(Age_of_Empires_IV)), [Nest of Bees](https://ageofempires.fandom.com/wiki/Nest_of_Bees), [Battering Ram (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Battering_Ram_(Age_of_Empires_IV)), [Bombard](https://ageofempires.fandom.com/wiki/Bombard), [Great Bombard (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Great_Bombard_(Age_of_Empires_IV)), [Culverin (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Culverin_(Age_of_Empires_IV)), [Counterweight Trebuchet](https://ageofempires.fandom.com/wiki/Counterweight_Trebuchet), [Traction Trebuchet (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Traction_Trebuchet_(Age_of_Empires_IV)), [Huihui Pao](https://ageofempires.fandom.com/wiki/Huihui_Pao), [Springald](https://ageofempires.fandom.com/wiki/Springald), [Ribauldequin](https://ageofempires.fandom.com/wiki/Ribauldequin), [Resist](https://ageofempires.fandom.com/wiki/Resist).

Practical consequence: all siege engines have 0 melee armor, so melee attacks apply in full; ranged attacks are cut by 35–95 %, which is why low-damage ranged units hit the 1-damage floor. Only the Battering Ram has a melee *vulnerability*.

### 4. Core generic unit combat stats (tier 3 "Regular"/"Veteran" unless noted)

| Unit | Type | HP | Base attack | Melee / ranged armor | Attack rate (s) | Notes |
|---|---|---|---|---|---|---|
| Spearman | light melee infantry | 80 / 90 / 110 / 140 (Regular→Elite) | 7 / 8 / 9 / 11 | 0 / 0 | 1.875 | anti-cavalry; Spearwall brace |
| Archer | light ranged infantry | 70 / 80 / 95 | 5 / 7 / 8 | 0 / 0 | 1.625 | bonus vs light melee infantry |
| Horseman | light melee cavalry | 115 / 125 / 155 / 180 | 8 / 9 / 11 / 13 | 0 / 2 / 2 / 3 / 5 (Early→Elite) | 1.75 | bonus vs ranged and siege |
| Crossbowman | light ranged infantry | 80 / 95 | 11 / 14 | 0 / 0 | 2.125 | bonus vs heavy |
| Man-at-Arms | heavy melee infantry | 100 / 120 / 155 / 180 | 8 / 10 / 12 / 14 | 4 / 4 (Elite 5 / 6) | 1.375 | fastest common melee attack |
| Lancer / Knight | heavy melee cavalry | 190 / 230 / 270 | 19 / 24 / 29 | 4 / 4 (Elite 5 / 5) | 1.5 | charge attack adds damage |

Sources: [Spearman (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Spearman_(Age_of_Empires_IV)), [Archer (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Archer_(Age_of_Empires_IV)), [Horseman](https://ageofempires.fandom.com/wiki/Horseman), [Crossbowman (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Crossbowman_(Age_of_Empires_IV)), [Man-at-Arms (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Man-at-Arms_(Age_of_Empires_IV)), [Lancer (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Lancer_(Age_of_Empires_IV)). Cross-checked against parsed game-file stats: [aoe4world/data units/english](https://github.com/aoe4world/data), e.g. [knight-3.json](https://raw.githubusercontent.com/aoe4world/data/main/units/english/knight-3.json), [man-at-arms-3.json](https://raw.githubusercontent.com/aoe4world/data/main/units/english/man-at-arms-3.json), [spearman-3.json](https://raw.githubusercontent.com/aoe4world/data/main/units/english/spearman-3.json).

### 5. Attack bonuses (which attackers punish which unit types)

Bonuses key off **unit types**, not armor classes, and types are explicit and non-inherited (the Condottiero has `infantry_light` + `melee_infantry` but **not** `light_melee_infantry`, so Archers get no bonus against it). Generic-unit values, tiers as listed by the source:

| Attacker | Target type | Bonus | Tier mapping |
|---|---|---|---|
| Spearman | cavalry | +17 / +20 / +23 / +28 | Regular / Hardened / Veteran / Elite |
| Spearman | elephants | +3 / +4 / +5 / +6 | same tiers (since patch 12.2.3327) |
| Spearman | Worker Elephant | +20 / +24 / +28 / +34 | same tiers |
| Archer | light melee infantry **and** light gunpowder infantry | +5 / +7 / +8 | Regular / Veteran / Elite |
| Horseman | ranged **and** siege | +8 / +9 / +11 / +13 | Early / Regular / Veteran / Elite |
| Crossbowman | heavy | +10 / +12 | Regular / Elite |
| Man-at-Arms | heavy | +6 | HRE only, needs *Heavy Maces* |
| Lancer / Knight | heavy | +5 | House of Lancaster only, needs *Collar of Esses* |
| Handcannoneer | melee infantry | +5 | needs *Serpentine Powder* |
| Springald | melee infantry | +12 | — |
| Springald | ships | +65 | — |
| Mangonel | ranged | +10 ×3 | per projectile |
| Mangonel | buildings / ships | +30 ×3 | see conflict in §11 |
| Nest of Bees | ranged / ships | +2 ×7 / +4 ×7 | see conflict in §11 |
| Counterweight Trebuchet | buildings / ships | +350 / +200 | — |
| Traction Trebuchet | buildings / ships | +190 / +200 | — |
| Battering Ram | walls | +300 (on a 200 siege base) | can only attack buildings |
| Bombard | buildings / ships / infantry / elephants | +375 / +410 / +50 / +50 | — |
| Culverin | buildings / ships / infantry / elephants | +215 / +230 / +50 / +35 | — |
| Great Bombard | buildings / ships / infantry | +400 (+525) / +480 (+580) / +120 (+125) | Early / Regular |

Sources: [Unit type (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Unit_type_(Age_of_Empires_IV)), [Spearman (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Spearman_(Age_of_Empires_IV)), [Archer (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Archer_(Age_of_Empires_IV)), [Horseman](https://ageofempires.fandom.com/wiki/Horseman), [Crossbowman (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Crossbowman_(Age_of_Empires_IV)), [Mangonel (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Mangonel_(Age_of_Empires_IV)), [Springald](https://ageofempires.fandom.com/wiki/Springald), [Counterweight Trebuchet](https://ageofempires.fandom.com/wiki/Counterweight_Trebuchet), [Battering Ram (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Battering_Ram_(Age_of_Empires_IV)), [Bombard](https://ageofempires.fandom.com/wiki/Bombard), [Culverin (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Culverin_(Age_of_Empires_IV)), [Great Bombard (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Great_Bombard_(Age_of_Empires_IV)). Tier values also appear verbatim as `modifiers` in the parsed game data: [spearman-3.json](https://raw.githubusercontent.com/aoe4world/data/main/units/english/spearman-3.json).

### 6. Counter matrix

Values are bonus damage of the attacker (rows) against the defender (columns), generic units, Veteran/Regular tier → Elite tier. `—` = no bonus of that type; `torch` = the melee unit switches to its fire torch attack instead of its melee weapon.

| Attacker ↓ / Defender → | Spearman | Archer | Crossbowman | Man-at-Arms | Knight / Lancer | Horseman | Siege | Buildings | Ships |
|---|---|---|---|---|---|---|---|---|---|
| **Spearman** | — | — | — | — | **+23 → +28** (cavalry) | **+23 → +28** (cavalry) | — | torch (fire) | torch (fire) |
| **Archer** | **+7 → +8** (light melee inf.) | — | — | — | — | — | — (1-dmg floor vs 85 %) | ranged attack | ranged attack |
| **Horseman** | — | **+11 → +13** (ranged) | **+11 → +13** (ranged) | — | — | — | **+11 → +13** (siege) | torch (fire) | torch (fire) |
| **Crossbowman** | — | — | — | **+12** (heavy) | **+12** (heavy) | — | — | ranged attack | ranged attack |
| **Man-at-Arms** | — (wins by armor: 4/4 vs 0/0) | — | — | — | — | — | — | torch (fire) | torch (fire) |
| **Knight / Lancer** | — | — (wins by speed + 24 base) | — | — | — | — | — (wins by melee, siege has 0 melee armor) | torch (fire) | torch (fire) |
| **Springald** | — | — | — | **+12** (melee inf.) | — | — | — | siege attack | **+65** |
| **Mangonel** | — | **+10 ×3** (ranged) | **+10 ×3** (ranged) | — | — | — | — | **+30 ×3** | **+30 ×3** (or +24 ×3) |
| **Counterweight Trebuchet** | — | — | — | — | — | — | — | **+350** | **+200** |
| **Battering Ram** | — | — | — | — | — | — | — | 200 (+300 vs walls) | — |

Sources: [Unit type (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Unit_type_(Age_of_Empires_IV)), [Attack (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Attack_(Age_of_Empires_IV)), [Armor (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Armor_(Age_of_Empires_IV)), [Mangonel (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Mangonel_(Age_of_Empires_IV)), [Springald](https://ageofempires.fandom.com/wiki/Springald), [Crossbowman (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Crossbowman_(Age_of_Empires_IV)), [Battering Ram (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Battering_Ram_(Age_of_Empires_IV)).

Outcome summary for the same pairs (VERIFIED statements + INFERRED arithmetic):

| Pair | Why it resolves that way |
|---|---|
| Spearman → cavalry | +23/+28 on a 9/11 base plus Spearwall bracing, which cancels a cavalry charge and **stuns the cavalry for 2.5 s** (requires the Spearman to be stationary or attacking, and not hit from behind) |
| Cavalry → Archer | Horseman: +11/+13 vs ranged, 1.875 tiles/s; Knight: 24/29 base plus a charge hit. Knight/Lancer also out-armor the Archer's 0 ranged armor |
| Archer → Spearman | +7/+8 vs light melee infantry (Spearman carries `light_melee_infantry`) against 0/0 armor |
| Crossbowman → heavy | +12 vs heavy. The Art of War tutorial states Crossbowmen "make quick work of light infantry and do additional damage to heavy units", and that Knights charge Crossbowmen "unfavorably and quickly cut them down" |
| Man-at-Arms → light melee | not bonus-driven: 4–5 melee armor and 12–14 damage vs the Spearman's 0 melee armor |
| Mangonel → massed ranged | 3 siege projectiles, each +10 vs ranged, 0.5-tile blast each, no falloff |
| Melee cavalry → siege | all siege engines have 0 melee armor and only the Ram resists melee (at −20 %); Horseman adds +11/+13 vs siege |
| Archer → siege | **fails**: 5 × 0.15 = 0.75 → the 1-damage floor |

Sources: [Unit type (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Unit_type_(Age_of_Empires_IV)), [Attack (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Attack_(Age_of_Empires_IV)), [Armor (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Armor_(Age_of_Empires_IV)), [Mangonel (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Mangonel_(Age_of_Empires_IV)), [Springald](https://ageofempires.fandom.com/wiki/Springald), [Spearman (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Spearman_(Age_of_Empires_IV)), [Horseman](https://ageofempires.fandom.com/wiki/Horseman), [Man-at-Arms (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Man-at-Arms_(Age_of_Empires_IV)), [Archer (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Archer_(Age_of_Empires_IV)). The tutorial wording quoted above comes from the Art of War scenarios [Basic Combat](https://ageofempires.fandom.com/wiki/Basic_Combat) (Spearmen "excel at fighting cavalry"; Archers "perform very well against unarmored infantry"; archers "stand no chance against quick and mobile cavalry") and [Advanced Combat](https://ageofempires.fandom.com/wiki/Advanced_Combat).

### 7. Splash damage — Mangonel and Trebuchet

AoE areas in the Essence Engine are circles, circle **sectors** or rectangles, and most AoE damage "tapers off in several steps" from impact to edge, with taper distances and ratios tuned per attack. Units with a very small AoE radius at full damage scaling (the Counterweight Trebuchet) are explicitly *not* treated as splash units — the tiny radius exists so the shot can still hit a single unit that was not perfectly targeted.

| Engine | Projectiles / scatter | Per-projectile AoE | Damage | Attack rate | Building bonus |
|---|---|---|---|---|---|
| Mangonel (and Ayyubid Manjaniq, kinetic) | 3 projectiles scattered over a 0.5-tile circle | 0.5-tile radius, **no damage falloff** | 10 siege ×3 | 6.875 s | +30 ×3 vs buildings and ships |
| Manjaniq (incendiary mode) | 10 projectiles over a 3-tile scatter | 0.9-tile radius, no falloff | 2 **fire** damage | 7 s | +19 vs buildings and ships |
| Nest of Bees | 7 rockets (×8 before update 13.0.4178; +3 rockets with *Additional Barrels*) | 1-tile radius | 6 siege ×7 | 6.5 s | +4 vs ships, +2 ×7 vs ranged |
| Counterweight Trebuchet | single projectile | ~0.1-tile radius at full damage — **effectively single-target** | 40 siege | 11.375 s | +350 |
| Counterweight Trebuchet + English *Shattering Projectiles* | becomes a true AoE attack | — | same damage | 11.375 s | +350 |
| Traction Trebuchet | single projectile; splash only with *Pili Pao* | — | 40 siege | 8.625 s | +190 |

Sources: [Area of Effect](https://ageofempires.fandom.com/wiki/Area_of_Effect), [Mangonel (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Mangonel_(Age_of_Empires_IV)), [Counterweight Trebuchet](https://ageofempires.fandom.com/wiki/Counterweight_Trebuchet), [Nest of Bees](https://ageofempires.fandom.com/wiki/Nest_of_Bees), [Traction Trebuchet (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Traction_Trebuchet_(Age_of_Empires_IV)), [aoe4world/data mangonel-3.json](https://raw.githubusercontent.com/aoe4world/data/main/units/english/mangonel-3.json).
Other mechanics that matter for a clone:

- **No friendly fire.** "In *Age of Empires IV*, no units deal friendly fire damage" — unlike AoE2. See §11 for the conflicting engine flag.
- **Mangonel counterplay**: only partially tracks moving targets (0.75 tiles/s tracking, 1.5 before update 12.0.1974), 3-tile minimum range, and it cannot cut trees.
- **Wall spill-over** is a special case: damaging one wall section damages adjacent sections even without AoE, and destroying one section destroys its neighbours.
- Area damage can also come from terrain modifiers (Byzantine Greek fire): that damage cannot stack from multiple attackers, unlike direct AoE.

Sources: [Area of Effect](https://ageofempires.fandom.com/wiki/Area_of_Effect), [Mangonel (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Mangonel_(Age_of_Empires_IV)), [Counterweight Trebuchet](https://ageofempires.fandom.com/wiki/Counterweight_Trebuchet), [Nest of Bees](https://ageofempires.fandom.com/wiki/Nest_of_Bees), [Traction Trebuchet (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Traction_Trebuchet_(Age_of_Empires_IV)). Engine geometry (circle areas, impact-AoE, friendly-fire flag) in [weapon_mangonel_3.json](https://raw.githubusercontent.com/aoemods/attrib/master/weapon/races/common/ranged/weapon_mangonel_3.json) and [weapon_trebuchet_4_counterweight.json](https://raw.githubusercontent.com/aoemods/attrib/master/weapon/races/common/ranged/weapon_trebuchet_4_counterweight.json).

### 8. Attack wind-up and rate of fire

The UI's "Attack Speed" value is the **attack duration in seconds** (lower = faster): `attack speed = 1 / attack duration`. It is not a single field but the sum of five components, each almost always a multiple of **0.125 s**, the minimum engine tick:

| Component | Role in the cycle |
|---|---|
| **Aim time** | aim at the target between reload and fire; can be distance-varied in the engine, but no unit currently uses that |
| **Wind-up time** | weapon winds up **before** the firing calculation |
| **Attack time** | the attack itself; 0.125 s for almost every unit (burst-fire units like Zhuge Nu and Ribauldequin are the exceptions) |
| **Wind-down time** | recovery **after** the firing calculation (e.g. ducking after firing) |
| **Reload / cooldown time** | ranged units reload, melee units cool down — the wait after an attack completes before the next one begins |

Sources: [Rate of Fire](https://ageofempires.fandom.com/wiki/Rate_of_Fire), [Attack (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Attack_(Age_of_Empires_IV)).

Per-component breakdown from parsed game data (current values; the components sum to the quoted attack rate):

| Unit | Attack | Attack rate (s) | aim | wind-up | attack | wind-down | reload / cooldown |
|---|---|---|---|---|---|---|---|
| Man-at-Arms | Sword (melee) | 1.375 | 0 | 0.5 | 0.125 | 0.75 | 0 |
| Knight / Lancer | Sword (melee) | 1.5 | 0 | 0.5 | 0.125 | 0 | 0.875 |
| Horseman | Spear (melee) | 1.75 | 0 | 0.25 | 0.125 | 0.25 | 1.125 |
| Spearman | Spear (melee) | 1.875 | 0 | 0.25 | 0.125 | 0.75 | 0.75 |
| Archer-type ranged | Bow | 1.625 | 0.25 | 0 | 0.125 | 0.5 | 0.75 |
| Crossbowman | Crossbow | 2.125 | 0.25 | 0 | 0.125 | 0 | 1.75 |
| Springald | Springald | 3.125 | 0.125 | 0.25 | 0.125 | 0.5 | 2.125 |
| Mangonel | Mangonel | 6.875 | 0.25 | 0 | 0.125 | 2.5 | 4 |
| Torch (all torch throwers) | Torch (fire) | 2.125 | 0 | 0.75 | 0.125 | 0 | 1.25 |
| Villager | Bow | 3.375 | 0.5 | 0.25 | 0.125 | 0.5 | 2 (cooldown) |
| Villager | Torch (fire) | 2.125 | 0 | 0.75 | 0.125 | 0 | 1.25 |

Rows above are the AoE4 World parsed `durations` blocks; the Archer-type row is the Veteran Longbowman (generic Archer shares the 1.625 s rate). Sources: [aoe4world/data](https://github.com/aoe4world/data) — [man-at-arms-3.json](https://raw.githubusercontent.com/aoe4world/data/main/units/english/man-at-arms-3.json), [knight-3.json](https://raw.githubusercontent.com/aoe4world/data/main/units/english/knight-3.json), [horseman-3.json](https://raw.githubusercontent.com/aoe4world/data/main/units/english/horseman-3.json), [spearman-3.json](https://raw.githubusercontent.com/aoe4world/data/main/units/english/spearman-3.json), [longbowman-3.json](https://raw.githubusercontent.com/aoe4world/data/main/units/english/longbowman-3.json), [crossbowman-3.json](https://raw.githubusercontent.com/aoe4world/data/main/units/english/crossbowman-3.json), [springald-3.json](https://raw.githubusercontent.com/aoe4world/data/main/units/english/springald-3.json), [mangonel-3.json](https://raw.githubusercontent.com/aoe4world/data/main/units/english/mangonel-3.json), [villager-1.json](https://raw.githubusercontent.com/aoe4world/data/main/units/english/villager-1.json), plus [Rate of Fire](https://ageofempires.fandom.com/wiki/Rate_of_Fire).

Base attack rates by unit line (as listed by the wiki):

| Unit | Attack rate (s) | Unit | Attack rate (s) |
|---|---|---|---|
| Man-at-Arms | 1.375 | Crossbowman / Handcannoneer | 2.125 |
| Lancer / Knight | 1.5 | Torch attack (base) | 2.125 |
| Archer | 1.625 | Springald | 3.125 |
| Horseman | 1.75 | Battering Ram | 5.12 |
| Spearman | 1.875 | Bombard | 5.375 |
| Nest of Bees | 6.5 | Mangonel | 6.875 |
| Culverin | 3.625 | Ribauldequin | 5.25 |
| Traction Trebuchet | 8.625 | Counterweight Trebuchet | 11.375 |
| Huihui Pao (slowest in the game) | 13.625 | Mangudai (fastest, for scale) | 0.875 |

Sources: [Rate of Fire](https://ageofempires.fandom.com/wiki/Rate_of_Fire), [Springald](https://ageofempires.fandom.com/wiki/Springald), [Battering Ram (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Battering_Ram_(Age_of_Empires_IV)), [Bombard](https://ageofempires.fandom.com/wiki/Bombard), [Nest of Bees](https://ageofempires.fandom.com/wiki/Nest_of_Bees), [Culverin (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Culverin_(Age_of_Empires_IV)), [Huihui Pao](https://ageofempires.fandom.com/wiki/Huihui_Pao).

**Attack-speed buffs are per-component, not a multiplier on the total.** Only wind-up, wind-down and reload/cooldown are reduced; aim time and attack time are untouched, and the reduced wind-up/wind-down are re-rounded to multiples of 0.125 s *before* being summed. Consequences documented by the wiki:

- English *Network of Castles* advertises +20 % but yields roughly +15 % (Ribauldequin) to ~23 % (Man-at-Arms) in real terms.
- *Network of Citadels* (+10 % more) gives the Man-at-Arms **no** improvement at all, because its cooldown is already 0.
- The Ribauldequin benefits least because 1 s of its cycle is firing time, which is not affected.
- Composite Bows and the Khan Attack Speed Arrow both take the Archer from 1.625 s to 1.25 s; the tooltips say 33 % and 50 % respectively, and the wiki states 50 % is the correct figure (33 % conflates duration with speed).

Source: [Rate of Fire](https://ageofempires.fandom.com/wiki/Rate_of_Fire).

### 9. Torch (fire) attack against buildings, ships and siege

Melee infantry and cavalry do not use their melee weapon on buildings: units with the `torch_thrower` type have a separate **torch attack** used against buildings, ships and the Tower of the Sultan. The torch deals **fire** damage, is reduced by the target's **fire armor**, and its damage scales with **Age**, not with the unit's upgrade level. Villagers instead use the torch against buildings, ships **and all siege engines** (other melee units use their melee attack on siege). Elephants are the exception in the other direction: they attack buildings with their melee/tusk attack and have no torch.

| Age | Standard torch thrower | Gilded torch thrower |
|---|---|---|
| Dark | 10 | 18 |
| Feudal | 13 | 21 |
| Castle | 17 (16 before update 12.0.1974) | 25 (24 before update 12.0.1974) |
| Imperial | 21 (20 before update 12.0.1974) | 28 (29 before update 12.0.1974) |

Sources: [Attack (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Attack_(Age_of_Empires_IV)), [Template:4class](https://ageofempires.fandom.com/wiki/Template:4class).

Additional torch rules:

| Rule | Value / statement |
|---|---|
| Torch attack rate | 2.125 s base; 4.125 s in the original four campaigns (not rebalanced) |
| Exceptions with higher torch damage | Fire Lancers (torch 30 at Castle Age and 34 at Imperial Age, vs the standard 17 / 21) and Gilded units |
| Villager torch | 10 fire damage, attack rate 2.125 s, used vs buildings, ships and siege — and the **Villager's torch damage does not increase with Age** |
| Former villager siege bonus | torch bonus damage vs siege went +10 → +2 with Season Two Update 17718 and was removed in patch 9.2.628 (the source lists these two updates in this order) |
| Fire armor by default | only Keeps and Keep-type landmarks; Keep fire armor = 6 (5 before patch 12.1.2454) |
| Ranged units vs buildings | use their normal ranged attack (ranged damage vs the building's ranged armor, e.g. the Keep's 50), not a torch |

Sources: [Attack (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Attack_(Age_of_Empires_IV)), [Villager (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Villager_(Age_of_Empires_IV)), [Fire Lancer (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Fire_Lancer_(Age_of_Empires_IV)), [Keep (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Keep_(Age_of_Empires_IV)), [Rate of Fire](https://ageofempires.fandom.com/wiki/Rate_of_Fire), [aoe4world/data villager-1.json](https://raw.githubusercontent.com/aoe4world/data/main/units/english/villager-1.json).

Siege engines use **siege damage** with very large building bonuses: Battering Ram 200 (+300 vs walls, buildings only), Counterweight Trebuchet 40 (+350), Traction Trebuchet 40 (+190), Mangonel 10 ×3 (+30 ×3), Bombard 55 (+375), Culverin 40 (+215), Great Bombard 55/70 (+400/+525), Huihui Pao 75 (+600). Trebuchets can be ordered onto units but are documented as "ineffective" against them because of low accuracy; only the Battering Ram is hard-restricted to buildings.

Sources: [Battering Ram (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Battering_Ram_(Age_of_Empires_IV)), [Counterweight Trebuchet](https://ageofempires.fandom.com/wiki/Counterweight_Trebuchet), [Traction Trebuchet (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Traction_Trebuchet_(Age_of_Empires_IV)), [Mangonel (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Mangonel_(Age_of_Empires_IV)), [Bombard](https://ageofempires.fandom.com/wiki/Bombard), [Culverin (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Culverin_(Age_of_Empires_IV)), [Great Bombard (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Great_Bombard_(Age_of_Empires_IV)), [Huihui Pao](https://ageofempires.fandom.com/wiki/Huihui_Pao).

### 10. Charge attacks (heavy cavalry / knights)

Charge attacks are a subset of melee attacks available to melee infantry and cavalry. When the unit is ordered to attack a unit (directly or via attack-move), it charges once the target comes within a certain distance; the charge is cancelled if the target never gets close enough or if the unit is braced.

| Property | Value / behaviour |
|---|---|
| Who gets extra charge **damage** | most heavy cavalry (Knight/Lancer, Royal Knight, Keshik, Iron Pagoda, Cataphract, Camel Lancer, …) plus select units (Ghulam, Hobelar after *Hill Training*, all Knights Templar cavalry, HRE infantry via Age-up options) |
| Who gets only a **speed** bonus | most melee units. Increase ranges from ~6 % for Horsemen (technically ~16 %, but capped by the maximum speed cap) up to ~29 % for Men-at-Arms |
| Knight/Lancer charge damage | +10 (Early) / +12 (Regular) / +14 (Elite) on top of the base attack of 19 / 24 / 29 → charge strike 29 / 36 / 43 melee damage |
| Fire Lancer | +4 charge damage; the charge has an area of effect (patch 14.0.4963 raised it from +2), main melee attack rate 1.625 s |
| After the charge | the unit switches to its standard melee attack |
| Repeatability | charge cooldown is relatively quick; the charge can be repeated by retreating past the charge's minimum range and re-engaging. It can also be used inside the minimum range by targeting a unit standing *behind* the intended target |
| Bracing | Spearmen/unique equivalents negate a cavalry charge by bracing if stationary or attacking and not hit from behind; Longbowmen do the same with *Place Palings*. A successful interruption also **stuns the enemy cavalry for 2.5 s** |
| Visual | charge plays a unique attack animation distinct from the standard melee attack |

Sources: [Attack (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Attack_(Age_of_Empires_IV)), [Lancer (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Lancer_(Age_of_Empires_IV)), [Fire Lancer (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Fire_Lancer_(Age_of_Empires_IV)), [Rate of Fire](https://ageofempires.fandom.com/wiki/Rate_of_Fire).

Engine-level charge weapon data (aoemods/attrib snapshot; magnitudes are stale, structure is current):

| Weapon | Damage type | Damage in snapshot | Charge reach (internal) | Wind-up / wind-down | Cooldown | Charge options |
|---|---|---|---|---|---|---|
| Knight charge (Early, `weapon_knight_2_charge`) | Melee | 29 | 4.15 | 0 / 0 (impact frame 0.375) | 0.4 s | `charge_attack_target_position_offset` 2, `weapon_hit_disabled_duration` 1 |
| Knight charge (Regular, `weapon_knight_3_charge`) | Melee | 36 | 4.15 | 0 / 0 | 0.4 s | same |
| Knight charge (Elite, `weapon_knight_4_charge`) | Melee | 43 | 4.15 | 0 / 0 | 0.4 s | same |
| Horseman charge (`weapon_horseman_3_charge`) | Melee | 11 | 2.15 | 0 / 0 | 1.625 s | same |
| Man-at-Arms charge (`weapon_manatarms_3_charge`) | Melee | 12 | 2.18 | 0.25 / 0.5 | 0.5 s | none |
| Spearman charge (`weapon_spearman_3_charge`) | Melee | 9 | 2.18 | 0.25 / 0.5 | 1 s | none |

Reading the table: the Knight charge weapon's damage already equals base + charge bonus (19+10, 24+12, 29+14), whereas the Man-at-Arms and Spearman charge weapons carry **exactly the same damage as their normal melee weapon** (12 and 9) — engine confirmation that for non-heavy-cavalry units the charge is a speed/animation event, not a damage event. The `charge_attack_target_position_offset` of 2 is a target-position offset applied when the charge begins. Internal ranges are in the engine's 4×-tiles scale (e.g. Knight melee weapon range 1.15 internal = 0.2875 tiles in the parsed dataset), so a charge reach of 4.15 is ≈1.04 tiles — this conversion is **INFERRED**, verified only against the one weapon pair where both values are published.

Sources: [aoemods/attrib](https://github.com/aoemods/attrib) — [weapon_knight_2_charge.json](https://raw.githubusercontent.com/aoemods/attrib/master/weapon/races/common/melee/weapon_knight_2_charge.json), [weapon_knight_3_charge.json](https://raw.githubusercontent.com/aoemods/attrib/master/weapon/races/common/melee/weapon_knight_3_charge.json), [weapon_knight_4_charge.json](https://raw.githubusercontent.com/aoemods/attrib/master/weapon/races/common/melee/weapon_knight_4_charge.json), [weapon_horseman_3_charge.json](https://raw.githubusercontent.com/aoemods/attrib/master/weapon/races/common/melee/weapon_horseman_3_charge.json), [weapon_manatarms_3_charge.json](https://raw.githubusercontent.com/aoemods/attrib/master/weapon/races/common/melee/weapon_manatarms_3_charge.json), [weapon_spearman_3_charge.json](https://raw.githubusercontent.com/aoemods/attrib/master/weapon/races/common/melee/weapon_spearman_3_charge.json); damage cross-check in [knight-3.json](https://raw.githubusercontent.com/aoe4world/data/main/units/english/knight-3.json).

### 11. Conflicts and gaps

| # | Item | Status |
|---|---|---|
| 1 | **Mangonel bonus vs ships**: Mangonel infobox says +30 ×3 (vs buildings *and* ships); the Unit type page's Ship list says +24 ×3 | Conflict, both pages current. The infobox has the changelog history (+24 → +30 in update 12.0.1974, ships added in patch 11009), which suggests the infobox is newer |
| 2 | **Nest of Bees projectile count**: infobox says 6 damage ×7 (×8 before update 13.0.4178); the Unit type page still writes "+4, x8" and "+2 x8" | Conflict; the infobox changelog names update 13.0.4178, so ×7 is newer |
| 3 | **Torch attack rate**: Rate of Fire page and every parsed dataset weapon say 2.125 s; the Man-at-Arms and Lancer infoboxes list a torch rate of 2.00 s | Conflict; the 2.125 s figure is corroborated by two independent sources (wiki text + `weapon_torch` durations 0.75 + 0.125 + 1.25) |
| 4 | **Mangonel blast radius**: prose and changelog say 0.5 tiles per projectile after update 12.0.1974; the infobox `SAOE` field still lists 0.875 | Conflict inside one page — **UNVERIFIED** which field is authoritative |
| 5 | **Friendly fire**: Area of Effect page states flatly that no AoE4 unit deals friendly fire damage; the engine files set `has_friendly_fire = True` for the Mangonel and Counterweight Trebuchet projectiles with `damage_friendly` multipliers of 1 | Conflict. Either a game rule zeroes it at a higher layer or the wiki statement is outdated; **UNVERIFIED** |
| 6 | **Charge trigger distance / minimum range**: documented qualitatively by the Attack page but no numeric value is published; the attrib files expose the charge weapon's reach (4.15 internal) and a target-position offset (2), not the trigger radius | **UNVERIFIED** — do not hard-code a trigger distance |
| 7 | **Rounding of fractional damage**: the wiki shows 16.8 → 17 and 22.8 → 23 but does not state whether the engine rounds half-up, truncates, or keeps fractions internally | **UNVERIFIED** |
| 8 | **Torch age scaling mechanism**: the wiki documents per-Age torch damage 10/13/17/21, but the parsed dataset lists torch damage as a flat 10 on every tier (Villager, Veteran Spearman, Elite Knight, Elite Horseman all show 10) | Conflict in presentation, not necessarily in effect. Treat 10/13/17/21 as player-facing truth; the delivery mechanism (per-Age weapon swap vs. global modifier) is **UNVERIFIED** |
| 9 | **Villager torch**: the Attack page says torch damage scales with Age, but the Villager page states the Villager's torch damage explicitly does *not* increase with Age (flat 10) | Reconcilable only if the Villager is an exception; the wiki does not state it in one place — **UNVERIFIED** whether other exceptions exist |
| 10 | **Do multiple matching type bonuses stack?** Spearmen carry both a `cavalry` bonus (+17…+28) and a separate `elephants` bonus (+3…+6), and elephants are also cavalry. Whether both are added for one elephant hit, or only the specific type applies, is not stated | **UNVERIFIED** — the formula's single `A_Bonus` term cannot distinguish the two readings |
| 11 | **City/unit armor display**: only two of the three effective armor values are shown in the basic UI (units: melee/ranged; buildings and ships: fire/ranged; siege: melee + ranged resistance). Any clone that relies on the UI for data will silently miss fire/siege armor | Documented limitation of the UI, not a conflict |
| 12 | **ATTRIB snapshot vintage**: the aoemods/attrib files checked in today carry pre-update-12.0.1974 magnitudes (Mangonel 12 damage, 9-tile range, 0.5 s aim / 2.25 s wind-down; Counterweight Trebuchet 100 damage; Springald 30 damage) | Use for structure only. Any number copied from them into balance code will be wrong for live AoE4 |
| 13 | **Villager bow attack rate**: the Villager infobox lists 3.75 s (3.25 s for English) for the ranged bow attack; the parsed game data for the English Villager lists 3.375 s with components 0.5 aim + 0.25 wind-up + 0.125 attack + 0.5 wind-down + 2 cooldown | Conflict between two current sources; both readings given, neither confirmed newer |
| 14 | **Not covered / out of scope here**: stance and formation modifiers, emplacement attacks, naval combat, elephant multi-weapon behaviour, elevation/cover multipliers, and civ-unique unit stat lines | Not researched for this document |

Sources for the conflicts above: [Attack (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Attack_(Age_of_Empires_IV)), [Armor (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Armor_(Age_of_Empires_IV)), [Resist](https://ageofempires.fandom.com/wiki/Resist), [Rate of Fire](https://ageofempires.fandom.com/wiki/Rate_of_Fire), [Area of Effect](https://ageofempires.fandom.com/wiki/Area_of_Effect), [Unit type (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Unit_type_(Age_of_Empires_IV)), [Mangonel (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Mangonel_(Age_of_Empires_IV)), [Nest of Bees](https://ageofempires.fandom.com/wiki/Nest_of_Bees), [Man-at-Arms (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Man-at-Arms_(Age_of_Empires_IV)), [Lancer (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Lancer_(Age_of_Empires_IV)), [Villager (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Villager_(Age_of_Empires_IV)), [aoe4world/data](https://github.com/aoe4world/data), [aoemods/attrib weapon_mangonel_3.json](https://raw.githubusercontent.com/aoemods/attrib/master/weapon/races/common/ranged/weapon_mangonel_3.json), [aoemods/attrib weapon_trebuchet_4_counterweight.json](https://raw.githubusercontent.com/aoemods/attrib/master/weapon/races/common/ranged/weapon_trebuchet_4_counterweight.json).
