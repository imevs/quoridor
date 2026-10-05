# Quoridors AI Algorithm

The AI in [`game/src/game/ai.ts`](file:///Users/vm/WebstormProjects/quoridors/game/src/game/ai.ts) determines bot actions for single-player and server-filled multiplayer seats. It combines **heuristic path race evaluation**, **targeted candidate move pruning**, and **2-ply minimax lookahead**.

---

## 1. Board Evaluation Function (`evaluate`)

The static evaluation evaluates a state from the perspective of player `me`:

$$\text{Score} = (\text{OpponentMinDist} - \text{MyDist}) \times 10 + (\text{MyWalls} - \text{OpponentMaxWalls}) \times 0.8$$

- **Path Race Dominance**: Distance to goal line computed via breadth-first search (`shortestPath`). If the opponent's shortest path is longer than the AI's, the score increases.
- **Wall Advantage**: A small bonus ($0.8$) per remaining wall encourages preserving walls unless a placement creates a substantial delay.
- **Terminal States**: Winning states immediately evaluate to $+10,000$ (and $-10,000$ if an opponent wins).

---

## 2. Candidate Move Generation (`candidateActions`)

Evaluating all $128$ wall intersections every turn is computationally prohibitive for interactive real-time play. The engine prunes candidate moves as follows:

1. **Pawn Moves**:
   - Enumerates legal pawn destinations via `legalMoves(state, playerIdx)`.
   - Handles standard orthogonal moves, straight jumps over opponents, and diagonal sidesteps when blocked by walls.
2. **Targeted Walls (`candidateWalls`)**:
   - Calculates the target opponent's shortest path cells via BFS (`shortestPathCells`).
   - Only considers walls intersecting the first $5$ steps of that path.
   - Also adds parallel and perpendicular groove slots adjacent to those steps to allow corridor construction.
   - Filters candidates through `checkWall(state, wall)` to guarantee geometric fit and that no player is completely trapped.

---

## 3. Decision-Making & Lookahead (`chooseAction`)

| Difficulty | Search Depth | Walls Used? | Noise / Randomness |
| :--- | :--- | :--- | :--- |
| **Easy** | 1-ply (Greedy) | $\approx 35\%$ chance | High ($\pm 4.5$ random score jitter) |
| **Medium** | 1-ply (Greedy) | Yes | Low ($\pm 1.25$ random score jitter) |
| **Hard** | **2-ply Minimax** (2-player) / 1-ply (4-player) | Yes | **0** (pure deterministic best move) |

### Hard Mode Minimax Lookahead (2-Player)

1. **Ply 1 (AI's candidate action $A$)**:
   - Simulates applying action $A$.
   - If action $A$ immediately wins, it is selected immediately.
2. **Ply 2 (Opponent's best reply $B$)**:
   - For each action $A$, tests all opponent candidate replies $B$.
   - Identifies the worst-case evaluation for the AI:
     $$\text{Score}(A) = \min_{B} \text{Evaluate}(\text{State} \circ A \circ B)$$
   - **Alpha Cutoff**: If any reply $B$ yields an evaluation lower than the current best candidate, the evaluation of action $A$ terminates early.
3. **Pawn Preference Tempo Bonus**:
   - Adds $+0.5$ score to pawn moves to favor forward advancement over placing marginal walls.
