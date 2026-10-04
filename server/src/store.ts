import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { SessionData } from '../../game/src/game/session';

export interface SessionStore {
  save(data: SessionData): void;
  load(id: string): SessionData | null;
  loadAll(): SessionData[];
  delete(id: string): void;
  purge(idleBefore: number, finishedBefore: number): number;
  close(): void;
}

export class SQLiteSessionStore implements SessionStore {
  private db: DatabaseSync;

  constructor(filePath: string) {
    if (filePath !== ':memory:') {
      mkdirSync(dirname(filePath), { recursive: true });
    }
    this.db = new DatabaseSync(filePath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        phase TEXT NOT NULL,
        last_seen INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_last_seen ON sessions(last_seen);
    `);
  }

  private isOpen = true;

  save(data: SessionData): void {
    if (!this.isOpen) return;
    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, data, phase, last_seen)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        data = excluded.data,
        phase = excluded.phase,
        last_seen = excluded.last_seen;
    `);
    stmt.run(data.id, JSON.stringify(data), data.phase, data.lastSeen);
  }

  load(id: string): SessionData | null {
    if (!this.isOpen) return null;
    const stmt = this.db.prepare(`SELECT data FROM sessions WHERE id = ?`);
    const row = stmt.get(id) as { data: string } | undefined;
    return row ? (JSON.parse(row.data) as SessionData) : null;
  }

  loadAll(): SessionData[] {
    if (!this.isOpen) return [];
    const stmt = this.db.prepare(`SELECT data FROM sessions`);
    const rows = stmt.all() as Array<{ data: string }>;
    return rows.map((r) => JSON.parse(r.data) as SessionData);
  }

  delete(id: string): void {
    if (!this.isOpen) return;
    const stmt = this.db.prepare(`DELETE FROM sessions WHERE id = ?`);
    stmt.run(id);
  }

  purge(idleBefore: number, finishedBefore: number): number {
    if (!this.isOpen) return 0;
    const stmt = this.db.prepare(`
      DELETE FROM sessions
      WHERE (phase != 'finished' AND last_seen < ?)
         OR (phase = 'finished' AND last_seen < ?);
    `);
    const res = stmt.run(idleBefore, finishedBefore);
    return Number(res.changes);
  }

  close(): void {
    if (this.isOpen) {
      this.isOpen = false;
      this.db.close();
    }
  }
}
