import { ANIMALS, ANIMAL_ORDER, type AnimalId } from '../game/animals';
import type { Difficulty } from '../game/ai';
import { type Action, type GameState, shortestPath } from '../game/rules';
import type { HistoryRecord } from '../game/history';
import { formatActionDescription, formatNotation } from '../game/replay';

export interface Seat {
  animal: AnimalId;
  human: boolean;
  /** Controlled from this client. */
  local: boolean;
  /** Remote human who is currently disconnected. */
  away?: boolean;
}

export type GameMode = 'ai' | 'local' | 'online' | 'bot_vs_bot';

export interface GameConfig {
  mode: GameMode;
  players: 2 | 4;
  difficulty: Difficulty;
  animal: AnimalId;
  turnTimer?: number;
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const $ = <T extends Element>(id: string) => document.getElementById(id) as unknown as T;

const STORAGE_KEY = 'quoridors.config';

export class Hud {
  private playersEl = $<HTMLElement>('players');
  private turnPill = $<HTMLElement>('turn-pill');
  private turnEmoji = $<HTMLElement>('turn-emoji');
  private turnText = $<HTMLElement>('turn-text');
  private turnTimerEl = $<HTMLElement>('turn-timer');
  private turnTimerVal = $<HTMLElement>('turn-timer-val');
  private timerRingBar = $<SVGCircleElement>('timer-ring-bar');
  readonly hintEl = $<HTMLElement>('hint');
  private toastEl = $<HTMLElement>('toast');
  private toastTimer = 0;
  private destPill = $<HTMLElement>('destination-pill');
  private destAvatar = $<HTMLElement>('dest-avatar');
  private destTitle = $<HTMLElement>('dest-title');
  private destDesc = $<HTMLElement>('dest-desc');
  private tappedSeat: number | null = null;
  readonly menu = $<HTMLDialogElement>('menu-dialog');
  readonly menuCloseBtn = $<HTMLButtonElement>('btn-menu-close');
  readonly menuXBtn = $<HTMLButtonElement>('btn-menu-x');
  readonly rules = $<HTMLDialogElement>('rules-dialog');
  readonly rulesXBtn = $<HTMLButtonElement>('btn-rules-x');
  readonly win = $<HTMLDialogElement>('win-dialog');
  readonly winMovesBtn = $<HTMLButtonElement>('btn-win-moves');
  readonly winCloseBtn = $<HTMLButtonElement>('btn-win-close');
  readonly winXBtn = $<HTMLButtonElement>('btn-win-x');
  readonly historyDialog = $<HTMLDialogElement>('history-dialog');
  readonly historyList = $<HTMLElement>('history-list');
  readonly historyXBtn = $<HTMLButtonElement>('btn-history-x');
  readonly movesDialog = $<HTMLDialogElement>('moves-dialog');
  readonly movesList = $<HTMLElement>('moves-list');
  readonly movesBtn = $<HTMLButtonElement>('btn-moves');
  readonly closeMovesBtn = $<HTMLButtonElement>('btn-close-moves');
  readonly movesXBtn = $<HTMLButtonElement>('btn-moves-x');

  readonly replayBar = $<HTMLElement>('replay-bar');
  readonly replayTitle = $<HTMLElement>('replay-title');
  readonly replayMoveDesc = $<HTMLElement>('replay-move-desc');
  readonly replayStep = $<HTMLElement>('replay-step');
  readonly replayPlayBtn = $<HTMLButtonElement>('btn-replay-play');
  readonly replayPlayIcon = $<HTMLElement>('replay-play-icon');
  readonly replayPrevBtn = $<HTMLButtonElement>('btn-replay-prev');
  readonly replayNextBtn = $<HTMLButtonElement>('btn-replay-next');
  readonly replayFirstBtn = $<HTMLButtonElement>('btn-replay-first');
  readonly replayLastBtn = $<HTMLButtonElement>('btn-replay-last');
  readonly replayExitBtn = $<HTMLButtonElement>('btn-replay-exit');
  readonly replayMovesBtn = $<HTMLButtonElement>('btn-replay-moves');

