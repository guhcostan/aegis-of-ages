## Combat model

> **Status legend —** `VERIFIED`: stated explicitly by the cited source. `INFERRED`: derived by combining cited values. `UNVERIFIED`: not confirmed by any source found. Scope: current retail balance, generic (non-unique) units unless noted. Player-facing unit names follow the in-game UI.

### 1. Damage formula

```
Damage = max(1, (A_base + U_base) × M_base + (A_bonus + U_bonus) × M_bonus − Armor)
```

| Term | Meaning | Status |
| --- | --- | --- |
| `A_base` / `A_bonus` | Attacker's default base attack / its bonus damage vs a matching unit type (0 if no match) | VERIFIED |
| `U_base` / `U_bonus` | Additive upgrades to base / bonus damage (Blacksmith techs, Serpentine Powder, …) | VERIFIED |
| `M_base` / `M_bonus` | Multiplicative (percent) modifiers to base / bonus damage (Elite Army Tactics; Camel Unease debuff) | VERIFIED |
| `Armor` | Target's matching armor: melee armor vs melee damage, ranged armor vs ranged damage, fire armor vs fire damage | VERIFIED |
| `max(1, …)` | Every landed attack removes at least 1 HP regardless of the target's armor | VERIFIED |

Sources: [Armor (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Armor_(Age_of_Empires_IV)), [Attack (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Attack_(Age_of_Empires_IV)).

**Order of operations (VERIFIED).** Additive upgrades are applied *before* multiplicative modifiers. Armor is applied *last* and is purely subtractive — "armor is the last modifier applied to the damage formula". A separate multiplicative **resistance** (siege engines carry 55–95 % ranged resistance) is applied *before* armor: resistance first, then armor is subtracted from the remainder.

- **Is bonus damage reduced by armor? Yes.** AoE4 has no Age of Empires II–style armor classes: "attack bonuses do not interact with separate armor classes, and are affected by standard melee and ranged armor just like base attack damage." Bonus damage is simply added to base damage and the single relevant armor value is subtracted from the sum ([Attack](https://ageofempires.fandom.com/wiki/Attack_(Age_of_Empires_IV))).
- **Minimum damage.** `max(1, …)` is absolute. A 5-damage Archer firing at a Mangonel with 85 % ranged resistance still removes 1 HP per arrow ([Armor](https://ageofempires.fandom.com/wiki/Armor_(Age_of_Empires_IV)), [Mangonel](https://ageofempires.fandom.com/wiki/Mangonel_(Age_of_Empires_IV))).
- **Worked example (VERIFIED).** Elite Man-at-Arms, base 14. With Elite Army Tactics alone (+20 %): 14 × 1.2 = 16.8 → 17. Add three Blacksmith upgrades + Two-Handed Weapons (+5 total) and the result is (14 + 5) × 1.2 = 22.8 → **23**, not 17 + 5 = 22 — the additive +5 is scaled by the ×1.2.
- **Conflict.** A widely-read Steam guide gives `Damage Dealt = Max(1, Base Damage + Bonus Damage − Armor)` ([Steam guide](https://steamcommunity.com/sharedfiles/filedetails/?id=3661824697)). It agrees on flat subtraction and the minimum of 1 but omits the multiplicative modifiers; treat it as a simplification, not a contradiction. Rounding of fractional results (16.8 → 17) is stated only by the wiki — the exact rounding rule is **UNVERIFIED** at engine level.

### 2. Armour classes, damage types, and resistances

Bonuses in AoE4 key off **unit types**, not named armor classes. Armors are keyed to **damage types**.

| Damage type | Dealt by | Reduced by | Notes |
| --- | --- | --- | --- |
| Melee | melee infantry, melee cavalry, non-English Villagers | melee armor | range typically < 1 tile |
| Ranged | most ranged infantry/ranged cavalry, some siege, ships, defensive buildings | ranged armor | all units ≥ 3.5 tiles |
| Siege ("true") | most siege engines, gunpowder ships, some human units | siege armor — **no entity has siege armor > 0** | effectively unreducible |
| Fire | torch attacks (most melee units and Villagers vs buildings/ships), Manjaniq incendiary, some techs | fire armor | only Keeps and Keep-type landmarks have fire armor by default |

Unit types that carry attack bonuses: heavy, light melee infantry, light infantry, light gunpowder infantry, ranged, melee, cavalry, siege, gunpowder, camels, elephants, ships, **buildings**, **walls**. A type is explicit, not inherited: the Condottiero has `infantry_light` + `melee_infantry` but **not** `light_melee_infantry`, so it takes no anti-archer bonus. "Heavy" is the closest thing to an armor class — rule of thumb, heavy infantry/cavalry sit at 2/3/4/(5–6) melee and ranged armor per upgrade level, elite infantry at 6 ranged armor.
Sources: [Unit type (AoE4)](https://ageofempires.fandom.com/wiki/Unit_type_(Age_of_Empires_IV)), [Armor](https://ageofempires.fandom.com/wiki/Armor_(Age_of_Empires_IV)), [Resist](https://ageofempires.fandom.com/wiki/Resist).

**Resistance vs armor (VERIFIED).** Armor is additive and integral; resistance is multiplicative and percentage-based. Resistance applies to the *attack multipliers* and therefore lands before armor. Since update 12.0.1974 all siege engines use ranged **resistance** instead of ranged armor (Mangonel 85 %, Trebuchet 80 %, Springald 55 %, Battering Ram 95 %); Battering Rams also take **+20 %** melee damage ([Resist](https://ageofempires.fandom.com/wiki/Resist), [Mangonel](https://ageofempires.fandom.com/wiki/Mangonel_(Age_of_Empires_IV))).

### 3. Counter matrix

Bonus damage by attacker, generic units, Regular → Elite (the wiki lists four upgrade tiers for the Spearman: +17/+20/+23/+28).

| Attacker | vs Cavalry | vs Ranged | vs Melee inf. | vs Heavy | vs Siege | vs Buildings |
| --- | --- | --- | --- | --- | --- | --- |
| Spearman | **+17/+20/+23/+28** | — | — | — | — | torch (10/13/17/21) |
| Archer | — | — | **+5/+7/+8** (light melee inf. only) | — | — | torch |
| Horseman | — | **+8/+9/+11/+13** | — | — | **+8/+9/+11/+13** | torch |
| Crossbowman | — | — | — | **+10/+12** | — | torch |
| Man-at-Arms | — | — | — | +6 (HRE *Heavy Maces* only) | — | torch |
| Lancer / Knight | — | — | — | — (+5, HoL *Collar of Esses*) | — | torch |
| Mangonel | — | **+10 ×3** | — | — | — | **+30 ×3** |
| Springald | — | — | **+12** (melee inf.) | — | — | — |
| Counterweight Trebuchet | — | — | — | — | — | **+350** |
| Battering Ram | — | — | — | — | — | +300 vs **Walls** only (200 base) |
| Handcannoneer | — | — | +5 (needs *Serpentine Powder*) | — | — | — |

"Cavalry" bonuses are separate from the elephant type: Spearman also gets +3/+4/+5/+6 vs elephants and +20/+24/+28/+34 vs the Worker Elephant.
Source: [Unit type (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Unit_type_(Age_of_Empires_IV)); base stats from the per-unit pages [Spearman](https://ageofempires.fandom.com/wiki/Spearman_(Age_of_Empires_IV)), [Archer](https://ageofempires.fandom.com/wiki/Archer_(Age_of_Empires_IV)), [Horseman](https://ageofempires.fandom.com/wiki/Horseman), [Crossbowman](https://ageofempires.fandom.com/wiki/Crossbowman_(Age_of_Empires_IV)), [Man-at-Arms](https://ageofempires.fandom.com/wiki/Man-at-Arms_(Age_of_Empires_IV)), [Lancer](https://ageofempires.fandom.com/wiki/Lancer_(Age_of_Empires_IV)).

### 4. The rock-paper-scissors core

| Interaction | Why it works | Status |
| --- | --- | --- |
| **Spearman → Cavalry** | +17…+28 vs the cavalry type on a 7/8/9/11 melee base. Bracing also cancels a cavalry charge and **stuns the cavalry for 2.5 s** (must be stationary/attacking and not hit from behind) | VERIFIED |
| **Cavalry → Archer** | Horseman: +8…+13 vs the ranged type, 1.875 tiles/s. Lancer/Knight: 19/24/29 base plus a charge attack; the in-game Art of War tutorial states archers "stand no chance against quick and mobile cavalry" | VERIFIED |
| **Archer → Spearman** | +5/+7/+8 vs light melee infantry, which includes the Spearman, whose melee **and** ranged armor is **0** | VERIFIED |
| Crossbowman → Heavy (Man-at-Arms, Lancer) | +10/+12 vs heavy; the game's tutorial names Crossbowmen as the answer to Knights and Men-at-arms | VERIFIED |
| Man-at-Arms → light melee infantry | Not bonus-driven: 2–5 melee / 3–6 ranged armor versus the Spearman's 0/0, plus 8–14 base damage | INFERRED |
| Mangonel → massed ranged | 10 siege damage × 3 projectiles, +10 vs ranged, 0.5-tile AoE per projectile | VERIFIED |
| Melee cavalry → Siege | Horseman +8…+13 vs siege; siege engines carry 0 melee armor | VERIFIED |
| Springald → melee infantry | +12 vs melee infantry, 15 base, bolt pierces multiple units (pass-through damage) | VERIFIED |
| Archer → Siege | **Fails.** Mangonel has 85 % ranged resistance, so arrows deal the 1-damage floor | VERIFIED |

Sources: [Basic Combat](https://ageofempires.fandom.com/wiki/Basic_Combat), [Advanced Combat](https://ageofempires.fandom.com/wiki/Advanced_Combat) (Art of War tutorial text), [Attack (AoE4)](https://ageofempires.fandom.com/wiki/Attack_(Age_of_Empires_IV)), [Springald](https://ageofempires.fandom.com/wiki/Springald).

**Where each piece fits.**
- **Crossbowman** — Castle Age light ranged infantry, 80 → 95 HP, 11 → 14 ranged damage, 2.125 s RoF, 5 tiles. It is the anti-heavy specialist; countered by Horsemen, Javelin Throwers, Mangonels and cost-effectively by Archers.
- **Man-at-Arms** — heavy melee infantry, 100–180 HP, 8–14 melee damage, 1.375 s RoF (fastest common melee), 2–5 melee / 3–6 ranged armor. It holds the line and beats lighter melee, but its armor is exactly what Crossbowmen and Handcannoneers (38 ranged damage) are built to defeat.
- **Siege** — split by role: Battering Ram (buildings/walls only), Springald (anti-melee-infantry), Mangonel/Nest of Bees (anti-mass), Trebuchet (long-range building destruction), Bombard/Culverin/Cannon (Imperial gunpowder). All are fragile to melee cavalry and resistant to ranged fire.

### 5. Splash damage: Mangonel and Trebuchet

| Engine | Projectiles / area | Damage | RoF | Status |
| --- | --- | --- | --- | --- |
| Mangonel | 3 projectiles scattered in a 0.5-tile circle; each projectile 0.5-tile AoE, **no damage falloff** | 10 siege ×3; +30 ×3 vs buildings/ships; +10 ×3 vs ranged | 6.875 s | VERIFIED |
| Nest of Bees (Chinese) | 7 rockets in a 1.25-tile circle; each 1-tile AoE with **30 % and 60 % falloff** at increasing distance | 6 ×7; +4 vs ships; +2 vs ranged | 6.5 s | VERIFIED |
| Counterweight Trebuchet | Base projectile has only a very small AoE radius with full damage scaling — effectively single-target. True splash needs the English *Shattering Projectiles* tech | 40 siege; +350 vs buildings; +200 vs ships | 11.375 s | VERIFIED |
| Traction Trebuchet (Mongols/GH/Jin) | Splash only with the *Pili Pao* tech | 40 siege; +190 vs buildings; +200 vs ships | 8.625 s | VERIFIED |

- AoE shapes in the Essence Engine are circles, circle **sectors**, or rectangles; most AoE **tapers in several steps** from impact to edge, and taper distances and ratios are tuned independently per attack ([Area of Effect](https://ageofempires.fandom.com/wiki/Area_of_Effect)).
- **No friendly fire**: "In Age of Empires IV, no units deal friendly fire damage" ([Area of Effect](https://ageofempires.fandom.com/wiki/Area_of_Effect)) — unlike AoE2. **Counterplay**: the Mangonel only partially tracks moving targets (0.75 tiles/s), has a 3-tile minimum range, and cannot cut trees.
- **Conflict inside one source.** The Mangonel wiki page is internally inconsistent about the blast radius: the prose and the changelog say 0.5 tiles per projectile after update 12.0.1974, while the infobox still lists `SAOE = 0.875`. Both figures are given here; which field is authoritative is **UNVERIFIED**.

Source: [Mangonel](https://ageofempires.fandom.com/wiki/Mangonel_(Age_of_Empires_IV)), [Nest of Bees](https://ageofempires.fandom.com/wiki/Nest_of_Bees), [Counterweight Trebuchet](https://ageofempires.fandom.com/wiki/Counterweight_Trebuchet), [Traction Trebuchet](https://ageofempires.fandom.com/wiki/Traction_Trebuchet_(Age_of_Empires_IV)).

### 6. Attack speed, wind-up, and charge behaviour

The UI label "Attack Speed" is misleading — the stored value is the **attack duration in seconds** (a lower number is faster). Total duration is the sum of five components:

| Component | Role |
| --- | --- |
| Aim Time | Time to aim between reload and fire; may vary with distance, though no unit currently uses that |
| **Wind-up Time** | Time for the weapon to wind up *before* the firing calculation |
| Wind-down Time | Time to recover *after* the firing calculation (e.g. ducking after firing) |
| Reload / Cooldown Time | Ranged: reload. Melee: cooldown. Interval after an attack completes |
| Attack Time | Duration of the attack itself; ≈ 0.125 s for almost every unit (burst-fire units like Zhuge Nu and Ribauldequin are the exception) |

Every component is a multiple of **0.125 s**, the minimum engine tick. Source: [Rate of Fire](https://ageofempires.fandom.com/wiki/Rate_of_Fire).

| Unit | Base RoF (s) | Unit | Base RoF (s) |
| --- | --- | --- | --- |
| Man-at-Arms | 1.375 | Spearman | 1.875 |
| Lancer / Knight | 1.500 | Crossbowman / Handcannoneer | 2.125 |
| Archer | 1.625 | Torch attack (all torch throwers) | 2.125 |
| Horseman | 1.750 | Mangonel | 6.875 |

Fastest base RoF in the game is the Mangudai at 0.875 s (Onna-Bugeisha 0.9 s); slowest is the Huihui Pao at 13.625 s.

- **Wind-up evidence.** The Mangonel was retuned from a 0.5 s aim time + 2.25 s wind-down to **0.25 s aim + 2.5 s wind-down**, giving the same total rate of fire but a more responsive shot — a direct demonstration that aim/wind-up/wind-down are separate tuned parameters ([Mangonel](https://ageofempires.fandom.com/wiki/Mangonel_(Age_of_Empires_IV))).
- **Buff math is non-obvious.** Attack-speed buffs only reduce **wind-up, wind-down and reload**; aim time and attack time are untouched, and wind-up/wind-down are re-rounded to 0.125 s before summing. Consequence: English *Network of Castles* advertises +20 % but delivers roughly +15 % to +23 % depending on unit, and *Network of Citadels* (+10 %) gives the Man-at-Arms **no** improvement at all because its cooldown is already 0 ([Rate of Fire](https://ageofempires.fandom.com/wiki/Rate_of_Fire)). Model this as a per-component modifier, not a multiplier on the total.
- **Charge attacks.** Melee infantry and cavalry charge when the target enters a trigger distance; the charge mainly raises speed (≈ +6 % for Horsemen up to ≈ +29 % for Men-at-Arms) and plays a unique animation. Heavy cavalry and some unique units also add charge damage. Charges have a minimum range and a short cooldown, so they can be repeated by disengaging. Bracing Spearmen or Longbowman *Place Palings* cancel the charge and stun the cavalry for 2.5 s ([Attack (AoE4)](https://ageofempires.fandom.com/wiki/Attack_(Age_of_Empires_IV))).

### 7. Unit-vs-building damage

Melee infantry and cavalry do **not** use their melee weapon on buildings. They inherit a separate **torch attack** that deals **fire** damage and is used against buildings, ships, and the Tower of the Sultan. Villagers use the torch against siege engines too; elephants are the exception and use their melee/tusk attack on buildings.

| Age | Standard torch thrower | Gilded torch thrower |
| --- | --- | --- |
| Dark | 10 | 18 |
| Feudal | 13 | 21 |
| Castle | 17 | 25 |
| Imperial | 21 | 28 |

Torch damage scales with **Age**, not with unit upgrade level, and has a base RoF of 2.125 s (4.125 s in the original four campaigns, which are not rebalanced). Fire Lancers and Gilded units deal more than the standard value. Only Keeps and Keep-type landmarks have fire armor by default, so torches usually land undiminished. Ranged units instead use their normal ranged attack on buildings. Sources: [Attack (AoE4)](https://ageofempires.fandom.com/wiki/Attack_(Age_of_Empires_IV)), [Template:4class](https://ageofempires.fandom.com/wiki/Template:4class).

Siege engines use **siege damage** ("true" damage) with very large building bonuses: Battering Ram 200 base +300 vs walls (and it can *only* attack buildings); Counterweight Trebuchet 40 +350; Traction Trebuchet 40 +190; Mangonel 10 ×3 +30 ×3; Bombard +375 vs buildings. Trebuchets *can* be ordered onto units but are documented as "ineffective" against them due to low accuracy; only the Battering Ram is hard-restricted ([Battering Ram](https://ageofempires.fandom.com/wiki/Battering_Ram_(Age_of_Empires_IV)), [Unit type (AoE4)](https://ageofempires.fandom.com/wiki/Unit_type_(Age_of_Empires_IV))).

**Walls are special.** Damage to one wall section bleeds into adjacent sections even without AoE, and destroying one section destroys its neighbours ([Area of Effect](https://ageofempires.fandom.com/wiki/Area_of_Effect)) — mirror this in a clone or wall-breaking will feel wrong. Buildings are repaired by Villagers; non-human units must be repaired rather than healed.

### 8. Summary of confidence

| Claim | Status |
| --- | --- |
| `max(1, …)` flat-armor formula with additive-before-multiplicative ordering and armor applied last | VERIFIED |
| Bonus damage is *not* exempt from armor (no AoE2-style armor classes) | VERIFIED |
| Resistance is multiplicative and applies before armor | VERIFIED |
| Spearman > Cavalry > Archer > Spearman, with the listed bonus values | VERIFIED |
| Crossbowman is the anti-heavy specialist; Man-at-Arms is a heavy frontline; siege is split by role | VERIFIED |
| Mangonel 3-projectile splash; Trebuchet effectively single-target without *Shattering Projectiles*; no friendly fire | VERIFIED |
| Attack duration = aim + wind-up + wind-down + reload + attack, all 0.125 s multiples | VERIFIED |
| Torch fire damage per Age is the standard unit-vs-building path | VERIFIED |
| Exact engine rounding rule for fractional damage (e.g. 16.8 → 17) | UNVERIFIED |
| Mangonel blast radius 0.5 vs 0.875 tiles (wiki self-contradiction) | UNVERIFIED |
| Per-unit wind-up durations other than the Mangonel's documented 0.25 s aim / 2.5 s wind-down | UNVERIFIED |
| Whether `M_base` applies to bonus damage before or after `U_bonus` in every edge case | UNVERIFIED |
