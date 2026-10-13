import baseStyles from './DialogBase.module.css';
import styles from './UndoDialog.module.css';
import { hudStore } from '../../hudStore';
import { ANIMALS } from '../../../game/animals';
import { Modal, DialogCloseButton } from './Modal';
import { sounds } from '../../../scene/sounds';

export function UndoDialog() {
  const undo = hudStore.undoBanner.value;
  const isVoting = undo.visible && Boolean(undo.onAccept || undo.onDecline);

  const animal = undo.requesterAnimal ? ANIMALS[undo.requesterAnimal] : null;
  const animalName = undo.requesterName ?? animal?.name ?? 'Opponent';
  const animalColor = animal?.color ?? '#4f9a35';
  const animalEmoji = animal?.emoji ?? '🐾';

  const handleDecline = () => {
    sounds.playTick();
    undo.onDecline?.();
  };

  const handleAccept = () => {
    sounds.playWhoosh();
    undo.onAccept?.();
  };

  return (
    <Modal
      id="undo-dialog"
      open={isVoting}
      onClose={handleDecline}
      className={styles.undoModal}
    >
      {isVoting ? (
        <div id="undo-banner" class={styles.bannerWrapper}>
          <form
            class={`${baseStyles.form} ${styles.undoForm}`}
            method="dialog"
            onSubmit={(e) => {
              e.preventDefault();
              handleAccept();
            }}
          >
            <DialogCloseButton id="btn-undo-close" onClick={handleDecline} />

            <div class={styles.heroSection}>
              <div
                class={styles.avatarGlow}
                style={{
                  '--animal-color': animalColor,
                }}
              >
                <span class={styles.avatarEmoji}>{animalEmoji}</span>
                <span class={styles.undoIconBadge} title="Undo">
                  ↩
                </span>
              </div>

              <div class={styles.titleGroup}>
                <span class={styles.badgeLabel}>Undo Request</span>
                <h2 id="undo-title" class={styles.title}>
                  Take Back Move?
                </h2>
              </div>

              <p id="undo-text" class={styles.message}>
                <strong style={{ color: animalColor }}>{animalName}</strong> asks to take back their last move.
              </p>
              <p class={styles.subtext}>
                If accepted, the board rewinds one step so they can choose a different move.
              </p>
            </div>

            <div id="undo-actions" class={styles.undoActions}>
              <button
                id="undo-decline"
                class={`ghost-btn ${styles.declineBtn}`}
                type="button"
                onClick={handleDecline}
              >
                <span class={styles.btnIcon} aria-hidden="true">
                  ✕
                </span>
                Decline
              </button>
              <button
                id="undo-accept"
                class={`primary-btn ${styles.acceptBtn}`}
                type="button"
                onClick={handleAccept}
              >
                <span class={styles.btnIcon} aria-hidden="true">
                  ✓
                </span>
                Allow Undo
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </Modal>
  );
}