  readonly hintBtn = $<HTMLButtonElement>('btn-hint');
  readonly undoBtn = $<HTMLButtonElement>('btn-undo');
  readonly soundBtn = $<HTMLButtonElement>('btn-sound');
  readonly soundOnIcon = $<HTMLElement>('icon-sound-on');
  readonly soundOffIcon = $<HTMLElement>('icon-sound-off');
  readonly historyBtn = $<HTMLButtonElement>('btn-history');
  readonly clearHistoryBtn = $<HTMLButtonElement>('btn-clear-history');
  readonly closeHistoryBtn = $<HTMLButtonElement>('btn-close-history');
  readonly stopBotsBtn = $<HTMLButtonElement>('btn-stop-bots');
  readonly stopBotsIcon = $<HTMLElement>('icon-stop-bots');
  readonly resumeBotsIcon = $<HTMLElement>('icon-resume-bots');
  readonly stopBotsText = $<HTMLElement>('text-stop-bots');
  readonly menuStopBtn = $<HTMLButtonElement>('btn-menu-stop');
  readonly cameraBtn = $<HTMLButtonElement>('btn-camera');
  private netEl = $<HTMLElement>('net-status');
  private undoBanner = $<HTMLElement>('undo-banner');

  constructor() {
    this.buildAnimalPicker();
    $<HTMLElement>('mode-online').hidden = !__ONLINE__;
    const form = $<HTMLFormElement>('menu-form');
    form.addEventListener('change', () => this.syncMenuFields());
    this.menuCloseBtn.addEventListener('click', () => {
      this.menu.close();
    });
    this.menuXBtn.addEventListener('click', () => {
      this.menu.close();
    });
    this.rulesXBtn.addEventListener('click', () => {
      this.rules.close();
    });
    this.closeHistoryBtn.addEventListener('click', () => {
      this.historyDialog.close();
    });
    this.historyXBtn.addEventListener('click', () => {
      this.historyDialog.close();
    });
    this.closeMovesBtn.addEventListener('click', () => {
      this.movesDialog.close();
    });
    this.movesXBtn.addEventListener('click', () => {
      this.movesDialog.close();
    });
    this.winCloseBtn.addEventListener('click', () => {
      this.win.close();
    });
    this.winXBtn.addEventListener('click', () => {
      this.win.close();
    });
    $<HTMLButtonElement>('btn-menu-rules')?.addEventListener('click', () => {
      this.menu.close();
      this.rules.showModal();
    });
    $<HTMLButtonElement>('btn-menu-history')?.addEventListener('click', () => {
      this.menu.close();
      this.historyBtn.click();
    });
    this.restoreConfig();
    this.syncMenuFields();
  }

  // ---------------------------------------------------------------- Loader
  setLoading(p: number): void {
    $<HTMLElement>('loader-fill').style.width = `${Math.round(p * 100)}%`;
    $<HTMLElement>('loader').setAttribute('aria-valuenow', String(Math.round(p * 100)));
  }

  hideLoader(): void {
    $<HTMLElement>('loader').classList.add('done');
  }

  // ---------------------------------------------------------------- Menu
  private buildAnimalPicker(): void {
    const picker = $<HTMLElement>('animal-picker');
    picker.innerHTML = ANIMAL_ORDER.map((id, i) => {
      const a = ANIMALS[id];
      return `<label><input type="radio" name="animal" value="${id}" ${i === 0 ? 'checked' : ''} />
        <span style="--pc:${a.color}"><b>${a.emoji}</b>${a.name}</span></label>`;
    }).join('');
  }

  private syncMenuFields(): void {
    const mode = this.formValue('mode');
    $<HTMLElement>('difficulty-field').hidden = mode === 'local';
    $<HTMLElement>('pawn-field').hidden = mode === 'bot_vs_bot';
    $<HTMLElement>('timer-field').hidden = mode === 'bot_vs_bot' || mode === 'online';
    $<HTMLElement>('btn-start').textContent =
      mode === 'online' ? 'Create Online Game' : mode === 'bot_vs_bot' ? 'Watch Bots Play' : 'Start Game';
  }

  private formValue(name: string): string {
    const el = document.querySelector<HTMLInputElement>(`#menu-form input[name="${name}"]:checked`);
    return el?.value ?? '';
  }

