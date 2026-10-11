import baseStyles from './DialogBase.module.css';
import historyStyles from '../HistoryPanels/HistoryPanels.module.css';
import { hudStore } from '../../hudStore';
import { ANIMALS } from '../../../game/animals';
import { formatActionDescription, formatNotation } from '../../../game/replay';
import { Modal, DialogCloseButton, DialogHeader } from './Modal';

export function MovesDialog() {
  const open = hudStore.movesOpen.value;
  const data = hudStore.movesData.value;

  const close = () => {
    hudStore.movesOpen.value = false;
  };

  return (
    <Modal
      id="moves-dialog"
      open={open}
      onOpen={() => (hudStore.movesOpen.value = true)}
      onClose={close}
    >
      <div class={baseStyles.form}>
        <DialogCloseButton id="btn-moves-x" onClick={close} />
        <DialogHeader
          title="Move History"
          desc={data.onSelect ? 'Click any move to jump to that board position' : `${data.actions.length} total moves`}
          descId="moves-subtitle"
        />

        <div id="moves-list" class={historyStyles.movesList}>
          {data.actions.length === 0 ? (
            <div class={historyStyles.historyEmpty}>No moves made yet.</div>
          ) : (
            data.actions.map((act, i) => {
              const seat = data.seats.length > 0 ? data.seats[i % data.seats.length] : undefined;
              const a = seat ? ANIMALS[seat.animal] : null;
              const desc = formatActionDescription(act, seat?.animal);
              const notation = formatNotation(act);
              const isActive = data.currentStep === i + 1;

              return (
                <div
                  key={i}
                  class={`${historyStyles.moveItem} ${isActive ? historyStyles.active : ''}`}
                  onClick={() => {
                    if (data.onSelect) {
                      close();
                      data.onSelect(i + 1);
                    }
                  }}
                >
                  <span class={historyStyles.moveNum}>#{i + 1}</span>
                  {a && <span style={{ marginRight: '6px' }}>{a.emoji}</span>}
                  <span class={historyStyles.moveDesc}>{desc}</span>
                  <span class={historyStyles.moveNotation}>{notation}</span>
                </div>
              );
            })
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button
            id="btn-close-moves"
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
