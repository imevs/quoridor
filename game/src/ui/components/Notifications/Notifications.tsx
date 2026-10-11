import styles from './Notifications.module.css';
import { hudStore } from '../../hudStore';
import { ANIMALS } from '../../../game/animals';

export function Notifications() {
  const hint = hudStore.hintState.value;
  const toast = hudStore.toastState.value;
  const dest = hudStore.destinationState.value;
  const undo = hudStore.undoBanner.value;
  const cb = hudStore.callbacks;

  const destAnimal = dest ? ANIMALS[dest.seat.animal] : null;

  return (
    <>
      {/* Tactical Hint */}
      {hint.html ? (
        <div
          id="hint"
          class={`${styles.hint} ${hint.active ? styles.activeHint : ''}`}
          onClick={(e) => {
            const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('#btn-apply-hint');
            if (btn) cb.onApplyHint?.();
          }}
          dangerouslySetInnerHTML={{ __html: hint.html }}
        />
      ) : (
        <div id="hint" class={styles.hint} hidden />
      )}

      {/* Toast popup */}
      <div
        id="toast"
        class={`${styles.toast} ${toast.visible ? styles.show : ''}`}
        role="status"
        aria-live="polite"
      >
        {toast.message}
      </div>

      {/* Destination popup */}
      {dest && destAnimal && (
        <div
          id="destination-pill"
          class={styles.destinationPill}
          style={{ '--pc': destAnimal.color }}
        >
          <span id="dest-avatar" class={styles.destAvatar}>
            {destAnimal.emoji}
          </span>
          <div class={styles.destInfo}>
            <span id="dest-title" class={styles.destTitle}>
              {dest.title}
            </span>
            <span id="dest-desc" class={styles.destDesc}>
              {dest.desc}
            </span>
          </div>
        </div>
      )}

      {/* Undo Banner */}
      {undo.visible && (
        <div id="undo-banner" class={styles.undoBanner}>
          <span id="undo-text" class={styles.undoText}>
            {undo.text}
          </span>
          {(undo.onAccept || undo.onDecline) && (
            <div id="undo-actions" class={styles.undoActions}>
              {undo.onDecline && (
                <button
                  id="undo-decline"
                  class="ghost-btn small"
                  type="button"
                  onClick={undo.onDecline}
                >
                  Decline
                </button>
              )}
              {undo.onAccept && (
                <button
                  id="undo-accept"
                  class="primary-btn small"
                  type="button"
                  onClick={undo.onAccept}
                >
                  Accept
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
