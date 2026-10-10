import type { BoardScene } from '../scene/BoardScene';
import type { BoardInteractionManager } from '../scene/BoardInteraction';
import type { Hud, Seat } from './Hud';
import type { Action, GameState } from '../game/rules';
import { legalMoves } from '../game/rules';
import { TacticalCoach } from '../game/coach';
import { sounds } from '../scene/sounds';

export interface HintDelegate {
  getState: () => GameState | null;
  getSeats: () => Seat[];
  canAct: () => boolean;
  onSubmitAction: (action: Action) => void;
}

export interface HintCoordinatorOptions {
  hud: Hud;
  scene: BoardScene;
  interaction: BoardInteractionManager;
  delegate: HintDelegate;
}

/**
 * Coordinates tactical advice calculation, visual hints on the board,
 * and direct hint action execution.
 */
export class HintCoordinator {
  private hud: Hud;
  private scene: BoardScene;
  private interaction: BoardInteractionManager;
  private delegate: HintDelegate;
  private currentHintAction: Action | null = null;

  constructor(options: HintCoordinatorOptions) {
    this.hud = options.hud;
    this.scene = options.scene;
    this.interaction = options.interaction;
    this.delegate = options.delegate;
    this.bindEvents();
  }

  private bindEvents(): void {
    this.hud.hintBtn.addEventListener('click', () => this.requestHint());
    this.hud.hintEl.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('#btn-apply-hint');
      if (btn && this.currentHintAction) {
        const action = this.currentHintAction;
        this.clear();
        this.delegate.onSubmitAction(action);
      }
    });
  }

  clear(): void {
    this.currentHintAction = null;
    this.hud.hintEl.classList.remove('active-hint');
    this.interaction.setHintAction(null);
  }

  requestHint(): void {
    if (!this.delegate.canAct()) return;
    const state = this.delegate.getState();
    if (!state || state.winner !== null) return;
    const seats = this.delegate.getSeats();

    const rec = TacticalCoach.recommend(state, seats);
    this.currentHintAction = rec.action;
    this.interaction.setHintAction(rec.action);

    if (rec.action.type === 'move') {
      this.scene.showMoveMarkers(legalMoves(state, state.turn), { r: rec.action.r, c: rec.action.c });
      this.scene.showGhost(null);
    } else {
      this.scene.showGhost(rec.action.wall, true, true);
    }

    this.hud.hintEl.classList.add('active-hint');
    this.hud.setHint(
      `<span aria-hidden="true">💡</span> <span><strong>${rec.summary}</strong> — ${rec.detail}</span> <button id="btn-apply-hint" class="hint-action-btn" type="button">Play Move</button>`,
      true,
    );
    sounds.playTick();
    this.hud.toast(`💡 ${rec.summary}`);
  }
}
