## Interface and match setup

Transcription rules used below: every number comes from a linked source; where two sources disagree both readings are shown; anything not confirmed by a primary or official source is tagged **UNVERIFIED**.

### 1. HUD layout

Screen regions, positions and contents:

| Region | Position | Contents |
|---|---|---|
| Objective panel | Upper toolbar, **left** | Current match objectives / mission objectives |
| Age indicator | Upper toolbar, **middle** | The Age the player is currently in |
| Resign button | Upper toolbar, **right of the Age** | Resign |
| Resource bar / stockpile | Lower bar, **far left** | Food, wood, gold, stone, population. Also shows how many villagers are on wood, food, gold and stone; idle villagers are counted inside the population figure |
| Population + idle readout | Top of the resource block | House icon with current/max population; a separate "zzz" (sleeping) icon with a count for idle villagers |
| Selection info panel ("attribute tab") | Lower bar, **lower middle** | Circular portrait medallion, unit/building name, type subtitle (e.g. "Siege", "Economy Building, Trade Site"), HP + HP bar, melee armour, pierce/ranged armour, further stats (e.g. attack speed, speed). With 2+ units selected the numeric attributes are **not** shown — the panel is filled with sprites of the selected units instead |
| Command card | Lower bar, middle/right of the selection panel | Context-sensitive buttons. Villagers get a build card split by Age; non-siege military units and military ships get advanced commands (guard another unit, attack stance, formations, garrison). Production/research buttons for the selected building live here |
| Production queue (per building) | Inside the command card of the selected building | Queued units/techs of that building only |
| Global production queue | On-screen HUD element, **position UNVERIFIED**; can be switched off in settings | Units currently being trained and technologies being researched, across all buildings |
| Minimap | Lower-right corner (see conflict note) | Terrain, units, buildings, resource and map-feature icons; ping panel at its **top-right**; minimap-size and camera-orientation panel at its **bottom-right** |
| Scoreboard | Screen overlay, **position UNVERIFIED** | Player scores. Hidden by default; enabled by the lobby match option "Display Player Scores" |

**Minimap position conflict:** the Fandom *User interface* page says the minimap is at the "lower rightmost part of the screen", while the Fandom *Mini map* page says AoE IV's minimap is in the "lower left corner". A 2023 forum request asking to *move* the minimap to the bottom-left states the player must "look for the minimap on the bottom right", which supports **lower-right**. Sources: [User interface](https://ageofempires.fandom.com/wiki/User_interface), [Mini map](https://ageofempires.fandom.com/wiki/Mini_map), [forum thread](https://forums.ageofempires.com/t/let-us-position-the-minimap-on-bottom-left-please/245955).

