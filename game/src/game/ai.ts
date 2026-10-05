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

const WIN = 100_000;

/**
 * Static evaluation function from `me`'s perspective.
 * Evaluates path race differential, threat urgency, wall conservation, and tempo.
 */
export function evaluate(s: GameState, me: number): number {
  if (s.winner !== null) {
    return s.winner === me ? WIN : -WIN;
  }

  const myDist = shortestPath(s, me);
  if (myDist <= 0) return WIN;

  let oppMinDist = Infinity;
  let oppMaxWalls = 0;

  for (let i = 0; i < s.players.length; i++) {
    if (i === me) continue;
    const d = shortestPath(s, i);
    if (d < oppMinDist) {
      oppMinDist = d;
    }
    if (s.players[i].walls > oppMaxWalls) {
      oppMaxWalls = s.players[i].walls;
    }
  }

  if (oppMinDist <= 0) return -WIN;

  // Race differential: each step ahead is worth 20 points
  const raceScore = (oppMinDist - myDist) * 20;

  // Absolute progress toward goal
  const myProgress = (9 - myDist) * 8;
  const oppProgress = (9 - oppMinDist) * 8;

  // Wall advantage: small bonus for holding more walls than opponent
  const myWalls = s.players[me].walls;
  const wallAdvantage = (myWalls - oppMaxWalls) * 1.5;

  // Threat urgency: heavily penalize allowing an opponent to get within 1-2 steps of goal
  let threatPenalty = 0;
  if (oppMinDist <= 1) {
    threatPenalty = -500;
  } else if (oppMinDist <= 2) {
    threatPenalty = -150;
  }

  // Sprint bonus: encourage closing out the game when within 1-2 steps of victory
  let sprintBonus = 0;
  if (myDist <= 1) {
    sprintBonus = 400;
  } else if (myDist <= 2) {
    sprintBonus = 120;
  }

  return raceScore + (myProgress - oppProgress) + wallAdvantage + threatPenalty + sprintBonus;
}

/**
 * Generates high-impact candidate walls that directly increase an opponent's shortest path
 * without self-impeding the AI's own path.
 */
function candidateWalls(s: GameState, me: number, targets: number[]): Wall[] {
  if (s.players[me].walls <= 0) return [];
  const currMyDist = shortestPath(s, me);
  const seen = new Set<string>();
  const scoredWalls: { wall: Wall; score: number }[] = [];

  const testWall = (w: Wall, target: number, currOppDist: number) => {
    const key = `${w.r},${w.c},${w.o}`;
    if (seen.has(key)) return;
    seen.add(key);

    if (!checkWall(s, w).ok) return;

    // Simulate placing the wall
    const s1 = next(s, { type: 'wall', wall: w });
    const newOppDist = shortestPath(s1, target);
    const newMyDist = shortestPath(s1, me);

    const oppDelay = newOppDist - currOppDist;
    const selfDelay = newMyDist - currMyDist;

    // Discard walls that don't delay opponent or hurt the AI more than opponent
    if (oppDelay <= 0) return;
    if (selfDelay > oppDelay) return;

    // Score based on net delay inflicted
    const score = oppDelay * 15 - selfDelay * 16;
    scoredWalls.push({ wall: w, score });
  };

  for (const t of targets) {
    const currOppDist = shortestPath(s, t);
    const path = shortestPathCells(s, t);
    if (!path) continue;

    // Focus on the first 6 steps of the opponent's path (where blockers have immediate impact)
    for (let i = 0; i < path.length - 1 && i < 6; i++) {
      const a = path[i];
      const b = path[i + 1];
      if (a.c === b.c) {
        const r = Math.min(a.r, b.r);
        testWall({ r, c: a.c, o: 'h' }, t, currOppDist);
        testWall({ r, c: a.c - 1, o: 'h' }, t, currOppDist);
        testWall({ r, c: a.c, o: 'v' }, t, currOppDist);
        testWall({ r, c: a.c - 1, o: 'v' }, t, currOppDist);
      } else {
        const c = Math.min(a.c, b.c);
        testWall({ r: a.r, c, o: 'v' }, t, currOppDist);
        testWall({ r: a.r - 1, c, o: 'v' }, t, currOppDist);
        testWall({ r: a.r, c, o: 'h' }, t, currOppDist);
        testWall({ r: a.r - 1, c, o: 'h' }, t, currOppDist);
      }
    }
  }

  // Sort by impact descending and keep the top 8 candidate walls
  scoredWalls.sort((a, b) => b.score - a.score);
  return scoredWalls.slice(0, 8).map((sw) => sw.wall);
}

