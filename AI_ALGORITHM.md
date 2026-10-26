# Quoridors AI Algorithm

The AI in [`game/src/game/ai.ts`](game/src/game/ai.ts) determines bot actions for single-player, bot-vs-bot spectator mode, and server-filled multiplayer seats. It combines **threat-aware heuristic evaluation**, **high-impact wall pruning**, **priority move ordering**, and **3-ply alpha-beta minimax lookahead**.

---

## 1. Board Evaluation Function (`evaluate`)

The static evaluation evaluates a state from the perspective of player `me`:

$$\text{Score} = \text{RaceScore} + (\text{MyProgress} - \text{OppProgress}) + \text{WallAdvantage} + \text{ThreatPenalty} + \text{SprintBonus}$$

- **Path Race Dominance ($\text{RaceScore}$)**:
  - $({\text{OppMinDist}} - \text{MyDist}) \times 20$.
  - Each tile gained in the race relative to the leading opponent directly shifts the baseline score.
- **Progression Weighting**:
  - Distance reductions are non-linear; progressing from 2 steps to 1 step away from the goal is significantly more valuable than early moves.
- **Threat Urgency Penalties ($\text{ThreatPenalty}$)**:
  - If the leading opponent is $\le 1$ step from victory: $-500$ penalty.
  - If the leading opponent is $\le 2$ steps from victory: $-150$ penalty.
  - Forces the minimax engine to prioritize defensive walls that break the opponent's winning corridor.
- **Sprint / Endgame Bonus ($\text{SprintBonus}$)**:
  - When the AI is $\le 1$ step from goal: $+400$.
  - When the AI is $\le 2$ steps from goal: $+120$.
  - Discourages placing marginal walls when a clean sprint across the finish line wins the game.
- **Terminal States**:
  - Immediate win evaluates to $+100,000$.
  - Opponent victory evaluates to $-100,000$.

---

## 2. High-Impact Wall Pruning (`candidateWalls`)

Instead of blindly evaluating random groove intersections, the engine filters walls using verified path delay deltas:

1. **Shortest-Path Intersection**:
   - Inspects the first 6 steps of the target opponent's shortest path.
   - Tests both direct blockers and flanking perpendicular slots.
2. **Net Delay Verification**:
   - Computes $\Delta_{\text{opp}} = \text{NewOppDist} - \text{OldOppDist}$ and $\Delta_{\text{me}} = \text{NewMyDist} - \text{OldMyDist}$.
   - **Zero-impact prune**: Any wall where $\Delta_{\text{opp}} \le 0$ is immediately discarded (opponent can step around with zero added distance).
   - **Self-impediment prune**: Any wall where $\Delta_{\text{me}} > \Delta_{\text{opp}}$ is discarded to prevent self-sabotage.
3. **Scoring & Sorting**:
   - Walls are scored as $\text{Score} = \Delta_{\text{opp}} \times 15 - \Delta_{\text{me}} \times 16$.
   - The engine retains only the top 8 highest-impact walls for tree search.

---

## 3. Move Ordering & Alpha-Beta Minimax (`chooseAction`)

| Difficulty | Search Depth | Move Ordering | Noise / Randomness |
| :--- | :--- | :--- | :--- |
| **Easy** | 1-ply (Greedy) | Basic | High ($\pm 14.0$) |
| **Medium** | 2-ply Minimax | Yes | Low ($\pm 2.5$) |
| **Hard** | **3-ply Alpha-Beta** (2-player) / **2-ply** (4-player) | Prioritized | **0** (pure deterministic best move) |

### Hard Mode Alpha-Beta Minimax Lookahead (2-Player)

1. **Move Ordering**:
   - Actions are evaluated in descending priority:
     1. Immediate winning moves ($\text{Priority} = 10,000$).
     2. Forward pawn steps and jumps ($\text{Priority} = \Delta_{\text{dist}} \times 20$).
     3. High-impact blocking walls.
     4. Lateral / sidestep pawn moves.
   - Good move ordering ensures alpha-beta cutoffs trigger on the 1st or 2nd branch.
2. **3-Ply Depth**:
   - **Ply 1 (AI Move)**: Tests candidate moves and top walls.
   - **Ply 2 (Opponent Reply)**: Evaluates opponent's optimal counter-strategy.
   - **Ply 3 (AI Follow-up)**: Anticipates the resulting board dynamic, wall economy, and finish-line race.
3. **Worker Execution**:
   - Calculations execute in a dedicated Web Worker (`ai.worker.ts`), providing grandmaster-caliber play with zero frame drops on the main render thread.
