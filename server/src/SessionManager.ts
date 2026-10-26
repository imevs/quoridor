import { randomBytes } from 'node:crypto';
import type { WebSocket } from 'ws';
import { Session, type SessionDeps } from '../../game/src/game/session';
import type { AnimalId } from '../../game/src/game/animals';
import type { ClientMsg, ServerMsg } from '../../game/src/game/protocol';
import type { SessionStore } from './store';

export interface ClientConnection {
  ws: WebSocket;
  gameId: string | null;
  seat: number | null;
  token: string | null;
  isAlive: boolean;
}

export interface SessionManagerOptions {
  idleTimeoutMs?: number; // default: 5 min (300,000)
  finishedTtlMs?: number; // default: 24h (86,400,000)
  tickIntervalMs?: number; // default: 5s (5,000)
}

export class SessionManager {
  private sessions = new Map<string, Session>();
  private sockets = new Map<string, Set<ClientConnection>>();
  private timer: NodeJS.Timeout | null = null;
  private sessionTimers = new Map<string, NodeJS.Timeout>();
  private store: SessionStore;
  private deps: SessionDeps;
  readonly idleTimeoutMs: number;
  readonly finishedTtlMs: number;
  readonly tickIntervalMs: number;

  constructor(store: SessionStore, options: SessionManagerOptions = {}) {
    this.store = store;
    this.idleTimeoutMs = options.idleTimeoutMs ?? 5 * 60 * 1000;
    this.finishedTtlMs = options.finishedTtlMs ?? 24 * 60 * 60 * 1000;
    this.tickIntervalMs = options.tickIntervalMs ?? 5000;
    this.deps = {
      now: () => Date.now(),
      token: () => `tok_${randomBytes(16).toString('hex')}`,
    };
    this.restoreSessions();
    this.startLoop();
  }

  private restoreSessions(): void {
    const loaded = this.store.loadAll();
    for (const d of loaded) {
      const s = Session.fromJSON(d, this.deps);
      this.sessions.set(s.id, s);
      this.sockets.set(s.id, new Set());
      this.scheduleNextTimer(s);
    }
  }

  private generateGameId(): string {
    let id: string;
    do {
      id = randomBytes(5).toString('base64url');
    } while (this.sessions.has(id));
    return id;
  }

  createGame(conn: ClientConnection, players: 2 | 4, hostAnimal: AnimalId): void {
    const gameId = this.generateGameId();
    const { session, token } = Session.create(gameId, players, hostAnimal, this.deps);
    this.sessions.set(gameId, session);
    this.sockets.set(gameId, new Set());

    this.attachClient(conn, gameId, 0, token);
    this.saveSession(session);
    this.broadcastSnapshot(session);
  }

  joinGame(conn: ClientConnection, gameId: string, token?: string): void {
    const session = this.sessions.get(gameId);
    if (!session) {
      this.send(conn.ws, { type: 'error', message: 'Game session not found', fatal: true });
      return;
    }

    const { seat, token: seatToken } = session.join(token);
    this.attachClient(conn, gameId, seat, seatToken);
    this.saveSession(session);
    this.broadcastSnapshot(session);
  }

  private attachClient(conn: ClientConnection, gameId: string, seat: number | null, token: string | null): void {
    conn.gameId = gameId;
    conn.seat = seat;
    conn.token = token;

    const set = this.sockets.get(gameId);
    if (set) set.add(conn);

    const session = this.sessions.get(gameId);
    if (session) {
      session.connect(seat);
    }

    this.send(conn.ws, {
      type: 'welcome',
      gameId,
      token,
      seat,
    });
  }

  handleDisconnect(conn: ClientConnection): void {
    if (!conn.gameId) return;
    const session = this.sessions.get(conn.gameId);
    const set = this.sockets.get(conn.gameId);

    if (set) {
      set.delete(conn);
    }

    if (session) {
      session.disconnect(conn.seat);
      this.flushNotices(session);
      this.saveSession(session);
      this.broadcastSnapshot(session);
    }

    conn.gameId = null;
    conn.seat = null;
    conn.token = null;
  }