/**
 * Returns prioritized and pruned candidate actions for a given player.
 */
function candidateActions(s: GameState, playerIdx: number, includeWalls: boolean): Action[] {
  const currentDist = shortestPath(s, playerIdx);
  const moves = legalMoves(s, playerIdx);
  const items: { action: Action; priority: number }[] = [];

  for (const m of moves) {
    const act: Action = { type: 'move', r: m.r, c: m.c };
    const s1 = next(s, act);
    if (s1.winner === playerIdx) {
      items.push({ action: act, priority: 10_000 });
      continue;
    }
    const newDist = shortestPath(s1, playerIdx);
    const progress = currentDist - newDist; // +1 if moving forward, +2 if jumping forward
    items.push({ action: act, priority: progress * 20 });
  }

  if (includeWalls && s.players[playerIdx].walls > 0) {
    // Target the most threatening opponents first
    const opps = s.players
      .map((_, i) => i)
      .filter((i) => i !== playerIdx)
      .sort((a, b) => shortestPath(s, a) - shortestPath(s, b));

    const walls = candidateWalls(s, playerIdx, opps);
    for (const w of walls) {
      items.push({ action: { type: 'wall', wall: w }, priority: 10 });
    }
  }

  // Move ordering: highest priority moves first for maximum alpha-beta pruning
  items.sort((a, b) => b.priority - a.priority);
  return items.map((item) => item.action);
}

function next(s: GameState, a: Action): GameState {
  const n = cloneState(s);
  applyAction(n, a);
  return n;
}

/**
 * Minimax search with alpha-beta pruning.
 */
function alphaBeta(
  s: GameState,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  aiSeat: number,
): number {
  if (depth === 0 || s.winner !== null) {
    return evaluate(s, aiSeat);
  }

  const currentTurn = s.turn;
  const actions = candidateActions(s, currentTurn, true);

  if (maximizing) {
    let maxEval = -Infinity;
    for (const a of actions) {
      const sNext = next(s, a);
      if (sNext.winner === aiSeat) {
        return WIN + depth; // Win sooner is better
      }
      const score = alphaBeta(sNext, depth - 1, alpha, beta, false, aiSeat);
      if (score > maxEval) maxEval = score;
      if (score > alpha) alpha = score;
      if (beta <= alpha) break; // Beta cutoff
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const a of actions) {
      const sNext = next(s, a);
      if (sNext.winner !== null && sNext.winner !== aiSeat) {
        return -WIN - depth; // Delay opponent win
      }
      const score = alphaBeta(sNext, depth - 1, alpha, beta, true, aiSeat);
      if (score < minEval) minEval = score;
      if (score < beta) beta = score;
      if (beta <= alpha) break; // Alpha cutoff
    }
    return minEval;
  }
}

/**
 * Chooses the smartest action for the player whose turn it is.
 */
export function chooseAction(s: GameState, difficulty: Difficulty): Action {
  const me = s.turn;
  const twoPlayer = s.players.length === 2;

  // Search depth based on difficulty:
  // Hard: Depth 3 in 2-player mode (AI -> Opponent reply -> AI counter) or Depth 2 in 4-player
  // Medium: Depth 2 lookahead with small jitter
  // Easy: Depth 1 with higher noise
  const depth = difficulty === 'hard' ? (twoPlayer ? 3 : 2) : difficulty === 'medium' ? 2 : 1;
  const noise = difficulty === 'easy' ? 14 : difficulty === 'medium' ? 2.5 : 0;
  const useWalls = difficulty !== 'easy' || Math.random() < 0.35;

  const actions = candidateActions(s, me, useWalls);
  if (actions.length === 1) return actions[0];

  let bestAction: Action = actions[0];
  let bestScore = -Infinity;

  for (const a of actions) {
    const s1 = next(s, a);
    let score: number;

    if (s1.winner === me) {
      return a; // Immediate win found
    }

    if (depth > 1) {
      score = alphaBeta(s1, depth - 1, -Infinity, Infinity, false, me);
    } else {
      score = evaluate(s1, me);
    }

    // Tempo bonus: favor moving forward when race advantage is already secure
    if (a.type === 'move') {
      const currDist = shortestPath(s, me);
      const newDist = shortestPath(s1, me);
      if (newDist < currDist) {
        score += 2;
      }
    }

    if (noise > 0) {
      score += (Math.random() - 0.5) * noise;
    }

    if (score > bestScore) {
      bestScore = score;
      bestAction = a;
    }
  }

  return bestAction;
}
