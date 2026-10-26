import { ANIMAL_ORDER } from '../game/animals';
import { chooseAction } from '../game/ai';
import { type Action, type GameState, applyAction, cloneState, createGame, isLegal } from '../game/rules';
import { fromWire, toWire, type WireState } from '../game/serialize';
import type { GameConfig, Seat } from '../ui/Hud';
import type { GameController, Update } from './controller';
import type { AiWorkerRequest, AiWorkerResponse } from '../worker/ai.worker';

const AI_THINK_MS = 550;
export const LOCAL_STORAGE_KEY = 'quoridors.offline_game';

export interface LocalSavedGame {
  config: GameConfig;
  seats: Seat[];
  state: WireState;
  history: WireState[];
  actions?: Action[];
  clocks?: number[];
}

/** Offline play: vs computer or pass & play, with the rules engine in-process and localStorage persistence. */
export class LocalController implements GameController {
  readonly kind: 'ai' | 'local' | 'bot_vs_bot';
  paused = false;
  getClocks?: () => number[];
  onUpdate: (u: Update) => void = () => {};
  onExit: (message?: string) => void = () => {};
  private config: GameConfig;
  private seats: Seat[] = [];
  private state!: GameState;
  private history: GameState[] = [];
  private actions: Action[] = [];
  private timer = 0;
  private worker: Worker | null = null;
  private reqId = 0;

  constructor(config: GameConfig) {
    this.config = config;
    this.kind = config.mode === 'local' ? 'local' : config.mode === 'bot_vs_bot' ? 'bot_vs_bot' : 'ai';
    if (typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(new URL('../worker/ai.worker.ts', import.meta.url), { type: 'module' });
        this.worker.onmessage = (e: MessageEvent<AiWorkerResponse>) => {
          if (e.data.id === this.reqId) {
            this.submit(e.data.action);
          }
        };
      } catch {
        /* fallback to synchronous chooseAction */
      }
    }
  }

  static hasSavedGame(): boolean {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as LocalSavedGame;
      return !!parsed && !!parsed.state && parsed.state.winner === null;
    } catch {
      return false;
    }
  }

  static getSavedConfig(): GameConfig | null {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as LocalSavedGame;
      return parsed.config ?? null;
    } catch {
      return null;
    }
  }

  static clearSaved(): void {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  static updateSavedClocks(clocks: number[]): void {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as LocalSavedGame;
      if (parsed && parsed.state && parsed.state.winner === null) {
        parsed.clocks = [...clocks];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
      }
    } catch {
      /* ignore */
    }
  }

  start(restoreExisting = false): void {
    this.paused = false;
    clearTimeout(this.timer);

    if (restoreExisting) {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as LocalSavedGame;
          if (parsed && parsed.state && parsed.state.winner === null) {
            this.config = parsed.config;
            this.seats = parsed.seats;
            this.state = fromWire(parsed.state);
            this.history = (parsed.history || []).map(fromWire);
            this.actions = parsed.actions ?? [];
            const turnTimer = typeof this.config.turnTimer === 'number' ? this.config.turnTimer : 300;
            this.onUpdate({
              type: 'reset',
              state: cloneState(this.state),
              seats: this.seats,
              actions: [...this.actions],
              turnTimer,
              clocks: parsed.clocks,
            });
            return;
          }
        }
      } catch {
        /* fallback to new game */
      }
    }

    const { animal, players } = this.config;
    const others = ANIMAL_ORDER.filter((a) => a !== animal);
    this.seats = Array.from({ length: players }, (_, i) => {
      const human = this.kind === 'local' || (this.kind === 'ai' && i === 0);
      return { animal: i === 0 ? animal : others[i - 1], human, local: human };
    });
    this.state = createGame(players);
    this.history = [];
    this.actions = [];
    this.persist();
    const turnTimer = typeof this.config.turnTimer === 'number' ? this.config.turnTimer : 300;
    this.onUpdate({ type: 'reset', state: cloneState(this.state), seats: this.seats, actions: [], turnTimer });
  }

  private persist(): void {
    try {
      if (this.state.winner !== null) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        return;
      }
      const data: LocalSavedGame = {
        config: this.config,
        seats: this.seats,
        state: toWire(this.state),
        history: this.history.map(toWire),
        actions: this.actions,
        clocks: this.getClocks ? this.getClocks() : undefined,
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignore storage quota or private browsing errors */
    }
  }

  submit(action: Action): void {
    if (!isLegal(this.state, action)) return;
    const seat = this.state.turn;
    this.history.push(cloneState(this.state));
    this.actions.push(action);
    applyAction(this.state, action);
    this.persist();
    this.onUpdate({ type: 'action', seat, action, state: cloneState(this.state) });
  }

  canAct(s: GameState): boolean {
    return s.winner === null && this.seats[s.turn].local;
  }

  canUndo(): boolean {
    return this.history.length > 0;
  }

  undo(): void {
    if (this.history.length === 0) return;
    clearTimeout(this.timer);
    this.reqId++;
    let prev = this.history.pop()!;
    this.actions.pop();
    // Against the computer, rewind to the human's previous turn
    if (this.kind === 'ai') {
      while (!this.seats[prev.turn].human && this.history.length > 0) {
        prev = this.history.pop()!;
        this.actions.pop();
      }
    }
    this.state = prev;
    this.persist();
    this.onUpdate({ type: 'sync', state: cloneState(prev) });
  }

  canRematch(): boolean {
    return true;
  }

  rematch(): void {
    this.start(false);
  }

  viewSeat(s: GameState): number {
    return this.kind === 'local' ? s.turn : 0;
  }

  pause(): void {
    this.paused = true;
    clearTimeout(this.timer);
    this.reqId++;
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.idle();
  }

  idle(): void {
    clearTimeout(this.timer);
    const s = this.state;
    if (s.winner !== null || this.seats[s.turn].human || this.paused) return;

    this.timer = setTimeout(() => {
      if (this.worker) {
        const id = ++this.reqId;
        this.worker.postMessage({ id, state: cloneState(this.state), difficulty: this.config.difficulty } satisfies AiWorkerRequest);
      } else {
        this.submit(chooseAction(this.state, this.config.difficulty));
      }
    }, AI_THINK_MS) as unknown as number;
  }

  dispose(): void {
    this.paused = false;
    clearTimeout(this.timer);
    this.reqId++;
    this.worker?.terminate();
    this.worker = null;
  }
}
