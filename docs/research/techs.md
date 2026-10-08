## Age of Empires IV technologies

Transcription rules: every number below comes from a linked source; where two sources disagree both readings are shown and the newer one is identified; anything not confirmed by a primary/parsed data source or the wiki is tagged **UNVERIFIED**. Research times are **base** times in seconds at default game speed, before civilization modifiers (Delhi Sultanate, Tughlaq Dynasty, Abbasid Golden Age, Scholars, Imperial Officials, etc. change actual times). Costs are shown as resource amounts; "total" is the sum of the four resources.

Source snapshots used throughout:

- **aoe4world/data** JSON (`technologies/all-unified.json`, `technologies/english.json`, `upgrades/all-unified.json`, `buildings/all-unified.json`, schema `__version__: 0.0.2`). The repository's most recent commit at the time of writing is dated **2026-05-04** and titled "Added Jin Dynasty and Season 13 patch 16.1.9737 data", so this snapshot reflects **patch 16.1.9737**.
- **Fandom** (`ageofempires.fandom.com`), whose tech pages cite patches up to **16.2.10604**, i.e. newer than the data snapshot. Where the two differ, Fandom is the newer reading.
- Values cross-checked and found identical in both sources are marked "confirmed".
- aoe4world's dataset is parsed from game files, so it carries no explicit "prerequisite" field; Fandom tech pages carry a `Required` field only for some chains. Prerequisites are therefore given from Fandom where available and marked **UNVERIFIED** where inferred from age/building gating.
- Civ codes used below: ab = Abbasid Dynasty, ay = Ayyubids, by = Byzantines, ch = Chinese, de = Delhi Sultanate, en = English, fr = French, gol = Golden Horde, hl = House of Lancaster, hr = Holy Roman Empire, ja = Japanese, je = Jeanne d'Arc, jin = Jin Dynasty, kt = Knights Templar, ma = Malians, mac = Macedonian Dynasty, mo = Mongols, od = Order of the Dragon, ot = Ottomans, ru = Rus, sen = Sengoku Daimyo, tug = Tughlaq Dynasty, zx = Zhu Xi's Legacy.

### 0. Buildings that host technologies (prerequisite context)

| Building | Available from | Cost | Build time (s) | Availability notes |
|---|---|---|---|---|
| Blacksmith | Feudal Age (II) | 150 wood | 25 | Not for ja / sen (Forge instead) or mac (Varangian Arsenal) |
| University | Imperial Age (IV) | 450 wood | 60 | Called Madrasa for ab / ay / de; not for gol / mo / mac |
| Barracks | Dark Age (I) | 150 wood | 30 | Not for mac (Varangian Stronghold) |
| Archery Range | Feudal Age (II) | 150 wood | 30 | Not for jin (Machine Workshop / War Stable) |
| Stable | Feudal Age (II); Dark Age (I) for mo / gol | 150 wood | 30 | Not for jin |
| Siege Workshop | Castle Age (III) | 250 wood | 45 | 300 wood before patch 12.1.2454 |
| Mill | Dark Age (I) | 50 wood | 20 | — |
| Lumber Camp | Dark Age (I) | 50 wood | 20 | Not for kt / mo / gol / tug |
| Mining Camp | Dark Age (I) | 50 wood | 20 | — |
| Market | Feudal Age (II) | 100 wood | 20 | 30 s before the Season Three Update; not for sen |
| Monastery | Castle Age (III) | 200 wood | 25 | Called Mosque / Prayer Tent / Dome of the Faith etc. for non-Christian civs |

