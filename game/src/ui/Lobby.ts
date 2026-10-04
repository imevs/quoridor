import { ANIMALS } from '../game/animals';
import type { Difficulty } from '../game/ai';
import type { SessionView } from '../game/protocol';

export interface LobbyHandlers {
  onSeat(seat: number, kind: 'open' | 'ai', difficulty: Difficulty): void;
  onStart(): void;
  onLeave(): void;
  onCopy(link: string): void;
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const LEVEL: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

/** Waiting-room dialog for online games. Only bundled in the online build. */
export class Lobby {
  readonly dialog = $<HTMLDialogElement>('lobby-dialog');
  private seatsEl = $<HTMLElement>('lobby-seats');
  private statusEl = $<HTMLElement>('lobby-status');
  private linkEl = $<HTMLInputElement>('invite-link');
  private startBtn = $<HTMLButtonElement>('btn-lobby-start');
  private shareBtn = $<HTMLButtonElement>('btn-share');
  private abort = new AbortController();

  constructor(handlers: LobbyHandlers) {
    const signal = this.abort.signal;
    this.dialog.addEventListener('cancel', (e) => e.preventDefault(), { signal });
    $('btn-copy').addEventListener('click', () => handlers.onCopy(this.linkEl.value), { signal });
    this.linkEl.addEventListener('focus', () => this.linkEl.select(), { signal });
    this.startBtn.addEventListener('click', () => handlers.onStart(), { signal });
    $('btn-leave').addEventListener('click', () => handlers.onLeave(), { signal });
    this.shareBtn.hidden = typeof navigator.share !== 'function';
    this.shareBtn.addEventListener(
      'click',
      () => void navigator.share({ title: 'Quoridors', text: 'Join my Quoridors game', url: this.linkEl.value }).catch(() => {}),
      { signal },
    );
    this.seatsEl.addEventListener(
      'change',
      (e) => {
        const sel = e.target as HTMLSelectElement;
        const seat = Number(sel.dataset.seat);
        const [kind, diff] = sel.value.split(':');
        if (kind === 'open') handlers.onSeat(seat, 'open', 'medium');
        else if (kind === 'ai') handlers.onSeat(seat, 'ai', diff as Difficulty);
      },
      { signal },
    );
  }

  render(v: SessionView, mySeat: number | null, link: string): void {
    const isHost = mySeat === v.hostSeat;
    this.linkEl.value = link;
    this.seatsEl.innerHTML = v.seats
      .map((s, i) => {
        const a = ANIMALS[s.animal];
        let status: string;
        if (s.kind === 'ai') status = `Computer · ${LEVEL[s.difficulty]}`;
        else if (s.kind === 'open') status = 'Waiting for player…';
        else status = s.connected ? 'Connected' : 'Away';
        const tags = [i === v.hostSeat ? 'Host' : '', i === mySeat ? 'You' : ''].filter(Boolean);
        const editable = isHost && i !== v.hostSeat && !(s.kind === 'human' && s.connected);
        const opt = (value: string, label: string, sel: boolean) =>
          `<option value="${value}" ${sel ? 'selected' : ''}>${label}</option>`;
        const control = editable
          ? `<select data-seat="${i}" aria-label="Seat ${i + 1} occupant">
              ${s.kind === 'human' ? opt('keep', 'Player (away)', true) : ''}
              ${opt('open', 'Open seat', s.kind === 'open')}
              ${(['easy', 'medium', 'hard'] as const)
                .map((d) => opt(`ai:${d}`, `Computer · ${LEVEL[d]}`, s.kind === 'ai' && s.difficulty === d))
                .join('')}
            </select>`
          : '';
        return `<li class="lobby-seat ${s.kind} ${s.connected ? 'online' : ''}" style="--pc:${a.color}">
          <span class="avatar" aria-hidden="true">${a.emoji}</span>
          <span class="lobby-seat-main"><b>${a.name}</b>${tags.map((t) => `<span class="badge you">${t}</span>`).join('')}
            <small>${status}</small></span>
          ${control}
        </li>`;
      })
      .join('');

    const ready = v.seats.every((s) => s.kind !== 'open');
    this.startBtn.hidden = !isHost;
    this.startBtn.disabled = !ready;
    if (mySeat === null) this.statusEl.textContent = 'This game is full — you will watch as a spectator.';
    else if (!isHost) this.statusEl.textContent = 'Waiting for the host to start the game…';
    else this.statusEl.textContent = ready ? 'Everyone is here. Ready when you are!' : 'Invite players or assign the computer to open seats.';
    if (!this.dialog.open) this.dialog.showModal();
  }

  close(): void {
    if (this.dialog.open) this.dialog.close();
  }

  dispose(): void {
    this.close();
    this.abort.abort();
  }
}
