/**
 * Authoritative online game session. Pure logic: no I/O, no timers.
 * Time and token generation are injected so the class is deterministic in tests.
 * The server calls `nextTimer()` / `tick()` to drive AI turns and undo timeouts.
 */
import { type Action, type GameState, applyAction, cloneState, createGame, isLegal } from './rules';
import { type Difficulty, chooseAction } from './ai';
import { ANIMAL_ORDER, type AnimalId } from './animals';
import { type WireState, fromWire, toWire } from './serialize';
import type { GameEvent, Phase, SeatKind, SessionView } from './protocol';

export const AI_DELAY_START_MS = 1500;
export const AI_DELAY_MS = 1100;
export const UNDO_TIMEOUT_MS = 30_000;

export interface SessionDeps {
  now(): number;
  token(): string;
  ai?: (s: GameState, d: Difficulty) => Action;
}

export type Result = { ok: true } | { ok: false; error: string };

interface SeatRecord {
  animal: AnimalId;
  kind: SeatKind;
  difficulty: Difficulty;
  token: string | null;
  connected: number;
}

interface PendingUndo {
  by: number;
  voters: number[];
  accepted: number[];
  expiresAt: number;
}

/** Persisted form. Connection counts and pending undo votes are transient. */
export interface SessionData {
  id: string;
  players: 2 | 4;
  turnTimer?: number;
  phase: Phase;
  seats: Array<Pick<SeatRecord, 'animal' | 'kind' | 'difficulty' | 'token'>>;
  state: WireState | null;
  history: WireState[];
  version: number;
  event: GameEvent | null;
  lastSeen: number;
}

const ok: Result = { ok: true };
const fail = (error: string): Result => ({ ok: false, error });

export const HOST_SEAT = 0;

export class Session {
  readonly id: string;
  readonly players: 2 | 4;
  turnTimer: number;
  phase: Phase = 'lobby';
  state: GameState | null = null;
  version = 0;
  event: GameEvent | null = null;
  lastSeen: number;
  spectators = 0;
  private seats: SeatRecord[];
  private history: GameState[] = [];
  private undo: PendingUndo | null = null;
  private aiAt: number | null = null;
  private notices: string[] = [];
  private deps: SessionDeps;

  private constructor(id: string, players: 2 | 4, seats: SeatRecord[], deps: SessionDeps, turnTimer = 300) {
    this.id = id;
    this.players = players;
    this.seats = seats;
    this.deps = deps;
    this.turnTimer = turnTimer;
    this.lastSeen = deps.now();
  }

  /** Creates a lobby with the host in seat 0. Returns the host's seat token. */
  static create(id: string, players: 2 | 4, hostAnimal: AnimalId, deps: SessionDeps, turnTimer = 300): { session: Session; token: string } {
    const others = ANIMAL_ORDER.filter((a) => a !== hostAnimal);
    const token = deps.token();
    const seats: SeatRecord[] = Array.from({ length: players }, (_, i) => ({
      animal: i === 0 ? hostAnimal : others[i - 1],
      kind: i === 0 ? 'human' : 'open',
      difficulty: 'medium',
      token: i === 0 ? token : null,
      connected: 0,
    }));
    return { session: new Session(id, players, seats, deps, turnTimer), token };
  }

  static fromJSON(d: SessionData, deps: SessionDeps): Session {
    const s = new Session(
      d.id,
      d.players,
      d.seats.map((x) => ({ ...x, connected: 0 })),
      deps,
      d.turnTimer ?? 300,
    );
    s.phase = d.phase;
    s.state = d.state ? fromWire(d.state) : null;
    s.history = d.history.map(fromWire);
    s.version = d.version;
    s.event = d.event;
    s.lastSeen = d.lastSeen;
    s.scheduleAi(AI_DELAY_START_MS);
    return s;
  }

