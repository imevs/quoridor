# Quoridors 🌿

A 3D board game diorama and web application inspired by the classic abstract strategy game **Quoridor**, reimagined in a cozy woodland aesthetic.

![Quoridors Board Overview](quoridors_design.jpeg)

---

## Overview

Quoridors combines:
1. **Procedural 3D Art Pipeline**: A standalone Blender 4.4 Python script generating the entire diorama—soil embankment, manicured lawn sod, perimeter grass tufts, 81 beveled honey-oak tiles, parametric boxwood hedges, and 5 hand-crafted animal figurines (Fox 🦊, Grey Wolf 🐺, Bear 🐻, Owl 🦉, Snow Wolf 🐺).
2. **Interactive 3D Web Game**: Built with **Three.js**, **TypeScript**, and **Vite**, featuring hop/squash physics animations, interactive hedge placement with anti-trap pathfinding, a heuristic minimax AI opponent, and a responsive glassmorphism HUD.
3. **Comprehensive Unit Test Suite**: Over 30 unit tests running on **Vitest** covering the rules engine, jump mechanics, maze BFS pathfinding, anti-trap invariants, and AI decision-making with >99% line coverage.

---

## Project Structure

```
quoridors/
├── build_quoridor_board.py      # Standalone Blender 4.4 scene & asset generator
├── quoridor_board.blend         # Native Blender 4.4 project file
├── quoridor_board.glb           # Exported GLTF 2.0 binary asset (meshes + materials)
├── quoridors_design.jpeg        # Concept illustration & reference artwork
├── textures/                    # High-resolution seamless PBR textures
│   ├── wood_tile_texture.jpg    # Honey-oak wood grain for tiles
│   ├── lawn_grass_texture.jpg   # Chunky stylized meadow grass
│   └── hedge_leaf_texture.jpg   # Boxwood foliage for hedge walls
├── game/                        # Three.js + TypeScript + Vite web game
│   ├── index.html               # Semantic HTML shell with native dialogs & HUD
│   ├── package.json             # Dependencies (three, vite, vitest, typescript)
│   ├── tsconfig.json            # Strict TypeScript compiler options
│   ├── vite.config.ts           # Bundler config with parent-directory asset linking
│   └── src/
│       ├── main.ts              # Game lifecycle, user input, turn loop, undo
│       ├── style.css            # Cozy garden theme, glassmorphism design system
│       ├── game/
│       │   ├── rules.ts         # Pure Quoridor rules engine (zero render dependencies)
│       │   ├── ai.ts            # Heuristic AI with candidate walls & alpha-beta search
│       │   ├── animals.ts       # Character registry matching GLB figurine nodes
│       │   └── __tests__/       # Vitest unit test suites
│       │       ├── rules.test.ts # Rules, jumps, diagonals, BFS, win conditions
│       │       └── ai.test.ts    # AI moves, winning detection, difficulty settings
│       ├── scene/
│       │   ├── BoardScene.ts    # Three.js diorama, lighting, shaders, raycasting
│       │   └── tween.ts         # Promise-based animation runner for hops & growth
│       └── ui/
│           └── Hud.ts           # Player cards, hedge counters, modal dialogs
├── README.md                    # Project documentation
└── AGENTS.md                    # Instructions & architecture guide for AI coding agents
```

---

## Getting Started

### Prerequisites

- **Node.js**: v18+ (tested with v20+)
- **npm**: v9+
- **Blender** (optional, only to regenerate 3D assets): Blender 4.4+

### Quick Start (Web Game)

```bash
cd game
npm install
npm run dev
```

Open your browser at **`http://localhost:5173/`**.

### Running Unit Tests

```bash
cd game
npm test
```

To run with full code coverage:

```bash
npm test -- --coverage
```

### Production Build

```bash
cd game
npm run build
npm run preview
```

The optimized static bundle is generated in `game/dist/`.

---

## 3D Asset Generation Pipeline

The 3D assets are completely reproducible via [`build_quoridor_board.py`](build_quoridor_board.py).

To rebuild the native `.blend` scene and re-export `quoridor_board.glb`:

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b -P build_quoridor_board.py
```

### 3D Model Components
- **Soil Embankment & Sod Platform**: Rounded beveled terrain base with triplanar meadow grass.
- **81 Wooden Tiles**: 9×9 grid with beveled corners and randomized rotation offsets.
- **Parametric Hedges**: Geometry Nodes-driven boxwood topiary walls with organic surface displacement.
- **5 Animal Pawns**: Low-poly stylized woodland animals with expressive facial discs, cartoon eyes, and custom colorways.

---

## Game Rules & Controls

### Rules of Quoridor
1. **Objective**: Be the first animal to reach any tile on the opposite side of the board.
2. **On Your Turn**: You may either:
   - **Move** your animal one tile orthogonally (forward, backward, left, right).
   - **Plant a Hedge** in the grooves between tiles to block your opponents' paths.
3. **Jumping Rivals**:
   - If you are face-to-face with an adjacent rival and the space behind them is clear, you can **jump straight over them**.
   - If a hedge or board edge blocks the straight jump, you can make a **diagonal side-step jump** to either side of the rival.
4. **Hedge Rules**:
   - Hedges span exactly 2 tiles and sit in the grooves between cells.
   - Hedges cannot overlap or intersect through each other.
   - **Anti-Trap Rule**: A hedge cannot be placed if it completely blocks the last remaining walkable path to the goal for *any* player.
   - Each player begins with **10 hedges** in a 2-player match (or **5 hedges** in a 4-player match).

### Controls
- **Mouse / Touch**:
  - Click on a glowing circle to move your animal.
  - Hover over a groove to preview hedge placement (green ghost hedge); click to plant.
  - Drag to orbit camera, scroll to zoom.
- **Keyboard Shortcuts**:
  - <kbd>Z</kbd>: Undo last move
  - <kbd>C</kbd>: Reset camera angle behind current player
  - <kbd>Esc</kbd>: Open New Game menu

---

## License

MIT
