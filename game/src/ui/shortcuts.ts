export interface ReplayKeyActions {
  togglePlay: () => void;
  prev: () => void;
  next: () => void;
  first: () => void;
  last: () => void;
}

export interface ShortcutActions {
  isModalOpen: () => boolean;
  isReplay: () => boolean;
  canToggleBot: () => boolean;
  onUndo: () => void;
  onHint: () => void;
  onCamera: () => void;
  onSound: () => void;
  onHistory: () => void;
  onMoves: () => void;
  onMenu: () => void;
  onToggleBotMatch: () => void;
  replay: ReplayKeyActions;
}

/**
 * Binds global keyboard shortcuts and handles modal dialog guarding.
 */
export function bindKeyboardShortcuts(actions: ShortcutActions, signal?: AbortSignal): void {
  window.addEventListener(
    'keydown',
    (e) => {
      if (actions.isModalOpen()) return;

      if (actions.isReplay()) {
        if (e.key === ' ' || e.code === 'Space') {
          e.preventDefault();
          actions.replay.togglePlay();
        } else if (e.key === 'ArrowLeft' || e.key === '[') {
          e.preventDefault();
          actions.replay.prev();
        } else if (e.key === 'ArrowRight' || e.key === ']') {
          e.preventDefault();
          actions.replay.next();
        } else if (e.key === 'Home') {
          e.preventDefault();
          actions.replay.first();
        } else if (e.key === 'End') {
          e.preventDefault();
          actions.replay.last();
        } else if (e.key === 'l' || e.key === 'L') {
          actions.onMoves();
        } else if (e.key === 'c' || e.key === 'C') {
          actions.onCamera();
        } else if (e.key === 'm' || e.key === 'M') {
          actions.onSound();
        } else if (e.key === 'Escape') {
          actions.onMenu();
        }
        return;
      }

      if (e.key === 'z' || e.key === 'Z') {
        actions.onUndo();
      } else if (e.key === 'i' || e.key === 'I' || e.key === '?') {
        actions.onHint();
      } else if (e.key === 'c' || e.key === 'C') {
        actions.onCamera();
      } else if (e.key === 'm' || e.key === 'M') {
        actions.onSound();
      } else if (e.key === 'h' || e.key === 'H') {
        actions.onHistory();
      } else if (e.key === 'l' || e.key === 'L') {
        actions.onMoves();
      } else if ((e.key === 's' || e.key === 'S') && actions.canToggleBot()) {
        actions.onToggleBotMatch();
      } else if (e.key === 'Escape') {
        actions.onMenu();
      }
    },
    { signal },
  );
}
