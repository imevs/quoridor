import {
  type Action,
  type GameState,
  applyAction,
  cloneState,
  shortestPath,
} from './rules';
import { ANIMALS, type AnimalId } from './animals';
import { chooseAction } from './ai';

export interface ActionExplanation {
  summary: string;
  detail: string;
}

export interface TacticalRecommendation {
  action: Action;
  summary: string;
  detail: string;
}

export interface SeatInfo {
  animal: AnimalId;
}

/**
 * Pure, deterministic tactical coaching and advice engine.
 * Computes lookahead recommendations, explains tactical impacts (tempo, delay, victory),
 * and generates live race-status tactical advice.
 */
export class TacticalCoach {
  /**
   * Generates a lookahead recommendation with human-friendly tactical explanation.
   */
  static recommend(state: GameState, seats?: SeatInfo[]): TacticalRecommendation {
    const action = chooseAction(state, 'hard');
    const explanation = this.explain(state, action, seats);
    return {
      action,
      ...explanation,
    };
  }

  /**
   * Produces tempo, delay, detour, and goal explanations for any candidate action.
   */
  static explain(state: GameState, action: Action, seats?: SeatInfo[]): ActionExplanation {
    const me = state.turn;
    const myPlayer = state.players[me];
    const myDist = shortestPath(state, me);

    if (action.type === 'move') {
      const isJump = Math.abs(action.r - myPlayer.r) + Math.abs(action.c - myPlayer.c) > 1;
      const sNext = cloneState(state);
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

    const sNext = cloneState(state);
    applyAction(sNext, action);

    let bestDelay = 0;
    let targetAnimal = '';
    for (let i = 0; i < state.players.length; i++) {
      if (i === me) continue;
      const before = shortestPath(state, i);
      const after = shortestPath(sNext, i);
      const delay = after - before;
      if (delay > bestDelay) {
        bestDelay = delay;
        const seatAnimal = seats?.[i]?.animal;
        targetAnimal = seatAnimal && ANIMALS[seatAnimal] ? ANIMALS[seatAnimal].name : `Player ${i + 1}`;
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

  /**
   * Generates dynamic in-game tactical advice comparing race distance, lead, and threat urgency.
   */
  static getStatusAdvice(state: GameState, me: number, seats?: SeatInfo[]): string {
    const myDist = shortestPath(state, me);
    let minOppDist = Infinity;
    let leaderSeat = -1;

    for (let i = 0; i < state.players.length; i++) {
      if (i === me) continue;
      const d = shortestPath(state, i);
      if (d < minOppDist) {
        minOppDist = d;
        leaderSeat = i;
      }
    }

    const seatAnimal = leaderSeat !== -1 ? seats?.[leaderSeat]?.animal : undefined;
    const leaderName = seatAnimal && ANIMALS[seatAnimal] ? ANIMALS[seatAnimal].name : 'Opponent';
    const hasWalls = state.players[me].walls > 0;
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
