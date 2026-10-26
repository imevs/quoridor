import { ChessClock, resolveTimeoutWinner } from '../game/clock';
import type { GameState } from '../game/rules';
import type { Hud, Seat } from './Hud';
import { ANIMALS } from '../game/animals';
import { sounds } from '../scene/sounds';

export interface ClockCoordinatorDelegate {
  getState: () => GameState | null;
  getSeats: () => Seat[];
  isPaused: () => boolean;
  onTimeout: (winner: number, timedOutSeat: number) => void;
  onTickSecond?: (clocks: number[]) => void;
}

/**
 * Coordinates turn timer intervals, tick updates, sound alerts,
 * pause checks, and timeout forfeits.
 */
export class ClockCoordinator {
  private clock: ChessClock;
  private hud: Hud;
  private delegate: ClockCoordinatorDelegate;
  private timerId: number | null = null;
  private lastTime = 0;
  private lastWholeSecond = -1;

  constructor(hud: Hud, delegate: ClockCoordinatorDelegate, initialSeconds = 300, increment = 2) {
    this.hud = hud;
    this.delegate = delegate;
    this.clock = new ChessClock(initialSeconds, increment);
  }

  get isEnabled(): boolean {
    return this.clock.isEnabled;
  }

  get remaining(): number[] {
    return this.clock.remaining;
  }

  get initialSeconds(): number {
    return this.clock.initialSeconds;
  }

  reset(playerCount: number, initialSeconds?: number, remaining?: number[]): void {
    this.stop();
    this.clock.reset(playerCount, initialSeconds ?? this.clock.initialSeconds);
    if (remaining && remaining.length === playerCount) {
      this.clock.restore(remaining, initialSeconds);
    }
  }

  restore(remaining: number[], initialSeconds?: number): void {
    this.stop();
    this.clock.restore(remaining, initialSeconds);
  }

  recordMove(): void {
    this.clock.recordMove();
  }

  undo(steps: number): void {
    this.stop();
    this.clock.undo(steps);
  }

  start(turn: number): void {
    this.stop();
    if (!this.clock.isEnabled) {
      this.hud.hideTurnTimer();
      return;
    }

    const state = this.delegate.getState();
    if (!state || state.winner !== null) {
      this.hud.hideTurnTimer();
      return;
    }

    this.clock.startTurn(turn);
    this.lastTime = performance.now();
    const currentRemaining = this.clock.getTime(turn);
    this.hud.updateTurnTimer(currentRemaining, this.clock.initialSeconds);
    this.hud.updatePlayerClock(turn, currentRemaining, this.clock.initialSeconds);

    this.timerId = window.setInterval(() => {
      const s = this.delegate.getState();
      if (!s || s.winner !== null) {
        this.stop();
        this.hud.hideTurnTimer();
        return;
      }

      const now = performance.now();
      const dt = (now - this.lastTime) / 1000;
      this.lastTime = now;

      if (document.querySelector('dialog[open]')) return;
      if (this.delegate.isPaused()) return;

      const tick = this.clock.tick(dt);
      if (!tick) return;

      this.hud.updateTurnTimer(tick.remaining, this.clock.initialSeconds);
      this.hud.updatePlayerClock(tick.seat, tick.remaining, this.clock.initialSeconds);

      if (tick.beepSecond !== undefined) {
        sounds.playCountdown(tick.beepSecond <= 3);
      }

      if (this.lastWholeSecond !== tick.wholeSecond) {
        this.lastWholeSecond = tick.wholeSecond;
        this.delegate.onTickSecond?.(this.clock.remaining);
      }

      if (tick.isExpired) {
        this.stop();
        this.handleExpired(tick.seat);
      }
    }, 100);
  }

  stop(): void {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    this.clock.stopTurn();
  }

  private handleExpired(timedOutTurn: number): void {
    const state = this.delegate.getState();
    if (!state || state.winner !== null) return;
    sounds.playCountdown(true);
    const seats = this.delegate.getSeats();
    const timedOutSeat = seats[timedOutTurn];
    const timedOutAnimalName = timedOutSeat ? ANIMALS[timedOutSeat.animal].name : `Player ${timedOutTurn + 1}`;
    this.hud.toast(`⏰ ${timedOutAnimalName} ran out of time!`);

    const winner = resolveTimeoutWinner(state, timedOutTurn);
    this.delegate.onTimeout(winner, timedOutTurn);
  }
}
