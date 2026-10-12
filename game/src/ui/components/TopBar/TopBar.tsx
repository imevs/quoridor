import styles from './TopBar.module.css';
import { hudStore } from '../../hudStore';
import { ANIMALS } from '../../../game/animals';
import { formatClock } from '../../Hud';

export function TopBar() {
  const turn = hudStore.turnState.value;
  const timer = hudStore.turnTimer.value;
  const net = hudStore.netStatus.value;
  const soundEnabled = hudStore.soundEnabled.value;
  const canUndo = hudStore.canUndo.value;
  const canHint = hudStore.canHint.value;
  const botMatchActive = hudStore.botMatchActive.value;
  const botMatchPaused = hudStore.botMatchPaused.value;

  const a = turn.seat ? ANIMALS[turn.seat.animal] : null;
  const color = a ? a.color : '#f2a93b';
  const emoji = a ? a.emoji : '';

  // 69.115 is 2 * PI * 11
  const circumference = 69.115;
  const progressRatio = timer.initial > 0 ? Math.max(0, Math.min(1, timer.remaining / timer.initial)) : 0;
  const strokeOffset = circumference * (1 - progressRatio);

  const cb = hudStore.callbacks;

  return (
    <header class={styles.topbar}>
      <div class={`${styles.brand} ${net.visible ? styles.hasNetStatus : ''}`}>
        <h1 class={styles.brandTitle}>Quoridors</h1>
        {net.visible && (
          <span id="net-status" class={styles.netStatus} data-tone={net.tone}>
            {net.text}
          </span>
        )}
      </div>

      <div
        id="turn-pill"
        class={`${styles.turnPill} ${turn.pop ? styles.pop : ''}`}
        style={{ '--pc': color }}
        aria-live="polite"
      >
        <span id="turn-emoji" class={styles.turnEmoji}>
          {emoji}
        </span>
        <span id="turn-text" class={styles.turnText}>
          {turn.label}
        </span>
        {timer.visible && (
          <span
            id="turn-timer"
            class={`${styles.turnTimer} ${timer.urgent ? styles.urgent : ''}`}
          >
            <svg class={styles.timerRing} viewBox="0 0 28 28">
              <circle class={styles.timerRingBg} cx="14" cy="14" r="11" />
              <circle
                class={styles.timerRingBar}
                id="timer-ring-bar"
                cx="14"
                cy="14"
                r="11"
                style={{ strokeDashoffset: strokeOffset }}
              />
            </svg>
            <span id="turn-timer-val" class={styles.turnTimerVal}>
              {formatClock(timer.remaining)}
            </span>
          </span>
        )}
      </div>

      <nav class={styles.actions} aria-label="Game actions">
        <button
          id="btn-sound"
          class={styles.iconBtn}
          type="button"
          title="Toggle sound (M)"
          aria-label="Toggle sound"
          onClick={() => cb.onToggleSound?.()}
        >
          {soundEnabled ? (
            <svg id="icon-sound-on" viewBox="0 0 24 24">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          ) : (
            <svg id="icon-sound-off" viewBox="0 0 24 24">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M23 9l-6 6" />
              <path d="M17 9l6 6" />
            </svg>
          )}
        </button>

        <button
          id="btn-history"
          class={`${styles.iconBtn} ${styles.desktopOnly}`}
          type="button"
          title="Match history (H)"
          aria-label="Match history"
          onClick={() => {
            hudStore.historyOpen.value = true;
          }}
        >
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </button>

        <button
          id="btn-moves"
          class={styles.iconBtn}
          type="button"
          title="Move history log (L)"
          aria-label="Move history log"
          onClick={() => {
            hudStore.movesOpen.value = true;
          }}
        >
          <svg viewBox="0 0 24 24">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        </button>

        <button
          id="btn-hint"
          class={styles.iconBtn}
          type="button"
          title="Tactical hint: Best move recommendation (I)"
          aria-label="Tactical hint"
          disabled={!canHint}
          onClick={() => cb.onRequestHint?.()}
        >
          <svg viewBox="0 0 24 24">
            <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-7 7c0 2.5 1.5 4.7 3.5 6h7c2-1.3 3.5-3.5 3.5-6a7 7 0 0 0-7-7z" />
          </svg>
        </button>

        <button
          id="btn-undo"
          class={styles.iconBtn}
          type="button"
          title="Undo (Z)"
          aria-label="Undo"
          disabled={!canUndo}
          onClick={() => cb.onUndo?.()}
        >
          <svg viewBox="0 0 24 24">
            <path d="M9 14 4 9l5-5" />
            <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
          </svg>
        </button>

        <button
          id="btn-camera"
          class={styles.iconBtn}
          type="button"
          title="Switch view (C): Player / Top-Down / Isometric"
          aria-label="Camera preset"
          onClick={() => cb.onCycleCamera?.()}
        >
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" />
            <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
          </svg>
        </button>

        <button
          id="btn-rules"
          class={`${styles.iconBtn} ${styles.desktopOnly}`}
          type="button"
          title="How to play"
          aria-label="How to play"
          onClick={() => {
            hudStore.rulesOpen.value = true;
          }}
        >
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <path d="M9.6 9.2a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.7" />
            <path d="M12 17h.01" />
          </svg>
        </button>

        {botMatchActive && (
          <button
            id="btn-stop-bots"
            class={`${styles.stopBtn} ${botMatchPaused ? styles.paused : ''}`}
            type="button"
            title="Stop bot match (S)"
            aria-label="Stop bot match"
            onClick={() => cb.onToggleBotMatch?.()}
          >
            {botMatchPaused ? (
              <svg viewBox="0 0 24 24">
                <polygon points="6 4 20 12 6 20 6 4" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24">
                <rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" />
              </svg>
            )}
            <span class={styles.stopBtnText}>
              {botMatchPaused ? 'Resume Match' : 'Stop Match'}
            </span>
          </button>
        )}

        {net.visible && hudStore.lobbyData.value?.link && (
          <button
            id="btn-invite"
            class={styles.iconBtn}
            type="button"
            title="Invite & QR Code"
            aria-label="Invite link and QR code"
            onClick={() => {
              hudStore.inviteOpen.value = true;
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" style={{ stroke: 'none', fill: 'currentColor' }}>
              <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v2h-3v-2zm-5 5h2v3h-2v-3zm3 0h2v1h-2v-1zm2 2h3v2h-3v-2zm0-4h2v2h-2v-2zm-2 0h2v2h-2v-2zm-3-3h2v2h-2v-2z" />
            </svg>
          </button>
        )}

        <button
          id="btn-menu"
          class={`${styles.iconBtn} ${styles.accent}`}
          type="button"
          title="New game (Esc)"
          aria-label="New game"
          onClick={() => cb.onOpenMenu?.()}
        >
          <svg viewBox="0 0 24 24">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </nav>
    </header>
  );
}
