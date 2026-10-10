import './style.css';
import { BoardScene, type CameraPreset, type Pick } from './scene/BoardScene';
import { Hud, type GameConfig, type Seat } from './ui/Hud';
import { ANIMALS } from './game/animals';
import { chooseAction } from './game/ai';
import {
  type Action,
  type GameState,
  applyAction,
  checkWall,
  cloneState,
  formatGoalDescription,
  legalMoves,
  shortestPath,
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
  private hoveredAnimalSeat: number | null = null;
  private currentHintAction: Action | null = null;
  private clockInitial = 300;
  private playerClocks: number[] = [];
  private clockTimerId: number | null = null;
  private clockLastTime = 0;
  private lastBeepSecond = -1;
  private clockHistory: number[][] = [];

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
      const threshold = e.pointerType === 'touch' ? 14 : 7;
      if (moved < threshold) this.onClick(e);
    });
    canvas.addEventListener('pointerleave', () => {
      this.clearPreview();
      this.clearAnimalDestination();
    });

    this.hud.bindPlayerHover((seat) => {
      if (seat !== null) {
        this.showAnimalDestination(seat);
      } else {
        this.clearAnimalDestination();
      }
    });

    this.hud.menu.addEventListener('close', () => {
      if (this.hud.menu.returnValue === 'start') {
        const cfg = this.hud.readConfig();
        if (cfg.mode === 'online' && __ONLINE__) {
          void this.startOnline({ create: { players: cfg.players, animal: cfg.animal } });
        } else {
          this.startLocal(cfg);
        }
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
    this.hud.stopBotsBtn.addEventListener('click', () => this.toggleBotMatch());
    this.hud.menuStopBtn.addEventListener('click', () => this.toggleBotMatch());
    this.hud.undoBtn.addEventListener('click', () => this.undo());
    this.hud.hintBtn.addEventListener('click', () => this.requestHint());
    this.hud.hintEl.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('#btn-apply-hint');
      if (btn && this.currentHintAction) {
        const act = this.currentHintAction;
        this.currentHintAction = null;
        this.hud.hintEl.classList.remove('active-hint');
        this.stopClockTimer();
        this.controller?.submit(act);
      }
    });

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
    this.hud.replayExitBtn.addEventListener('click', () => {
      this.controller?.dispose();
      this.controller = null;
      this.openMenu();
    });
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
      else if (e.key === 'i' || e.key === 'I' || e.key === '?') this.requestHint();
      else if (e.key === 'c' || e.key === 'C') this.cycleCameraPreset();
      else if (e.key === 'm' || e.key === 'M') this.toggleSound();
      else if (e.key === 'h' || e.key === 'H') this.showHistory();
      else if (e.key === 'l' || e.key === 'L') this.showMovesDialog();
      else if ((e.key === 's' || e.key === 'S') && this.controller?.kind === 'bot_vs_bot') this.toggleBotMatch();
      else if (e.key === 'Escape') this.openMenu();
    });
  }

  private openMenu(): void {
    this.hud.setReplayBarVisible(false);
    if (this.controller?.kind === 'bot_vs_bot' && this.controller instanceof LocalController) {
      this.hud.updateBotMatchPaused(this.controller.paused);
    }
    this.clearPreview();
    this.hud.menu.returnValue = '';
    if (!this.hud.menu.open) this.hud.menu.showModal();
  }

  private startLocal(config: GameConfig, restoreExisting = false): void {
    this.clockInitial = typeof config.turnTimer === 'number' ? config.turnTimer : 300;
    this.hud.setReplayBarVisible(false);
    this.hud.setBotMatchActive(config.mode === 'bot_vs_bot');
    if (!restoreExisting) {
      this.playerClocks = [];
      this.clockHistory = [];
      LocalController.clearSaved();
      if (config.mode === 'bot_vs_bot') {
        this.cameraPreset = 'iso';
      }
    }
    this.setController(new LocalController(config), restoreExisting);
  }

  private async startOnline(intent: import('./net/OnlineController').OnlineIntent): Promise<void> {
    if (!__ONLINE__) return;
    const cfg = this.hud.readConfig();
    this.clockInitial = typeof cfg.turnTimer === 'number' ? cfg.turnTimer : 300;
    this.playerClocks = [];
    this.clockHistory = [];
    this.hud.setReplayBarVisible(false);
    this.hud.setBotMatchActive(false);
    const { OnlineController } = await import('./net/OnlineController');
    this.setController(new OnlineController(this.hud, intent));
  }

  private setController(ctrl: GameController, restoreExisting = false): void {
    this.stopClockTimer();
    this.hud.hideTurnTimer();
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
        this.clockHistory = [];
        this.playerClocks = this.seats.map(() => this.clockInitial);
        this.clearPreview();
        this.clearAnimalDestination();
        this.scene.setupPlayers(this.seats.map((s) => s.animal));
        this.scene.syncState(this.state);
        const focus = this.controller ? this.controller.viewSeat(this.state) : 0;
        void this.scene.setCameraPreset(this.cameraPreset, focus, 1.2);
        this.refreshTurnUi();
        break;
      }
      case 'seats': {
        this.seats = u.seats;
        if (this.playerClocks.length !== this.seats.length) {
          this.playerClocks = this.seats.map(() => this.clockInitial);
        }
        this.refreshTurnUi();
        break;
      }
      case 'sync': {
        this.state = u.state;
        if (this.playerClocks.length !== this.state.players.length) {
          this.playerClocks = this.state.players.map(() => this.clockInitial);
        }
        this.clearPreview();
        this.clearAnimalDestination();
        this.scene.syncState(this.state);
        this.refreshTurnUi();
        break;
      }
      case 'action': {
        this.stopClockTimer();
        this.clearPreview();
        this.scene.showMoveMarkers([]);
        this.matchActions.push(u.action);
        this.clockHistory.push([...this.playerClocks]);
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

    if (this.playerClocks.length !== this.seats.length) {
      this.playerClocks = this.seats.map(() => this.clockInitial);
    }

    this.hud.renderPlayers(s, this.seats, this.playerClocks, this.clockInitial);
    this.scene.setActiveSeat(s.turn);
    this.updateControls();

    if (s.winner !== null) {
      this.stopClockTimer();
      this.hud.hideTurnTimer();
      return;
    }

    this.currentHintAction = null;
    this.hud.hintEl.classList.remove('active-hint');

    if (this.isMyTurn()) {
      const label = this.controller?.kind === 'local' ? `${a.name}'s turn` : 'Your turn';
      this.hud.setTurn(seat, label);
      this.hud.setHint(this.getTacticalAdvice(s, s.turn));
      this.scene.showMoveMarkers(legalMoves(s, s.turn));
      if (this.controller?.kind === 'local' && this.cameraPreset === 'seat') {
        void this.scene.focusSeat(s.turn, 0.9);
      }
    } else {
      const isPaused = this.controller instanceof LocalController && this.controller.paused;
      const label = isPaused
        ? `${a.name} (Paused)`
        : !seat.human
          ? `${a.name} is thinking...`
          : seat.away
            ? `${a.name} (Away)`
            : `${a.name}'s turn`;
      this.hud.setTurn(seat, label);
      const hintText = this.controller?.kind === 'bot_vs_bot'
        ? (isPaused
            ? 'Bot match paused · Press S or Resume to continue'
            : 'Spectating bot match · Press S to pause · Press C for camera')
        : '';
      this.hud.setHint(hintText);
      this.scene.showMoveMarkers([]);
      this.scene.showGhost(null);
    }

    if (this.clockInitial > 0) {
      this.startClockTimer();
    } else {
      this.stopClockTimer();
      this.hud.hideTurnTimer();
    }
  }

  private toggleBotMatch(): void {
    if (!(this.controller instanceof LocalController) || this.controller.kind !== 'bot_vs_bot') return;
    sounds.playTick();
    if (this.controller.paused) {
      this.controller.resume();
      this.hud.updateBotMatchPaused(false);
      this.refreshTurnUi();
      this.hud.toast('Match resumed');
      if (this.hud.menu.open) this.hud.menu.close();
    } else {
      this.controller.pause();
      this.hud.updateBotMatchPaused(true);
      const a = ANIMALS[this.seats[this.state.turn].animal];
      this.hud.setTurn(this.seats[this.state.turn], `${a.name} (Paused)`);
      this.hud.setHint('Bot match paused · Press S or Resume to continue');
      this.hud.toast('Match paused');
    }
  }

  private updateControls(): void {
    this.hud.undoBtn.disabled = !this.controller?.canUndo() || this.processing;
    this.hud.hintBtn.disabled = !this.isMyTurn() || this.processing || this.state?.winner !== null;
  }

  private async finish(winner: number, timedOutBy?: number): Promise<void> {
    this.stopClockTimer();
    this.hud.hideTurnTimer();
    this.hud.setBotMatchActive(false);
    const seat = this.seats[winner];
    this.hud.renderPlayers(this.state, this.seats, this.playerClocks, this.clockInitial);
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
    let sub = timedOutBy !== undefined
      ? `Won on time (${ANIMALS[this.seats[timedOutBy].animal].name} ran out of time).`
      : 'Goal line reached.';
    if (kind === 'ai') {
      title = seat.human ? 'You win' : `${ANIMALS[seat.animal].name} wins`;
      if (timedOutBy === undefined) {
        sub = seat.human ? 'Goal line reached.' : 'Opponent reached the goal line.';
      }
    } else if (kind === 'bot_vs_bot') {
      title = `${ANIMALS[seat.animal].name} wins!`;
      if (timedOutBy === undefined) {
        sub = `Bot ${ANIMALS[seat.animal].name} reached the goal line.`;
      }
    } else if (kind === 'online') {
      title = seat.local ? 'Victory!' : `${ANIMALS[seat.animal].name} wins`;
    }

    this.hud.showWin(seat, title, sub, canRematch);
  }

  private startReplay(record: HistoryRecord): void {
    this.stopClockTimer();
    this.hud.hideTurnTimer();
    LocalController.clearSaved();
    this.hud.setBotMatchActive(false);
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
    this.stopClockTimer();
    if (this.clockHistory.length > 0) {
      const isVsAi = this.controller?.kind === 'ai';
      if (isVsAi && this.clockHistory.length >= 2) {
        this.clockHistory.pop();
        this.playerClocks = this.clockHistory.pop()!;
      } else {
        this.playerClocks = this.clockHistory.pop()!;
      }
    }
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
    if (!this.state || e.buttons !== 0) {
      if (e.buttons === 0) {
        this.clearPreview();
        this.clearAnimalDestination();
      }
      return;
    }

    // Check animal hover: figurine 3D mesh hit or pawn board cell
    let hoveredSeat: number | null = this.scene.pickPawn(e.clientX, e.clientY);
    const pick = this.scene.pick(e.clientX, e.clientY);
    if (hoveredSeat === null && pick?.kind === 'cell') {
      const pIdx = this.state.players.findIndex((p) => p.r === pick.r && p.c === pick.c);
      if (pIdx !== -1) {
        hoveredSeat = pIdx;
      }
    }

    if (hoveredSeat !== null) {
      this.showAnimalDestination(hoveredSeat);
    } else {
      this.clearAnimalDestination();
    }

    if (!this.isMyTurn() || this.processing) {
      this.clearPreview();
      if (hoveredSeat !== null) {
        this.scene.renderer.domElement.style.cursor = 'pointer';
      }
      return;
    }

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
      if (hoveredSeat !== null) {
        canvas.style.cursor = 'pointer';
      }
    }
  }

  private showAnimalDestination(seatIndex: number): void {
    if (!this.state || seatIndex < 0 || seatIndex >= this.state.players.length) return;
    if (this.hoveredAnimalSeat === seatIndex) return;
    this.hoveredAnimalSeat = seatIndex;

    const seat = this.seats[seatIndex];
    if (!seat) return;
    const p = this.state.players[seatIndex];
    const a = ANIMALS[seat.animal];
    const goalDesc = formatGoalDescription(p.goal);
    const steps = shortestPath(this.state, seatIndex);
    const stepsText = `${steps} step${steps === 1 ? '' : 's'} away`;

    const title = `${a.name}'s Destination`;
    const desc = `${goalDesc.edge} (${goalDesc.detail}) · ${stepsText}`;

    this.scene.showDestination(p.goal, a.color);
    this.hud.showDestination(seat, title, desc);
  }

  private clearAnimalDestination(): void {
    if (this.hoveredAnimalSeat === null) return;
    this.hoveredAnimalSeat = null;
    this.scene.showDestination(null);
    this.hud.hideDestination();
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
    this.currentHintAction = null;
    this.hud.hintEl.classList.remove('active-hint');
    this.stopClockTimer();
    this.controller?.submit(action);
  }

  // ------------------------------------------------------------------ Decision Clock (Chess Clock)
  private isModalOpen(): boolean {
    return Boolean(document.querySelector('dialog[open]'));
  }

  private startClockTimer(): void {
    this.stopClockTimer();
    if (this.clockInitial <= 0 || !this.state || this.state.winner !== null) {
      this.hud.hideTurnTimer();
      return;
    }

    const currentTurn = this.state.turn;
    if (this.playerClocks[currentTurn] === undefined) {
      this.playerClocks[currentTurn] = this.clockInitial;
    }

    this.clockLastTime = performance.now();
    this.lastBeepSecond = -1;
    const currentRemaining = this.playerClocks[currentTurn];
    this.hud.updateTurnTimer(currentRemaining, this.clockInitial);
    this.hud.updatePlayerClock(currentTurn, currentRemaining, this.clockInitial);

    this.clockTimerId = window.setInterval(() => {
      if (!this.state || this.state.winner !== null) {
        this.stopClockTimer();
        this.hud.hideTurnTimer();
        return;
      }

      const now = performance.now();
      const dt = (now - this.clockLastTime) / 1000;
      this.clockLastTime = now;

      if (this.isModalOpen()) {
        return;
      }

      if (this.controller instanceof LocalController && this.controller.paused) {
        return;
      }

      const turn = this.state.turn;
      if (this.playerClocks[turn] === undefined) {
        this.playerClocks[turn] = this.clockInitial;
      }

      this.playerClocks[turn] = Math.max(0, this.playerClocks[turn] - dt);
      const remaining = this.playerClocks[turn];

      this.hud.updateTurnTimer(remaining, this.clockInitial);
      this.hud.updatePlayerClock(turn, remaining, this.clockInitial);

      const wholeSec = Math.ceil(remaining);
      if (wholeSec <= 10 && wholeSec > 0 && wholeSec !== this.lastBeepSecond) {
        this.lastBeepSecond = wholeSec;
        sounds.playCountdown(wholeSec <= 3);
      }

      if (remaining <= 0) {
        this.stopClockTimer();
        this.onClockExpired(turn);
      }
    }, 100);
  }

  private stopClockTimer(): void {
    if (this.clockTimerId !== null) {
      window.clearInterval(this.clockTimerId);
      this.clockTimerId = null;
    }
  }

  private onClockExpired(timedOutTurn: number): void {
    if (!this.state || this.state.winner !== null) return;
    sounds.playCountdown(true);
    const timedOutSeat = this.seats[timedOutTurn];
    const timedOutAnimalName = timedOutSeat ? ANIMALS[timedOutSeat.animal].name : `Player ${timedOutTurn + 1}`;
    this.hud.toast(`⏰ ${timedOutAnimalName} ran out of time!`);

    let winner = -1;
    if (this.state.players.length === 2) {
      winner = 1 - timedOutTurn;
    } else {
      let bestDist = Infinity;
      for (let i = 0; i < this.state.players.length; i++) {
        if (i === timedOutTurn) continue;
        const d = shortestPath(this.state, i);
        if (d < bestDist) {
          bestDist = d;
          winner = i;
        }
      }
      if (winner === -1) winner = (timedOutTurn + 1) % this.state.players.length;
    }

    void this.finish(winner, timedOutTurn);
  }

  // ------------------------------------------------------------------ Tactical Hints & Guidance
  private requestHint(): void {
    if (!this.state || !this.isMyTurn() || this.processing || this.state.winner !== null) return;
    const action = chooseAction(this.state, 'hard');
    this.currentHintAction = action;

    if (action.type === 'move') {
      this.scene.showMoveMarkers(legalMoves(this.state, this.state.turn), { r: action.r, c: action.c });
      this.scene.showGhost(null);
    } else {
      this.scene.showGhost(action.wall, true, true);
    }

    const exp = this.explainHint(this.state, action);
    this.hud.hintEl.classList.add('active-hint');
    this.hud.setHint(
      `<span aria-hidden="true">💡</span> <span><strong>${exp.summary}</strong> — ${exp.detail}</span> <button id="btn-apply-hint" class="hint-action-btn" type="button">Play Move</button>`,
      true,
    );
    sounds.playTick();
    this.hud.toast(`💡 ${exp.summary}`);
  }

  private explainHint(s: GameState, action: Action): { summary: string; detail: string } {
    const me = s.turn;
    const myPlayer = s.players[me];
    const myDist = shortestPath(s, me);

    if (action.type === 'move') {
      const isJump = Math.abs(action.r - myPlayer.r) + Math.abs(action.c - myPlayer.c) > 1;
      const sNext = cloneState(s);
      applyAction(sNext, action);
      const newDist = shortestPath(sNext, me);
      const saved = myDist - newDist;

      if (newDist === 0) {
        return {
          summary: `Winning move to row ${action.r + 1}, col ${action.c + 1}!`,
          detail: 'Reaches goal line for victory',
        };
      }
      if (isJump) {
        return {
          summary: `Jump over opponent to row ${action.r + 1}, col ${action.c + 1}`,
          detail: `Gains ${saved} steps tempo (${newDist} left)`,
        };
      }
      return {
        summary: `Advance to row ${action.r + 1}, col ${action.c + 1}`,
        detail: `Best path forward (${newDist} steps to win)`,
      };
    }

    const sNext = cloneState(s);
    applyAction(sNext, action);

    let bestDelay = 0;
    let targetAnimal = '';
    for (let i = 0; i < s.players.length; i++) {
      if (i === me) continue;
      const before = shortestPath(s, i);
      const after = shortestPath(sNext, i);
      const delay = after - before;
      if (delay > bestDelay) {
        bestDelay = delay;
        targetAnimal = ANIMALS[this.seats[i].animal]?.name ?? `Player ${i + 1}`;
      }
    }

    const orient = action.wall.o === 'h' ? 'Horizontal' : 'Vertical';
    const pos = `row ${action.wall.r + 1}, col ${action.wall.c + 1}`;

    if (bestDelay > 0) {
      return {
        summary: `Place ${orient.toLowerCase()} hedge at ${pos}`,
        detail: `Adds +${bestDelay} steps to ${targetAnimal}'s path!`,
      };
    }

    return {
      summary: `Place ${orient.toLowerCase()} hedge at ${pos}`,
      detail: 'Channels opponent into a longer route',
    };
  }

  private getTacticalAdvice(s: GameState, me: number): string {
    const myDist = shortestPath(s, me);
    let minOppDist = Infinity;
    let leaderSeat = -1;

    for (let i = 0; i < s.players.length; i++) {
      if (i === me) continue;
      const d = shortestPath(s, i);
      if (d < minOppDist) {
        minOppDist = d;
        leaderSeat = i;
      }
    }

    const leaderName = leaderSeat !== -1 ? ANIMALS[this.seats[leaderSeat].animal]?.name : 'Opponent';
    const hasWalls = s.players[me].walls > 0;
    const lead = minOppDist - myDist;

    if (minOppDist <= 2 && hasWalls) {
      return `⚠️ Urgent: ${leaderName} is only ${minOppDist} step${minOppDist === 1 ? '' : 's'} away! Place a hedge (press 💡 for hint)`;
    }
    if (lead >= 2) {
      return `Ahead by ${lead} steps (${myDist} vs ${minOppDist}) · Keep advancing towards your goal!`;
    }
    if (lead <= -2 && hasWalls) {
      return `Trailing by ${-lead} steps (${myDist} vs ${minOppDist}) · Block ${leaderName}'s path (press 💡 for hint)`;
    }
    if (lead === 0 && hasWalls) {
      return `Tied race (${myDist} steps each) · Advance or press 💡 for tactical hint`;
    }
    return hasWalls
      ? `${myDist} steps to goal (${leaderName}: ${minOppDist}) · Click tile to move or groove for wall`
      : `No hedges left (${myDist} steps to goal) · Advance towards your goal line`;
  }
}

void new Game().init();