  handleMessage(conn: ClientConnection, msg: ClientMsg): void {
    if (msg.type === 'create') {
      this.createGame(conn, msg.players, msg.animal);
      return;
    }

    if (msg.type === 'join') {
      this.joinGame(conn, msg.gameId, msg.token);
      return;
    }

    if (!conn.gameId) {
      this.send(conn.ws, { type: 'error', message: 'You have not joined a game yet' });
      return;
    }

    const session = this.sessions.get(conn.gameId);
    if (!session) {
      this.send(conn.ws, { type: 'error', message: 'Game not found', fatal: true });
      return;
    }

    if (conn.seat === null && msg.type !== 'start') {
      this.send(conn.ws, { type: 'error', message: 'Spectators cannot perform game actions' });
      return;
    }

    let res: { ok: true } | { ok: false; error: string };

    switch (msg.type) {
      case 'seat':
        res = session.configureSeat(conn.seat!, msg.seat, msg.kind, msg.difficulty);
        break;
      case 'start':
        res = session.start(conn.seat ?? -1);
        break;
      case 'action':
        res = session.act(conn.seat!, msg.action);
        break;
      case 'undo':
        res = session.requestUndo(conn.seat!);
        break;
      case 'vote':
        res = session.voteUndo(conn.seat!, msg.accept);
        break;
      case 'rematch':
        res = session.rematch(conn.seat!);
        break;
      default:
        res = { ok: false, error: 'Unknown message' };
    }

    if (!res.ok) {
      this.send(conn.ws, { type: 'error', message: res.error });
      return;
    }

    this.flushNotices(session);
    this.saveSession(session);
    this.broadcastSnapshot(session);
  }

  private flushNotices(session: Session): void {
    const notices = session.drainNotices();
    for (const message of notices) {
      this.broadcast(session.id, { type: 'notice', message });
    }
  }

  private saveSession(session: Session): void {
    this.store.save(session.toJSON());
  }

  private broadcast(gameId: string, msg: ServerMsg): void {
    const conns = this.sockets.get(gameId);
    if (!conns) return;
    const text = JSON.stringify(msg);
    for (const c of conns) {
      if (c.ws.readyState === 1 /* OPEN */) {
        c.ws.send(text);
      }
    }
  }

  private broadcastSnapshot(session: Session): void {
    this.broadcast(session.id, {
      type: 'snapshot',
      view: session.view(),
    });
    this.scheduleNextTimer(session);
  }

  private scheduleNextTimer(session: Session): void {
    const existing = this.sessionTimers.get(session.id);
    if (existing) {
      clearTimeout(existing);
      this.sessionTimers.delete(session.id);
    }
    const next = session.nextTimer();
    if (next !== null) {
      const delay = Math.max(0, next - Date.now());
      const timer = setTimeout(() => {
        this.sessionTimers.delete(session.id);
        if (session.tick()) {
          this.flushNotices(session);
          this.saveSession(session);
          this.broadcastSnapshot(session);
        }
        this.scheduleNextTimer(session);
      }, delay);
      this.sessionTimers.set(session.id, timer);
    }
  }

  private send(ws: WebSocket, msg: ServerMsg): void {
    if (ws.readyState === 1 /* OPEN */) {
      ws.send(JSON.stringify(msg));
    }
  }

  private startLoop(): void {
    this.timer = setInterval(() => this.tick(), this.tickIntervalMs);
  }

  tick(): void {
    const now = Date.now();

    for (const [id, session] of this.sessions) {
      const changed = session.tick();
      if (changed) {
        this.flushNotices(session);
        this.saveSession(session);
        this.broadcastSnapshot(session);
      }

      // Check if session expired
      const liveConns = session.connections();
      const isIdle = liveConns === 0 && now - session.lastSeen > this.idleTimeoutMs;
      const isFinishedExpired = session.phase === 'finished' && now - session.lastSeen > this.finishedTtlMs;

      if (isIdle || isFinishedExpired) {
        const timer = this.sessionTimers.get(id);
        if (timer) {
          clearTimeout(timer);
          this.sessionTimers.delete(id);
        }
        this.sessions.delete(id);
        this.sockets.delete(id);
        this.store.delete(id);
      }
    }
  }

  close(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    for (const timer of this.sessionTimers.values()) {
      clearTimeout(timer);
    }
    this.sessionTimers.clear();
    this.store.close();
  }
}
