import './style.css';
import { BoardScene, type CameraPreset, type Pick } from './scene/BoardScene';
import { Hud, type GameConfig, type Seat } from './ui/Hud';
import { ANIMALS } from './game/animals';
import {
  type Action,
  type GameState,
  checkWall,
  legalMoves,
} from './game/rules';
import type { GameController, Update } from './net/controller';
import { LocalController } from './net/LocalController';
import { MatchHistoryManager, type HistoryRecord } from './game/history';
import { ReplayController } from './net/ReplayController';
import { formatActionDescription } from './game/replay';
import { sounds } from './scene/sounds';

class Game {
  private scene: BoardScene;
  private hud = new Hud();
  private controller: GameController | null = null;
  private seats: Seat[] = [];
  private state!: GameState;
  private queue: Update[] = [];
  private processing = false;
  private downAt: { x: number; y: number } | null = null;
  private cameraPreset: CameraPreset = 'seat';
  private movesCount = 0;
  private matchActions: Action[] = [];

  constructor() {
    this.scene = new BoardScene(document.getElementById('stage')!);
  }

  async init(): Promise<void> {
    await this.scene.load((p) => this.hud.setLoading(p));
    this.bindUi();
    this.hud.updateSoundUi(sounds.isEnabled);
    this.hud.hideLoader();

    // Check if entering via an invite link (?game=...)
    const params = new URLSearchParams(window.location.search);
    const joinId = params.get('game');
    if (__ONLINE__ && joinId) {
      void this.startOnline({ join: joinId });
    } else if (LocalController.hasSavedGame()) {
      const savedCfg = LocalController.getSavedConfig() ?? this.hud.readConfig();
      this.startLocal(savedCfg, true);
    } else {
      this.hud.menu.showModal();
    }
  }

  // ------------------------------------------------------------------ Setup
  private bindUi(): void {
    const canvas = this.scene.renderer.domElement;
    canvas.addEventListener('pointermove', (e) => this.onHover(e));
    canvas.addEventListener('pointerdown', (e) => (this.downAt = { x: e.clientX, y: e.clientY }));
    canvas.addEventListener('pointerup', (e) => {
      if (!this.downAt) return;
      const moved = Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y);
      this.downAt = null;
      if (moved < 7) this.onClick(e);
    });
    canvas.addEventListener('pointerleave', () => this.clearPreview());

    this.hud.menu.addEventListener('close', () => {
      if (this.hud.menu.returnValue === 'start') {
        const cfg = this.hud.readConfig();
        if (cfg.mode === 'online' && __ONLINE__) {
          void this.startOnline({ create: { players: cfg.players, animal: cfg.animal } });
        } else {
          this.startLocal(cfg);
        }
      } else if (!this.controller) {
        this.startLocal(this.hud.readConfig());
      }
    });

    this.hud.win.addEventListener('close', () => {
      if (this.hud.win.returnValue === 'again') {
        if (this.controller?.canRematch()) {
          this.controller.rematch();
        }
      } else if (this.hud.win.returnValue === 'menu') {
        this.openMenu();
      }
    });

    document.getElementById('btn-menu')!.addEventListener('click', () => this.openMenu());
    document.getElementById('btn-rules')!.addEventListener('click', () => this.hud.rules.showModal());
    this.hud.cameraBtn.addEventListener('click', () => this.cycleCameraPreset());
    this.hud.soundBtn.addEventListener('click', () => this.toggleSound());
    this.hud.historyBtn.addEventListener('click', () => this.showHistory());
    this.hud.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
    this.hud.movesBtn.addEventListener('click', () => this.showMovesDialog());
    this.hud.winMovesBtn.addEventListener('click', () => this.showMovesDialog());
    this.hud.undoBtn.addEventListener('click', () => this.undo());

