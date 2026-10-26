import { type GameState, shortestPath } from './rules';

export interface ClockTickResult {
  seat: number;
  remaining: number;
  wholeSecond: number;
  isUrgent: boolean;
  beepSecond?: number;
  isExpired: boolean;
}

/**
 * Headless, deterministic decision timer (chess clock) state manager.
 * Tracks per-player time banks, moves history for undo, and countdown ticks.
 */
export class ChessClock {
  private initial: number;
  private clocks: number[];
  private history: number[][];
  private activeTurn: number | null;
  private lastBeepSecond: number;

  constructor(initialSeconds = 300, playerCount = 2) {
    this.initial = Math.max(0, initialSeconds);
    this.clocks = Array.from({ length: Math.max(1, playerCount) }, () => this.initial);
    this.history = [];
    this.activeTurn = null;
    this.lastBeepSecond = -1;
  }

  get isEnabled(): boolean {
    return this.initial > 0;
  }

  get initialSeconds(): number {
    return this.initial;
  }

  get remaining(): number[] {
    return [...this.clocks];
  }

  get activeSeat(): number | null {
    return this.activeTurn;
  }

  getTime(seat: number): number {
    return this.clocks[seat] ?? this.initial;
  }

  reset(playerCount: number, initialSeconds: number): void {
    this.initial = Math.max(0, initialSeconds);
    this.clocks = Array.from({ length: Math.max(1, playerCount) }, () => this.initial);
    this.history = [];
    this.activeTurn = null;
    this.lastBeepSecond = -1;
  }

  restore(remaining: number[], initialSeconds?: number): void {
    if (initialSeconds !== undefined) {
      this.initial = Math.max(0, initialSeconds);
    }
    this.clocks = remaining.map((c) => Math.max(0, c));
  }

  startTurn(turn: number): void {
    if (turn < 0 || turn >= this.clocks.length) return;
    this.activeTurn = turn;
    this.lastBeepSecond = -1;
  }

  stopTurn(): void {
    this.activeTurn = null;
  }

  recordMove(): void {
    this.history.push([...this.clocks]);
  }

  undo(steps = 1): number[] {
    for (let i = 0; i < steps && this.history.length > 0; i++) {
      this.clocks = this.history.pop()!;
    }
    return [...this.clocks];
  }

  tick(dt: number): ClockTickResult | null {
    if (this.activeTurn === null || this.initial <= 0) return null;
    const seat = this.activeTurn;
    const current = this.clocks[seat] ?? this.initial;
    const remaining = Math.max(0, current - Math.max(0, dt));
    this.clocks[seat] = remaining;

    const wholeSecond = Math.ceil(remaining);
    let beepSecond: number | undefined;
    if (wholeSecond <= 10 && wholeSecond > 0 && wholeSecond !== this.lastBeepSecond) {
      this.lastBeepSecond = wholeSecond;
      beepSecond = wholeSecond;
    }

    return {
      seat,
      remaining,
      wholeSecond,
      isUrgent: remaining <= 15.1 && remaining > 0,
      beepSecond,
      isExpired: remaining <= 0,
    };
  }
}

/**
 * Calculates the winner when a player runs out of time on their decision clock.
 * For 2-player games, the remaining player wins immediately.
 * For 4-player games, the player closest to their goal line wins.
 */
export function resolveTimeoutWinner(state: GameState, timedOutTurn: number): number {
  if (state.players.length === 2) {
    return 1 - timedOutTurn;
  }

  let bestDist = Infinity;
  let winner = -1;
  for (let i = 0; i < state.players.length; i++) {
    if (i === timedOutTurn) continue;
    const d = shortestPath(state, i);
    if (d < bestDist) {
      bestDist = d;
      winner = i;
    }
  }

  return winner !== -1 ? winner : (timedOutTurn + 1) % state.players.length;
}
