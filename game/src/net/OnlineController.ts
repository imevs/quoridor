import { ANIMALS, type AnimalId } from '../game/animals';
import type { Action, GameState } from '../game/rules';
import { fromWire } from '../game/serialize';
import type { ClientMsg, ServerMsg, SessionView } from '../game/protocol';
import type { Hud, Seat } from '../ui/Hud';
import { Lobby } from '../ui/Lobby';
import type { GameController, Update } from './controller';

export type OnlineIntent = { create: { players: 2 | 4; animal: AnimalId } } | { join: string };

const TOKEN_KEY = (id: string) => `quoridors.token.${id}`;

function wsUrl(): string {
  const override = import.meta.env.VITE_WS_URL as string | undefined;
  if (override) return override;
  return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
}

function setUrlGame(id: string | null): void {
  const url = new URL(location.href);
  if (id) url.searchParams.set('game', id);
  else url.searchParams.delete('game');
  history.replaceState(null, '', url);
}

/** Mirrors an authoritative server session over WebSocket. */
export class OnlineController implements GameController {
  readonly kind = 'online' as const;
  onUpdate: (u: Update) => void = () => {};
  onExit: (message?: string) => void = () => {};
  private hud: Hud;
  private intent: OnlineIntent;
  private lobby: Lobby;
  private ws: WebSocket | null = null;
  private disposed = false;
  private retry = 0;
  private retryTimer = 0;
  private gameId: string | null = null;
  private seat: number | null = null;
  private view: SessionView | null = null;
  private version = -1;
  private seatsKey = '';
  private awaiting = false;
  private abort = new AbortController();

  constructor(hud: Hud, intent: OnlineIntent) {
    this.hud = hud;
    this.intent = intent;
    this.lobby = new Lobby({
      onSeat: (seat, kind, difficulty) => this.send({ type: 'seat', seat, kind, difficulty }),
      onStart: () => this.send({ type: 'start' }),
      onLeave: () => this.onExit(),
      onCopy: (link) => {
        void navigator.clipboard?.writeText(link).then(
          () => this.hud.toast('Invite link copied'),
          () => this.hud.toast('Copy failed — select the link manually'),
        );
      },
    });
    const signal = this.abort.signal;
    document.getElementById('undo-accept')!.addEventListener('click', () => this.send({ type: 'vote', accept: true }), { signal });
    document.getElementById('undo-decline')!.addEventListener('click', () => this.send({ type: 'vote', accept: false }), { signal });
  }

  // ------------------------------------------------------------------ Connection
  start(): void {
    this.connect();
  }

  private connect(): void {
    if (this.disposed) return;
    this.hud.setNet(this.retry === 0 ? 'Connecting…' : 'Reconnecting…', 'warn');
    const ws = new WebSocket(wsUrl());
    this.ws = ws;
    ws.addEventListener('open', () => {
      this.retry = 0;
      if (this.gameId || 'join' in this.intent) {
        const gameId = this.gameId ?? (this.intent as { join: string }).join;
        const token = localStorage.getItem(TOKEN_KEY(gameId)) ?? undefined;
        this.send({ type: 'join', gameId, token });
      } else {
        this.send({ type: 'create', ...this.intent.create });
      }
    });
    ws.addEventListener('message', (e) => {
      try {
        this.handle(JSON.parse(String(e.data)) as ServerMsg);
      } catch (err) {
        console.error('Bad server message', err);
      }
    });
    ws.addEventListener('close', () => {
      if (this.disposed || this.ws !== ws) return;
      this.ws = null;
      this.awaiting = false;
      const delay = Math.min(8000, 500 * 2 ** this.retry++);
      this.hud.setNet('Reconnecting…', 'warn');
      this.retryTimer = window.setTimeout(() => this.connect(), delay);
    });
  }

