/**
 * WebSocket protocol shared by the client and the server.
 * Messages are JSON objects discriminated by `type`.
 */
import type { Action } from './rules';
import type { Difficulty } from './ai';
import { ANIMAL_ORDER, type AnimalId } from './animals';
import type { WireState } from './serialize';

export type Phase = 'lobby' | 'playing' | 'finished';
export type SeatKind = 'human' | 'ai' | 'open';

export interface SeatView {
  animal: AnimalId;
  kind: SeatKind;
  difficulty: Difficulty;
  connected: boolean;
}

/** Last state transition, so clients can animate instead of snapping. */
export type GameEvent =
  | { type: 'start' }
  | { type: 'action'; seat: number; action: Action }
  | { type: 'undo'; seat: number };

export interface UndoView {
  by: number;
  voters: number[];
  accepted: number[];
  expiresAt: number;
}

export interface SessionView {
  id: string;
  phase: Phase;
  players: 2 | 4;
  hostSeat: number;
  seats: SeatView[];
  spectators: number;
  /** Increments on every game-state change (start, action, undo, rematch). */
  version: number;
  state: WireState | null;
  event: GameEvent | null;
  undo: UndoView | null;
  /** Seats that may currently request an undo. */
  undoable: number[];
}

export type ClientMsg =
  | { type: 'create'; players: 2 | 4; animal: AnimalId }
  | { type: 'join'; gameId: string; token?: string }
  | { type: 'seat'; seat: number; kind: 'open' | 'ai'; difficulty: Difficulty }
  | { type: 'start' }
  | { type: 'action'; action: Action }
  | { type: 'undo' }
  | { type: 'vote'; accept: boolean }
  | { type: 'rematch' };

export type ServerMsg =
  | { type: 'welcome'; gameId: string; token: string | null; seat: number | null }
  | { type: 'snapshot'; view: SessionView }
  | { type: 'notice'; message: string }
  | { type: 'error'; message: string; fatal?: boolean };

export const MAX_MESSAGE_BYTES = 4096;

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'];
const GAME_ID_RE = /^[A-Za-z0-9_-]{4,32}$/;
const TOKEN_RE = /^[A-Za-z0-9_-]{8,64}$/;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

export function isGameId(v: unknown): v is string {
  return typeof v === 'string' && GAME_ID_RE.test(v);
}

export function parseAction(v: unknown): Action | null {
  if (!isObj(v)) return null;
  if (v.type === 'move') {
    return isInt(v.r, 0, 8) && isInt(v.c, 0, 8) ? { type: 'move', r: v.r, c: v.c } : null;
  }
  if (v.type === 'wall' && isObj(v.wall)) {
    const w = v.wall;
    if (isInt(w.r, 0, 7) && isInt(w.c, 0, 7) && (w.o === 'h' || w.o === 'v')) {
      return { type: 'wall', wall: { r: w.r, c: w.c, o: w.o } };
    }
  }
  return null;
}

/** Validates an untrusted client message. Returns null if malformed. */
export function parseClientMessage(raw: string): ClientMsg | null {
  if (raw.length > MAX_MESSAGE_BYTES) return null;
  let m: unknown;
  try {
    m = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(m)) return null;
  switch (m.type) {
    case 'create':
      if ((m.players === 2 || m.players === 4) && ANIMAL_ORDER.includes(m.animal as AnimalId)) {
        return { type: 'create', players: m.players, animal: m.animal as AnimalId };
      }
      return null;
    case 'join':
      if (!isGameId(m.gameId)) return null;
      if (m.token === undefined) return { type: 'join', gameId: m.gameId };
      return typeof m.token === 'string' && TOKEN_RE.test(m.token) ? { type: 'join', gameId: m.gameId, token: m.token } : null;
    case 'seat':
      if (isInt(m.seat, 0, 3) && (m.kind === 'open' || m.kind === 'ai') && DIFFICULTIES.includes(m.difficulty as Difficulty)) {
        return { type: 'seat', seat: m.seat, kind: m.kind, difficulty: m.difficulty as Difficulty };
      }
      return null;
    case 'action': {
      const action = parseAction(m.action);
      return action ? { type: 'action', action } : null;
    }
    case 'vote':
      return typeof m.accept === 'boolean' ? { type: 'vote', accept: m.accept } : null;
    case 'start':
    case 'undo':
    case 'rematch':
      return { type: m.type };
    default:
      return null;
  }
}
