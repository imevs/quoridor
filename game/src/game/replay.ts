import { type Action, type GameState, applyAction, cloneState, createGame } from './rules';
import { ANIMALS, type AnimalId } from './animals';

const COLS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
const WALL_COLS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

/** Returns algebraic notation: e.g. "e2" for moves, "e3h" / "d4v" for walls. */
export function formatNotation(action: Action): string {
  if (action.type === 'move') {
    return `${COLS[action.c]}${9 - action.r}`;
  }
  return `${WALL_COLS[action.wall.c]}${8 - action.wall.r}${action.wall.o}`;
}

/** Returns human-readable description: e.g. "Fox moved to e2" or "Wolf placed horizontal wall at e3". */
export function formatActionDescription(action: Action, animal?: AnimalId): string {
  const name = animal && ANIMALS[animal] ? ANIMALS[animal].name : 'Player';
  const emoji = animal && ANIMALS[animal] ? ANIMALS[animal].emoji : '♟';
  const notation = formatNotation(action);

  if (action.type === 'move') {
    return `${emoji} ${name} moved to ${notation}`;
  }
  const orient = action.wall.o === 'h' ? 'horizontal' : 'vertical';
  return `${emoji} ${name} placed ${orient} wall at ${notation}`;
}

/** Reconstructs full state snapshots before every move up to the final board. */
export function reconstructStates(players: 2 | 4, actions: Action[]): GameState[] {
  const initial = createGame(players);
  const states: GameState[] = [cloneState(initial)];
  let current = cloneState(initial);

  for (const action of actions) {
    applyAction(current, action);
    states.push(cloneState(current));
  }

  return states;
}
