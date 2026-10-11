# AGENTS.md — AI Developer & Agent Instructions

This document outlines architecture rules, constraints, and development guidelines for AI agents working in the **Quoridors** codebase.

---

## 1. Repository Architecture & Boundaries

The codebase is split into three environments:

1. **Root Directory (`/`) — Blender 3D Authoring Pipeline**:
   - `build_quoridor_board.py` is the single source of truth for all 3D geometry and procedural models.
   - Outputs: `quoridor_board.blend` and `quoridor_board.glb`.
   - `textures/` contains textures (`wood_tile_texture.jpg`, `lawn_grass_texture.jpg`, `hedge_leaf_texture.jpg`) referenced by both Blender and the web app.

2. **Game Directory (`/game`) — Web Application**:
   - Built with **Three.js**, **TypeScript** (strict mode, bundler resolution), and **Vite**.
   - Tests run via **Vitest**.
   - Supports two build targets:
     - Online mode (`npm run build:online`): Full game with online multiplayer, invite links, WS client, local pass-and-play, and vs-AI.
     - Offline mode (`npm run build:offline`): Standalone bundle (`dist-offline/`) with all networking tree-shaken out.
   - Imports assets (`quoridor_board.glb` and `textures/`) from parent directory.

3. **Server Directory (`/server`) — Authoritative Multiplayer Backend**:
   - Built with **Node.js 24**, **TypeScript**, `ws`, and built-in `node:sqlite`.
   - Directly imports and shares rules and session logic from `game/src/game/`.
   - Manages game sessions, validates moves, persists states to SQLite, and serves the static web bundle.

---

## 2. Core Architectural Invariants

### Rules Engine (`game/src/game/rules.ts`)
- **Separation of Concerns**: The rules engine is a pure algorithmic TypeScript module.
- **Zero External Dependencies**: Never import Three.js, DOM types, CSS, or browser APIs into this file.
- Must remain deterministic, headless, and side-effect-free so unit tests run in any Node or browser test environment.

### AI Module (`game/src/game/ai.ts`)
- Implements heuristic path race evaluation + candidate walls along opponent paths + 2-ply minimax lookahead on Hard.
- Evaluates states using `cloneState()` and `applyAction()` from `rules.ts`.
- Must return strictly legal actions under all circumstances (even when 0 walls remain or when trapped).

### Three.js Scene (`game/src/scene/BoardScene.ts`)
- Handles rendering, triplanar UV projections, custom GLSL shader hooks, raycasting, and animations.
- Node references in `quoridor_board.glb`:
  - `Tile_*` for board tiles.
  - `Board_Lawn_Platform` and `Board_Grass_Tufts` for base terrain.
  - `Wall_*` (`Wall_Wolf_Left_Back` specifically) as the base template for instantiated hedge walls.
  - `Animal_Fox`, `Animal_Wolf_Grey`, `Animal_Bear`, `Animal_Owl`, `Animal_Wolf_White` for pawns.

---

## 3. Blender Asset Regeneration Rules

When modifying geometry, materials, or models in `build_quoridor_board.py`:
1. **Always export with `export_apply=True`**:
   ```python
   bpy.ops.export_scene.gltf(
       filepath=glb_path,
       export_format='GLB',
       use_selection=False,
       export_apply=True  # Required: Bakes Geometry Nodes on hedge walls!
   )
   ```
   *Omitting `export_apply=True` causes hedge walls to export as empty meshes without geometry.*
2. **Execute Blender headlessly**:
   ```bash
   /Applications/Blender.app/Contents/MacOS/Blender -b -P build_quoridor_board.py
   ```
3. Keep texture paths relative or inside `/textures/` so the bundler resolves them.

---

## 4. Development & Testing Commands

Execute web commands inside the `game/` subdirectory:

| Task | Command | Notes |
| :--- | :--- | :--- |
| **Dev Server** | `npm run dev` | Serves at `http://localhost:5173/` |
| **Type Check** | `npx tsc --noEmit` | Strict mode; no unused locals allowed |
| **Unit Tests** | `npm test` | Vitest test runner |
| **Test Coverage** | `npm test -- --coverage` | Requires >95% coverage across `src/game/` |
| **E2E Tests** | `npm run test:e2e` | Automated P2P headless Chrome E2E test suite |
| **Production Build** | `npm run build` | Runs `tsc && vite build` |
| **Preview Build** | `npm run preview` | Validates production bundle locally |

See [`P2P_ARCHITECTURE.md`](file:///Users/vm/WebstormProjects/quoridors/P2P_ARCHITECTURE.md) for P2P networking design and state machine invariants.

---

## 5. Coding Standards

- **TypeScript**:
  - `strict: true` and `noUnusedLocals: true` are enabled.
  - Avoid TypeScript parameter properties in constructors (declare fields explicitly for `erasableSyntaxOnly` compatibility).
- **Styling**:
  - Use Vanilla CSS in `game/src/style.css` with CSS custom properties.
  - Do not install Tailwind or external CSS frameworks unless requested.
- **DOM & Accessibility**:
  - Use semantic HTML elements (`<dialog>`, `<header>`, `<main>`, `<aside>`, `<kbd>`).
  - Native `<dialog>` elements should use `.showModal()` and `method="dialog"`.
- **Testing Requirements**:
  - Any new rule or AI feature must be accompanied by unit tests in `game/src/game/__tests__/`.
  - Maintain >95% statement and branch coverage across `src/game/`.

---

## 6. Commit & File Integrity

- Keep `.gitignore` updated (ignore `node_modules/`, `dist/`, `coverage/`, `*.blend1`, `.DS_Store`).
- Never delete or decouple `build_quoridor_board.py` from the exported GLB model.
- Always verify both `npm run build` and `npm test` pass before completing a task.
