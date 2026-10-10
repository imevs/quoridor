import type { Action, GameState } from '../game/rules';
import { checkWall, legalMoves } from '../game/rules';
import type { BoardScene, Pick } from './BoardScene';

export interface InteractionCallbacks {
  getState: () => GameState | null;
  canAct: () => boolean;
  onAction: (action: Action) => void;
  onHoverPawn: (seat: number | null) => void;
  onToast: (message: string) => void;
}

/**
 * Manages pointer gestures, drag thresholds, picking, and visual hover states on the 3D board canvas.
 */
export class BoardInteractionManager {
  private canvas: HTMLCanvasElement;
  private scene: BoardScene;
  private callbacks: InteractionCallbacks;
  private downAt: { x: number; y: number } | null = null;
  private currentHintAction: Action | null = null;
  private abort = new AbortController();

  constructor(canvas: HTMLCanvasElement, scene: BoardScene, callbacks: InteractionCallbacks) {
    this.canvas = canvas;
    this.scene = scene;
    this.callbacks = callbacks;
    this.bindEvents();
  }

  setHintAction(action: Action | null): void {
    this.currentHintAction = action;
  }

  clearPreview(): void {
    if (this.currentHintAction?.type === 'wall') {
      this.scene.showGhost(this.currentHintAction.wall, true, true);
    } else {
      this.scene.showGhost(null);
    }
    this.scene.hoverMarker(null);
    this.canvas.style.cursor = '';
  }

  dispose(): void {
    this.abort.abort();
    this.clearPreview();
  }

  private bindEvents(): void {
    const signal = this.abort.signal;

    this.canvas.addEventListener('pointermove', (e) => this.onPointerMove(e), { signal });
    this.canvas.addEventListener('pointerdown', (e) => (this.downAt = { x: e.clientX, y: e.clientY }), { signal });
    this.canvas.addEventListener(
      'pointerup',
      (e) => {
        if (!this.downAt) return;
        const moved = Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y);
        this.downAt = null;
        const threshold = e.pointerType === 'touch' ? 14 : 7;
        if (moved < threshold) this.onClick(e);
      },
      { signal },
    );
    this.canvas.addEventListener(
      'pointerleave',
      () => {
        this.clearPreview();
        this.callbacks.onHoverPawn(null);
      },
      { signal },
    );
  }

  private previewFor(pick: Pick): Action | null {
    const state = this.callbacks.getState();
    if (!pick || !state) return null;
    if (pick.kind === 'cell') {
      const legal = legalMoves(state, state.turn).some((m) => m.r === pick.r && m.c === pick.c);
      return legal ? { type: 'move', r: pick.r, c: pick.c } : null;
    }
    return { type: 'wall', wall: pick.wall };
  }

  private onPointerMove(e: PointerEvent): void {
    const state = this.callbacks.getState();
    if (!state || e.buttons !== 0) {
      if (e.buttons === 0) {
        this.clearPreview();
        this.callbacks.onHoverPawn(null);
      }
      return;
    }

    // Check animal hover: figurine 3D mesh hit or pawn board cell
    let hoveredSeat: number | null = this.scene.pickPawn(e.clientX, e.clientY);
    const pick = this.scene.pick(e.clientX, e.clientY);
    if (hoveredSeat === null && pick?.kind === 'cell') {
      const pIdx = state.players.findIndex((p) => p.r === pick.r && p.c === pick.c);
      if (pIdx !== -1) {
        hoveredSeat = pIdx;
      }
    }

    this.callbacks.onHoverPawn(hoveredSeat);

    if (!this.callbacks.canAct()) {
      this.clearPreview();
      if (hoveredSeat !== null) {
        this.canvas.style.cursor = 'pointer';
      }
      return;
    }

    const action = this.previewFor(pick);
    if (action?.type === 'move') {
      this.scene.showGhost(null);
      this.scene.hoverMarker(action);
      this.canvas.style.cursor = 'pointer';
    } else if (action?.type === 'wall' && state.players[state.turn].walls > 0) {
      const check = checkWall(state, action.wall);
      this.scene.hoverMarker(null);
      this.scene.showGhost(action.wall, check.ok);
      this.canvas.style.cursor = check.ok ? 'pointer' : 'not-allowed';
    } else {
      this.clearPreview();
      if (hoveredSeat !== null) {
        this.canvas.style.cursor = 'pointer';
      }
    }
  }

  private onClick(e: PointerEvent): void {
    const state = this.callbacks.getState();
    if (!state || !this.callbacks.canAct()) return;
    const action = this.previewFor(this.scene.pick(e.clientX, e.clientY));
    if (!action) return;
    if (action.type === 'wall') {
      if (state.players[state.turn].walls <= 0) {
        this.callbacks.onToast('No hedges left');
        return;
      }
      const check = checkWall(state, action.wall);
      if (!check.ok) {
        this.callbacks.onToast(check.reason);
        return;
      }
    }
    this.currentHintAction = null;
    this.callbacks.onAction(action);
  }
}
