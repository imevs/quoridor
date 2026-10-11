import styles from './PlayerCards.module.css';
import { hudStore } from '../../hudStore';
import { ANIMALS } from '../../../game/animals';
import { formatClock } from '../../Hud';

export function PlayerCards() {
  const players = hudStore.playersList.value;
  const pinned = hudStore.pinnedSeat.value;
  const cb = hudStore.callbacks;

  if (players.length === 0) return null;

  return (
    <aside
      id="players"
      class={styles.players}
      data-count={players.length}
      aria-label="Players"
    >
      {players.map((p) => {
        const a = ANIMALS[p.seat.animal];
        const isPinned = pinned === p.index;
        const clockVal = p.clockVal;
        const clockHtml = p.initialClock > 0 && clockVal !== undefined;
        const badge = p.seat.human
          ? p.seat.local
            ? 'You'
            : 'Human'
          : `P${p.index + 1}`;

        return (
          <article
            key={p.index}
            class={`${styles.playerCard} ${p.isTurn ? styles.active : ''} ${p.isAway ? styles.away : ''} ${isPinned ? styles.destHover : ''}`}
            data-seat={p.index}
            data-animal={p.seat.animal}
            style={{ '--pc': a.color }}
            onMouseEnter={() => cb.onHoverSeat?.(p.index)}
            onMouseLeave={() => cb.onHoverSeat?.(null)}
            onClick={() => cb.onTapSeat?.(p.index)}
          >
            <div class={styles.avatar} aria-hidden="true">
              {a.emoji}
            </div>
            <div class={styles.playerHead}>
              {a.name}
              <span class={`${styles.badge} ${p.seat.local ? styles.you : ''}`}>
                {badge}
              </span>
              <span class={styles.steps} title="Shortest path to goal">
                {p.steps} step{p.steps === 1 ? '' : 's'}
              </span>
              {clockHtml && (
                <span
                  class={`${styles.playerClock} ${p.isTurn ? styles.active : ''} ${clockVal <= 15 && clockVal > 0 ? styles.urgent : ''}`}
                  data-seat={p.index}
                  title="Time remaining"
                >
                  {formatClock(clockVal)}
                </span>
              )}
            </div>
            <div
              class={styles.pips}
              title={`${p.wallsLeft} hedges left`}
              aria-label={`${p.wallsLeft} hedges left`}
            >
              {Array.from({ length: p.wallsMax }, (_, k) => (
                <span
                  key={k}
                  class={`${styles.pip} ${k >= p.wallsLeft ? styles.used : ''}`}
                />
              ))}
            </div>
          </article>
        );
      })}
    </aside>
  );
}