  readConfig(): GameConfig {
    const mode = this.formValue('mode');
    const timerVal = this.formValue('turnTimer');
    const parsedTimer = timerVal !== '' ? Number(timerVal) : 300;
    const turnTimer = mode === 'bot_vs_bot' || mode === 'online' ? 0 : parsedTimer;
    const cfg: GameConfig = {
      mode: mode === 'local' ? 'local' : mode === 'bot_vs_bot' ? 'bot_vs_bot' : mode === 'online' && __ONLINE__ ? 'online' : 'ai',
      players: this.formValue('players') === '4' ? 4 : 2,
      difficulty: (this.formValue('difficulty') || 'medium') as Difficulty,
      animal: (this.formValue('animal') || 'fox') as AnimalId,
      turnTimer: Number.isFinite(turnTimer) ? turnTimer : 300,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    return cfg;
  }

  private restoreConfig(): void {
    try {
      const cfg = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as GameConfig | null;
      if (!cfg) return;
      const set = (name: string, value: string) => {
        const el = document.querySelector<HTMLInputElement>(`#menu-form input[name="${name}"][value="${value}"]`);
        if (el) el.checked = true;
      };
      set('mode', cfg.mode === 'online' && !__ONLINE__ ? 'ai' : cfg.mode);
      set('players', String(cfg.players));
      set('difficulty', cfg.difficulty);
      set('animal', cfg.animal);
      set('turnTimer', String(cfg.turnTimer ?? 300));
    } catch {
      /* ignore corrupt storage */
    }
  }

  // ---------------------------------------------------------------- In-game
  renderPlayers(state: GameState, seats: Seat[], clocks: number[] = [], initialClock = 0): void {
    const wallsMax = seats.length === 2 ? 10 : 5;
    const localHumans = seats.filter((s) => s.human && s.local).length;
    this.playersEl.dataset.count = String(seats.length);
    this.playersEl.innerHTML = state.players
      .map((p, i) => {
        const seat = seats[i];
        const a = ANIMALS[seat.animal];
        const badge = !seat.human
          ? 'CPU'
          : seat.away
            ? 'Away'
            : seat.local && localHumans === 1
              ? 'You'
              : `P${i + 1}`;
        const steps = shortestPath(state, i);
        const pips = Array.from({ length: wallsMax }, (_, k) => `<span class="pip ${k >= p.walls ? 'used' : ''}"></span>`).join('');
        const clockVal = clocks[i];
        const clockHtml = initialClock > 0 && clockVal !== undefined
          ? `<span class="player-clock ${state.turn === i && state.winner === null ? 'active' : ''} ${clockVal <= 15 && clockVal > 0 ? 'urgent' : ''}" data-seat="${i}" title="Time remaining">${formatClock(clockVal)}</span>`
          : '';
        return `<article class="player-card ${state.turn === i && state.winner === null ? 'active' : ''} ${seat.away ? 'away' : ''}" data-seat="${i}" data-animal="${seat.animal}" style="--pc:${a.color}">
          <div class="avatar" aria-hidden="true">${a.emoji}</div>
          <div class="player-head">${a.name}<span class="badge ${seat.local ? 'you' : ''}">${badge}</span>
            <span class="steps" title="Shortest path to goal">${steps} step${steps === 1 ? '' : 's'}</span>
            ${clockHtml}</div>
          <div class="pips" title="${p.walls} hedges left" aria-label="${p.walls} hedges left">${pips}</div>
        </article>`;
      })
      .join('');
  }

  setTurn(seat: Seat, label: string): void {
    const a = ANIMALS[seat.animal];
    this.turnPill.style.setProperty('--pc', a.color);
    this.turnEmoji.textContent = a.emoji;
    this.turnText.textContent = label;
    this.turnPill.classList.remove('pop');
    void this.turnPill.offsetWidth; // restart animation
    this.turnPill.classList.add('pop');
  }

  updatePlayerClock(seat: number, remaining: number, initialClock: number): void {
    if (initialClock <= 0) return;
    const el = this.playersEl.querySelector<HTMLElement>(`.player-clock[data-seat="${seat}"]`);
    if (el) {
      el.textContent = formatClock(remaining);
      if (remaining <= 15 && remaining > 0) {
        el.classList.add('urgent');
      } else {
        el.classList.remove('urgent');
      }
    }
  }

  updateTurnTimer(secondsRemaining: number, maxSeconds: number): void {
    if (maxSeconds <= 0) {
      this.turnTimerEl.hidden = true;
      return;
    }
    this.turnTimerEl.hidden = false;
    this.turnTimerVal.textContent = formatClock(secondsRemaining);
    const fraction = Math.max(0, Math.min(1, secondsRemaining / maxSeconds));
    const circumference = 69.115;
    const offset = circumference * (1 - fraction);
    this.timerRingBar.style.strokeDashoffset = String(offset);

    if (secondsRemaining <= 15.1 && secondsRemaining > 0) {
      this.turnTimerEl.classList.add('urgent');
    } else {
      this.turnTimerEl.classList.remove('urgent');
    }
  }

  hideTurnTimer(): void {
    this.turnTimerEl.hidden = true;
    this.turnTimerEl.classList.remove('urgent');
  }

  setHint(content: string, isHtml = false): void {
    if (isHtml) {
      this.hintEl.innerHTML = content;
    } else {
      this.hintEl.textContent = content;
    }
  }

  bindPlayerHover(onHover: (seat: number | null) => void): void {
    this.playersEl.addEventListener('pointerover', (e) => {
      const card = (e.target as HTMLElement).closest<HTMLElement>('.player-card');
      if (card && card.dataset.seat !== undefined) {
        onHover(Number(card.dataset.seat));
      }
    });
    this.playersEl.addEventListener('pointerout', (e) => {
      if (this.tappedSeat !== null) return;
      const card = (e.target as HTMLElement).closest<HTMLElement>('.player-card');
      const related = e.relatedTarget as Node | null;
      if (card && (!related || !card.contains(related))) {
        onHover(null);
      }
    });
    this.playersEl.addEventListener('click', (e) => {
      const card = (e.target as HTMLElement).closest<HTMLElement>('.player-card');
      if (card && card.dataset.seat !== undefined) {
        const seat = Number(card.dataset.seat);
        if (this.tappedSeat === seat) {
          this.tappedSeat = null;
          onHover(null);
        } else {
          this.tappedSeat = seat;
          onHover(seat);
        }
      }
    });
    document.addEventListener('pointerdown', (e) => {
      if (this.tappedSeat !== null) {
        const target = e.target as HTMLElement;
        if (!target.closest('#players') && !target.closest('#destination-pill')) {
          this.tappedSeat = null;
          onHover(null);
        }
      }
    });
  }

  get isDestinationPinned(): boolean {
    return this.tappedSeat !== null;
  }

  showDestination(seat: Seat, seatIndex: number, title: string, desc: string): void {
    const a = ANIMALS[seat.animal];
    this.destPill.style.setProperty('--pc', a.color);
    this.destAvatar.textContent = a.emoji;
    this.destTitle.textContent = title;
    this.destDesc.textContent = desc;
    this.destPill.hidden = false;
    this.hintEl.style.opacity = '0';
    this.playersEl.querySelectorAll<HTMLElement>('.player-card').forEach((card) => {
      if (card.dataset.seat === String(seatIndex)) {
        card.classList.add('dest-hover');
      } else {
        card.classList.remove('dest-hover');
      }
    });
  }

  hideDestination(): void {
    this.tappedSeat = null;
    this.destPill.hidden = true;
    this.hintEl.style.opacity = '';
    this.playersEl.querySelectorAll<HTMLElement>('.player-card').forEach((card) => {
      card.classList.remove('dest-hover');
    });
  }

  toast(msg: string): void {
    this.toastEl.textContent = msg;
    this.toastEl.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('show'), 1800);
  }

