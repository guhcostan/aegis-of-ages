# Civilisations: English and French

Reference data for the English and French civilisations of *Age of Empires IV*, restricted to numbers and rules.

**Transcription rules.** Every figure below is traceable to a linked source. Where sources disagree, both readings are given and the newer one is identified. Items that could not be confirmed are tagged **UNVERIFIED**. Prose is paraphrased from tooltips and wiki data; no source text is reproduced.

## Source set and versions

| Source | Version / revision | Role |
|---|---|---|
| [aoe4world/data](https://github.com/aoe4world/data) (`civilizations/`, `units/`, `technologies/`, `abilities/`, `buildings/`) | commit `b2cd382`, "Added Jin Dynasty and Season 13 patch 16.1.9737 data" | Parsed game data; primary numeric source |
| [ageofempires.fandom.com](https://ageofempires.fandom.com/) | English page revised 2026-07-27; French page 2026-07-13 | Tooltip text, changelogs, historical values |
| [aoemods/attrib](https://github.com/aoemods/attrib) | commit `b8cce48`, May 2022 (patch 14681 era) | Raw game attribute files — **stale**; used only to confirm structure and pre-nerf values |
| [aoe4world.com](https://aoe4world.com/) | Cloudflare-protected; returned HTTP 403 to automated fetch | Cited as the hosting site for the data repo only |

Source: [aoe4world/data on GitHub](https://github.com/aoe4world/data), [aoemods/attrib on GitHub](https://github.com/aoemods/attrib)

---

# 1. English

Focus: Defence, Longbows, Farming. Starting resources: **200 food, 200 wood, 100 gold**.

## 1.1 Civilisation bonuses

| Bonus | Exact numeric effect |
|---|---|
| **Island of Agriculture** | Farms cost **−50%** (75 wood → 37 wood in the parsed data; 37.5 nominal) |
| **Call to Arms** | Vanguard Man-at-Arms available in Dark Age (I). Men-at-Arms train **+40% faster** (was +50% before update 16.1.9737; the bonus was cut so English Man-at-Arms stayed at ~15 s after generic Man-at-Arms training time was reduced — exact value 14.65 s vs 20.5 s for the French equivalent) |
| **Defensive Byrig** | Capital Town Center fires **one extra arrow**. Villagers attack with a short **bow** (5 ranged damage, 5 tile range) instead of the standard villager knife (6 melee damage) |
| **Network of Castles** | Town Centers, Outposts, Stone Wall Towers and Keeps grant **+20% attack speed** to nearby units while enemies are in range. Aura radius in the ability data: **12.5 tiles** |
| **Network of Citadels** (technology) | Raises the Network of Castles bonus from **+20% to +30%** (was +40% before patch 12.1.2454) |
| **Shipwrights** | Ships cost **−10%** |
| **Keep Production** | Keeps (and Keep-type landmarks) can produce **all land military units** |
| **Influence — Mill → Farms** | Farms inside a Mill's influence gather **+20% / +25% / +30% / +30%** by Age (I / II / III / IV). Influence range 2 tiles, passive spread 0 |
| **Kingswood / Setup Camp** | Scouts and Men-at-Arms place a Campfire for **25 wood**: max **5** active, **100 HP**, Feudal Age, aura radius **6 tiles**, **+30% line of sight**, **+10% gather rate from huntable animals** |

**English Mill influence conflict.** The English civ page and the aoe4world civ data give **20/25/30/30%**, with the civ page changelog stating the values were raised from 15/20/25/30% in update 14.0.4963. The Fandom *Influence* page table still lists the **old 15% / 20% / 25% / 30%**. The civ page (revised 2026-07-27) is newer than the Influence page (revised 2026-06-23), so **20/25/30/30% is the current reading**.

Sources: [English (Fandom)](https://ageofempires.fandom.com/wiki/English), [Influence (Fandom)](https://ageofempires.fandom.com/wiki/Influence_(Age_of_Empires_IV)), [Campfire (Fandom)](https://ageofempires.fandom.com/wiki/Campfire)

## 1.2 Unique units

| Unit | Age / produced at | Cost | Train | HP | Attack | Armour | Speed | What makes it different |
|---|---|---|---|---|---|---|---|---|
| **Longbowman** | Feudal; Archery Range, Keep, Council Hall, Berkshire Palace, The White Tower | 40 food, 50 wood | 15 s (7.5 s from Council Hall) | 70 / 80 / 95 | Ranged 6 / 8 / 9; +6 / +8 / +9 vs Light melee infantry and Light gunpowder infantry | 0 / 0 | 1.125 | Replaces the Archer: **+2 range** (7 vs 5), **+1 damage**, range 7, rate of fire 1.625 s. Slower than the Archer (1.125 vs 1.25) and +10 food |
| **Wynguard Ranger** | Imperial; Wynguard Palace only | 450 wood + 300 gold per **batch of 6** | 45 s | 125 | Ranged 12; +12 vs Light melee infantry | 0 / 0 | 1.125 | Upgraded Longbowman: range **8**, keeps Place Palings (25 damage) and Arrow Volley. Batch-only production |
| **Wynguard Footman** | Imperial; Wynguard Palace only | 300 food + 400 gold per **batch of 6** | 45 s | 280 | Melee 20; +5 vs Cavalry | 3 melee / 6 ranged | 1.125 | Stronger Man-at-Arms: HP 280 vs Elite Man-at-Arms 180, melee 20 vs 14, but armour 3 vs 5 and rate of fire 1.625 s vs 1.375 s. Batch-only production |
| **King** | Feudal; Abbey of Kings, limit **1** | 100 food, 100 gold | 50 s | 220 / 295 / 395 by Age | Melee 16 / 20 / 25; charge +8 / +6 / +4 | 2 / 3 / 4 melee and ranged | 1.69 | Hero heavy cavalry. Heals nearby out-of-combat units **2 HP/s** (lesser version of the Abbey aura). **Cannot be converted** |

> **Note:** the aoe4world data flags the Wynguard Footman as `unique: false`, even though it is English-only and produced solely at the Wynguard Palace. The Fandom civ page lists it as a unique unit.

Sources: [Longbowman (Fandom)](https://ageofempires.fandom.com/wiki/Longbowman_(Age_of_Empires_IV)), [Wynguard Ranger (Fandom)](https://ageofempires.fandom.com/wiki/Wynguard_Ranger), [Wynguard Footman (Fandom)](https://ageofempires.fandom.com/wiki/Wynguard_Footman), [King (Fandom)](https://ageofempires.fandom.com/wiki/King_(Age_of_Empires_IV))

### 1.2.1 English unique unit abilities

| Ability | Owner | Exact effect |
|---|---|---|
| **Place Palings** | Longbowman, Wynguard Ranger | Enemy cavalry running into the palings are **stunned 2.5 s** and take **19 / 24 / 30** damage by Longbowman tier (**25** for Wynguard Ranger). Palings vanish on moving. **30 s** cooldown |
| **Arrow Volley** (needs the Arrow Volley technology) | Longbowman, Wynguard Ranger | Two readings: the Arrow Volley tech page and the aoe4world ability data say **reduce base attack time by 1 s for 6 s**, cooldown **45 s**. The Longbowman page says **+70% attack speed for 5 s**, cooldown 45 s. The tech page also notes the realised effect is inconsistent and depends on stacked bonuses (with Network of Castles, attack time falls 1.37 s → 0.6 s; with Network of Citadels, 1.29 s → 0.46 s) |
| **Setup Camp** | Scout, Man-at-Arms | Places a Campfire (see 1.1). Cost 25 wood; cooldown 0.125 s |

Sources: [Arrow Volley (Fandom)](https://ageofempires.fandom.com/wiki/Arrow_Volley), [Longbowman (Fandom)](https://ageofempires.fandom.com/wiki/Longbowman_(Age_of_Empires_IV))

## 1.3 Unique technologies

| Technology | Building | Age | Cost | Research time | Effect |
|---|---|---|---|---|---|
| **Armor Clad** | Barracks | Castle (III) | 150 food, 350 gold | **60 s** (Fandom says 30 s — see conflicts) | Men-at-Arms and Wynguard Footmen gain **+2 melee armour and +2 ranged armour** |
| **Network of Citadels** | Keep, The White Tower, Berkshire Palace | Castle (III) | 150 stone, 350 gold | 45 s | Network of Castles attack speed bonus raised from **+20% to +30%** |
| **Admiralty** | Dock | Feudal (II) | 150 food, 350 gold | 30 s | **+1 range** for Galley, Hulk and Carrack |
| **Enclosures** | Mill | Imperial (IV) | 150 wood, 350 gold | 60 s | Each Farm being worked by a Villager generates **+1 gold every 6 s** (= **10 gold/min** per working farmer; walking time counts) |
| **Arrow Volley** | Archery Range, Council Hall | Imperial (IV) | 150 wood, 350 gold | 60 s | Longbowmen and Wynguard Rangers gain the Arrow Volley ability |
| **Shattering Projectiles** | Siege Workshop | Imperial (IV) | 300 wood, 700 gold | 90 s | Counterweight Trebuchet projectiles shatter on impact: **area-of-effect radius 0.375 tiles**, splash damage **85–90% of base damage** |

English has **6** unique technologies (matches the in-game tech count of 6).

Sources: [Armor Clad](https://ageofempires.fandom.com/wiki/Armor_Clad), [Network of Citadels](https://ageofempires.fandom.com/wiki/Network_of_Citadels), [Admiralty](https://ageofempires.fandom.com/wiki/Admiralty), [Enclosures](https://ageofempires.fandom.com/wiki/Enclosures), [Shattering Projectiles](https://ageofempires.fandom.com/wiki/Shattering_Projectiles), [aoe4world/data technologies](https://github.com/aoe4world/data)

## 1.4 Landmarks (age-up options)

| Landmark | Age | Cost | Build time | Effect |
|---|---|---|---|---|
| **Abbey of Kings** | Dark → Feudal | 400 food, 200 gold | 190 s | Heals out-of-combat friendly units within a **7.5 tile radius** at **6 HP/s**; can crown the King |
| **Council Hall** | Dark → Feudal | 400 food, 200 gold | 190 s | Acts as an Archery Range with **+100% production speed** (Longbowman 15 s → 7.5 s) |
| **King's Palace** | Feudal → Castle | 1,200 food, 600 gold | 220 s | Faster Town Center, **5,000 HP**, +10 population, 10 garrison, garrison arrow 6 damage, range 6 tiles, influence radius 12.5 tiles |
| **The White Tower** | Feudal → Castle | 1,200 food, 600 gold | 220 s | Keep-type; **5,000 HP**, garrison 15, arrowslits 12 × 3 at 0.5 s, range 8 tiles, +10 vs ships, fire armour 6 |
| **Berkshire Palace** | Castle → Imperial | 2,400 food, 1,200 gold | 250 s | Improved Keep, **6,500 HP**, all weapons **14.5 tiles** range, arrowslits 14 × 3, garrison 20 |
| **Wynguard Palace** | Castle → Imperial | 2,400 food, 1,200 gold | 250 s | Trains unique and mixed armies in batches, at reduced cost |

Wynguard Palace batch options (all Imperial Age):

| Batch | Composition | Cost | Train | Pop |
|---|---|---|---|---|
| Wynguard Rangers | 6 × Wynguard Ranger | 450 wood, 300 gold | 45 s | 6 |
| Wynguard Footmen | 6 × Wynguard Footman | 300 food, 400 gold | 45 s | 6 |
| Wynguard Army | 2 Spearmen, 2 Crossbowmen, 1 Counterweight Trebuchet | 100 food, 100 wood, 200 gold | **55 s** (Fandom says 75 s) | **6** (Fandom says 7) |
| Wynguard Raiders | 3 Horsemen, 3 Knights | 650 food, 200 gold | 25 s | 6 |

Sources: [Abbey of Kings](https://ageofempires.fandom.com/wiki/Abbey_of_Kings), [Council Hall](https://ageofempires.fandom.com/wiki/Council_Hall), [King's Palace](https://ageofempires.fandom.com/wiki/King%27s_Palace), [The White Tower](https://ageofempires.fandom.com/wiki/The_White_Tower), [Berkshire Palace](https://ageofempires.fandom.com/wiki/Berkshire_Palace), [Wynguard Palace](https://ageofempires.fandom.com/wiki/Wynguard_Palace)

---

# 2. French

Focus: Trade, Cavalry, Keeps. Starting resources: **200 food, 150 wood, 100 gold**.

## 2.1 Civilisation bonuses

| Bonus | Exact numeric effect |
|---|---|
| **Royal Stallions** | Royal Knight (the French heavy cavalry) available in the **Feudal Age (II)**, one Age earlier than the generic Knight |
| **Mainland Economy — drop-offs** | Resource drop-off buildings cost **−50%**: Mill, Lumber Camp, Mining Camp cost **25 wood** instead of 50 |
| **Mainland Economy — technologies** | Economic technologies cost **−35%** (was −30% before patch 11.1.1201). The –35% is not applied everywhere in the parsed data — see conflicts |
| **Mainland Economy — Town Centers** | Town Centers work **+15% / +15% / +20% / +25%** faster by Age (I / II / III / IV) |
| **Trade Economy — visibility** | Trade Posts are **fully revealed on the map and minimap** at game start (minimap only before patch 11.1.1201). The aoe4world civ data still says minimap only |
| **Trade Economy — resource choice** | Traders and Trade Ships can return **Food, Wood or Gold** to Markets. Stone is excluded (removed in update 24916) |
| **Trade Economy — Trade Ships** | Trade Ships return a **+20% bonus consisting of all resources** (gold only before Season Two Update 17718) |
| **Trade Economy — Docks** | Docks provide **10 population space** (since update 12.0.1974) |
| **Smithy's Grace** | Melee damage technologies (**Bloomery**, **Decarbonization**, **Damascus Steel**) are researched **free** at the Blacksmith after each age-up. Confirmed in the parsed data: these upgrades carry zero cost for the French |
| **Influence — Keep → production** | Keeps and the Red Palace **reduce the cost of units produced from Archery Ranges and Stables (and the School of Cavalry) within their influence by 20%**. Influence range 2 tiles, passive spread 0. Keeps themselves cost **−10%** (810 stone vs 900) |
| **Enlistment Incentives** (technology) | Improves the Keep influence reduction by a **further 5%** (20% → 25%) |
| **War Cog** | The springald ship is replaced by the War Cog: **−35 food** (75 food vs 110) and **+1 pierce armour** (4 vs 3) |

Sources: [French (Fandom)](https://ageofempires.fandom.com/wiki/French_(Age_of_Empires_IV)), [Influence (Fandom)](https://ageofempires.fandom.com/wiki/Influence_(Age_of_Empires_IV))

## 2.2 Unique units

| Unit | Age / produced at | Cost | Train | HP | Attack | Armour | Speed | What makes it different |
|---|---|---|---|---|---|---|---|---|
| **Royal Knight** | Feudal; Stable, School of Cavalry | 140 food, 100 gold | 35 s | 190 / 230 / 270 | Melee 19 / 24 / 29; charge bonus **+3 melee damage for 5 s** | 3 / 4 / 5 melee and ranged | 1.625 | French heavy cavalry. Gains bonus damage for **5 s after completing a charge**. With **Cantled Saddles** the charge bonus rises by +7 to a total of **+10**. Rate of fire 1.5 s |
| **Arbalétrier** | Castle; Archery Range | 80 food, 40 gold | 22.5 s (Fandom: 23 s) | 80 / 95 | Ranged 11 / 14; **+10 / +12 vs Heavy** | **1 / 2 melee**, 0 ranged | 1.125 | Replaces the Crossbowman. Base melee armour is **+1 (+2 elite)** where the Crossbowman has 0, and it has the Pavise ability plus two unique technologies. Range 5, rate of fire 2.125 s |
| **Cannon** | Imperial; Siege Workshop | 300 wood, 600 gold | 45 s | 190 | Siege 60; **+500 vs naval unit, +450 vs building, +55 vs infantry, +55 vs war elephant** | 0 | 0.875 | Bombard replacement: **+5 damage**, **+0.125 speed**, cheaper wood and pricier gold. Range 3.75–10, rate of fire 5.375 s |
| **Galleass** | Castle; Dock | 360 wood, 300 gold | 50 s | 700 | Ranged (bombard) 130, forward-mounted | 1 ranged, 0 fire | 1.0 | Large war galley, **area-of-effect radius 0.375 tiles**, range 8, rate of fire 5.125 s, population 5 |
| **War Cog** | Feudal; Dock | 75 food, 200 wood, 30 gold | 30 s | 450 | Ballista 35; **+45 vs archer ship, +55 vs building**. Secondary cannon 40 siege damage | **4 ranged** | 1.375 | Replaces the springald ship at −35 food and +1 pierce armour. Population 3 |

> The Fandom French infobox lists 4 unique units (Royal Knight, Arbalétrier, Galleass, Cannon); the aoe4world civ data additionally surfaces the **War Cog**. Both are shown above.

Sources: [Royal Knight (Fandom)](https://ageofempires.fandom.com/wiki/Royal_Knight), [Arbalétrier (Fandom)](https://ageofempires.fandom.com/wiki/Arbal%C3%A9trier), [Galleass (Fandom)](https://ageofempires.fandom.com/wiki/Galleass_(Age_of_Empires_IV)), [Springald ship (Fandom)](https://ageofempires.fandom.com/wiki/Springald_ship)

### 2.2.1 French unique unit abilities

| Ability | Owner | Exact effect |
|---|---|---|
| **Royal Knight Charge** (passive, always on) | Royal Knight | **+3 melee attack damage for 5 s** after charging. Cantled Saddles replaces the +3 with **+10** |
| **Deploy Pavise** (active) | Arbalétrier | Instantly grants **+5 ranged armour and +1 tile weapon range** for **30 s**, or until the Arbalétrier moves. Cooldown **60 s**. The Fandom French civ page lists only the +5 ranged armour and omits the +1 range; the Arbalétrier unit page and the aoe4world ability data both include it |

Sources: [Royal Knight (Fandom)](https://ageofempires.fandom.com/wiki/Royal_Knight), [Arbalétrier (Fandom)](https://ageofempires.fandom.com/wiki/Arbal%C3%A9trier), [aoe4world/data abilities](https://github.com/aoe4world/data)

### 2.2.2 College of Artillery royal variants

The College of Artillery landmark trains Royal variants of the gunpowder siege units available from the Castle Age. Parsed stats:

| Unit | Cost | Train | HP | Attack | Note |
|---|---|---|---|---|---|
| Royal Cannon | 300 wood, 600 gold | 45 s | 190 | Siege 60 | Identical to the Imperial-Age French Cannon |
| Royal Culverin | 325 wood, 550 gold | 45 s | 200 | Siege 40; +230 vs naval unit, +215 vs building, +50 vs infantry | Same cost and damage as the generic Culverin in the data |
| Royal Ribauldequin | 350 wood, 500 gold | 45 s | 215 | Ranged 42, range 3.75 | Same cost and damage as the generic Ribauldequin in the data |

The Fandom landmark page states the Royal variants "cost 25% less gold, deal more damage, and have additional abilities" relative to their regular versions. **The aoe4world data does not encode either the −25% gold or the damage bonus** on the unit entries, so the discount is most likely a runtime landmark aura rather than a base-stat change. Treat the −25% gold and "additional abilities" as **UNVERIFIED against parsed data**.

Sources: [College of Artillery (Fandom)](https://ageofempires.fandom.com/wiki/College_of_Artillery), [aoe4world/data units](https://github.com/aoe4world/data)

## 2.3 Unique technologies

| Technology | Building | Age | Cost | Research time | Effect |
|---|---|---|---|---|---|
| **Chivalry** | Stable, School of Cavalry, Royal Institute | Feudal (II) | 100 wood, 200 gold | 60 s | Royal Knights regenerate **+1 HP/s** while out of combat |
| **Cantled Saddles** | Stable, School of Cavalry, Royal Institute | Castle (III) | 75 food, 200 gold | 45 s | Royal Knight post-charge bonus damage **+7**, bringing the total to **+10** (duration stays 5 s) |
| **Gambesons** | Archery Range, Royal Institute | Castle (III) | 100 wood, 250 gold | 45 s | Arbalétrier **melee armour +5** |
| **Crossbow Stirrups** | Archery Range (Imperial), Royal Institute (Castle) | III at Royal Institute / IV at Archery Range | 300 food, 700 gold | 90 s | Arbalétrier **attack speed +25%** |
| **Enlistment Incentives** | Keep, Red Palace (Imperial), Royal Institute (Castle) | III at Royal Institute / IV at Keep | 150 food, 350 gold | 60 s | Keep influence unit-cost reduction improved by **a further 5%** (20% → 25%) |
| **Royal Bloodlines** | University (Imperial), Royal Institute (Castle) | III at Royal Institute / IV at University | 300 food, 700 gold | 90 s | **All cavalry HP +35%** (was +40% between update 12.0.1974 and patch 12.1.2454). Replaces Biology |
| **Long Guns** | Dock (Imperial), Royal Institute (Castle) | III at Royal Institute / IV at Dock | 200 wood, 500 gold | 30 s | **Naval cannon damage +15%** (was +10% before Season Five); also increases bonus damage |
| **Merchant Guilds** | Market, Chamber of Commerce (Imperial), Royal Institute (Castle) | III at Royal Institute / IV at Market | **200 food, 500 gold base → 130 food, 325 gold** after the −35% economic technology discount | 60 s | **Active Traders generate +1 gold every 6 s** (= **10 gold/min** each) |

French has **8** unique technologies (matches the in-game tech count of 8).

**Royal Institute discount.** Technologies researched at the Royal Institute (Feudal → Castle landmark) cost **−30%** and ignore Age requirements. Worked examples from the source pages: Crossbow Stirrups 210 wood / 490 gold; Cantled Saddles 52.5 food / 140 gold; Gambesons 70 wood / 175 gold; Chivalry 70 wood / 140 gold; Royal Bloodlines 210 food / 490 gold; Enlistment Incentives 105 food / 245 gold; Merchant Guilds 91 food / 228 gold.

Sources: [Chivalry](https://ageofempires.fandom.com/wiki/Chivalry_(Age_of_Empires_IV)), [Cantled Saddles](https://ageofempires.fandom.com/wiki/Cantled_Saddles), [Gambesons](https://ageofempires.fandom.com/wiki/Gambesons_(Age_of_Empires_IV)), [Crossbow Stirrups](https://ageofempires.fandom.com/wiki/Crossbow_Stirrups), [Enlistment Incentives](https://ageofempires.fandom.com/wiki/Enlistment_Incentives), [Royal Bloodlines](https://ageofempires.fandom.com/wiki/Royal_Bloodlines), [Long Guns](https://ageofempires.fandom.com/wiki/Long_Guns), [Merchant Guilds](https://ageofempires.fandom.com/wiki/Merchant_Guilds), [Royal Institute](https://ageofempires.fandom.com/wiki/Royal_Institute)

## 2.4 Landmarks (age-up options)

| Landmark | Age | Cost | Build time | Effect |
|---|---|---|---|---|
| **Chamber of Commerce** | Dark → Feudal | 400 food, 200 gold | 190 s | Acts as a Market; trains **one free Trader for every economic technology researched** (up to 14 per game on land maps, 16 on water maps) |
| **School of Cavalry** | Dark → Feudal | 400 food, 200 gold | 190 s | Acts as a Stable and makes **all Stables produce units 20% faster** |
| **Guild Hall** | Feudal → Castle | 1,200 food, 600 gold | 220 s | Generates and stores a chosen resource over time; **the more stored, the faster it generates**, and the rate resets when collected. Generation ticks every **20 s**, starting at **20 resources per tick** (1/s) and rising by **20 per minute**. The marginal rate caps at **200 resources per tick** (10/s). **Stone generates at half** that rate. Cumulative output: **1,020** resources in 5 min (3.4/s), **3,500** in 10 min (5.8/s), **6,500** in 15 min (7.2/s). Collecting or switching the generated resource resets the rate to base |
| **Royal Institute** | Feudal → Castle | 1,200 food, 600 gold | 220 s | Houses all civilisation-unique technologies; research is **−30% cheaper** and **ignores Age requirements** |
| **College of Artillery** | Castle → Imperial | 2,400 food, 1,200 gold | 250 s | Trains Royal gunpowder siege variants, researches gunpowder and siege technologies, and trains units and researches technologies **50% faster** |
| **Red Palace** | Castle → Imperial | 2,400 food, 1,200 gold | 250 s | Keep-type with high-damage Arbalest emplacements built in: attack **60** in 2 burst attacks, **+50 vs ships**, rate of fire 1.5 s, range **10 tiles**, garrison 15, influence reported as **10 × 10 tiles**. Each garrisoned unit adds another arbalest, and it unlocks Arbalest emplacements on all Town Centers and Keeps (those are weaker: 40 damage, 9.5 tile range) |

Sources: [Chamber of Commerce](https://ageofempires.fandom.com/wiki/Chamber_of_Commerce), [School of Cavalry](https://ageofempires.fandom.com/wiki/School_of_Cavalry), [Guild Hall](https://ageofempires.fandom.com/wiki/Guild_Hall), [Royal Institute](https://ageofempires.fandom.com/wiki/Royal_Institute), [College of Artillery](https://ageofempires.fandom.com/wiki/College_of_Artillery), [Red Palace](https://ageofempires.fandom.com/wiki/Red_Palace)

---

# 3. Conflicts and gaps

## 3.1 Source conflicts, with the newer value identified

| # | Item | Reading A | Reading B | Which is newer / preferred |
|---|---|---|---|---|
| 1 | **English Mill influence gather bonus** | **20% / 25% / 30% / 30%** — [English civ page](https://ageofempires.fandom.com/wiki/English) + aoe4world civ data | **15% / 20% / 25% / 30%** — [Influence page](https://ageofempires.fandom.com/wiki/Influence_(Age_of_Empires_IV)) table | **A.** The civ page changelog dates the change to update 14.0.4963 and the page is newer (2026-07-27 vs 2026-06-23). The Influence page table was never updated |
| 2 | **Armor Clad research time** | **60 s** — aoe4world patch-16.1.9737 data; also the raw 2022 attrib file `upgrade_armor_clad_eng.json` | **30 s** — [Armor Clad page](https://ageofempires.fandom.com/wiki/Armor_Clad) techbox | **A.** Two independent readings (live parsed data + raw game file) agree on 60 s. The Fandom page's substantive content dates to 2024-01-02 and its changelog mentions only a cost change, never a time change |
| 3 | **Arrow Volley effect** | **−1 s base attack time for 6 s**, cooldown 45 s — [Arrow Volley tech page](https://ageofempires.fandom.com/wiki/Arrow_Volley) + aoe4world ability data | **+70% attack speed for 5 s**, cooldown 45 s — [Longbowman page](https://ageofempires.fandom.com/wiki/Longbowman_(Age_of_Empires_IV)) | **A**, but the tech page itself warns the realised effect depends on stacked bonuses. Both readings are recorded; treat the exact figure as **UNVERIFIED** |
| 4 | **Arbalétrier Pavise** | **+5 ranged armour and +1 tile range** for 30 s — [Arbalétrier page](https://ageofempires.fandom.com/wiki/Arbal%C3%A9trier) + aoe4world ability data | **+5 ranged armour** for 30 s only — [French civ page](https://ageofempires.fandom.com/wiki/French_(Age_of_Empires_IV)) | **A.** The unit page and the parsed ability data both carry the range component |
| 5 | **French Trade Post reveal** | **map + minimap** — French civ page (changelog: patch 11.1.1201 extended it beyond the minimap) | **minimap only** — aoe4world civ data | **A.** The civ page explicitly records the patch that changed it; the parsed data string is stale |
| 6 | **French Town Center production speed** | **+15 / +15 / +20 / +25%** — French civ page and aoe4world civ overview | Ability records say **+10% (Dark), +15% (Feudal), +20% (Castle)**; the aoe4world parser workaround comment still says "10%, 10%, 15%, 20%" | **A.** The +10% Dark Age value was raised to +15% in update 11.0.782 and the ability descriptions were not regenerated |
| 7 | **Royal Knight charge bonus** | **+3 melee damage for 5 s** — Royal Knight ability record and Royal Knight page prose | Infobox lists **CDamage +10 / +12 / +14** by tier | **A** is the base bonus; the +10/+12/+14 figures appear to be post-Cantled-Saddles totals. The two are not clearly reconciled on the page — **UNVERIFIED** which the infobox intends |
| 8 | **Wynguard Army batch** | **55 s, 6 population** — aoe4world batch data | **75 s, 7 population** — [Wynguard Army page](https://ageofempires.fandom.com/wiki/Wynguard_Army) | **A** (parsed from current game files) |
| 9 | **Arbalétrier train time** | **22.5 s** — aoe4world; matches the generic Crossbowman's published 22.5 s | **23 s** — Arbalétrier page infobox | **A**, on the grounds that the Arbalétrier is a Crossbowman replacement with no stated production-time change |
| 10 | **College of Artillery Royal variants** | **−25% gold, more damage, additional abilities** — [College of Artillery page](https://ageofempires.fandom.com/wiki/College_of_Artillery) | Parsed unit entries show Royal Ribauldequin and Royal Culverin **identical** to their regular counterparts, and Royal Cannon identical to the French Cannon | **Unresolved.** The discount is presumably a runtime aura not written into base unit stats. Marked **UNVERIFIED** |
| 11 | **Red Palace influence radius** | **10 × 10 tiles** — Red Palace infobox | **Range 2** — the Influence page's French Keep/Red Palace row | **Unresolved.** The two may describe different things (Red Palace-specific aura vs. standard Keep influence). Marked **UNVERIFIED** |
| 12 | **Merchant Guilds cost** | **130 food, 325 gold** (= 200/500 less the −35% bonus) — Merchant Guilds page | **200 food, 500 gold** (undiscounted) — aoe4world technology data | **A.** Consistent with the –35% bonus the same source documents |

Sources for this table: [English](https://ageofempires.fandom.com/wiki/English), [French](https://ageofempires.fandom.com/wiki/French_(Age_of_Empires_IV)), [Influence](https://ageofempires.fandom.com/wiki/Influence_(Age_of_Empires_IV)), [Armor Clad](https://ageofempires.fandom.com/wiki/Armor_Clad), [Arrow Volley](https://ageofempires.fandom.com/wiki/Arrow_Volley), [Arbalétrier](https://ageofempires.fandom.com/wiki/Arbal%C3%A9trier), [Merchant Guilds](https://ageofempires.fandom.com/wiki/Merchant_Guilds)

## 3.2 Structural gaps in the aoe4world data

The parsed data is at Season 13 patch 16.1.9737, but several French civilisation bonuses are applied by **hardcoded workarounds in the parser** that were never updated after the values changed in game. Any consumer reading raw aoe4world costs for the French will inherit these errors:

1. **Economic technology discount is applied as 30%, not 35%.** `src/attrib/workarounds.ts` contains `workaround("French Civ Bonus: 'Economic technology 30% cheaper.'", …)` calling `discountCosts(item.costs, 0.7)`. Horticulture is written as 35 wood / 70 gold; at the current −35% it should be 33 wood / 65 gold. The −35% was set in patch 11.1.1201.
2. **Villager and Scout production time uses 10 / 10 / 15 / 20%**, not the current 15 / 15 / 20 / 25%. French Villager is written as 19 s where the current bonus implies 18 s; French Scout 21 s where it implies 20 s.
3. **Merchant Guilds has no discount applied at all** in `technologies/french/merchant-guilds-4.json` (200 food / 500 gold), even though it is an economic technology and should be 130 / 325.
4. **Wheelbarrow, Professional Scouts and Textiles are not discounted** in the parsed French data (ratio 1.000 against the English costs) while Horticulture, Fertilization, Double Broadax, Specialized Pick and the tier-3/4 equivalents are discounted (ratio 0.700). The classification boundary between discounted and non-discounted "economic" technologies is **UNVERIFIED**.
5. **English Man-at-Arms cost/time anomalies:** the Man-at-Arms page gives food 90 and notes "100 before update 16.1.9373" — almost certainly a typo for 16.1.9737. The English training time of 14.65 s matches the documented +40% bonus.

Sources: [aoe4world/data parser workarounds](https://github.com/aoe4world/data/blob/main/src/attrib/workarounds.ts), [Man-at-Arms](https://ageofempires.fandom.com/wiki/Man-at-Arms_(Age_of_Empires_IV))

## 3.3 Not confirmed

- **Campaign versions differ.** Cantled Saddles in *The Hundred Years War* costs 50 food / 300 gold, gives only **+5** charge damage, and is researched at the Keep or Red Palace. Gambesons in the same campaign costs 50 food / 425 gold and gives only **+2** melee armour. Campaign-only values are not used in the tables above.
- **Setup Camp as a technology no longer exists.** It was a Feudal-Age Archery Range technology (25 food, 75 gold, 45 s) that healed Longbowmen 1 HP/s; it was removed in update 7.0.5861 and replaced by the Campfire building/ability.
- **Network of Castles aura radius.** The ability record reports `auraRange: 12.5` for both Network of Castles and Network of Citadels, but whether every granting building (TC, Outpost, Stone Wall Tower, Keep, and the King's Palace / White Tower / Berkshire Palace landmarks) uses exactly 12.5 tiles is **UNVERIFIED**.
- **Whether Network of Castles affects buildings.** The ability's effect selector covers melee, ranged and siege unit classes plus Villagers, which implies **units only**; this is inferred from the data selector, not stated in a tooltip — **UNVERIFIED**.
- **French Keep influence radius.** Reported as 2 tiles on the Influence page but as 10 × 10 tiles for the Red Palace; the interaction between the two is **UNVERIFIED**.
- **Enclosures rounding.** "+1 gold every 6 s" is stated as including the time Villagers spend walking; exact rounding behaviour is **UNVERIFIED**.
- **King HP by Age.** The King's HP (220 / 295 / 395) scales with Age, but the data file carries only the Feudal-Age entry (220); the Castle and Imperial values come from the Fandom infobox alone — **UNVERIFIED** against parsed data.
- **War Cog secondary weapon.** The parsed War Cog carries a second cannon weapon (40 siege damage, +80 vs buildings) whose availability conditions are **UNVERIFIED**.
- **The `aoemods/attrib` repository is a May-2022 snapshot.** Its costs are pre-Season-One values (Armor Clad 100 food / 250 gold; Network of Citadels 200 gold / 75 stone; Chivalry 125 gold; Long Guns 100 food / 250 gold) and must not be used as current data. It was used here only to corroborate the Armor Clad research time and the Cantled Saddles charge values (`charge_damage` = 10, `duration` = 5).
- **aoe4world.com pages could not be fetched directly** (HTTP 403 from Cloudflare). All aoe4world figures come from the `aoe4world/data` GitHub repository.
