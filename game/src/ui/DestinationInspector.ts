import type { BoardScene } from '../scene/BoardScene';
import type { Hud, Seat } from './Hud';
import type { GameState } from '../game/rules';
import { formatGoalDescription, shortestPath } from '../game/rules';
import { ANIMALS } from '../game/animals';

export interface DestinationInspectorOptions {
  scene: BoardScene;
  hud: Hud;
  getState: () => GameState | null;
  getSeats: () => Seat[];
}

/**
 * Manages player destination preview and edge goal inspections on the 3D board and HUD.
 */
export class DestinationInspector {
  private scene: BoardScene;
  private hud: Hud;
  private getState: () => GameState | null;
  private getSeats: () => Seat[];
  private hoveredSeat: number | null = null;

  constructor(options: DestinationInspectorOptions) {
    this.scene = options.scene;
    this.hud = options.hud;
    this.getState = options.getState;
    this.getSeats = options.getSeats;
  }

  show(seatIndex: number): void {
    const state = this.getState();
    if (!state || seatIndex < 0 || seatIndex >= state.players.length) return;
    if (this.hoveredSeat === seatIndex) return;
    this.hoveredSeat = seatIndex;

    const seats = this.getSeats();
    const seat = seats[seatIndex];
    if (!seat) return;

    const p = state.players[seatIndex];
    const a = ANIMALS[seat.animal];
    const goalDesc = formatGoalDescription(p.goal);
    const steps = shortestPath(state, seatIndex);
    const stepsText = `${steps} step${steps === 1 ? '' : 's'} away`;

    const title = `${a.name}'s Destination`;
    const desc = `${goalDesc.edge} (${goalDesc.detail}) · ${stepsText}`;

    this.scene.showDestination(p.goal, a.color);
    this.hud.showDestination(seat, seatIndex, title, desc);
  }

  clear(): void {
    if (this.hud.isDestinationPinned) return;
    if (this.hoveredSeat === null) return;
    this.hoveredSeat = null;
    this.scene.showDestination(null);
    this.hud.hideDestination();
  }

  reset(): void {
    this.hoveredSeat = null;
    this.scene.showDestination(null);
    this.hud.hideDestination();
  }
}
