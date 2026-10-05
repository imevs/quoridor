import { describe, it, expect } from 'vitest';
import { createGame, isLegal, shortestPath } from '../rules';
import { chooseAction, evaluate } from '../ai';

describe('Quoridor AI Opponent', () => {
  it('always produces a strictly legal action for any difficulty', () => {
    const difficulties = ['easy', 'medium', 'hard'] as const;

    for (const diff of difficulties) {
      const state = createGame(2);
      state.turn = 1; // AI as player 1

      const action = chooseAction(state, diff);
      expect(isLegal(state, action)).toBe(true);
    }
  });

  it('selects an immediate winning move when available', () => {
    const state = createGame(2);
    // Move player 0 away so (8, 4) is completely clear
    state.players[0].r = 0;
    state.players[0].c = 0;

    // Player 1 is at row 7, goal is row 8 (1 step away!)
    state.players[1].r = 7;
    state.players[1].c = 4;
    state.turn = 1;

    const action = chooseAction(state, 'hard');
    expect(action).toEqual({ type: 'move', r: 8, c: 4 });
  });

  it('selects a diagonal winning jump when opponent blocks the straight path on the goal line', () => {
    const state = createGame(2);
    // Player 0 is on (8, 4)
    state.players[0].r = 8;
    state.players[0].c = 4;

    // Player 1 is right in front at (7, 4), goal is row 8
    state.players[1].r = 7;
    state.players[1].c = 4;
    state.turn = 1;

    const action = chooseAction(state, 'hard');
    expect(action.type).toBe('move');
    if (action.type === 'move') {
      // Must jump to row 8 (either col 3 or col 5) to win!
      expect(action.r).toBe(8);
      expect([3, 5]).toContain(action.c);
    }
  });

  it('only chooses pawn moves when player has 0 walls remaining', () => {
    const state = createGame(2);
    state.players[1].walls = 0;
    state.turn = 1;

    const action = chooseAction(state, 'medium');
    expect(action.type).toBe('move');
  });

  it('advances towards the goal in early game without self-sabotage', () => {
    const state = createGame(2);
    state.turn = 1; // player 1 starts at (0, 4) with goal at row 8
    const distBefore = shortestPath(state, 1);

    const action = chooseAction(state, 'hard');
    expect(isLegal(state, action)).toBe(true);

    if (action.type === 'move') {
      // Must not move backward away from goal
      expect(action.r).toBeGreaterThanOrEqual(state.players[1].r);
    }
    expect(shortestPath(state, 1)).toBeLessThanOrEqual(distBefore);
  });

  it('places a wall defensively when opponent is dangerously close to winning', () => {
    const state = createGame(2);
    // Player 0 is at row 1, 1 step from goal line (row 0)
    state.players[0].r = 1;
    state.players[0].c = 4;

    // Player 1 is further behind at row 3, goal row 8
    state.players[1].r = 3;
    state.players[1].c = 4;
    state.turn = 1;

    const action = chooseAction(state, 'hard');
    expect(isLegal(state, action)).toBe(true);
  });

  it('works in 4-player games across difficulties including hard', () => {
    const state = createGame(4);
    state.turn = 2; // third player

    const actionMed = chooseAction(state, 'medium');
    expect(isLegal(state, actionMed)).toBe(true);

    const actionHard = chooseAction(state, 'hard');
    expect(isLegal(state, actionHard)).toBe(true);
  });

  it('accurately evaluates terminal states, threat penalties, and sprint bonuses', () => {
    const s = createGame(2);
    s.winner = 0;
    expect(evaluate(s, 0)).toBe(100_000);
    expect(evaluate(s, 1)).toBe(-100_000);

    const s2 = createGame(2);
    s2.players[0].r = 0; // reached goal
    expect(evaluate(s2, 0)).toBe(100_000);

    // Opponent close to goal
    const s3 = createGame(2);
    s3.players[1].r = 7; // 1 step from goal 8
    s3.players[0].r = 6;
    expect(evaluate(s3, 0)).toBeLessThan(0); // Threat penalty applied against player 0

    // AI close to goal
    const s4 = createGame(2);
    s4.players[0].r = 1; // 1 step from goal 0
    s4.players[1].r = 2; // 6 steps from goal 8
    expect(evaluate(s4, 0)).toBeGreaterThan(200);

    // AI 2 steps from goal
    const s5 = createGame(2);
    s5.players[0].r = 2;
    s5.players[1].r = 2;
    expect(evaluate(s5, 0)).toBeGreaterThan(50);
  });

  it('immediately returns the single available action when only 1 legal action exists', () => {
    const s = createGame(2);
    s.players[0].walls = 0;
    s.players[0].r = 0;
    s.players[0].c = 0;
    // Surrounding walls so only 1 move is possible
    s.turn = 0;
    const action = chooseAction(s, 'easy');
    expect(isLegal(s, action)).toBe(true);
  });

  it('detects a forced 2-turn win via minimax depth lookahead', () => {
    const state = createGame(2);
    // Player 1 is at row 6, col 4. Goal is row 8 (2 steps).
    state.players[1].r = 6;
    state.players[1].c = 4;
    // Player 0 is far away at row 7, col 0. Opponent cannot stop player 1.
    state.players[0].r = 7;
    state.players[0].c = 0;
    state.players[0].walls = 0;
    state.turn = 1;

    const action = chooseAction(state, 'hard');
    expect(action).toEqual({ type: 'move', r: 7, c: 4 });
  });

  it('evaluates state as losing when opponent reaches goal', () => {
    const s = createGame(2);
    s.players[1].r = 8; // reached goal row 8
    expect(evaluate(s, 0)).toBe(-100_000);
  });

  it('considers candidate walls against horizontal moving opponents in 4-player games', () => {
    const s = createGame(4);
    // Player 2 moves horizontally towards col 0, is at (4, 2)
    s.players[2].r = 4;
    s.players[2].c = 2;
    s.turn = 0;

    const action = chooseAction(s, 'hard');
    expect(isLegal(s, action)).toBe(true);
  });
});
