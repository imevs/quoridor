import type { Action, GameState } from '../game/rules';
import type { Seat } from '../ui/Hud';

/** Changes the presenter (main.ts) applies to the scene, in order. */
export type Update =
  | { type: 'reset'; state: GameState; seats: Seat[] }
  | { type: 'action'; seat: number; action: Action; state: GameState }
  | { type: 'sync'; state: GameState }
  | { type: 'seats'; seats: Seat[] };

export type ControllerKind = 'ai' | 'local' | 'online' | 'bot_vs_bot' | 'replay';

/**
 * Source of truth for a game as seen by the presenter. The local controller
 * runs the rules engine in-process; the online controller mirrors the server.
 */
export interface GameController {
  readonly kind: ControllerKind;
  onUpdate: (u: Update) => void;
  /** Called when the game ends without the user choosing to leave (e.g. game not found). */
  onExit: (message?: string) => void;
  start(restoreExisting?: boolean): void;
  submit(action: Action): void;
  /** Whether this client may act for the current turn. */
  canAct(state: GameState): boolean;
  canUndo(): boolean;
  undo(): void;
  canRematch(): boolean;
  rematch(): void;
  /** Seat the camera should frame. */
  viewSeat(state: GameState): number;
  /** The presenter has finished animating all queued updates. */
  idle(): void;
  dispose(): void;
}
