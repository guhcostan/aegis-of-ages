# Age of Empires IV — Interface, Camera, Controls and AI

Reference for a browser RTS that must be faithful to *Age of Empires IV* (Relic / World's Edge, 2021, plus Seasons One–Ten and the *Sultans Ascend*, *Knights of Cross and Rose*, *Dynasties of the East*, *Yue Fei's Legacy* expansions). Statistics and rules only — no history or flavour.

## 0. Method, units and status legend

**Source priority used:** official ageofempires.com / support.ageofempires.com pages and official screenshots first; then the community wiki (ageofempires.fandom.com); then extracted game data from the `aoemods/attrib` repository (raw game attribute files) and the `aoe4world/data` repository (aoe4world's parsed game stats); then community hotkey references (DefKey, PCGamesN) where nothing official exists.

**Status tags used in every table**

- **CONFIRMED** — stated by an official page/screenshot, the wiki, or present verbatim in extracted game data.
- **DERIVED** — computed by the author from two cited values; the computation is shown so it can be re-checked.
- **UNVERIFIED** — could not be confirmed from any source consulted; do not rely on it.

**Length unit.** Extracted game data and the aoe4world dataset express sight/zoom radii in engine units, not tiles. Dividing an engine radius by **4** reproduces the wiki's tile figures exactly for four independent entities (Town Center 52 → 13 tiles; Outpost 60 → 15; Counterweight Trebuchet 80 → 20; Imperial Palace 110 → 27.5) and also reproduces the wiki's map-size figure (playable 416 → 104). This ÷4 relation is therefore **DERIVED** and used throughout; the corroborating pairs are shown in the tables where it is applied. Note that an older aoe4world-derived table on the wiki used a ÷4.5 divisor instead — see §8.

---

## 1. HUD layout

### 1.1 Screen regions

| Region | Position | Contents |
|---|---|---|
| Objectives panel | Upper toolbar, left | Current game objectives |
| Age indicator | Upper toolbar, middle | The Age the player is currently in |
| Resign button | Upper toolbar, right of the Age indicator | Resign |
| Resource bar / stockpile | Lower toolbar, far left | Food, wood, gold, population, stone, plus the number of villagers working wood, food, gold and stone. Idle villagers are counted inside the population figure |
| Selection panel ("attribute tab") | Lower toolbar, lower middle | Portrait medallion, name, type subtitle, HP + HP bar, melee armour, pierce armour and further stats. With two or more units selected the numeric attributes are **replaced** by sprites of the selected units |
| Command card | Lower toolbar, right of the selection panel | Context-sensitive buttons: build card for villagers and Serjeants (split by Age), advanced commands for non-siege military units and military ships (guard another unit, attack stance, formations, garrison), production and research buttons for the selected building |
| Production queue | Inside the command card of the selected building | Queued units and technologies of that building |
| Minimap | Lower-right corner of the screen (see conflict below) | Terrain, units, buildings, resource and map-feature icons |
| Scoreboard | On-screen panel, toggleable (position UNVERIFIED) | Player scores; off by default, enabled by the lobby option "Display Player Scores" |

**Minimap position conflict.** The wiki's *User interface* page places the minimap at the "lower rightmost part of the screen"; the wiki's *Mini map* page says it is in the "lower left corner". A community request to move the minimap to the bottom-left is consistent with it living at bottom-right. Treat **bottom-right** as the better-supported reading and the wiki *Mini map* sentence as the outlier.

Sources: [User interface](https://ageofempires.fandom.com/wiki/User_interface), [Mini map](https://ageofempires.fandom.com/wiki/Mini_map), [Game mode (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Game_mode_(Age_of_Empires_IV)).

### 1.2 Command card, production queue and global queue

| Property | Value | Status |
|---|---|---|
| Default hotkey layout | **Grid Keys** (the in-game Controls screen exposes a "Set Hotkey Layout" dropdown set to Grid Keys, with Primary Key and Secondary Key columns and "Warn Conflicts" / "Warn Unmapped" toggles) | CONFIRMED |
| Command-card grid | 4 columns × 3 rows = 12 slots; the official Grid Keys letter scheme is `Q W E R` / `A S D` / `Z X C` | CONFIRMED (scheme) / DERIVED (12 slots) |
| Villager build card, Age tabs | Age I `Q`, Age II `W`, Age III `E`, Age IV `R` | CONFIRMED |
| Age I build card (10 of the 12 slots used) | House `Q`, Mill `W`, Lumber Camp `E`, Mining Camp `R`, Farm `A`, Barracks `S`, Dock `D`, Outpost `Z`, Palisade Wall `X`, Palisade Gate `C` | CONFIRMED |
| Age II build card | Blacksmith `Q`, Market `W`, Town Center `E`, Stable `S`, Archery Range `A`, Stone Tower `Z`, Stone Wall `X`, Stone Gate `C` | CONFIRMED |
| Age III build card | Monastery `Q`, Siege Workshop `A`, Keep `Z` | CONFIRMED |
| Age IV build card | University `Q`, Wonder `Z` | CONFIRMED |
| Cancel last item in production queue | `B` | CONFIRMED |
| Cancel all items in all production queues of selected buildings | `N` | CONFIRMED |
| Global queue | Exists: a patch note fixes a crash when clicking "a unit or technology in the global queue during a replay", so the global queue is clickable and lists units and technologies across buildings. Position, size and whether it can be switched off: **UNVERIFIED** | CONFIRMED (existence) |
| Auto-queue | AoE IV is not listed among the games with auto-queue (the wiki's Autoqueue page covers *Age of Mythology: The Titans* and *Age of Empires III* only) | CONFIRMED (absence) |

Sources: [official Shortcuts Revealed](https://www.ageofempires.com/news/aoeiv-shortcuts-revealed/), [official in-game Controls screenshot (Keyboard and Mouse Setup)](https://support.ageofempires.com/hc/en-us/articles/42690923461524-Age-of-Empires-IV-Keyboard-and-Mouse-Setup), [Update 11.0.782](https://ageofempires.fandom.com/wiki/Update_11.0.782), [Autoqueue](https://ageofempires.fandom.com/wiki/Autoqueue).

### 1.3 Minimap

| Property | Value |
|---|---|
| Shape | Square (or diamond) with a golden border, overlaid on a golden circle |
| Orientation marks | Each corner is a cardinal direction; eight spikes mark orientation; default has the northern corner (golden "N") pointing up |
| Ping panel | Top-right of the minimap: three Signal Allies pings — Look Here!, Attack!, Defend! |
| Size and camera panel | Bottom-right of the minimap: a size button (up to two sizes bigger) and three camera-orientation buttons — rotate left 45°, rotate right 45°, reset orientation |
| Resource icons | Berry Bushes, Boar, Deer, Fish, Gold, Stone |
| Map-feature icons | Bridge, Capital Town Center, Landmark, Monarch, Point of Interest, Relic, Sacred Site, Town Center, Trade Post, Wonder |
| Stealth Forest | Shown as tan-coloured terrain |

Sources: [Mini map](https://ageofempires.fandom.com/wiki/Mini_map).

### 1.4 Score, objectives and player surfaces

| Surface | Access | Contents / rules |
|---|---|---|
| Objectives | Always visible, upper toolbar left | Current game objectives |
| Age indicator | Always visible, upper toolbar middle | Current Age |
| Scoreboard / players panel | "Toggle Players & Tribute panel" — `F6` (secondary `Ctrl+F`) per DefKey; **UNVERIFIED** | Score = military + economy + technology + society score |
| Player scores visibility | Lobby option "Display Player Scores", off by default | — |
| Game time display | `F11` toggle per DefKey; **UNVERIFIED** | Match clock |
| Last attack notification | `SPACE` ("Focus on last attack notification") | Jumps camera to the most recent attack |
| Controller-only surfaces | Console UI exposes a "Production Radial Menu" and a "Villager Priorities Menu" | Not present on keyboard/mouse HUD |

Sources: [Score](https://ageofempires.fandom.com/wiki/Score), [Game mode (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Game_mode_(Age_of_Empires_IV)), [official in-game Controls screenshot](https://support.ageofempires.com/hc/en-us/articles/42690923461524-Age-of-Empires-IV-Keyboard-and-Mouse-Setup), [DefKey](https://defkey.com/age-of-empires-4-shortcuts), [Age of Empires IV Default Controller Layouts](https://support.ageofempires.com/hc/en-us/articles/42699436918420-Age-of-Empires-IV-Default-Controller-Layouts).

### 1.5 Colour and legibility conventions

Player colour palette (AoE IV). Ten player colours plus a neutral white; the wiki publishes hex values:

| Colour | Hex | Colour | Hex |
|---|---|---|---|
| White (Neutral) | `#ffffff` | Orange | `#fc9a02` |
| Blue | `#3783ff` | Pink | `#ff57b3` |
| Red | `#fa0101` | Magenta | `#ff0064` |
| Yellow | `#f9f709` | Dark Green | `#008400` |
| Green | `#00fe00` | Teal | `#05faf9` |
| Purple | `#bd2bbb` | — | — |

Sources: [Player](https://ageofempires.fandom.com/wiki/Player).

| Rule | Value |
|---|---|
| Team-based vs unique colours | `Insert` (secondary `Ctrl+-`) toggles "Team-based or Unique player colors"; **UNVERIFIED** (community source) |
| Minimap terrain legibility | Unexplored territory is black; the player's current line of sight is brighter; fog-covered areas are dimmer; tan terrain marks Stealth Forest |
| Strong Contrast Mode | Available, to help distinguish screen elements |
| UI narration | Available, but the in-game HUD is explicitly **not** narrated |
| UI scale / HUD repositioning | **UNVERIFIED** — no source consulted documents a UI-scale slider or movable HUD panels; the only documented HUD-adjacent adjustments are minimap size and camera pan speed |

Sources: [Player](https://ageofempires.fandom.com/wiki/Player), [Mini map](https://ageofempires.fandom.com/wiki/Mini_map), [official Age IV on Xbox Accessibility Options](https://www.ageofempires.com/age-iv-on-xbox-accessibility-options/), [DefKey](https://defkey.com/age-of-empires-4-shortcuts).

---

## 2. Default hotkeys

The in-game Controls screen groups bindings into **Game, Diplomacy, Unit Selection, Building Selection, Control Groups, Communication, Camera**, each with a Primary Key and a Secondary Key. Hotkeys are fully remappable; **Grid Keys** and **Fully Remappable** are separate profiles and changes do not copy between them. Non-English keyboards remap the pan keys to the key at the same physical location.

### 2.1 Camera

| Action | Primary | Secondary / alternate | Status |
|---|---|---|---|
| Pan camera up / down / left / right | `↑` / `↓` / `←` / `→` | `Alt+W` / `Alt+S` / `Alt+A` / `Alt+D` | CONFIRMED (official article + DefKey) |
| Rotate camera (free) | Hold `Alt` + move mouse | `Caps Lock` (hold) per DefKey | CONFIRMED (official article) |
| Rotate camera 45° counter-clockwise | `[` | `Num 6` | CONFIRMED (community) |
| Rotate camera 45° clockwise | `]` | `Num 4` | CONFIRMED (community) |
| Zoom camera | Mouse scroll wheel | — | CONFIRMED |
| Reset / centre camera | `Backspace` | `Num 0` | CONFIRMED (community) |
| Focus on selected unit(s) | `F5` | `J`, `Home` (follow) | CONFIRMED (community) |

Sources: [official Shortcuts Revealed](https://www.ageofempires.com/news/aoeiv-shortcuts-revealed/), [DefKey](https://defkey.com/age-of-empires-4-shortcuts).

### 2.2 Selection and economy

| Action | Primary | Secondary / alternate | Status |
|---|---|---|---|
| Select idle villagers (cycle) | `.` | `N` | CONFIRMED (official article) |
| Cycle through idle economy units | `.` | `N` | CONFIRMED (community; idle economy covers villagers, trade carts, fishing ships, trade ships, Chinese officials) |
| Select all idle villagers | `Ctrl+.` | `Ctrl+↑` | CONFIRMED (community) |
| Cycle through idle military units | `,` | `↓` | CONFIRMED (community) |
| Select all idle military units | `Ctrl+,` | `Ctrl+↓` | CONFIRMED (community) |
| Select all villagers | `Ctrl+Shift+V` | `↑` | CONFIRMED (community) |
| Select all military units | `Ctrl+Shift+C` | `Ctrl+M` | CONFIRMED (community) |
| Select all units on screen | `Ctrl+A` | `Ctrl+K` | CONFIRMED (community) |
| Cycle through selected units / unit types | `Tab` | `Ctrl+Tab` (reverse), `→` / `←` | CONFIRMED (community) |
| Cycle villagers gathering Food | `Ctrl+F` | `Ctrl+V` | CONFIRMED (community) |
| Cycle villagers gathering Wood | `Ctrl+W` | `Ctrl+B` | CONFIRMED (community) |
| Cycle villagers gathering Gold | `Ctrl+G` | `Ctrl+J` | CONFIRMED (community) |
| Cycle villagers gathering Stone | `Ctrl+S` | `Ctrl+K` | CONFIRMED (community) |
| Cycle through Town Centers | `H` | `L` | CONFIRMED (community) |
| Focus on Capital Town Center | `Ctrl+H` | `Ctrl+L` | CONFIRMED (community) |
| Select all Military production buildings | `F1` | `M` | CONFIRMED (official article) |
| Select all Economic buildings | `F2` | `K` | CONFIRMED (official article) |
| Select all Research/Tech buildings | `F3` | `O` | CONFIRMED (official article) |
| Select all Landmarks, Wonders and Capital Town Centers | `F4` | `P` | CONFIRMED (community) |
| Return all villagers to work (from Seek Shelter) | `Ctrl+Shift+R` | — | CONFIRMED (in-game screenshot) |
| Focus on last attack notification | `SPACE` | — | CONFIRMED (in-game screenshot) |

**Note on "Select all Town Center".** The official launch article lists only *Center screen on the Town Center* = `H`. The `H`/`L` binding is documented by community sources as "Cycle through Town Centers" and `Ctrl+H`/`Ctrl+L` as "Focus on Capital Town Center". The official article's "select all" family is the F1–F3 building-type family above; there is no confirmed single "select all Town Centers" key.

Sources: [official Shortcuts Revealed](https://www.ageofempires.com/news/aoeiv-shortcuts-revealed/), [official in-game Controls screenshot](https://support.ageofempires.com/hc/en-us/articles/42690923461524-Age-of-Empires-IV-Keyboard-and-Mouse-Setup), [PCGamesN](https://www.pcgamesn.com/age-of-empires-4/hotkeys-keyboard-shortcuts), [DefKey](https://defkey.com/age-of-empires-4-shortcuts).

### 2.3 Production, control groups and orders

| Action | Binding | Status |
|---|---|---|
| Build menu (villager build card) | Opens with the selected villager; Age tabs `Q`/`W`/`E`/`R`, buildings on the grid keys (§1.2) | CONFIRMED (official article) |
| Train unit / research at a selected building | Grid keys on the building's command card (`Q W E R` / `A S D` / `Z X C`) | CONFIRMED (scheme) / UNVERIFIED (per-building mapping) |
| Set control group | `Ctrl+0`…`Ctrl+9` (setting a group with nothing selected clears it) | CONFIRMED (official article) |
| Select control group | `0`…`9` | CONFIRMED (community) |
| Add to control group | `Shift+0`…`Shift+9` | CONFIRMED (community) |
| Shift-to-queue orders | `Shift` + any command ("With a Unit selected, set multiple commands"); `Shift`+click ground queues building/ability placement | CONFIRMED (official article) |
| Shift + production button | Queues 5 units of that type | UNVERIFIED (community only) |
| Cancel last production item | `B` | CONFIRMED (in-game screenshot) |
| Cancel all production in selected buildings | `N` | CONFIRMED (in-game screenshot) |
| Delete unit or building | `Del` (hold); `Ctrl+=` | CONFIRMED (community) |
| Game menu | `F10` | CONFIRMED (in-game screenshot) |
| **Attack-move** | Not present in the official launch article; not found in any consulted list | **UNVERIFIED** |
| **Stop** | Not present in any consulted source | **UNVERIFIED** |
| **Hold / Stand Ground** | Stand Ground is a real command (the only explicit stance in AoE IV) but no default key was found | **UNVERIFIED (key) / CONFIRMED (command exists)** |
| **Patrol** | Not found. The wiki's *Patrol* page describes an *Age of Empires III: Definitive Edition* technology, not an AoE IV order | **UNVERIFIED (likely absent)** |
| Secondary UI panel (advanced unit commands) | `Y`, with a unit selected | UNVERIFIED (community only) |

Sources: [official Shortcuts Revealed](https://www.ageofempires.com/news/aoeiv-shortcuts-revealed/), [official in-game Controls screenshot](https://support.ageofempires.com/hc/en-us/articles/42690923461524-Age-of-Empires-IV-Keyboard-and-Mouse-Setup), [DefKey](https://defkey.com/age-of-empires-4-shortcuts), [Unit stance](https://ageofempires.fandom.com/wiki/Unit_stance), [Patrol](https://ageofempires.fandom.com/wiki/Patrol).

---

## 3. Camera

### 3.1 Camera modes and options

| Property | Value | Status |
|---|---|---|
| Camera modes | **Classic** and **Panoramic**, selected from a dropdown in Options → Camera | CONFIRMED (official screenshot) |
| Default mode | Classic | CONFIRMED (official screenshot) |
| Camera options | Pan Speed (%), Pan Inertia (%), Zoom Speed (%), Camera Mode dropdown, and a "Marquee Options" section below them | CONFIRMED (official screenshot) |
| Tooltip on the panel | "Sets the default camera zoom level. Setting applies when you start a new game." | CONFIRMED (official screenshot) |
| Steady camera / pan speed | Adjustable at any time from Options → Camera | CONFIRMED (official accessibility page) |
| Mode change timing | Community reports Classic↔Panoramic changes only take effect on a new game; **UNVERIFIED** | UNVERIFIED |
| Zoom notch counts (e.g. Classic sitting N notches from closest) | No source | **UNVERIFIED** |

Sources: [official camera settings screenshot](https://cdn.ageofempires.com/aoe/wp-content/uploads/2023/08/scrn_settings_camera_1152_2048-1080x608.webp), [official Age IV on Xbox Accessibility Options](https://www.ageofempires.com/age-iv-on-xbox-accessibility-options/).

### 3.2 Default camera values from game data

The game selects its gameplay camera from a "camera switchboard": single-player/skirmish uses `default_autodeclinate`, multiplayer uses `default_autodeclinate_mp`. Both are auto-declination cameras, so pitch and FOV shift with terrain height within the clamps below. Angles are degrees; distance is in engine units.

| Parameter | Skirmish (`default_autodeclinate`) | Multiplayer (`default_autodeclinate_mp`) |
|---|---|---|
| Default yaw | 135 | 135 |
| Default pitch | not published; clamps are `pitch_min` 40 → `pitch_max` 47.27 | `pitch_min` 40 → `pitch_max` 45 |
| Default distance | 58 | 68 |
| Distance range (`distance_min` → `distance_max`) | 36 → 68 | 36 → 68 |
| Default FOV | 41.1 | 41.1 |
| FOV range (`fov_min` → `fov_max`) | 39.96 → 43.6 | 41.1 → 43.6 |
| Scripted orbit step | `orbit_delta` = 45°, `orbit_duration` = 0.1 s | (inherited camera script) |
| Rotation input | `enable_orbit_input` = true | `enable_orbit_input` = true |
| Pitch input | `enable_pitch_input` = false (pitch is automatic, not player-driven) | — |
| Zoom input rates | `distance_rate_wheel` = 5, `distance_rate_wheel_in` = 1, `distance_rate_wheel_out` = 1 | same |
| Near/far clip | 1 / 3600 | 1 / 3600 |

The 45° `orbit_delta` matches the documented 45° rotation step used by `[`, `]` and the minimap rotate buttons. The closest/furthest zoom ratio in the data is 68/36 ≈ **1.89×** (DERIVED).

Other camera bags exist in the data but are not the gameplay default: `default_isometric` (pitch 0–89, distance 160–420, FOV 45), `default_orbit` / `orbit_list` (tilt 15–75, distance 5–25000, FOV 60 — a wide-range orbit rig), `default_free` (debug), `default_empire_mode` → `default_autodeclinate_cluster_mode` (empire/zoom-out mode), and several `new_autodeclinate_*` / `old_*` variants (e.g. `new_autodeclinate_30mm`: pitch 38–45, distance 25–60, FOV 43.6–46.4).

Sources: [attrib `camera/default_autodeclinate.json`](https://github.com/aoemods/attrib/blob/master/camera/default_autodeclinate.json), [attrib `camera/default_autodeclinate_mp.json`](https://github.com/aoemods/attrib/blob/master/camera/default_autodeclinate_mp.json), [attrib `camera_switchboard/default.json`](https://github.com/aoemods/attrib/blob/master/camera_switchboard/default.json), [attrib `camera_switchboard/multiplayer.json`](https://github.com/aoemods/attrib/blob/master/camera_switchboard/multiplayer.json), [attrib `camera/default_isometric.json`](https://github.com/aoemods/attrib/blob/master/camera/default_isometric.json), [Mini map](https://ageofempires.fandom.com/wiki/Mini_map).

---

## 4. Selection and orders

| Input | Effect | Status |
|---|---|---|
| Left click on a unit/building | Select that entity | CONFIRMED |
| Left click on ground | Confirm building or ability placement | CONFIRMED |
| Left click + drag | Bandbox select all own units inside the box | CONFIRMED |
| Double-click on a unit | Select all **visible** units of the same type | CONFIRMED (community) |
| `Shift` + click on a unit | Add / remove that unit from the selection | CONFIRMED (community) |
| `Ctrl` + click | Listed adjacent to the selection bindings by DefKey with an empty label | **UNVERIFIED** |
| Right click | Issue the contextual order to the selection (move, attack, gather, …) | CONFIRMED |
| Right click + drag | Issue a facing move order | CONFIRMED (community) |
| `Shift` + command | Queue the command instead of replacing the current order list | CONFIRMED (official) |
| `Shift` + click ground | Queue building or ability placement | CONFIRMED (community) |
| `Shift` + production button | Queue 5 units of that type | UNVERIFIED |
| `Esc` | Cancel / deselect (not user-remappable) | CONFIRMED (community) |
| `Tab` | Cycle through selected units, then through selected unit types | CONFIRMED (community) |
| Attack-move | Exists as a concept in the data (`combat_ext.attack_move` with `attack_move_targeting_range` = 25 and a distance priority of −0.2 per metre), but no default key was found | **UNVERIFIED (key) / CONFIRMED (mechanic)** |
| Stand Ground | AoE IV's only explicit unit stance. Units do not move to attack, attack anything in range, become impassable to allies and enemies, and revert to the default stance if given a move command | CONFIRMED |
| Default (no stance) | Behave between the older Aggressive and Defensive stances: pursue enemies automatically while in reach, return to the original position if the enemy is lost | CONFIRMED |
| Patrol | Not found in any consulted source | **UNVERIFIED** |

Sources: [DefKey](https://defkey.com/age-of-empires-4-shortcuts), [official Shortcuts Revealed](https://www.ageofempires.com/news/aoeiv-shortcuts-revealed/), [Unit stance](https://ageofempires.fandom.com/wiki/Unit_stance), [attrib `ebps` combat extension](https://github.com/aoemods/attrib/tree/master/ebps).

---

## 5. Skirmish lobby options

### 5.1 Game modes

| Mode | Rule |
|---|---|
| Standard | Capital Town Center + 6 Villagers + a scouting unit, varying slightly by civilization |
| Empire Wars | Dark Age start with significantly more Villagers and several pre-built buildings; starting Age and resources are locked |
| Nomad | One fewer Villager, no Capital Town Center, Villagers scattered; the Capital TC can be built for free |
| Sandbox | Standard, with all victory conditions disabled |
| Scenario | Conditions fixed by the scenario |
| Seasonal | Temporary modes added by updates |

Sources: [Game mode (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Game_mode_(Age_of_Empires_IV)).

### 5.2 Map types and biomes

| Property | Value |
|---|---|
| Generated maps | 74 random maps, all selectable in Skirmish and Custom games |
| "Random Map" toggle | Picks randomly from a player-built list; the map is revealed only when the match loads |
| Map pools | Ranked uses a small rotating subset; Quick Match a larger subset |
| Crafted maps | Appear on a separate tab |
| Neutral features | Randomly placed neutral Trade Posts, Sacred Sites and Points of Interest |
| Biomes | 20 non-seasonal biomes (e.g. European Temperate, Taiga Summer/Winter, Steppes, Gobi Desert, Asian Temperate/Subtropical, Chalk Downs, Mediterranean, Sahara Desert, Japanese Spring, Savanna, Alpine Springs, Black Sand Beach, Greek Islands, Temperate Fall, Tropical Rainforest, Tropical Swamp, Madagascar, Yellow River); biome changes trees, ground colour, forest density and colour filter, and can shift resource/relic positions on the same seed |
| Map options | Map, map size, biome, starting-location distribution (**Teams Together** vs **Random Locations**), and an explicit map seed |

Sources: [Random map](https://ageofempires.fandom.com/wiki/Random_map), [Game mode (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Game_mode_(Age_of_Empires_IV)).

### 5.3 Map sizes

Two figures exist for each size and they differ by exactly a factor of 4. The wiki figure is given in "tiles"; the extracted game data gives `playable_dimensions` in engine units. Both are reported.

| Size (wiki name) | Wiki tiles | Game-data playable dimensions | Game-data total dimensions | Max players |
|---|---|---|---|---|
| Micro | 104 × 104 | 416 × 416 | 544 × 544 | 2 |
| Small | 128 × 128 | 512 × 512 | 640 × 640 | 4 |
| Medium | 160 × 160 | 640 × 640 | 768 × 768 | 6 |
| Large | 192 × 192 | 768 × 768 | 896 × 896 | 8 |
| Gigantic | 256 × 256 | 1024 × 1024 | 1152 × 1152 | 8 |

Additional size records exist in the data without a published name: 288 × 288 (total 416 × 416, used by campaign records) and 480 × 480 (total 640 × 640, max 2 players). `map_size_768` and `map_size_1024` carry `max_players = -1` (no data-level cap); the 8-player ceiling comes from the game's player limit. `chunk_size` is 16 for every non-campaign size.

Sources: [Random map](https://ageofempires.fandom.com/wiki/Random_map), [attrib `map_gen/map_gen_size/map_size_512.json`](https://github.com/aoemods/attrib/blob/master/map_gen/map_gen_size/map_size_512.json), [attrib `map_gen/map_gen_size/map_size_416.json`](https://github.com/aoemods/attrib/blob/master/map_gen/map_gen_size/map_size_416.json), [attrib `map_gen/map_gen_size/map_size_640.json`](https://github.com/aoemods/attrib/blob/master/map_gen/map_gen_size/map_size_640.json).

### 5.4 Players, teams and slots

| Property | Value |
|---|---|
| Maximum players | 8 (player + up to 7 additional AIs, as long as the map size supports it) |
| Teams | Any number from 1 to 8 distinct teams |
| Per-player lobby settings | Player colour, civilization, team, AI difficulty |
| AI difficulty per slot | Set independently for each AI |
| Sandbox | Skirmish can run with no AI at all, but some maps generate differently and some do not spawn fairly with mismatched team sizes |
| Default AI difficulty | Intermediate |
| Presets | "Solo Battle vs A.I" (1v1) and "A.I. Teammates vs A.I" (2v2, 3v3, 4v4, 2v2v2), with eight rotating presets each and four featured presets rotating daily from 52 |
| Custom multiplayer lobby settings | Number of players, AI difficulty and civilization, lobby privacy, player colours, allow observers, spectator delay, map layout, map size, biome, team starting locations, map seed, game mode, win conditions, mods, allow cheats, allow pause, display player scores, starting resources, starting age, map visibility, reveal on elimination |
| Cross-input | Available for custom matches only; All (default), Keyboard & Mouse only, Controller only (console default) |

Sources: [Game mode (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Game_mode_(Age_of_Empires_IV)), [Multiplayer](https://ageofempires.fandom.com/wiki/Multiplayer), [Cross-network and input settings for Age IV](https://support.ageofempires.com/hc/en-us/articles/24392126344340-Cross-network-and-input-settings-for-Age-IV).

### 5.5 Starting resources (Standard game mode)

| Setting | Food | Wood | Gold | Stone |
|---|---|---|---|---|
| Standard | 200 | 150 | 100 | — (varies slightly by civilization) |
| High | 2,000 | 2,000 | 1,000 | 800 |
| Very High | 50,000 | 50,000 | 25,000 | 10,00 (wiki typo; almost certainly 10,000 — **UNVERIFIED**) |
| Maximum | 100,000 | 100,000 | 100,000 | 100,000 |

Sources: [Game mode (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Game_mode_(Age_of_Empires_IV)).

### 5.6 Victory conditions

| Condition | Rule | On by default |
|---|---|---|
| Landmark | Destroy all enemy landmarks; in a team game, all landmarks of the enemy team | Yes |
| Sacred | Capture and hold all Sacred Sites. Capturing starts in the Castle Age via a religious unit (Delhi Sultanate from the Feudal Age with Sanctity). Holding all sites starts a **10-minute** countdown; neutralising any site stops the countdown and loses all progress | Yes |
| Wonder | Build and defend a Wonder for **15 minutes**. Enemies are warned when construction starts; the Wonder is visible to all players and marked on the minimap | Yes |
| Dominion | Added with Season Seven. Each player starts with a Monarch; killing enemy or neutral Monarchs grants victory. The only condition off by default, and the only one unavailable in Quick Match/Ranked (except free-for-all) | No |
| Annihilation | Cannot be disabled; the fallback when all other conditions are off. Triggers when a player kills all of another player's units — buildings are not required | Always |

Victory overall requires all players on the enemy team to lose; a single player can also lose alone. With no victory condition chosen, the game can run without end. Lobby equivalents: win conditions are toggles (Landmarks, Sacred, Wonder visible in the official lobby screenshot), and Dominion is the only one off by default.

Sources: [Victory](https://ageofempires.fandom.com/wiki/Victory), [Game mode (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Game_mode_(Age_of_Empires_IV)), [official lobby screenshot](https://cdn.ageofempires.com/aoe/wp-content/uploads/2023/08/scrn_difficulty_AI_1152_2048-1080x608.webp).

### 5.7 Game speed

| Claim | Detail | Status |
|---|---|---|
| AoE IV lobby has a game-speed option | **Not found.** Neither the AoE IV custom-lobby settings list nor the official skirmish-lobby screenshot contains a speed setting | CONFIRMED (absence in the sources) |
| Official series-generic guidance | "Each Age of Empires game lets you set the default speed of the game … adjust this setting at any time when playing single-player, or at the start of a multiplayer match. From the main menu, go to Options > Settings > Speed (far left)" | CONFIRMED (but series-generic) |
| AoE IV Options menu | The official AoE IV Options menu categories are Accessibility, Controls, Camera, Game, Visuals, Audio, Social — there is **no** Speed entry | CONFIRMED (official screenshot) |
| Community hotkeys | `-` Slower and `=` Faster (secondary `Num -` / `Num +`) | UNVERIFIED (community only) |
| Community-reported values | A bug report describes a working AoE IV speed control with a dropdown, `+`/`-` hotkeys, a "Lock Speed" option and observed multipliers of 1.5 and 1.7 (1.7 displaying as "Fast") | UNVERIFIED |

Sources: [official camera/settings screenshot](https://cdn.ageofempires.com/aoe/wp-content/uploads/2023/08/scrn_settings_camera_1152_2048-1080x608.webp), [Multiplayer](https://ageofempires.fandom.com/wiki/Multiplayer), [Tips for Optimizing your Age of Empires Experience](https://support.ageofempires.com/hc/en-us/articles/4406592811156-Tips-for-Optimizing-your-Age-of-Empires-Experience), [DefKey](https://defkey.com/age-of-empires-4-shortcuts).

---

## 6. Fog of war

### 6.1 Reveal states

Chosen in the lobby as **Map State** (called "Map Visibility" in the custom-multiplayer settings list):

| State | Effect |
|---|---|
| Concealed | Line of sight only around starting units and buildings; the rest of the map is unexplored |
| Explored | The whole map is explored, but fog of war still covers it |
| Revealed | The whole map is explored and visible; no fog of war |

"Reveal on Elimination" controls whether eliminated players have the map revealed to them. In single player the map is always revealed at the end of a game by default, so the option mainly makes that happen slightly earlier.

Sources: [Game mode (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Game_mode_(Age_of_Empires_IV)), [Multiplayer](https://ageofempires.fandom.com/wiki/Multiplayer).

### 6.2 The line-of-sight model

Line of sight is a **3D volume, not a circle**. Every unit and building defines four values — **inner height, inner radius, outer height, outer radius** — plus a cone angle (360° for standard units). The Content Editor visualises this as a lampshade: the inner circle is the top, the outer circle the bottom. Inner height is positive (above the unit), outer height negative (below it).

| Rule | Value |
|---|---|
| Maximum LoS applies only | At high elevation looking down (cliffs, King of the Hill) or when standing on Stone Walls |
| LoS on flat terrain | 3–4 tiles smaller than the maximum |
| Minimum LoS | Always 6 tiles smaller than the maximum |
| Uphill | Drops significantly going up traversable hills; very tall cliffs can block LoS entirely |
| Most buildings | `outer_height` = 0, so they gain no LoS advantage from high ground |
| LoS update | Updates at short intervals as a unit moves, not smoothly, so instantaneous LoS can exceed the statistics |
| Garrison | A garrisoned unit **retains its LoS**, so garrisoning a long-sight unit inside a ram or building extends that entity's vision |
| Sacred Sites | Once captured they become revealed to all players |
| Longest LoS of anything | Imperial Palace, 27.5 tiles |
| Longest LoS of any unit | Counterweight Trebuchet, 20 tiles maximum |
| Longest LoS of a common building | Outpost, 15 tiles maximum by default; Town Center second at 13 |

Sources: [Line of Sight](https://ageofempires.fandom.com/wiki/Line_of_Sight).

### 6.3 Sight radii (game data)

Raw `sight_package` values from the aoe4world dataset, which is parsed from game files. The last column applies the DERIVED ÷4 conversion (§0). "Max LoS" is the outer radius — it applies only at high elevation looking down or from Stone Walls.

| Entity | inner_radius | outer_radius | inner_height | outer_height | Max LoS (tiles, DERIVED) |
|---|---|---|---|---|---|
| Villager | 4 | 28 | 10 | −15 | 7 |
| Knight / Horseman | 4 | 28 | 10 | −15 | 7 |
| Spearman / Man-at-Arms / Archer (Age II) | 12 | 36 | 10 | −15 | 9 |
| Crossbowman (Age III) | 16 | 40 | 10 | −15 | 10 |
| Longbowman (Age II) | 20 | 44 | 10 | −15 | 11 |
| Battering Ram | 8 | 30 | 10 | −15 | 7.5 |
| Bombard | 32 | 56 | 10 | −15 | 14 |
| Carrack | 50 | 50 | 10 | −15 | 12.5 |
| Counterweight Trebuchet | 56 | 80 | 10 | −15 | 20 |
| Scout | 12 | 41 | **501** | −15 | 10.25 |
| House | 10 | 15 | 8 | 0 | 3.75 |
| Town Center | 28 | 52 | **501** | −15 | 13 |
| Outpost | 35 | 60 | **501** | −20 | 15 |
| Keep (Age III) | 40 | 41 | **501** | −15 | 10.25 |
| Barbican of the Sun | 35 | 60 | **501** | −20 | 15 |
| Kremlin | 35 | 84 | **501** | −20 | 21 |
| Imperial Palace | 110 | 110 | **5000** | −5000 | 27.5 |

The `inner_height` column is the mechanism behind stealth forests: units sit at 10, the buildings that can see through stealth forests sit at 501, and the Imperial Palace sits at 5000 (see §6.4).

Sources: [aoe4world/data `units/english/man-at-arms-2.json`](https://github.com/aoe4world/data/blob/main/units/english/man-at-arms-2.json), [aoe4world/data `buildings/english/town-center-1.json`](https://github.com/aoe4world/data/blob/main/buildings/english/town-center-1.json), [Line of Sight](https://ageofempires.fandom.com/wiki/Line_of_Sight).

### 6.4 Terrain that blocks line of sight

Extracted game data gives each blocking terrain type an explicit `line_of_sight_blocker_height`. Because unit and building `inner_height` values are compared against it, the exceptions in the wiki are reproduced exactly.

| Terrain | `line_of_sight_blocker_height` | Impassable? | Buildable? | Who can see through |
|---|---|---|---|---|
| Stealth Forest (`standard_stealth_woods`) | 500 | No | Yes (`generate_cant_build_blockers` = false) | Entities with `inner_height` > 500: Scout (501), Town Center, Outpost, Keep, Barbican, Kremlin — but only at their **minimum** LoS. Units (inner_height 10) cannot |
| Stealth Water (`standard_ocean_stealth`) | 500 | No | Yes | Fishing Boat (the Scout Ship was cut during development) |
| Dense forest (`standard_dense_woods`, `forest_dense_woods`) | 1000 | Yes (impass generated for the infantry and vehicle path types) | No | Only the Imperial Palace (`inner_height` 5000) |

Additional rules: enemy units inside a Stealth Forest are revealed only if directly adjacent to opposing units or when a unit comes under attack. Scouts, Fishing Boats, Town Centers, Outposts, Keeps and Stone Wall Towers have high enough LoS height to see through Stealth Forests but only at their minimum LoS. Scouts on level ground are only about one tile short of their maximum, which is why they are the practical answer to stealth terrain.

Sources: [attrib `mesh_area_properties/standard_stealth_woods.json`](https://github.com/aoemods/attrib/blob/master/mesh_area_properties/standard_stealth_woods.json), [attrib `mesh_area_properties/standard_dense_woods.json`](https://github.com/aoemods/attrib/blob/master/mesh_area_properties/standard_dense_woods.json), [attrib `mesh_area_properties/standard_ocean_stealth.json`](https://github.com/aoemods/attrib/blob/master/mesh_area_properties/standard_ocean_stealth.json), [Line of Sight](https://ageofempires.fandom.com/wiki/Line_of_Sight).

### 6.5 Unit stealth and temporary vision

| Effect | Rule |
|---|---|
| Musofadi Warrior / Musofadi Gunner (Mali) | Activatable Stealth lasting **30 seconds** or until they enter combat |
| Shinobi (Japan) | Can disguise itself as an enemy Villager |
| Fort of the Huntress | Passively applies stealth to friendly infantry inside its aura while out of combat, lingering **30 seconds** after leaving (10 seconds before Season Five) |
| Revealers | Scouts, Outposts and Capital Town Centers automatically reveal hidden units that enter their LoS |
| Imperial Spies | Reveals the location of all enemy Villagers, Traders, Trade Ships, Fishing Boats and Officials for **15 seconds** (10 before update 11.0.782), revealing a **3-tile** radius around each (1.25 before update 11.0.782); 2-minute cooldown |
| Scouting Falcon (Khan / Mongol Scout) | Provides vision in a **10-tile** radius for **30 seconds**; 60-second cooldown |
| Setup Camp (English Scouts / Men-at-Arms) | Campfires cost 25 wood, give +30% LoS to nearby allied units, ~1-second cooldown, maximum five active at once |
| Shinobi Scout (Koka Township) | Vision in a **10-tile** radius for **20 seconds** anywhere on the map; 120-second cooldown afterwards |

Sources: [Stealth mode](https://ageofempires.fandom.com/wiki/Stealth_mode), [Line of Sight](https://ageofempires.fandom.com/wiki/Line_of_Sight).

---

## 7. AI difficulty levels and documented behaviour

### 7.1 The difficulty ladder

| Property | Value | Status |
|---|---|---|
| Number of options for Skirmish / Custom vs A.I. | **7** | CONFIRMED (official) |
| Names, in ladder order | Easy, Intermediate, Hard, Hardest, Ridiculous, Outrageous, Absurd | CONFIRMED (official screenshot shows Easy → Outrageous; the official accessibility page names Ridiculous, Outrageous and Absurd) |
| Default | Intermediate | CONFIRMED (wiki) |
| Per-player | Each AI's difficulty is chosen independently in the lobby | CONFIRMED |
| Top three | Ridiculous, Outrageous and Absurd "introduce various boosts" | CONFIRMED (official) |
| Boosts applied to the top three | Resource-gathering boosts at **1.2×, 1.5× and 2×** the normal rate, applied incrementally beyond Hardest | CONFIRMED (official patch note) |
| Boost-to-name mapping | The patch note lists the three multipliers in ascending order but does not name them; assigning 1.2× to Ridiculous, 1.5× to Outrageous and 2× to Absurd is an inference | **UNVERIFIED** |
| Hardest resource boost | Reverted: "We have reverted the resource-gathering boost which we had given to Hardest AI but kept other improvements" | CONFIRMED (official patch note) |
| Availability in multiplayer | The custom-multiplayer settings list includes "AI difficulty and civilization", so AI difficulty is selectable in custom multiplayer lobbies; whether all seven tiers are offered there is not documented | CONFIRMED (setting exists) / **UNVERIFIED** (tier availability) |

Sources: [official AI difficulty screenshot](https://cdn.ageofempires.com/aoe/wp-content/uploads/2023/08/scrn_difficulty_AI_1152_2048-1080x608.webp), [official Age IV on Xbox Accessibility Options](https://www.ageofempires.com/age-iv-on-xbox-accessibility-options/), [official Season Four patch 6.1.130](https://www.ageofempires.com/news/age-of-empires-iv-season-four-patch-6-1-130/), [Game mode (Age of Empires IV)](https://ageofempires.fandom.com/wiki/Game_mode_(Age_of_Empires_IV)), [Multiplayer](https://ageofempires.fandom.com/wiki/Multiplayer).

### 7.2 What changes between difficulties (game data)

The AI carries two independent per-difficulty datasets. The **combat AI settings** exist for four profiles — `default_skirmish_easy`, `_standard`, `_hard`, `_hardest`. Of 208 keys, only eight differ:

| Setting | easy | standard | hard | hardest |
|---|---|---|---|---|
| `target_identification.detect_squads_in_fog_of_war` | true | false | true | true |
| `target_identification.detect_squads_in_camoflauge` | true | false | true | true |
| `combat_ratings.allow_builders_to_enter_combat` | true | false | true | true |
| `fallback.fallback_capacity_ratio` | 0.5 | −1 | 0.5 | 0.5 |
| `fallback.fallback_squad_health_ratio_start` | 0.5 | 0 | 0.5 | 0.5 |
| `fallback.fallback_squad_health_ratio_end` | 0.99 | 0 | 0.99 | 0.99 |

Sources: [attrib `ai/ai_settings/default_skirmish_standard.json`](https://github.com/aoemods/attrib/blob/master/ai/ai_settings/default_skirmish_standard.json), [attrib `ai/ai_settings/default_skirmish_easy.json`](https://github.com/aoemods/attrib/blob/master/ai/ai_settings/default_skirmish_easy.json), [attrib `ai/ai_settings/default_ai_settings` directory](https://github.com/aoemods/attrib/tree/master/ai/ai_settings).

(The remaining two differing keys are the profile alias loc-IDs and the internal `pbgid`.) The `standard` column being `false`/`0` while both `easy` and `hard` are `true` is counter-intuitive and is reported as data, not as a difficulty statement.

The **state-model tunings** exist for five profiles — `skirmish_difficulty_easy`, `_core` (base), `_standard`, `_hard`, `_expert` — each overriding a small set of float tunables:

| Tunable | easy | core | standard | hard | expert |
|---|---|---|---|---|---|
| `ai_difficulty_archer_reposition_time_interval` | 0 | 6 | 0 | 6 | 6 |
| `ai_difficulty_encounter_cavalry_random_use_threat_path_chance` | 0 | 1 | 0 | 1 | 1 |
| `ai_difficulty_encounter_fallback_combat_rating` | −1 | 0.15 | −1 | 0.1 | 0.15 |
| `ai_difficulty_encounter_fallback_combat_rating_harass` | 0.1 | 0.2 | 0.1 | 0.1 | 0.2 |
| `ai_difficulty_encounter_fallback_squad_health_threshold` | 0.3 | 0.3 | 0.2 | 0.3 | 0.3 |
| `ai_difficulty_encounter_fallback_squad_health_percent` | 0.75 | 0.75 | 0.75 | 0.75 | 0.75 |
| `ai_difficulty_encounter_fallback_squads_remaining_percent` | 0.1 | 0.25 | 0.25 | 0.25 | 0.25 |
| `ai_difficulty_encounter_fallback_squads_remaining_percent_harass` | 0.2 | 0.4 | 0.3 | 0.4 | 0.4 |
| `ai_difficulty_encounter_fallback_squad_health_percent_harass` | 0.4 | 0.4 | 0.4 | 0.4 | 0.4 |

**Naming caveat.** The data uses `standard` and `expert`, which do not match the seven display names. Mapping `standard` → Intermediate and `expert` → one of the Hardest/Ridiculous tiers is **UNVERIFIED**. Ridiculous, Outrageous and Absurd have no separate combat-AI file, which suggests they reuse the Hardest combat profile plus the documented resource boost — also **UNVERIFIED**.

Sources: [attrib `ai/ai_settings/default_skirmish_standard.json`](https://github.com/aoemods/attrib/blob/master/ai/ai_settings/default_skirmish_standard.json), [attrib `ai/ai_settings/default_skirmish_easy.json`](https://github.com/aoemods/attrib/blob/master/ai/ai_settings/default_skirmish_easy.json), [attrib `ai/ai_statemodel_tunings/skirmish_difficulty_hard.json`](https://github.com/aoemods/attrib/blob/master/ai/ai_statemodel_tunings/skirmish_difficulty_hard.json), [attrib `ai/ai_statemodel_tunings/skirmish_difficulty_core.json`](https://github.com/aoemods/attrib/blob/master/ai/ai_statemodel_tunings/skirmish_difficulty_core.json).

### 7.3 AI economy, scouting and construction parameters

| Parameter | Value |
|---|---|
| Scouting map grid size | 48 |
| Scout-map certainty curve half-life | 30 seconds |
| Minimum time since a tile was seen before the AI treats it as uncertain | 30 seconds |
| Cancel construction when the building drops to | 25% health |
| Construction considered "nearly finished" at | 80% progress |
| Wood placement: ignore a resource when map total is below | 0.15 (15%) of the map total; other resources use 1 (100%) |
| `player_uses_constraints` | true |
| `force_disable_ai` | false |
| Tactic retry timeouts and enable flags | per-tactic tables (avoid, cover, hold, ability, capture_point, force_attack, and others) |

Sources: [attrib `tuning_ai/tuning_ai.json`](https://github.com/aoemods/attrib/blob/master/tuning_ai/tuning_ai.json), [attrib `ai/ai_settings/default_skirmish_standard.json`](https://github.com/aoemods/attrib/blob/master/ai/ai_settings/default_skirmish_standard.json).

### 7.4 Campaign difficulty

Campaign uses a separate ladder: **four** difficulty settings including **Story mode**. In Story Mode the enemy will not probe the player's defences and mounts only light attacks.

Sources: [official Age IV on Xbox Accessibility Options](https://www.ageofempires.com/age-iv-on-xbox-accessibility-options/).

### 7.5 AI personalities and scenario-level difficulty

The data contains three strategizer personalities — `strategizer_balanced`, `strategizer_defensive`, `strategizer_offensive` — plus `ai_personality/default_skirmish.json`, `default_campaign.json` and `default_smoketest.json`. Scenario authors can pin an AI's difficulty: a player property of **Default** lets the lobby choose the difficulty, while any other value locks that AI to that level, and a **Lock AI Diff** slot flag exists.

Sources: [attrib `ai/ai_strategizer_personality/`](https://github.com/aoemods/attrib/tree/master/ai/ai_strategizer_personality), [attrib `ai/ai_personality/`](https://github.com/aoemods/attrib/tree/master/ai/ai_personality), [Adjusting Player Settings](https://support.ageofempires.com/hc/en-us/articles/5502424402324-Adjusting-Player-Settings).

---

## 8. Conflicts and gaps

### Conflicts

1. **Minimap corner.** The wiki's *User interface* page says lower-right; the wiki's *Mini map* page says lower-left. Community threads asking to *move* the minimap to the bottom-left imply lower-right. Best-supported reading: **lower-right**.
2. **Map tile dimensions.** The wiki lists Micro 104 × 104 … Gigantic 256 × 256; extracted game data gives playable 416 × 416 … 1024 × 1024. The two differ by exactly 4 in every case, matching the ÷4 relation that also reconciles the sight radii. Best-supported reading: the wiki figure is a smaller unit (or a legacy convention); the **game-data dimensions are authoritative**.
3. **Sight radii divisor.** The wiki's prose tile values match `outer_radius ÷ 4` exactly (Town Center 13, Outpost 15, Trebuchet 20, Imperial Palace 27.5). A commented-out table on the same wiki page (and older aoe4world output) uses `outer_radius ÷ 4.5`, giving 11.56 / 13.33 / 17.78 / 24.44 for the same entities. The wiki's own editor notes those values "seem to be wrong". Use **÷4**.
4. **Game speed.** The official *Tips for Optimizing* article describes an Options → Settings → Speed menu, but that article is written for the series generally; the AoE IV Options menu (official screenshot) has no Speed entry and the AoE IV lobby settings list has none. AoE IV appears to have **no game-speed lobby setting**; the community-reported 1.5 / 1.7 multipliers and `-` / `=` hotkeys are unverified.
5. **AI difficulty naming.** The game data uses `easy / standard / hard / expert` for state-model tunings and `easy / standard / hard / hardest` for combat settings, while the UI shows `Easy / Intermediate / Hard / Hardest / Ridiculous / Outrageous / Absurd`. The mapping between data names and display names is not documented.
6. **"Select all Town Center".** Official material documents `H` as *Center screen on the Town Center* and `Ctrl+H` as *Focus on Capital Town Center*; community material labels `H`/`L` as *Cycle through Town Centers*. There is no confirmed single "select all Town Centers" binding.

### Gaps (UNVERIFIED — do not implement without a better source)

- Attack-move default key; the mechanic exists in data but no binding was found.
- Stop and Hold/Stand Ground default keys; Stand Ground exists as a command with no confirmed key.
- Patrol as an AoE IV order — no evidence found that it exists at all.
- `Shift` + production button queueing exactly 5 units.
- Global production queue position, size, toggle, and whether it is a HUD element or an overlay.
- Scoreboard ("Players & Tribute panel") position and exact row contents; only the score formula and the `F6` toggle are supported.
- Whether the scoreboard is a full-screen overlay or a corner panel.
- UI scale, HUD repositioning, and any documented contrast/legibility design rules beyond Strong Contrast Mode.
- Number of rendered command-card slots (12 is derived from the 4 × 3 grid-key scheme, not from a screenshot).
- Default pitch for either camera bag (the auto-declination cameras publish clamps only; pitch is terrain-driven).
- Zoom notch counts and the exact notch positions of Classic vs Panoramic.
- Whether Classic ↔ Panoramic can be changed mid-match.
- Whether Ridiculous/Outrageous/Absurd are offered in multiplayer lobbies.
- Which of the three boost multipliers (1.2× / 1.5× / 2×) belongs to which of Ridiculous / Outrageous / Absurd.
- The Very High starting-stone value, which the wiki prints as "10,00" (a typo).
- Villager sight in the aoe4world dataset is `null`; the villager row in §6.3 uses the `villager-1` variant record.
- The unnamed 480 × 480 and 288 × 288 map-size records, and which game modes use them.
