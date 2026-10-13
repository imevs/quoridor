import styles from './ReplayBar.module.css';
import { hudStore } from '../../hudStore';

export function ReplayBar() {
  const replay = hudStore.replayState.value;
  const cb = hudStore.callbacks;

  if (!replay.visible) return null;

  return (
    <div id="replay-bar" class={styles.replayBar}>
      <div class={styles.replayInfo}>
        <span id="replay-title" class={styles.replayTitle}>
          {replay.title}
        </span>
        <span id="replay-move-desc" class={styles.replayMoveDesc}>
          {replay.desc}
        </span>
      </div>

      <div class={styles.replayControls}>
        <button
          id="btn-replay-first"
          class="icon-btn small"
          type="button"
          title="First move (Home)"
          aria-label="First move"
          onClick={() => cb.onReplayFirst?.()}
        >
          <svg viewBox="0 0 24 24">
            <polyline points="11 19 4 12 11 5" />
            <polyline points="18 19 11 12 18 5" />
          </svg>
        </button>

        <button
          id="btn-replay-prev"
          class="icon-btn small"
          type="button"
          title="Previous move (Left arrow)"
          aria-label="Previous move"
          onClick={() => cb.onReplayPrev?.()}
        >
          <svg viewBox="0 0 24 24">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <button
          id="btn-replay-play"
          class={`primary-btn small ${styles.replayPlayBtn}`}
          type="button"
          title="Play / Pause (Space)"
          aria-label="Play"
          onClick={() => cb.onReplayPlay?.()}
        >
          <span id="replay-play-icon">{replay.playing ? '⏸' : '▶'}</span>
        </button>

        <button
          id="btn-replay-next"
          class="icon-btn small"
          type="button"
          title="Next move (Right arrow)"
          aria-label="Next move"
          onClick={() => cb.onReplayNext?.()}
        >
          <svg viewBox="0 0 24 24">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <button
          id="btn-replay-last"
          class="icon-btn small"
          type="button"
          title="Last move (End)"
          aria-label="Last move"
          onClick={() => cb.onReplayLast?.()}
        >
          <svg viewBox="0 0 24 24">
            <polyline points="13 19 20 12 13 5" />
            <polyline points="6 19 13 12 6 5" />
          </svg>
        </button>
      </div>

      <div class={styles.replayMeta}>
        <span id="replay-step" class={styles.replayStep}>
          {replay.current} / {replay.total}
        </span>
        <button
          id="btn-replay-moves"
          class="ghost-btn small"
          type="button"
          title="View move log"
          onClick={() => {
            if (cb.onShowMoves) cb.onShowMoves();
            else hudStore.movesOpen.value = true;
          }}
        >
          Moves
        </button>
        <button
          id="btn-replay-exit"
          class="ghost-btn small"
          type="button"
          title="Exit replay (Esc)"
          onClick={() => cb.onReplayExit?.()}
        >
          Exit
        </button>
      </div>
    </div>
  );
}
