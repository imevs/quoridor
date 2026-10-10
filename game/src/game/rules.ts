/**
 * Pure Quoridor rules engine (no rendering).
 *
 * Board: 9x9 cells, indexed (r, c) with r = 0 at the far (top) edge.
 * Walls sit on the 8x8 grid of groove intersections. A wall at (r, c) is
 * centred between rows r / r+1 and columns c / c+1 and spans two cells.
 *   - 'h' (horizontal) blocks vertical movement between rows r and r+1
 *     for columns c and c+1.
 *   - 'v' (vertical) blocks horizontal movement between columns c and c+1
 *     for rows r and r+1.
 */

export const N = 9;
export const W = N - 1; // wall grid size (8)

export type Orientation = 'h' | 'v';

export interface Wall {
  r: number;
  c: number;
  o: Orientation;
}

export interface Cell {
  r: number;
  c: number;
}

export interface Goal {
  axis: 'r' | 'c';
  value: number;
}

export interface PlayerState {
  r: number;
  c: number;
  walls: number;
  goal: Goal;
}

export interface GameState {
  players: PlayerState[];
  /** Wall occupancy grids, W*W, 1 = wall present */
  h: Uint8Array;
  v: Uint8Array;
  wallList: Wall[];
  turn: number;
  winner: number | null;
}

export type Action =
  | { type: 'move'; r: number; c: number }
  | { type: 'wall'; wall: Wall };

const DIRS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

const wi = (r: number, c: number) => r * W + c;
const inBoard = (r: number, c: number) => r >= 0 && r < N && c >= 0 && c < N;
const inWallGrid = (r: number, c: number) => r >= 0 && r < W && c >= 0 && c < W;

/** Seat layout: bottom, left, top, right. */
export function createGame(numPlayers: 2 | 4): GameState {
  const wallsEach = numPlayers === 2 ? 10 : 5;
  const seats: PlayerState[] =
    numPlayers === 2
      ? [
          { r: 8, c: 4, walls: wallsEach, goal: { axis: 'r', value: 0 } },
          { r: 0, c: 4, walls: wallsEach, goal: { axis: 'r', value: 8 } },
        ]
      : [
          { r: 8, c: 4, walls: wallsEach, goal: { axis: 'r', value: 0 } },
          { r: 4, c: 0, walls: wallsEach, goal: { axis: 'c', value: 8 } },
          { r: 0, c: 4, walls: wallsEach, goal: { axis: 'r', value: 8 } },
          { r: 4, c: 8, walls: wallsEach, goal: { axis: 'c', value: 0 } },
        ];
  return {
    players: seats,
    h: new Uint8Array(W * W),
    v: new Uint8Array(W * W),
    wallList: [],
    turn: 0,
    winner: null,
  };
}

export function cloneState(s: GameState): GameState {
  return {
    players: s.players.map((p) => ({ ...p, goal: { ...p.goal } })),
    h: s.h.slice(),
    v: s.v.slice(),
    wallList: s.wallList.slice(),
    turn: s.turn,
    winner: s.winner,
  };
}

/** True if a wall blocks the step from (r,c) in direction (dr,dc). */
export function isBlocked(s: GameState, r: number, c: number, dr: number, dc: number): boolean {
  const { h, v } = s;
  const hAt = (rr: number, cc: number) => inWallGrid(rr, cc) && h[wi(rr, cc)] === 1;
  const vAt = (rr: number, cc: number) => inWallGrid(rr, cc) && v[wi(rr, cc)] === 1;
  if (dr === -1) return hAt(r - 1, c) || hAt(r - 1, c - 1);
  if (dr === 1) return hAt(r, c) || hAt(r, c - 1);
  if (dc === -1) return vAt(r, c - 1) || vAt(r - 1, c - 1);
  if (dc === 1) return vAt(r, c) || vAt(r - 1, c);
  return false;
}

const reached = (p: { r: number; c: number }, g: Goal) => (g.axis === 'r' ? p.r === g.value : p.c === g.value);

/** BFS shortest path length to the goal line, ignoring pawns. -1 if unreachable. */
export function shortestPath(s: GameState, playerIdx: number): number {
  const path = shortestPathCells(s, playerIdx);
  return path ? path.length - 1 : -1;
}

/** BFS path (including start) to the goal line, ignoring pawns. */
export function shortestPathCells(s: GameState, playerIdx: number): Cell[] | null {
  const p = s.players[playerIdx];
  const prev = new Int16Array(N * N).fill(-2);
  const queue = new Int16Array(N * N);
  let head = 0;
  let tail = 0;
  const start = p.r * N + p.c;
  prev[start] = -1;
  queue[tail++] = start;
  while (head < tail) {
    const cur = queue[head++];
    const r = (cur / N) | 0;
    const c = cur % N;
    if (reached({ r, c }, p.goal)) {
      const out: Cell[] = [];
      let k = cur;
      while (k !== -1) {
        out.push({ r: (k / N) | 0, c: k % N });
        k = prev[k];
      }
      return out.reverse();
    }
    for (const [dr, dc] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (!inBoard(nr, nc)) continue;
      const ni = nr * N + nc;
      if (prev[ni] !== -2) continue;
      if (isBlocked(s, r, c, dr, dc)) continue;
      prev[ni] = cur;
      queue[tail++] = ni;
    }
  }
  return null;
}

