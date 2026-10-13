import baseStyles from './DialogBase.module.css';
import styles from './MenuDialog.module.css';
import { hudStore } from '../../hudStore';
import { ANIMALS, ANIMAL_ORDER } from '../../../game/animals';
import type { Difficulty } from '../../../game/ai';
import type { GameMode, GameConfig } from '../../Hud';
import { Modal, DialogCloseButton, DialogHeader } from './Modal';

export function MenuDialog() {
  const open = hudStore.menuOpen.value;
  const cfg = hudStore.gameConfig.value;
  const botMatchActive = hudStore.botMatchActive.value;
  const cb = hudStore.callbacks;

  const update = (patch: Partial<GameConfig>) => {
    const next = { ...cfg, ...patch };
    hudStore.gameConfig.value = next;
    try {
      localStorage.setItem('quoridors.config', JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const close = (retVal?: string) => {
    const el = document.getElementById('menu-dialog') as HTMLDialogElement | null;
    if (el && el.open) {
      if (retVal !== undefined) el.close(retVal);
      else el.close();
    }
    hudStore.menuOpen.value = false;
    cb.onCloseMenu?.();
  };

  const handleStart = (e: Event) => {
    e.preventDefault();
    close('start');
    cb.onStartGame?.(cfg);
  };

  return (
    <Modal
      id="menu-dialog"
      open={open}
      onOpen={() => (hudStore.menuOpen.value = true)}
      onClose={() => {
        hudStore.menuOpen.value = false;
        cb.onCloseMenu?.();
      }}
    >
      <form id="menu-form" method="dialog" class={baseStyles.form} onSubmit={handleStart}>
        <DialogCloseButton id="btn-menu-x" onClick={() => close()} />

        <DialogHeader
          title="New Game"
          desc="Reach the opposite edge first. Place walls to delay your rivals."
        />

        {/* Mode */}
        <fieldset class={baseStyles.field}>
          <legend class={styles.fieldLegend}>Mode</legend>
          <div class={`${styles.segmented} ${styles.modeSegmented}`}>
            {[
              { val: 'ai', label: 'vs Computer' },
              { val: 'local', label: 'Pass & Play' },
              { val: 'p2p', label: 'P2P Online' },
              ...(__ONLINE__ ? [{ val: 'online', label: 'Play with Server' }] : []),
              { val: 'bot_vs_bot', label: 'Bots Only' },
            ].map(({ val, label }) => (
              <label key={val}>
                <input
                  type="radio"
                  name="mode"
                  value={val}
                  checked={cfg.mode === val}
                  onChange={() => update({ mode: val as GameMode })}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Players */}
        <fieldset class={baseStyles.field}>
          <legend class={styles.fieldLegend}>Players</legend>
          <div class={styles.segmented}>
            {([2, 4] as const).map((count) => (
              <label key={count}>
                <input
                  type="radio"
                  name="players"
                  value={count}
                  checked={cfg.players === count}
                  onChange={() => update({ players: count })}
                />
                <span>{count} players</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Difficulty (vs AI only) */}
        {cfg.mode === 'ai' && (
          <fieldset class={baseStyles.field} id="difficulty-field">
            <legend class={styles.fieldLegend}>Difficulty</legend>
            <div class={styles.segmented}>
              {(['easy', 'medium', 'hard'] as const).map((diff) => (
                <label key={diff}>
                  <input
                    type="radio"
                    name="difficulty"
                    value={diff}
                    checked={cfg.difficulty === diff}
                    onChange={() => update({ difficulty: diff as Difficulty })}
                  />
                  <span>{diff.charAt(0).toUpperCase() + diff.slice(1)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {/* Chess Clock (Timer) */}
        {cfg.mode !== 'bot_vs_bot' && (
          <fieldset class={baseStyles.field} id="timer-field">
            <legend class={styles.fieldLegend}>Chess Clock (Round Decision Timer)</legend>
            <div class={`${styles.segmented} ${styles.timerSegmented}`}>
              {[
                { val: 0, label: 'Off' },
                { val: 60, label: '1m' },
                { val: 180, label: '3m' },
                { val: 300, label: '5m' },
                { val: 600, label: '10m' },
              ].map(({ val, label }) => (
                <label key={val}>
                  <input
                    type="radio"
                    name="turnTimer"
                    value={val}
                    checked={cfg.turnTimer === val}
                    onChange={() => update({ turnTimer: val })}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {/* Animal Picker (Pawn) */}
        {cfg.mode !== 'bot_vs_bot' && (
          <fieldset class={baseStyles.field} id="pawn-field">
            <legend class={styles.fieldLegend}>Pawn</legend>
            <div class={styles.animalPicker}>
              {ANIMAL_ORDER.map((id) => {
                const a = ANIMALS[id];
                return (
                  <label key={id}>
                    <input
                      type="radio"
                      name="animal"
                      value={id}
                      checked={cfg.animal === id}
                      onChange={() => update({ animal: id })}
                    />
                    <span class={styles.pickerSpan} style={{ '--pc': a.color }}>
                      <b class={styles.pickerEmoji}>{a.emoji}</b>
                      {a.name}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        <div class={styles.menuSecondaryActions}>
          <button
            id="btn-menu-rules"
            class="ghost-btn small"
            type="button"
            onClick={() => {
              close();
              hudStore.rulesOpen.value = true;
            }}
          >
            📖 How to Play
          </button>
          <button
            id="btn-menu-history"
            class="ghost-btn small"
            type="button"
            onClick={() => {
              close();
              if (cb.onShowHistory) cb.onShowHistory();
              else hudStore.historyOpen.value = true;
            }}
          >
            📜 Match History
          </button>
        </div>

        <div class={styles.menuActions}>
          <button
            id="btn-menu-close"
            class="ghost-btn"
            type="button"
            onClick={() => close()}
          >
            Close
          </button>
          {botMatchActive && (
            <button
              id="btn-menu-stop"
              class="ghost-btn alert"
              type="button"
              onClick={() => {
                close();
                document.getElementById('btn-stop-bots')?.click();
                cb.onToggleBotMatch?.();
              }}
            >
              Stop Match
            </button>
          )}
          <button id="btn-start" class="primary-btn" type="submit" value="start">
            Start Game
          </button>
        </div>
      </form>
    </Modal>
  );
}
