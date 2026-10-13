import baseStyles from './DialogBase.module.css';
import styles from './JoinDialog.module.css';
import { hudStore } from '../../hudStore';
import { Modal, DialogCloseButton } from './Modal';
import { sounds } from '../../../scene/sounds';

export function JoinDialog() {
  const open = hudStore.joinOpen.value;
  const data = hudStore.joinData.value;

  if (!data) return null;

  const handleDecline = () => {
    sounds.playTick();
    data.onDecline();
  };

  const handleConfirm = () => {
    sounds.playWhoosh();
    data.onConfirm();
  };

  const displayCode = data.gameId.toUpperCase();
  const modeLabel = data.mode === 'p2p' ? 'Peer-to-Peer Match' : 'Online Match';

  return (
    <Modal
      id="join-dialog"
      open={open}
      onClose={handleDecline}
      className={styles.joinModal}
    >
      <form
        class={`${baseStyles.form} ${styles.joinForm}`}
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          handleConfirm();
        }}
      >
        <DialogCloseButton id="btn-join-x" onClick={handleDecline} />

        <div class={styles.heroIcon} aria-hidden="true">
          🐾
        </div>

        <span class={styles.badgeTag}>{modeLabel}</span>

        <h2 id="join-title" class={styles.title}>
          Join Game?
        </h2>

        <div class={styles.roomPill} id="join-room-pill">
          <span>Room Code:</span>
          <strong>{displayCode}</strong>
        </div>

        <p class={styles.desc}>
          You have been invited to play a live Quoridors game.
        </p>
        <p class={styles.subtext}>
          Race your animal across the board, build hedge mazes, and outsmart your opponent!
        </p>

        <div class={styles.actions}>
          <button
            id="btn-join-decline"
            class={`ghost-btn ${styles.declineBtn}`}
            type="button"
            onClick={handleDecline}
          >
            <span aria-hidden="true">✕</span>
            Decline
          </button>
          <button
            id="btn-join-confirm"
            class={`primary-btn ${styles.confirmBtn}`}
            type="submit"
          >
            <span aria-hidden="true">✓</span>
            Join Game
          </button>
        </div>
      </form>
    </Modal>
  );
}
