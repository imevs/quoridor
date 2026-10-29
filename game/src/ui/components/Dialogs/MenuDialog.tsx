import { useState } from 'preact/hooks';
import baseStyles from './DialogBase.module.css';
import styles from './MenuDialog.module.css';
import { hudStore } from '../../hudStore';
import { ANIMALS, ANIMAL_ORDER } from '../../../game/animals';
import type { AnimalId } from '../../../game/animals';
import type { Difficulty } from '../../../game/ai';
import type { GameMode, GameConfig } from '../../Hud';
import { Modal, DialogCloseButton, DialogHeader } from './Modal';

interface VariationPreset {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  badge: string;
  badgeType: 'popular' | 'expert' | 'speed' | 'party' | 'online' | 'local';
  tags: string[];
  config: Partial<GameConfig>;
}

const VARIATION_PRESETS: VariationPreset[] = [
  {
    id: 'classic_duel',
    title: 'Classic Duel',
    subtitle: 'Standard 1v1 match against balanced medium computer AI',
    icon: '🦊',
    badge: 'Popular',
    badgeType: 'popular',
    tags: ['2 Players', 'Medium AI', '5m Clock'],
    config: { mode: 'ai', players: 2, difficulty: 'medium', turnTimer: 300, animal: 'fox' },
  },
  {
    id: 'tactical_master',
    title: 'Tactical Master',
    subtitle: 'Intense match facing our deep minimax bot with 2-ply lookahead',
    icon: '⚔️',
    badge: 'Hard',
    badgeType: 'expert',
    tags: ['2 Players', 'Hard AI', '3m Clock'],
    config: { mode: 'ai', players: 2, difficulty: 'hard', turnTimer: 180, animal: 'fox' },
  },
  {
    id: 'blitz_quoridor',
    title: 'Blitz Quoridor',
    subtitle: 'Lightning speed 60-second decision clock — think and react fast',
    icon: '⚡',
    badge: 'Speed',
    badgeType: 'speed',
    tags: ['2 Players', 'Fast Pace', '1m Clock'],
    config: { mode: 'ai', players: 2, difficulty: 'medium', turnTimer: 60, animal: 'fox' },
  },
  {
    id: 'forest_brawl',
    title: 'Forest Brawl',
    subtitle: 'Four-player battle for the centre — place walls to outwit three rivals',
    icon: '🌲',
    badge: '4 Players',
    badgeType: 'party',
    tags: ['4 Players', 'vs AI', '5 Walls Each'],
    config: { mode: 'ai', players: 4, difficulty: 'medium', turnTimer: 300, animal: 'fox' },
  },
  {
    id: 'pass_and_play',
    title: 'Pass & Play (2P)',
    subtitle: 'Take turns playing on the same screen — classic tabletop duel',
    icon: '👥',
    badge: 'Local',
    badgeType: 'local',
    tags: ['2 Players', 'Hotseat', 'Untimed'],
    config: { mode: 'local', players: 2, difficulty: 'medium', turnTimer: 0, animal: 'fox' },
  },
  {
    id: 'party_four',
    title: 'Forest Party (4P)',
    subtitle: 'Four-player local pass-and-play tournament for game nights',
    icon: '🎪',
    badge: 'Party',
    badgeType: 'party',
    tags: ['4 Players', 'Local Party', 'Untimed'],
    config: { mode: 'local', players: 4, difficulty: 'medium', turnTimer: 0, animal: 'fox' },
  },
  {
    id: 'play_friend',
    title: 'Play with a Friend',
    subtitle: 'Host a private peer-to-peer match with a WebRTC shareable link',
    icon: '🌐',
    badge: 'P2P Online',
    badgeType: 'online',
    tags: ['2 Players', 'WebRTC Link', '5m Clock'],
    config: { mode: 'p2p', players: 2, difficulty: 'medium', turnTimer: 300, animal: 'fox' },
  },
  ...(__ONLINE__
    ? [
        {
          id: 'server_match',
          title: 'Server Match',
          subtitle: 'Authoritative online room with server-hosted synchronization',
          icon: '🌍',
          badge: 'Online',
          badgeType: 'online' as const,
          tags: ['2 Players', 'Dedicated Server', 'Untimed'],
          config: { mode: 'online' as GameMode, players: 2 as const, difficulty: 'medium' as Difficulty, turnTimer: 0, animal: 'fox' as AnimalId },
        },
      ]
    : []),
  {
    id: 'bot_exhibition',
    title: 'Bot Exhibition',
    subtitle: 'Sit back and spectate as two AI engines compete head-to-head',
    icon: '🤖',
    badge: 'Spectate',
    badgeType: 'local',
    tags: ['AI vs AI', 'Observer Mode', 'Untimed'],
    config: { mode: 'bot_vs_bot', players: 2, difficulty: 'hard', turnTimer: 0, animal: 'fox' },
  },
];

