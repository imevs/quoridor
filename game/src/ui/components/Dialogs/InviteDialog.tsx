import baseStyles from './DialogBase.module.css';
import styles from './InviteDialog.module.css';
import { hudStore } from '../../hudStore';
import { Modal, DialogCloseButton, DialogHeader } from './Modal';
import { QRCodeCard } from '../QRCode';

export function InviteDialog() {
  const open = hudStore.inviteOpen.value;
  const link = hudStore.lobbyData.value?.link;
  const cb = hudStore.callbacks;

  const close = () => {
    hudStore.inviteOpen.value = false;
  };

  if (!link) return null;

  return (
    <Modal
      id="invite-dialog"
      open={open}
      onOpen={() => (hudStore.inviteOpen.value = true)}
      onClose={close}
    >
      <div class={baseStyles.form}>
        <DialogCloseButton id="btn-invite-x" onClick={close} />
        <DialogHeader
          title="Invite Players"
          desc="Share this link or scan the QR code to join or spectate this match."
          descId="invite-header-desc"
        />

        <div class={styles.inviteBox}>
          <div class={styles.inviteRow}>
            <input
              id="dialog-invite-link"
              class={styles.inviteInput}
              type="text"
              readOnly
              spellcheck={false}
              value={link}
              onFocus={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              id="btn-dialog-copy"
              class="ghost-btn small"
              type="button"
              onClick={() => cb.onLobbyCopy?.(link)}
            >
              Copy
            </button>
            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
              <button
                id="btn-dialog-share"
                class="ghost-btn small"
                type="button"
                onClick={() => {
                  void navigator.share({
                    title: 'Quoridors',
                    text: 'Join my Quoridors game',
                    url: link,
                  }).catch(() => {});
                }}
              >
                Share
              </button>
            )}
          </div>

          <div class={styles.qrWrapper}>
            <QRCodeCard link={link} />
          </div>
        </div>

        <div class={styles.actions}>
          <button id="btn-invite-close" class="ghost-btn" type="button" onClick={close}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
