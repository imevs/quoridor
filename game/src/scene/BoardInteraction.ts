import * as THREE from 'three';
import type { Action, GameState } from '../game/rules';
import { N, checkWall, legalMoves } from '../game/rules';
import { formatNotation } from '../game/replay';
import { cellToWorld } from './BoardGeometry';
import type { BoardScene, Pick } from './BoardScene';

export interface InteractionCallbacks {
  getState: () => GameState | null;
  canAct: () => boolean;
  onAction: (action: Action) => void;
  onHoverPawn: (seat: number | null) => void;
  onToast: (message: string) => void;
  onStageAction?: (action: Action | null, text: string) => void;
}

export type AnimalGestureDirection = 'forward' | 'backward' | 'left' | 'right';

export interface AnimalGestureResolution {
  direction: AnimalGestureDirection;
  action: { type: 'move'; r: number; c: number } | null;
  reason?: 'off_board' | 'blocked_by_hedge';
}

export interface ActiveAnimalGesture {
  pointerId: number;
  startX: number;
  startY: number;
  hasMovedPastThreshold: boolean;
  resolved: AnimalGestureResolution | null;
}

export function isMobileOrTouch(e?: PointerEvent): boolean {
  if (e && e.pointerType === 'touch') return true;
  if (typeof window !== 'undefined') {
    if (window.matchMedia?.('(pointer: coarse)').matches) return true;
    if (window.innerWidth <= 768) return true;
    if ('ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0)) return true;
  }
  return false;
}

/**
 * Checks whether the given pointer screen coordinates fall on or immediately around
 * the active player's animal figurine, animal tile, adjacent tiles, or proximity radius.
 */
export function isAreaAroundAnimal(
  clientX: number,
  clientY: number,
  state: GameState,
  scene: {
    pickPawn: (x: number, y: number) => number | null;
    pick: (x: number, y: number) => Pick;
    camera?: THREE.PerspectiveCamera;
  },
  canvas: HTMLElement,
): boolean {
  if (state.winner !== null) return false;
  const currentSeat = state.turn;
  const player = state.players[currentSeat];
  if (!player) return false;

  // 1. Direct hit on current player's animal 3D mesh
  const pickedPawn = scene.pickPawn(clientX, clientY);
  if (pickedPawn === currentSeat) return true;
  // If explicitly tapped on an opponent's pawn, do not start animal gesture
  if (pickedPawn !== null && pickedPawn !== currentSeat) return false;

  // 2. Cell pick: the animal's own cell or an immediate neighbor (distance <= 1)
  const pick = scene.pick(clientX, clientY);
  if (pick && pick.kind === 'cell') {
    const dr = Math.abs(pick.r - player.r);
    const dc = Math.abs(pick.c - player.c);
    if (dr <= 1 && dc <= 1) return true;
  }

  // 3. Screen-space proximity fallback around the active animal
  if (scene.camera) {
    const worldPos = cellToWorld(player.r, player.c);
    worldPos.y = 0.35;
    const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
    if (rect.width > 0 && rect.height > 0) {
      const proj = worldPos.clone().project(scene.camera);
      const sx = rect.left + ((proj.x + 1) / 2) * rect.width;
      const sy = rect.top + ((-proj.y + 1) / 2) * rect.height;
      const dist = Math.hypot(clientX - sx, clientY - sy);
      const cellPx = Math.max(40, rect.width / 9);
      if (dist <= cellPx * 1.5) return true;
    }
  }

  return false;
}

/**
 * Resolves a swipe delta vector into one of the 4 cardinal directions:
 * 'forward', 'backward', 'left', or 'right', and finds the matching legal move action.
 */
export function resolveAnimalGesture(
  dx: number,
  dy: number,
  state: GameState,
  playerIdx: number,
  projectToScreen?: (pos: THREE.Vector3) => { x: number; y: number },
): AnimalGestureResolution {
  const p = state.players[playerIdx];
  const legals = legalMoves(state, playerIdx);

  // Define player-relative directions in board coordinates based on goal
  let forwardDelta: { dr: number; dc: number };
  let backwardDelta: { dr: number; dc: number };
  let leftDelta: { dr: number; dc: number };
  let rightDelta: { dr: number; dc: number };

  if (p.goal.axis === 'r') {
    const step = p.goal.value > p.r ? 1 : -1;
    forwardDelta = { dr: step, dc: 0 };
    backwardDelta = { dr: -step, dc: 0 };
    leftDelta = step < 0 ? { dr: 0, dc: -1 } : { dr: 0, dc: 1 };
    rightDelta = { dr: 0, dc: -leftDelta.dc };
  } else {
    const step = p.goal.value > p.c ? 1 : -1;
    forwardDelta = { dr: 0, dc: step };
    backwardDelta = { dr: 0, dc: -step };
    leftDelta = step > 0 ? { dr: -1, dc: 0 } : { dr: 1, dc: 0 };
    rightDelta = { dr: -leftDelta.dr, dc: 0 };
  }

  const cardinalDirs: Array<{
    name: AnimalGestureDirection;
    dr: number;
    dc: number;
  }> = [
    { name: 'forward', dr: forwardDelta.dr, dc: forwardDelta.dc },
    { name: 'backward', dr: backwardDelta.dr, dc: backwardDelta.dc },
    { name: 'left', dr: leftDelta.dr, dc: leftDelta.dc },
    { name: 'right', dr: rightDelta.dr, dc: rightDelta.dc },
  ];

  const dist = Math.hypot(dx, dy);
  if (dist === 0) {
    return { direction: 'forward', action: null };
  }
  const ndx = dx / dist;
  const ndy = dy / dist;

  let bestDir: AnimalGestureDirection = 'forward';
  let bestDirScore = -Infinity;

  if (projectToScreen) {
    const centerScreen = projectToScreen(cellToWorld(p.r, p.c));
    for (const card of cardinalDirs) {
      const neighborScreen = projectToScreen(cellToWorld(p.r + card.dr, p.c + card.dc));
      const vx = neighborScreen.x - centerScreen.x;
      const vy = neighborScreen.y - centerScreen.y;
      const vLen = Math.hypot(vx, vy);
      if (vLen > 0) {
        const dot = ndx * (vx / vLen) + ndy * (vy / vLen);
        if (dot > bestDirScore) {
          bestDirScore = dot;
          bestDir = card.name;
        }
      }
    }
  }

  // Fallback if no projectToScreen or if projection did not produce valid score
  if (bestDirScore === -Infinity) {
    if (Math.abs(dy) >= Math.abs(dx)) {
      bestDir = dy < 0 ? 'forward' : 'backward';
    } else {
      bestDir = dx < 0 ? 'left' : 'right';
    }
  }

  const chosenCard = cardinalDirs.find((c) => c.name === bestDir)!;

  // 1. Regular 1-step move in chosen direction
  const stepTarget = legals.find((m) => m.r === p.r + chosenCard.dr && m.c === p.c + chosenCard.dc);
  if (stepTarget) {
    return { direction: bestDir, action: { type: 'move', r: stepTarget.r, c: stepTarget.c } };
  }

  // 2. Straight jump (2 steps) over an opponent in chosen direction
  const jumpTarget = legals.find((m) => m.r === p.r + 2 * chosenCard.dr && m.c === p.c + 2 * chosenCard.dc);
  if (jumpTarget) {
    return { direction: bestDir, action: { type: 'move', r: jumpTarget.r, c: jumpTarget.c } };
  }

  // 3. Diagonal jump around an obstacle if straight path is blocked
  let bestDiag: { r: number; c: number } | null = null;
  let bestDiagScore = 0.3;

  if (projectToScreen) {
    const centerScreen = projectToScreen(cellToWorld(p.r, p.c));
    for (const m of legals) {
      const isDiag = Math.abs(m.r - p.r) === 1 && Math.abs(m.c - p.c) === 1;
      if (!isDiag) continue;
      const targetScreen = projectToScreen(cellToWorld(m.r, m.c));
      const vx = targetScreen.x - centerScreen.x;
      const vy = targetScreen.y - centerScreen.y;
      const vLen = Math.hypot(vx, vy);
      if (vLen > 0) {
        const dot = ndx * (vx / vLen) + ndy * (vy / vLen);
        if (dot > bestDiagScore) {
          bestDiagScore = dot;
          bestDiag = m;
        }
      }
    }
  } else {
    for (const m of legals) {
      const dr = m.r - p.r;
      const dc = m.c - p.c;
      const isDiag = Math.abs(dr) === 1 && Math.abs(dc) === 1;
      if (isDiag) {
        if (chosenCard.dr !== 0 && dr === chosenCard.dr) {
          bestDiag = m;
          break;
        }
        if (chosenCard.dc !== 0 && dc === chosenCard.dc) {
          bestDiag = m;
          break;
        }
      }
    }
  }

  if (bestDiag) {
    return { direction: bestDir, action: { type: 'move', r: bestDiag.r, c: bestDiag.c } };
  }

  const targetR = p.r + chosenCard.dr;
  const targetC = p.c + chosenCard.dc;
  const isOffBoard = targetR < 0 || targetR >= N || targetC < 0 || targetC >= N;
  return { direction: bestDir, action: null, reason: isOffBoard ? 'off_board' : 'blocked_by_hedge' };
}

function isSameAction(a: Action | null, b: Action | null): boolean {
  if (!a || !b) return false;
  if (a.type !== b.type) return false;
  if (a.type === 'move' && b.type === 'move') {
    return a.r === b.r && a.c === b.c;
  }
  if (a.type === 'wall' && b.type === 'wall') {
    return a.wall.r === b.wall.r && a.wall.c === b.wall.c && a.wall.o === b.wall.o;
  }
  return false;
}

function describeAction(action: Action): string {
  const notation = formatNotation(action).toUpperCase();
  if (action.type === 'move') {
    return `Move to ${notation}`;
  }
  return `Hedge · ${notation}`;
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
  private stagedAction: Action | null = null;
  private activeGesture: ActiveAnimalGesture | null = null;
  private abort = new AbortController();

  constructor(canvas: HTMLCanvasElement, scene: BoardScene, callbacks: InteractionCallbacks) {
    this.canvas = canvas;
    this.scene = scene;
    this.callbacks = callbacks;
    this.bindEvents();
  }

  getActiveGesture(): ActiveAnimalGesture | null {
    return this.activeGesture;
  }

  setHintAction(action: Action | null): void {
    this.currentHintAction = action;
  }

  getStagedAction(): Action | null {
    return this.stagedAction;
  }

  confirmStagedAction(): void {
    if (!this.stagedAction) return;
    const action = this.stagedAction;
    this.stagedAction = null;
    this.clearPreview();
    this.callbacks.onStageAction?.(null, '');
    this.callbacks.onAction(action);
  }

  cancelStagedAction(): void {
    if (!this.stagedAction) return;
    this.stagedAction = null;
    this.clearPreview();
    this.callbacks.onStageAction?.(null, '');
  }

  clearStagedAction(): void {
    this.cancelStagedAction();
  }

  clearPreview(): void {
    if (this.stagedAction) {
      if (this.stagedAction.type === 'move') {
        this.scene.showGhost(null);
        this.scene.hoverMarker(this.stagedAction);
      } else {
        this.scene.hoverMarker(null);
        this.scene.showGhost(this.stagedAction.wall, true);
      }
      return;
    }
    if (this.currentHintAction?.type === 'wall') {
      this.scene.showGhost(this.currentHintAction.wall, true, true);
    } else {
      this.scene.showGhost(null);
    }
    this.scene.hoverMarker(null);
    this.canvas.style.cursor = '';
  }

  dispose(): void {
    if (this.activeGesture && this.scene.controls) {
      this.scene.controls.enabled = true;
    }
    const state = this.callbacks.getState();
    if (state && this.activeGesture) {
      const currentSeat = state.turn;
      const p = state.players[currentSeat];
      if (p) this.scene.resetPawnGesture?.(currentSeat, { r: p.r, c: p.c });
    }
    this.activeGesture = null;
    this.abort.abort();
    this.clearStagedAction();
    this.clearPreview();
  }

  private bindEvents(): void {
    const signal = this.abort.signal;

    // Use capture phase for pointerdown so that we can intercept touches on the animal
    // before OrbitControls or BoardCameraRig start dragging/orbiting the camera.
    this.canvas.addEventListener(
      'pointerdown',
      (e) => this.onPointerDown(e),
      { capture: true, signal },
    );

    this.canvas.addEventListener(
      'pointermove',
      (e) => this.onPointerMove(e),
      { signal },
    );

    this.canvas.addEventListener(
      'pointerup',
      (e) => this.onPointerUp(e),
      { signal },
    );

    this.canvas.addEventListener(
      'pointercancel',
      (e) => this.onPointerCancel(e),
      { signal },
    );

    if (typeof window !== 'undefined') {
      window.addEventListener(
        'pointermove',
        (e) => {
          if (this.activeGesture && e.target !== this.canvas) {
            this.onPointerMove(e);
          }
        },
        { signal },
      );
      window.addEventListener(
        'pointerup',
        (e) => {
          if (this.activeGesture && e.target !== this.canvas) {
            this.onPointerUp(e);
          }
        },
        { signal },
      );
      window.addEventListener(
        'pointercancel',
        (e) => {
          if (this.activeGesture && e.target !== this.canvas) {
            this.onPointerCancel(e);
          }
        },
        { signal },
      );
    }

    this.canvas.addEventListener(
      'pointerleave',
      () => {
        if (!this.activeGesture) {
          this.clearPreview();
          this.callbacks.onHoverPawn(null);
        }
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

  private onPointerDown(e: PointerEvent): void {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    this.downAt = { x: e.clientX, y: e.clientY };

    const state = this.callbacks.getState();
    const isMobile = isMobileOrTouch(e);

    if (
      isMobile &&
      state &&
      this.callbacks.canAct() &&
      isAreaAroundAnimal(e.clientX, e.clientY, state, this.scene, this.canvas)
    ) {
      this.activeGesture = {
        pointerId: e.pointerId ?? 1,
        startX: e.clientX,
        startY: e.clientY,
        hasMovedPastThreshold: false,
        resolved: null,
      };

      if (this.scene.controls) {
        this.scene.controls.enabled = false;
      }

      if (this.canvas.setPointerCapture && e.pointerId !== undefined) {
        try {
          this.canvas.setPointerCapture(e.pointerId);
        } catch {}
      }

      e.stopImmediatePropagation?.();
    }
  }

  private onPointerMove(e: PointerEvent): void {
    // If active animal gesture in progress
    if (this.activeGesture && (e.pointerId === undefined || e.pointerId === this.activeGesture.pointerId)) {
      const dx = e.clientX - this.activeGesture.startX;
      const dy = e.clientY - this.activeGesture.startY;
      const dist = Math.hypot(dx, dy);

      const state = this.callbacks.getState();
      if (!state) return;

      const currentSeat = state.turn;
      const p = state.players[currentSeat];
      const fromCell = { r: p.r, c: p.c };

      const isOnBoard = this.scene.isOnBoard ? this.scene.isOnBoard(e.clientX, e.clientY) : true;
      if (!isOnBoard) {
        this.activeGesture.resolved = null;
        this.scene.resetPawnGesture?.(currentSeat, fromCell);
        this.clearPreview();
        return;
      }

      if (dist >= 6) {
        this.activeGesture.hasMovedPastThreshold = dist >= 14;

        const projectToScreen = this.scene.camera
          ? (pos: THREE.Vector3) => {
              const rect = this.canvas.getBoundingClientRect();
              const proj = pos.clone().project(this.scene.camera);
              return {
                x: rect.left + ((proj.x + 1) / 2) * rect.width,
                y: rect.top + ((-proj.y + 1) / 2) * rect.height,
              };
            }
          : undefined;

        const res = resolveAnimalGesture(dx, dy, state, currentSeat, projectToScreen);
        this.activeGesture.resolved = res;

        let toCell: { r: number; c: number };
        if (res.action) {
          toCell = { r: res.action.r, c: res.action.c };
        } else {
          const deltas: Record<AnimalGestureDirection, { dr: number; dc: number }> = {
            forward: currentSeat === 0 ? { dr: -1, dc: 0 } : { dr: 1, dc: 0 },
            backward: currentSeat === 0 ? { dr: 1, dc: 0 } : { dr: -1, dc: 0 },
            left: currentSeat === 0 ? { dr: 0, dc: -1 } : { dr: 0, dc: 1 },
            right: currentSeat === 0 ? { dr: 0, dc: 1 } : { dr: 0, dc: -1 },
          };
          const d = deltas[res.direction];
          toCell = { r: p.r + d.dr, c: p.c + d.dc };
        }

        // Shorter gesture moves lesser, up to half way towards destination
        const progress = Math.max(0, Math.min(1, (dist - 6) / 36));
        const isBlocked = !res.action;

        this.scene.setPawnGestureDrag?.(currentSeat, fromCell, toCell, progress, isBlocked);

        if (res.action) {
          this.scene.showGhost(null);
          this.scene.hoverMarker(res.action);
        } else {
          this.scene.hoverMarker(null);
        }
      } else {
        this.activeGesture.resolved = null;
        this.scene.resetPawnGesture?.(currentSeat, fromCell);
        this.clearPreview();
      }
      return;
    }

    if (this.stagedAction && isMobileOrTouch(e)) {
      return;
    }

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

  private onPointerUp(e: PointerEvent): void {
    if (this.activeGesture && (e.pointerId === undefined || e.pointerId === this.activeGesture.pointerId)) {
      if (this.canvas.releasePointerCapture && e.pointerId !== undefined && this.canvas.hasPointerCapture?.(e.pointerId)) {
        try {
          this.canvas.releasePointerCapture(e.pointerId);
        } catch {}
      }
      if (this.scene.controls) {
        this.scene.controls.enabled = true;
      }

      const gesture = this.activeGesture;
      this.activeGesture = null;

      const dx = e.clientX - gesture.startX;
      const dy = e.clientY - gesture.startY;
      const dist = Math.hypot(dx, dy);
      this.downAt = null;

      const state = this.callbacks.getState();
      const currentSeat = state ? state.turn : 0;
      const fromCell = state ? { r: state.players[currentSeat].r, c: state.players[currentSeat].c } : { r: 0, c: 0 };

      const isOnBoard = this.scene.isOnBoard ? this.scene.isOnBoard(e.clientX, e.clientY) : true;
      if (!isOnBoard) {
        this.scene.resetPawnGesture?.(currentSeat, fromCell);
        this.clearPreview();
        return;
      }

      if (gesture.hasMovedPastThreshold && dist >= 22) {
        if (gesture.resolved?.action) {
          const action = gesture.resolved.action;
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try {
              navigator.vibrate?.(20);
            } catch {}
          }
          this.clearStagedAction();
          this.clearPreview();
          this.callbacks.onAction(action);
          return;
        } else if (gesture.resolved) {
          this.scene.resetPawnGesture?.(currentSeat, fromCell);
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try {
              navigator.vibrate?.(40);
            } catch {}
          }
          this.clearPreview();
          const msg = gesture.resolved.reason === 'off_board' ? 'Cannot move off board' : 'Move blocked by hedge';
          this.callbacks.onToast(msg);
          return;
        }
      }

      this.scene.resetPawnGesture?.(currentSeat, fromCell);

      const threshold = e.pointerType === 'touch' ? 14 : 7;
      if (dist < threshold) {
        this.onClick(e);
      } else {
        this.clearPreview();
      }
      return;
    }

    if (!this.downAt) return;
    const moved = Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y);
    this.downAt = null;
    const threshold = e.pointerType === 'touch' ? 14 : 7;
    if (moved < threshold) this.onClick(e);
  }

  private onPointerCancel(e: PointerEvent): void {
    if (this.activeGesture && (e.pointerId === undefined || e.pointerId === this.activeGesture.pointerId)) {
      if (this.canvas.releasePointerCapture && e.pointerId !== undefined && this.canvas.hasPointerCapture?.(e.pointerId)) {
        try {
          this.canvas.releasePointerCapture(e.pointerId);
        } catch {}
      }
      if (this.scene.controls) {
        this.scene.controls.enabled = true;
      }
      const state = this.callbacks.getState();
      if (state) {
        const currentSeat = state.turn;
        const p = state.players[currentSeat];
        if (p) this.scene.resetPawnGesture?.(currentSeat, { r: p.r, c: p.c });
      }
      this.activeGesture = null;
      this.clearPreview();
    }
    this.downAt = null;
  }

  private onClick(e: PointerEvent): void {
    const state = this.callbacks.getState();
    if (!state || !this.callbacks.canAct()) return;
    const action = this.previewFor(this.scene.pick(e.clientX, e.clientY));
    if (!action) {
      if (this.stagedAction) {
        this.cancelStagedAction();
      }
      return;
    }
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

    if (isMobileOrTouch(e)) {
      if (isSameAction(this.stagedAction, action)) {
        this.confirmStagedAction();
        return;
      }
      this.stagedAction = action;
      if (action.type === 'move') {
        this.scene.showGhost(null);
        this.scene.hoverMarker(action);
      } else {
        this.scene.hoverMarker(null);
        this.scene.showGhost(action.wall, true);
      }
      this.callbacks.onStageAction?.(action, describeAction(action));
      return;
    }

    this.currentHintAction = null;
    this.stagedAction = null;
    this.callbacks.onStageAction?.(null, '');
    this.callbacks.onAction(action);
  }
}

