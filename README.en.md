# Super Glob Maker

A 2D level-maker in the style of *Super Mario Maker*, set in the **Glob
Defenders** universe. Build your own platforming levels with Globs, Pyces and
dozens of mechanisms, play them, chain them into a Story Mode with a world map,
and (if you link your Glob Defenders account) save them to the cloud and share
them.

Super Glob Maker is the official *companion* project of Glob Defenders: it
shares its characters, resources and account.

> Spanish version: see [`README.md`](README.md).

---

## How to play

No install and no server required. Just open the game in your browser:

1. Open `index.html` in a modern browser (Chrome, Edge or Firefox).
2. From the menu you can play **Story Mode**, build levels in the **Editor**, or
   open **My Levels**.

> Tip: if your browser blocks a resource when opening the file directly, serve
> the folder with a simple local server, e.g. `python -m http.server`, then go
> to `http://localhost:8000`.

---

## Controls

| Action           | Keys                               |
|------------------|------------------------------------|
| Move             | Arrows ← → (or A / D)              |
| Jump             | Z · W · Up arrow                   |
| Run              | X · Shift                          |
| Shoot            | Space · C                          |
| Enter pipe       | Down arrow (while on top of it)    |

In the **editor**:

- **Click** places the selected element; **right-click / eraser** removes it.
- **Click again** on an object with a path (mushrooms, platforms, fire bar)
  cycles its size.
- **R** rotates pipes (vertical ↔ horizontal).
- **Ctrl+P** play-tests the level; **Esc** returns to the editor.

> On mobile, on-screen touch controls are shown (work in progress, see the
> plan).

---

## What's inside

- **Story Mode** with a world map in the style of SMM2 super worlds: worlds,
  paths, castles and hidden goals.
- **Editor** with a category palette (Terrain, Blocks, Pyces, Rare Pyces,
  Objects, Mechanisms, Special) and 3 start modes (Classic, Airy, Testing
  Ground).
- **Subzones**: a base zone plus up to 2 subzones, linked by pipes and doors
  (plain or key-locked).
- **Mechanisms**: A/B blocks, P-switch (coins ↔ blocks), "!" switches and
  blocks, slopes, donut blocks, note block, POW block, fire bar, springs,
  platforms on rails, character capsules, boxes, red coins and more.
- **A dozen-plus maps** with day/night palettes and a **Corrupt** variant (each
  map changes one rule of the level).
- **Full Pyce enemy roster**: ground, flying, aquatic (Pysh family), rare ones
  and bosses.
- **Configurable win conditions** (none, no-jumping, defeat X enemies, collect
  X coins, red coins) with progress shown in the HUD.
- **Glob Defenders account** (integration in progress): cloud save, publish and
  share levels using your same GlD account.

---

## Project structure

**MVC** architecture in vanilla JavaScript (no frameworks, no build step). The
model emits events and the views only draw on the `<canvas>`.

```
Super Glob Maker/
├── index.html              Entry point (loads every script)
├── css/style.css           UI styles
├── js/
│   ├── core/               Core (sgm.js, i18n.js)
│   ├── model/              Game logic
│   │   ├── Catalog.js        Tile / object catalog
│   │   ├── Level.js          Level representation
│   │   ├── Physics.js        Physics (slopes, A/B, collisions)
│   │   ├── Player.js         Player
│   │   ├── GameModel.js      Play state
│   │   ├── EditorModel.js    Editor state
│   │   ├── StoryMap.js       Story Mode world map
│   │   ├── entities/         Enemies and objects
│   │   └── ...
│   ├── view/               Canvas drawing
│   │   ├── Sprites.js        Tiles and entities
│   │   ├── GroundStyles.js   Per-map ground styles
│   │   ├── Decorations.js    Terrain decorations
│   │   ├── BackgroundView.js Parallax backgrounds
│   │   ├── WorldRenderer.js  World render
│   │   ├── MenuView.js       Menus
│   │   └── ...
│   └── controller/         Input and flow
│       ├── InputController.js
│       ├── GameController.js
│       ├── MapController.js  World map
│       ├── EditorController.js
│       └── AppController.js
├── Globs/                  Glob sprites (playable characters)
├── Enemigos/               Pyce sprites (enemies)
├── miniaturas/             Captures / thumbnails
├── niveles_kirodev/        Sample levels
└── kiro/                   Design docs (PLANNING, HISTORIA, etc.)
```

---

## Status

Under active development. The core loop (play, edit, save, Story Mode, maps and
Corrupt mode) is working. Main pending items: side-profile redraw of the Pyces,
themed semi-solids, new maps, full GlD account integration (cloud, publishing,
social) and mobile controls. Details live in `kiro/PLANNING.txt` and
`kiro/FALTANTES.txt`.

---

## Credits and license

Created by **KirByte_Bi**. Characters, Globs, Pyces and resources are shared
with Glob Defenders. See the [`LICENSE`](LICENSE) file for the full credits and
usage terms.

Non-commercial fan project inspired by the *Super Mario Maker* series
(© Nintendo), and by the fan engines **SMMWE** and **Dream Crafter** (by Strato
and their staff). All trademarks belong to their respective owners.

Super Glob Maker © 2026 KirByte_Bi. All rights reserved.