    this.hud.historyList.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.btn-replay-match');
      if (!btn) return;
      const id = btn.dataset.id;
      const record = MatchHistoryManager.list().find((r) => r.id === id);
      if (record && record.actions && record.actions.length > 0) {
        this.hud.historyDialog.close();
        this.startReplay(record);
      }
    });

    this.hud.replayPlayBtn.addEventListener('click', () => {
      if (this.controller instanceof ReplayController) this.controller.togglePlay();
    });
    this.hud.replayPrevBtn.addEventListener('click', () => {
      if (this.controller instanceof ReplayController) this.controller.prev();
    });
    this.hud.replayNextBtn.addEventListener('click', () => {
      if (this.controller instanceof ReplayController) this.controller.next();
    });
    this.hud.replayFirstBtn.addEventListener('click', () => {
      if (this.controller instanceof ReplayController) this.controller.first();
    });
    this.hud.replayLastBtn.addEventListener('click', () => {
      if (this.controller instanceof ReplayController) this.controller.last();
    });
    this.hud.replayExitBtn.addEventListener('click', () => this.openMenu());
    this.hud.replayMovesBtn.addEventListener('click', () => this.showMovesDialog());

    window.addEventListener('keydown', (e) => {
      if (document.querySelector('dialog[open]')) return;
      if (this.controller instanceof ReplayController) {
        if (e.key === ' ' || e.code === 'Space') {
          e.preventDefault();
          this.controller.togglePlay();
        } else if (e.key === 'ArrowLeft' || e.key === '[') {
          e.preventDefault();
          this.controller.prev();
        } else if (e.key === 'ArrowRight' || e.key === ']') {
          e.preventDefault();
          this.controller.next();
        } else if (e.key === 'Home') {
          e.preventDefault();
          this.controller.first();
        } else if (e.key === 'End') {
          e.preventDefault();
          this.controller.last();
        } else if (e.key === 'l' || e.key === 'L') {
          this.showMovesDialog();
        } else if (e.key === 'c' || e.key === 'C') {
          this.cycleCameraPreset();
        } else if (e.key === 'm' || e.key === 'M') {
          this.toggleSound();
        } else if (e.key === 'Escape') {
          this.openMenu();
        }
        return;
      }
      if (e.key === 'z' || e.key === 'Z') this.undo();
      else if (e.key === 'c' || e.key === 'C') this.cycleCameraPreset();
      else if (e.key === 'm' || e.key === 'M') this.toggleSound();
      else if (e.key === 'h' || e.key === 'H') this.showHistory();
      else if (e.key === 'l' || e.key === 'L') this.showMovesDialog();
      else if (e.key === 'Escape') this.openMenu();
    });
  }

  private openMenu(): void {
    this.hud.setReplayBarVisible(false);
    LocalController.clearSaved();
    this.controller?.dispose();
    this.controller = null;
    this.queue = [];
    this.processing = false;
    this.clearPreview();
    this.hud.menu.returnValue = '';
    if (!this.hud.menu.open) this.hud.menu.showModal();
  }

  private startLocal(config: GameConfig, restoreExisting = false): void {
    this.hud.setReplayBarVisible(false);
    if (!restoreExisting) {
      LocalController.clearSaved();
      if (config.mode === 'bot_vs_bot') {
        this.cameraPreset = 'iso';
      }
    }
    this.setController(new LocalController(config), restoreExisting);
  }

  private async startOnline(intent: import('./net/OnlineController').OnlineIntent): Promise<void> {
    if (!__ONLINE__) return;
    this.hud.setReplayBarVisible(false);
    const { OnlineController } = await import('./net/OnlineController');
    this.setController(new OnlineController(this.hud, intent));
  }

  private setController(ctrl: GameController, restoreExisting = false): void {
    this.controller?.dispose();
    this.controller = ctrl;
    this.queue = [];
    this.processing = false;

    ctrl.onUpdate = (u) => {
      this.queue.push(u);
      void this.drainQueue();
    };

    ctrl.onExit = (msg) => {
      if (msg) this.hud.toast(msg);
      this.openMenu();
    };

    ctrl.start(restoreExisting);
  }

  // ------------------------------------------------------------------ Queue processing
  private async drainQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const u = this.queue.shift()!;
      await this.applyUpdate(u);
    }

    this.processing = false;
    this.refreshTurnUi();
    this.controller?.idle();
  }

  private async applyUpdate(u: Update): Promise<void> {
    switch (u.type) {
      case 'reset': {
        this.seats = u.seats;
        this.state = u.state;
        this.movesCount = 0;
        this.matchActions = [];
        this.clearPreview();
        this.scene.setupPlayers(this.seats.map((s) => s.animal));
        this.scene.syncState(this.state);
        const focus = this.controller ? this.controller.viewSeat(this.state) : 0;
        void this.scene.setCameraPreset(this.cameraPreset, focus, 1.2);
        this.refreshTurnUi();
        break;
      }
      case 'seats': {
        this.seats = u.seats;
        this.refreshTurnUi();
        break;
      }
      case 'sync': {
        this.state = u.state;
        this.clearPreview();
        this.scene.syncState(this.state);
        this.refreshTurnUi();
        break;
      }
      case 'action': {
        this.clearPreview();
        this.scene.showMoveMarkers([]);
        this.matchActions.push(u.action);
        if (u.action.type === 'move') {
          this.movesCount++;
          await this.scene.animateMove(u.seat, u.action);
        } else {
          await this.scene.animateWall(u.action.wall);
        }
        this.state = u.state;
        this.refreshTurnUi();
        if (this.state.winner !== null) {
          await this.finish(this.state.winner);
        }
        break;
      }
    }
  }

  // ------------------------------------------------------------------ Turn & HUD
  private get currentSeat(): Seat | undefined {
    return this.seats[this.state?.turn];
  }

  private isMyTurn(): boolean {
    return !!this.state && !!this.controller?.canAct(this.state);
  }

  private refreshTurnUi(): void {
    if (!this.state || !this.currentSeat) return;
    const s = this.state;
    const seat = this.currentSeat;
    const a = ANIMALS[seat.animal];

    this.hud.renderPlayers(s, this.seats);
    this.scene.setActiveSeat(s.turn);
    this.updateControls();

    if (s.winner !== null) return;

    if (this.isMyTurn()) {
      const label = this.controller?.kind === 'local' ? `${a.name}'s turn` : 'Your turn';
      this.hud.setTurn(seat, label);
      this.hud.setHint(
        s.players[s.turn].walls > 0
          ? 'Click a tile to move, or hover a groove to place a wall'
          : 'No walls remaining — click a tile to move',
      );
      this.scene.showMoveMarkers(legalMoves(s, s.turn));
      if (this.controller?.kind === 'local' && this.cameraPreset === 'seat') {
        void this.scene.focusSeat(s.turn, 0.9);
      }
    } else {
      const label = !seat.human
        ? `${a.name} is thinking...`
        : seat.away
          ? `${a.name} (Away)`
          : `${a.name}'s turn`;
      this.hud.setTurn(seat, label);
      this.hud.setHint(this.controller?.kind === 'bot_vs_bot' ? 'Spectating bot match · Press C to switch camera' : '');
      this.scene.showMoveMarkers([]);
      this.scene.showGhost(null);
    }
  }

  private updateControls(): void {
    this.hud.undoBtn.disabled = !this.controller?.canUndo() || this.processing;
  }

  private async finish(winner: number): Promise<void> {
    const seat = this.seats[winner];
    this.hud.renderPlayers(this.state, this.seats);
    this.hud.setTurn(seat, `${ANIMALS[seat.animal].name} wins!`);
    this.hud.setHint('');

    const kind = (this.controller?.kind ?? 'ai') as 'ai' | 'local' | 'online' | 'bot_vs_bot';
    MatchHistoryManager.record({
      mode: kind,
      players: (this.state.players.length === 4 ? 4 : 2),
      winner,
      winnerAnimal: seat.animal,
      winnerName: ANIMALS[seat.animal].name,
      movesCount: this.movesCount,
      wallsCount: this.state.wallList.length,
      animals: this.seats.map((s) => s.animal),
      actions: [...this.matchActions],
    });

    await this.scene.celebrate(winner);

    const canRematch = this.controller ? this.controller.canRematch() : false;
    let title = `${ANIMALS[seat.animal].name} wins`;
    let sub = 'Goal line reached.';
    if (kind === 'ai') {
      title = seat.human ? 'You win' : `${ANIMALS[seat.animal].name} wins`;
      sub = seat.human ? 'Goal line reached.' : 'Opponent reached the goal line.';
    } else if (kind === 'bot_vs_bot') {
      title = `${ANIMALS[seat.animal].name} wins!`;
      sub = `Bot ${ANIMALS[seat.animal].name} reached the goal line.`;
    } else if (kind === 'online') {
      title = seat.local ? 'Victory!' : `${ANIMALS[seat.animal].name} wins`;
    }

    this.hud.showWin(seat, title, sub, canRematch);
  }

  private startReplay(record: HistoryRecord): void {
    LocalController.clearSaved();
    this.cameraPreset = 'iso';
    this.hud.setReplayBarVisible(true);
    const ctrl = new ReplayController(record);
    ctrl.onStepChange = (current, total, action) => {
      const seat = action ? this.seats[(current - 1) % this.seats.length] : undefined;
      const desc = action ? formatActionDescription(action, seat?.animal) : 'Starting position';
      this.hud.updateReplayUi(
        `Replay · ${record.winnerName} won`,
        desc,
        current,
        total,
        ctrl.playing,
      );
    };
    this.setController(ctrl);
    this.hud.toast(`Replay loaded (${record.actions?.length ?? 0} moves)`);
  }

  private showMovesDialog(): void {
    sounds.playTick();
    if (this.controller instanceof ReplayController) {
      const ctrl = this.controller;
      this.hud.renderMovesList(ctrl.actions, this.seats, ctrl.currentStep, (step) => {
        ctrl.jumpTo(step);
        this.hud.movesDialog.close();
      });
    } else {
      const onSelect = this.state.winner !== null && this.matchActions.length > 0
        ? (step: number) => {
            const lastRecord = MatchHistoryManager.list()[0];
            if (lastRecord && lastRecord.actions && lastRecord.actions.length > 0) {
              if (this.hud.win.open) this.hud.win.close();
              this.hud.movesDialog.close();
              this.startReplay(lastRecord);
              if (this.controller instanceof ReplayController) {
                this.controller.jumpTo(step);
              }
            }
          }
        : undefined;
      this.hud.renderMovesList(this.matchActions, this.seats, this.matchActions.length, onSelect);
    }
    this.hud.movesDialog.showModal();
  }

  private undo(): void {
    if (this.processing || !this.controller?.canUndo()) return;
    sounds.playWhoosh();
    this.controller.undo();
  }

  private toggleSound(): void {
    const enabled = sounds.toggle();
    this.hud.updateSoundUi(enabled);
    if (enabled) sounds.playTick();
    this.hud.toast(enabled ? 'Sound On' : 'Sound Muted');
  }

  private showHistory(): void {
    sounds.playTick();
    this.hud.renderHistory(MatchHistoryManager.list());
    this.hud.historyDialog.showModal();
  }

  private clearHistory(): void {
    MatchHistoryManager.clear();
    sounds.playTick();
    this.hud.renderHistory([]);
    this.hud.toast('Match history cleared');
  }

  private cycleCameraPreset(): void {
    const next: Record<CameraPreset, CameraPreset> = {
      seat: 'top',
      top: 'iso',
      iso: 'seat',
    };
    this.cameraPreset = next[this.cameraPreset];
    const seat = this.controller ? this.controller.viewSeat(this.state) : 0;
    void this.scene.setCameraPreset(this.cameraPreset, seat, 0.7);

    const labels: Record<CameraPreset, string> = {
      seat: 'Player View',
      top: 'Top-Down View',
      iso: 'Isometric View',
    };
    this.hud.toast(`Camera: ${labels[this.cameraPreset]}`);
  }

  // ------------------------------------------------------------------ Input
  private clearPreview(): void {
    this.scene.showGhost(null);
    this.scene.hoverMarker(null);
    this.scene.renderer.domElement.style.cursor = '';
  }

  private previewFor(pick: Pick): Action | null {
    if (!pick || !this.state) return null;
    if (pick.kind === 'cell') {
      const legal = legalMoves(this.state, this.state.turn).some((m) => m.r === pick.r && m.c === pick.c);
      return legal ? { type: 'move', r: pick.r, c: pick.c } : null;
    }
    return { type: 'wall', wall: pick.wall };
  }

  private onHover(e: PointerEvent): void {
    if (!this.state || !this.isMyTurn() || this.processing || e.buttons !== 0) {
      if (e.buttons === 0) this.clearPreview();
      return;
    }
    const pick = this.scene.pick(e.clientX, e.clientY);
    const action = this.previewFor(pick);
    const canvas = this.scene.renderer.domElement;
    if (action?.type === 'move') {
      this.scene.showGhost(null);
      this.scene.hoverMarker(action);
      canvas.style.cursor = 'pointer';
    } else if (action?.type === 'wall' && this.state.players[this.state.turn].walls > 0) {
      const check = checkWall(this.state, action.wall);
      this.scene.hoverMarker(null);
      this.scene.showGhost(action.wall, check.ok);
      canvas.style.cursor = check.ok ? 'pointer' : 'not-allowed';
    } else {
      this.clearPreview();
    }
  }

  private onClick(e: PointerEvent): void {
    if (!this.state || !this.isMyTurn() || this.processing) return;
    const action = this.previewFor(this.scene.pick(e.clientX, e.clientY));
    if (!action) return;
    if (action.type === 'wall') {
      if (this.state.players[this.state.turn].walls <= 0) return this.hud.toast('No hedges left');
      const check = checkWall(this.state, action.wall);
      if (!check.ok) return this.hud.toast(check.reason);
    }
    this.controller?.submit(action);
  }
}

void new Game().init();
