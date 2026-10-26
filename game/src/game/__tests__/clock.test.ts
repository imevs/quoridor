import { describe, expect, it } from 'vitest';
import { ChessClock, resolveTimeoutWinner } from '../clock';
import { createGame } from '../rules';

describe('ChessClock', () => {
  it('initializes with default values and player counts', () => {
    const clock = new ChessClock(300, 2);
    expect(clock.isEnabled).toBe(true);
    expect(clock.initialSeconds).toBe(300);
    expect(clock.remaining).toEqual([300, 300]);
    expect(clock.activeSeat).toBeNull();
    expect(clock.getTime(0)).toBe(300);
    expect(clock.getTime(1)).toBe(300);
  });

  it('can be disabled with 0 initial seconds', () => {
    const clock = new ChessClock(0, 4);
    expect(clock.isEnabled).toBe(false);
    expect(clock.initialSeconds).toBe(0);
    expect(clock.remaining).toEqual([0, 0, 0, 0]);
    expect(clock.tick(1.0)).toBeNull();
  });

  it('tracks active turn and ticks elapsed time accurately', () => {
    const clock = new ChessClock(60, 2);
    clock.startTurn(0);
    expect(clock.activeSeat).toBe(0);

    const res1 = clock.tick(0.5);
    expect(res1).not.toBeNull();
    expect(res1?.seat).toBe(0);
    expect(res1?.remaining).toBeCloseTo(59.5);
    expect(res1?.wholeSecond).toBe(60);
    expect(res1?.isUrgent).toBe(false);
    expect(res1?.beepSecond).toBeUndefined();
    expect(res1?.isExpired).toBe(false);

    // Other player's clock remains untouched
    expect(clock.getTime(1)).toBe(60);
  });

  it('identifies urgency and triggers beeps during the final 10 seconds', () => {
    const clock = new ChessClock(16, 2);
    clock.startTurn(1);

    // Tick to 15.0s -> urgent should be true
    const resUrgent = clock.tick(1.0);
    expect(resUrgent?.isUrgent).toBe(true);
    expect(resUrgent?.beepSecond).toBeUndefined();

    // Advance to 10.1s (wholeSecond 11)
    clock.tick(4.9);
    // Cross into wholeSecond 10 (9.9s remaining)
    const tick10 = clock.tick(0.2);
    expect(tick10?.beepSecond).toBe(10);

    // Another sub-second tick within same whole second does not repeat beep
    const tickSub = clock.tick(0.2); // 9.7 remaining
    expect(tickSub?.beepSecond).toBeUndefined();

    // Cross into wholeSecond 9 (8.9s remaining)
    const tick9 = clock.tick(0.8);
    expect(tick9?.beepSecond).toBe(9);
  });

  it('stops at 0 and reports isExpired when time runs out', () => {
    const clock = new ChessClock(1, 2);
    clock.startTurn(0);

    const res = clock.tick(1.5);
    expect(res?.remaining).toBe(0);
    expect(res?.isExpired).toBe(true);
    expect(clock.getTime(0)).toBe(0);
  });

  it('records moves and rolls back time accurately on undo', () => {
    const clock = new ChessClock(300, 2);

    // Turn 0 plays after spending 10s
    clock.startTurn(0);
    clock.tick(10);
    clock.recordMove(); // Saved snapshot: [290, 300]

    // Turn 1 plays after spending 15s
    clock.startTurn(1);
    clock.tick(15);
    clock.recordMove(); // Saved snapshot: [290, 285]

    // Turn 0 plays again after spending 5s
    clock.startTurn(0);
    clock.tick(5); // Current: [285, 285]

    // Undo 1 step (e.g. Turn 0's move in pass-and-play)
    const rolledBack1 = clock.undo(1);
    expect(rolledBack1[0]).toBeCloseTo(290);
    expect(rolledBack1[1]).toBeCloseTo(285);

    // Undo 1 step further
    const rolledBack2 = clock.undo(1);
    expect(rolledBack2[0]).toBeCloseTo(290);
    expect(rolledBack2[1]).toBe(300);

    // Undo on empty history is safe
    const rolledBackEmpty = clock.undo(1);
    expect(rolledBackEmpty[0]).toBeCloseTo(290);
    expect(rolledBackEmpty[1]).toBe(300);
  });

  it('supports multi-step undo for AI matches', () => {
    const clock = new ChessClock(300, 2);

    clock.startTurn(0);
    clock.tick(4);
    clock.recordMove(); // [296, 300]

    clock.startTurn(1);
    clock.tick(2);
    clock.recordMove(); // [296, 298]

    clock.startTurn(0);
    clock.tick(3); // [293, 298]

    // Vs AI: undoes 2 moves in one operation
    const rolledBack = clock.undo(2);
    expect(rolledBack[0]).toBeCloseTo(296);
    expect(rolledBack[1]).toBe(300);
  });

  it('resets clocks and clears history cleanly', () => {
    const clock = new ChessClock(300, 2);
    clock.startTurn(0);
    clock.tick(50);
    clock.recordMove();

    clock.reset(4, 180);
    expect(clock.initialSeconds).toBe(180);
    expect(clock.remaining).toEqual([180, 180, 180, 180]);
    expect(clock.activeSeat).toBeNull();
    expect(clock.undo(1)).toEqual([180, 180, 180, 180]);
  });

  it('restores remaining clocks for reload resilience', () => {
    const clock = new ChessClock(300, 2);
    clock.restore([145.5, 230], 300);
    expect(clock.initialSeconds).toBe(300);
    expect(clock.remaining[0]).toBe(145.5);
    expect(clock.remaining[1]).toBe(230);
  });

  it('safely handles invalid seat startTurn or tick without active turn', () => {
    const clock = new ChessClock(300, 2);
    clock.startTurn(99);
    expect(clock.activeSeat).toBeNull();
    expect(clock.tick(1)).toBeNull();

    clock.stopTurn();
    expect(clock.activeSeat).toBeNull();
  });
});

describe('resolveTimeoutWinner', () => {
  it('resolves 2-player game timeout to the opposing player', () => {
    const state = createGame(2);
    expect(resolveTimeoutWinner(state, 0)).toBe(1);
    expect(resolveTimeoutWinner(state, 1)).toBe(0);
  });

  it('resolves 4-player game timeout to the player closest to goal line', () => {
    const state = createGame(4);
    // Initial distance for all 4 players in standard starting position is 8
    // Move player 2 forward so player 2 is closer to row 8 (goal is 8)
    state.players[2].r = 6; // starts at r=0, goal is 8 -> dist is now 2 steps closer

    const winner = resolveTimeoutWinner(state, 0); // Player 0 timed out
    expect(winner).toBe(2);
  });

  it('falls back to next seat if all other players are equidistant in 4-player game', () => {
    const state = createGame(4);
    const winner = resolveTimeoutWinner(state, 1);
    expect([0, 2, 3]).toContain(winner);
  });
});
