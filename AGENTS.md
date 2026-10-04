# AGENTS.md — AI Developer & Agent Instructions

This document provides architectural rules, constraints, and development guidelines for AI agents working in the **Quoridors** codebase.

---

## 1. Repository Architecture & Boundaries

The codebase is split into two complementary environments:

1. **Root Directory (`/`) — Blender 3D Authoring Pipeline**:
   - `build_quoridor_board.py` is the **single source of truth** for all 3D assets.
   - Outputs: `quoridor_board.blend` and `quoridor_board.glb`.
   - `textures/` contains seamless textures (`wood_tile_texture.jpg`, `lawn_grass_texture.jpg`, `hedge_leaf_texture.jpg`) referenced by both Blender and the web app.

2. **Game Directory (`/game`) — Web Application**:
   - Built with **Three.js**, **TypeScript** (strict mode, bundler resolution), and **Vite**.
   - Tests powered by **Vitest**.
   - Imports assets (`quoridor_board.glb` and `textures/`) directly from the parent directory via Vite's `server.fs.allow: ['..']` config.

---

## 2. Core Architectural Invariants

### 🏛️ Pure Rules Engine (`game/src/game/rules.ts`)
- **Strict Separation of Concerns**: The rules engine is a pure algorithmic TypeScript module.
- **ZERO External Dependencies**: It must **never** import Three.js, DOM types, CSS, or browser-specific APIs.
- Must remain 100% deterministic, immutable-friendly, and headless so that unit tests and AI evaluations run instantly in any Node/test environment.

### 🎲 AI Module (`game/src/game/ai.ts`)
- Implements heuristic path race evaluation + candidate walls along opponent paths + 2-ply minimax lookahead on Hard.
- Evaluates states using `cloneState()` and `applyAction()` from `rules.ts`.
- Must return strictly legal actions under all circumstances (even when 0 walls remain or when trapped).

### 🎨 Three.js Diorama (`game/src/scene/BoardScene.ts`)
- Renders the board, applies triplanar UVs, custom GLSL shader-node color grading, raycasts grooves and tiles, and animates pawn hops and hedge growth.
- Uses `quoridor_board.glb` nodes:
  - `Tile_*` for wooden tiles.
  - `Board_Lawn_Platform` and `Board_Grass_Tufts` for terrain.
  - `Wall_*` (specifically `Wall_Wolf_Left_Back`) as the template for instantiated hedge obstacles.
  - `Animal_Fox`, `Animal_Wolf_Grey`, `Animal_Bear`, `Animal_Owl`, `Animal_Wolf_White` for playable pawns.

---

## 3. Blender Asset Regeneration Rules

Whenever modifying 3D geometry, materials, or animal models in `build_quoridor_board.py`:
1. **Always export with `export_apply=True`**:
   ```python
   bpy.ops.export_scene.gltf(
       filepath=glb_path,
       export_format='GLB',
       use_selection=False,
       export_apply=True  # MANDATORY: Bakes Geometry Nodes on hedge walls!
   )
   ```
   *Omitting `export_apply=True` causes hedge walls to export as empty meshes without geometry.*
2. **Execute Blender headlessly**:
   ```bash
   /Applications/Blender.app/Contents/MacOS/Blender -b -P build_quoridor_board.py
   ```
3. Ensure textures are relative or copied to `/textures/` so the web bundler resolves them.

---

## 4. Development & Testing Commands

Always execute web commands inside the `game/` subdirectory:

| Task | Command | Notes |
| :--- | :--- | :--- |
| **Run Dev Server** | `npm run dev` | Serves at `http://localhost:5173/` |
| **Type Check** | `npx tsc --noEmit` | Strict mode; no unused locals allowed |
| **Run Unit Tests** | `npm test` | Vitest test runner (runs in ~150ms) |
| **Check Test Coverage** | `npm test -- --coverage` | Requires >95% coverage across `src/game/` |
| **Production Build** | `npm run build` | Compiles TypeScript and runs `vite build` |
| **Preview Build** | `npm run preview` | Validates the production bundle locally |

---

## 5. Coding Standards & Constraints

- **TypeScript Configuration**:
  - `strict: true` and `noUnusedLocals: true` are enabled.
  - Do not leave unused imports or variables.
  - Avoid TypeScript parameter properties in constructors (use explicit field declarations to respect `erasableSyntaxOnly`).
- **Styling**:
  - Use Vanilla CSS in `game/src/style.css` with CSS custom properties (`--leaf`, `--honey`, `--glass`, etc.).
  - Do not install Tailwind or external CSS frameworks unless explicitly asked.
  - Maintain glassmorphism design tokens (`backdrop-filter`, semi-transparent borders, curated shadows).
- **DOM & Accessibility**:
  - Use semantic HTML elements (`<dialog>`, `<header>`, `<main>`, `<aside>`, `<kbd>`).
  - Native `<dialog>` elements should use `.showModal()` and `method="dialog"` forms.
- **Testing Requirements**:
  - Any new rule or AI feature **must** be accompanied by unit tests in `game/src/game/__tests__/`.
  - Maintain >95% statement and branch coverage.

---

## 6. Commit & File Integrity

- Keep `.gitignore` updated (ignore `node_modules/`, `dist/`, `coverage/`, `*.blend1`, `.DS_Store`).
- Never delete or decouple `build_quoridor_board.py` from the exported GLB model.
- Always verify both `npm run build` and `npm test` pass before completing a task.
