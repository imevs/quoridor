import { describe, it, expect } from 'vitest';
import { applyAction, createGame } from '../rules';
import { fromWire, toWire } from '../serialize';

describe('serialize', () => {
  it('round-trips a game state with walls through JSON', () => {
    const s = createGame(4);
    applyAction(s, { type: 'wall', wall: { r: 2, c: 3, o: 'h' } });
    applyAction(s, { type: 'move', r: 4, c: 1 });
    const wire = JSON.parse(JSON.stringify(toWire(s)));
    expect(Array.isArray(wire.h)).toBe(true);
    const back = fromWire(wire);
    expect(back.h).toBeInstanceOf(Uint8Array);
    expect(back).toEqual(s);
  });

  it('produces independent copies', () => {
    const s = createGame(2);
    const wire = toWire(s);
    wire.players[0].r = 3;
    wire.players[0].goal.value = 5;
    expect(s.players[0].r).toBe(8);
    expect(s.players[0].goal.value).toBe(0);
    const back = fromWire(wire);
    wire.h[0] = 1;
    expect(back.h[0]).toBe(0);
  });

  it('ignores oversized grid arrays', () => {
    const wire = toWire(createGame(2));
    wire.h = new Array(100).fill(1);
    expect(fromWire(wire).h).toHaveLength(64);
  });
});
