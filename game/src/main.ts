import './style.css';
import { BoardScene } from './scene/BoardScene';
import { CameraController } from './scene/CameraController';
import { BoardInteractionManager } from './scene/BoardInteraction';
import { bindKeyboardShortcuts } from './ui/shortcuts';
import { Hud, type GameConfig, type Seat } from './ui/Hud';
import { ANIMALS } from './game/animals';
import {
  type Action,
  type GameState,
  legalMoves,
} from './game/rules';
import type { GameController, Update } from './net/controller';
import { LocalController } from './net/LocalController';
import { MatchHistoryManager, type HistoryRecord } from './game/history';
import { ReplayController } from './net/ReplayController';
import { formatActionDescription } from './game/replay';
import { sounds } from './scene/sounds';
import { TacticalCoach } from './game/coach';
import { ClockCoordinator } from './ui/ClockCoordinator';
import { DestinationInspector } from './ui/DestinationInspector';
import { HintCoordinator } from './ui/HintCoordinator';
import { DialogCoordinator } from './ui/DialogCoordinator';
import { formatWinDetails } from './game/winDetails';
import { hudStore } from './ui/hudStore';

class Game {
  private scene: BoardScene;
  private hud = new Hud();
  private interaction!: BoardInteractionManager;
  private destinations!: DestinationInspector;
  private clock!: ClockCoordinator;
  private hints!: HintCoordinator;
  private dialogs!: DialogCoordinator;
  private camera!: CameraController;

