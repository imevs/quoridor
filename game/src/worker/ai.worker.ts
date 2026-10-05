import type { Action, GameState } from '../game/rules';
import { chooseAction, type Difficulty } from '../game/ai';

export interface AiWorkerRequest {
  id: number;
  state: GameState;
  difficulty: Difficulty;
}

export interface AiWorkerResponse {
  id: number;
  action: Action;
}

self.onmessage = (e: MessageEvent<AiWorkerRequest>) => {
  const { id, state, difficulty } = e.data;
  const action = chooseAction(state, difficulty);
  self.postMessage({ id, action } satisfies AiWorkerResponse);
};