Age gating of the University (Imperial) and Monastery (Castle) is confirmed by the Fandom age pages. Sources: [aoe4world buildings data](https://github.com/aoe4world/data/blob/main/buildings/all-unified.json), [Blacksmith](https://ageofempires.fandom.com/wiki/Blacksmith_(Age_of_Empires_IV)), [University](https://ageofempires.fandom.com/wiki/University_(Age_of_Empires_IV)), [Barracks](https://ageofempires.fandom.com/wiki/Barracks_(Age_of_Empires_IV)), [Archery Range](https://ageofempires.fandom.com/wiki/Archery_Range_(Age_of_Empires_IV)), [Stable](https://ageofempires.fandom.com/wiki/Stable_(Age_of_Empires_IV)), [Siege Workshop](https://ageofempires.fandom.com/wiki/Siege_Workshop_(Age_of_Empires_IV)), [Mill](https://ageofempires.fandom.com/wiki/Mill_(Age_of_Empires_IV)), [Lumber Camp](https://ageofempires.fandom.com/wiki/Lumber_Camp_(Age_of_Empires_IV)), [Mining Camp](https://ageofempires.fandom.com/wiki/Mining_Camp_(Age_of_Empires_IV)), [Market](https://ageofempires.fandom.com/wiki/Market_(Age_of_Empires_IV)), [Monastery](https://ageofempires.fandom.com/wiki/Monastery_(Age_of_Empires_IV)), [Castle Age](https://ageofempires.fandom.com/wiki/Castle_Age_(Age_of_Empires_IV)), [Imperial Age](https://ageofempires.fandom.com/wiki/Imperial_Age_(Age_of_Empires_IV)).

### 1. Blacksmith — four upgrade lines, three tiers each

| Tech | Building | Age | Cost | Research time (s) | Effect | Prerequisites |
|---|---|---|---|---|---|---|
| Bloomery | Blacksmith | Feudal (II) | 50 food, 125 gold | 60 | +1 melee attack for all non-siege units | Blacksmith; none |
| Decarbonization | Blacksmith | Castle (III) | 100 food, 250 gold | 60 | +1 melee attack (stacks with Bloomery: +2 total) | Bloomery |
| Damascus Steel | Blacksmith | Imperial (IV) | 150 food, 350 gold | 60 | +1 melee attack (stacked total +3) | Decarbonization |
| Steeled Arrow | Blacksmith | Feudal (II) | 50 wood, 125 gold | 60 | +1 ranged damage for arrows and bolts | Blacksmith; none |
| Balanced Projectiles | Blacksmith | Castle (III) | 100 wood, 250 gold | 60 | +1 ranged damage (stacked total +2) | Steeled Arrow |
| Platecutter Point | Blacksmith | Imperial (IV) | 150 wood, 350 gold | 60 | +1 ranged damage (stacked total +3) | Balanced Projectiles |
| Fitted Leatherwork | Blacksmith | Feudal (II) | 50 food, 125 gold | 60 | +1 melee armor for non-siege units | Blacksmith; none |
| Insulated Helm | Blacksmith | Castle (III) | 100 food, 250 gold | 60 | +1 melee armor (stacked total +2) | Fitted Leatherwork |
| Master Smiths | Blacksmith | Imperial (IV) | 150 food, 350 gold | 60 | +1 melee armor (stacked total +3) | Insulated Helm |
| Iron Undermesh | Blacksmith | Feudal (II) | 50 wood, 125 gold | 60 | +1 ranged armor for non-siege units | Blacksmith; none |
| Wedge Rivets | Blacksmith | Castle (III) | 100 wood, 250 gold | 60 | +1 ranged armor (stacked total +2) | Iron Undermesh |
| Angled Surfaces | Blacksmith | Imperial (IV) | 150 wood, 350 gold | 60 | +1 ranged armor (stacked total +3) | Wedge Rivets |

Rules that go with this table:

- Each line is **chained**: a tier can only be researched after the previous tier of the same line (Fandom `Required` field).
- Attack upgrades do **not** apply to siege engines; the Springald is the exception and does benefit from ranged attack. Armor upgrades do **not** apply to ships. Gunpowder units do not benefit from the regular attack upgrades.
- Blacksmith techs also benefit religious units, villagers, ships and emplacements per the Blacksmith page, minus the exceptions above.
- Line availability: melee-damage line is available to all except ja, sen and mac; the other three lines are available to all except mac (ja / sen research them at the Forge).
- The same techs can also be researched at the HRE **Meinwerk Palace**, the Delhi **Tower of Victory**, the Ottoman **Istanbul Observatory**, the Delhi **Hisar Academy** and the Mongolian **Blacksmith** (improved variants).
- All 12 rows above are **confirmed**: aoe4world values and the Fandom tech pages agree exactly.
- Conflict: the Bloomery Fandom page's Bullet under "Civilization bonuses" states the HRE Meinwerk Palace version "costs 25 food, 150 gold", implying a different cost at that landmark; this is **UNVERIFIED** and not confirmed by the aoe4world dataset.

Sources: [Blacksmith](https://ageofempires.fandom.com/wiki/Blacksmith_(Age_of_Empires_IV)), [Bloomery](https://ageofempires.fandom.com/wiki/Bloomery), [Decarbonization](https://ageofempires.fandom.com/wiki/Decarbonization), [Damascus Steel](https://ageofempires.fandom.com/wiki/Damascus_Steel), [Steeled Arrow](https://ageofempires.fandom.com/wiki/Steeled_Arrow), [Balanced Projectiles](https://ageofempires.fandom.com/wiki/Balanced_Projectiles), [Platecutter Point](https://ageofempires.fandom.com/wiki/Platecutter_Point), [Fitted Leatherwork](https://ageofempires.fandom.com/wiki/Fitted_Leatherwork), [Insulated Helm](https://ageofempires.fandom.com/wiki/Insulated_Helm), [Master Smiths](https://ageofempires.fandom.com/wiki/Master_Smiths), [Iron Undermesh](https://ageofempires.fandom.com/wiki/Iron_Undermesh), [Wedge Rivets](https://ageofempires.fandom.com/wiki/Wedge_Rivets), [Angled Surfaces](https://ageofempires.fandom.com/wiki/Angled_Surfaces), [aoe4world Bloomery data](https://data.aoe4world.com/technologies/unified/bloomery.json).

### 2. University

| Tech | Building | Age | Cost | Research time (s) | Effect | Prerequisites |
|---|---|---|---|---|---|---|
| Biology | University (Madrasa for ab / ay / de) | Imperial (IV) | 500 food, 1,000 gold | 90 | All cavalry +25% hit points | University; none confirmed |
| Chemistry | University | Imperial (IV) | 200 food, 650 gold | 60 | Gunpowder siege +25% bonus damage | University; none confirmed |
| Court Architects | University | Imperial (IV) | 300 stone, 700 gold | 90 | Building hit points +30% | University; none confirmed |
| Elite Army Tactics | University | Imperial (IV) | 500 food, 1,000 gold | 90 | Melee infantry +15% damage and +15% hit points | University; none confirmed |
| Incendiary Arrows | University | Imperial (IV) | 500 wood, 1,000 gold | 90 | Non-gunpowder ranged units +20% ranged damage and gain a siege attack | University; none confirmed |
| Siege Works | University | Imperial (IV) | 300 wood, 600 gold | 90 | Siege engines +20% hit points | University; none confirmed |
| Silk Bowstrings | University | Imperial (IV) | 200 wood, 500 gold | 60 | Archers +1 range, mounted archers +0.5 range | University; none confirmed |
| Serpentine Powder | University | Imperial (IV) | 300 food, 500 gold | 60 | Handcannoneers +5 damage vs melee infantry and a short speed boost after firing | University; none confirmed |

Notes:

- Every generic University technology is an **Imperial Age** technology, and the University itself unlocks in the Imperial Age (see section 0). No tech-to-tech prerequisite is exposed on the Fandom pages for these eight, so the only confirmed gate is "University built; Imperial Age" — treat stronger claims as **UNVERIFIED**.
- Availability exceptions (missing civs in the aoe4world 16.1.9737 snapshot; mac lacks the University building entirely): Biology — fr, je, jin, mac; Chemistry — kt, mac; Court Architects — mac; Elite Army Tactics — ja, jin, mac, sen; Incendiary Arrows — mac, ma; Siege Works — mac; Silk Bowstrings — mac, zx; Serpentine Powder — jin, kt, mac, ot, zx. Fandom's University page states the same lists without mac (which it covers by "all except Macedonian Dynasty" on the individual tech pages).
- For mo the same techs are researched at the Blacksmith, for ab / ay / de at the Madrasa, and for ot at the Istanbul Observatory; Silk Bowstrings is a Blacksmith tech for mo and gol with a stronger effect (+1.5 archer range, +0.75 mounted-archer range) at a higher cost (see section 13).

Sources: [University](https://ageofempires.fandom.com/wiki/University_(Age_of_Empires_IV)), [Biology](https://ageofempires.fandom.com/wiki/Biology), [Chemistry](https://ageofempires.fandom.com/wiki/Chemistry_(Age_of_Empires_IV)), [Court Architects](https://ageofempires.fandom.com/wiki/Court_Architects), [Elite Army Tactics](https://ageofempires.fandom.com/wiki/Elite_Army_Tactics), [Incendiary Arrows](https://ageofempires.fandom.com/wiki/Incendiary_Arrows), [Siege Works](https://ageofempires.fandom.com/wiki/Siege_Works_(Age_of_Empires_IV)), [Silk Bowstrings](https://ageofempires.fandom.com/wiki/Silk_Bowstrings), [Serpentine Powder](https://ageofempires.fandom.com/wiki/Serpentine_Powder), [aoe4world technologies data](https://github.com/aoe4world/data/blob/main/technologies/all-unified.json).

### 3. Barracks

Per the Fandom Barracks page, every **non-tier** technology available at the Barracks is civilization-unique; the table below covers the generic unit-tier upgrades (see also section 12).

| Tech | Building | Age | Cost | Research time (s) | Effect | Prerequisites |
|---|---|---|---|---|---|---|
| Hardened Spearman | Barracks | Feudal (II) | 15 food, 35 gold | 15 | Upgrades Spearman to Hardened Spearman (higher HP/attack) | Spearman available; Barracks |
| Veteran Spearman | Barracks | Castle (III) | 100 food, 250 gold | 60 | Upgrades Hardened Spearman to Veteran Spearman | Hardened Spearman |
| Elite Spearman | Barracks | Imperial (IV) | 300 food, 700 gold | 60 | Upgrades Veteran Spearman to Elite Spearman | Veteran Spearman |
| Man-at-Arms | Barracks | Castle (III) | 50 food, 125 gold | 30 | Upgrades Early Man-at-Arms to Man-at-Arms (en, hr only) | Early Man-at-Arms |
| Elite Man-at-Arms | Barracks | Imperial (IV) | 300 food, 700 gold | 60 | Upgrades Man-at-Arms to Elite Man-at-Arms | Man-at-Arms |

Example civilization-unique Barracks technology (pattern for the rest): English **Armor Clad** — Castle Age (III), 150 food, 350 gold, 60 s ([aoe4world English data](https://github.com/aoe4world/data/blob/main/technologies/english.json)).

Sources: [Barracks](https://ageofempires.fandom.com/wiki/Barracks_(Age_of_Empires_IV)), [Spearman](https://ageofempires.fandom.com/wiki/Spearman_(Age_of_Empires_IV)), [Man-at-Arms](https://ageofempires.fandom.com/wiki/Man-at-Arms_(Age_of_Empires_IV)), [aoe4world upgrades data](https://github.com/aoe4world/data/blob/main/upgrades/all-unified.json).

### 4. Archery Range

Per the Fandom Archery Range page, all non-tier technologies here are civilization-unique.

| Tech | Building | Age | Cost | Research time (s) | Effect | Prerequisites |
|---|---|---|---|---|---|---|
| Veteran Archer | Archery Range | Castle (III) | 100 food, 250 gold | 60 | Upgrades Archer to Veteran Archer | Archer available; Archery Range |
| Elite Archer | Archery Range | Imperial (IV) | 300 food, 700 gold | 60 | Upgrades Veteran Archer to Elite Archer | Veteran Archer |
| Elite Crossbowman | Archery Range | Imperial (IV) | 300 food, 700 gold | 60 | Upgrades Crossbowman to Elite Crossbowman | Crossbowman available |

- The Archer has **no** Hardened tier: it is a Feudal-Age unit, so its first upgrade tier is Veteran (Fandom lists the Archer's upgrade path as Veteran ➞ Elite only, and the aoe4world upgrade records are labelled "Unit Technology 1/2" and "2/2").
- Civ-unique Archery Range technologies (examples): English Arrow Volley (Imperial, 150 wood, 350 gold, 60 s); French / Jeanne d'Arc Crossbow Stirrups and Gambesons; Mongol Siha Bow Limbs.

Sources: [Archery Range](https://ageofempires.fandom.com/wiki/Archery_Range_(Age_of_Empires_IV)), [Archer](https://ageofempires.fandom.com/wiki/Archer_(Age_of_Empires_IV)), [aoe4world upgrades data](https://github.com/aoe4world/data/blob/main/upgrades/all-unified.json).

### 5. Stable

| Tech | Building | Age | Cost | Research time (s) | Effect | Prerequisites |
|---|---|---|---|---|---|---|
| Veteran Horseman | Stable | Castle (III) | 100 food, 250 gold | 60 | Upgrades Horseman to Veteran Horseman | Horseman available; Stable |
| Elite Horseman | Stable | Imperial (IV) | 300 food, 700 gold | 60 | Upgrades Veteran Horseman to Elite Horseman | Veteran Horseman |
| Elite Knight / Lancer | Stable | Imperial (IV) | 300 food, 700 gold | 60 | Upgrades Knight or Lancer to Elite | Knight / Lancer available |
| Knight (Rus only) | Stable | Castle (III) | 50 food, 125 gold | 30 | Upgrades Lancer to Knight (ru only) | Lancer |
| Spyglass | Stable | Imperial (IV) | 100 wood, 50 gold | 45 | Scout sight radius +30% | Stable; none |

- The generic Stable technology tree is Scout ➞ (Imperial) Spyglass, Horseman ➞ Veteran Horseman ➞ Elite Horseman, and Lancer ➞ Elite Lancer.
- The Horseman has **no** Hardened tier for most civilizations (Feudal-Age unit); mo and gol, which get the Horseman in the Dark Age, additionally have a Feudal "Horseman" tier at 15 food, 35 gold and 15 s.
- All other Stable technologies are civilization-unique (e.g. French Chivalry / Cantled Saddles, Mongol Steppe Lancers, Rus Knight Poleaxes, Japanese Do-maru Armor).

Sources: [Stable](https://ageofempires.fandom.com/wiki/Stable_(Age_of_Empires_IV)), [Horseman](https://ageofempires.fandom.com/wiki/Horseman), [Lancer](https://ageofempires.fandom.com/wiki/Lancer_(Age_of_Empires_IV)), [Spyglass](https://ageofempires.fandom.com/wiki/Spyglass), [aoe4world upgrades data](https://github.com/aoe4world/data/blob/main/upgrades/all-unified.json).

### 6. Siege Workshop

| Tech | Building | Age | Cost | Research time (s) | Effect | Prerequisites |
|---|---|---|---|---|---|---|
| Adjustable Crossbars | Siege Workshop | Imperial (IV) | 1,000 wood, 1,200 gold | 90 | Mangonel +1 range, +1 projectile, +75% blast radius | Siege Workshop; none confirmed |
| Greased Axles | Siege Workshop | Castle (III) | 150 wood, 350 gold | 60 | Siege engine movement speed +15% | Siege Workshop; none confirmed |
| Roller Shutter Triggers | Siege Workshop | Imperial (IV) | 150 wood, 350 gold | 60 | Springald attack speed +30%, ranged resistance +10% | Siege Workshop; none confirmed |
| Geometry | Siege Workshop | Imperial (IV) | 100 wood, 225 gold | 45 | Trebuchet damage +20% | Siege Workshop; none confirmed |
| Lightweight Beams | Siege Workshop | Imperial (IV) | 300 wood, 400 gold | 60 | Rams and Cheirosiphons attack 20% faster and take 50% less time to construct in the field; Towers of the Sultan attack 20% faster | Siege Workshop; none confirmed |

Availability exceptions (aoe4world snapshot): Adjustable Crossbars — ch, jin, zx; Greased Axles — jin; Roller Shutter Triggers — jin, tug; Geometry — by, mac; Lightweight Beams — available to all 23 civilizations. Fandom's tech pages agree except for Adjustable Crossbars, which Fandom lists "for all civilizations except Chinese and Zhu Xi's Legacy" (it puts jin on the Machine Workshop) — **UNVERIFIED** for jin.

Sources: [Siege Workshop](https://ageofempires.fandom.com/wiki/Siege_Workshop_(Age_of_Empires_IV)), [Adjustable Crossbars](https://ageofempires.fandom.com/wiki/Adjustable_Crossbars), [Greased Axles](https://ageofempires.fandom.com/wiki/Greased_Axles), [Roller Shutter Triggers](https://ageofempires.fandom.com/wiki/Roller_Shutter_Triggers), [Geometry](https://ageofempires.fandom.com/wiki/Geometry), [Lightweight Beams](https://ageofempires.fandom.com/wiki/Lightweight_Beams), [aoe4world technologies data](https://github.com/aoe4world/data/blob/main/technologies/all-unified.json).

### 7. Mill

| Tech | Building | Age | Cost | Research time (s) | Effect | Prerequisites |
|---|---|---|---|---|---|---|
| Survival Techniques | Mill | Dark Age (I) | 25 wood, 75 gold | 25 | Villager hunted-meat gather rate +15% | Mill; none |
| Wheelbarrow | Mill | Dark Age (I) | 50 wood, 150 gold | 90 | Villager carry capacity +5, villager movement speed +15% | Mill; none |
| Horticulture | Mill | Feudal (II) | 50 wood, 100 gold | 45 | Villager food gather rate +10% (excludes hunted meat) | Mill; none |
| Professional Scouts | Mill | Feudal (II) | 150 wood, 300 gold | 75 | Scouts can carry animal carcasses (not boar or cattle) and deal +100% damage vs animals | Mill; none |
| Fertilization | Mill | Castle (III) | 100 wood, 250 gold | 60 | Villager food gather rate +10% (excludes hunted meat) | Horticulture |
| Precision Cross-Breeding | Mill | Imperial (IV) | 250 wood, 500 gold | 75 | Villager food gather rate +10% (excludes hunted meat) | Fertilization |

Availability (aoe4world snapshot): Survival Techniques — jin, tug; Wheelbarrow — ja, sen; Horticulture / Fertilization / Precision Cross-Breeding — gol, ja, sen, tug; Professional Scouts — jin, sen, tug. Fandom's Mill page and tech pages give narrower lists (Survival Techniques "all except Jin Dynasty"; Professional Scouts "all except Jin Dynasty and Sengoku Daimyo"; the food line "all except Japanese, Sengoku Daimyo, Golden Horde and Tughlaq Dynasty"), so the tug exclusions come from the data snapshot only — **UNVERIFIED**.

Sources: [Mill](https://ageofempires.fandom.com/wiki/Mill_(Age_of_Empires_IV)), [Wheelbarrow](https://ageofempires.fandom.com/wiki/Wheelbarrow_(Age_of_Empires_IV)), [Survival Techniques](https://ageofempires.fandom.com/wiki/Survival_Techniques), [Horticulture](https://ageofempires.fandom.com/wiki/Horticulture), [Professional Scouts](https://ageofempires.fandom.com/wiki/Professional_Scouts), [Fertilization](https://ageofempires.fandom.com/wiki/Fertilization), [Precision Cross-Breeding](https://ageofempires.fandom.com/wiki/Precision_Cross-Breeding), [aoe4world technologies data](https://github.com/aoe4world/data/blob/main/technologies/all-unified.json).

### 8. Lumber Camp

| Tech | Building | Age | Cost | Research time (s) | Effect | Prerequisites |
|---|---|---|---|---|---|---|
| Forestry | Lumber Camp | Dark Age (I) | 25 food, 50 gold | 45 | Trees are chopped down twice as fast | Lumber Camp; none |
| Double Broadax | Lumber Camp | Feudal (II) | 50 food, 100 gold | 45 | Villager wood gather rate +15% | Lumber Camp; none |
| Lumber Preservation | Lumber Camp | Castle (III) | 100 food, 250 gold | 60 | Villager wood gather rate +15% | Double Broadax |
| Crosscut Saw | Lumber Camp | Imperial (IV) | 250 food, 500 gold | 75 | Villager wood gather rate +15% and wood carry capacity +5 | Lumber Preservation |

Availability (aoe4world snapshot): all except kt and tug for all four technologies. Fandom's Forestry page lists only "all except Knights Templar" (tug relies on a different wood-drop building), and the Lumber Camp building itself is unavailable to kt, mo, gol and tug. Notable unique technology at this building: Jin Dynasty Draft Horses.

Sources: [Lumber Camp](https://ageofempires.fandom.com/wiki/Lumber_Camp_(Age_of_Empires_IV)), [Forestry](https://ageofempires.fandom.com/wiki/Forestry), [Double Broadax](https://ageofempires.fandom.com/wiki/Double_Broadax), [Lumber Preservation](https://ageofempires.fandom.com/wiki/Lumber_Preservation), [Crosscut Saw](https://ageofempires.fandom.com/wiki/Crosscut_Saw), [aoe4world technologies data](https://github.com/aoe4world/data/blob/main/technologies/all-unified.json).

### 9. Mining Camp

| Tech | Building | Age | Cost | Research time (s) | Effect | Prerequisites |
|---|---|---|---|---|---|---|
| Specialized Pick | Mining Camp | Feudal (II) | 50 wood, 100 gold | 45 | Villager gold and stone gather rate +15% | Mining Camp; none |
| Shaft Mining | Mining Camp | Castle (III) | 100 wood, 250 gold | 60 | Villager gold and stone gather rate +15% | Specialized Pick |
| Cupellation | Mining Camp | Imperial (IV) | 250 wood, 500 gold | 75 | Gold and stone gatherers drop off 15% more resources | Shaft Mining |

Availability: all except tug. The Mining Camp Fandom table phrases Cupellation as "Villagers drop off +15% more **gold**" while its own infobox and the aoe4world tooltip say "+15% gold / stone" — the number 15% is consistent across all three; only the wording differs.

Sources: [Mining Camp](https://ageofempires.fandom.com/wiki/Mining_Camp_(Age_of_Empires_IV)), [Specialized Pick](https://ageofempires.fandom.com/wiki/Specialized_Pick), [Shaft Mining](https://ageofempires.fandom.com/wiki/Shaft_Mining), [Cupellation](https://ageofempires.fandom.com/wiki/Cupellation), [aoe4world technologies data](https://github.com/aoe4world/data/blob/main/technologies/all-unified.json).

### 10. Market

The Market has **no generic technologies**. Fandom's Market page lists only civilization-unique trade technologies, and the aoe4world dataset files the three it records at the Market under civ-specific entries. Whether any generic Market technology exists is **UNVERIFIED**.

| Tech | Building | Age | Cost | Research time (s) | Effect | Prerequisites |
|---|---|---|---|---|---|---|
| Merchant Guilds (fr, je) | Market / Chamber of Commerce | Imperial (IV) | 200 food, 500 gold | 60 | Active Traders generate 1 gold every 6 s | Market; none confirmed |
| Stone Commerce (mo, gol) | Market (mo also The Silver Tree) | Imperial (IV) | 300 food, 700 gold | 90 | Traders supply +10% stone to their trades | Market; none confirmed |
| Lettre de Change (kt) | Market | Castle (III) | 100 food, 250 gold | 45 | Unlocks Pilgrim Loan abilities (loan food, repaid in gold over time) | Market; none confirmed |
| Armored Caravans (ab) | Market (per Fandom) / House of Wisdom (per aoe4world) | Feudal (II) | 25 wood, 75 gold (aoe4world) | 45 (aoe4world) | Traders and Trade Ships gain armor: **+2** melee/fire and ranged armor per Fandom; **+3** per aoe4world | Market; none confirmed — see "Conflicts and gaps" |

Sources: [Market](https://ageofempires.fandom.com/wiki/Market_(Age_of_Empires_IV)), [Armored Caravans](https://ageofempires.fandom.com/wiki/Armored_Caravans), [aoe4world technologies data](https://github.com/aoe4world/data/blob/main/technologies/all-unified.json), [aoe4world technologies index](https://aoe4world.com/explorer).

### 11. Monastery

| Tech | Building | Age | Cost | Research time (s) | Effect | Prerequisites |
|---|---|---|---|---|---|---|
| Herbal Medicine | Monastery | Castle (III) | 275 gold | 45 | Religious units' and healers' healing rate +60% | Monastery; none |
| Piety | Monastery | Imperial (IV) | 325 gold | 45 | Religious units' and healers' hit points +40 | Monastery; none |
| Tithe Barns | Monastery | Imperial (IV) | 500 gold | 60 | Relics in a Monastery additionally generate +40 food, +40 wood and +10 stone per minute (30/30/30 before patch 9.2.628) | Monastery; none |

Availability: Herbal Medicine not for ja / sen; Piety not for ja; Tithe Barns not for ja / gol. Unique Monastery technologies include HRE Devoutness, Cistercian Churches and Inspired Warriors, Knights Templar Fanaticism, and Rus Divine Light.

Note: Herbal Medicine and Tithe Barns list alternative host buildings (Mosque, Prayer Tent, Dome of the Faith, Regnitz Cathedral, Grand Winery, etc.) because those civs use a religious building with a different name.

Sources: [Monastery](https://ageofempires.fandom.com/wiki/Monastery_(Age_of_Empires_IV)), [Herbal Medicine](https://ageofempires.fandom.com/wiki/Herbal_Medicine_(Age_of_Empires_IV)), [Piety](https://ageofempires.fandom.com/wiki/Piety), [Tithe Barns](https://ageofempires.fandom.com/wiki/Tithe_Barns), [aoe4world technologies data](https://github.com/aoe4world/data/blob/main/technologies/all-unified.json).

### 12. Unit tier upgrades (Hardened / Veteran / Elite)

Tier upgrades are technologies that upgrade a whole unit type (existing and future units). They always sit in the producing building (Barracks = melee infantry, Archery Range = ranged units, Stable = cavalry) and are gated by the previous tier, not by a separate tech tree.

| Tier | Age | Buildings | Standard cost | Standard research time (s) | Applies to |
|---|---|---|---|---|---|
| Hardened | Feudal (II) | Barracks (Varangian Stronghold for mac) | 15 food, 35 gold | 15 | Dark-Age units whose base unit exists in Age I: Spearman (and civ analogues Limitanei, Samurai, Donso, Gilded Spearman, Atgeirmadr) |
| (Regular / named tier) | Castle (III) | Barracks, Stable | 50 food, 125 gold | 30 | English/HRE Man-at-Arms; Rus Knight; Mongols / Golden Horde Horseman |
| Veteran | Castle (III) | Barracks, Archery Range, Stable | 100 food, 250 gold | 60 | Spearman, Archer, Horseman and civ-unique equivalents |
| Elite | Imperial (IV) | Barracks, Archery Range, Stable | 300 food, 700 gold | 60 | Spearman, Man-at-Arms, Archer, Crossbowman, Horseman, Knight / Lancer and civ-unique equivalents |

Source for the tier table: [aoe4world upgrades data](https://github.com/aoe4world/data/blob/main/upgrades/all-unified.json), [Spearman](https://ageofempires.fandom.com/wiki/Spearman_(Age_of_Empires_IV)), [Horseman](https://ageofempires.fandom.com/wiki/Horseman), [Archer](https://ageofempires.fandom.com/wiki/Archer_(Age_of_Empires_IV)).

Per-unit deviations confirmed by aoe4world and, where noted, Fandom:

| Unit upgrade | Cost | Research time (s) |
|---|---|---|
| Ottoman Akinji (Veteran 50 food/125 gold, 30 s), Akinji and Janissary (Elite) | 150 food, 350 gold | 30 |
| Golden Horde Kipchak Archer (Elite) | 150 food, 350 gold | 30 |
| Sengoku Daimyo Tanegashima Ashigaru (Elite) | 150 food, 350 gold | 30 |
| Zhu Xi's Legacy Grenadiers | 150 food, 350 gold | 30 |
| Knights Templar units (Elite) | 200 food, 400 gold | 40 |
| Malian Donso (Veteran), Musofadi / Javelin Thrower / Sofa (Veteran) | 50 food, 125 gold | 30 |
| Japanese Onna-Musha (Elite) | 300 food, 700 gold | 45 |
| Tughlaq Dynasty upgrades | +20% over standard (e.g. 120 food, 300 gold for Veteran; 360 food, 840 gold for Elite) | 5 |
| Delhi Sultanate upgrades | 0 resources | 52.5 (Hardened) / 300 (Veteran) / 720 (Elite) |

Sources: [Spearman](https://ageofempires.fandom.com/wiki/Spearman_(Age_of_Empires_IV)), [Archer](https://ageofempires.fandom.com/wiki/Archer_(Age_of_Empires_IV)), [Horseman](https://ageofempires.fandom.com/wiki/Horseman), [Man-at-Arms](https://ageofempires.fandom.com/wiki/Man-at-Arms_(Age_of_Empires_IV)), [Lancer](https://ageofempires.fandom.com/wiki/Lancer_(Age_of_Empires_IV)), [aoe4world upgrades data](https://github.com/aoe4world/data/blob/main/upgrades/all-unified.json), [aoe4world unit upgrades index](https://aoe4world.com/explorer).

### 13. Civilization modifiers that change tech cost, time or building

| Civilization | Modifier | Confirmed value | Source |
|---|---|---|---|
| Delhi Sultanate (de) | Technologies are free but research far slower; garrisoned Scholars speed research up | aoe4world: Feudal-Age techs 210 s (3.5 × 60), Castle-Age 300 s, Imperial-Age 720 s; unit upgrades 52.5 / 300 / 720 s. Fandom Bloomery page: "free, but takes 3.5× as long (210 seconds instead of 60)" | [aoe4world data](https://data.aoe4world.com/technologies/unified/bloomery.json), [Bloomery](https://ageofempires.fandom.com/wiki/Bloomery) |
| Tughlaq Dynasty (tug) | Higher cost, near-instant research | +20% cost (e.g. 210 total for a 175-total tech; 360 food/840 gold for an Elite upgrade) and 5 s research | [aoe4world data](https://github.com/aoe4world/data/blob/main/technologies/all-unified.json) |
| French (fr) / Jeanne d'Arc (je) | Some Feudal Blacksmith techs are granted free and instantly after reaching Feudal Age | aoe4world records total 0, time 0 for fr Bloomery; Fandom Bloomery: "Blacksmiths grant Bloomery for free after reaching the Feudal Age" | [Bloomery](https://ageofempires.fandom.com/wiki/Bloomery), [aoe4world data](https://data.aoe4world.com/technologies/unified/bloomery.json) |
| Abbasid Dynasty (ab) | −20% technology cost with Preservation of Knowledge; Golden Age research-speed bonuses | −20% (Bloomery page) | [Bloomery](https://ageofempires.fandom.com/wiki/Bloomery) |
| Ayyubids (ay) | Free Bloomery when ageing to Feudal via the Master Smiths branch; +25% research speed at Golden Age tier 2 | free grant | [Bloomery](https://ageofempires.fandom.com/wiki/Bloomery) |
| Byzantines (by) | +30% research speed per cistern water level with Dialecticus active | +30% per level | [Bloomery](https://ageofempires.fandom.com/wiki/Bloomery) |
| Chinese (ch) / Zhu Xi's Legacy (zx) | +150% research speed while supervised by an Imperial Official | +150% (+300% for zx with Regional Inspection) | [Bloomery](https://ageofempires.fandom.com/wiki/Bloomery), [Barracks](https://ageofempires.fandom.com/wiki/Barracks_(Age_of_Empires_IV)) |
| Mongols (mo) | Improved Blacksmith techs cost extra stone and give +2 instead of +1 | +175 stone (Bloomery, Steeled Arrow); +350 stone (Decarbonization, Insulated Helm, Wedge Rivets, Iron Undermesh); +525 stone (Damascus Steel, Platecutter Point, Master Smiths, Angled Surfaces) | [Bloomery](https://ageofempires.fandom.com/wiki/Bloomery), [Iron Undermesh](https://ageofempires.fandom.com/wiki/Iron_Undermesh), [Wedge Rivets](https://ageofempires.fandom.com/wiki/Wedge_Rivets), [Damascus Steel](https://ageofempires.fandom.com/wiki/Damascus_Steel) |
| Golden Horde (gol) | Blacksmith-position techs replaced by stronger variants at its own buildings | Silk Bowstrings: at Blacksmith, +1.5 archer range / +0.75 mounted-archer range, 1,000 total cost | [aoe4world data](https://github.com/aoe4world/data/blob/main/technologies/all-unified.json) |
| Japanese (ja) / Sengoku Daimyo (sen) | Build the **Forge** instead of the Blacksmith | Forge hosts Blacksmith-line techs | [Blacksmith](https://ageofempires.fandom.com/wiki/Blacksmith_(Age_of_Empires_IV)), [Steeled Arrow](https://ageofempires.fandom.com/wiki/Steeled_Arrow) |
| Macedonian Dynasty (mac) | Uses the **Varangian Arsenal**; Blacksmith techs unavailable | techs "all except Macedonian Dynasty" | [Blacksmith](https://ageofempires.fandom.com/wiki/Blacksmith_(Age_of_Empires_IV)) |
| Abbasid / Ayyubids / Delhi | Use the **Madrasa** instead of the University | same tech costs/times | [University](https://ageofempires.fandom.com/wiki/University_(Age_of_Empires_IV)) |
| Jin Dynasty (jin) | Ranged infantry at **Machine Workshop**, ranged cavalry at **War Stable** | same upgrade costs | [Archery Range](https://ageofempires.fandom.com/wiki/Archery_Range_(Age_of_Empires_IV)) |
| Ottomans (ot) | Blacksmith/University influence gives +20%/+30%/+40% production speed per age, +90% with Istanbul Observatory | +20/30/40%, +90% | [Blacksmith](https://ageofempires.fandom.com/wiki/Blacksmith_(Age_of_Empires_IV)) |

Sources for this table: each row links its own source; the aoe4world rows come from [technologies/all-unified.json](https://github.com/aoe4world/data/blob/main/technologies/all-unified.json), and the Fandom rows from [Bloomery](https://ageofempires.fandom.com/wiki/Bloomery) and the building pages linked above.

### 14. Conflicts and gaps

Conflicts (both readings given; the newer reading is named):

1. **Armored Caravans (Abbasid).** aoe4world (snapshot patch 16.1.9737): researched at the **House of Wisdom**, Feudal Age, 25 wood + 75 gold, 45 s, grants **+3** armor to Traders and Trade Ships. Fandom (cites patch 16.2.10604, newer): researched at the **Market**, Feudal Age, grants **+2** melee/fire and ranged armor — and states it was +3 before patch 16.2.10604 and +5 before patch 11.1.1201. Newer = Fandom; the moved building and the reduced armor value are both un-reflected in the data snapshot. Cost and time for the Market version are **UNVERIFIED**. [Armored Caravans](https://ageofempires.fandom.com/wiki/Armored_Caravans), [aoe4world data](https://github.com/aoe4world/data/blob/main/technologies/all-unified.json)
2. **Delhi Sultanate research times.** Fandom's Bloomery page states the rule as "3.5× as long (210 seconds instead of 60)". The aoe4world snapshot shows 3.5× only at Feudal Age, and 5× at Castle Age (300 s) and 12× at Imperial Age (720 s) for the same lines; its unit-upgrade records show 52.5 s (Hardened), 300 s (Veteran), 720 s (Elite). Separately, the Fandom Spearman changelog says Delhi's Hardened Spearman base research time was reduced from 210 s to **105 s** in patch 10257, which matches neither 52.5 s nor 210 s. The aoe4world reading is **UNVERIFIED** against in-game tooltips; the changelog number may predate a later change. [Bloomery](https://ageofempires.fandom.com/wiki/Bloomery), [Spearman changelog](https://ageofempires.fandom.com/wiki/Spearman_(Age_of_Empires_IV)), [aoe4world upgrades data](https://github.com/aoe4world/data/blob/main/upgrades/all-unified.json)
3. **Mongol improved Blacksmith techs — stone surcharge.** Fandom lists +175 stone for the two Feudal lines except **Iron Undermesh**, which its page lists at **+350 stone**, the same surcharge as Castle-Age lines. Whether the Iron Undermesh figure is correct or a wiki error is **UNVERIFIED**. [Bloomery](https://ageofempires.fandom.com/wiki/Bloomery), [Iron Undermesh](https://ageofempires.fandom.com/wiki/Iron_Undermesh)
4. **Cupellation wording.** Mining Camp table: "Villagers drop off +15% more **gold**"; the Cupellation infobox and the aoe4world tooltip: "+15% **gold / stone**". Same 15% value, different scope. [Cupellation](https://ageofempires.fandom.com/wiki/Cupellation), [Mining Camp](https://ageofempires.fandom.com/wiki/Mining_Camp_(Age_of_Empires_IV))
5. **HRE Meinwerk Palace Blacksmith-tech cost.** The Bloomery page's civilization-bonus bullet states the Meinwerk Palace version costs 25 food + 150 gold, while the same page's infobox gives 50 food + 125 gold for the standard tech and the aoe4world dataset only records 50 food + 125 gold. **UNVERIFIED**. [Bloomery](https://ageofempires.fandom.com/wiki/Bloomery)
6. **Campaign versus standard values (Spearman tiers).** Fandom's Spearman "Campaign version" section gives Hardened/Veteran/Elite at 50 food/150 gold, 100 food/300 gold and 200 food/600 gold with 60/60/90 s, versus the standard 15/35, 100/250, 300/700 with 15/60/60 s. The campaign has not been rebalanced since release; use the standard values for a competitive-faithful model. [Spearman](https://ageofempires.fandom.com/wiki/Spearman_(Age_of_Empires_IV))

Superseded (older) values worth knowing, all from Fandom hist notes, newest number first:

| Tech / item | Current | Older values |
|---|---|---|
| Siege Works | University, 300 wood + 600 gold, 90 s | Siege Workshop before the Season One Update, 150 wood + 350 gold, 60 s; gold 700 before update 12.0.1974 |
| Chemistry | 200 food + 650 gold, 60 s | 300 food + 700 gold, 90 s before update 12.0.1974 |
| Herbal Medicine | 275 gold, 45 s, +60% healing | 350 gold, 60 s before Season Two Update 17718; +100% healing before patch 20249 |
| Hardened Spearman | 15 food + 35 gold, 15 s | 25 food + 75 gold, 30 s before patch 20249 |
| Elite Spearman upgrade time | 60 s | 90 s before update 8324 |
| Siege Workshop building cost | 250 wood | 300 wood before patch 12.1.2454 |
| Market build time | 20 s | 30 s before the Season Three Update |
| Tithe Barns relic income | +40 food, +40 wood, +10 stone per minute | 30/30/30 per minute before patch 9.2.628 |

Source for the table above: [Siege Works](https://ageofempires.fandom.com/wiki/Siege_Works_(Age_of_Empires_IV)), [Chemistry](https://ageofempires.fandom.com/wiki/Chemistry_(Age_of_Empires_IV)), [Herbal Medicine](https://ageofempires.fandom.com/wiki/Herbal_Medicine_(Age_of_Empires_IV)), [Spearman](https://ageofempires.fandom.com/wiki/Spearman_(Age_of_Empires_IV)), [Siege Workshop](https://ageofempires.fandom.com/wiki/Siege_Workshop_(Age_of_Empires_IV)), [Market](https://ageofempires.fandom.com/wiki/Market_(Age_of_Empires_IV)), [Tithe Barns](https://ageofempires.fandom.com/wiki/Tithe_Barns).

Gaps and UNVERIFIED items:

- **Prerequisites.** The aoe4world dataset has no prerequisite field. Fandom exposes `Required` only for the chained lines (Blacksmith ×4, Mill food line, Lumber Camp, Mining Camp); University, Siege Workshop and Monastery technologies show no `Required` field, so their prerequisites are recorded as "building + Age" only. Tech-to-tech gating for those buildings is **UNVERIFIED**.
- **Delhi Sultanate and Tughlaq Dynasty research-time rules** are recorded from the aoe4world parse, not from in-game tooltips; the per-age multipliers for Delhi are **UNVERIFIED** (see conflict 2).
- **Market generic technologies**: no generic Market technology was found in either source; absence is not proof — **UNVERIFIED**.
- **University build age**: Fandom and the aoe4world building data both put the University in the Imperial Age; the pre-Season One placement of some of its technologies at the Siege Workshop suggests older players will remember different gating, and a per-patch verification is **UNVERIFIED**.
- **Research times are base values**; the effect of game-speed settings, Scholars, Imperial Officials, cisterns, Golden Age and Istanbul Observatory on the final number is only listed qualitatively (section 13) and is **UNVERIFIED** as a formula.
- **Civ-unique technologies are not enumerated exhaustively** here: each of Barracks, Archery Range, Stable and Market has one or more per civilization (23 civilizations in the 16.1.9737 snapshot). Only examples are given; a full per-civ list is available in the aoe4world data files (`technologies/<civ>.json`).
- **Non-Blacksmith/University tech buildings** that duplicate these tech trees (Forge, Varangian Arsenal, Madrasa, Ger, Granary, Steppe Redoubt, Kura Storehouse, Machine Workshop, War Stable, Arsenal) are identified by name only; their exact per-building rosters are **UNVERIFIED**.
- **Numbers not re-checked in game.** Every figure above was taken from the two sources named at the top of this file; none was verified by launching Age of Empires IV.

Primary index pages: [aoe4world](https://aoe4world.com/explorer), [aoe4world/data repository](https://github.com/aoe4world/data), [aoemods/attrib](https://github.com/aoemods/attrib), [Age of Empires IV technology category on Fandom](https://ageofempires.fandom.com/wiki/Category:Technologies_(Age_of_Empires_IV)).
