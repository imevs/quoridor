import { type Action, type GameState, cloneState } from '../game/rules';
import { ANIMAL_ORDER, type AnimalId } from '../game/animals';
import type { HistoryRecord } from '../game/history';
import { reconstructStates } from '../game/replay';
import type { Seat } from '../ui/Hud';
import type { GameController, Update } from './controller';

export class ReplayController implements GameController {
  readonly kind = 'replay';
  onUpdate: (u: Update) => void = () => {};
  onExit: (message?: string) => void = () => {};

  readonly record: HistoryRecord;
  readonly states: GameState[];
  readonly actions: Action[];
  readonly seats: Seat[];
  private step = 0;
  private isPlaying = false;
  private timer = 0;
  onStepChange: (current: number, total: number, action: Action | null) => void = () => {};

  constructor(record: HistoryRecord) {
    this.record = record;
    this.actions = record.actions ?? [];
    this.states = reconstructStates(record.players, this.actions);

    const animals: AnimalId[] = record.animals && record.animals.length === record.players
      ? record.animals
      : [record.winnerAnimal, ...ANIMAL_ORDER.filter((a) => a !== record.winnerAnimal)].slice(0, record.players);

    this.seats = animals.map((animal) => ({
      animal,
      human: false,
      local: false,
    }));
  }

  get currentStep(): number {
    return this.step;
  }

  get totalSteps(): number {
    return this.actions.length;
  }

  get playing(): boolean {
    return this.isPlaying;
  }

  start(): void {
    this.step = 0;
    this.isPlaying = false;
    window.clearTimeout(this.timer);
    this.onUpdate({ type: 'reset', state: cloneState(this.states[0]), seats: this.seats });
    this.notifyStep();
  }

  jumpTo(targetStep: number): void {
    window.clearTimeout(this.timer);
    const clamped = Math.max(0, Math.min(this.actions.length, targetStep));
    this.step = clamped;
    this.onUpdate({ type: 'sync', state: cloneState(this.states[this.step]) });
    this.notifyStep();
  }

  next(): void {
    if (this.step >= this.actions.length) {
      this.pause();
      return;
    }
    const seat = this.states[this.step].turn;
    const action = this.actions[this.step];
    this.step++;
    this.onUpdate({ type: 'action', seat, action, state: cloneState(this.states[this.step]) });
    this.notifyStep();
  }

  prev(): void {
    this.pause();
    if (this.step > 0) {
      this.jumpTo(this.step - 1);
    }
  }

  first(): void {
    this.pause();
    this.jumpTo(0);
  }

  last(): void {
    this.pause();
    this.jumpTo(this.actions.length);
  }

  play(): void {
    if (this.isPlaying) return;
    if (this.step >= this.actions.length) {
      this.jumpTo(0);
    }
    this.isPlaying = true;
    this.next();
  }

  pause(): void {
    this.isPlaying = false;
    window.clearTimeout(this.timer);
    this.notifyStep();
  }

  togglePlay(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  private notifyStep(): void {
    const action = this.step > 0 ? this.actions[this.step - 1] : null;
    this.onStepChange(this.step, this.actions.length, action);
  }

  submit(_action: Action): void {
    /* Replays are read-only */
  }

  canAct(_state: GameState): boolean {
    return false;
  }

  canUndo(): boolean {
    return false;
  }

  undo(): void {
    this.prev();
  }

  canRematch(): boolean {
    return false;
  }

  rematch(): void {
    this.jumpTo(0);
  }

  viewSeat(state: GameState): number {
    return state.turn;
  }

  idle(): void {
    if (!this.isPlaying) return;
    if (this.step >= this.actions.length) {
      this.pause();
      return;
    }
    this.timer = window.setTimeout(() => {
      if (this.isPlaying) {
        this.next();
      }
    }, 650);
  }

  dispose(): void {
    this.isPlaying = false;
    window.clearTimeout(this.timer);
  }
}
