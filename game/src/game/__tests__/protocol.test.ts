import { describe, it, expect } from 'vitest';
import { MAX_MESSAGE_BYTES, isGameId, parseAction, parseClientMessage } from '../protocol';

const p = (m: unknown) => parseClientMessage(JSON.stringify(m));

describe('protocol', () => {
  it('rejects non-JSON, non-objects, unknown types and oversized messages', () => {
    expect(parseClientMessage('{nope')).toBeNull();
    expect(parseClientMessage('[1,2]')).toBeNull();
    expect(parseClientMessage('null')).toBeNull();
    expect(p({ type: 'explode' })).toBeNull();
    expect(parseClientMessage(JSON.stringify({ type: 'start', pad: 'x'.repeat(MAX_MESSAGE_BYTES) }))).toBeNull();
  });

  it('parses create', () => {
    expect(p({ type: 'create', players: 4, animal: 'bear' })).toEqual({ type: 'create', players: 4, animal: 'bear' });
    expect(p({ type: 'create', players: 3, animal: 'bear' })).toBeNull();
    expect(p({ type: 'create', players: 2, animal: 'cat' })).toBeNull();
  });

  it('parses join with and without token', () => {
    expect(p({ type: 'join', gameId: 'abcDEF12' })).toEqual({ type: 'join', gameId: 'abcDEF12' });
    expect(p({ type: 'join', gameId: 'abcDEF12', token: 'tok_abcdefgh' })).toEqual({
      type: 'join',
      gameId: 'abcDEF12',
      token: 'tok_abcdefgh',
    });
    expect(p({ type: 'join', gameId: 'a/b' })).toBeNull();
    expect(p({ type: 'join', gameId: 'abcDEF12', token: 'short' })).toBeNull();
    expect(p({ type: 'join', gameId: 'abcDEF12', token: 42 })).toBeNull();
  });

  it('parses seat config', () => {
    expect(p({ type: 'seat', seat: 1, kind: 'ai', difficulty: 'hard' })).toEqual({
      type: 'seat',
      seat: 1,
      kind: 'ai',
      difficulty: 'hard',
    });
    expect(p({ type: 'seat', seat: 4, kind: 'ai', difficulty: 'hard' })).toBeNull();
    expect(p({ type: 'seat', seat: 1, kind: 'human', difficulty: 'hard' })).toBeNull();
    expect(p({ type: 'seat', seat: 1, kind: 'open', difficulty: 'insane' })).toBeNull();
  });

  it('parses actions', () => {
    expect(p({ type: 'action', action: { type: 'move', r: 7, c: 4 } })).toEqual({
      type: 'action',
      action: { type: 'move', r: 7, c: 4 },
    });
    expect(p({ type: 'action', action: { type: 'wall', wall: { r: 0, c: 7, o: 'v' }, junk: 1 } })).toEqual({
      type: 'action',
      action: { type: 'wall', wall: { r: 0, c: 7, o: 'v' } },
    });
    expect(p({ type: 'action', action: { type: 'move', r: 9, c: 0 } })).toBeNull();
    expect(p({ type: 'action', action: { type: 'move', r: 1.5, c: 0 } })).toBeNull();
    expect(p({ type: 'action', action: { type: 'wall', wall: { r: 8, c: 0, o: 'h' } } })).toBeNull();
    expect(p({ type: 'action', action: { type: 'wall', wall: { r: 1, c: 0, o: 'x' } } })).toBeNull();
    expect(p({ type: 'action', action: { type: 'wall' } })).toBeNull();
    expect(p({ type: 'action', action: 'move' })).toBeNull();
    expect(parseAction({ type: 'jump' })).toBeNull();
  });

  it('parses vote and simple messages', () => {
    expect(p({ type: 'vote', accept: false })).toEqual({ type: 'vote', accept: false });
    expect(p({ type: 'vote', accept: 'yes' })).toBeNull();
    expect(p({ type: 'start' })).toEqual({ type: 'start' });
    expect(p({ type: 'undo' })).toEqual({ type: 'undo' });
    expect(p({ type: 'rematch' })).toEqual({ type: 'rematch' });
  });

  it('validates game ids', () => {
    expect(isGameId('Ab3_-xyz')).toBe(true);
    expect(isGameId('abc')).toBe(false);
    expect(isGameId(12345)).toBe(false);
  });
});
