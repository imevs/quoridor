import type { Hud, Seat } from './Hud';
import type { Action, GameState } from '../game/rules';
import type { GameController } from '../net/controller';
import { ReplayController } from '../net/ReplayController';
import { MatchHistoryManager, type HistoryRecord } from '../game/history';
import { sounds } from '../scene/sounds';
import { hudStore } from './hudStore';

export interface DialogCoordinatorDelegate {
  getState: () => GameState | null;
  getSeats: () => Seat[];
  getMatchActions: () => Action[];
  getController: () => GameController | null;
  startReplay: (record: HistoryRecord) => void;
  openMenu: () => void;
  onRematch: () => void;
}

export interface DialogCoordinatorOptions {
  hud: Hud;
  delegate: DialogCoordinatorDelegate;
}

/**
 * Manages modal dialogs (Rules, Moves List, Match History, Win Dialog)
 * and Replay playback controls.
 */
export class DialogCoordinator {
  private hud: Hud;
  private delegate: DialogCoordinatorDelegate;

  constructor(options: DialogCoordinatorOptions) {
    this.hud = options.hud;
    this.delegate = options.delegate;
    this.bindEvents();
  }

  private bindEvents(): void {
    document.getElementById('btn-menu')?.addEventListener('click', () => this.delegate.openMenu());
    document.getElementById('btn-rules')?.addEventListener('click', () => this.hud.rules.showModal());

    this.hud.historyBtn.addEventListener('click', () => this.showHistory());
    this.hud.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
    this.hud.movesBtn.addEventListener('click', () => this.showMovesDialog());
    this.hud.winMovesBtn.addEventListener('click', () => this.showMovesDialog());
    this.hud.replayMovesBtn.addEventListener('click', () => this.showMovesDialog());

    hudStore.callbacks.onStartReplay = (record) => this.delegate.startReplay(record);
    hudStore.callbacks.onClearHistory = () => this.clearHistory();
    hudStore.callbacks.onRematch = () => this.delegate.onRematch();
    hudStore.callbacks.onMenuFromWin = () => this.delegate.openMenu();

    this.hud.win.addEventListener('close', () => {
      if (this.hud.win.returnValue === 'again') {
        this.delegate.onRematch();
      } else if (this.hud.win.returnValue === 'menu') {
        this.delegate.openMenu();
      }
    });

    this.hud.historyList.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.btn-replay-match');
      if (!btn) return;
      const id = btn.dataset.id;
      const record = MatchHistoryManager.list().find((r) => r.id === id);
      if (record && record.actions && record.actions.length > 0) {
        this.hud.historyDialog.close();
        this.delegate.startReplay(record);
      }
    });

    this.hud.replayPlayBtn.addEventListener('click', () => this.toggleReplayPlay());
    this.hud.replayPrevBtn.addEventListener('click', () => this.replayPrev());
    this.hud.replayNextBtn.addEventListener('click', () => this.replayNext());
    this.hud.replayFirstBtn.addEventListener('click', () => this.replayFirst());
    this.hud.replayLastBtn.addEventListener('click', () => this.replayLast());
    this.hud.replayExitBtn.addEventListener('click', () => this.exitReplay());
  }

  showHistory(): void {
    sounds.playTick();
    this.hud.renderHistory(MatchHistoryManager.list());
    this.hud.historyDialog.showModal();
  }

  clearHistory(): void {
    MatchHistoryManager.clear();
    sounds.playTick();
    this.hud.renderHistory([]);
    this.hud.toast('Match history cleared');
  }

  showMovesDialog(): void {
    sounds.playTick();
    const ctrl = this.delegate.getController();
    const seats = this.delegate.getSeats();

    if (ctrl instanceof ReplayController) {
      this.hud.renderMovesList(ctrl.actions, seats, ctrl.currentStep, (step) => {
        ctrl.jumpTo(step);
        this.hud.movesDialog.close();
      });
    } else {
      const state = this.delegate.getState();
      const matchActions = this.delegate.getMatchActions();
      const onSelect = state?.winner !== null && matchActions.length > 0
        ? (step: number) => {
            const lastRecord = MatchHistoryManager.list()[0];
            if (lastRecord && lastRecord.actions && lastRecord.actions.length > 0) {
              if (this.hud.win.open) this.hud.win.close();
              this.hud.movesDialog.close();
              this.delegate.startReplay(lastRecord);
              const activeCtrl = this.delegate.getController();
              if (activeCtrl instanceof ReplayController) {
                activeCtrl.jumpTo(step);
              }
            }
          }
        : undefined;

      this.hud.renderMovesList(matchActions, seats, matchActions.length, onSelect);
    }
    this.hud.movesDialog.showModal();
  }

  toggleReplayPlay(): void {
    const ctrl = this.delegate.getController();
    if (ctrl instanceof ReplayController) ctrl.togglePlay();
  }

  replayPrev(): void {
    const ctrl = this.delegate.getController();
    if (ctrl instanceof ReplayController) ctrl.prev();
  }

  replayNext(): void {
    const ctrl = this.delegate.getController();
    if (ctrl instanceof ReplayController) ctrl.next();
  }

  replayFirst(): void {
    const ctrl = this.delegate.getController();
    if (ctrl instanceof ReplayController) ctrl.first();
  }

  replayLast(): void {
    const ctrl = this.delegate.getController();
    if (ctrl instanceof ReplayController) ctrl.last();
  }

  exitReplay(): void {
    const ctrl = this.delegate.getController();
    ctrl?.dispose();
    this.delegate.openMenu();
  }
}
