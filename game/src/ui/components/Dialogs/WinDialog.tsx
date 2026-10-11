import baseStyles from './DialogBase.module.css';
import styles from './WinDialog.module.css';
import { hudStore } from '../../hudStore';
import { ANIMALS } from '../../../game/animals';
import { Modal, DialogCloseButton, DialogHeader } from './Modal';

export function WinDialog() {
  const open = hudStore.winOpen.value;
  const data = hudStore.winData.value;
  const cb = hudStore.callbacks;

  const close = (retVal?: string) => {
    const el = document.getElementById('win-dialog') as HTMLDialogElement | null;
    if (el && el.open) {
      if (retVal !== undefined) el.close(retVal);
      else el.close();
    }
    hudStore.winOpen.value = false;
  };

  if (!data) return null;

  const a = ANIMALS[data.seat.animal];

  return (
    <Modal
      id="win-dialog"
      open={open}
      onOpen={() => (hudStore.winOpen.value = true)}
      onClose={() => (hudStore.winOpen.value = false)}
    >
      <form
        class={`${baseStyles.form} ${styles.winCenter}`}
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          close();
        }}
      >
        <DialogCloseButton id="btn-win-x" onClick={() => close()} />
        <DialogHeader title={data.title} desc={data.sub} titleId="win-title" descId="win-sub">
          <div class={styles.winEmoji} id="win-emoji">
            {a.emoji}
          </div>
        </DialogHeader>
        <div class={styles.winActions}>
          <button
            id="btn-win-moves"
            class="ghost-btn"
            type="button"
            onClick={() => {
              close();
              document.getElementById('btn-moves')?.click();
            }}
          >
            List of steps
          </button>
          <button
            id="btn-win-close"
            class="ghost-btn"
            type="button"
            onClick={() => close()}
          >
            Close
          </button>
          <button
            class="ghost-btn"
            type="button"
            onClick={() => {
              close('menu');
              cb.onMenuFromWin?.();
            }}
          >
            New setup
          </button>
          {data.canRematch && (
            <button
              id="btn-again"
              class="primary-btn"
              type="button"
              onClick={() => {
                close('again');
                cb.onRematch?.();
              }}
            >
              Play again
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