**Minimap details** ([Mini map](https://ageofempires.fandom.com/wiki/Mini_map)): square/diamond shape with a golden border over a golden circle; each corner is a cardinal direction and eight spikes mark orientation; default orientation puts the northern corner (golden "N") up. The top-right panel holds three ping commands (**Look Here!**, **Attack!**, **Defend!**); the bottom-right panel holds a minimap-size button (up to two sizes bigger) and three camera buttons: rotate left 45°, rotate right 45°, reset orientation. Tan-coloured minimap terrain marks **Stealth Forest**.

**Command card grid (rows × columns):** the default hotkey layout is **Grid Keys**, and the official launch hotkey list assigns villager build options to `Q W E R` (top row), `A S D` (middle) and `Z X C` (bottom) — consistent with a **12-slot, 4-column × 3-row** letter grid. The actual on-screen cell count per panel is **UNVERIFIED**, and the official article only lists populated slots. Sources: [official shortcuts](https://www.ageofempires.com/news/aoeiv-shortcuts-revealed/), [Fully Remappable Keys](https://support.ageofempires.com/hc/en-us/articles/7473968190356-Fully-Remappable-Keys).

**Queue keys read from the official in-game controls screenshot:** *Cancel last item in production queue* = `B`; *Cancel all items in all production queues of selected buildings* = `N`; *Return all Villagers to work (from Seek Shelter)* = `Ctrl+Shift+R`. Control profiles in that menu: `Game`, `Diplomacy`, `Unit Selection`, `Building Selection`, `Control Groups`, `Communication`, `Camera`, each with a **Primary Key** and a **Secondary Key** column ([official keyboard/mouse setup article](https://support.ageofempires.com/hc/en-us/articles/42690923461524-Age-of-Empires-IV-Keyboard-and-Mouse-Setup)).

### 2. Default hotkeys

| Action | Primary | Secondary / alternate | Notes |
|---|---|---|---|
| Pan camera | Arrow keys | `Alt+W` / `Alt+A` / `Alt+S` / `Alt+D` | Default bindings remapped on non-English keyboards to the key at that physical location |
| Rotate camera | Hold `Alt` + move mouse | `[` = 45° counter-clockwise, `]` = 45° clockwise (`Num 6` / `Num 4`) | — |
| Zoom camera | Mouse scroll wheel | — | — |
| Reset / centre camera | `Backspace` | `Num 0` | 1st press resets rotation, 2nd press resets zoom |
| Idle villager (cycle) | `.` (period) | `N` | Cycle through idle economy units |
| Select all idle villagers | `Ctrl+.` | `Ctrl+Up arrow` | — |
| Cycle through idle military units | `,` (comma) | `Down arrow` | — |
| Select all idle military units | `Ctrl+,` | `Ctrl+Down arrow` | — |
| Select all TC / centre on TC | `H` | `L` | "Center screen on the Town Center" (official) / "Cycle through town centers" |
| Focus capital Town Center | `Ctrl+H` | `Ctrl+L` | — |
| Build menu (villager build card) | Age tabs `Q` (Age I), `W` (Age II), `E` (Age III), `R` (Age IV) | — | The card opens with the selected villager; buildings inside each tab use grid keys, e.g. Age I: House `Q`, Mill `W`, Lumber Camp `E`, Mining Camp `R`, Farm `A`, Barracks `S`, Dock `D`, Outpost `Z`, Palisade Wall `X`, Palisade Gate `C` |
| Select all Military production buildings | `F1` | `M` | Then `Tab` cycles through them |
| Select all Economic buildings | `F2` | `K` | Then `Tab` cycles |
| Select all Research/Tech buildings | `F3` | `O` | Then `Tab` cycles |
| Select all Landmarks/Wonders/capital TCs | `F4` | `P` | — |
| Control groups — set | `Ctrl+0`…`Ctrl+9` | — | Setting a group with nothing selected clears it |
| Control groups — select | `0`…`9` | — | Press twice to also centre the camera on the group / follow it |
| Control groups — add to group | `Shift+0`…`Shift+9` | — | Adds the current selection to that group |
| Attack-move | `A` | — | Community-compiled; **not** listed in the official launch article — treat as **UNVERIFIED** for exact key |
| Shift-queue orders | `Shift` + any command | `Shift`+left-click ground queues building/ability placement; `Shift`+production button queues 5 units | Official phrasing: "With a Unit selected, set multiple commands" |
| Select all units on screen | `Ctrl+A` | `Ctrl+K` | — |
| Select all military units | `Ctrl+Shift+C` | `Ctrl+M` | — |
| Select all villagers | `Ctrl+Shift+V` | `Up arrow` | — |
| Cycle through selected units / unit types | `Tab` | `Ctrl+Tab`, `Right`/`Left arrow` | — |
| Focus on selected unit(s) | `F5` | — | — |
| Follow selected unit | `Home` | — | — |
| Delete unit or building | `Del` (hold) | `Ctrl+=` | — |
| Team chat / global chat | `Enter` / `Shift+Enter` | `/`, `\` | — |
| Game menu | `F10` | — | `Esc` = cancel/deselect, not user-remappable |

Sources: [official "Shortcuts Revealed"](https://www.ageofempires.com/news/aoeiv-shortcuts-revealed/), [official Fully Remappable Keys](https://support.ageofempires.com/hc/en-us/articles/7473968190356-Fully-Remappable-Keys), [DefKey](https://defkey.com/age-of-empires-4-shortcuts), [PCGamesN](https://www.pcgamesn.com/age-of-empires-4/hotkeys-keyboard-shortcuts), [ShortcutPosters](https://shortcutposters.com/games/age-of-empires-4/). Hotkeys are fully remappable; **Grid Keys** and **Fully Remappable** are separate profiles and changes do not copy between them; conflicting keys are allowed but flagged, with a "Warn conflicts" toggle. Mouse mapping per the official diagram: left click = select unit; left drag = bandbox select; right click = issue order; right-click drag = facing move order; scroll = zoom; drag = pan.

### 3. Camera behaviour

| Property | Value | Status |
|---|---|---|
| Camera modes | **Classic** (default) and **Panoramic**; chosen from a drop-down in Settings | Panoramic + camera rotation were added in update 17718 (Season Two) |
| Default angle / pitch | No numeric pitch published | **UNVERIFIED**; community descriptions only: Classic is "set at a lower angle", Panoramic is steeper/"drone-like" |
| Zoom input | Mouse wheel (also named "Zoom Camera" in the official mouse diagram) | Confirmed |
| Zoom range | Zoom is notch-based. Community claim: Classic sits **6 notches** from the closest zoom, Panoramic **9 notches**; another player reports Panoramic is **50 %** more zoomed out | **UNVERIFIED** — community figures only |
| Rotation | Free rotate by holding `Alt` + moving the mouse; 45° steps via `[` / `]` and the minimap buttons; `Backspace` resets rotation then zoom | Confirmed |
| Mode change timing | Changing Classic↔Panoramic mid-match requires returning to the main menu to take effect | Confirmed |
| Camera options | Settings → **Camera**; camera panning speed is adjustable there ("Steady camera" is available throughout the game) | Confirmed |

Sources: [Fandom Mini map](https://ageofempires.fandom.com/wiki/Mini_map), [PCGamesN update 17718](https://www.pcgamesn.com/age-of-empires-4/update-17718-panoramic-camera), [DefKey](https://defkey.com/age-of-empires-4-shortcuts), [official Xbox accessibility options](https://www.ageofempires.com/age-iv-on-xbox-accessibility-options/), [Reddit zoom-notches claim](https://www.reddit.com/r/aoe4/comments/1f3vmro/which_camera_mode_do_you_use/).

### 4. Selection behaviour

| Input | Effect |
|---|---|
| Left click on a unit/building | Select that one entity |
| Left click on ground | Confirm building / ability placement |
| Left click + drag | **Bandbox** select all own units inside the box |
| Double-click on a unit | Select all **visible** units of the same type — **UNVERIFIED** against an official source |
| `Shift` + click | Add / remove unit from selection (the documented add/remove modifier) |
| `Ctrl` + click | Listed by DefKey next to the selection bindings, but the extracted label is empty — **UNVERIFIED**, do not rely on it |
| Right click | Issue contextual order to selection (move, attack, gather, etc.) |
| Right click + drag | Issue **facing** move order |
| `Shift` + command | Queue the command instead of replacing the current order list |
| `Shift` + click ground | Queue building or ability placement |
| `Shift` + production button/hotkey | Queue 5 units of that type |
| `Esc` | Cancel / deselect (not remappable) |
| `Tab` | Cycle through selected units / through selected unit types |
| `Ctrl+A` | Select all units on screen |

Sources: [DefKey](https://defkey.com/age-of-empires-4-shortcuts), [official mouse-mapping screenshot](https://support.ageofempires.com/hc/en-us/articles/42690923461524-Age-of-Empires-IV-Keyboard-and-Mouse-Setup), [official shortcuts](https://www.ageofempires.com/news/aoeiv-shortcuts-revealed/), [PCGamesN](https://www.pcgamesn.com/age-of-empires-4/hotkeys-keyboard-shortcuts).

### 5. Skirmish lobby options

**Map types.** There is no separate "Random Map" mode: 74 generated maps are selectable in Skirmish/Custom, plus a **"Random Map" toggle** that picks randomly from a player-built list and reveals the map only at match load. Crafted (user) maps appear on a separate tab. Ranked uses a small rotating subset; Quick Match a larger subset. Maps carry a **biome** (20 non-seasonal biomes at time of writing, e.g. European Temperate, Taiga Summer/Winter, Steppes, Gobi Desert, Asian Temperate/Subtropical, Chalk Downs, Mediterranean, Sahara Desert, Japanese Spring, Savanna, Alpine Springs, Black Sand Beach, Greek Islands, Temperate Fall, Tropical Rainforest, Tropical Swamp), which changes trees, ground colour, forest density and colour filter; biome can be set, randomised, or "random standard" (excludes seasonal/snowy biomes) ([Random map](https://ageofempires.fandom.com/wiki/Random_map)).

**Map sizes and number of players** ([Random map](https://ageofempires.fandom.com/wiki/Random_map)):

| Size | Tiles | Max players |
|---|---|---|
| Micro | 104 × 104 | 2 |
| Small | 128 × 128 | 4 |
| Medium | 160 × 160 | 6 |
| Large | 192 × 192 | 8 |
| Gigantic | 256 × 256 | 8 |

Four-player games were originally restricted to Medium or larger, six-player to Large or larger, etc.; patch 14681 relaxed this to the values above. In Skirmish the player may add **up to seven additional AIs** as long as the map size supports it, with anywhere from **1 to 8 distinct teams**; Skirmish can also run with no AI at all (sandbox), and some maps do not generate fairly with mismatched team sizes.

**AI difficulty.** Seven Skirmish/Custom-vs-AI options exist; the top three — **Ridiculous, Outrageous and Absurd** — "introduce various boosts" (official). The default is **Intermediate** and each AI's difficulty is set independently. Sources: [official accessibility page](https://www.ageofempires.com/age-iv-on-xbox-accessibility-options/), [Game mode (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Game_mode_%28Age_of_Empires_IV%29). The four lower names (Easy, Intermediate, Hard, Hardest) come from community phrasing rather than one official list — treat the exact ordering as **UNVERIFIED**. Ridiculous/Outrageous/Absurd are **not** available in multiplayer lobbies ([forum topic](https://forums.ageofempires.com/t/multiplayer-is-missing-harder-ai-difficulties-ridiculous-outrageous-and-absurd/242634)).

**Starting resources** (Standard game mode) ([Game mode](https://ageofempires.fandom.com/wiki/Game_mode_%28Age_of_Empires_IV%29)):

| Setting | Food | Wood | Gold | Stone |
|---|---|---|---|---|
| Standard | 200 | 150 | 100 | — (varies slightly by civilization) |
| High | 2,000 | 2,000 | 1,000 | 800 |
| Very High | 50,000 | 50,000 | 25,000 | listed as "10,00" — typo, presumably 10,000 — **UNVERIFIED** |
| Maximum | 100,000 | 100,000 | 100,000 | 100,000 |

**Other match options:** Starting Age; **Map State** — Concealed / Explored / Revealed, which is also the fog-of-war preset; Reveal on Elimination; Display Player Scores (off by default); tuning packs; allow cheats. **Map options:** map, map size, biome, starting-location distribution (**Teams Together** vs **Random Locations**), and an explicit map seed ([Game mode](https://ageofempires.fandom.com/wiki/Game_mode_%28Age_of_Empires_IV%29)).

**Game modes:** Standard (Capital Town Center + 6 Villagers + a scouting unit, varying slightly by civilization), Empire Wars (Dark Age start with more Villagers and pre-built buildings; starting Age/resources locked), Nomad (one fewer Villager, no Capital Town Center, Villagers scattered, Capital TC buildable for free), Sandbox (all victory conditions disabled), Scenario, and rotating seasonal modes. Presets in the single-player Skirmish tab include "Solo Battle vs A.I" and "A.I. Teammates vs A.I" (2v2, 3v3, 4v4, 2v2v2), with eight rotating presets per selection and four featured presets rotating daily from 52.

**Victory conditions:**

| Condition | Rule |
|---|---|
| Landmark | Destroy all enemy landmarks (in team games, all landmarks of the enemy team) |
| Sacred | Capture and hold all Sacred Sites; capturing starts in the Castle Age via a religious unit (Delhi Sultanate from Feudal with Sanctity); holding all begins a **10-minute** countdown. Neutralising any site stops the countdown and loses all progress |
| Wonder | Build and defend a Wonder for **15 minutes**; enemies are warned when construction starts and the Wonder is visible to all with a minimap marker |
| Dominion | Added with Season Seven. Each player starts with a Monarch; killing enemy or neutral Monarchs grants victory. The **only** condition off by default, and the only one unavailable in Quick Match/Ranked (except free-for-all) |
| Annihilation | Cannot be disabled; fallback when all other conditions are off. Triggers when a player kills all of another player's units (buildings not required) |

Victory overall requires all players on the enemy team to lose; a single player can also lose alone. With **no** victory condition chosen the game can run forever. Sources: [Victory](https://ageofempires.fandom.com/wiki/Victory), [Game mode](https://ageofempires.fandom.com/wiki/Game_mode_%28Age_of_Empires_IV%29).

**Game speed.** Sources conflict. An official AoE support article states each game "lets you set the default speed of the game … You can adjust this setting at any time when playing single-player, or at the start of a multiplayer match" ([support article](https://support.ageofempires.com/hc/en-us/articles/4406592811156-Tips-for-Optimizing-your-Age-of-Empires-Experience)), but it is written for the series generally. A detailed player bug report describes a working AoE IV speed control: a drop-down plus `+`/`-` hotkeys, a **"Lock Speed"** option that forces the host's speed and shows "Locked" in the **F11** speed display, and concrete values of **1.5** and **1.7**, where 1.7 displays as "Fast" ([bug report](https://forums.ageofempires.com/t/game-speed-ui-control-broken-in-game/67455)). Community threads also report no in-game speed slider for normal play, with the "Advanced Game Settings" mod used instead ([Steam discussion](https://steamcommunity.com/app/1466860/discussions/0/3158705742076869528/)). The canonical AoE IV speed names and multipliers are therefore **UNVERIFIED** — use 1.5 / 1.7 as observed values only.

### 6. Fog of war and stealth forests

Reveal states are chosen in the lobby as **Map State** ([Game mode](https://ageofempires.fandom.com/wiki/Game_mode_%28Age_of_Empires_IV%29)): **Concealed** (line of sight only around starting units/buildings, rest unexplored), **Explored** (whole map explored but still covered by fog), **Revealed** (full visibility, no fog of war). In single player the map is always revealed at the end of a game by default, so "Reveal on Elimination" mainly makes that happen slightly earlier.

**Line of sight is a 3D volume, not a circle.** Every unit and building has four LoS parameters — **inner height, inner radius, outer height, outer radius** — visualised by the Content Editor as a lampshade: the inner circle is how far it sees looking up, the outer circle how far looking down ([Line of Sight](https://ageofempires.fandom.com/wiki/Line_of_Sight)). Key rules:

| Rule | Value |
|---|---|
| Maximum LoS applies only | At high elevation looking down (cliffs, King of the Hill), or standing on Stone Walls |
| LoS on flat terrain | 3–4 tiles smaller than the maximum |
| Minimum LoS | Always 6 tiles smaller than the maximum |
| Uphill | LoS drops significantly going up traversable hills; very tall cliffs can block LoS entirely |
| Most buildings | Outer height stat of 0, so they gain no LoS advantage from high ground |
| LoS update | Updates in short intervals as a unit moves, not smoothly, so instantaneous LoS can exceed what stats suggest |
| Garrison | A garrisoned unit **retains its LoS**, so garrisoning a long-sight unit inside a ram/building extends that building's vision |
| Sacred Sites | Once captured by a player they become revealed to all players, providing LoS over their surface |

Reference LoS values in tiles ([Line of Sight](https://ageofempires.fandom.com/wiki/Line_of_Sight)): Imperial Palace **27.5** (longest of anything in the game), Counterweight Trebuchet **20** (highest of any unit), Outpost **15** maximum by default, Town Center **13**. Catapult-like siege has the longest unit sight; infantry generally see further than cavalry; ships generally see further than land units.

**Stealth Forests** are unique to AoE IV: areas of reddish-brown vegetation interspersed with trees, which units can walk through and on which buildings can be placed. They reduce the LoS of most units and buildings to **essentially zero**; enemy units inside are revealed only if directly adjacent to opposing units, or when a unit comes under attack. Scouts, Fishing Boats, Town Centers, Outposts, Keeps and Stone Wall Towers have high enough LoS height values to see through Stealth Forests, but only at their **minimum** LoS. The related **Stealth Water** (seaweed patches) restricts most ships; because the Scout Ship was cut during development, the **Fishing Boat** is the ship that can see into it. **Dense forest** (impassable, unbuildable) blocks LoS for all units and buildings **except** the Imperial Palace, which is unimpeded by any obstacle. Sources: [Line of Sight](https://ageofempires.fandom.com/wiki/Line_of_Sight), [Stealth mode](https://ageofempires.fandom.com/wiki/Stealth_mode).

**Unit stealth** (separate from terrain) ([Stealth mode](https://ageofempires.fandom.com/wiki/Stealth_mode)): Malian Musofadi Warriors and Musofadi Gunners have an activatable Stealth ability lasting **30 seconds** or until they enter combat; the Japanese Shinobi can disguise itself as an enemy Villager. **Scouts, Outposts and Capital Town Centers automatically reveal hidden units that enter their LoS.** The Fort of the Huntress landmark passively applies stealth to friendly infantry inside its aura while out of combat, lingering **30 seconds** after leaving (10 seconds before Season Five). On the minimap, unexplored territory is black, the player's current LoS is brighter and fog-covered areas are dimmer, and tan terrain marks Stealth Forest ([Mini map](https://ageofempires.fandom.com/wiki/Mini_map)).
