# Quoridor Rule Variations & Game Modes

This document details rule variations and alternative game modes for Quoridor, categorized by complexity and mechanics, including architectural implementation notes for integrating them into the existing codebase.

---

## 1. Core Rule Tweaks (Minimal Engine Changes)

These variants preserve the base $9 \times 9$ board and wall placement mechanics, modifying only player counts, step rules, or starting setups in [`rules.ts`](file:///Users/vm/WebstormProjects/quoridors/game/src/game/rules.ts).

### 1.1. 2v2 Cooperative Team Mode
* **Players**: 4 players divided into two partnerships (South + North vs. West + East).
* **Wall Pool**: Each team shares a communal pool of 10 walls (or 5 walls per player that teammates cannot transfer).
* **Victory Condition**:
  * *Standard Partnership*: First team where **both** teammates reach their respective goal lines wins.
  * *Relay*: The game ends when any player reaches their goal; the team whose player crosses first wins provided their partner is not trapped.
* **Jump Rules**: Standard Quoridor jump rules apply when leaping over teammates or opponents.

### 1.2. Mini / Blitz Quoridor
* **Board Dimensions**: $7 \times 7$ board with an $6 \times 6$ groove grid, or $5 \times 5$ board with $4 \times 4$ groove grid.
* **Wall Count**: 6 walls each on $7 \times 7$; 3–4 walls each on $5 \times 5$.
* **Pace**: Shorter paths make wall placement decisive within the first 3–5 turns, ideal for rapid blitz or mobile sessions.

### 1.3. Open Diagonal Movement
* **Rule**: Pawns may move 1 step diagonally at any time, provided neither the horizontal nor the vertical path into the diagonal cell is obstructed by a wall.
* **Impact**: Eliminates the strict requirement that diagonal moves only occur during pawn jumps. Makes complete path blockage significantly harder and opens up creative navigational routes around short walls.

---

## 2. Wall Economy & Manipulation

These variants introduce alternative uses for walls beyond permanent one-time placement.

### 2.1. Action Point (AP) System
* **Mechanic**: Each turn, the active player receives **2 Action Points (AP)**:
  * Move 1 tile: 1 AP
  * Place a standard wall: 2 AP
* **Combinations**:
  * Move twice (2 AP)
  * Place 1 wall (2 AP)
  * Move 1 tile, then do not place a wall (1 AP remaining unused or spent on a future mechanic)
* **Impact**: Increases match tempo and allows players to quickly reposition before or after placing a wall.

### 2.2. Wall Reclamation & Demolition ("Hedge Trimmer")
* **Mechanic**: Instead of moving or placing a new wall, a player may:
  * **Relocate/Reclaim**: Pick up one of their own previously placed walls and return it to their hand, or immediately place it in a new valid groove.
  * **Demolish**: Spend a turn to remove an opponent's wall.
* **Path Invariant**: Wall removal must not cause illegal board states and must respect fair-play rules (e.g., cannot remove a wall if doing so creates immediate trivial loops without cost).

### 2.3. Variable Wall Lengths
* **Mechanic**: Diversify the wall inventory:
  * **Peg / Post (1-cell)**: Blocks movement across a single cell edge. Useful for plugging single leaks without wasting a 2-cell wall.
  * **Standard Hedge (2-cell)**: Standard Quoridor wall.
  * **Long Hedge (3-cell)**: Spans 3 cells, requiring 2 adjacent groove intersections. High impact for creating long detours.

### 2.4. Decaying / Temporary Walls
* **Mechanic**: Walls have an expiration timer (e.g., automatically dissolve after 4–6 full turn cycles) or degrade when adjacent pawns push against them for 2 consecutive turns.

---

## 3. Board Geometry & Objective Variants

These variants alter the win condition or starting terrain.

### 3.1. Pre-Set Labyrinth / Procedural Obstacles
* **Mechanic**: Before player turns begin, $3$ to $6$ neutral obstacles (permanent walls, stone blocks, or water hazards) are generated procedurally on the board.
* **Fairness**: Generated obstacles must maintain symmetric or equal shortest-path distances for both players using BFS verification.

### 3.2. King of the Hill (Central Sanctuary)
* **Objective**: Instead of reaching the opposing side, pawns race to reach and occupy the central cell $(4, 4)$ (or hold it for 1 complete turn cycle).

### 3.3. Checkpoint / Relic Retrieval
* **Objective**: Neutral tokens (e.g., fruit patches or relics) spawn in designated board coordinates. Each player must visit at least one checkpoint before their target goal line activates.

### 3.4. Boomerang (Round-Trip)
* **Objective**: Players must cross the board to touch any cell on the opponent's starting baseline, then return safely to their own original starting baseline.

---

## 4. Asymmetric Animal Abilities (Theme Integration)

Tailored to the existing 3D pawn models in the project (Fox, Wolf, Bear, Owl):

| Character | Ability | Timing & Cost | Effect |
| :--- | :--- | :--- | :--- |
| **Owl** | *Flyover* | Once per match (Action) | Leap directly over one adjacent hedge wall to land on the cell behind it (provided that cell is unoccupied). |
| **Bear** | *Trample* | Once per match (Action) | Destroy an adjacent hedge wall segment instead of taking a movement step. |
| **Fox** | *Dash* | Once per match (Action) | Move up to 2 cells in a straight orthogonal line without wall obstruction. |
| **Wolf** | *Territory / Scent* | Passive | Starts the match with $+2$ walls, or may push an adjacent opponent pawn back 1 cell when executing a jump. |

---

## 5. Fog of War & Hidden Information

### 5.1. Limited Line of Sight
* **Mechanic**: Players only see the board tiles and walls within a Chebyshev/Manhattan distance of 2–3 tiles from their pawn.
* **Information**: Walls placed in unexplored territory remain hidden until the player's vision radius reveals them or a pawn tries to move into a blocked groove.

### 5.2. Secret Walls (Traps)
* **Mechanic**: Each player starts with 1 secret wall placed during setup.
* **Resolution**: The wall is invisible to the opponent until they attempt to cross that groove, at which point the move fails, the wall is revealed, and the opponent's turn ends.

---

## 6. Implementation Strategy in Current Architecture

To implement any of these variations cleanly without breaking the existing headless rules engine:

1. **Parameterize Game Options in [`rules.ts`](file:///Users/vm/WebstormProjects/quoridors/game/src/game/rules.ts)**:
   ```typescript
   export interface GameConfig {
     boardSize?: number;            // Default: 9
     wallInventory?: number;        // Default: 10 (2p) or 5 (4p)
     wallLengths?: number[];        // Default: [2]
     allowDiagonal?: boolean;       // Default: false
     mode?: 'standard' | '2v2' | 'king_of_hill' | 'checkpoint';
   }
   ```
2. **Pathfinding & AI ([`ai.ts`](file:///Users/vm/WebstormProjects/quoridors/game/src/game/ai.ts))**:
   * BFS pathfinding logic is already parameterized by goal predicates; updating goals for King of the Hill or Checkpoint variants requires swapping the goal predicate function.
3. **Networking & State Replication ([`server/src/`](file:///Users/vm/WebstormProjects/quoridors/server/))**:
   * Include `gameConfig` in session creation messages so server and clients agree on rule variations deterministically.
