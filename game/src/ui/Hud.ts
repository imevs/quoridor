import { render, h } from 'preact';
import { HudApp } from './components/HudApp';
import { hudStore, type PlayerCardItem } from './hudStore';
import type { AnimalId } from '../game/animals';
import type { Difficulty } from '../game/ai';
import { type Action, type GameState, shortestPath } from '../game/rules';
import type { HistoryRecord } from '../game/history';

export interface Seat {
  animal: AnimalId;
  human: boolean;
  /** Controlled from this client. */
  local: boolean;
  /** Remote human who is currently disconnected. */
  away?: boolean;
}

export type GameMode = 'ai' | 'local' | 'online' | 'p2p' | 'bot_vs_bot';

export interface GameConfig {
  mode: GameMode;
  players: 2 | 4;
  difficulty: Difficulty;
  animal: AnimalId;
  turnTimer?: number;
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const STORAGE_KEY = 'quoridors.config';

function getEl<T extends HTMLElement>(id: string): T {
  return (document.getElementById(id) as T) ?? (document.createElement('div') as unknown as T);
}

export class Hud {
  private toastTimer = 0;
  private tappedSeat: number | null = null;

  constructor() {
    const root = document.getElementById('hud-root');
    if (root) {
      render(h(HudApp, null), root);
    }
    this.restoreConfig();
  }

  // ---------------------------------------------------------------- DOM Accessors
  get menu(): HTMLDialogElement {
    return getEl<HTMLDialogElement>('menu-dialog');
  }

  get rules(): HTMLDialogElement {
    return getEl<HTMLDialogElement>('rules-dialog');
  }

  get win(): HTMLDialogElement {
    return getEl<HTMLDialogElement>('win-dialog');
  }

  get historyDialog(): HTMLDialogElement {
    return getEl<HTMLDialogElement>('history-dialog');
  }

  get movesDialog(): HTMLDialogElement {
    return getEl<HTMLDialogElement>('moves-dialog');
  }

  get hintBtn(): HTMLButtonElement {
    return getEl<HTMLButtonElement>('btn-hint');
  }

  get undoBtn(): HTMLButtonElement {
    return getEl<HTMLButtonElement>('btn-undo');
  }

  get cameraBtn(): HTMLButtonElement {
    return getEl<HTMLButtonElement>('btn-camera');
  }

  get soundBtn(): HTMLButtonElement {
    return getEl<HTMLButtonElement>('btn-sound');
  }

  get historyBtn(): HTMLButtonElement {
    return getEl<HTMLButtonElement>('btn-history');
  }

  get clearHistoryBtn(): HTMLButtonElement {
    return getEl<HTMLButtonElement>('btn-clear-history');
  }

  get movesBtn(): HTMLButtonElement {
    return getEl<HTMLButtonElement>('btn-moves');
  }

  get winMovesBtn(): HTMLButtonElement {
    return getEl<HTMLButtonElement>('btn-win-moves');
  }

  get replayMovesBtn(): HTMLButtonElement {
    return getEl<HTMLButtonElement>('btn-replay-moves');
  }

  get stopBotsBtn(): HTMLButtonElement {
    return getEl<HTMLButtonElement>('btn-stop-bots');
  }

  get menuStopBtn(): HTMLButtonElement {
    return getEl<HTMLButtonElement>('btn-menu-stop');
  }

  get hintEl(): HTMLElement {
    return getEl<HTMLElement>('hint');
  }

  get historyList(): HTMLElement {
    return getEl<HTMLElement>('history-list');
  }

  get replayPlayBtn(): HTMLButtonElement {
    return getEl<HTMLButtonElement>('btn-replay-play');
  }

  get replayPrevBtn(): HTMLButtonElement {
    return getEl<HTMLButtonElement>('btn-replay-prev');
  }

  get replayNextBtn(): HTMLButtonElement {
    return getEl<HTMLButtonElement>('btn-replay-next');
  }

  get replayFirstBtn(): HTMLButtonElement {
    return getEl<HTMLButtonElement>('btn-replay-first');
  }

  get replayLastBtn(): HTMLButtonElement {
    return getEl<HTMLButtonElement>('btn-replay-last');
  }

  get replayExitBtn(): HTMLButtonElement {
    return getEl<HTMLButtonElement>('btn-replay-exit');
  }

  // ---------------------------------------------------------------- Loader
  setLoading(p: number): void {
    hudStore.loadingProgress.value = p;
  }

  hideLoader(): void {
    hudStore.loadingDone.value = true;
  }

  // ---------------------------------------------------------------- Config
  readConfig(): GameConfig {
    return hudStore.gameConfig.value;
  }

  private restoreConfig(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const cfg = JSON.parse(raw) as GameConfig;
      if (cfg) {
        hudStore.gameConfig.value = {
          ...hudStore.gameConfig.value,
          ...cfg,
          mode: cfg.mode === 'online' && !__ONLINE__ ? 'ai' : cfg.mode,
        };
      }
    } catch {
      /* ignore */
    }
  }

