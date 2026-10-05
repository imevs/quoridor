import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { MatchHistoryManager } from '../history';

// In-memory localStorage mock for node test environment
class MemoryStorage {
  private store = new Map<string, string>();
  get length() { return this.store.size; }
  clear() { this.store.clear(); }
  getItem(key: string) { return this.store.get(key) ?? null; }
  setItem(key: string, value: string) { this.store.set(key, String(value)); }
  removeItem(key: string) { this.store.delete(key); }
  key(index: number) { return Array.from(this.store.keys())[index] ?? null; }
}

const mockStorage = new MemoryStorage();
const originalStorage = globalThis.localStorage;

describe('MatchHistoryManager', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
    mockStorage.clear();
  });

  afterAll(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalStorage,
      writable: true,
      configurable: true,
    });
  });

  it('returns empty array when no matches stored', () => {
    expect(MatchHistoryManager.list()).toEqual([]);
  });

  it('records matches and prepends newest', () => {
    const r1 = MatchHistoryManager.record({
      mode: 'ai',
      players: 2,
      winner: 0,
      winnerAnimal: 'fox',
      winnerName: 'Fox',
      movesCount: 12,
      wallsCount: 4,
    });

    const r2 = MatchHistoryManager.record({
      mode: 'local',
      players: 4,
      winner: 2,
      winnerAnimal: 'bear',
      winnerName: 'Bear',
      movesCount: 20,
      wallsCount: 8,
    });

    const r3 = MatchHistoryManager.record({
      mode: 'bot_vs_bot',
      players: 2,
      winner: 1,
      winnerAnimal: 'wolf_white',
      winnerName: 'Arctic Wolf',
      movesCount: 18,
      wallsCount: 6,
    });

    const list = MatchHistoryManager.list();
    expect(list.length).toBe(3);
    expect(list[0].id).toBe(r3.id);
    expect(list[0].mode).toBe('bot_vs_bot');
    expect(list[1].id).toBe(r2.id);
    expect(list[2].id).toBe(r1.id);
  });

  it('caps history at 30 items', () => {
    for (let i = 0; i < 35; i++) {
      MatchHistoryManager.record({
        mode: 'ai',
        players: 2,
        winner: 0,
        winnerAnimal: 'fox',
        winnerName: `Fox ${i}`,
        movesCount: i,
        wallsCount: 0,
      });
    }

    const list = MatchHistoryManager.list();
    expect(list.length).toBe(30);
    expect(list[0].winnerName).toBe('Fox 34');
  });

  it('clears history', () => {
    MatchHistoryManager.record({
      mode: 'ai',
      players: 2,
      winner: 0,
      winnerAnimal: 'fox',
      winnerName: 'Fox',
      movesCount: 5,
      wallsCount: 1,
    });
    expect(MatchHistoryManager.list().length).toBe(1);

    MatchHistoryManager.clear();
    expect(MatchHistoryManager.list()).toEqual([]);
  });

  it('handles invalid JSON in localStorage gracefully', () => {
    mockStorage.setItem('quoridors.match_history', 'invalid-json{{{');
    expect(MatchHistoryManager.list()).toEqual([]);
  });

  it('handles environment without localStorage gracefully', () => {
    // @ts-expect-error test missing storage
    delete globalThis.localStorage;
    expect(MatchHistoryManager.list()).toEqual([]);
    expect(MatchHistoryManager.record({
      mode: 'ai',
      players: 2,
      winner: 0,
      winnerAnimal: 'fox',
      winnerName: 'Fox',
      movesCount: 1,
      wallsCount: 0,
    }).winnerName).toBe('Fox');
    MatchHistoryManager.clear();
  });
});
