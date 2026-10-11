import baseStyles from './DialogBase.module.css';
import styles from './LobbyDialog.module.css';
import { hudStore } from '../../hudStore';
import { ANIMALS } from '../../../game/animals';
import type { Difficulty } from '../../../game/ai';
import { Modal, DialogCloseButton, DialogHeader } from './Modal';

const LEVEL: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

export function LobbyDialog() {
  const open = hudStore.lobbyOpen.value;
  const data = hudStore.lobbyData.value;
  const cb = hudStore.callbacks;

  const close = () => {
    hudStore.lobbyOpen.value = false;
  };

  if (!data) return null;

  const { view: v, mySeat, link } = data;
  const isHost = mySeat === v.hostSeat;
  const ready = v.seats.every((s) => s.kind !== 'open');

  let statusText = 'Invite players or assign the computer to open seats.';
  if (mySeat === null) {
    statusText = v.seats.some((s) => s.kind === 'open')
      ? 'Connecting to session…'
      : 'This game is full — you will watch as a spectator.';
  } else if (!isHost) {
    statusText = 'Waiting for the host to start the game…';
  } else if (ready) {
    statusText = 'Everyone is here. Ready when you are!';
  }

  const handleUserLeave = () => {
    close();
    cb.onLobbyLeave?.();
  };

  return (
    <Modal
      id="lobby-dialog"
      open={open}
      onOpen={() => (hudStore.lobbyOpen.value = true)}
      onClose={() => {
        hudStore.lobbyOpen.value = false;
      }}
    >
      <div class={baseStyles.form}>
        <DialogCloseButton id="btn-lobby-x" onClick={handleUserLeave} />
        <DialogHeader title="Online Game" desc={statusText} descId="lobby-status" />

        <div class={styles.inviteBox}>
          <label for="invite-link" class={baseStyles.fieldLabel}>
            Invite link
          </label>
          <div class={styles.inviteRow}>
            <input
              id="invite-link"
              class={styles.inviteInput}
              type="text"
              readOnly
              spellcheck={false}
              value={link}
              onFocus={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              id="btn-copy"
              class="ghost-btn small"
              type="button"
              onClick={() => cb.onLobbyCopy?.(link)}
            >
              Copy
            </button>
            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
              <button
                id="btn-share"
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
        </div>

        <div class={baseStyles.field}>
          <span class={baseStyles.fieldLabel}>Players</span>
          <ul id="lobby-seats" class={styles.lobbySeats}>
            {v.seats.map((s, i) => {
              const a = ANIMALS[s.animal];
              let occupant = 'Waiting for player…';
              if (s.kind === 'ai') occupant = `Computer · ${LEVEL[s.difficulty]}`;
              else if (s.kind === 'human') occupant = s.connected ? 'Connected' : 'Away';

              const tags = [i === v.hostSeat ? 'Host' : '', i === mySeat ? 'You' : ''].filter(Boolean);
              const editable = isHost && i !== v.hostSeat && !(s.kind === 'human' && s.connected);

              return (
                <li
                  key={i}
                  class={styles.lobbySeat}
                  style={{ '--pc': a.color }}
                >
                  <span class={styles.lobbyAvatar} aria-hidden="true">
                    {a.emoji}
                  </span>
                  <span class={styles.lobbySeatMain}>
                    <b>
                      {a.name}
                      {tags.map((t) => (
                        <span key={t} class="badge you">
                          {t}
                        </span>
                      ))}
                    </b>
                    <small>{occupant}</small>
                  </span>
                  {editable && (
                    <select
                      class={styles.lobbySelect}
                      data-seat={i}
                      aria-label={`Seat ${i + 1} occupant`}
                      value={s.kind === 'open' ? 'open' : `ai:${s.difficulty}`}
                      onChange={(e) => {
                        const val = (e.target as HTMLSelectElement).value;
                        const [kind, diff] = val.split(':');
                        if (kind === 'open') cb.onLobbySeat?.(i, 'open', 'medium');
                        else if (kind === 'ai') cb.onLobbySeat?.(i, 'ai', diff as Difficulty);
                      }}
                    >
                      <option value="open">Open seat</option>
                      <option value="ai:easy">Computer · Easy</option>
                      <option value="ai:medium">Computer · Medium</option>
                      <option value="ai:hard">Computer · Hard</option>
                    </select>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div class={styles.lobbyActions}>
          <button
            id="btn-leave"
            class="ghost-btn"
            type="button"
            onClick={handleUserLeave}
          >
            Leave
          </button>
          {isHost && (
            <button
              id="btn-lobby-start"
              class="primary-btn"
              type="button"
              disabled={!ready}
              onClick={() => {
                console.log('[LobbyDialog] Host clicked Start Game button');
                close();
                cb.onLobbyStart?.();
              }}
            >
              Start Game
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
