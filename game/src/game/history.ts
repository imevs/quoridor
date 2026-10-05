import type { AnimalId } from './animals';

export interface HistoryRecord {
  id: string;
  date: number; // timestamp
  mode: 'ai' | 'local' | 'online' | 'bot_vs_bot';
  players: 2 | 4;
  winner: number;
  winnerAnimal: AnimalId;
  winnerName: string;
  movesCount: number;
  wallsCount: number;
}

const STORAGE_KEY = 'quoridors.match_history';
const MAX_HISTORY = 30;

function getStorage(): Storage | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    /* access denied */
  }
  return null;
}

export class MatchHistoryManager {
  static list(): HistoryRecord[] {
    try {
      const storage = getStorage();
      if (!storage) return [];
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as HistoryRecord[];
    } catch {
      return [];
    }
  }

  static record(entry: Omit<HistoryRecord, 'id' | 'date'>): HistoryRecord {
    const list = this.list();
    const record: HistoryRecord = {
      ...entry,
      id: Math.random().toString(36).slice(2, 10),
      date: Date.now(),
    };
    list.unshift(record);
    if (list.length > MAX_HISTORY) {
      list.length = MAX_HISTORY;
    }
    try {
      const storage = getStorage();
      storage?.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      /* ignore storage quota */
    }
    return record;
  }

  static clear(): void {
    try {
      const storage = getStorage();
      storage?.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}