  private send(msg: ClientMsg): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
    else this.hud.toast('Not connected');
  }

  private handle(msg: ServerMsg): void {
    switch (msg.type) {
      case 'welcome':
        this.gameId = msg.gameId;
        this.seat = msg.seat;
        if (msg.token) localStorage.setItem(TOKEN_KEY(msg.gameId), msg.token);
        setUrlGame(msg.gameId);
        this.hud.setNet(msg.seat === null ? `Spectating · ${msg.gameId}` : `Online · ${msg.gameId}`, 'ok');
        break;
      case 'snapshot':
        this.applyView(msg.view);
        break;
      case 'notice':
        this.hud.toast(msg.message);
        break;
      case 'error':
        this.hud.toast(msg.message);
        if (msg.fatal) {
          if (this.gameId === null && 'join' in this.intent) setUrlGame(null);
          this.onExit(msg.message);
          return;
        }
        this.awaiting = false;
        if (this.view) this.onUpdate({ type: 'seats', seats: this.toSeats(this.view) });
        break;
    }
  }

  // ------------------------------------------------------------------ View sync
  private toSeats(v: SessionView): Seat[] {
    return v.seats.map((s, i) => ({
      animal: s.animal,
      human: s.kind !== 'ai',
      local: i === this.seat,
      away: s.kind === 'human' && !s.connected,
    }));
  }

  private applyView(v: SessionView): void {
    this.view = v;
    this.awaiting = false;
    this.renderUndo(v);

    if (v.phase === 'lobby' || !v.state) {
      this.lobby.render(v, this.seat, this.inviteLink());
      return;
    }
    this.lobby.close();

    const seats = this.toSeats(v);
    const key = JSON.stringify(seats);
    const seatsChanged = key !== this.seatsKey;
    this.seatsKey = key;
    const state = fromWire(v.state);

    if (v.version === this.version) {
      this.onUpdate({ type: 'seats', seats });
    } else if (this.version < 0 || v.event?.type === 'start') {
      this.onUpdate({ type: 'reset', state, seats });
    } else if (v.version === this.version + 1 && v.event?.type === 'action') {
      if (seatsChanged) this.onUpdate({ type: 'seats', seats });
      this.onUpdate({ type: 'action', seat: v.event.seat, action: v.event.action, state });
    } else {
      this.onUpdate({ type: 'seats', seats });
      this.onUpdate({ type: 'sync', state });
    }
    this.version = v.version;
  }

  private renderUndo(v: SessionView): void {
    const u = v.undo;
    if (!u || this.seat === null) {
      this.hud.showUndo(null);
      return;
    }
    const who = ANIMALS[v.seats[u.by].animal].name;
    if (u.by === this.seat) {
      this.hud.showUndo(`Waiting for opponents to accept your undo (${u.accepted.length}/${u.voters.length})`, false);
    } else if (u.voters.includes(this.seat) && !u.accepted.includes(this.seat)) {
      this.hud.showUndo(`${who} asks to take back their last move`, true);
    } else {
      this.hud.showUndo(`Undo requested by ${who} — waiting for other players`, false);
    }
  }

  private inviteLink(): string {
    const url = new URL(location.href);
    url.search = '';
    url.hash = '';
    if (this.gameId) url.searchParams.set('game', this.gameId);
    return url.toString();
  }

  // ------------------------------------------------------------------ GameController
  submit(action: Action): void {
    if (this.awaiting) return;
    this.awaiting = true;
    this.send({ type: 'action', action });
  }

  canAct(s: GameState): boolean {
    const v = this.view;
    return !!v && v.phase === 'playing' && !v.undo && !this.awaiting && s.winner === null && s.turn === this.seat;
  }

  canUndo(): boolean {
    return this.seat !== null && !this.awaiting && !!this.view?.undoable.includes(this.seat);
  }

  undo(): void {
    if (this.canUndo()) this.send({ type: 'undo' });
  }

  canRematch(): boolean {
    return this.seat !== null && this.seat === this.view?.hostSeat;
  }

  rematch(): void {
    this.send({ type: 'rematch' });
  }

  viewSeat(): number {
    return this.seat ?? 0;
  }

  idle(): void {}

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    window.clearTimeout(this.retryTimer);
    this.abort.abort();
    this.lobby.dispose();
    this.ws?.close();
    this.ws = null;
    this.hud.setNet(null);
    this.hud.showUndo(null);
    setUrlGame(null);
  }
}
