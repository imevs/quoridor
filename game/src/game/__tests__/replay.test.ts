import { describe, it, expect } from 'vitest';
import { formatNotation, formatActionDescription, reconstructStates } from '../replay';
import type { Action } from '../rules';

describe('replay module', () => {
  it('formats cell moves in algebraic notation', () => {
    // r=8, c=4 -> row 9-8=1, col 'e' -> e1
    expect(formatNotation({ type: 'move', r: 8, c: 4 })).toBe('e1');
    // r=0, c=0 -> row 9-0=9, col 'a' -> a9
    expect(formatNotation({ type: 'move', r: 0, c: 0 })).toBe('a9');
    // r=4, c=8 -> row 9-4=5, col 'i' -> i5
    expect(formatNotation({ type: 'move', r: 4, c: 8 })).toBe('i5');
  });

  it('formats wall placements in algebraic notation', () => {
    expect(formatNotation({ type: 'wall', wall: { r: 0, c: 0, o: 'h' } })).toBe('a8h');
    expect(formatNotation({ type: 'wall', wall: { r: 7, c: 7, o: 'v' } })).toBe('h1v');
  });

  it('formats readable action descriptions', () => {
    const move: Action = { type: 'move', r: 7, c: 4 };
    expect(formatActionDescription(move, 'fox')).toContain('Fox moved to e2');
    expect(formatActionDescription(move)).toContain('Player moved to e2');

    const wallH: Action = { type: 'wall', wall: { r: 5, c: 3, o: 'h' } };
    expect(formatActionDescription(wallH, 'wolf_grey')).toContain('horizontal wall');

    const wallV: Action = { type: 'wall', wall: { r: 5, c: 3, o: 'v' } };
    expect(formatActionDescription(wallV, 'bear')).toContain('vertical wall');
  });

  it('reconstructs state snapshots accurately across multiple turns', () => {
    const actions: Action[] = [
      { type: 'move', r: 7, c: 4 }, // player 0 (fox) moves up
      { type: 'move', r: 1, c: 4 }, // player 1 (wolf) moves down
      { type: 'wall', wall: { r: 4, c: 3, o: 'h' } }, // player 0 places wall
    ];

    const states = reconstructStates(2, actions);
    expect(states.length).toBe(4); // 0 (initial), 1, 2, 3

    // Initial state
    expect(states[0].players[0].r).toBe(8);
    expect(states[0].players[1].r).toBe(0);
    expect(states[0].wallList.length).toBe(0);

    // After move 1
    expect(states[1].players[0].r).toBe(7);
    expect(states[1].players[1].r).toBe(0);

    // After move 2
    expect(states[2].players[1].r).toBe(1);

    // After move 3
    expect(states[3].wallList.length).toBe(1);
    expect(states[3].players[0].walls).toBe(9);
  });
});