  // ---------------------------------------------------------------- Turn & Players
  renderPlayers(state: GameState, seats: Seat[], clocks: number[] = [], initialClock = 0): void {
    const wallsMax = seats.length === 2 ? 10 : 5;
    const items: PlayerCardItem[] = state.players.map((p, i) => {
      const seat = seats[i];
      const steps = shortestPath(state, i);
      const clockVal = clocks[i];
      return {
        seat,
        index: i,
        wallsLeft: p.walls,
        wallsMax,
        steps,
        clockVal,
        initialClock,
        isTurn: state.turn === i && state.winner === null,
        isAway: Boolean(seat?.away),
      };
    });
    hudStore.playersList.value = items;
  }

  setTurn(seat: Seat, label: string): void {
    hudStore.turnState.value = { seat, label, pop: true };
  }

  updatePlayerClock(seat: number, remaining: number, initialClock: number): void {
    if (initialClock <= 0) return;
    const list = [...hudStore.playersList.value];
    if (list[seat]) {
      list[seat] = { ...list[seat], clockVal: remaining };
      hudStore.playersList.value = list;
    }
  }

  updateTurnTimer(secondsRemaining: number, maxSeconds: number): void {
    if (maxSeconds <= 0) {
      hudStore.turnTimer.value = { ...hudStore.turnTimer.value, visible: false };
      return;
    }
    hudStore.turnTimer.value = {
      remaining: secondsRemaining,
      initial: maxSeconds,
      visible: true,
      urgent: secondsRemaining <= 15.1 && secondsRemaining > 0,
    };
  }

  hideTurnTimer(): void {
    hudStore.turnTimer.value = { ...hudStore.turnTimer.value, visible: false, urgent: false };
  }

  setHint(content: string, isHtml = false): void {
    hudStore.hintState.value = {
      html: isHtml ? content : content ? `<span>${content}</span>` : '',
      active: hudStore.hintState.value.active,
    };
  }

  bindPlayerHover(onHover: (seat: number | null) => void): void {
    hudStore.callbacks.onHoverSeat = onHover;
    hudStore.callbacks.onTapSeat = (seat) => {
      if (this.tappedSeat === seat) {
        this.tappedSeat = null;
        hudStore.pinnedSeat.value = null;
        onHover(null);
      } else {
        this.tappedSeat = seat;
        hudStore.pinnedSeat.value = seat;
        onHover(seat);
      }
    };
    document.addEventListener('pointerdown', (e) => {
      if (this.tappedSeat !== null) {
        const target = e.target as HTMLElement;
        if (!target.closest('#players') && !target.closest('#destination-pill')) {
          this.tappedSeat = null;
          hudStore.pinnedSeat.value = null;
          onHover(null);
        }
      }
    });
  }

  get isDestinationPinned(): boolean {
    return this.tappedSeat !== null;
  }

  showDestination(seat: Seat, seatIndex: number, title: string, desc: string): void {
    hudStore.pinnedSeat.value = seatIndex;
    hudStore.destinationState.value = {
      seat,
      index: seatIndex,
      title,
      desc,
      pinned: this.isDestinationPinned,
    };
  }

  hideDestination(): void {
    this.tappedSeat = null;
    hudStore.pinnedSeat.value = null;
    hudStore.destinationState.value = null;
  }

  toast(msg: string): void {
    hudStore.toastState.value = { message: msg, visible: true };
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      hudStore.toastState.value = { message: '', visible: false };
    }, 1800);
  }

  showWin(seat: Seat, title: string, sub: string, canPlayAgain: boolean): void {
    hudStore.winData.value = { seat, title, sub, canRematch: canPlayAgain };
    hudStore.winOpen.value = true;
  }

  updateSoundUi(enabled: boolean): void {
    hudStore.soundEnabled.value = enabled;
  }

  renderHistory(records: HistoryRecord[]): void {
    hudStore.historyRecords.value = records;
  }

  setBotMatchActive(active: boolean, paused = false): void {
    hudStore.botMatchActive.value = active;
    hudStore.botMatchPaused.value = paused;
  }

  updateBotMatchPaused(paused: boolean): void {
    hudStore.botMatchPaused.value = paused;
  }

  setReplayBarVisible(visible: boolean): void {
    hudStore.replayState.value = { ...hudStore.replayState.value, visible };
  }

  updateReplayUi(title: string, desc: string, step: number, total: number, isPlaying: boolean): void {
    hudStore.replayState.value = {
      visible: true,
      title,
      desc,
      current: step,
      total,
      playing: isPlaying,
    };
  }

  renderMovesList(actions: Action[], seats: Seat[], activeIndex: number, onSelect?: (idx: number) => void): void {
    hudStore.movesData.value = { actions, seats, currentStep: activeIndex, onSelect };
  }

  setNet(text: string | null, tone: 'ok' | 'warn' = 'ok'): void {
    hudStore.netStatus.value = { text: text ?? '', tone, visible: text !== null };
  }

  showUndo(text: string | null, _canVote = false): void {
    hudStore.undoBanner.value = { text: text ?? '', visible: text !== null };
  }
}
