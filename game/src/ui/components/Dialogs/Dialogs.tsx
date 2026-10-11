import { useEffect, useRef } from 'preact/hooks';
import type { TargetedMouseEvent } from 'preact';
import styles from './Dialogs.module.css';
import historyStyles from '../HistoryPanels/HistoryPanels.module.css';
import { hudStore } from '../../hudStore';
import { ANIMALS, ANIMAL_ORDER } from '../../../game/animals';
import type { Difficulty } from '../../../game/ai';
import type { GameMode, GameConfig } from '../../Hud';
import { formatActionDescription, formatNotation } from '../../../game/replay';
import { MatchHistoryManager } from '../../../game/history';
import { sounds } from '../../../scene/sounds';

interface ModalProps {
  id: string;
  open: boolean;
  className?: string;
  onClose: () => void;
  onOpen?: () => void;
  children: preact.ComponentChildren;
}

function Modal({ id, open, className = '', onClose, onOpen, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  // Sync open prop -> native dialog
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (open && !el.open) {
      try {
        el.showModal();
      } catch {
        /* already open */
      }
    } else if (!open && el.open) {
      try {
        el.close();
      } catch {
        /* already closed */
      }
    }
  }, [open]);

  // Sync native dialog DOM state & events -> store callbacks
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleClose = () => {
      onClose();
    };

    el.addEventListener('close', handleClose);

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'open') {
          if (el.open) {
            onOpen?.();
          } else {
            onClose();
          }
        }
      }
    });

    observer.observe(el, { attributes: true, attributeFilter: ['open'] });

    return () => {
      el.removeEventListener('close', handleClose);
      observer.disconnect();
    };
  }, [onClose, onOpen]);

  const handleBackdropClick = (e: TargetedMouseEvent<HTMLDialogElement>) => {
    const el = ref.current;
    if (!el || !el.open) return;
    if (e.target === el) {
      const rect = el.getBoundingClientRect();
      const inDialog =
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width;
      if (!inDialog) {
        try {
          el.close();
        } catch {
          /* ignore */
        }
      }
    }
  };

  return (
    <dialog
      id={id}
      ref={ref}
      class={`${styles.panel} ${className}`}
      onClick={handleBackdropClick}
    >
      {children}
    </dialog>
  );
}

