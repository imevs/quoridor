import baseStyles from './DialogBase.module.css';
import historyStyles from '../HistoryPanels/HistoryPanels.module.css';
import { hudStore } from '../../hudStore';
import { ANIMALS } from '../../../game/animals';
import { MatchHistoryManager } from '../../../game/history';
import { sounds } from '../../../scene/sounds';
import { Modal, DialogCloseButton, DialogHeader } from './Modal';

export function HistoryDialog() {
  const open = hudStore.historyOpen.value;
  const records = hudStore.historyRecords.value;
  const cb = hudStore.callbacks;

  const close = () => {
    hudStore.historyOpen.value = false;
  };

  return (
    <Modal
      id="history-dialog"
      open={open}
      onOpen={() => (hudStore.historyOpen.value = true)}
      onClose={close}
    >
      <div class={baseStyles.form}>
        <DialogCloseButton id="btn-history-x" onClick={close} />
        <DialogHeader title="Match History" desc="Recent completed games and outcomes" />

        <div id="history-list" class={historyStyles.historyList}>
          {records.length === 0 ? (
            <div class={historyStyles.historyEmpty}>No matches recorded yet.</div>
          ) : (
            records.map((r) => {
              const a = ANIMALS[r.winnerAnimal] ?? ANIMALS.fox;
              const dateStr = new Date(r.date).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
              return (
                <div key={r.id} class={historyStyles.historyItem} style={{ '--pc': a.color }}>
                  <span class={historyStyles.historyAvatar}>{a.emoji}</span>
                  <div class={historyStyles.historyItemMain}>
                    <b>
                      {a.name} won
                      <span class="badge you">{r.mode}</span>
                    </b>
                    <small>
                      {r.players} players · {r.movesCount} moves · {r.wallsCount} walls
                    </small>
                  </div>
                  <div class={historyStyles.historyItemMeta}>
                    <span>{dateStr}</span>
                    {r.actions && r.actions.length > 0 && (
                      <div class={historyStyles.historyItemActions}>
                        <button
                          class="ghost-btn small btn-replay-match"
                          data-id={r.id}
                          type="button"
                          onClick={() => {
                            close();
                            cb.onStartReplay?.(r);
                          }}
                        >
                          Replay
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div class={historyStyles.historyActions}>
          <button
            id="btn-clear-history"
            class="ghost-btn small"
            type="button"
            onClick={() => {
              cb.onClearHistory?.();
              MatchHistoryManager.clear();
              sounds.playTick();
              hudStore.historyRecords.value = [];
            }}
          >
            Clear
          </button>
          <button
            id="btn-close-history"
            class="primary-btn"
            type="button"
            onClick={close}
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
