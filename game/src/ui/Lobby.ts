import type { Difficulty } from '../game/ai';
import type { SessionView } from '../game/protocol';
import { hudStore } from './hudStore';

export interface LobbyHandlers {
  onSeat(seat: number, kind: 'open' | 'ai', difficulty: Difficulty): void;
  onStart(): void;
  onLeave(): void;
  onCopy(link: string): void;
}

/** Waiting-room dialog for online games. Only bundled in the online build. */
export class Lobby {
  constructor(handlers: LobbyHandlers) {
    hudStore.callbacks.onLobbySeat = (seat, kind, diff) => handlers.onSeat(seat, kind, diff);
    hudStore.callbacks.onLobbyStart = () => handlers.onStart();
    hudStore.callbacks.onLobbyLeave = () => handlers.onLeave();
    hudStore.callbacks.onLobbyCopy = (link) => handlers.onCopy(link);
  }

  get dialog(): HTMLDialogElement {
    return document.getElementById('lobby-dialog') as HTMLDialogElement;
  }

  render(v: SessionView, mySeat: number | null, link: string): void {
    hudStore.lobbyData.value = { view: v, mySeat, link };
    hudStore.lobbyOpen.value = true;
  }

  close(): void {
    hudStore.lobbyOpen.value = false;
    const el = document.getElementById('lobby-dialog') as HTMLDialogElement | null;
    if (el && el.open) {
      try {
        el.close();
      } catch {
        /* ignore */
      }
    }
  }

  dispose(): void {
    this.close();
  }
}