  toJSON(): SessionData {
    return {
      id: this.id,
      players: this.players,
      turnTimer: this.turnTimer,
      phase: this.phase,
      seats: this.seats.map(({ animal, kind, difficulty, token }) => ({ animal, kind, difficulty, token })),
      state: this.state ? toWire(this.state) : null,
      history: this.history.map(toWire),
      version: this.version,
      event: this.event,
      lastSeen: this.lastSeen,
    };
  }

  // ------------------------------------------------------------------ Membership
  /** Resolves a seat for a (re)joining client. Null seat means spectator. */
  join(token?: string): { seat: number | null; token: string | null } {
    if (token) {
      const idx = this.seats.findIndex((s) => s.token === token);
      if (idx >= 0) return { seat: idx, token };
    }
    if (this.phase === 'lobby') {
      const idx = this.seats.findIndex((s) => s.kind === 'open');
      if (idx >= 0) {
        const t = this.deps.token();
        Object.assign(this.seats[idx], { kind: 'human', token: t });
        return { seat: idx, token: t };
      }
    }
    return { seat: null, token: null };
  }

  connect(seat: number | null): void {
    this.lastSeen = this.deps.now();
    if (seat === null) this.spectators++;
    else this.seats[seat].connected++;
  }

  disconnect(seat: number | null): void {
    this.lastSeen = this.deps.now();
    if (seat === null) {
      this.spectators = Math.max(0, this.spectators - 1);
      return;
    }
    const s = this.seats[seat];
    s.connected = Math.max(0, s.connected - 1);
    if (s.connected > 0 || !this.undo) return;
    if (this.undo.by === seat) {
      this.undo = null;
      this.notices.push('Undo request cancelled');
    } else {
      this.resolveUndoIfComplete();
    }
  }

  /** Total live connections, including spectators. */
  connections(): number {
    return this.seats.reduce((n, s) => n + s.connected, this.spectators);
  }

  drainNotices(): string[] {
    const out = this.notices;
    this.notices = [];
    return out;
  }

  // ------------------------------------------------------------------ Lobby
  configureSeat(by: number, seat: number, kind: 'open' | 'ai', difficulty: Difficulty): Result {
    if (by !== HOST_SEAT) return fail('Only the host can change seats');
    if (seat === HOST_SEAT || seat < 0 || seat >= this.seats.length) return fail('Invalid seat');
    if (this.phase === 'finished') return fail('Game is over');
    const s = this.seats[seat];
    if (s.kind === 'human' && s.connected > 0) return fail('Seat is occupied');
    if (this.phase === 'playing') {
      if (kind !== 'ai' || s.kind === 'open') return fail('Only absent players can be replaced by the computer');
    }
    Object.assign(s, { kind, difficulty, token: null });
    if (this.phase === 'playing') {
      this.notices.push('An absent player was replaced by the computer');
      this.resolveUndoIfComplete();
      this.scheduleAi(AI_DELAY_MS);
    }
    return ok;
  }

  start(by: number): Result {
    if (by !== HOST_SEAT) return fail('Only the host can start the game');
    if (this.phase !== 'lobby') return fail('Game already started');
    if (this.seats.some((s) => s.kind === 'open')) return fail('Fill or assign every seat first');
    this.begin();
    return ok;
  }

  rematch(by: number): Result {
    if (by !== HOST_SEAT) return fail('Only the host can start a rematch');
    if (this.phase !== 'finished') return fail('Game is not finished');
    this.begin();
    return ok;
  }

  private begin(): void {
    this.state = createGame(this.players);
    this.history = [];
    this.undo = null;
    this.phase = 'playing';
    this.bump({ type: 'start' });
    this.scheduleAi(AI_DELAY_START_MS);
  }

  // ------------------------------------------------------------------ Play
  act(by: number, action: Action): Result {
    if (this.phase !== 'playing' || !this.state) return fail('Game is not in progress');
    if (this.undo) return fail('Waiting for the undo vote');
    if (this.state.turn !== by || this.seats[by].kind !== 'human') return fail('Not your turn');
    if (!isLegal(this.state, action)) return fail('Illegal move');
    this.apply(by, action);
    return ok;
  }