  showWin(seat: Seat, title: string, sub: string, canPlayAgain: boolean): void {
    const a = ANIMALS[seat.animal];
    $<HTMLElement>('win-emoji').textContent = a.emoji;
    $<HTMLElement>('win-title').textContent = title;
    $<HTMLElement>('win-sub').textContent = sub;
    const again = $<HTMLButtonElement>('btn-again');
    again.disabled = !canPlayAgain;
    again.textContent = canPlayAgain ? 'Play again' : 'Waiting for host…';
    this.win.showModal();
  }

  updateSoundUi(enabled: boolean): void {
    this.soundOnIcon.hidden = !enabled;
    this.soundOffIcon.hidden = enabled;
    this.soundBtn.setAttribute('aria-label', enabled ? 'Mute sound' : 'Unmute sound');
    this.soundBtn.title = enabled ? 'Mute sound (M)' : 'Unmute sound (M)';
  }

  renderHistory(records: HistoryRecord[]): void {
    if (records.length === 0) {
      this.historyList.innerHTML = '<div class="history-empty">No matches played yet. Win or finish a game to record it!</div>';
      return;
    }
    this.historyList.innerHTML = records
      .map((r) => {
        const a = ANIMALS[r.winnerAnimal] ?? ANIMALS.fox;
        const dateStr = new Date(r.date).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        const modeLabel = r.mode === 'ai' ? 'vs AI' : r.mode === 'online' ? 'Online' : r.mode === 'bot_vs_bot' ? 'Bot Match' : 'Pass & Play';
        const hasReplay = r.actions && r.actions.length > 0;
        const replayBtn = hasReplay
          ? `<div class="history-item-actions"><button class="ghost-btn small btn-replay-match" data-id="${r.id}" type="button">▶ Watch Replay</button></div>`
          : '';
        return `<article class="history-item" style="--pc:${a.color}">
          <div class="avatar" aria-hidden="true">${a.emoji}</div>
          <div class="history-item-main">
            <b>${r.winnerName} won</b>
            <small>${modeLabel} · ${r.players} Players · ${dateStr}</small>
            ${replayBtn}
          </div>
          <div class="history-item-meta">
            <span>${r.movesCount} moves</span>
            <br><small>${r.wallsCount} hedges</small>
          </div>
        </article>`;
      })
      .join('');
  }

