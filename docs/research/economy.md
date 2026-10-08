# Age of Empires IV — Economy reference

Transcription rules used below: every number comes from a linked source; where two sources disagree both readings are shown and the newer one is identified; anything not confirmed by a source is tagged **UNVERIFIED**. Values are for the current live game (post-`update 16.2.10604` where stated) unless a row says otherwise. The only primary data repository used is the `aoe4world/data` parse (current) and the `aoemods/attrib` game-file export, which is a **May 2022 snapshot (patch 14681)** and therefore outdated for anything a later patch changed.

## 1. Gather rates and node amounts

Base gather rates are theoretical (no walking time between node and drop-off). Rates are `resource / second` for one Villager unless stated.

| Source | Resource | Amount per node | Base gather rate (per second) |
|---|---|---|---|
| Sheep (herdable) | Food | 200 | 0.75 (House of Lancaster: 0.9) |
| Berry Bush | Food | 250 | 0.69 (Abbasid Dynasty, Ayyubids, Delhi Sultanate: 0.8625) |
| Farm | Food | Infinite | 0.75 |
| Stockyard (Golden Horde farm equivalent) | Food | Infinite | 0.7 |
| Deer | Food | 350 | 0.825 |
| Reindeer (Jin Dynasty) | Food | 400 | 0.825 |
| Wild Boar | Food | 2,400 | 0.9 |
| Cattle (Malians, created at Mill) | Food | 500 | 0.81 |
| Shoreline Fish | Food | 600 | Villager 1.0 / Fishing Boat 0.675 / Lodya Fishing Boat 1.2825 |
| Deep Water Fish | Food | 1,000 (replenishes) | Fishing Boat 0.75 / Lodya Fishing Boat 1.42 |
| Tree | Wood | 150 | 0.75 (Knights Templar: 0.6, ×1.2 per Age) |
| Tiny Gold Vein | Gold | 1,600 | 0.75 |
| Small Gold Vein | Gold | 4,000 | 0.75 |
| Large Gold Vein | Gold | 8,000 | 0.75 |
| Small Stone Outcropping | Stone | 1,200 | 0.75 |
| Large Stone Outcropping | Stone | 2,400 | 0.75 |
| Meteorite (Craters / Crucible) | Gold + Stone | 4,000 gold and 4,000 stone | 0.75 for each resource (Mongols/Golden Horde: gold only) |
| Toko-Koji Mats (Sake Brewery, Sengoku Daimyo) | Gold | Infinite | 1.35 (not affected by gather technologies) |

