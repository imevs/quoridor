import styles from './Notifications.module.css';
import { hudStore } from '../../hudStore';
import { ANIMALS } from '../../../game/animals';

export function Notifications() {
  const hint = hudStore.hintState.value;
  const toast = hudStore.toastState.value;
  const dest = hudStore.destinationState.value;
  const undo = hudStore.undoBanner.value;
  const confirm = hudStore.confirmBanner.value;
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

      {/* Undo Waiting Banner (for requester while waiting for peers) */}
      {undo.visible && !undo.onAccept && !undo.onDecline && (
        <div id="undo-banner" class={styles.undoWaitingBanner} role="status" aria-live="polite">
          <span class={styles.waitingSpinner} aria-hidden="true">
            ⏳
          </span>
          <span id="undo-text" class={styles.waitingText}>
            {undo.text}
          </span>
        </div>
      )}

      {/* Mobile Move Confirmation Banner */}
      {confirm.visible && (
        <div id="confirm-banner" class={styles.confirmBanner} role="region" aria-label="Confirm move">
          <div class={styles.confirmInfo}>
            <span class={styles.confirmIcon} aria-hidden="true">
              {confirm.action?.type === 'wall' ? '🌿' : '🐾'}
            </span>
            <span id="confirm-text" class={styles.confirmText}>
              {confirm.text}
            </span>
          </div>
          <div id="confirm-actions" class={styles.confirmActions}>
            <button
              id="btn-confirm-cancel"
              class="ghost-btn small"
              type="button"
              aria-label="Cancel move"
              onClick={confirm.onCancel}
            >
              Cancel
            </button>
            <button
              id="btn-confirm-move"
              class="primary-btn small"
              type="button"
              aria-label="Confirm move"
              onClick={confirm.onConfirm}
            >
              ✓ Confirm
            </button>
          </div>
        </div>
      )}
    </>
  );
}