// ------------------------------------------------------------------ Menu Dialog
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
      <form id="menu-form" method="dialog" class={styles.form} onSubmit={handleStart}>
        <button
          id="btn-menu-x"
          class={styles.dialogClose}
          type="button"
          aria-label="Close dialog"
          onClick={() => close()}
        >
          ✕
        </button>

        <div class={styles.panelHero}>
          <h2 class={styles.heroTitle}>New Game</h2>
          <p class={styles.heroDesc}>
            Reach the opposite edge first. Place walls to delay your rivals.
          </p>
        </div>

        {/* Mode */}
        <fieldset class={styles.field}>
          <legend class={styles.fieldLegend}>Mode</legend>
          <div class={`${styles.segmented} ${styles.modeSegmented}`}>
            {[
              { val: 'ai', label: 'vs Computer' },
              { val: 'local', label: 'Pass & Play' },
              { val: 'bot_vs_bot', label: 'Bots Only' },
              ...(__ONLINE__ ? [{ val: 'online', label: 'Online' }] : []),
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
        <fieldset class={styles.field}>
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
          <fieldset class={styles.field} id="difficulty-field">
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
          <fieldset class={styles.field} id="timer-field">
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
          <fieldset class={styles.field} id="pawn-field">
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
              const rules = document.getElementById('rules-dialog') as HTMLDialogElement | null;
              rules?.showModal();
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
              document.getElementById('btn-history')?.click();
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

// ------------------------------------------------------------------ Rules Dialog
export function RulesDialog() {
  const open = hudStore.rulesOpen.value;

  const close = () => {
    const el = document.getElementById('rules-dialog') as HTMLDialogElement | null;
    if (el && el.open) el.close();
    hudStore.rulesOpen.value = false;
  };

  return (
    <Modal
      id="rules-dialog"
      open={open}
      onOpen={() => (hudStore.rulesOpen.value = true)}
      onClose={() => (hudStore.rulesOpen.value = false)}
    >
      <form class={styles.form} method="dialog" onSubmit={(e) => { e.preventDefault(); close(); }}>
        <button
          id="btn-rules-x"
          class={styles.dialogClose}
          type="button"
          aria-label="Close dialog"
          onClick={close}
        >
          ✕
        </button>
        <div class={styles.panelHero}>
          <h2 class={styles.heroTitle}>How to Play</h2>
        </div>
        <ol class={styles.rules}>
          <li>
            <strong>Goal:</strong> Be the first player to reach the opposite side of the board.
          </li>
          <li>
            <strong>Turn:</strong> Either move your pawn one tile, or place a wall in a groove.
          </li>
          <li>
            <strong>Move:</strong> Step to an adjacent tile. Jump straight over an adjacent opponent; if a wall blocks the jump, step diagonally.
          </li>
          <li>
            <strong>Walls:</strong> Walls span two tiles. They cannot overlap, cross, or completely trap any player.
          </li>
          <li>
            <strong>Inventory:</strong> 10 walls each in 2-player games, 5 in 4-player games.
          </li>
        </ol>
        <div class={styles.strategyTips}>
          <h3>Pro Tips for Better Moves</h3>
          <ul class={styles.tipsList}>
            <li>
              <strong>Watch the Step Count:</strong> Check the step badge on player cards. If you lead by 2+ steps, rush to your goal! If you trail, drop a hedge to delay the opponent.
            </li>
            <li>
              <strong>Conserve Your Hedges:</strong> Don't waste walls early on an open board. Saving hedges for the endgame forces much longer, decisive detours.
            </li>
            <li>
              <strong>Build Snake Mazes:</strong> Combining horizontal and vertical walls forces opponents sideways across multiple lanes.
            </li>
            <li>
              <strong>Seize the Jump:</strong> Jumping directly over an opponent gains 2 steps of tempo in a single turn.
            </li>
            <li>
              <strong>Press 💡 Hint:</strong> Click the lightbulb or press <kbd>I</kbd> anytime during your turn for optimal move & hedge recommendations computed with lookahead!
            </li>
          </ul>
        </div>
        <p class={styles.keys}>
          <kbd>I</kbd> hint · <kbd>Z</kbd> undo · <kbd>C</kbd> camera · <kbd>Esc</kbd> menu · drag to orbit
        </p>
        <button class="primary-btn" type="submit" onClick={close}>
          Close
        </button>
      </form>
    </Modal>
  );
}

// ------------------------------------------------------------------ Win Dialog
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
        class={`${styles.form} ${styles.winCenter}`}
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          close();
        }}
      >
        <button
          id="btn-win-x"
          class={styles.dialogClose}
          type="button"
          aria-label="Close dialog"
          onClick={() => close()}
        >
          ✕
        </button>
        <div class={styles.winEmoji} id="win-emoji">
          {a.emoji}
        </div>
        <h2 id="win-title" class={styles.heroTitle}>
          {data.title}
        </h2>
        <p id="win-sub" class={styles.heroDesc}>
          {data.sub}
        </p>
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

