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
          class={`icon-btn small ${styles.iconBtn}`}
          type="button"
          title="First move (Home)"
          aria-label="First move"
          onClick={() => cb.onReplayFirst?.()}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <line x1="5" y1="5" x2="5" y2="19" />
            <polyline points="19 5 12 12 19 19" />
            <polyline points="12 5 5 12 12 19" />
          </svg>
        </button>

        <button
          id="btn-replay-prev"
          class={`icon-btn small ${styles.iconBtn}`}
          type="button"
          title="Previous move (Left arrow)"
          aria-label="Previous move"
          onClick={() => cb.onReplayPrev?.()}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
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
          <span id="replay-play-icon" class={styles.playIconHolder}>
            {replay.playing ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="6" y="5" width="4" height="14" rx="1.5" />
                <rect x="14" y="5" width="4" height="14" rx="1.5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true" class={styles.playSvg}>
                <polygon points="7 5 19 12 7 19" />
              </svg>
            )}
          </span>
        </button>

        <button
          id="btn-replay-next"
          class={`icon-btn small ${styles.iconBtn}`}
          type="button"
          title="Next move (Right arrow)"
          aria-label="Next move"
          onClick={() => cb.onReplayNext?.()}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <button
          id="btn-replay-last"
          class={`icon-btn small ${styles.iconBtn}`}
          type="button"
          title="Last move (End)"
          aria-label="Last move"
          onClick={() => cb.onReplayLast?.()}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <polyline points="5 5 12 12 5 19" />
            <polyline points="12 5 19 12 12 19" />
            <line x1="19" y1="5" x2="19" y2="19" />
          </svg>
        </button>
      </div>

      <div class={styles.replayMeta}>
        <span id="replay-step" class={styles.replayStep}>
          {replay.current} / {replay.total}
        </span>
        <button
          id="btn-replay-moves"
          class={`ghost-btn small ${styles.metaBtn}`}
          type="button"
          title="View move log"
          onClick={() => {
            if (cb.onShowMoves) cb.onShowMoves();
            else hudStore.movesOpen.value = true;
          }}
        >
          <svg viewBox="0 0 24 24" class={styles.metaBtnIcon} aria-hidden="true">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          <span>Moves</span>
        </button>
        <button
          id="btn-replay-exit"
          class={`ghost-btn small ${styles.metaBtn}`}
          type="button"
          title="Exit replay (Esc)"
          onClick={() => cb.onReplayExit?.()}
        >
          <svg viewBox="0 0 24 24" class={styles.metaBtnIcon} aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          <span>Exit</span>
        </button>
      </div>
    </div>
  );
}