export function MenuDialog() {
  const open = hudStore.menuOpen.value;
  const cfg = hudStore.gameConfig.value;
  const botMatchActive = hudStore.botMatchActive.value;
  const cb = hudStore.callbacks;
  const [customOpen, setCustomOpen] = useState(false);

  const update = (patch: Partial<GameConfig>) => {
    const next: GameConfig = { ...cfg, ...patch };
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

  const launchVariation = (presetConfig: Partial<GameConfig>) => {
    const next: GameConfig = {
      ...cfg,
      ...presetConfig,
    };
    hudStore.gameConfig.value = next;
    try {
      localStorage.setItem('quoridors.config', JSON.stringify(next));
    } catch {
      /* ignore */
    }
    close('start');
    cb.onStartGame?.(next);
  };

  const handleStart = (e: Event) => {
    e.preventDefault();
    close('start');
    cb.onStartGame?.(cfg);
  };

  return (
    <Modal
      id="menu-dialog"
      className={styles.lobbyModal}
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
          title="Game Lobby"
          desc="Pick a game variation to start instantly, or customize your own match."
          descClassName={styles.lobbyDesc}
        />

        {/* Quick-Launch Game Variations Grid */}
        <section class={styles.lobbySection} aria-label="Game Variations">
          <div class={styles.variationsGrid}>
            {VARIATION_PRESETS.map((preset) => (
              <button
                key={preset.id}
                id={`variation-${preset.id}`}
                type="button"
                class={styles.variationCard}
                onClick={() => launchVariation(preset.config)}
                aria-label={`${preset.title}: ${preset.subtitle}`}
              >
                <div class={styles.cardHeader}>
                  <div class={styles.cardIconTitle}>
                    <span class={styles.cardIcon} aria-hidden="true">
                      {preset.icon}
                    </span>
                    <h3 class={styles.cardTitle}>{preset.title}</h3>
                  </div>
                  <span class={`${styles.badge} ${styles[`badge_${preset.badgeType}`]}`}>
                    {preset.badge}
                  </span>
                </div>

                <p class={styles.cardDesc}>{preset.subtitle}</p>

                <div class={styles.cardFooter}>
                  <div class={styles.cardTags}>
                    {preset.tags.map((tag) => (
                      <span key={tag} class={styles.tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span class={styles.playAction} aria-hidden="true">
                    Play ➔
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Expandable Custom Match Configurator */}
        <details
          id="custom-match-details"
          class={styles.customSection}
          open={customOpen}
          onToggle={(e) => setCustomOpen((e.currentTarget as HTMLDetailsElement).open)}
        >
          <summary class={styles.customSummary}>
            <div class={styles.customSummaryLeft}>
              <span class={styles.customSummaryIcon} aria-hidden="true">
                ⚙️
              </span>
              <div class={styles.customSummaryText}>
                <span class={styles.customSummaryTitle}>Custom Match Configurator</span>
                <span class={styles.customSummaryDesc}>
                  Fine-tune mode, player count, bot intelligence, and clock timer
                </span>
              </div>
            </div>
            <span class={styles.customChevron} aria-hidden="true">
              ▾
            </span>
          </summary>

          <div class={styles.customBody}>
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
                <legend class={styles.fieldLegend}>Pawn Animal</legend>
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

            <div class={styles.customActions}>
              <button id="btn-start" class="primary-btn" type="submit" value="start">
                Start Custom Match
              </button>
            </div>
          </div>
        </details>

        {/* Secondary Action Shortcuts */}
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

        {/* Dialog Footer Actions */}
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
        </div>
      </form>
    </Modal>
  );
}
