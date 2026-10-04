import './style.css';
import { BoardScene, type Pick } from './scene/BoardScene';
import { Hud, type GameConfig, type Seat } from './ui/Hud';
import { ANIMALS, ANIMAL_ORDER } from './game/animals';
import { chooseAction } from './game/ai';
import {
  type Action,
  type GameState,
  applyAction,
  checkWall,
  cloneState,
  createGame,
  isLegal,
  legalMoves,
} from './game/rules';

class Game {
  private scene: BoardScene;
  private hud = new Hud();
  private config!: GameConfig;
  private seats: Seat[] = [];
  private state!: GameState;
  private history: GameState[] = [];
  private busy = false;
  private epoch = 0; // invalidates pending AI turns / animations after restart or undo
  private downAt: { x: number; y: number } | null = null;

  constructor() {
    this.scene = new BoardScene(document.getElementById('stage')!);
  }

  async init(): Promise<void> {
    await this.scene.load((p) => this.hud.setLoading(p));
    this.bindUi();
    this.hud.hideLoader();
    this.hud.menu.showModal();
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
      if (this.hud.menu.returnValue === 'start') this.start(this.hud.readConfig());
    });
    this.hud.win.addEventListener('close', () => {
      if (this.hud.win.returnValue === 'again') this.start(this.config);
      else if (this.hud.win.returnValue === 'menu') this.openMenu();
    });

    document.getElementById('btn-menu')!.addEventListener('click', () => this.openMenu());
    document.getElementById('btn-rules')!.addEventListener('click', () => this.hud.rules.showModal());
    document.getElementById('btn-camera')!.addEventListener('click', () => this.resetCamera());
    this.hud.undoBtn.addEventListener('click', () => this.undo());

    window.addEventListener('keydown', (e) => {
      if (document.querySelector('dialog[open]')) return;
      if (e.key === 'z' || e.key === 'Z') this.undo();
      else if (e.key === 'c' || e.key === 'C') this.resetCamera();
      else if (e.key === 'Escape') this.openMenu();
    });
  }

  private openMenu(): void {
    this.hud.menu.returnValue = '';
    if (!this.hud.menu.open) this.hud.menu.showModal();
  }

  private start(config: GameConfig): void {
    this.epoch++;
    this.busy = false;
    this.config = config;
    const others = ANIMAL_ORDER.filter((a) => a !== config.animal);
    this.seats = Array.from({ length: config.players }, (_, i) => ({
      animal: i === 0 ? config.animal : others[i - 1],
      human: config.mode === 'local' || i === 0,
    }));
    this.state = createGame(config.players);
    this.history = [];
    this.scene.setupPlayers(this.seats.map((s) => s.animal));
    this.scene.syncState(this.state);
    void this.scene.focusSeat(0, 1.2);
    this.beginTurn();
  }

  // ------------------------------------------------------------------ Turn flow
  private get currentSeat(): Seat {
    return this.seats[this.state.turn];
  }

  private isHumanTurn(): boolean {
    return this.state.winner === null && this.currentSeat.human && !this.busy;
  }

  private beginTurn(): void {
    const s = this.state;
    const seat = this.currentSeat;
    const a = ANIMALS[seat.animal];
    this.hud.renderPlayers(s, this.seats);
    this.scene.setActiveSeat(s.turn);
    this.hud.undoBtn.disabled = this.history.length === 0;

    if (seat.human) {
      const label = this.config.mode === 'ai' ? 'Your turn' : `${a.name}'s turn`;
      this.hud.setTurn(seat, label);
      this.hud.setHint(
        s.players[s.turn].walls > 0
          ? 'Click a glowing tile to move  ·  hover a groove to plant a hedge'
          : 'No hedges left — click a glowing tile to move',
      );
      this.scene.showMoveMarkers(legalMoves(s, s.turn));
      if (this.config.mode === 'local') void this.scene.focusSeat(s.turn, 0.9);
    } else {
      this.hud.setTurn(seat, `${a.name} is thinking…`);
      this.hud.setHint('');
      this.scene.showMoveMarkers([]);
      this.scene.showGhost(null);
      const epoch = this.epoch;
      window.setTimeout(() => {
        if (epoch !== this.epoch) return;
        const action = chooseAction(this.state, this.config.difficulty);
        void this.perform(action);
      }, 550);
    }
  }

  private async perform(action: Action): Promise<void> {
    if (this.busy || !isLegal(this.state, action)) return;
    const epoch = this.epoch;
    this.busy = true;
    this.clearPreview();
    this.scene.showMoveMarkers([]);

    const seatIdx = this.state.turn;
    this.history.push(cloneState(this.state));
    applyAction(this.state, action);

    if (action.type === 'move') await this.scene.animateMove(seatIdx, action);
    else await this.scene.animateWall(action.wall);
    if (epoch !== this.epoch) return;

    this.busy = false;
    if (this.state.winner !== null) {
      this.finish(this.state.winner);
      return;
    }
    this.beginTurn();
  }

  private async finish(winner: number): Promise<void> {
    const epoch = this.epoch;
    const seat = this.seats[winner];
    this.hud.renderPlayers(this.state, this.seats);
    this.hud.setTurn(seat, `${ANIMALS[seat.animal].name} wins!`);
    this.hud.setHint('');
    this.busy = true;
    await this.scene.celebrate(winner);
    if (epoch !== this.epoch) return;
    this.busy = false;
    this.hud.showWin(seat, seat.human, this.config.mode === 'ai');
  }

  private undo(): void {
    if (this.busy || this.history.length === 0) return;
    let prev = this.history.pop()!;
    // Against the computer, rewind to the human's previous turn
    if (this.config.mode === 'ai') {
      while (!this.seats[prev.turn].human && this.history.length > 0) prev = this.history.pop()!;
    }
    this.epoch++;
    this.state = prev;
    this.scene.syncState(this.state);
    this.beginTurn();
  }

  private resetCamera(): void {
    const seat = this.config?.mode === 'local' && this.state ? this.state.turn : 0;
    void this.scene.focusSeat(seat, 0.8);
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
    if (!this.state || !this.isHumanTurn() || e.buttons !== 0) {
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
    if (!this.state || !this.isHumanTurn()) return;
    const action = this.previewFor(this.scene.pick(e.clientX, e.clientY));
    if (!action) return;
    if (action.type === 'wall') {
      if (this.state.players[this.state.turn].walls <= 0) return this.hud.toast('No hedges left');
      const check = checkWall(this.state, action.wall);
      if (!check.ok) return this.hud.toast(check.reason);
    }
    void this.perform(action);
  }
}

void new Game().init();
