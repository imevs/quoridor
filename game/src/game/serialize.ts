/**
 * JSON-safe representation of GameState, used on the wire and for persistence.
 * The wall occupancy grids are Uint8Arrays in memory and plain arrays here.
 */
import { type GameState, type PlayerState, type Wall, W } from './rules';

export interface WireState {
  players: PlayerState[];
  h: number[];
  v: number[];
  wallList: Wall[];
  turn: number;
  winner: number | null;
}

export function toWire(s: GameState): WireState {
  return {
    players: s.players.map((p) => ({ ...p, goal: { ...p.goal } })),
    h: Array.from(s.h),
    v: Array.from(s.v),
    wallList: s.wallList.map((w) => ({ ...w })),
    turn: s.turn,
    winner: s.winner,
  };
}

export function fromWire(w: WireState): GameState {
  const grid = (src: number[]) => {
    const out = new Uint8Array(W * W);
    out.set(src.slice(0, W * W));
    return out;
  };
  return {
    players: w.players.map((p) => ({ ...p, goal: { ...p.goal } })),
    h: grid(w.h),
    v: grid(w.v),
    wallList: w.wallList.map((x) => ({ ...x })),
    turn: w.turn,
    winner: w.winner,
  };
}
