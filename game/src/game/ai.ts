import {
  type Action,
  type GameState,
  type Wall,
  applyAction,
  checkWall,
  cloneState,
  legalMoves,
  shortestPathCells,
  shortestPath,
} from './rules';

export type Difficulty = 'easy' | 'medium' | 'hard';

const WIN = 10_000;

/** Static evaluation from `me`'s perspective. */
function evaluate(s: GameState, me: number): number {
  if (s.winner !== null) return s.winner === me ? WIN : -WIN;
  const myD = shortestPath(s, me);
  let oppBest = Infinity;
  let oppWalls = 0;
  s.players.forEach((p, i) => {
    if (i === me) return;
    oppBest = Math.min(oppBest, shortestPath(s, i));
    oppWalls = Math.max(oppWalls, p.walls);
  });
  const myWalls = s.players[me].walls;
  // Distance race dominates; keep a small preference for holding walls.
  return (oppBest - myD) * 10 + (myWalls - oppWalls) * 0.8;
}

/** Walls that would cut a target player's current shortest path (plus neighbours). */
function candidateWalls(s: GameState, targets: number[]): Wall[] {
  const seen = new Set<string>();
  const out: Wall[] = [];
  const push = (w: Wall) => {
    const key = `${w.r},${w.c},${w.o}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (checkWall(s, w).ok) out.push(w);
  };
  for (const t of targets) {
    const path = shortestPathCells(s, t);
    if (!path) continue;
    for (let i = 0; i < path.length - 1 && i < 6; i++) {
      const a = path[i];
      const b = path[i + 1];
      if (a.c === b.c) {
        const r = Math.min(a.r, b.r);
        push({ r, c: a.c, o: 'h' });
        push({ r, c: a.c - 1, o: 'h' });
        // perpendicular blockers next to the step help build corridors
        push({ r, c: a.c, o: 'v' });
        push({ r, c: a.c - 1, o: 'v' });
      } else {
        const c = Math.min(a.c, b.c);
        push({ r: a.r, c, o: 'v' });
        push({ r: a.r - 1, c, o: 'v' });
        push({ r: a.r, c, o: 'h' });
        push({ r: a.r - 1, c, o: 'h' });
      }
    }
  }
  return out;
}

function candidateActions(s: GameState, includeWalls: boolean): Action[] {
  const me = s.turn;
  const acts: Action[] = legalMoves(s, me).map((m) => ({ type: 'move', r: m.r, c: m.c }));
  if (includeWalls && s.players[me].walls > 0) {
    const opps = s.players.map((_, i) => i).filter((i) => i !== me);
    for (const w of candidateWalls(s, opps)) acts.push({ type: 'wall', wall: w });
  }
  return acts;
}

function next(s: GameState, a: Action): GameState {
  const n = cloneState(s);
  applyAction(n, a);
  return n;
}

/** Chooses an action for the player whose turn it is. */
export function chooseAction(s: GameState, difficulty: Difficulty): Action {
  const me = s.turn;
  const twoPlayer = s.players.length === 2;
  const noise = difficulty === 'easy' ? 9 : difficulty === 'medium' ? 2.5 : 0;
  const useWalls = difficulty !== 'easy' || Math.random() < 0.35;
  const deep = difficulty === 'hard' && twoPlayer;

  const actions = candidateActions(s, useWalls);
  let best: Action = actions[0];
  let bestScore = -Infinity;

  for (const a of actions) {
    const s1 = next(s, a);
    let score: number;
    if (s1.winner === me) {
      score = WIN;
    } else if (deep) {
      // Opponent's best reply (minimise our evaluation)
      let worst = Infinity;
      for (const b of candidateActions(s1, true)) {
        const v = evaluate(next(s1, b), me);
        if (v < worst) worst = v;
        if (worst <= bestScore) break; // alpha cut-off
      }
      score = worst;
    } else {
      score = evaluate(s1, me);
      // Small tempo bonus for pawn moves so walls are only used when worth it
      if (a.type === 'move') score += 0.5;
    }
    score += (Math.random() - 0.5) * noise;
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }
  return best;
}
