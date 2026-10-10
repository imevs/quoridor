import { describe, it, expect } from 'vitest';
import {
  W,
  createGame,
  cloneState,
  isBlocked,
  shortestPath,
  shortestPathCells,
  legalMoves,
  wallFits,
  checkWall,
  applyAction,
  isLegal,
  allFittingWalls,
  formatGoalDescription,
  type Wall,
} from '../rules';

describe('Quoridor Rules Engine', () => {
  describe('Game Initialization', () => {
    it('initializes a 2-player game with standard layout and 10 walls each', () => {
      const state = createGame(2);
      expect(state.players).toHaveLength(2);
      expect(state.turn).toBe(0);
      expect(state.winner).toBeNull();
      expect(state.wallList).toHaveLength(0);

      // Player 0 (Bottom)
      expect(state.players[0]).toEqual({
        r: 8,
        c: 4,
        walls: 10,
        goal: { axis: 'r', value: 0 },
      });

      // Player 1 (Top)
      expect(state.players[1]).toEqual({
        r: 0,
        c: 4,
        walls: 10,
        goal: { axis: 'r', value: 8 },
      });

      // Wall occupancy buffers
      expect(state.h.length).toBe(W * W);
      expect(state.v.length).toBe(W * W);
      expect(state.h.every((x) => x === 0)).toBe(true);
      expect(state.v.every((x) => x === 0)).toBe(true);
    });

    it('initializes a 4-player game with 4 seats and 5 walls each', () => {
      const state = createGame(4);
      expect(state.players).toHaveLength(4);
      expect(state.turn).toBe(0);
      expect(state.winner).toBeNull();

      expect(state.players[0]).toEqual({ r: 8, c: 4, walls: 5, goal: { axis: 'r', value: 0 } });
      expect(state.players[1]).toEqual({ r: 4, c: 0, walls: 5, goal: { axis: 'c', value: 8 } });
      expect(state.players[2]).toEqual({ r: 0, c: 4, walls: 5, goal: { axis: 'r', value: 8 } });
      expect(state.players[3]).toEqual({ r: 4, c: 8, walls: 5, goal: { axis: 'c', value: 0 } });
    });
  });

  describe('State Cloning', () => {
    it('creates a deep, independent copy of the game state', () => {
      const state = createGame(2);
      state.h[0] = 1;
      state.wallList.push({ r: 0, c: 0, o: 'h' });

      const clone = cloneState(state);
      expect(clone).toEqual(state);

      // Mutate clone
      clone.players[0].r = 5;
      clone.h[0] = 0;
      clone.wallList.push({ r: 1, c: 1, o: 'v' });
      clone.turn = 1;

      // Original state must remain unchanged
      expect(state.players[0].r).toBe(8);
      expect(state.h[0]).toBe(1);
      expect(state.wallList).toHaveLength(1);
      expect(state.turn).toBe(0);
    });
  });

  describe('Wall Blockage Detection (isBlocked)', () => {
    it('horizontal wall blocks vertical movement across its 2-cell span in both directions', () => {
      const state = createGame(2);
      // Place horizontal wall at (3, 2), which spans columns 2 and 3 between rows 3 and 4
      state.h[3 * W + 2] = 1;

      // Column 2: blocked between row 3 and row 4
      expect(isBlocked(state, 3, 2, 1, 0)).toBe(true);  // downward
      expect(isBlocked(state, 4, 2, -1, 0)).toBe(true); // upward

      // Column 3: blocked between row 3 and row 4
      expect(isBlocked(state, 3, 3, 1, 0)).toBe(true);  // downward
      expect(isBlocked(state, 4, 3, -1, 0)).toBe(true); // upward

      // Adjacent columns 1 and 4 must NOT be blocked
      expect(isBlocked(state, 3, 1, 1, 0)).toBe(false);
      expect(isBlocked(state, 4, 1, -1, 0)).toBe(false);
      expect(isBlocked(state, 3, 4, 1, 0)).toBe(false);
      expect(isBlocked(state, 4, 4, -1, 0)).toBe(false);

      // Horizontal movement within the rows must NOT be blocked by this horizontal wall
      expect(isBlocked(state, 3, 2, 0, 1)).toBe(false);
      expect(isBlocked(state, 3, 3, 0, -1)).toBe(false);
    });

    it('vertical wall blocks horizontal movement across its 2-cell span in both directions', () => {
      const state = createGame(2);
      // Place vertical wall at (2, 4), which spans rows 2 and 3 between columns 4 and 5
      state.v[2 * W + 4] = 1;

      // Row 2: blocked between col 4 and col 5
      expect(isBlocked(state, 2, 4, 0, 1)).toBe(true);  // rightward
      expect(isBlocked(state, 2, 5, 0, -1)).toBe(true); // leftward

      // Row 3: blocked between col 4 and col 5
      expect(isBlocked(state, 3, 4, 0, 1)).toBe(true);  // rightward
      expect(isBlocked(state, 3, 5, 0, -1)).toBe(true); // leftward

      // Adjacent rows 1 and 4 must NOT be blocked
      expect(isBlocked(state, 1, 4, 0, 1)).toBe(false);
      expect(isBlocked(state, 4, 4, 0, 1)).toBe(false);

      // Vertical movement between rows must NOT be blocked by this vertical wall
      expect(isBlocked(state, 2, 4, 1, 0)).toBe(false);
      expect(isBlocked(state, 3, 4, -1, 0)).toBe(false);
    });
  });

  describe('Shortest Path & BFS Pathfinding', () => {
    it('calculates the exact distance and step-by-step path on an open board', () => {
      const state = createGame(2);
      // Player 0 starts at (8, 4), goal is row 0 -> 8 steps
      expect(shortestPath(state, 0)).toBe(8);

      const path = shortestPathCells(state, 0);
      expect(path).not.toBeNull();
      expect(path!).toHaveLength(9);
      expect(path![0]).toEqual({ r: 8, c: 4 });
      expect(path![8].r).toBe(0);

      // Player 1 starts at (0, 4), goal is row 8 -> 8 steps
      expect(shortestPath(state, 1)).toBe(8);
      const path1 = shortestPathCells(state, 1);
      expect(path1).not.toBeNull();
      expect(path1!).toHaveLength(9);
      expect(path1![0]).toEqual({ r: 0, c: 4 });
      expect(path1![8].r).toBe(8);
    });

    it('increases path length correctly when detour walls are placed', () => {
      const state = createGame(2);
      // Place horizontal wall right in front of Player 0 at (7, 4)
      state.h[7 * W + 4] = 1;
      // Straight vertical path is blocked; sidestepping left to col 3 takes 1 lateral + 8 vertical = 9 steps to goal row
      expect(shortestPath(state, 0)).toBe(9);
    });

    it('returns -1 and null when completely enclosed', () => {
      const state = createGame(2);
      // Move player 0 to corner (0, 0) with goal row 8
      state.players[0].r = 0;
      state.players[0].c = 0;
      state.players[0].goal = { axis: 'r', value: 8 };

      // Box them in: horizontal wall below (r=0, c=0), vertical wall to right (r=0, c=0)
      state.h[0 * W + 0] = 1; // blocks (0,0)-(1,0) and (0,1)-(1,1)
      state.v[0 * W + 0] = 1; // blocks (0,0)-(0,1) and (1,0)-(1,1)

      expect(shortestPath(state, 0)).toBe(-1);
      expect(shortestPathCells(state, 0)).toBeNull();
    });
  });

  describe('Pawn Movement & Legal Moves', () => {
    it('allows 4 cardinal moves in open space', () => {
      const state = createGame(2);
      state.players[0] = { r: 4, c: 4, walls: 10, goal: { axis: 'r', value: 0 } };
      state.players[1] = { r: 0, c: 0, walls: 10, goal: { axis: 'r', value: 8 } };

      const moves = legalMoves(state, 0);
      expect(moves).toHaveLength(4);
      expect(moves).toEqual(
        expect.arrayContaining([
          { r: 3, c: 4 },
          { r: 5, c: 4 },
          { r: 4, c: 3 },
          { r: 4, c: 5 },
        ])
      );
    });

    it('restricts moves at the board boundaries', () => {
      const state = createGame(2);
      // Move player 0 to bottom-left corner (8, 0)
      state.players[0] = { r: 8, c: 0, walls: 10, goal: { axis: 'r', value: 0 } };
      state.players[1] = { r: 0, c: 8, walls: 10, goal: { axis: 'r', value: 8 } };

      const moves = legalMoves(state, 0);
      expect(moves).toHaveLength(2);
      expect(moves).toEqual(
        expect.arrayContaining([
          { r: 7, c: 0 }, // Up
          { r: 8, c: 1 }, // Right
        ])
      );
    });

    it('prevents moving through a wall', () => {
      const state = createGame(2);
      state.players[0] = { r: 4, c: 4, walls: 10, goal: { axis: 'r', value: 0 } };
      state.players[1] = { r: 0, c: 0, walls: 10, goal: { axis: 'r', value: 8 } };

      // Wall directly north of (4, 4) at horizontal slot (3, 4)
      state.h[3 * W + 4] = 1;

      const moves = legalMoves(state, 0);
      expect(moves).toHaveLength(3);
      expect(moves).not.toContainEqual({ r: 3, c: 4 });
      expect(moves).toEqual(
        expect.arrayContaining([
          { r: 5, c: 4 },
          { r: 4, c: 3 },
          { r: 4, c: 5 },
        ])
      );
    });

    it('allows a straight jump over an opponent when the tile behind is free', () => {
      const state = createGame(2);
      state.players[0] = { r: 4, c: 4, walls: 10, goal: { axis: 'r', value: 0 } };
      state.players[1] = { r: 3, c: 4, walls: 10, goal: { axis: 'r', value: 8 } };

      const moves = legalMoves(state, 0);
      // Can move East (4,5), West (4,3), South (5,4), and straight jump North to (2,4)
      expect(moves).toHaveLength(4);
      expect(moves).toContainEqual({ r: 2, c: 4 });
      expect(moves).not.toContainEqual({ r: 3, c: 4 }); // cannot land on opponent
    });

    it('allows diagonal side-step jumps when a straight jump is blocked by a wall behind the opponent', () => {
      const state = createGame(2);
      state.players[0] = { r: 4, c: 4, walls: 10, goal: { axis: 'r', value: 0 } };
      state.players[1] = { r: 3, c: 4, walls: 10, goal: { axis: 'r', value: 8 } };

      // Wall north of opponent (between row 2 and 3)
      state.h[2 * W + 4] = 1;

      const moves = legalMoves(state, 0);
      // Straight jump to (2,4) is blocked. Diagonal hops to (3,3) and (3,5) should be allowed!
      expect(moves).not.toContainEqual({ r: 2, c: 4 });
      expect(moves).toContainEqual({ r: 3, c: 3 });
      expect(moves).toContainEqual({ r: 3, c: 5 });
      expect(moves).toContainEqual({ r: 5, c: 4 });
      expect(moves).toContainEqual({ r: 4, c: 3 });
      expect(moves).toContainEqual({ r: 4, c: 5 });
    });

    it('allows diagonal side-step jumps when the opponent is at the board edge', () => {
      const state = createGame(2);
      // Opponent is at row 0, player 0 is at row 1
      state.players[0] = { r: 1, c: 4, walls: 10, goal: { axis: 'r', value: 0 } };
      state.players[1] = { r: 0, c: 4, walls: 10, goal: { axis: 'r', value: 8 } };

      const moves = legalMoves(state, 0);
      // Cannot jump off-board to r = -1; must diagonal jump to (0, 3) and (0, 5)
      expect(moves).toContainEqual({ r: 0, c: 3 });
      expect(moves).toContainEqual({ r: 0, c: 5 });
    });

    it('does not allow diagonal jump through a side wall', () => {
      const state = createGame(2);
      state.players[0] = { r: 4, c: 4, walls: 10, goal: { axis: 'r', value: 0 } };
      state.players[1] = { r: 3, c: 4, walls: 10, goal: { axis: 'r', value: 8 } };

      // Wall behind opponent blocking straight jump
      state.h[2 * W + 4] = 1;

      // Vertical wall to the right of opponent at (3, 4) blocking move to (3, 5)
      state.v[3 * W + 4] = 1;

      const moves = legalMoves(state, 0);
      // Left diagonal (3, 3) allowed, but right diagonal (3, 5) is blocked
      expect(moves).toContainEqual({ r: 3, c: 3 });
      expect(moves).not.toContainEqual({ r: 3, c: 5 });
    });
  });

  describe('Wall Fitting & Legality (wallFits & checkWall)', () => {
    it('validates wall coordinate boundaries', () => {
      const state = createGame(2);
      expect(wallFits(state, { r: 0, c: 0, o: 'h' })).toBe(true);
      expect(wallFits(state, { r: W - 1, c: W - 1, o: 'h' })).toBe(true);

      // Out of bounds
      expect(wallFits(state, { r: -1, c: 0, o: 'h' })).toBe(false);
      expect(wallFits(state, { r: 0, c: -1, o: 'h' })).toBe(false);
      expect(wallFits(state, { r: W, c: 0, o: 'h' })).toBe(false);
      expect(wallFits(state, { r: 0, c: W, o: 'h' })).toBe(false);
    });

    it('rejects duplicate or overlapping walls', () => {
      const state = createGame(2);
      state.h[2 * W + 3] = 1;

      // Exact same wall
      expect(wallFits(state, { r: 2, c: 3, o: 'h' })).toBe(false);

      // Overlapping horizontal walls sharing 1 segment
      expect(wallFits(state, { r: 2, c: 2, o: 'h' })).toBe(false);
      expect(wallFits(state, { r: 2, c: 4, o: 'h' })).toBe(false);

      // Adjacent non-overlapping horizontal wall
      expect(wallFits(state, { r: 2, c: 1, o: 'h' })).toBe(true);
      expect(wallFits(state, { r: 2, c: 5, o: 'h' })).toBe(true);
    });

    it('rejects perpendicular crossing at the same intersection', () => {
      const state = createGame(2);
      state.h[2 * W + 3] = 1;

      // Perpendicular vertical wall at the exact same (2, 3) intersection
      expect(wallFits(state, { r: 2, c: 3, o: 'v' })).toBe(false);

      // Perpendicular vertical wall at adjacent intersection is valid
      expect(wallFits(state, { r: 2, c: 2, o: 'v' })).toBe(true);
      expect(wallFits(state, { r: 2, c: 4, o: 'v' })).toBe(true);
    });

    it('rejects wall placement when player has 0 walls remaining', () => {
      const state = createGame(2);
      state.players[0].walls = 0;

      const check = checkWall(state, { r: 2, c: 2, o: 'h' });
      expect(check.ok).toBe(false);
      if (!check.ok) {
        expect(check.reason).toBe('No hedges left');
      }
    });

    it('anti-trap rule: rejects a wall that completely blocks any player from reaching their goal', () => {
      const state = createGame(2);
      // Place horizontal walls across columns 0 to 6 at row 7
      // Wall length is 2, so walls at c=0, c=2, c=4 cover columns 0..5
      state.h[7 * W + 0] = 1;
      state.h[7 * W + 2] = 1;
      state.h[7 * W + 4] = 1;
      state.h[7 * W + 6] = 1; // covers columns 6 and 7

      // Board has 9 columns (0..8). Columns 0..7 are blocked.
      // Column 8 is the only open passage!
      expect(shortestPath(state, 0)).toBeGreaterThan(0);

      // Now try to close the remaining column with a vertical wall or horizontal wall
      // A horizontal wall at (7, 7) would overlap (7, 6).
      // Placing vertical wall at (7, 7) closes off the corridor:
      state.v[7 * W + 7] = 1;

      // Check placing wall that closes the trap
      const stateTrap = cloneState(state);
      stateTrap.v[6 * W + 7] = 1;
      if (shortestPath(stateTrap, 0) < 0) {
        const check = checkWall(state, { r: 6, c: 7, o: 'v' });
        expect(check.ok).toBe(false);
      }
    });

    it('lists all geometrically fitting walls', () => {
      const state = createGame(2);
      const allWalls = allFittingWalls(state);
      // 8x8 intersections * 2 orientations = 128 total potential walls
      expect(allWalls).toHaveLength(W * W * 2);
    });
  });

  describe('Action Execution & Game Loop (applyAction & isLegal)', () => {
    it('executes a move action and advances the turn', () => {
      const state = createGame(2);
      const action = { type: 'move' as const, r: 7, c: 4 };

      expect(isLegal(state, action)).toBe(true);
      applyAction(state, action);

      expect(state.players[0].r).toBe(7);
      expect(state.players[0].c).toBe(4);
      expect(state.turn).toBe(1); // turn advanced to player 1
      expect(state.winner).toBeNull();
    });

    it('executes a wall action: decrements player walls, records wall, advances turn', () => {
      const state = createGame(2);
      const wall: Wall = { r: 4, c: 3, o: 'h' };
      const action = { type: 'wall' as const, wall };

      expect(isLegal(state, action)).toBe(true);
      applyAction(state, action);

      expect(state.players[0].walls).toBe(9);
      expect(state.wallList).toHaveLength(1);
      expect(state.wallList[0]).toEqual(wall);
      expect(state.h[4 * W + 3]).toBe(1);
      expect(state.turn).toBe(1);
    });

    it('detects win condition when a player reaches their target goal row', () => {
      const state = createGame(2);
      // Move opponent away to (0, 0) so (0, 4) is free
      state.players[1].r = 0;
      state.players[1].c = 0;

      // Place player 0 at row 1, goal is row 0
      state.players[0].r = 1;
      state.players[0].c = 4;

      const winningMove = { type: 'move' as const, r: 0, c: 4 };
      expect(isLegal(state, winningMove)).toBe(true);

      applyAction(state, winningMove);
      expect(state.winner).toBe(0);
      expect(state.players[0].r).toBe(0);

      // Once won, no further actions are legal
      expect(isLegal(state, { type: 'move', r: 1, c: 4 })).toBe(false);
    });

    it('cycles turns correctly in a 4-player game (0 -> 1 -> 2 -> 3 -> 0)', () => {
      const state = createGame(4);
      expect(state.turn).toBe(0);

      applyAction(state, { type: 'move', r: 7, c: 4 });
      expect(state.turn).toBe(1);

      applyAction(state, { type: 'move', r: 4, c: 1 });
      expect(state.turn).toBe(2);

      applyAction(state, { type: 'move', r: 1, c: 4 });
      expect(state.turn).toBe(3);

      applyAction(state, { type: 'move', r: 4, c: 7 });
      expect(state.turn).toBe(0);
    });

    it('handles straight jump blocked by a third player behind the opponent (diagonal jump only)', () => {
      // Player 0 at (4, 4), Player 1 at (3, 4), and Player 2 at (2, 4)
      const state = createGame(4);
      state.players[0].r = 4;
      state.players[0].c = 4;

      state.players[1].r = 3;
      state.players[1].c = 4;

      state.players[2].r = 2;
      state.players[2].c = 4;

      const moves = legalMoves(state, 0);
      // Straight jump to (2, 4) is blocked by Player 2!
      expect(moves).not.toContainEqual({ r: 2, c: 4 });
      expect(moves).not.toContainEqual({ r: 3, c: 4 });
      // Player 0 can diagonal jump to (3, 3) and (3, 5)
      expect(moves).toContainEqual({ r: 3, c: 3 });
      expect(moves).toContainEqual({ r: 3, c: 5 });
    });

    it('navigates a zig-zag labyrinth with exact path coordinates', () => {
      const state = createGame(2);
      // Construct a zig-zag labyrinth:
      // Row 7 blocked from c=0..6 (open at c=7,8)
      state.h[7 * W + 0] = 1;
      state.h[7 * W + 2] = 1;
      state.h[7 * W + 4] = 1;
      state.h[7 * W + 6] = 1; // covers c=6,7 -> open at c=8 only

      // Row 5 blocked from c=2..7 (open at c=0,1)
      state.h[5 * W + 2] = 1;
      state.h[5 * W + 4] = 1;
      state.h[5 * W + 6] = 1;

      // Ensure path exists and length is significantly increased (8 -> 12 steps)
      const dist = shortestPath(state, 0);
      expect(dist).toBeGreaterThanOrEqual(12);

      const path = shortestPathCells(state, 0);
      expect(path).not.toBeNull();
      // First cell must be player's position
      expect(path![0]).toEqual({ r: 8, c: 4 });
      // Final cell must reach row 0
      expect(path![path!.length - 1].r).toBe(0);

      // Verify every step in the path is adjacent and unblocked
      for (let i = 0; i < path!.length - 1; i++) {
        const cur = path![i];
        const next = path![i + 1];
        const dr = next.r - cur.r;
        const dc = next.c - cur.c;
        expect(Math.abs(dr) + Math.abs(dc)).toBe(1);
        expect(isBlocked(state, cur.r, cur.c, dr, dc)).toBe(false);
      }
    });

    it('rejects illegal actions with isLegal', () => {
      const state = createGame(2);
      // Off-board move
      expect(isLegal(state, { type: 'move', r: -1, c: 4 })).toBe(false);
      // Non-adjacent move
      expect(isLegal(state, { type: 'move', r: 0, c: 4 })).toBe(false);
      // Overlapping wall
      state.h[0] = 1;
      expect(isLegal(state, { type: 'wall', wall: { r: 0, c: 0, o: 'h' } })).toBe(false);
    });

    it('formats goal descriptions accurately for all cardinal directions', () => {
      expect(formatGoalDescription({ axis: 'r', value: 0 })).toEqual({
        edge: 'North Edge',
        detail: 'Opposite side (Row 1)',
      });
      expect(formatGoalDescription({ axis: 'r', value: 8 })).toEqual({
        edge: 'South Edge',
        detail: 'Opposite side (Row 9)',
      });
      expect(formatGoalDescription({ axis: 'c', value: 8 })).toEqual({
        edge: 'East Edge',
        detail: 'Opposite side (Column 9)',
      });
      expect(formatGoalDescription({ axis: 'c', value: 0 })).toEqual({
        edge: 'West Edge',
        detail: 'Opposite side (Column 1)',
      });
    });
  });
});