// ------------------------------------------------------------------ History Dialog
export function HistoryDialog() {
  const open = hudStore.historyOpen.value;
  const records = hudStore.historyRecords.value;
  const cb = hudStore.callbacks;

  const close = () => {
    const el = document.getElementById('history-dialog') as HTMLDialogElement | null;
    if (el && el.open) el.close();
    hudStore.historyOpen.value = false;
  };

  return (
    <Modal
      id="history-dialog"
      open={open}
      onOpen={() => (hudStore.historyOpen.value = true)}
      onClose={() => (hudStore.historyOpen.value = false)}
    >
      <div class={styles.form}>
        <button
          id="btn-history-x"
          class={styles.dialogClose}
          type="button"
          aria-label="Close dialog"
          onClick={close}
        >
          ✕
        </button>
        <div class={styles.panelHero}>
          <h2 class={styles.heroTitle}>Match History</h2>
          <p class={styles.heroDesc}>Recent completed games and outcomes</p>
        </div>

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

// ------------------------------------------------------------------ Moves Dialog
export function MovesDialog() {
  const open = hudStore.movesOpen.value;
  const data = hudStore.movesData.value;

  const close = () => {
    const el = document.getElementById('moves-dialog') as HTMLDialogElement | null;
    if (el && el.open) el.close();
    hudStore.movesOpen.value = false;
  };

  return (
    <Modal
      id="moves-dialog"
      open={open}
      onOpen={() => (hudStore.movesOpen.value = true)}
      onClose={() => (hudStore.movesOpen.value = false)}
    >
      <div class={styles.form}>
        <button
          id="btn-moves-x"
          class={styles.dialogClose}
          type="button"
          aria-label="Close dialog"
          onClick={close}
        >
          ✕
        </button>
        <div class={styles.panelHero}>
          <h2 class={styles.heroTitle}>Move History</h2>
          <p id="moves-subtitle" class={styles.heroDesc}>
            {data.onSelect ? 'Click any move to jump to that board position' : `${data.actions.length} total moves`}
          </p>
        </div>

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

// ------------------------------------------------------------------ Lobby Dialog
const LEVEL: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

export function LobbyDialog() {
  const open = hudStore.lobbyOpen.value;
  const data = hudStore.lobbyData.value;
  const cb = hudStore.callbacks;

  const close = () => {
    const el = document.getElementById('lobby-dialog') as HTMLDialogElement | null;
    if (el && el.open) el.close();
    hudStore.lobbyOpen.value = false;
  };

  if (!data) return null;

  const { view: v, mySeat, link } = data;
  const isHost = mySeat === v.hostSeat;
  const ready = v.seats.every((s) => s.kind !== 'open');

  let statusText = 'Invite players or assign the computer to open seats.';
  if (mySeat === null) statusText = 'This game is full — you will watch as a spectator.';
  else if (!isHost) statusText = 'Waiting for the host to start the game…';
  else if (ready) statusText = 'Everyone is here. Ready when you are!';

  return (
    <Modal
      id="lobby-dialog"
      open={open}
      onOpen={() => (hudStore.lobbyOpen.value = true)}
      onClose={() => {
        hudStore.lobbyOpen.value = false;
        cb.onLobbyLeave?.();
      }}
    >
      <div class={styles.lobbyContent}>
        <button
          id="btn-lobby-x"
          class={styles.dialogClose}
          type="button"
          aria-label="Close dialog"
          onClick={() => {
            close();
            cb.onLobbyLeave?.();
          }}
        >
          ✕
        </button>
        <div class={styles.panelHero}>
          <h2 class={styles.heroTitle}>Online Game</h2>
          <p id="lobby-status" class={styles.heroDesc}>
            {statusText}
          </p>
        </div>

        <div class={styles.inviteBox}>
          <label for="invite-link" class={styles.fieldLabel}>
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

        <div class={styles.field}>
          <span class={styles.fieldLabel}>Players</span>
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
            onClick={() => {
              close();
              cb.onLobbyLeave?.();
            }}
          >
            Leave
          </button>
          {isHost && (
            <button
              id="btn-lobby-start"
              class="primary-btn"
              type="button"
              disabled={!ready}
              onClick={() => cb.onLobbyStart?.()}
            >
              Start Game
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function Dialogs() {
  return (
    <>
      <MenuDialog />
      <RulesDialog />
      <WinDialog />
      <HistoryDialog />
      <MovesDialog />
      <LobbyDialog />
    </>
  );
}