  private controller: GameController | null = null;
  private seats: Seat[] = [];
  private state!: GameState;
  private queue: Update[] = [];
  private processing = false;
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
      this.openMenu();
    }
  }

  // ------------------------------------------------------------------ Setup
  private bindUi(): void {
    this.destinations = new DestinationInspector({
      scene: this.scene,
      hud: this.hud,
      getState: () => this.state ?? null,
      getSeats: () => this.seats,
    });

    this.interaction = new BoardInteractionManager(
      this.scene.renderer.domElement,
      this.scene,
      {
        getState: () => this.state ?? null,
        canAct: () => this.isMyTurn() && !this.processing,
        onAction: (action) => this.submitAction(action),
        onHoverPawn: (seat) => {
          if (seat !== null) this.destinations.show(seat);
          else this.destinations.clear();
        },
        onToast: (msg) => this.hud.toast(msg),
      },
    );

    this.hud.bindPlayerHover((seat) => {
      if (seat !== null) {
        this.destinations.show(seat);
      } else {
        this.destinations.clear();
      }
    });

    this.clock = new ClockCoordinator(this.hud, {
      getState: () => this.state ?? null,
      getSeats: () => this.seats,
      isPaused: () => this.controller instanceof LocalController && this.controller.paused,
      onTimeout: (winner, timedOutSeat) => this.onClockTimeout(winner, timedOutSeat),
    });

    this.hints = new HintCoordinator({
      hud: this.hud,
      scene: this.scene,
      interaction: this.interaction,
      delegate: {
        getState: () => this.state ?? null,
        getSeats: () => this.seats,
        canAct: () => this.isMyTurn() && !this.processing,
        onSubmitAction: (action) => this.submitAction(action),
      },
    });

    this.camera = new CameraController(
      this.scene,
      this.hud,
      () => (this.controller ? this.controller.viewSeat(this.state) : 0),
    );

    this.dialogs = new DialogCoordinator({
      hud: this.hud,
      delegate: {
        getState: () => this.state ?? null,
        getSeats: () => this.seats,
        getMatchActions: () => this.matchActions,
        getController: () => this.controller,
        startReplay: (record) => this.startReplay(record),
        openMenu: () => this.openMenu(),
        onRematch: () => {
          if (this.controller?.canRematch()) this.controller.rematch();
        },
      },
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

    hudStore.callbacks.onStartGame = (cfg) => {
      if (cfg.mode === 'online' && __ONLINE__) {
        void this.startOnline({ create: { players: cfg.players, animal: cfg.animal } });
      } else {
        this.startLocal(cfg);
      }
    };
    hudStore.callbacks.onOpenMenu = () => this.openMenu();
    hudStore.callbacks.onCloseMenu = () => {
      if (this.hud.menu.open) this.hud.menu.close();
    };
    hudStore.callbacks.onCycleCamera = () => this.camera.cycle();
    hudStore.callbacks.onToggleSound = () => this.toggleSound();
    hudStore.callbacks.onToggleBotMatch = () => this.toggleBotMatch();
    hudStore.callbacks.onUndo = () => this.undo();
    hudStore.callbacks.onRequestHint = () => this.hints.requestHint();

    this.hud.cameraBtn.addEventListener('click', () => this.camera.cycle());
    this.hud.soundBtn.addEventListener('click', () => this.toggleSound());
    this.hud.stopBotsBtn.addEventListener('click', () => this.toggleBotMatch());
    this.hud.menuStopBtn.addEventListener('click', () => this.toggleBotMatch());
    this.hud.undoBtn.addEventListener('click', () => this.undo());

    bindKeyboardShortcuts({
      isModalOpen: () => Boolean(document.querySelector('dialog[open]')),
      isReplay: () => this.controller instanceof ReplayController,
      canToggleBot: () => this.controller?.kind === 'bot_vs_bot',
      onUndo: () => this.undo(),
      onHint: () => this.hints.requestHint(),
      onCamera: () => this.camera.cycle(),
      onSound: () => this.toggleSound(),
      onHistory: () => this.dialogs.showHistory(),
      onMoves: () => this.dialogs.showMovesDialog(),
      onMenu: () => this.openMenu(),
      onToggleBotMatch: () => this.toggleBotMatch(),
      replay: {
        togglePlay: () => this.dialogs.toggleReplayPlay(),
        prev: () => this.dialogs.replayPrev(),
        next: () => this.dialogs.replayNext(),
        first: () => this.dialogs.replayFirst(),
        last: () => this.dialogs.replayLast(),
      },
    });
  }

  private openMenu(): void {
    this.hud.setReplayBarVisible(false);
    if (this.controller?.kind === 'bot_vs_bot' && this.controller instanceof LocalController) {
      this.hud.updateBotMatchPaused(this.controller.paused);
    }
    this.interaction.clearPreview();
    this.hud.menu.returnValue = '';
    if (!this.hud.menu.open) this.hud.menu.showModal();
  }

  private startLocal(config: GameConfig, restoreExisting = false): void {
    const initial = config.mode === 'bot_vs_bot'
      ? 0
      : typeof config.turnTimer === 'number' ? config.turnTimer : 300;
    this.clock.reset(config.players, initial);
    this.hud.setReplayBarVisible(false);
    this.hud.setBotMatchActive(config.mode === 'bot_vs_bot');
    if (!restoreExisting) {
      LocalController.clearSaved();
      if (config.mode === 'bot_vs_bot') {
        this.camera.setPreset('iso');
      }
    }
    this.setController(new LocalController(config), restoreExisting);
  }

  private async startOnline(intent: import('./net/OnlineController').OnlineIntent): Promise<void> {
    if (!__ONLINE__) return;
    this.clock.reset(2, 0);
    this.hud.setReplayBarVisible(false);
    this.hud.setBotMatchActive(false);
    const { OnlineController } = await import('./net/OnlineController');
    this.setController(new OnlineController(this.hud, intent));
  }

  private setController(ctrl: GameController, restoreExisting = false): void {
    this.clock.stop();
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
        this.clock.reset(this.seats.length, this.clock.initialSeconds);
        this.interaction.clearPreview();
        this.destinations.reset();
        this.scene.setupPlayers(this.seats.map((s) => s.animal));
        this.scene.syncState(this.state);
        const focus = this.controller ? this.controller.viewSeat(this.state) : 0;
        void this.scene.setCameraPreset(this.camera.preset, focus, 1.2);
        this.refreshTurnUi();
        break;
      }
      case 'seats': {
        this.seats = u.seats;
        if (this.clock.remaining.length !== this.seats.length) {
          this.clock.reset(this.seats.length, this.clock.initialSeconds);
        }
        this.refreshTurnUi();
        break;
      }
      case 'sync': {
        this.state = u.state;
        if (this.clock.remaining.length !== this.state.players.length) {
          this.clock.reset(this.state.players.length, this.clock.initialSeconds);
        }
        this.interaction.clearPreview();
        this.destinations.reset();
        this.scene.syncState(this.state);
        this.refreshTurnUi();
        break;
      }
      case 'action': {
        this.clock.stop();
        this.interaction.clearPreview();
        this.scene.showMoveMarkers([]);
        this.matchActions.push(u.action);
        this.clock.recordMove();
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

    this.hud.renderPlayers(s, this.seats, this.clock.remaining, this.clock.initialSeconds);
    this.scene.setActiveSeat(s.turn);
    this.updateControls();

    if (s.winner !== null) {
      this.clock.stop();
      this.hud.hideTurnTimer();
      return;
    }

    this.hints.clear();

    if (this.isMyTurn()) {
      const label = this.controller?.kind === 'local' ? `${a.name}'s turn` : 'Your turn';
      this.hud.setTurn(seat, label);
      this.hud.setHint(TacticalCoach.getStatusAdvice(s, s.turn, this.seats));
      this.scene.showMoveMarkers(legalMoves(s, s.turn));
      if (this.controller?.kind === 'local' && this.camera.preset === 'seat') {
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

    if (this.clock.isEnabled) {
      this.clock.start(s.turn);
    } else {
      this.clock.stop();
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

  private onClockTimeout(winner: number, timedOutTurn: number): void {
    if (!this.state || this.state.winner !== null) return;
    this.state.winner = winner;
    if (this.controller instanceof LocalController) {
      LocalController.clearSaved();
    }
    void this.finish(winner, timedOutTurn);
  }

  private async finish(winner: number, timedOutBy?: number): Promise<void> {
    this.clock.stop();
    this.hud.hideTurnTimer();
    this.hud.setBotMatchActive(false);
    const seat = this.seats[winner];
    this.hud.renderPlayers(this.state, this.seats, this.clock.remaining, this.clock.initialSeconds);
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

    const timedOutSeat = timedOutBy !== undefined ? this.seats[timedOutBy] : undefined;
    const { title, sub } = formatWinDetails({
      mode: kind,
      winnerAnimalName: ANIMALS[seat.animal].name,
      isHuman: Boolean(seat.human),
      isLocal: Boolean(seat.local),
      timedOutAnimalName: timedOutSeat ? ANIMALS[timedOutSeat.animal].name : undefined,
    });

    const canRematch = this.controller ? this.controller.canRematch() : false;
    this.hud.showWin(seat, title, sub, canRematch);
  }

  private startReplay(record: HistoryRecord): void {
    this.clock.stop();
    this.hud.hideTurnTimer();
    LocalController.clearSaved();
    this.hud.setBotMatchActive(false);
    this.camera.setPreset('iso');
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

  private undo(): void {
    if (this.processing || !this.controller?.canUndo()) return;
    this.clock.stop();
    const isVsAi = this.controller?.kind === 'ai';
    const stepsToPop = isVsAi && this.matchActions.length >= 2 ? 2 : 1;
    this.clock.undo(stepsToPop);
    for (let i = 0; i < stepsToPop && this.matchActions.length > 0; i++) {
      this.matchActions.pop();
    }
    this.movesCount = this.matchActions.filter((a) => a.type === 'move').length;
    sounds.playWhoosh();
    this.controller.undo();
  }

  private toggleSound(): void {
    const enabled = sounds.toggle();
    this.hud.updateSoundUi(enabled);
    if (enabled) sounds.playTick();
    this.hud.toast(enabled ? 'Sound On' : 'Sound Muted');
  }

  private submitAction(action: Action): void {
    this.hints.clear();
    this.clock.stop();
    this.controller?.submit(action);
  }
}

void new Game().init();
