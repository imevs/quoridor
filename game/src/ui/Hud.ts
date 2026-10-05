import { ANIMALS, ANIMAL_ORDER, type AnimalId } from '../game/animals';
import type { Difficulty } from '../game/ai';
import { type GameState, shortestPath } from '../game/rules';
import type { HistoryRecord } from '../game/history';

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
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const STORAGE_KEY = 'quoridors.config';

export class Hud {
  private playersEl = $<HTMLElement>('players');
  private turnPill = $<HTMLElement>('turn-pill');
  private turnEmoji = $<HTMLElement>('turn-emoji');
  private turnText = $<HTMLElement>('turn-text');
  private hintEl = $<HTMLElement>('hint');
  private toastEl = $<HTMLElement>('toast');
  private toastTimer = 0;
  readonly menu = $<HTMLDialogElement>('menu-dialog');
  readonly rules = $<HTMLDialogElement>('rules-dialog');
  readonly win = $<HTMLDialogElement>('win-dialog');
  readonly historyDialog = $<HTMLDialogElement>('history-dialog');
  readonly historyList = $<HTMLElement>('history-list');
  readonly undoBtn = $<HTMLButtonElement>('btn-undo');
  readonly soundBtn = $<HTMLButtonElement>('btn-sound');
  readonly soundOnIcon = $<HTMLElement>('icon-sound-on');
  readonly soundOffIcon = $<HTMLElement>('icon-sound-off');
  readonly historyBtn = $<HTMLButtonElement>('btn-history');
  readonly clearHistoryBtn = $<HTMLButtonElement>('btn-clear-history');
  readonly closeHistoryBtn = $<HTMLButtonElement>('btn-close-history');
  readonly cameraBtn = $<HTMLButtonElement>('btn-camera');
  private netEl = $<HTMLElement>('net-status');
  private undoBanner = $<HTMLElement>('undo-banner');

  constructor() {
    this.buildAnimalPicker();
    $<HTMLElement>('mode-online').hidden = !__ONLINE__;
    const form = $<HTMLFormElement>('menu-form');
    form.addEventListener('change', () => this.syncMenuFields());
    this.closeHistoryBtn.addEventListener('click', () => {
      this.historyDialog.close();
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
    $<HTMLElement>('btn-start').textContent =
      mode === 'online' ? 'Create Online Game' : mode === 'bot_vs_bot' ? 'Watch Bots Play' : 'Start Game';
  }

  private formValue(name: string): string {
    const el = document.querySelector<HTMLInputElement>(`#menu-form input[name="${name}"]:checked`);
    return el?.value ?? '';
  }

  readConfig(): GameConfig {
    const mode = this.formValue('mode');
    const cfg: GameConfig = {
      mode: mode === 'local' ? 'local' : mode === 'bot_vs_bot' ? 'bot_vs_bot' : mode === 'online' && __ONLINE__ ? 'online' : 'ai',
      players: this.formValue('players') === '4' ? 4 : 2,
      difficulty: (this.formValue('difficulty') || 'medium') as Difficulty,
      animal: (this.formValue('animal') || 'fox') as AnimalId,
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
    } catch {
      /* ignore corrupt storage */
    }
  }

  // ---------------------------------------------------------------- In-game
  renderPlayers(state: GameState, seats: Seat[]): void {
    const wallsMax = seats.length === 2 ? 10 : 5;
    const localHumans = seats.filter((s) => s.human && s.local).length;
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
        return `<article class="player-card ${state.turn === i && state.winner === null ? 'active' : ''} ${seat.away ? 'away' : ''}" style="--pc:${a.color}">
          <div class="avatar" aria-hidden="true">${a.emoji}</div>
          <div class="player-head">${a.name}<span class="badge ${seat.local ? 'you' : ''}">${badge}</span>
            <span class="steps" title="Shortest path to goal">${steps} step${steps === 1 ? '' : 's'}</span></div>
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

  setHint(text: string): void {
    this.hintEl.textContent = text;
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
        return `<article class="history-item" style="--pc:${a.color}">
          <div class="avatar" aria-hidden="true">${a.emoji}</div>
          <div class="history-item-main">
            <b>${r.winnerName} won</b>
            <small>${modeLabel} · ${r.players} Players · ${dateStr}</small>
          </div>
          <div class="history-item-meta">
            <span>${r.movesCount} moves</span>
            <br><small>${r.wallsCount} hedges</small>
          </div>
        </article>`;
      })
      .join('');
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