  setBotMatchActive(active: boolean, paused = false): void {
    this.stopBotsBtn.hidden = !active;
    this.menuStopBtn.hidden = !active;
    this.updateBotMatchPaused(paused);
  }

  updateBotMatchPaused(paused: boolean): void {
    if (paused) {
      this.stopBotsBtn.classList.add('paused');
      this.stopBotsIcon.hidden = true;
      this.resumeBotsIcon.hidden = false;
      this.stopBotsText.textContent = 'Resume';
      this.stopBotsBtn.setAttribute('title', 'Resume bot match (S)');
      this.stopBotsBtn.setAttribute('aria-label', 'Resume bot match');
      this.menuStopBtn.textContent = 'Resume Match';
    } else {
      this.stopBotsBtn.classList.remove('paused');
      this.stopBotsIcon.hidden = false;
      this.resumeBotsIcon.hidden = true;
      this.stopBotsText.textContent = 'Stop Match';
      this.stopBotsBtn.setAttribute('title', 'Stop bot match (S)');
      this.stopBotsBtn.setAttribute('aria-label', 'Stop bot match');
      this.menuStopBtn.textContent = 'Stop Match';
    }
  }

  setReplayBarVisible(visible: boolean): void {
    this.replayBar.hidden = !visible;
  }

  updateReplayUi(title: string, desc: string, step: number, total: number, isPlaying: boolean): void {
    this.replayTitle.textContent = title;
    this.replayMoveDesc.textContent = desc;
    this.replayStep.textContent = `${step} / ${total}`;
    this.replayPlayIcon.textContent = isPlaying ? '❚❚' : '▶';
    this.replayPlayBtn.setAttribute('title', isPlaying ? 'Pause (Space)' : 'Play (Space)');
    this.replayPrevBtn.disabled = step <= 0;
    this.replayFirstBtn.disabled = step <= 0;
    this.replayNextBtn.disabled = step >= total;
    this.replayLastBtn.disabled = step >= total;
  }

  renderMovesList(actions: Action[], seats: Seat[], activeIndex: number, onSelect?: (idx: number) => void): void {
    if (actions.length === 0) {
      this.movesList.innerHTML = '<div class="history-empty">No moves played yet.</div>';
      return;
    }
    const numPlayers = seats.length || 2;
    this.movesList.innerHTML = actions
      .map((action, i) => {
        const seat = seats[i % numPlayers];
        const desc = formatActionDescription(action, seat?.animal);
        const notation = formatNotation(action);
        const isActive = i + 1 === activeIndex;
        return `<div class="move-item ${isActive ? 'active' : ''}" data-step="${i + 1}">
          <span class="move-num">#${i + 1}</span>
          <span class="move-desc">${desc}</span>
          <span class="move-notation">${notation}</span>
        </div>`;
      })
      .join('');

    if (onSelect) {
      this.movesList.querySelectorAll<HTMLElement>('.move-item').forEach((el) => {
        el.addEventListener('click', () => {
          const step = Number(el.dataset.step);
          if (!Number.isNaN(step)) {
            onSelect(step);
          }
        });
      });
    }
  }

  // ---------------------------------------------------------------- Online
  setNet(text: string | null, tone: 'ok' | 'warn' = 'ok'): void {
    this.netEl.hidden = text === null;
    this.netEl.textContent = text ?? '';
    this.netEl.dataset.tone = tone;
  }

  showUndo(text: string | null, canVote = false): void {
    this.undoBanner.hidden = text === null;
    $<HTMLElement>('undo-text').textContent = text ?? '';
    $<HTMLElement>('undo-actions').hidden = !canVote;
  }
}