  private apply(seat: number, action: Action): void {
    const s = this.state!;
    this.history.push(cloneState(s));
    applyAction(s, action);
    if (s.winner !== null) this.phase = 'finished';
    this.bump({ type: 'action', seat, action });
    this.scheduleAi(AI_DELAY_MS);
  }

  private bump(event: GameEvent): void {
    this.version++;
    this.event = event;
    this.lastSeen = this.deps.now();
  }

  private scheduleAi(delay: number): void {
    const s = this.state;
    const due = this.phase === 'playing' && s !== null && this.seats[s.turn].kind === 'ai';
    this.aiAt = due ? this.deps.now() + delay : null;
  }

  // ------------------------------------------------------------------ Undo
  canRequestUndo(seat: number): boolean {
    return (
      this.phase === 'playing' &&
      this.undo === null &&
      this.seats[seat]?.kind === 'human' &&
      this.history.some((h) => h.turn === seat)
    );
  }

  requestUndo(by: number): Result {
    if (!this.canRequestUndo(by)) return fail('Nothing to undo');
    const voters = this.seats
      .map((s, i) => (i !== by && s.kind === 'human' && s.connected > 0 ? i : -1))
      .filter((i) => i >= 0);
    this.undo = { by, voters, accepted: [], expiresAt: this.deps.now() + UNDO_TIMEOUT_MS };
    this.resolveUndoIfComplete();
    return ok;
  }

  voteUndo(by: number, accept: boolean): Result {
    const u = this.undo;
    if (!u || !u.voters.includes(by) || u.accepted.includes(by)) return fail('No undo vote pending');
    if (!accept) {
      this.undo = null;
      this.notices.push('Undo request declined');
      return ok;
    }
    u.accepted.push(by);
    this.resolveUndoIfComplete();
    return ok;
  }

  /** Applies the pending undo once every still-connected human voter accepted. */
  private resolveUndoIfComplete(): void {
    const u = this.undo;
    if (!u) return;
    const waiting = u.voters.filter(
      (v) => !u.accepted.includes(v) && this.seats[v].kind === 'human' && this.seats[v].connected > 0,
    );
    if (waiting.length > 0) return;
    this.undo = null;
    let prev = this.history.pop()!;
    while (prev.turn !== u.by) prev = this.history.pop()!;
    this.state = prev;
    this.bump({ type: 'undo', seat: u.by });
    this.aiAt = null;
  }

  // ------------------------------------------------------------------ Timers
  /** Absolute time of the next pending timer, or null. */
  nextTimer(): number | null {
    if (this.undo) return this.undo.expiresAt;
    return this.aiAt;
  }

  /** Processes due timers. Returns true if the session changed. */
  tick(): boolean {
    const now = this.deps.now();
    if (this.undo) {
      if (now < this.undo.expiresAt) return false;
      this.undo = null;
      this.notices.push('Undo request expired');
      this.scheduleAi(AI_DELAY_MS);
      return true;
    }
    if (this.aiAt === null || now < this.aiAt) return false;
    const s = this.state!;
    const ai = this.deps.ai ?? chooseAction;
    this.apply(s.turn, ai(s, this.seats[s.turn].difficulty));
    return true;
  }

  // ------------------------------------------------------------------ View
  view(): SessionView {
    return {
      id: this.id,
      phase: this.phase,
      players: this.players,
      turnTimer: this.turnTimer,
      hostSeat: HOST_SEAT,
      seats: this.seats.map((s) => ({ animal: s.animal, kind: s.kind, difficulty: s.difficulty, connected: s.connected > 0 })),
      spectators: this.spectators,
      version: this.version,
      state: this.state ? toWire(this.state) : null,
      event: this.event,
      undo: this.undo ? { ...this.undo, voters: [...this.undo.voters], accepted: [...this.undo.accepted] } : null,
      undoable: this.seats.map((_, i) => i).filter((i) => this.canRequestUndo(i)),
    };
  }
}