function occupied(s: GameState, r: number, c: number, except = -1): boolean {
  return s.players.some((p, i) => i !== except && p.r === r && p.c === c);
}

/** Legal pawn destinations, including straight and diagonal jumps. */
export function legalMoves(s: GameState, playerIdx: number): Cell[] {
  const p = s.players[playerIdx];
  const out: Cell[] = [];
  const seen = new Set<number>();
  const add = (r: number, c: number) => {
    const k = r * N + c;
    if (seen.has(k) || (r === p.r && c === p.c)) return;
    seen.add(k);
    out.push({ r, c });
  };
  for (const [dr, dc] of DIRS) {
    const nr = p.r + dr;
    const nc = p.c + dc;
    if (!inBoard(nr, nc) || isBlocked(s, p.r, p.c, dr, dc)) continue;
    if (!occupied(s, nr, nc, playerIdx)) {
      add(nr, nc);
      continue;
    }
    // Adjacent pawn: try straight jump
    const jr = nr + dr;
    const jc = nc + dc;
    if (inBoard(jr, jc) && !isBlocked(s, nr, nc, dr, dc) && !occupied(s, jr, jc, playerIdx)) {
      add(jr, jc);
      continue;
    }
    // Otherwise diagonal side-steps around the blocking pawn
    const sides: Array<[number, number]> = dr !== 0 ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]];
    for (const [sr, sc] of sides) {
      const tr = nr + sr;
      const tc = nc + sc;
      if (inBoard(tr, tc) && !isBlocked(s, nr, nc, sr, sc) && !occupied(s, tr, tc, playerIdx)) add(tr, tc);
    }
  }
  return out;
}

/** Geometric validity only (bounds, overlap, crossing). */
export function wallFits(s: GameState, w: Wall): boolean {
  if (!inWallGrid(w.r, w.c)) return false;
  const k = wi(w.r, w.c);
  if (s.h[k] || s.v[k]) return false; // same spot or crossing
  if (w.o === 'h') {
    if (w.c > 0 && s.h[wi(w.r, w.c - 1)]) return false;
    if (w.c < W - 1 && s.h[wi(w.r, w.c + 1)]) return false;
  } else {
    if (w.r > 0 && s.v[wi(w.r - 1, w.c)]) return false;
    if (w.r < W - 1 && s.v[wi(w.r + 1, w.c)]) return false;
  }
  return true;
}

export type WallCheck = { ok: true } | { ok: false; reason: string };

/** Full legality check for placing a wall for the current player. */
export function checkWall(s: GameState, w: Wall): WallCheck {
  if (s.players[s.turn].walls <= 0) return { ok: false, reason: 'No hedges left' };
  if (!wallFits(s, w)) return { ok: false, reason: 'Overlaps another hedge' };
  const grid = w.o === 'h' ? s.h : s.v;
  const k = wi(w.r, w.c);
  grid[k] = 1;
  const allReach = s.players.every((_, i) => shortestPath(s, i) >= 0);
  grid[k] = 0;
  return allReach ? { ok: true } : { ok: false, reason: 'Would trap a player' };
}

export function isLegal(s: GameState, a: Action): boolean {
  if (s.winner !== null) return false;
  if (a.type === 'move') return legalMoves(s, s.turn).some((m) => m.r === a.r && m.c === a.c);
  return checkWall(s, a.wall).ok;
}

/** Applies an action in place (assumes legality was already checked). */
export function applyAction(s: GameState, a: Action): void {
  const p = s.players[s.turn];
  if (a.type === 'move') {
    p.r = a.r;
    p.c = a.c;
    if (reached(p, p.goal)) {
      s.winner = s.turn;
      return;
    }
  } else {
    const grid = a.wall.o === 'h' ? s.h : s.v;
    grid[wi(a.wall.r, a.wall.c)] = 1;
    s.wallList.push({ ...a.wall });
    p.walls -= 1;
  }
  s.turn = (s.turn + 1) % s.players.length;
}

/** Enumerates every geometrically-fitting wall (path check excluded). */
export function allFittingWalls(s: GameState): Wall[] {
  const out: Wall[] = [];
  for (let r = 0; r < W; r++) {
    for (let c = 0; c < W; c++) {
      for (const o of ['h', 'v'] as const) {
        const w = { r, c, o };
        if (wallFits(s, w)) out.push(w);
      }
    }
  }
  return out;
}

/** Human-friendly description of a player's goal destination. */
export function formatGoalDescription(goal: Goal): { edge: string; detail: string } {
  if (goal.axis === 'r') {
    return goal.value === 0
      ? { edge: 'North Edge', detail: 'Opposite side (Row 1)' }
      : { edge: 'South Edge', detail: 'Opposite side (Row 9)' };
  }
  return goal.value === 8
    ? { edge: 'East Edge', detail: 'Opposite side (Column 9)' }
    : { edge: 'West Edge', detail: 'Opposite side (Column 1)' };
}
