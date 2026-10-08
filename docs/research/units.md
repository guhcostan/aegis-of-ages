# Age of Empires IV — Unit Stats Reference

Statistics and rules only. Intended as a data source for implementing AoE4-faithful units in the
browser RTS. No history or flavour.

## Scope, sources and conventions

**Unit set.** Villager, Scout, Spearman, Man-at-Arms, Archer, Crossbowman, Horseman, Knight,
Monk, Trader, Battering Ram, Siege Tower, Mangonel, Springald, Counterweight Trebuchet,
Longbowman, Royal Knight, Arbalétrier.

**Source hierarchy.**

1. **Primary — `aoe4world/data`** ([github.com/aoe4world/data](https://github.com/aoe4world/data)):
   JSON parsed directly from the shipped game files and mirroring in-game tooltips. Paths used:
   `units/unified/<unit>.json` (base unit plus per-civilization/age `variations`),
   `upgrades/unified/` and `upgrades/<civ>/` (tier-upgrade technologies),
   `buildings/unified/`, `civilizations/<civ>.json`.
2. **Cross-check — Age of Empires IV Wiki (Fandom)**: per-unit infoboxes, fetched via the
   MediaWiki API. Used to confirm the primary values and to flag drift.
3. **Tie-breaker — `aoemods/attrib`** ([github.com/aoemods/attrib](https://github.com/aoemods/attrib)):
   raw `ebps/`, `sbps/` and `weapon/` attribute dumps.

**Conventions.**

- **Age** uses the game's numbering: I Dark, II Feudal, III Castle, IV Imperial.
- **Cost** is `food/wood/gold/stone` in that order.
- **Range** is in tiles. Melee reach is the weapon's `range.max` and matches the wiki's
  `MRange` (e.g. Horseman 0.375 ≈ wiki 0.38).
- **Speed** and **LOS** are in tiles. LOS is derived as the raw `sight.line` value divided by
  4.5; this divisor reproduces the wiki's published tile figure exactly for the 14 units where
  the wiki states one (Villager 28→6.22, Scout 41→9.11, Spearman/MAA/Archer 36→8,
  Crossbowman 40→8.89, Monk/Ram 30→6.67, Trader 35→7.78, Knight/Horseman 28→6.22,
  Mangonel 52→11.56, Longbowman 44→9.78, Trebuchet 80→17.78).
- **Rate of fire** = seconds between attacks, taken from the weapon's `speed` field. This is
  validated against in-game tooltips: the wiki's Archer `RROF` 1.625 s and Villager torch
  durations match the parsed field, and the parsed `durations` block sums to `speed`
  (Man-at-Arms: windup 0.5 + attack 0.125 + winddown 0.75 = 1.375).
- **"Base"** tier in Table 1 is the *first* tier a typical civilization can field for that unit.
  Civilizations that unlock the unit earlier are footnoted. Tier values themselves are in Table 4.
- **Anti-building torch** is a separate weapon carried by most units: 10 fire damage,
  2.125 s between attacks, 1.25 tiles range. It is not repeated in Table 1.

> Every figure below is one of: (a) read from the primary parsed dataset, (b) confirmed
> identically by the wiki, or (c) explicitly marked `UNVERIFIED` or listed in
> **Conflicts and gaps**. Nothing is interpolated.

---

## Table 1 — Base unit stats

| unit | age | cost (f/w/g/s) | train (s) | HP | melee atk | ranged atk | melee armor | ranged armor | range (tiles) | speed (t/s) | LOS | pop | trained at |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Villager | I | 50/0/0/0 | 20 | 50 | 6 (Knife) | — [b] | 0 | 0 | 0.29 (melee) | 1.125 | 6.22 | 1 | Town Center |
| Scout | I | 65/0/0/0 | 23 | 110 | 1 (Short Sword) | — [c] | 0 | 0 | 0.29 (melee) | 1.625 | 9.11 | 1 | Town Center, Stable |
| Spearman (Regular) | I [a] | 60/20/0/0 | 15 | 80 | 7 (Spear) | — | 0 | 0 | 0.30 (melee) | 1.25 | 8 | 1 | Barracks |
| Man-at-Arms (Regular) | III [d] | 90/0/20/0 | 20.5 [e] | 155 | 12 (Sword) | — | 4 | 4 | 0.30 (melee) | 1.125 | 8 | 1 | Barracks |
| Archer (Regular) | II | 30/50/0/0 | 15 | 70 | — | 5 (Bow) | 0 | 0 | 5 | 1.25 | 8 | 1 | Archery Range |
| Crossbowman (Regular) | III | 80/0/40/0 | 22.5 | 80 | — | 11 (Crossbow) | 0 | 0 | 5 | 1.125 | 8.89 | 1 | Archery Range |
| Horseman (Regular) | II [f] | 100/20/0/0 | 22.5 | 125 | 9 (Spear) | — | 0 | 2 | 0.38 (melee) | 1.875 | 6.22 | 1 | Stable |
| Knight / Lancer (Regular) | III [g] | 140/0/100/0 | 35 | 230 | 24 (Sword) | — | 4 | 4 | 0.29 (melee) | 1.625 | 6.22 | 1 | Stable |
| Monk | III | 0/0/150/0 | 30 | 90 | — | — | 0 | 0 | 1 heal / 4.75 convert | 1.125 [h] | 6.67 | 1 | Monastery |
| Trader | II [i] | 0/60/60/0 | 30 | 90 | — | — | 0 | 0 | — | 1.00 | 7.78 | 1 | Market |
| Battering Ram | II [j] | 0/200/0/0 | 35 [k] | 370 | 200 siege [l] | — | 0 | 0 [m] | 0.54 (melee) | 0.75 | 6.67 | 1 | Siege Workshop, infantry (field) |
| Siege Tower | II | 0/125/0/0 | 30 | 480 | — | — | 0 | 0 [m] | — | 0.8125 | 8 | 1 | Infantry (Siege Engineering) |
| Mangonel | III | 0/400/200/0 | 40 | 130 | — | 10 siege ×3 [n] | 0 | 0 [o] | 8 (min 3) | 0.75 | 11.56 | 3 | Siege Workshop |
| Springald | III | 0/150/100/0 | 20 [p] | 85 | — | 15 | 3 | 0 [q] | 7.5 | 0.875 | 12.44 [r] | 2 | Siege Workshop |
| Counterweight Trebuchet | III | 0/400/150/0 | 30 | 140 | — | 40 siege | 0 | 0 [s] | 16 (min 2.75) | 0.625 | 17.78 | 2 | Siege Workshop |
| Longbowman | II | 40/50/0/0 | 15 | 70 | — | 6 (Longbow) | 0 | 0 | 7 | 1.125 | 9.78 | 1 | Archery Range (English) |
| Royal Knight (Regular) | II | 140/0/100/0 | 35 | 190 | 19 (Sword) | — | 3 | 3 | 0.29 (melee) | 1.625 | 6.22 [r] | 1 | Stable, School of Cavalry (French) |
| Arbalétrier (Regular) | III | 80/0/40/0 | 22.5 [t] | 80 | — | 11 (Crossbow) | 1 | 0 | 5 | 1.125 | 8.89 [r] | 1 | Archery Range (French) |

**Notes.**

- **[a]** Spearman is Age I for all civilizations **except English**, which unlocks it in Age II.
- **[b]** Villagers have no ranged attack by default. **English** and **House of Lancaster**
  villagers use a bow: 5 damage, 3.375 s between attacks, 5 tiles.
- **[c]** The Scout carries the standard anti-building torch (see conventions). Its attack value
  is disputed — see **Conflicts and gaps**.
- **[d]** Man-at-Arms age depends on civilization: **English** Age I (Vanguard), **HRE** Age II
  (Early), all others Age III (Regular). Table 1 shows the Regular tier.
- **[e]** English produce Man-at-Arms **+40 % faster** (20.5 / 1.4 = 14.65 s), a civilization
  bonus. 20.5 s is the value for every other civilization.
- **[f]** Horseman is Age II for most civilizations; **Mongols** and **Golden Horde** get the
  Early Horseman in Age I.
- **[g]** Knight is Age III; **Rus** gets the Early Knight in Age II.
- **[h]** Monk speed drops to 0.9 tiles/s while carrying a Relic.
- **[i]** Trader is Age II; **Sengoku Daimyo** gets it in Age I.
- **[j]** Battering Ram is Age II; **Abbasid Dynasty** and **Ayyubids** get it in Age I.
- **[k]** 35 s from a Siege Workshop; **70 s** when built in the field by infantry
  (requires Siege Engineering).
- **[l]** Battering Ram can only attack buildings.
- **[m]** Ram / Siege Tower carry **95 % ranged resistance** instead of ranged armor.
- **[n]** Mangonel fires **three** projectiles of 10 siege damage each.
- **[o]** Mangonel carries **85 % ranged resistance** instead of ranged armor.
- **[p]** 20 s per the parsed dataset; the wiki states 30 s — see **Conflicts and gaps**.
- **[q]** Springald carries **55 % ranged resistance** instead of ranged armor.
- **[r]** LOS derived from the raw `sight.line` value; not independently published by the wiki
  for this unit.
- **[s]** Trebuchet carries **80 % ranged resistance** instead of ranged armor.
- **[t]** Arbalétrier train time is 22.5 s in the parsed data; the wiki states 23 s.

Sources: [aoe4world/data units JSON](https://github.com/aoe4world/data/tree/main/units) ·
[aoe4world Unit Explorer](https://aoe4world.com/explorer/units) ·
wiki: [Villager](https://ageofempires.fandom.com/wiki/Villager_(Age_of_Empires_IV)) ·
[Scout](https://ageofempires.fandom.com/wiki/Scout_(Age_of_Empires_IV)) ·
[Spearman](https://ageofempires.fandom.com/wiki/Spearman_(Age_of_Empires_IV)) ·
[Man-at-Arms](https://ageofempires.fandom.com/wiki/Man-at-Arms_(Age_of_Empires_IV)) ·
[Archer](https://ageofempires.fandom.com/wiki/Archer_(Age_of_Empires_IV)) ·
[Crossbowman](https://ageofempires.fandom.com/wiki/Crossbowman_(Age_of_Empires_IV)) ·
[Horseman](https://ageofempires.fandom.com/wiki/Horseman) ·
[Lancer/Knight](https://ageofempires.fandom.com/wiki/Lancer_(Age_of_Empires_IV)) ·
[Monk](https://ageofempires.fandom.com/wiki/Monk_(Age_of_Empires_IV)) ·
[Trader](https://ageofempires.fandom.com/wiki/Trader) ·
[Battering Ram](https://ageofempires.fandom.com/wiki/Battering_Ram_(Age_of_Empires_IV)) ·
[Siege Tower](https://ageofempires.fandom.com/wiki/Siege_Tower_(Age_of_Empires_IV)) ·
[Mangonel](https://ageofempires.fandom.com/wiki/Mangonel_(Age_of_Empires_IV)) ·
[Springald](https://ageofempires.fandom.com/wiki/Springald) ·
[Counterweight Trebuchet](https://ageofempires.fandom.com/wiki/Counterweight_Trebuchet) ·
[Longbowman](https://ageofempires.fandom.com/wiki/Longbowman_(Age_of_Empires_IV)) ·
[Royal Knight](https://ageofempires.fandom.com/wiki/Royal_Knight) ·
[Arbalétrier](https://ageofempires.fandom.com/wiki/Arbal%C3%A9trier)

---

## Table 2 — Bonus damage

Bonus damage is **additive** to the base attack of the listed weapon. Values are the Age I/II
(Regular) tier unless a tier list is given. "Tier scaling" shows the value at each successive
tier.

| unit | bonus damage | vs class |
|---|---|---|
| Villager | none | — (torch is fire damage, applies to buildings/siege) |
| Scout | +10 / +10 | Scout; Siege |
| Spearman | +17 (Regular) → +20 (Hardened) → +23 (Veteran) → +28 (Elite) | Cavalry |
| Spearman | +3 → +4 → +5 → +6 | Elephants (war elephant class) |
| Spearman | +20 → +24 → +28 → +34 | Worker Elephant *(parsed data only; wiki states +3 vs elephants generally)* |
| Man-at-Arms | none | — |
| Archer | +5 (Regular) → +7 (Veteran) → +8 (Elite) | Light melee infantry; Light gunpowder infantry |
| Crossbowman | +10 (Regular) → +12 (Elite) | Heavy |
| Horseman | +8 (Early) → +9 (Regular) → +11 (Veteran) → +13 (Elite) | Ranged; Siege |
| Knight / Lancer | +10 (Early) → +12 (Regular) → +14 (Elite) | Charge attack (ability, not a passive weapon modifier) |
| Monk | none | — |
| Trader | none | — |
| Battering Ram | +300 | Walls (on top of its 200 siege damage) |
| Siege Tower | none | — |
| Mangonel | +30 / +30 / +10 | Buildings; Ships (naval unit); Ranged |
| Springald | +12 / +65 | Melee infantry; Ships |
| Counterweight Trebuchet | +350 / +200 | Buildings; Ships |
| Longbowman | +6 (Regular) → +8 (Veteran) → +9 (Elite) | Light melee infantry; Light gunpowder infantry |
| Royal Knight | +10 (Regular) → +12 (Veteran) → +14 (Elite) | Charge attack (ability, not a passive weapon modifier) |
| Arbalétrier | +10 (Regular) → +12 (Elite) | Heavy |

Notes: the Knight/Lancer and Royal Knight charge damage is delivered by the unit's charge
ability, not by a passive modifier on the melee weapon, so it should be modelled as a
conditional bonus rather than a flat one. The Mangonel's "Incendiary" fire profile
(2 fire damage, +19 vs Buildings and Ships) comes from a separate technology and is not part
of the base unit.

Sources: [aoe4world/data units JSON](https://github.com/aoe4world/data/tree/main/units)
(weapon `modifiers` arrays) ·
wiki: [Spearman](https://ageofempires.fandom.com/wiki/Spearman_(Age_of_Empires_IV)) ·
[Horseman](https://ageofempires.fandom.com/wiki/Horseman) ·
[Archer](https://ageofempires.fandom.com/wiki/Archer_(Age_of_Empires_IV)) ·
[Crossbowman](https://ageofempires.fandom.com/wiki/Crossbowman_(Age_of_Empires_IV)) ·
[Springald](https://ageofempires.fandom.com/wiki/Springald) ·
[Mangonel](https://ageofempires.fandom.com/wiki/Mangonel_(Age_of_Empires_IV)) ·
[Battering Ram](https://ageofempires.fandom.com/wiki/Battering_Ram_(Age_of_Empires_IV)) ·
[Royal Knight](https://ageofempires.fandom.com/wiki/Royal_Knight)

---

## Table 3 — Rate of fire

Seconds between attacks. Symmetric across all civilizations except where noted.

| unit | seconds between attacks |
|---|---|
| Villager | 3.875 (Knife) [u]; 2.125 (Torch) |
| Scout | 2.00 (Short Sword); torch [c] |
| Spearman | 1.875 (Spear); 2.125 (Torch) |
| Man-at-Arms | 1.375 (Sword); 2.125 (Torch) |
| Archer | 1.625 (Bow) |
| Crossbowman | 2.125 (Crossbow) |
| Horseman | 1.75 (Spear); 2.125 (Torch) |
| Knight / Lancer | 1.50 (Sword); 2.125 (Torch) |
| Monk | n/a (no attack) |
| Trader | n/a (no attack) |
| Battering Ram | 5.125 |
| Siege Tower | n/a (no attack) |
| Mangonel | 6.875 |
| Springald | 3.125 |
| Counterweight Trebuchet | 11.375 |
| Longbowman | 1.625 (Longbow) |
| Royal Knight | 1.50 (Sword); 2.125 (Torch) |
| Arbalétrier | 2.125 (Crossbow) |

- **[u]** The wiki states 3.75 s for the Villager knife and 3.25 s for the English villager bow;
  the parsed data gives 3.875 s and 3.375 s. The parsed values are the exact sum of the
  weapon's own `durations` block (0.75 + 0.125 + 1 + cooldown 2 = 3.875), so they are used here.
  See **Conflicts and gaps**.
- Torch rate of fire is 2.125 s uniformly in the parsed data. The wiki lists 2.00 s for some
  units (Man-at-Arms, Knight, Royal Knight) and 2.12 s for others (Spearman, Horseman).

Sources: [aoe4world/data units JSON](https://github.com/aoe4world/data/tree/main/units)
(`weapons[].speed`) · wiki:
[Villager](https://ageofempires.fandom.com/wiki/Villager_(Age_of_Empires_IV)) ·
[Archer](https://ageofempires.fandom.com/wiki/Archer_(Age_of_Empires_IV)) ·
[Springald](https://ageofempires.fandom.com/wiki/Springald) ·
[Counterweight Trebuchet](https://ageofempires.fandom.com/wiki/Counterweight_Trebuchet) ·
[Mangonel](https://ageofempires.fandom.com/wiki/Mangonel_(Age_of_Empires_IV))

---

## Table 4 — Upgrade tiers

### 4a. Tier ladder

AoE4 tiers are gated by **Age** *and* by a **technology** researched at the production building.
The technology data (`upgrades/`) confirms the ladder below: each entry is a researchable
upgrade with its own cost and research time, and its description reads
"Upgrade X to <tier> X". Advancing an Age does **not** by itself upgrade existing units or change
what a building produces; the tier technology is what does both. Model each tier as a
technology in the implementation.

| unit | tier 1 | tier 2 | tier 3 | tier 4 |
|---|---|---|---|---|
| Spearman | Regular (I) | Hardened (II) | Veteran (III) | Elite (IV) |
| Horseman | Early (I) | Regular (II) | Veteran (III) | Elite (IV) |
| Man-at-Arms | Vanguard (I) | Early (II) | Regular (III) | Elite (IV) |
| Archer | Regular (II) | Veteran (III) | Elite (IV) | — |
| Crossbowman | Regular (III) | Elite (IV) | — | — |
| Knight / Lancer | Early (II) | Regular (III) | Elite (IV) | — |
| Royal Knight | Regular (II) | Veteran (III) | Elite (IV) | — |
| Longbowman | Regular (II) | Veteran (III) | Elite (IV) | — |
| Arbalétrier | Regular (III) | Elite (IV) | — | — |

Villager, Scout, Monk, Trader, Battering Ram, Siege Tower, Mangonel, Springald and
Counterweight Trebuchet have **no tier upgrades** (Scout has a Malian-only Warrior Scout line —
see 4c).

Source: [aoe4world/data upgrades JSON](https://github.com/aoe4world/data/tree/main/upgrades)

### 4b. HP, attack and armor per tier

Attack is the unit's primary weapon. Armor is shown as melee/ranged where it changes between
tiers; unlisted tiers keep 0/0.

| unit | tier | age | HP | attack | armor (m/r) | upgrade cost (f/w/g/s) | research time |
|---|---|---|---|---|---|---|---|
| Spearman | Regular | I | 80 | 7 | 0/0 | — | — |
| Spearman | Hardened | II | 90 | 8 | 0/0 | 15/0/35/0 | 15 s |
| Spearman | Veteran | III | 110 | 9 | 0/0 | 100/0/250/0 | 60 s |
| Spearman | Elite | IV | 140 | 11 | 0/0 | 300/0/700/0 | 60 s |
| Horseman | Early | I | 115 | 8 | 0/2 | — | — |
| Horseman | Regular | II | 125 | 9 | 0/2 | 15/0/35/0 [v] | 15 s |
| Horseman | Veteran | III | 155 | 11 | 0/3 | 100/0/250/0 | 60 s |
| Horseman | Elite | IV | 180 | 13 | 0/5 | 300/0/700/0 | 60 s |
| Man-at-Arms | Vanguard | I | 100 | 8 | 2/3 | — | — |
| Man-at-Arms | Early | II | 120 | 10 | 3/3 | 15/0/35/0 [w] | 15 s |
| Man-at-Arms | Regular | III | 155 | 12 | 4/4 | 50/0/125/0 [w] | 30 s |
| Man-at-Arms | Elite | IV | 180 | 14 | 5/6 | 300/0/700/0 | 60 s |
| Archer | Regular | II | 70 | 5 | 0/0 | — | — |
| Archer | Veteran | III | 80 | 7 | 0/0 | 100/0/250/0 | 60 s |
| Archer | Elite | IV | 95 | 8 | 0/0 | 300/0/700/0 | 60 s |
| Crossbowman | Regular | III | 80 | 11 | 0/0 | — | — |
| Crossbowman | Elite | IV | 95 | 14 | 0/0 | 300/0/700/0 | 60 s |
| Knight / Lancer | Early | II | 190 | 19 | 3/3 | — | — |
| Knight / Lancer | Regular | III | 230 | 24 | 4/4 | 50/0/125/0 [x] | 30 s |
| Knight / Lancer | Elite | IV | 270 | 29 | 5/5 | 300/0/700/0 | 60 s |
| Royal Knight | Regular | II | 190 | 19 | 3/3 | — | — |
| Royal Knight | Veteran | III | 230 | 24 | 4/4 | 50/0/125/0 | 30 s |
| Royal Knight | Elite | IV | 270 | 29 | 5/5 | 300/0/700/0 | 60 s |
| Longbowman | Regular | II | 70 | 6 | 0/0 | — | — |
| Longbowman | Veteran | III | 80 | 8 | 0/0 | 100/0/250/0 | 60 s |
| Longbowman | Elite | IV | 95 | 9 | 0/0 | 300/0/700/0 | 60 s |
| Arbalétrier | Regular | III | 80 | 11 | 1/0 | — | — |
| Arbalétrier | Elite | IV | 95 | 14 | 2/0 | 300/0/700/0 | 60 s |

- **[v]** The Early→Regular Horseman upgrade exists only for **Mongols** and **Golden Horde**
  (the civilizations that get the Horseman in Age I).
- **[w]** The Vanguard→Early Man-at-Arms upgrade is **English only**; the Early→Regular upgrade
  is available to **English** and **HRE**.
- **[x]** The Early→Regular Knight upgrade is **Rus only**.
- The three Man-at-Arms tiers above table 1's baseline reflect that other civilizations begin at
  the Regular tier directly; they do not need to research the Vanguard or Early upgrades.

Source: [aoe4world/data units + upgrades JSON](https://github.com/aoe4world/data)
(`units/unified/*.json` `variations[].hitpoints`, `weapons[].damage`, `armor[]`;
`upgrades/<civ>/*.json` `costs`) ·
wiki: [Spearman](https://ageofempires.fandom.com/wiki/Spearman_(Age_of_Empires_IV)) ·
[Horseman](https://ageofempires.fandom.com/wiki/Horseman) ·
[Man-at-Arms](https://ageofempires.fandom.com/wiki/Man-at-Arms_(Age_of_Empires_IV)) ·
[Archer](https://ageofempires.fandom.com/wiki/Archer_(Age_of_Empires_IV)) ·
[Crossbowman](https://ageofempires.fandom.com/wiki/Crossbowman_(Age_of_Empires_IV)) ·
[Lancer/Knight](https://ageofempires.fandom.com/wiki/Lancer_(Age_of_Empires_IV)) ·
[Longbowman](https://ageofempires.fandom.com/wiki/Longbowman_(Age_of_Empires_IV)) ·
[Arbalétrier](https://ageofempires.fandom.com/wiki/Arbal%C3%A9trier)

### 4c. Civilization exceptions to the generic tier costs

The generic costs above are the modal value across civilizations. Known deviations, all from
the parsed upgrade data:

| civilization | deviation |
|---|---|
| Delhi Sultanate | Tier upgrades are free (0 resources) but take far longer (e.g. Veteran 300 s vs 60 s; Elite 720 s vs 60 s). |
| Tughlaq Dynasty | Tier upgrades cost 20 % more (e.g. 120/0/300/0 Veteran, 360/0/840/0 Elite) but finish in 5 s. |
| Malians | Warrior Scout line replaces the Scout tier ladder: 15/0/35/0 (15 s) → 50/0/125/0 (30 s) → 300/0/700/0 (60 s). Veteran Archer costs 50/0/125/0 in 30 s. |
| Knights Templar | Unit-specific tiers are cheaper: 200/0/400/0 in 40 s for Elite Hospitaller Knights, Heavy Spearmen and Genoese Crossbowmen. |
| Golden Horde | Units train at roughly 2× the generic time; Elite Spearman upgrade costs 360/0/840/0. *(Train-time doubling observed in parsed costs; not independently confirmed by the wiki — treat as UNVERIFIED.)* |
| English | Man-at-Arms trains +40 % faster (see Table 1 note [e]). |

Source: [aoe4world/data upgrades JSON](https://github.com/aoe4world/data/tree/main/upgrades) ·
[civilizations JSON](https://github.com/aoe4world/data/tree/main/civilizations)

---

## Conflicts and gaps

Values that could not be reduced to a single agreed figure, or that one source does not state.
Each is listed with both readings and a recommendation.

1. **Villager melee rate of fire — 3.875 s vs 3.75 s.**
   Parsed data: 3.875 s (Knife). Wiki infobox: `MROF` 3.75 s. The parsed figure is the exact sum
   of the weapon's own animation durations, so it is preferred; the wiki value is likely stale by
   one attack frame. **Use 3.875 s.** The same disagreement affects the English villager bow
   (3.375 s parsed vs 3.25 s wiki).

2. **Villager ranged attack — 3 vs 5.**
   Wiki `RDamage` = 3. Parsed data has no 3-damage ranged weapon for the Villager; the English /
   House of Lancaster bow is 5 damage, and the wiki's own bonus table lists English villagers at
   "+5 ranged attack". **UNVERIFIED** — prefer 5 for the English bow and treat the generic
   villager as having no ranged attack.

3. **Scout torch attack — 3 vs 10.**
   Wiki lists `RDamage` 3 with `RROF` 1.00 s at 2.88 tiles range, and separately tags the Scout
   as having a torch thrower. The parsed dataset omits any torch weapon for the Scout, while the
   raw attribute dump (`ebps/races/core/units/unit_scout_1.json`) references the standard
   `weapon_torch`, whose base profile is 10 fire damage with a 1.25 s cooldown.
   **UNVERIFIED.** A wiki-only value of 3 conflicts with the standard torch profile.

4. **Springald train time — 20 s vs 30 s.**
   Parsed data (all civilizations): 20 s. Wiki: 30 s from a Siege Workshop, 50 s built by
   infantry. The parsed dataset is generated from the current game files and is the **newer**
   reading; 30 s appears stale. **Use 20 s**, but verify in-game before shipping balance.

5. **Arbalétrier train time — 22.5 s vs 23 s.** Parsed data: 22.5 s. Wiki: 23 s.
   The 0.5 s gap is within rounding of the wiki's display; **use 22.5 s**.

6. **Torch rate of fire — 2.125 s vs 2.00 s.** Parsed data reports 2.125 s for every unit's
   torch. The wiki lists 2.00 s for Man-at-Arms, Knight and Royal Knight, and 2.12 s for
   Spearman and Horseman. **Use 2.125 s** (internally consistent, single value).

7. **Spectre of siege "ranged armor".**
   Siege units do not use a ranged armor value at all; they use a percentage **ranged
   resistance**: Battering Ram 95 %, Siege Tower 95 %, Mangonel 85 %, Counterweight Trebuchet
   80 %, Springald 55 %. Table 1 therefore shows ranged armor 0 with a note. Implement these as
   damage multipliers, not flat armor. This is confirmed by both the parsed `resistance` field
   and the wiki `RangedResistance` field, so it is not a conflict — it is an easy modelling trap.

8. **Springald LOS.** The parsed raw value is `sight.line` 56, giving 12.44 tiles by the
   validated /4.5 conversion, but the wiki does not publish a LOS figure for the Springald, so
   the tile value is **derived, not independently confirmed**.

9. **Royal Knight and Arbalétrier LOS.** Same situation as the Springald (derived 6.22 and 8.89
   tiles respectively; the wiki omits LOS for both).

10. **Elephant bonus for the Spearman.** Parsed data gives two separate elephant modifiers
    (+3 vs war elephant, +20 vs worker elephant at Regular) while the wiki summarises
    "+3 vs elephants". **UNVERIFIED** which mapping the game UI presents.

11. **Spearman "12 Spear" melee damage.** The wiki's Villager entry lists a 12-damage spear
    alongside the 6-damage knife. The parsed dataset has no such weapon on the Villager; the
    spear is the boar-hunting weapon. Treated as a non-combat stat and omitted from Table 1.

12. **Golden Horde 2× train times.** Observed consistently in the parsed data but not confirmed
    by a second source. **UNVERIFIED.**

13. **Tier-technology interaction with Age advancement.** The upgrade data establishes that each
    tier is a researchable technology that both upgrades existing units and unlocks the higher
    tier in production. The claim that a building keeps producing the old tier until the
    technology is researched is a **derived implementation rule**, inferred from the tier gating
    and the upgrade descriptions — no source states it in those words. Verify against the live
    game before relying on it.

14. **Not covered here.** Buildings, technologies other than unit tiers, civilization-unique unit
    variants beyond Longbowman/Royal Knight/Arbalétrier, naval units, and the full land unit
    roster (only the 18 requested units were tabulated).

---

## Source index

- [aoe4world/data — parsed AoE4 game data (GitHub)](https://github.com/aoe4world/data)
- [aoe4world Unit Explorer](https://aoe4world.com/explorer/units)
- [aoe4world Technology Explorer](https://aoe4world.com/explorer/technologies)
- [aoemods/attrib — raw AoE4 attribute dump (GitHub)](https://github.com/aoemods/attrib)
- Age of Empires IV Wiki (Fandom) unit pages, linked per table above.
