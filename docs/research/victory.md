# Age of Empires IV — Relics, Sacred Sites, Trade and Victory Rules

Reference for the browser RTS. Every number below is taken from a linked source. Where sources disagree, both readings are given and the newer one is identified. Anything not confirmed by at least one source is tagged **UNVERIFIED**. Prose is paraphrased; nothing is copied verbatim.

Source tiers used in this document:

| Tier | Meaning | Examples used here |
|---|---|---|
| Game-file dump | Values parsed from the game's own attribute files | `aoe4world/data`, `aoemods/attrib` |
| Community wiki | Community-maintained wiki, cross-checked against in-game tooltips | ageofempires.fandom.com |
| Community testing | Player-run in-game measurement | Trade formula fits quoted on the wiki |

Sources: [aoe4world/data](https://github.com/aoe4world/data), [aoemods/attrib](https://github.com/aoemods/attrib), [Age of Empires Wiki](https://ageofempires.fandom.com/)

## Quick reference

| Mechanic | Value | Status |
|---|---|---|
| Relics spawned on a default random map | 3 + number of players | Confirmed |
| Relic gold income | 13.33 gold / 10 s = 80 gold/min | Confirmed (current) |
| Relic gold income before patch 24916 | 16.67 gold / 10 s = 100 gold/min | Confirmed (superseded) |
| Relics storable per religious building | 3 | Confirmed |
| Religious unit speed penalty while carrying a Relic | −25% | Confirmed |
| Sacred Sites on a typical map | 2–3 (max 4; some maps 1 or 0) | Confirmed |
| Sacred Site gold income | 100 gold/min, paid in 10 s intervals | Confirmed |
| Sacred Site capture time | 30 s (independent of number of religious units) | Confirmed |
| Sacred Site victory | Hold **all** sites on the map for 10 minutes | Confirmed |
| Wonder victory | Defend the Wonder for 15 minutes | Confirmed |
| Wonder build time | 600 s base | Confirmed |
| Wonder cost | 5,000 each of food/wood/gold/stone on Micro, up to 8,000 each on Large+ | Confirmed |
| Landmark victory | Destroy **all** enemy landmarks, including each Capital Town Center | Confirmed |
| Player elimination | When **all** of that player's landmarks are destroyed | Confirmed |
| Ages | Dark (I), Feudal (II), Castle (III), Imperial (IV) | Confirmed |
| Age-up | Build one of two landmarks per Age; advance on completion | Confirmed |

Sources: [Relic (Age of Empires IV)](<https://ageofempires.fandom.com/wiki/Relic_(Age_of_Empires_IV)>), [Sacred Site](https://ageofempires.fandom.com/wiki/Sacred_Site), [Victory](https://ageofempires.fandom.com/wiki/Victory), [Wonder (Age of Empires IV)](<https://ageofempires.fandom.com/wiki/Wonder_(Age_of_Empires_IV)>), [Landmark](https://ageofempires.fandom.com/wiki/Landmark)

## 1. Relics

### 1.1 Spawn count

| Property | Value | Notes |
|---|---|---|
| Default relic count | **3 + number of players** | Wiki: "three plus the number of players" |
| Resulting totals | 5 (2 players), 7 (4 players), 9 (6 players), 11 (8 players) | Odd totals, so one side can win the relic race outright |
| Per-map infobox encoding | "Default: 3, Per player: 1" | Appears verbatim on Dry Arabia, High View, Lipany |
| Spawn timing | Scattered around the map at the start of a random map game | — |
| Availability Age | Religious units may pick up Relics starting in the **Castle Age (III)** | — |
| Knights Templar | All Relics on the map are visible at the start of the game | Civ bonus |

Sources: [Relic (Age of Empires IV)](<https://ageofempires.fandom.com/wiki/Relic_(Age_of_Empires_IV)>)

Map exceptions (not a fixed global rule):

| Map / case | Relic behaviour |
|---|---|
| Most maps | 3 + players, distributed evenly or biased toward contested ground |
| Divided maps (Mongolian Heights, Mountain Pass, Nagari) | One extra Relic so neither team gets the positional advantage |
| Segmented/island maps (African Waters, Confluence, Continental, Socotra, Waterlanes) | Fixed number of Relics per section |
| Warring Islands | Highest relic count in the game: up to 2 per player on the team island plus 3–4 on neutral islands |
| Hedgemaze | No free-spawning Relics; the only source is the Forgotten Ruins Point of Interest |
| Forgotten Ruins (any map) | A Villager assigned to work the Point of Interest can unearth Relics |

Sources: [Relic (Age of Empires IV)](<https://ageofempires.fandom.com/wiki/Relic_(Age_of_Empires_IV)>), [Dry Arabia](https://ageofempires.fandom.com/wiki/Dry_Arabia), [High View](https://ageofempires.fandom.com/wiki/High_View), [Lipany](https://ageofempires.fandom.com/wiki/Lipany)

### 1.2 Capture, carry and deposit

| Step | Rule |
|---|---|
| Capture (pick up) | A **religious unit** (Monk, Imam, Shaman, Prelate, Scholar, Warrior Monk, etc.) picks the Relic up; available from the Castle Age (III) |
| Carry penalty | All religious units move **25% slower** while carrying a Relic |
| Deposit target | A **religious building** — Monastery, Mosque or Prayer Tent, or a landmark that also acts as a Monastery (Abbey of the Trinity, Regnitz Cathedral) |
| Capacity | **Maximum 3 Relics** per religious building |
| Not every religious building stores Relics | Aachen Chapel and Abbey of Kings are classified as religious but cannot hold Relics |
| Withdraw order | The Relic that has been in the building longest is the one withdrawn first |
| Known bug | Only the first two Relics can be withdrawn this way; the third always remains inside |
| HRE / Order of the Dragon | May store Relics in other buildings, **max 1 Relic per non-religious building**; Relics still generate resources there |
| HRE / OotD Dock | Each garrisoned Relic gives +5% attack speed to all military ships, up to +25% |
| HRE / OotD defensive buildings | Outpost, Stone Wall Tower, Keep, Elzbach Palace: +25% armour, +25% damage, +20% sight range, +20% weapon range per garrisoned Relic |
| Chinese / Zhu Xi's Legacy | 1 Relic per Pagoda (unlocked by the Yuan Dynasty, build limit 3) |
| Golden Horde Shaman | Can consume a Relic to construct an Ovoo, even past the build limit |
| Healer Elephant | **Cannot** carry Relics (it can still capture Sacred Sites) |

Sources: [Relic (Age of Empires IV)](<https://ageofempires.fandom.com/wiki/Relic_(Age_of_Empires_IV)>), [Religious unit (Age of Empires IV)](<https://ageofempires.fandom.com/wiki/Religious_unit_(Age_of_Empires_IV)>)

### 1.3 Gold income

| Modifier | Value | Status |
|---|---|---|
| Base relic income (current) | **13.33 gold every 10 seconds = 80 gold/min** | Confirmed; matches "80 gold/min" on the religious-unit page |
| Base relic income before patch 24916 (Season Three) | 16.67 gold every 10 s = **100 gold/min** | Confirmed, superseded — 80/min is the newer value |
| Comparison quoted by the wiki | 80 gold/min is "slightly less than 2 unupgraded Villagers" (100/min was ~2.5) | Wiki comparison, not a derived rate |
| Tithe Barns (Imperial Age tech) | Adds **+40 food, +40 wood, +10 stone per minute** per Relic | Confirmed by in-game tooltip text; costs 500 gold, 60 s research |
| Tithe Barns stone before patch 24916 | +20 stone (change was unintentional) | Confirmed, superseded |
| Mongol Improved Tithe Barns | Further +20 food, +20 wood, +5 stone → total 60 food / 60 wood / 15 stone per minute | Confirmed |
| Pagoda Relics (Chinese / ZXL) | 100 gold, 62 food, 62 wood, 25 stone per minute; **not** affected by Tithe Barns | Confirmed |
| Regnitz Cathedral (HRE / OotD) | Doubles gold generation of all Relics | Confirmed |
| Grand Winery (Byzantines / Macedonian Dynasty) | Relics generate Olive Oil / Silver instead of gold | Confirmed |
| Treasure Towers (Knights Templar) | +20% relic gold when the Monastery is inside a Fortress aura | Confirmed by in-game tooltip |
| Governor of Sehwan (Tughlaq Dynasty) | +20% relic gold | Confirmed |
| Mountain Hall / 1000 Karma (Jin Dynasty) | +300% relic gold for 60 seconds | Confirmed |

Sources: [Relic (Age of Empires IV)](<https://ageofempires.fandom.com/wiki/Relic_(Age_of_Empires_IV)>), [Religious unit (Age of Empires IV)](<https://ageofempires.fandom.com/wiki/Religious_unit_(Age_of_Empires_IV)>), [technologies/all.json](https://raw.githubusercontent.com/aoe4world/data/main/technologies/all.json)

### 1.4 Relic Conversion

| Property | Value |
|---|---|
| Requirement | The religious unit must be holding a Relic |
| Effect | Attempts to convert all enemy units inside the conversion ring |
| Radius | **4.75 tiles** (Relic page) / **4.5 tiles** (religious-unit page) — sources conflict, see §8 |
| Countdown | 6 seconds; units still inside the ring when it ends are converted |
| Immune targets | Siege engines, hero units and other religious units |
| Cooldown | **120 seconds per Relic** (tracked per Relic, including while stored in a building) |
| Consequence | One religious unit can chain conversions by swapping Relics; different units cannot reuse the same Relic back-to-back |
| Buddhist Monk (Japanese) | Uses Buddhist Conversion instead; buffs allied units in the radius. Upgraded by Nehan to also grant movement speed and reduce cooldown to 90 s |
| Dervish (Ayyubids) | Mass Heal heals +50% faster while carrying a Relic; 3 minute cooldown |

Sources: [Relic (Age of Empires IV)](<https://ageofempires.fandom.com/wiki/Relic_(Age_of_Empires_IV)>), [Religious unit (Age of Empires IV)](<https://ageofempires.fandom.com/wiki/Religious_unit_(Age_of_Empires_IV)>)

### 1.5 Religious unit base stats

| Unit | Age | Cost | Train time | HP | Speed (tiles/s) | Notes |
|---|---|---|---|---|---|---|
| Monk / Imam / Shaman | Castle | 150 gold | 30 s | 90 | 1.12 | Generic trio, identical in most respects |
| Prelate (HRE / OotD) | Dark (HRE) / Castle (OotD) | 100 gold | 20 s | 90 | 1.12 | Holy Inspiration |
| Scholar (Delhi Sultanate) | Dark | 135 gold (80 with Dome of the Faith) | 30 s | 90 | 1.12 | Speeds research/production; can capture Sacred Sites in Feudal with Sanctity |
| Buddhist Monk (Japanese) | Castle | 80 gold | 30 s | 90 | 1.25 | Buddhist Conversion |
| Shinto Priest (Japanese) | Castle | 150 gold | 30 s | 90 | 1.12 | Place Yorishiro |
| Warrior Monk (Rus) | Castle | 40 food + 200 gold | 35 s | 190 | 1.62 | Cavalry, combat |
| Shaolin Monk (ZXL) | Castle | 200 food | 20 s | 170 | 1.19 | Combat, 2 melee armour, no healing |
| Ikko-Ikki Monk (Sengoku Daimyo) | Castle | 100 food + 100 gold | 35 s | 160 | 1.125 | Combat |
| Dervish (Ayyubids) | Castle | 60 food + 140 gold | 40 s | 120 | 1.62 | Cavalry unit type |
| Healer Elephant (Tughlaq Dynasty) | Castle (Feudal with Dome of the Faith) | 150 food + 220 gold | 40 s | 450 | 1.00 | Cannot carry Relics |
| Hospitaller Knight (Knights Templar) | — | — | — | — | — | Heals, but is **not** classified as a religious unit |

All religious units have 0 melee and 0 ranged armour except Shaolin Monk (2 melee) and Healer Elephant (3 melee / 1 ranged). Healing is automatic at 7 HP/s, reduced by 50% while the healed unit is in combat (since Season Four). Every religious unit except the Shaolin Monk can heal.

Sources: [Religious unit (Age of Empires IV)](<https://ageofempires.fandom.com/wiki/Religious_unit_(Age_of_Empires_IV)>)

## 2. Sacred Sites

### 2.1 Count per map

There is no single fixed count. The wiki's summary is that nearly every map has **two or three** Sacred Sites, and that on all maps except Mountain Clearing and Waterlanes the count does not change with team size.

| Count | Maps |
|---|---|
| 0 | Turtle Ridge (the only map with zero) |
| 1 | King of the Hill; Mountain Clearing in 1v1; occasionally Migration |
| 2–3 | The typical case on nearly every map |
| 3 (verified examples) | Dry Arabia, High View, Lipany — all three infoboxes read `SacredSites = 3` |
| 4 (maximum) | Confluence, Four Lakes |
| Variable | Waterlanes; Mountain Clearing (team games have several clustered together) |
| Clustered | Enlightened Horizon; Mountain Clearing in team games — multiple sites in very close proximity |

A lower site count makes a Sacred Site victory much easier, because the victory condition requires holding **all** sites on the map (§2.4).

Sources: [Sacred Site](https://ageofempires.fandom.com/wiki/Sacred_Site), [Dry Arabia](https://ageofempires.fandom.com/wiki/Dry_Arabia), [High View](https://ageofempires.fandom.com/wiki/High_View), [Lipany](https://ageofempires.fandom.com/wiki/Lipany)

### 2.2 Capture, contest and decap

| Phase | Rule |
|---|---|
| Earliest capture Age | **Castle Age (III)** for all civilizations by default |
| Delhi Sultanate exception | Sanctity (Feudal Age tech) lets Scholars capture Sacred Sites before the Castle Age; costs 0 resources, 210 s research, and also gives +25% gold from captured sites |
| Placed before Castle Age | A religious unit sitting on a site before the Castle Age starts capturing only once Castle Age is reached |
| Capture trigger | Position a religious unit inside the site's visible aura |
| Capture duration | **30 seconds** to fill the progress bar, **independent of the number of religious units** on the site |
| Contest (halts capture) | Any single enemy unit standing in the aura stops the bar at its current position until that unit leaves or dies |
| Aborted capture | If the capturing religious unit is killed or leaves the aura, the bar empties at the same rate — 30 s for a full bar to empty |
| Decap (neutralise) | **Any unit** can decap; it must stay on the site for a full 30 s while the bar empties |
| Interrupted decap | If the decapping unit leaves or dies, the bar automatically refills |
| Re-capture | Once a site is neutral, **only a religious unit** can recapture it |
| Owner defence | The owning player can halt a decap by contesting with one of their own units in the aura |
| Terrain | The inner "monument" part of the Sacred Site is impassable to all units |
| Order behaviour | Since update 10.0.576, a religious unit ordered to capture a site stays until the capture completes before running queued commands |

Sources: [Sacred Site](https://ageofempires.fandom.com/wiki/Sacred_Site), [technologies/all.json](https://raw.githubusercontent.com/aoe4world/data/main/technologies/all.json)

### 2.3 Gold rate

| Property | Value |
|---|---|
| Gold per captured site | **100 gold/min**, generated in intervals of ten seconds |
| Effect of capture progress | The position of the progress bar has no effect on gold generation — as long as the site is captured, the trickle runs |
| Team games | Only the **owner** of the site receives the gold; it does not go to the whole team |
| Wiki comparison | 100 gold/min is "equivalent to just over two unupgraded Villagers" |
| Sanctity (Delhi Sultanate) | +25% gold from captured sites |
| Treasure Towers (Knights Templar) | +20% gold for Sacred Sites inside a Fortress aura |
| Governor of Sehwan (Tughlaq Dynasty) | +20% Sacred Site gold generation |
| Kingdom of Castile (Knights Templar) | Units near a Sacred Site slowly regenerate and deal +20% damage |

Sources: [Sacred Site](https://ageofempires.fandom.com/wiki/Sacred_Site), [technologies/all.json](https://raw.githubusercontent.com/aoe4world/data/main/technologies/all.json)

### 2.4 Sacred Site (sacred) victory

| Rule | Value |
|---|---|
| Sites required | **All** Sacred Sites on the map, controlled by one player or one team |
| Countdown | **10 minutes** |
| What stops it | An opponent fully decapping at least one site — this stops the countdown and **resets all progress**; the match continues |
| What pauses it | Contesting one of the sites with units — the countdown is temporarily halted |
| Condition to resume | The controlling team must remove all contesting units from the site's aura |
| Win trigger | The team holds all sites until the timer expires |
| Compared to a Wonder | The wiki notes the sacred timer is only 10 minutes versus the Wonder's 15, which makes a sacred victory a valid answer to an enemy Wonder |

Sources: [Sacred Site](https://ageofempires.fandom.com/wiki/Sacred_Site), [Victory](https://ageofempires.fandom.com/wiki/Victory)

## 3. Trade

### 3.1 Route mechanic

| Element | Rule |
|---|---|
| Land trade unit | **Trader** (or a unique equivalent), trained at a Market and similar buildings |
| Sea trade unit | **Trade Ship**, trained at the Dock |
| Default return | Traders return **gold**; Trade Ships return **equal amounts of gold and wood** |
| Trade target | Another player's Market or Dock (**including an enemy player's**) or a neutral **Trade Post** |
| Valid targets for Traders | Markets, Docks and Coastal Trade Posts |
| Home Market | The building that created the unit by default; any other standard Market or Dock, and some landmarks such as The Silver Tree, can serve as a home Market |
| Income timing | Resources are generated on reaching **both ends** of the route (target and home), not only on completing a round trip |
| Income equality | The income is always equal for both legs of the trip |
| UI | Each Market/Dock shows the total number of trade units and how many use it as their home Market (Traders and Trade Ships combined) |
| Re-tasking | Home Market and trade target can both be changed at any time, with leg-dependent timing (see below) |
| Interruption | A trade unit remembers which leg it was on if interrupted (e.g. garrisoned) and continues the same leg |
| Home Market destroyed | The trade unit moves to the destroyed building's location and idles until manually re-tasked |
| Mongol packed Market | The trade unit moves to the original location and idles until the building is unpacked, then resumes automatically |

Sources: [Trade (Age of Empires IV)](<https://ageofempires.fandom.com/wiki/Trade_(Age_of_Empires_IV)>)

Re-tasking timing:

| Change made | While travelling to the trade target | While returning to the home Market |
|---|---|---|
| Home Market changed | New income applies only on the return leg, after reaching the target | Trade unit immediately redirects to the new home Market and income changes for that leg |
| Trade target changed | Trade unit immediately redirects and income changes, regardless of whether it is higher or lower | New income applies only after finishing the current leg |

Sources: [Trade (Age of Empires IV)](<https://ageofempires.fandom.com/wiki/Trade_(Age_of_Empires_IV)>)

Trade Posts:

| Property | Value |
|---|---|
| Type | Neutral Market-like structures randomly distributed on random maps; land or coastal (no functional difference) |
| Attackable | **No** — cannot be attacked or destroyed |
| Bonus | Generate **20% more gold** than player-owned Markets (in-game description) |
| Advantageous maps | Baltic, Prairie, Altai — a Trade Post always spawns within a few tiles of a corner, allowing a long, easily defended edge route behind the player |
| Vision | Since patch 11.1.1201, Trade Posts can be selected through the Fog of War |
| French / Jeanne d'Arc | All Trade Posts revealed on the map and minimap at game start |
| Byzantines | Each Trade Post can unlock two random mercenary units if a Mercenary House is built nearby; mercenaries train 33% faster at Trade Posts |

Sources: [Trade (Age of Empires IV)](<https://ageofempires.fandom.com/wiki/Trade_(Age_of_Empires_IV)>), [Trader](https://ageofempires.fandom.com/wiki/Trader)

### 3.2 Gold formula and distance

Trade income depends on **route length, trade target and map size**, and the relationship to distance is **quadratic** (superlinear), which is why maximising route length matters far more than adding Traders.

Formula as quoted from the game's Content Editor comments (the wiki reproduces two, and states they are not equivalent):

| Symbol | Meaning | Value quoted by the wiki |
|---|---|---|
| `d` | Trade distance | — |
| `MS` | Map size | — |
| `M_z` | z multiplier | 0.85 |
| `M_d` | d multiplier | 0.124 |
| `M_final` | final multiplier | 1 (default) |
| `M_settlement` | settlement multiplier | 1.34 when trading with a neutral Trade Post; 1 for an allied Market |
| `Sp` | Speed of the trade unit | — |
| `z` | `M_z × Sp × M_settlement` | — |
| Editor formula | `z × d × (d/MS + 0.3) = ((z/MS) × d² + (M_d × d)) × M_final` | — |

Sources: [Trade (Age of Empires IV)](<https://ageofempires.fandom.com/wiki/Trade_(Age_of_Empires_IV)>)

Empirically fitted formula (in-game testing, Trader, neutral Trade Post, 1v1 **micro** map, straight line in a single grid direction):

| Quantity | Value |
|---|---|
| Gold per trip | **≈ 0.008x² + 0.1x**, where `x` = tiles between the home Market and the Trade Post |
| Gold per minute per tile | **≈ 0.48 gold/min per tile** at a Trader speed of 1 tile/second |
| Corner-Trade-Post maps (Baltic, Prairie) | A full trip along one map edge yields **69–73 gold**; ≈ **47–49 gold/min per Trader** for a civilization with no trade bonuses |
| Theoretical maximum (corner to corner) | ≈ **130 gold per leg** |
| Half the map edge | Only ≈ **25%** of the full value |
| Two thirds of the map edge | Only ≈ **50%** of the full value |
| Diagonal routes | Slightly lower than the straight-line fit; the exact measurement points on each building are not documented |

Sources: [Trade (Age of Empires IV)](<https://ageofempires.fandom.com/wiki/Trade_(Age_of_Empires_IV)>)

Distance scaling with map size and unit speed:

| Factor | Effect |
|---|---|
| Map size | The `x²` coefficient is **inversely proportional** to map size. A small map's length is ~23% greater than micro's, so its coefficient is ~19% smaller |
| Rule of thumb | Roughly **15% less trade income per maximum-size trip for each successively larger map size**; the larger map still allows greater total income because routes can be longer |
| Unit speed | The `x²` coefficient scales with trade-unit speed |
| Settlement type | Neutral Trade Post vs allied Market changes the multiplier (see §8 for the conflicting values) |

Sources: [Trade (Age of Empires IV)](<https://ageofempires.fandom.com/wiki/Trade_(Age_of_Empires_IV)>)

Unique trade units:

| Unit | Formula / scaling |
|---|---|
| Venetian Trader (Knights Templar) | Speed 1.88× a standard Trader → **≈ 0.015x² + 0.1x** |
| Trade Caravan (Abbasid Dynasty, Ayyubids) | **(0.0125x² + 0.1x) × 0.38**; 33% cheaper than a Trader and faster, but returns significantly less gold per trip |
| Reindeer Trader (Jin Dynasty) | Lower gold per trip to compensate for higher speed; scaling value **0.83** given directly in the editor; gold/min ends up similar to a standard Trader |
| Trade Ship | Base speed 1.5× a Trader; gold per trip ≈ equal to a Trader; also returns the same amount of wood, so resources per trip are doubled and resources per minute are ≈ 3× a Trader |

Sources: [Trade (Age of Empires IV)](<https://ageofempires.fandom.com/wiki/Trade_(Age_of_Empires_IV)>)

Game-file tuning constants (independent check):

| Constant | Value in the attrib dump |
|---|---|
| `final_multiplier` | 1 |
| `settlement_multiplier` | 1.2 |
| `z_multiplier` | 0.95 |
| `distance_delta_power` | 2 |
| `d_multiplier` | 0.138 |
| `meters_per_cell` | 7 |
| `minimum_d_distance` | 1 |
| `d_minimum` | 0.1 |
| `delay_before_return_home` / `delay_before_move_to_destination` | 1 / 1 |
| `trade_cart_type` | `trade_cart` |

Sources: [trade_route_tuning/default.json (aoemods/attrib)](https://raw.githubusercontent.com/aoemods/attrib/master/trade_route_tuning/default.json)

### 3.3 Trader and Market statistics

| Property | Trader | Notes |
|---|---|---|
| Cost | 60 wood + 60 gold | Was 75/75 before the Season Three Update (update 24916) |
| Train time | 30 s | 35 s before Season Three; 25 s in Season Three; back to 30 s in patch 9.1.370 |
| Hit points | 90 | — |
| Armour | 0 melee / 0 ranged | — |
| Speed | 1.00 tiles/second | Campaign version is 1.15 tiles/s |
| Population | 1 | — |
| Line of sight | 7.778 tiles | — |
| Age | Feudal Age (Dark Age for Sengoku Daimyo) | — |
| Trained at | Market, Matsuri, War Stable (Jin Dynasty, requires a nearby horse), The Silver Tree, Chamber of Commerce, Sultanhani Trade Network, Great Pasture | — |
| Unit type | No longer tagged as Cavalry (since patch 9.2.628), but still benefits from Biology | Does not benefit from Royal Bloodlines |

Sources: [Trader](https://ageofempires.fandom.com/wiki/Trader), [buildings/all.json](https://raw.githubusercontent.com/aoe4world/data/main/buildings/all.json)

| Property | Market |
|---|---|
| Cost | 100 wood |
| Build time | 20 s |
| Hit points | 1,000 |
| Age | Feudal Age (II) |

Sources: [buildings/all.json](https://raw.githubusercontent.com/aoe4world/data/main/buildings/all.json)

Early-game payback quoted by the wiki (generic civilization, micro map, no trade bonuses):

| Route length | Payback time for one Trader |
|---|---|
| Half the map edge | ≈ 4 min 20 s |
| Three quarters of the map edge | ≈ 3 min 45 s |
| Full map edge | ≈ 3 min |

For comparison, the same page states a generic un-upgraded Villager pays back in slightly over a minute.

Sources: [Trader](https://ageofempires.fandom.com/wiki/Trader), [buildings/all.json](https://raw.githubusercontent.com/aoe4world/data/main/buildings/all.json)

### 3.4 Trade balance changes

| Patch | Change |
|---|---|
| Season Four Update (6.0.878) | Trade income reduced by 10% |
| Patch 6.1.130 | Trader income reduced by a further 10%; Mongol Silk Road bonus thresholds raised from 3/5/7/9 to 5/10/15/20 active trade units |
| Season Five Update (7.0.5861) | Trade units generate half the route income on touching each end, instead of all of it on completing a round trip (closes a first-leg exploit) |
| Season Five Update | The Silver Tree production bonus and gold discount for Traders reduced from 50% to 40% |
| Patch 11.1.1201 | Trade Posts selectable through the Fog of War |
| Patch 12.1.2454 | Trade income when trading with an **allied Market** reduced by 10% |
| Update 13.0.4178 | Abbasid and Ayyubid Traders replaced by the Trade Caravan |

Sources: [Trade (Age of Empires IV)](<https://ageofempires.fandom.com/wiki/Trade_(Age_of_Empires_IV)>), [Trader](https://ageofempires.fandom.com/wiki/Trader)

### 3.5 Trade civilization bonuses

| Civilization | Bonus |
|---|---|
| Abbasid Dynasty | Grand Bazaar: Traders return food or wood at 25% of their gold amount, selected at the Market. +20% trade gold at Golden Age tier 4, or +30% with the Administration Wing |
| Ayyubids | Trade Caravans 33% cheaper and faster, but return less gold |
| Byzantines | Traders also return Olive Oil at 20% of their gold amount |
| French / Jeanne d'Arc | Traders can return gold, wood or food, selectable per unit. Trade Ships return 20% extra resources. Merchant Guilds: 1 gold every 6 s |
| Jin Dynasty | Alliance Conducted at Sea +10% trade gold; trading with a Trade Post holding a Tributary State +15% |
| Knights Templar | Venetian Traders return much more gold and move much faster, but are limited in number |
| Malians | Trade units generate up to 8% of their trade income in gold (and wood for Trade Ships) when passing a Toll Outpost, plus 4% in food with the Saharan Trade Network (8% food when passing the landmark itself) |
| Mongols / Golden Horde | Extra food/wood/gold at 5/10/15 active trade units, at 10% of the standard gold amount. Traders +15% speed under the Yam Network. Stone Commerce returns stone at 10% (20% improved). Traders −40% gold and +40% faster from The Silver Tree |
| Ottomans | Trade Bags vizier point: +40% trade return. Sea Gate Castle increases Trader speed |
| Zhu Xi's Legacy | Traders and Trade Ships −10% cost in the Yuan Dynasty |

Sources: [Trade (Age of Empires IV)](<https://ageofempires.fandom.com/wiki/Trade_(Age_of_Empires_IV)>), [Trader](https://ageofempires.fandom.com/wiki/Trader)

## 4. Wonders

### 4.1 Cost, build time and statistics

| Property | Value |
|---|---|
| Availability | **Imperial Age (IV)** |
| Build time | **600 seconds** (10 minutes) base |
| Hit points | 5,000 |
| Pierce armour | 50 |
| Fire armour | 0 |
| Footprint | 6 × 6 tiles |
| Cost composition | An **equal amount** of food, wood, gold and stone |
| Cost variability | Map-size dependent since update 9.1.176 |

Sources: [Wonder (Age of Empires IV)](<https://ageofempires.fandom.com/wiki/Wonder_(Age_of_Empires_IV)>)

Cost per resource by map size:

| Map size | Cost of each resource | Total cost | Status |
|---|---|---|---|
| Micro | 5,000 | 20,000 | Current |
| Small | 6,000 | 24,000 | Current |
| Medium | 7,000 | 28,000 | Current |
| Large and Gigantic | 8,000 | 32,000 | Current |
| Any size, before update 9.1.176 | 6,000 | 24,000 | Superseded (set by patch 11963) |
| Any size, original | 3,000 | 12,000 | Superseded (launch value) |

Sources: [Wonder (Age of Empires IV)](<https://ageofempires.fandom.com/wiki/Wonder_(Age_of_Empires_IV)>)

Mongol and Golden Horde Wonder cost (no stone, +33% food/wood/gold):

| Map size | Food / wood / gold each | Stone |
|---|---|---|
| Micro | 6,650 | 0 |
| Small | 7,980 | 0 |
| Medium | 9,310 | 0 |
| Large and Gigantic | 10,640 | 0 |

Sources: [Wonder (Age of Empires IV)](<https://ageofempires.fandom.com/wiki/Wonder_(Age_of_Empires_IV)>)

Independent check from the game-file dump (base values, all civilizations except Mongols/Golden Horde): 5,000 food + 5,000 wood + 5,000 stone + 5,000 gold, total 20,000, build time 600 s, 5,000 HP. The Mongol/Golden Horde Monument of the Great Khan reads 6,650 food/wood/gold and 0 stone, total 19,950, build time 600 s.

Build-speed and cost modifiers:

| Civilization | Effect |
|---|---|
| Chinese / Zhu Xi's Legacy | +100% build speed (the data dump lists the Enclave of the Emperor at 300 s) |
| Order of the Dragon | +25% build speed (data dump: 480 s) |
| Delhi Sultanate / Tughlaq Dynasty | −20% stone with Compound of the Defender |
| Byzantines | +72 stone when built |
| Japanese | Yorishiro Bonus: +4,000 HP and +2 tiles line of sight |

Sources: [Wonder (Age of Empires IV)](<https://ageofempires.fandom.com/wiki/Wonder_(Age_of_Empires_IV)>), [buildings/all.json](https://raw.githubusercontent.com/aoe4world/data/main/buildings/all.json)

### 4.2 Wonder victory

| Rule | Value |
|---|---|
| Countdown | **15 minutes** |
| Start of countdown | When the Wonder's **construction begins**, all enemies are warned |
| Visibility | The Wonder is visible to all players and a marker is placed on the minimap |
| Win trigger | The team protects the Wonder until the timer expires → Wonder Victory; the game ends |
| Failure | If the enemy team destroys the Wonder before the timer expires, the match continues |
| Multiple Wonders | Multiple players on a team may each construct a Wonder, but **only one** of the Wonder timers needs to reach 0 to achieve victory |
| Availability | One of the four selectable victory conditions (landmarks, sacred, wonder, dominion) in most game modes |

Sources: [Victory](https://ageofempires.fandom.com/wiki/Victory), [Game mode (Age of Empires IV)](<https://ageofempires.fandom.com/wiki/Game_mode_(Age_of_Empires_IV)>)

## 5. Landmark destruction and elimination

### 5.1 Landmark victory

| Rule | Detail |
|---|---|
| Win condition | Destroy **all** enemy landmarks |
| Team games | All landmarks of the enemy team must be destroyed |
| Capital Town Center | Counts as a landmark for every civilization, so its destruction is **required** for a landmark victory |
| Landmark set | The Capital Town Center plus every Age-up landmark the player has built |
| Destroyed landmark | Can be "rebuilt" only as a **repair** of the ruins; it must be repaired back to **100% health** to count against the landmark victory condition again and to regain its special ability and line of sight |
| Repair cost | All landmarks cost **only wood** to repair — Keep-type landmarks therefore never need stone to repair, unlike standard Keeps |
| Interrupted construction | If a landmark under construction is completely destroyed by an enemy, the resources are **not** refunded. Cancelling your own landmark refunds all resources, or a partial amount if it has taken damage |
| No victory conditions chosen | A skirmish with no victory conditions selected can continue without end even if all enemy teams are defeated |

Sources: [Landmark](https://ageofempires.fandom.com/wiki/Landmark), [Victory](https://ageofempires.fandom.com/wiki/Victory), [Capital Town Center](https://ageofempires.fandom.com/wiki/Capital_Town_Center)

### 5.2 Exactly when a player is eliminated

| Situation | Elimination trigger |
|---|---|
| 1v1 | All of the player's landmarks are destroyed |
| Team game | All of the team's landmarks are destroyed (the wiki states a player loses when all their team's landmarks are destroyed) |
| Effect on the eliminated player | All their units stop fighting, and all resources they had collected are lost |
| Spectating | Eliminated players can continue to watch their teammates play |
| End of game | The game ends only when **all** players on the enemy team lose; a single player can also lose alone |
| Skirmish with no win conditions | The game may continue indefinitely even after all enemy teams are defeated |
| Capital Town Center special status | Destroying it alone does **not** eliminate a player — it is one landmark among that player's set. It is, however, mandatory to destroy it for a landmark victory, and it is shown with a distinct minimap icon |

Sources: [Victory](https://ageofempires.fandom.com/wiki/Victory), [Landmark](https://ageofempires.fandom.com/wiki/Landmark), [Capital Town Center](https://ageofempires.fandom.com/wiki/Capital_Town_Center)

### 5.3 Capital Town Center

| Property | Value |
|---|---|
| Type | Economy and Population Building **and** Landmark |
| Civilizations | All (the Knights Templar version is renamed Templar Headquarters) |
| Hit points | **7,000** |
| Population provided | 10 |
| Garrison capacity | 15 (was 20 before patch 20249) |
| Attack | 8 with Arrowslits; 6 for garrison arrows |
| Rate of fire | 1.88 s (Arrowslits) / 3.88 s (garrison arrows); was 1.12 s before patch 20249 |
| Range | 8 tiles (Arrowslits) / 6 tiles (garrison arrows) |
| Pierce armour / fire armour | 50 / 0 |
| Line of sight | 11.56 tiles |
| Footprint | 4 × 4 tiles |
| Attack bonus | +10 vs Ships (was +25 before update 24916) |
| Functions | Trains and improves Villagers and Scouts, drops off **all** resources, raises the population cap |
| Extra arrows | Each garrisoned unit adds one extra arrow irrespective of its own attack stats |
| Stealth detection | The Capital Town Center can detect units in Stealth mode or disguise |
| Build restriction | Defensive landmarks such as the Kremlin or Barbican of the Sun cannot be built within 8 tiles of it |
| Comparison to a standard Town Center | Extra hit points, an additional and stronger arrow, +2 range; otherwise functionally identical |
| Standard Town Center (for contrast) | 400 wood + 300 stone, 150 s build, 2,500 HP |
| Knights Templar | +1,000 HP; contains Pilgrim technologies and the Pilgrim Destination ability; stone walls in a 14 × 14 tile influence gain +25% HP and an arrowslit |
| Campaign version | 2,400 HP, garrison 10, different attack values — the original campaigns were never rebalanced |

Match start (Standard game mode): every player starts with a Capital Town Center, **six Villagers** and a scouting unit, with small variations for some civilizations. On Nomad starts players begin without a Capital Town Center and may build it for free. Mongol players start with their Town Center in packed form and can reposition it.

Sources: [Capital Town Center](https://ageofempires.fandom.com/wiki/Capital_Town_Center), [Game mode (Age of Empires IV)](<https://ageofempires.fandom.com/wiki/Game_mode_(Age_of_Empires_IV)>), [buildings/all.json](https://raw.githubusercontent.com/aoe4world/data/main/buildings/all.json)

## 6. Ages and the age-up mechanic

### 6.1 Age names

| Age | Number |
|---|---|
| Dark Age | I |
| Feudal Age | II |
| Castle Age | III |
| Imperial Age | IV |

Sources: [Game mode (Age of Empires IV)](<https://ageofempires.fandom.com/wiki/Game_mode_(Age_of_Empires_IV)>), [Landmark](https://ageofempires.fandom.com/wiki/Landmark)

### 6.2 Two-landmark choice

| Rule | Detail |
|---|---|
| Method | For most civilizations, landmarks **are** the method of advancing an Age |
| Choice | Players choose **one of two** landmarks to build in every Age except the Imperial Age |
| Timing | The player advances to the next Age when the chosen landmark is **completed** |
| Choice points | Three: Dark → Feudal, Feudal → Castle, Castle → Imperial |
| Exclusivity | Most civilizations are limited to one of the two choices per Age and **cannot** construct the other landmark after reaching the new Age |
| Destruction during construction | Landmarks can be destroyed while being built, which interrupts the Age-up |
| Refund on enemy destruction | No refund if an enemy completely destroys a landmark under construction |
| Refund on cancellation | Full refund if the player cancels their own landmark, partial if it has taken damage |
| Comparison | The wiki compares the mechanic to minor gods in Age of Mythology and to Asian Dynasties Wonders in Age of Empires III |

Note on labelling: the game-data `age` field for a landmark is the Age in which it can be **built** (1 = Dark Age). Community and wiki prose sometimes labels the same landmark by the Age it grants, which is one higher. The table below uses the game-data convention and states both.

Sources: [Landmark](https://ageofempires.fandom.com/wiki/Landmark)

### 6.3 Landmark cost and build time by Age

| Data `age` (Age you are in) | Age reached | Generic cost | Total | Build time | English choices |
|---|---|---|---|---|---|
| 1 (Dark Age) | Feudal Age (II) | 400 food + 200 gold | 600 | 190 s | Abbey of Kings / Council Hall |
| 2 (Feudal Age) | Castle Age (III) | 1,200 food + 600 gold | 1,800 | 220 s | King's Palace / The White Tower |
| 3 (Castle Age) | Imperial Age (IV) | 2,400 food + 1,200 gold | 3,600 | 250 s | Berkshire Palace / Wynguard Palace |
| 4 (Imperial Age) | — (no further Age) | Wonder: 5,000 of each resource | 20,000 | 600 s | Cathedral of St. Thomas |

Sources: [buildings/all.json](https://raw.githubusercontent.com/aoe4world/data/main/buildings/all.json), [Landmark](https://ageofempires.fandom.com/wiki/Landmark)

The same generic pattern holds across civilizations in the data dump (400/200, 1,200/600, 2,400/1,200 food/gold with 190/220/250 s build times), with per-civilization and per-landmark exceptions. Examples of exceptions in the same dump: the HRE Palace of Swabia costs 2,160 food + 1,080 gold; the Order of the Dragon builds its landmarks in 152/176/200/480 s; the Knights Templar Fortress costs 600 stone + 300 gold with 180 s build time; the Golden Horde Golden Tent costs 50 gold with 30 s build time; the Abbasid/Ayyubid House of Wisdom costs 50 wood with 30 s build time.

English landmark roles, for reference:

| Landmark | Data age | Role |
|---|---|---|
| Abbey of Kings | 1 | Heals out-of-combat friendly units in a 7.5 tile radius at 6 HP/s; can crown a King |
| Council Hall | 1 | Acts as an Archery Range with +100% production speed |
| King's Palace | 2 | Acts as a faster Town Center with increased HP and garrison space |
| The White Tower | 2 | Acts as a Keep with a production speed bonus |
| Berkshire Palace | 3 | Improved Keep, 14.5 tile weapon range |
| Wynguard Palace | 3 | Trains units in batches at reduced cost |

Sources: [buildings/all.json](https://raw.githubusercontent.com/aoe4world/data/main/buildings/all.json), [English](https://ageofempires.fandom.com/wiki/English), [Landmark](https://ageofempires.fandom.com/wiki/Landmark)

### 6.4 Civilizations that do not use the standard two-landmark choice

| Civilization | Deviation |
|---|---|
| Abbasid Dynasty, Ayyubids | Single landmark, the House of Wisdom, with four "wings"; each wing built advances an Age (except the fourth). HP increases with each wing |
| Chinese, Zhu Xi's Legacy | Not restricted to one landmark per Age: the first advances the Age, the second unlocks the corresponding dynasty |
| Knights Templar | Landmark is the Fortress, but Age-up choices come from the commanderie system at the Templar Headquarters. The only civilization with a landmark (other than the Capital Town Center) completely unrelated to ageing up |
| Golden Horde | Single landmark, the Golden Tent; ageing up is done by selecting one of two bonuses at the Golden Tent |
| Variant civilizations | Ayyubids, Jeanne d'Arc, Order of the Dragon, Macedonian Dynasty and Tughlaq Dynasty share their parent civilization's landmarks; Golden Horde, Knights Templar, Jin Dynasty and Zhu Xi's Legacy have completely different landmarks |

Sources: [Landmark](https://ageofempires.fandom.com/wiki/Landmark)

## 7. Other victory conditions and mode rules

| Condition | Rule |
|---|---|
| Landmark Victory | Destroy all enemy landmarks (including every Capital Town Center) |
| Sacred Victory | Hold all Sacred Sites on the map for 10 minutes |
| Wonder Victory | Build and defend a Wonder for 15 minutes |
| Dominion Victory | Added in Season Seven (update 10.0.576). Each player begins with a Monarch; losing a Monarch instantly eliminates that player. Killing an enemy or neutral Monarch grants +50 maximum population, for a theoretical maximum of 550 (500 in practice in an 8-player free-for-all, since the game ends when the last enemy Monarch dies). Not enabled by default, and not available for Quick Match or Ranked multiplayer except free-for-alls |
| Annihilation Victory | Cannot be deactivated; achievable in any regular game but extremely unlikely. It appears to trigger when a player kills all units possessed by another player (all buildings need not be destroyed), and **possibly** also requires that the player lacks the resources to build another unit |
| Military conquest / elimination | Victory is achieved only when all players on the enemy team lose |
| Win-condition selection | For most game modes, players select which of the four conditions (landmarks, sacred, wonder, dominion) apply |
| Sandbox mode | Same as Standard but all victory conditions are disabled |
| Reveal on Elimination | Match option controlling whether the map is revealed to eliminated players |
| Internal win reasons | The game's data enumerates win reasons including Annihilation, Conquest, Elimination, KeepRush, ObjectiveComplete, ObjectiveFailed, Regicide, RelicHunt, Religious, Settlements, Siege, Surrender and Wonder |

Sources: [Victory](https://ageofempires.fandom.com/wiki/Victory), [Dominion (Age of Empires IV)](<https://ageofempires.fandom.com/wiki/Dominion_(Age_of_Empires_IV)>), [Game mode (Age of Empires IV)](<https://ageofempires.fandom.com/wiki/Game_mode_(Age_of_Empires_IV)>), [win_reason.json (aoemods/attrib)](https://raw.githubusercontent.com/aoemods/attrib/master/win_reason.json)

## 8. Conflicts and gaps

### 8.1 Source conflicts (both values given)

| # | Item | Value A | Value B | Which is newer / assessment |
|---|---|---|---|---|
| 1 | Trade editor constants: z multiplier | 0.85 (Content Editor comments quoted by the wiki) | **0.95** (`aoemods/attrib` dump) | The attrib dump is from the master branch, last committed **2022-05-02**, so it is older than the current live patch; but the wiki's editor comments are undated. Neither can be confirmed as the current live value |
| 2 | Trade editor constants: d multiplier | 0.124 (wiki-quoted comments) | **0.138** (attrib dump) | Same caveat as #1 |
| 3 | Trade editor constants: settlement multiplier | 1.34 for a neutral Trade Post, 1 for an allied Market (wiki-quoted comments) | **1.2** (attrib dump) | The attrib value of 1.2 matches the current **in-game description** ("Trade Posts generate 20% more gold than player-owned Markets"), which suggests the 1.34 figure is stale. Treated as the more plausible current value, but not confirmed |
| 4 | Trade formula validity | The editor gives `z × d × (d/MS + 0.3)` | The editor also gives `((z/MS) × d² + (M_d × d)) × M_final` | The wiki states the two are **not equivalent** and that neither matches in-game testing. Only the **quadratic relationship** to distance is empirically supported |
| 5 | Relic conversion radius | 4.75 tiles (Relic page) | 4.5 tiles (Religious unit page) | Unresolved. Both pages are community-maintained and current |
| 6 | Relic gold income | 80 gold/min (current) | 100 gold/min (before patch 24916) | 80/min is the newer value; patch 24916 is the Season Three Update |
| 7 | Tithe Barns stone | +10 stone/min (current) | +20 stone/min before patch 24916 (called unintentional) | +10 is the newer value |
| 8 | Wonder cost | 5,000 each resource (data dump, equals the Micro figure) | 5,000 / 6,000 / 7,000 / 8,000 each resource by map size (wiki) | Both are consistent: the data dump records the base value, the wiki records the map-size scaling added in update 9.1.176 |
| 9 | Mongol Wonder cost | 6,650 food/wood/gold (data dump, micro) | 6,650 / 7,980 / 9,310 / 10,640 by map size (wiki) | Consistent, same relationship as #8 |
| 10 | Trader train time | 30 s (current) | 35 s (pre-Season Three), 25 s (Season Three only) | 30 s is the newest value, restored by patch 9.1.370 |

Sources: [Trade (Age of Empires IV)](<https://ageofempires.fandom.com/wiki/Trade_(Age_of_Empires_IV)>), [trade_route_tuning/default.json](https://raw.githubusercontent.com/aoemods/attrib/master/trade_route_tuning/default.json), [Relic (Age of Empires IV)](<https://ageofempires.fandom.com/wiki/Relic_(Age_of_Empires_IV)>), [Religious unit (Age of Empires IV)](<https://ageofempires.fandom.com/wiki/Religious_unit_(Age_of_Empires_IV)>), [Wonder (Age of Empires IV)](<https://ageofempires.fandom.com/wiki/Wonder_(Age_of_Empires_IV)>)

### 8.2 Gaps and UNVERIFIED items

- **UNVERIFIED — no official Microsoft / World's Edge source was obtained.** The `ageofempires.com` support site and the official patch-note pages were not reachable through the tooling used in this session (web search returned no usable results, and the wiki was used instead). Every figure here therefore rests on community wikis and community game-file dumps. A pass against the official patch notes is still owed.
- **UNVERIFIED — current live trade tuning constants.** The `aoemods/attrib` `master` branch was last committed 2022-05-02, so its `trade_route_tuning/default.json` may predate later balance changes (Season Four/Five trade income cuts, the patch 12.1.2454 allied-Market change). No newer branch of that repository could be located: the GitHub API was rate-limited, and the branch list is not available without it. A newer dump or an authenticated GitHub session is needed to confirm the live constants.
- **UNVERIFIED — the exact trade income formula.** Neither editor formula is known to be correct, and the fitted formula (0.008x² + 0.1x) is specific to a Trader trading with a neutral Trade Post on a **micro** 1v1 map along a straight line. There is no confirmed general closed form.
- **UNVERIFIED — trade income on allied Markets under the current patch.** The wiki quotes the editor's settlement multiplier for an allied Market as 1, but also records a −10% change in patch 12.1.2454 and states the resulting scaling is "not 30% less". The wiki's own reconciliation is incomplete.
- **UNVERIFIED — diagonal trade distances.** It is not documented from which points on the Trade Post and home Market distance is measured; diagonal routes are only described as "marginally less" than the straight-line fit.
- **UNVERIFIED — relic and Sacred Site rates from game files.** The `aoe4world/data` repository contains units, buildings, technologies and upgrades, but **no** relic, Sacred Site or Trade Post records, so the 80 gold/min relic rate, the 100 gold/min Sacred Site rate and the 30 s capture time could not be independently confirmed from game-file data. They rest on the wiki pages only.
- **UNVERIFIED — Capital Town Center rebuild rule.** The general landmark rule (a destroyed landmark is repaired, not rebuilt from scratch, and must reach 100% HP to count again) is documented. Whether the Capital Town Center specifically can be re-**constructed** rather than repaired after destruction is not separately documented on either the Landmark or Capital Town Center page.
- **UNVERIFIED — "standard map" sacred site count.** The task's framing assumes one number, but no source gives a single fixed count: the wiki says nearly every map has two or three, with a maximum of four and maps with one or zero. Dry Arabia, High View and Lipany each document exactly 3.
- **Inference, not sourced — Sacred Site victory is impossible on Turtle Ridge** (0 Sacred Sites) and trivially attainable on maps with 1 site. The wiki states the site counts and the "hold all sites" rule separately; the combination is our inference.
- **UNVERIFIED — payment tick alignment.** Relic and Sacred Site income is described as paid in ten-second intervals, but whether the first payment lands on capture or aligns to a global simulation tick is not documented.
- **UNVERIFIED — wonder timer behaviour in team games beyond the win rule.** The wiki confirms only that one Wonder timer reaching 0 wins; it does not state whether a destroyed Wonder's timer resets to zero or whether a rebuilt Wonder restarts the 15 minutes.
- **UNVERIFIED — exact Age-up time.** Age-up has no separate timer: it completes when the landmark is built, so the effective Age-up time equals the landmark's build time (190/220/250 s generically). The wiki states the completion rule; the per-landmark build times here come from the data dump.
- **UNVERIFIED — Sacred Site victory in non-standard modes.** The 10-minute countdown is described for "standard games"; its interaction with Dominion, free-for-all and Empire Wars is not documented.
- **UNVERIFIED — relic spawn count on custom and scripted maps.** The 3 + players default is documented for default random-map generation; segmented and island maps override it, and no complete per-map relic table was compiled here.
- **UNVERIFIED — Annihilation victory trigger.** The wiki itself hedges ("possibly may also require that the player in question does not have enough resources to build another unit").