Source: [Resource (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Resource_%28Age_of_Empires_IV%29)

Version history for the amounts above, from the same wiki family:

| Node | Current | Earlier values |
|---|---|---|
| Sheep | 200 | 250 before `patch 11.1.1201` (the page also cites 250 as the pre-`update 11.0.782` value) |
| Berry Bush | 250 | Gather rate 0.66 before `update 12.0.1974` (amount unchanged) |
| Wild Boar | 2,400 | 2,200 before `update 15.1.6970`; 2,000 before `update 12.0.1974` |
| Small Stone Outcropping | 1,200 | 1,500 before `update 17718` |
| Large Stone Outcropping | 2,400 | 3,000 before `update 17718` |

Sources: [Herdable Sheep](https://ageofempires.fandom.com/wiki/Sheep), [Berry Bush](https://ageofempires.fandom.com/wiki/Berry_Bush), [Wild Boar](https://ageofempires.fandom.com/wiki/Wild_Boar), [Stone Mine](https://ageofempires.fandom.com/wiki/Stone_Mine)

Additional node facts that matter for map/economy modelling:

| Node | Detail |
|---|---|
| Berry Bush | Orchard bonus: a Mill built by Abbasid Dynasty / Ayyubids / Delhi Sultanate raises the food in bushes within 5 tiles by +100 (250 → 350) |
| Berry Bush (Greek Islands biome) | Replaced by Prickly Pear Bush — identical stats (250 food, 0.69/s) |
| Deer groups | Small / medium / large / extra-large packs of 3 / 5 / 7 / 10 |
| Wild Boar | Fights back; cannot be gathered by Abbasid Dynasty, Ayyubids, Delhi Sultanate, Malians, Ottomans, Tughlaq Dynasty |
| Stone Outcropping footprints | Small 3×3 tiles, large 4×4 tiles |
| Meteorite | Gold and stone gathered simultaneously |

Source: [Resource (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Resource_%28Age_of_Empires_IV%29), [Stone Mine](https://ageofempires.fandom.com/wiki/Stone_Mine)

## 2. Carrying capacity

| Case | Carry capacity |
|---|---|
| Default, all resources | 10 |
| Hunted meat (deer, boar and other hunted carcasses) | 25 |
| Wheelbarrow | +5 (and +15% movement speed) |
| Crosscut Saw | +5 wood only |
| Hearty Rations (Delhi Sultanate) | +10 |
| Tawara / Takezaiku / Fudasashi (Japanese, Sengoku Daimyo) | +3 each (stacking, up to +9) |
| Pushcarts (Holy Roman Empire, Order of the Dragon) | +40% |
| Draft Horses (Jin Dynasty) | +10 wood only |

Source: [Villager (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Villager_%28Age_of_Empires_IV%29)

Note on the hunted-meat value: "With the Season One Update, hunted meat carry capacity was changed from 10 to 25" ([Villager (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Villager_%28Age_of_Empires_IV%29)). The +40% Pushcarts figure implies 14 on a 10 base; the wiki states only the percentage, so the derived 14 is **UNVERIFIED**.

## 3. Drop-off buildings

| Building | Accepts | Cost | HP | Build time | Notes |
|---|---|---|---|---|---|
| Town Center (non-capital) | Food, Wood, Gold, Stone | 400 wood + 300 stone | 2,500 | 150 s | Provides 10 population; 8 garrison slots |
| Capital Town Center | Food, Wood, Gold, Stone | Not buildable (starting building) | 7,000 | — | Acts as a landmark; 15 garrison slots; +2 range vs. non-capital TC |
| Mill | Food | 50 wood | 750 | 20 s | Also holds food-gathering technologies |
| Lumber Camp | Wood | 50 wood | 750 | 20 s | Also holds wood-gathering technologies |
| Mining Camp | Gold, Stone | 50 wood | 750 | 20 s | Also holds mining technologies |
| Dock | Food (and fish) | — | — | — | Food drop-off for water gathering |

Sources: [Resource (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Resource_%28Age_of_Empires_IV%29), [Town Center (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Town_Center_%28Age_of_Empires_IV%29), [Capital Town Center](https://ageofempires.fandom.com/wiki/Capital_Town_Center), [Mill (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Mill_%28Age_of_Empires_IV%29), [Lumber Camp (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Lumber_Camp_%28Age_of_Empires_IV%29), [Mining Camp (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Mining_Camp_%28Age_of_Empires_IV%29)

Civilization replacements (each replaces the generic list in that column):

| Building | Civilization | Replaces | Accepts |
|---|---|---|---|
| Ger | Mongols, Golden Horde | Mill + Lumber Camp + Mining Camp | Food, Wood, Gold (stone comes from the Ovoo) |
| Farmhouse | Japanese, Sengoku Daimyo | Mill + House | Food, and grants 10 population |
| Hunting Cabin | Rus | Mill | Food |
| Forge | Japanese, Sengoku Daimyo | Mining Camp | Gold, Stone |
| Worker Elephant | Tughlaq Dynasty | Mill, Lumber Camp, Mining Camp | Mobile drop-off |
| (none) | Knights Templar | Lumber Camp | Wood is dropped off automatically as it is gathered |

Sources: [Mill (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Mill_%28Age_of_Empires_IV%29), [Lumber Camp (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Lumber_Camp_%28Age_of_Empires_IV%29), [Mining Camp (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Mining_Camp_%28Age_of_Empires_IV%29), [Ger](https://ageofempires.fandom.com/wiki/Ger), [Farmhouse](https://ageofempires.fandom.com/wiki/Farmhouse)

Implementation note: resources are shown in the UI as integers but are stored with decimals internally, which is why the displayed stockpile can look sufficient while an action is rejected ([Resource (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Resource_%28Age_of_Empires_IV%29)).

## 4. Farms

| Property | Value |
|---|---|
| Cost | 75 wood (English: −50%, i.e. 37.5 wood, displayed 37) |
| Hit points | 300 |
| Pierce armour | 50, fire armour 0 |
| Build time | 6 seconds with 1 Villager (Chinese: 3 seconds) |
| Workers per Farm | Exactly 1 — "Only one Villager can work each Farm" |
| Food per Farm | Infinite (Farm is not depleted while harvested) |
| Gather rate | 0.75 food/second |
| Footprint | 2×2 tiles |
| Availability | All civilizations except Byzantines (Olive Grove), Mongols (Pasture), Golden Horde (Stockyard) |

Sources: [Farm (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Farm_%28Age_of_Empires_IV%29), [Resource (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Resource_%28Age_of_Empires_IV%29), [aoe4world/data — english/farm-1.json](https://raw.githubusercontent.com/aoe4world/data/main/buildings/english/farm-1.json)

Farm-related modifiers:

| Effect | Value |
|---|---|
| English "Island of Agriculture" | Farms cost −50% |
| English Mill influence | Farms within 2 tiles of a Mill gather 20% / 25% / 30% / 30% faster in Dark / Feudal / Castle / Imperial Age |
| Abbasid "Fertile Crescent" | Farm cost −30% |
| Abbasid "Agriculture" | Farm gather rate +15% |
| Golden Horde "Rotation Grazing", "Over Grazing" | +10% each |
| English "Enclosures" | +0.167 gold/second while a Farm is being farmed (listed as 10 gold/min per Farm on the passive-income table) |
| Legacy campaigns | Farms cost 100 wood and have a default gather rate of 1 food/second (campaigns were never rebalanced) |

Sources: [English](https://ageofempires.fandom.com/wiki/English), [Farm (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Farm_%28Age_of_Empires_IV%29), [Villager (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Villager_%28Age_of_Empires_IV%29), [Resource (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Resource_%28Age_of_Empires_IV%29)

Game-file representation (May 2022 export, patch 14681 — treat as dated): the Farm entity carries a resource-deposit extension with `initial_amount = 120`, `base_regrowth_rate = 75`, `work_to_enable = 80`, `gather_distance = 3.5`, `num_gatherers_to_assign_by_ai = 1`, `cannot_be_gathered_by_enemy = true`; the same extension on trees, berry bushes and stone/gold deposits has `base_regrowth_rate = -1` (no regrowth). The units of `base_regrowth_rate` are **UNVERIFIED**. Source: [aoemods/attrib — building_resource_farm.json](https://github.com/aoemods/attrib/blob/master/ebps/races/core/buildings/building_resource_farm.json)

## 5. Construction speed with N Villagers

Every building has a base build time equal to the time one Villager needs. Each additional Villager adds **+33% build speed**, producing diminishing returns. The wiki gives the following law, where `t` is the fraction of the base build time and `N` the number of Villagers:

`t = 3 / (N + 2)`

| Villagers (N) | Construction time (% of base) | Dark Age landmark (s) | Feudal Age landmark (s) | Castle Age landmark (s) |
|---|---|---|---|---|
| 1 | 100% | 190 | 220 | 250 |
| 2 | 75% | 143 | 165 | 188 |
| 3 | 60% | 114 | 132 | 150 |
| 4 | 50% | 95 | 110 | 125 |
| 5 | 43% | 81 | 94 | 107 |
| 6 | 38% | 71 | 83 | 94 |
| 7 | 33% | 63 | 73 | 83 |
| 8 | 30% | 57 | 66 | 75 |
| 9 | 27% | 52 | 60 | 68 |
| 10 | 25% | 48 | 55 | 63 |

Source: [Villager (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Villager_%28Age_of_Empires_IV%29)

## 6. Repair

| Repairing unit | Target | Rate |
|---|---|---|
| 1 Villager | Buildings or ships | 25 HP/second |
| 1 Villager | Siege engines, Sengoku Daimyo Yatai | 5 HP/second |
| Fishing Boat | Ships | 12.5 HP/second |
| Janissary | Siege engines | 2.5 HP/second |
| N Villagers | Ships or siege engines | Linear: N × the single-unit rate |
| N Villagers | Buildings (including packed Mongol buildings) | Diminishing; the page's fit is `s_R = −0.4384·N² + 11.831·N + 13.828` |

Source: [Repairing](https://ageofempires.fandom.com/wiki/Repairing)

Measured multi-Villager building repair rates:

| Villagers | Repair speed (HP/s) | Time to fully repair a 5,000 HP landmark (s) | Resource cost |
|---|---|---|---|
| 1 | 25 | 200 | 178 |
| 2 | 35.9 | 139 | 247 |
| 3 | 45.7 | 109 | 291 |
| 4 | 53.9 | 93 | 331 |
| 5 | 61.8 | 81 | 360 |
| 6 | 69.2 | 72 | 384 |

Source: [Repairing](https://ageofempires.fandom.com/wiki/Repairing)

Repair costs and history:

| Item | Value |
|---|---|
| Repair cost, buildings / siege engines / non-military ships | 1 wood per 1.125 seconds per repairing unit |
| Repair cost, military ships | 4 wood per 1.125 seconds per repairing unit |
| Repair cost, defensive buildings (Keeps, Stone Walls, Stone Wall Towers) | Also consumes stone |
| Base building repair rate history | Increased from 20 to 25 HP/s in `patch 8.2.218` |
| Siege repair rate history | 20 HP/s originally, reduced to 5 HP/s in `Season Two Update 17718` |
| Packed buildings | Repaired at building rate (not siege rate) since `update 7.0.5861` |
| Banco Repairs (Malians) | +50% building repair speed on this page; +100% on the Villager page — see Conflicts |

Source: [Repairing](https://ageofempires.fandom.com/wiki/Repairing)

## 7. Population

| Rule | Value |
|---|---|
| Maximum population cap, standard modes | 200 |
| Starting population space | 10 (from the Capital Town Center) |
| Population counter colour | Orange above 85% of the cap; red at or above the cap; no colour change when the cap is exactly 200 |
| Dominion mode | +50 cap per enemy Monarch killed, up to 550 |
| Mongols / Golden Horde | Start at the maximum population limit and never build Houses |
| Over-cap production | Training continues but the unit is not created until population space is free; single-population units are created before multi-population units |

Sources: [Population](https://ageofempires.fandom.com/wiki/Population), [Game mode (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Game_mode_%28Age_of_Empires_IV%29)

Buildings that provide population space:

| Building | Population provided |
|---|---|
| House | 10 (Malians: 5, at half cost and half build time) |
| Town Center | 10 |
| Capital Town Center | 10 |
| Village | 40 |
| Manor | 10 |
| Dock | 10 (French and Jeanne d'Arc only) |
| University | 30 (Holy Roman Empire only) |
| Keep with Village Fortresses | 10 (Delhi Sultanate only) |
| Ryokan (landmark) | 60 |
| King's Palace (landmark) | 10 |
| Palace of Swabia (landmark) | 10 |
| Farmhouse (Japanese, Sengoku Daimyo; replaces House + Mill) | 10 |

Source: [Population](https://ageofempires.fandom.com/wiki/Population)

Unit population costs:

| Unit class | Population cost | Verified examples |
|---|---|---|
| Villager | 1 | Villager (50 food, 20 s, 50 HP) |
| Standard land military and support | 1 | Scout, Spearman, Longbowman, Man-at-Arms, Horseman, Knight, Crossbowman, Monk, Trader, Siege Tower |
| Springald, Counterweight Trebuchet | 2 | — |
| Mangonel, Bombard, Ribauldequin | 3 | — |
| Siege engines, general range | 2 to 4 | stated as a range on the Population page |
| Order of the Dragon gilded units | 2 | Early Gilded Man-at-Arms |
| Elephants (Delhi Sultanate, Tughlaq Dynasty) | 2 to 3 | Tower Elephant 3, War Elephant 3 |
| Fishing Boat | 1 | — |
| Trade Ship, Demolition Ship | 2 | — |
| Transport Ship | 2 (Population page) / 1 (aoe4world data) — see Conflicts | — |
| Galley, Hulk (archer / springald ships) | 3 | — |
| Carrack, Grand Galley, Galleass (gunpowder ships) | 5 | Carrack 5 |
| Treasure Caravan, Pilgrim, Monarch | 0 | — |

Sources: [Population](https://ageofempires.fandom.com/wiki/Population), [aoe4world/data — units/english](https://github.com/aoe4world/data/tree/main/units/english), [aoe4world/data — units/delhi](https://github.com/aoe4world/data/tree/main/units/delhi), [aoe4world/data — units/orderofthedragon](https://github.com/aoe4world/data/tree/main/units/orderofthedragon)

## 8. Starting conditions

Standard (Skirmish "Standard") start: every player begins with a **Capital Town Center, six Villagers, and one scouting unit**; some civilizations start with more or fewer units or resources because of civilization bonuses. Nomad starts give one fewer Villager and no Capital Town Center (the player builds it for free anywhere). Most civilizations also own five Sheep at the start (House of Lancaster: nine, because "Wool Industries" grants +4 Sheep).

Sources: [Game mode (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Game_mode_%28Age_of_Empires_IV%29), [Resource (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Resource_%28Age_of_Empires_IV%29), [Herdable Sheep](https://ageofempires.fandom.com/wiki/Sheep), [House of Lancaster](https://ageofempires.fandom.com/wiki/House_of_Lancaster)

Starting stockpiles by civilization (as listed on each civilization page):

| Civilization | Food | Wood | Gold | Other |
|---|---|---|---|---|
| English | 200 | 200 | 100 | — |
| Rus | 200 | 200 | 100 | — |
| Delhi Sultanate | 200 | 200 | 100 | — |
| Abbasid Dynasty | 200 | 200 | 100 | — |
| Ayyubids | 200 | 200 | 100 | — |
| Order of the Dragon | 200 | 200 | 100 | — |
| House of Lancaster | 200 | 200 | 100 | — |
| Macedonian Dynasty | 200 | 200 | 100 | 100 silver |
| Ottomans | 200 | 200 | 100 | 50 stone |
| French | 200 | 150 | 100 | — |
| Chinese | 200 | 150 | 100 | — |
| Malians | 200 | 150 | 100 | — |
| Mongols | 200 | 150 | 100 | — |
| Japanese | 200 | 150 | 100 | — |
| Sengoku Daimyo | 200 | 150 | 100 | — |
| Jeanne d'Arc | 200 | 150 | 100 | — |
| Tughlaq Dynasty | 200 | 150 | 100 | — |
| Jin Dynasty | 200 | 150 | 100 | — |
| Holy Roman Empire | 200 | 150 | 0 (not listed) | — |
| Byzantines | 200 | 150 | 100 | 100 stone, 100 olive oil |
| Golden Horde | 200 | 200 (225 before `update 16.1.9737`) | 150 | 50 stone |
| Knights Templar | 200 | 100 | 100 | — |
| Zhu Xi's Legacy | 150 | 200 | 50 | — |

Source: individual civilization pages on [ageofempires.fandom.com](https://ageofempires.fandom.com/wiki/Age_of_Empires_IV), e.g. [English](https://ageofempires.fandom.com/wiki/English), [French (Age of Empires IV)](https://ageofempires.fandom.com/wiki/French_%28Age_of_Empires_IV%29), [Zhu Xi's Legacy](https://ageofempires.fandom.com/wiki/Zhu_Xi%27s_Legacy), [Golden Horde](https://ageofempires.fandom.com/wiki/Golden_Horde), [Holy Roman Empire](https://ageofempires.fandom.com/wiki/Holy_Roman_Empire), [Byzantines (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Byzantines_%28Age_of_Empires_IV%29)

Lobby "Starting resources" presets (Standard game mode):

| Preset | Food | Wood | Gold | Stone |
|---|---|---|---|---|
| Standard | 200 (varies by civilization, see table above) | 150 (varies by civilization; disputed — see Conflicts §1) | 100 | 0 |
| High | 2,000 | 2,000 | 1,000 | 800 |
| Very High | 50,000 | 50,000 | 25,000 | 1,000 (written "10,00" on the page) |
| Maximum | 100,000 | 100,000 | 100,000 | 100,000 |

Source: [Game mode (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Game_mode_%28Age_of_Empires_IV%29)

Starting units differ from the six-Villager baseline in a few verified cases:

| Civilization / mode | Deviation |
|---|---|
| Mongols | Start with their Town Center in packed (mobile) form |
| Mongols, Golden Horde | Start at maximum population; no Houses needed |
| House of Lancaster | Start with nine Sheep instead of five |
| Nomad mode | One fewer Villager, no Capital Town Center |

Source: [Capital Town Center](https://ageofempires.fandom.com/wiki/Capital_Town_Center), [Population](https://ageofempires.fandom.com/wiki/Population), [Herdable Sheep](https://ageofempires.fandom.com/wiki/Sheep), [Game mode (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Game_mode_%28Age_of_Empires_IV%29)

## 9. Economic technology multipliers

### 9.1 Generic economy technologies (costs are the English values)

| Technology | Age | Effect | Cost | Research time |
|---|---|---|---|---|
| Forestry | Dark (1) | Double the rate at which Villagers chop down trees | 25 food, 50 gold | 45 s |
| Survival Techniques | Dark (1) | +15% Villager hunted-meat gather rate (does not affect herdables or fish) | 25 wood, 75 gold | 25 s |
| Wheelbarrow | Dark (1) | +5 Villager carry capacity, +15% movement speed | 50 wood, 150 gold | 90 s |
| Horticulture | Feudal (2) | +10% Villager food gather rate (does not apply to hunted meat) | 50 wood, 100 gold | 45 s |
| Double Broadax | Feudal (2) | +15% Villager wood gather rate | 50 food, 100 gold | 45 s |
| Specialized Pick | Feudal (2) | +15% Villager gold and stone gather rate | 50 wood, 100 gold | 45 s |
| Professional Scouts | Feudal (2) | Scouts carry animal carcasses, +100% damage vs. wild animals; −55% speed while carrying; cannot pick up Boar; deer decay while carried | 150 wood, 300 gold | 75 s |
| Fertilization | Castle (3) | +10% Villager food gather rate (does not apply to hunted meat) | 100 wood, 250 gold | 60 s |
| Lumber Preservation | Castle (3) | +15% Villager wood gather rate | 100 food, 250 gold | 60 s |
| Shaft Mining | Castle (3) | +15% Villager gold and stone gather rate | 100 wood, 250 gold | 60 s |
| Precision Cross-Breeding | Imperial (4) | +10% Villager food gather rate (does not apply to hunted meat) | 250 wood, 500 gold | 75 s |
| Crosscut Saw | Imperial (4) | +15% Villager wood gather rate, +5 wood carry capacity | 250 food, 500 gold | 75 s |
| Cupellation | Imperial (4) | Gold gatherers drop off 15% more resources | 250 wood, 500 gold | 75 s |

Sources: [aoe4world/data — technologies/english](https://github.com/aoe4world/data/tree/main/technologies/english), [aoe4world/data — technologies/unified](https://github.com/aoe4world/data/tree/main/technologies/unified), [Survival Techniques](https://ageofempires.fandom.com/wiki/Survival_Techniques), [Villager (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Villager_%28Age_of_Empires_IV%29)

### 9.2 Food multipliers

| Modifier | Effect |
|---|---|
| Horticulture → Fertilization → Precision Cross-Breeding | +10% each, all food except hunted meat and fish |
| Survival Techniques | +15% hunted meat |
| Mohe Ancestry (Jin Dynasty) | +20% hunted meat |
| Hunting Tradition (Jin Dynasty) | +20% hunted meat |
| Agriculture (Abbasid Dynasty) | +15% Farms and equivalents |
| Rotation Grazing / Over Grazing (Golden Horde) | +10% each, Farms |
| Tawara / Takezaiku / Fudasashi (Japanese, Sengoku Daimyo) | +25% Berry Bush gather rate each, stacking |
| Berry Bush base bonus (Abbasid Dynasty, Ayyubids, Delhi Sultanate) | Gather rate 0.69 → 0.8625 (+25%), plus +3 berry carry capacity, plus the Mill orchard +100 bush food |
| Rus bounty | +15% food gather rate at 250 bounty, +20% at 1,000 bounty (values after `patch 16.2.10604`) |
| Mongol improved technologies | Horticulture +30% (instead of +10%), Survival Techniques +25% (instead of +15%) |
| Chinese "Ancient Techniques" | +5% to all gathering per Dynasty |

Sources: [Villager (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Villager_%28Age_of_Empires_IV%29), [Resource (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Resource_%28Age_of_Empires_IV%29), [Rus](https://ageofempires.fandom.com/wiki/Rus), [English](https://ageofempires.fandom.com/wiki/English)

### 9.3 Wood multipliers

| Modifier | Effect |
|---|---|
| Double Broadax → Lumber Preservation → Crosscut Saw | +15% each |
| Crosscut Saw | Also +5 wood carry capacity |
| Draft Horses (Jin Dynasty) | +15% wood gather rate and +10 wood carry capacity |
| Forestry | Doubles the rate at which trees are chopped down (tree HP consumption, not wood/second) |
| Mongol improved technologies | Double Broadax +35% (instead of +15%) |
| Knights Templar | Base wood gather rate 0.60/s instead of the standard 0.75/s |
| Rus influence | Villagers drop off +20% wood at Lumber Camps and Town Centers inside a Wooden Fortress aura |

Sources: [Villager (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Villager_%28Age_of_Empires_IV%29), [aoe4world/data — technologies/english](https://github.com/aoe4world/data/tree/main/technologies/english), [Knights Templar](https://ageofempires.fandom.com/wiki/Knights_Templar), [Rus](https://ageofempires.fandom.com/wiki/Rus)

### 9.4 Gold, stone and drop-off multipliers

| Modifier | Effect |
|---|---|
| Specialized Pick → Shaft Mining | +15% each to gold and stone gather rate |
| Anatolian Hills (Ottomans) | +15% gold and stone gather rate |
| Cupellation | +15% more gold dropped off |
| Improved Processing (Abbasid Dynasty) | +8% resources dropped off |
| Imperial Official Supervision (Chinese) | +20% gold dropped off (plus +150% work rate on the supervised building) |
| Mongol improved technologies | Specialized Pick +35% (instead of +15%) |
| Woven Baskets / Carrying Frame / Elephant Harness (Tughlaq Dynasty) | +5% each, all gathering (they replace the generic gather-rate technologies) |
| Wheelbarrow (Mongols improved) | +9 carry capacity |
| Hearty Rations (Delhi Sultanate) | +10 Villager carry capacity |

Source: [Villager (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Villager_%28Age_of_Empires_IV%29)

Civilization-level modifiers that change technology availability or price: Delhi Sultanate technologies are free but take 3× as long to research; French and Jeanne d'Arc economic technologies are 35% cheaper (30% before `patch 11.1.1201`); Abbasid Dynasty technologies cost −20% with Preservation of Knowledge; House of Lancaster technologies are 20% cheaper with King's College ([Survival Techniques](https://ageofempires.fandom.com/wiki/Survival_Techniques)).

Baseline Villager statistics for reference: 50 food, 20 seconds to train, 50 HP, 1.125 tiles/second (the wiki writes 1.12), 1 population, carry capacity 10 (25 for hunted meat).

Sources: [Villager (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Villager_%28Age_of_Empires_IV%29), [aoe4world/data — units/english/villager-1.json](https://raw.githubusercontent.com/aoe4world/data/main/units/english/villager-1.json)

## 10. Conflicts and gaps

1. **Starting wood: 200 vs. 150.** The *Game mode (Age of Empires IV)* and *Resource (Age of Empires IV)* pages both say the standard start is "generally 200 food, 150 wood, 100 gold". Nine civilization pages (English, Rus, Delhi Sultanate, Abbasid Dynasty, Ayyubids, Order of the Dragon, House of Lancaster, Macedonian Dynasty, Zhu Xi's Legacy) list 200 wood, while eleven others list 150 wood and Knights Templar lists 100 wood. The English entry is the cleanest baseline (200/200/100), so 200 wood is the better reading for the default start; the two summary pages appear to be out of date. Source: [Game mode (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Game_mode_%28Age_of_Empires_IV%29), [English](https://ageofempires.fandom.com/wiki/English)
2. **English Mill influence on Farms.** The *Mill* page says 15% / 20% / 25% / 30% by Age; the *English* page says 20% / 25% / 30% / 30% since `update 14.0.4963`. The English page is newer and self-consistent with its own changelog, so 20/25/30/30 is the current value. Sources: [Mill (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Mill_%28Age_of_Empires_IV%29), [English](https://ageofempires.fandom.com/wiki/English)
3. **Stone Outcropping amounts.** The `aoemods/attrib` game-file export (patch 14681, May 2022) has 1,500 (small) and 3,000 (large); the wiki gives 1,200 and 2,400 and explicitly notes 1,500/3,000 as the values "before `update 17718`". The wiki values are newer. Source: [Stone Mine](https://ageofempires.fandom.com/wiki/Stone_Mine), [aoemods/attrib](https://github.com/aoemods/attrib/blob/master/ebps/gameplay/resources/stone/resource_stone_deposit.json)
4. **Boar and Sheep amounts.** The same 2022 game-file export has Boar 2,000 and Sheep 250, matching the wiki's "before" values (2,000 before `update 12.0.1974`; 250 before `patch 11.1.1201`). Current: Boar 2,400, Sheep 200. Sources: [Wild Boar](https://ageofempires.fandom.com/wiki/Wild_Boar), [Herdable Sheep](https://ageofempires.fandom.com/wiki/Sheep), [aoemods/attrib](https://github.com/aoemods/attrib/blob/master/ebps/gaia/animals/gaia_huntable_boar.json)
5. **Banco Repairs (Malians).** The *Repairing* page says it increases building repair speed by 50%; the *Villager* page lists +100%. Unresolved. Sources: [Repairing](https://ageofempires.fandom.com/wiki/Repairing), [Villager (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Villager_%28Age_of_Empires_IV%29)
6. **Transport Ship population cost.** The *Population* page says Transport Ships cost 2; the `aoe4world/data` parse of the English Transport Ship reports `popcap: 1`. Unresolved. Sources: [Population](https://ageofempires.fandom.com/wiki/Population), [aoe4world/data — transport-ship-2.json](https://raw.githubusercontent.com/aoe4world/data/main/units/english/transport-ship-2.json)
7. **Cupellation scope.** The *Mining Camp* page describes Cupellation as "Villagers drop off +15% more gold" (gold only); the *Villager* page groups it under drop-off bonuses that include gold/stone and describes it as "+15% gold/stone". Unresolved. Sources: [Mining Camp (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Mining_Camp_%28Age_of_Empires_IV%29), [Villager (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Villager_%28Age_of_Empires_IV%29)
8. **Zhu Xi's Legacy farm cost.** The *Farm* page says Zhu Xi's Legacy has cheaper Farms; the `aoe4world/data` farm file for Zhu Xi's Legacy shows the standard 75 wood, and the civilization page mentions no farm discount. No English-style discount is confirmed for Zhu Xi's Legacy. Sources: [Farm (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Farm_%28Age_of_Empires_IV%29), [aoe4world/data — zhuxi/farm-1.json](https://raw.githubusercontent.com/aoe4world/data/main/buildings/zhuxi/farm-1.json)
9. **English farm cost precision.** The English bonus is −50%, so the true cost is 37.5 wood; the `aoe4world/data` parse stores the integer 37, and the wiki infobox shows 75 for the generic Farm. Whether the engine charges 37.5 (with the stockpile tracked to decimals) or 37 is **UNVERIFIED**.
10. **Farm gather rate single-sourced.** The 0.75 food/second figure for Farms comes only from the *Resource (Age of Empires IV)* gather-rate table; the *Farm* page itself gives no rate (it points to the Villager page instead). No second independent source was found.
11. **Farm internal model.** The game-file export models a Farm as a 120-food node with `base_regrowth_rate = 75`, which is not the same as "infinite food". The unit of `base_regrowth_rate` and whether this is still the live model are **UNVERIFIED**; no current source confirms the mechanism.
12. **Technology stacking rule.** Whether the +10%/+15% technology percentages stack additively on the base rate or multiply with each other is not stated on any consulted page — **UNVERIFIED**.
13. **Build-speed formula fidelity.** The wiki presents `t = 3 / (N + 2)` as "this kind of law" with example times, alongside the simpler statement "+33% per Villager". The table fits the formula exactly, but whether the engine implements the formula or a per-Villager construction-rate multiplier is **UNVERIFIED**. The formula also does not reproduce landmark build times exactly (190 s × 3/4 = 142.5 vs. the listed 143 s).
14. **Multi-Villager building repair formula.** The quadratic fit `s_R = −0.4384·N² + 11.831·N + 13.828` is described on the wiki as "something close to" the real formula, i.e. it is an approximation, not a confirmed game rule.
15. **Very High stone preset typo.** The lobby table writes `stone = 10,00` for the "Very High" preset; 1,000 is the intended value but this is **UNVERIFIED**.
16. **Holy Roman Empire starting gold.** The HRE civilization page lists only food 200 and wood 150 under "Starting resources", with no gold entry. Whether HRE starts with 0 gold or the page is simply incomplete is **UNVERIFIED**.
17. **Per-civilization starting unit lists.** Only the six-Villager-plus-scout baseline and the deviations in Section 8 are confirmed; a full per-civilization starting-unit table is not documented on the wiki pages consulted — **UNVERIFIED**.
18. **Hunted-meat carry capacity scope.** The value 25 is documented as "hunted meat" on the Villager page; whether it applies to every hunted carcass (deer, reindeer, boar) and to Scout-carried carcasses is not spelled out — **UNVERIFIED**.
19. **Data repository staleness and fetch access.** `aoemods/attrib` is a May 2022 export (patch 14681, commit `b8cce48`), so every value taken from it must be treated as historical. The current, maintained source is `aoe4world/data`, which is itself a parse of player-visible tooltips and does not expose gather rates at all. `aoe4world.com` HTML pages and direct page views of `ageofempires.fandom.com` returned HTTP 403 during this research, so all wiki content was read through the MediaWiki API (`action=parse`, `prop=wikitext`) on the same domain and all aoe4world content through `raw.githubusercontent.com`.
20. **Not covered here.** Trade income rates, Market buy/sell prices and taxes, sacred-site and relic passive income, and landmark-specific economy bonuses are out of scope for this document.
