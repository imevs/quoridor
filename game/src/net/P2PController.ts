import { joinRoom, selfId, getRelaySockets, type Room, type MessageAction } from '@trystero-p2p/nostr';
import { ANIMALS, type AnimalId } from '../game/animals';
import type { Action, GameState } from '../game/rules';
import { fromWire } from '../game/serialize';
import type { ClientMsg, ServerMsg, SessionView } from '../game/protocol';
import { Session, type SessionDeps, type SessionData, HOST_SEAT } from '../game/session';
import type { Hud, Seat } from '../ui/Hud';
import { Lobby } from '../ui/Lobby';
import type { GameController, Update } from './controller';
import { dbg, instrumentedPeerConnection, logEnvironment, maybeInstallOverlay, probeIceServers, resolveTurnConfig } from './p2pDebug';

export type P2PIntent = { create: { players: 2 | 4; animal: AnimalId; turnTimer?: number } } | { join: string };

type ClientMsgEnvelope = {
  [key: string]: any;
  fromPeerId: string;
  token?: string;
  msg: ClientMsg;
};

type ServerMsgEnvelope = {
  [key: string]: any;
  toPeerId?: string;
  msg: ServerMsg;
};

const TOKEN_KEY = (id: string) => `quoridors.p2p.token.${id}`;
const HOST_SESSION_KEY = (id: string) => `quoridors.p2p.host_session.${id}`;
const ROLE_KEY = (id: string) => `quoridors.p2p.role.${id}`;

const NOSTR_RELAY_URLS = [
  'wss://nos.lol',
  'wss://nostr.mom',
  'wss://relay.primal.net',
  'wss://purplerelay.com',
];

function setUrlP2P(id: string | null): void {
  const url = new URL(location.href);
  if (id) {
    url.searchParams.set('p2p', id);
    url.searchParams.delete('game');
  } else {
    url.searchParams.delete('p2p');
  }
  history.replaceState(null, '', url);
}

function generateP2PGameId(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/**
 * Host-authoritative peer-to-peer game controller.
 * Uses BroadcastChannel for instantaneous same-origin pairing (multi-tab / local testing)
 * plus WebTorrent WebRTC for cross-network matchmaking without dedicated backends.
 */
export class P2PController implements GameController {
  readonly kind = 'p2p' as const;
  onUpdate: (u: Update) => void = () => {};
  onExit: (message?: string) => void = () => {};

  private hud: Hud;
  private intent: P2PIntent;
  private lobby: Lobby;
  private isHost: boolean;
  private gameId: string;
  private seat: number | null = null;
  private session: Session | null = null;
  private room: Room | null = null;
  private bc: BroadcastChannel | null = null;
  private clientAction: MessageAction<ClientMsgEnvelope> | null = null;
  private serverAction: MessageAction<ServerMsgEnvelope> | null = null;
  private peerSeats = new Map<string, number | null>(); // peerId -> seat
  private view: SessionView | null = null;
  private version = -1;
  private seatsKey = '';
  private awaiting = false;
  private disposed = false;
  private timerId = 0;
  private joinTimerId = 0;
  private hostPeerId: string | null = null;
  private statusTimerId = 0;
  private startedAt = Date.now();
  private abort = new AbortController();
  private savedHostSession: SessionData | null = null;
  private autoStartTimerId = 0;

  constructor(hud: Hud, intent: P2PIntent) {
    this.hud = hud;
    this.intent = intent;

    const intentId = 'create' in intent ? null : intent.join.trim().toLowerCase();
    let saved: SessionData | null = null;
    let isRestoringHost = false;
    if (intentId) {
      const role = sessionStorage.getItem(ROLE_KEY(intentId));
      const raw = sessionStorage.getItem(HOST_SESSION_KEY(intentId));
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.id === intentId && (role === 'host' || !role)) {
            saved = parsed;
            isRestoringHost = true;
          }
        } catch {}
      }
    }

    this.savedHostSession = saved;
    this.isHost = 'create' in intent || isRestoringHost;
    this.gameId = this.isHost
      ? (saved ? saved.id : generateP2PGameId())
      : (intent as { join: string }).join.trim().toLowerCase();

    maybeInstallOverlay();
    dbg.log('Controller', `Loaded (v1.0.9, role: ${this.isHost ? 'host' : 'guest'}, gameId: ${this.gameId}, restored: ${Boolean(this.savedHostSession)}, selfId: ${selfId})`);

    this.lobby = new Lobby({
      onSeat: (seat, kind, difficulty) => this.sendOrHandle({ type: 'seat', seat, kind, difficulty }),
      onStart: () => {
        if (this.autoStartTimerId) {
          window.clearTimeout(this.autoStartTimerId);
          this.autoStartTimerId = 0;
        }
        this.sendOrHandle({ type: 'start' });
      },
      onLeave: () => this.handleLeave(),
      onCopy: (link) => {
        void navigator.clipboard?.writeText(link).then(
          () => this.hud.toast('P2P invite link copied'),
          () => this.hud.toast('Copy failed — select the link manually'),
        );
      },
    });
  }

  // ------------------------------------------------------------------ Lifecycle
  start(): void {
    if (this.disposed) return;

    if (this.isHost) {
      this.initHost();
    } else {
      this.initGuest();
    }
  }

  private saveHostSession(): void {
    if (!this.session) return;
    try {
      sessionStorage.setItem(HOST_SESSION_KEY(this.gameId), JSON.stringify(this.session.toJSON()));
    } catch (err) {
      console.warn('[P2P Host] Failed to save session to storage:', err);
    }
  }

  private handleLeave(): void {
    try {
      sessionStorage.removeItem(HOST_SESSION_KEY(this.gameId));
      sessionStorage.removeItem(ROLE_KEY(this.gameId));
      sessionStorage.removeItem(TOKEN_KEY(this.gameId));
    } catch {}
    this.onExit();
  }

  private initHost(): void {
    const deps: SessionDeps = {
      now: () => Date.now(),
      token: () => `tok_${Math.random().toString(36).slice(2)}`,
    };

    if (this.savedHostSession) {
      console.log(`[P2P Host] Restoring existing host session for game "${this.gameId}" from storage`);
      this.session = Session.fromJSON(this.savedHostSession, deps);
      this.seat = HOST_SEAT;
      this.session.connect(HOST_SEAT);
    } else {
      const createData = (this.intent as { create: { players: 2 | 4; animal: AnimalId; turnTimer?: number } }).create;
      const turnTimer = typeof createData.turnTimer === 'number' ? createData.turnTimer : 300;
      const { session, token } = Session.create(this.gameId, createData.players, createData.animal, deps, turnTimer);
      this.session = session;
      this.seat = HOST_SEAT;
      session.connect(HOST_SEAT);
      sessionStorage.setItem(TOKEN_KEY(this.gameId), token);
    }

    sessionStorage.setItem(ROLE_KEY(this.gameId), 'host');
    this.saveHostSession();

    this.hud.setNet(`Host · P2P ${this.gameId}`, 'ok');
    setUrlP2P(this.gameId);

    // Setup network and local broadcast
    this.setupChannels();

    // Start timer loop for AI and undo expiry
    this.timerId = window.setInterval(() => {
      if (!this.session || this.disposed) return;
      if (this.session.tick()) {
        this.saveHostSession();
        this.flushNotices();
        this.broadcastSnapshot();
      }
    }, 100);

    // Initial render
    this.applyView(this.session.view());
    this.broadcastSnapshot();
  }

  private initGuest(): void {
    sessionStorage.setItem(ROLE_KEY(this.gameId), 'guest');
    this.hud.setNet(`Connecting · P2P ${this.gameId}`, 'warn');
    setUrlP2P(this.gameId);

    // Render an initial waiting lobby so the user has immediate visual feedback
    const placeholderView: SessionView = {
      id: this.gameId,
      phase: 'lobby',
      players: 2,
      hostSeat: HOST_SEAT,
      seats: [
        { animal: 'fox', kind: 'human', difficulty: 'medium', connected: true },
        { animal: 'wolf_grey', kind: 'open', difficulty: 'medium', connected: false },
      ],
      spectators: 0,
      version: -1,
      state: null,
      event: null,
      undo: null,
      undoable: [],
    };
    this.lobby.render(placeholderView, null, this.inviteLink());

    this.setupChannels();

    // Attempt to send join requests periodically until welcomed
    const tryJoin = () => {
      if (this.disposed || this.seat !== null) return;
      const token = sessionStorage.getItem(TOKEN_KEY(this.gameId)) ?? undefined;
      const joinMsg: ClientMsg = { type: 'join', gameId: this.gameId, token };
      const env: ClientMsgEnvelope = { fromPeerId: selfId, msg: joinMsg };

      console.log(`[P2P Guest] tryJoin tick (seat=${this.seat}, hostPeerId=${this.hostPeerId})`);
      this.bc?.postMessage(env);
      if (this.clientAction) {
        if (this.hostPeerId) {
          this.clientAction.send(env, { target: this.hostPeerId })
            .then(() => console.log('[P2P Guest] tryJoin sent targeted join'))
            .catch((e) => console.warn('[P2P Guest] tryJoin targeted send failed:', e));
        }
        this.clientAction.send(env)
          .then(() => console.log('[P2P Guest] tryJoin sent broadcast join'))
          .catch((e) => console.warn('[P2P Guest] tryJoin broadcast send failed:', e));
      }
    };

    tryJoin();
    this.joinTimerId = window.setInterval(tryJoin, 1000);
  }

  private setupChannels(): void {
    const channelName = `quoridors_p2p_${this.gameId}`;

    // 1. Local BroadcastChannel for sub-millisecond local/multi-tab pairing
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.bc = new BroadcastChannel(channelName);
        if (this.isHost) {
          this.bc.onmessage = (e) => {
            const envelope = e.data as ClientMsgEnvelope;
            if (envelope && envelope.msg && envelope.fromPeerId !== selfId) {
              console.log('[P2P BroadcastChannel Host] Received message from local tab:', envelope);
              this.handleClientMsgFromPeer(envelope.fromPeerId || 'local_tab', envelope.msg, envelope.token);
            }
          };
        } else {
          this.bc.onmessage = (e) => {
            const envelope = e.data as ServerMsgEnvelope;
            if (envelope && envelope.msg) {
              if (envelope.toPeerId && envelope.toPeerId !== selfId) return;
              console.log('[P2P BroadcastChannel Guest] Received server message from local tab:', envelope);
              this.handleServerMsg(envelope.msg);
            }
          };
        }
      } catch (err) {
        console.warn('[P2P] BroadcastChannel unavailable', err);
      }
    }

    // 2. WebRTC Room for remote cross-device matchmaking
    void this.joinWebRtc();
  }

  private async joinWebRtc(): Promise<void> {
    const role = this.isHost ? 'Host' : 'Guest';
    const envError = logEnvironment();
    if (envError) {
      this.hud.toast(envError);
      if (!this.isHost) this.hud.setNet(`P2P unavailable · ${this.gameId}`, 'warn');
      return;
    }

    const turnConfig = await resolveTurnConfig();
    if (this.disposed) return;

    try {
      const roomId = `quoridor_${this.gameId}`;
      dbg.log(role, `Joining WebRTC room "${roomId}" (selfId: ${selfId}, nostr relays: ${NOSTR_RELAY_URLS.join(', ')})`);
      void probeIceServers(turnConfig);

      this.room = joinRoom(
        {
          appId: 'quoridors-v1',
          relayConfig: {
            urls: NOSTR_RELAY_URLS,
            redundancy: 4,
          },
          turnConfig,
          rtcPolyfill: instrumentedPeerConnection(),
        },
        roomId,
        {
          onJoinError: (err) => dbg.error(role, 'onJoinError:', err),
        },
      );

      this.startStatusMonitor(role);

      this.clientAction = this.room.makeAction<ClientMsgEnvelope>('client');
      this.serverAction = this.room.makeAction<ServerMsgEnvelope>('server');

      if (this.isHost) {
        this.clientAction.onMessage = (envelope, context) => {
          console.log('[P2P Host] Received client envelope:', envelope, 'context:', context);
          const msg = (envelope as any)?.msg ?? envelope;
          const peerId = (envelope as any)?.fromPeerId || context?.peerId;
          const token = (envelope as any)?.token;
          if (!peerId) return;
          this.handleClientMsgFromPeer(peerId, msg, token);
        };

        this.room.onPeerJoin = (peerId) => {
          dbg.log('Host', `WebRTC peer connected: ${peerId} (+${((Date.now() - this.startedAt) / 1000).toFixed(1)}s since start)`);
          if (!this.session) return;

          let seat = this.peerSeats.get(peerId);
          let token: string | null = null;
          if (seat === undefined || seat === null) {
            if (this.session.phase === 'lobby') {
              const joinRes = this.session.join();
              seat = joinRes.seat;
              token = joinRes.token;
              this.peerSeats.set(peerId, seat);
              if (seat !== null) {
                this.session.connect(seat);
                console.log(`[P2P Host] Automatically assigned seat ${seat} to peer ${peerId}`);
              }
            }
          }

          if (seat !== undefined && seat !== null) {
            const welcomeMsg: ServerMsg = { type: 'welcome', gameId: this.gameId, token: token ?? null, seat };
            const welcomeEnv: ServerMsgEnvelope = { toPeerId: peerId, msg: welcomeMsg };
            this.bc?.postMessage(welcomeEnv);
            if (this.serverAction) {
              this.serverAction.send(welcomeEnv, { target: peerId }).catch(() => {});
              this.serverAction.send(welcomeEnv).catch(() => {});
            }
          }

          const snapEnv: ServerMsgEnvelope = { toPeerId: peerId, msg: { type: 'snapshot', view: this.session.view() } };
          this.bc?.postMessage(snapEnv);
          if (this.serverAction) {
            this.serverAction.send(snapEnv, { target: peerId }).catch(() => {});
            this.serverAction.send(snapEnv).catch(() => {});
          }

          this.saveHostSession();
          this.flushNotices();
          this.broadcastSnapshot();
        };

        this.room.onPeerLeave = (peerId) => {
          dbg.log('Host', `WebRTC peer disconnected: ${peerId} (seat: ${this.peerSeats.get(peerId) ?? 'none'})`);
          if (this.autoStartTimerId) {
            window.clearTimeout(this.autoStartTimerId);
            this.autoStartTimerId = 0;
          }
          const seat = this.peerSeats.get(peerId);
          if (seat !== undefined && seat !== null && this.session) {
            this.session.disconnect(seat);
            this.peerSeats.delete(peerId);
            this.saveHostSession();
            this.flushNotices();
            this.broadcastSnapshot();
          }
        };
      } else {
        this.serverAction.onMessage = (envelope, context) => {
          console.log('[P2P Guest] Received server message envelope:', envelope, 'context:', context);
          const msg = (envelope as any)?.msg ?? envelope;
          const toPeerId = (envelope as any)?.toPeerId;
          if (toPeerId && toPeerId !== selfId) {
            console.log(`[P2P Guest] Ignoring message for other peer (${toPeerId} !== ${selfId})`);
            return;
          }
          this.handleServerMsg(msg);
        };

        this.room.onPeerJoin = (peerId) => {
          dbg.log('Guest', `WebRTC peer connected: ${peerId} (+${((Date.now() - this.startedAt) / 1000).toFixed(1)}s since start)`);
          this.hostPeerId = peerId;
          const token = sessionStorage.getItem(TOKEN_KEY(this.gameId)) ?? undefined;
          const joinMsg: ClientMsg = { type: 'join', gameId: this.gameId, token };
          const env: ClientMsgEnvelope = { fromPeerId: selfId, token, msg: joinMsg };

          this.bc?.postMessage(env);
          if (this.clientAction) {
            console.log('[P2P Guest] Sending join to connected peer:', peerId);
            this.clientAction.send(env, { target: peerId })
              .then(() => console.log('[P2P Guest] Sent targeted join to', peerId))
              .catch((e) => console.warn('[P2P Guest] Targeted join failed:', e));
            this.clientAction.send(env)
              .then(() => console.log('[P2P Guest] Sent broadcast join'))
              .catch((e) => console.warn('[P2P Guest] Broadcast join failed:', e));
          }
        };

        this.room.onPeerLeave = (peerId) => {
          dbg.warn('Guest', `WebRTC peer left: ${peerId}${peerId === this.hostPeerId ? ' (host)' : ''}`);
        };
      }
    } catch (err) {
      dbg.error(role, 'Failed to join WebRTC room:', err);
    }
  }

  /** Periodically logs nostr relay socket states and peer count; every 5s until connected, then every 30s. */
  private startStatusMonitor(role: string): void {
    const socketState = ['connecting', 'open', 'closing', 'closed'];
    let ticks = 0;
    let warnedNoPeer = false;
    this.statusTimerId = window.setInterval(() => {
      if (this.disposed || !this.room) return;
      ticks++;
      const peers = Object.keys(this.room.getPeers());
      const connected = peers.length > 0 && (this.isHost || this.seat !== null);
      if (connected && ticks % 6 !== 0) return;

      const relays: Record<string, string> = {};
      try {
        const sockets = (getRelaySockets() ?? {}) as Record<string, WebSocket | undefined>;
        for (const [url, ws] of Object.entries(sockets)) relays[url] = ws ? socketState[ws.readyState] ?? String(ws.readyState) : 'none';
      } catch (err) {
        relays.error = String(err);
      }
      const openRelays = Object.values(relays).filter((s) => s === 'open').length;
      dbg.log(role, 'Status:', { peers, seat: this.seat, hostPeerId: this.hostPeerId, openRelays, relays, online: navigator.onLine });

      if (openRelays === 0) {
        dbg.error(role, 'No nostr relay is connected — signaling cannot happen. Check network/firewall/content blockers for wss:// relays.');
      }
      if (!warnedNoPeer && peers.length === 0 && Date.now() - this.startedAt > 20000) {
        warnedNoPeer = true;
        dbg.warn(role, this.isHost
          ? 'No guest connected after 20s. If the guest log shows offers/answers but connectionState "failed", the problem is NAT traversal (TURN).'
          : 'No host connected after 20s. Check the host tab is open with the same game id, both share at least one open relay, ' +
            'and look for "RTC pc*" lines: none = signaling problem; "failed" = NAT traversal (TURN) problem.');
      }
    }, 5000);
  }

  // ------------------------------------------------------------------ Host Logic
  private handleClientMsgFromPeer(peerId: string, msg: ClientMsg, clientToken?: string): void {
    if (!this.session) return;
    console.log('[P2P Host] handleClientMsgFromPeer from:', peerId, 'msg:', msg);

    const token = (msg.type === 'join' ? msg.token : clientToken) ?? clientToken;

    if (msg.type === 'join') {
      let seat = this.peerSeats.get(peerId);
      let assignedToken: string | null = null;
      if (seat === undefined || seat === null || token) {
        const joinRes = this.session.join(token);
        seat = joinRes.seat;
        assignedToken = joinRes.token;
        this.peerSeats.set(peerId, seat);
        if (seat !== null) {
          this.session.connect(seat);
        }
      }

      console.log(`[P2P Host] Assigned seat ${seat} to peer ${peerId}`);

      const welcomeMsg: ServerMsg = { type: 'welcome', gameId: this.gameId, token: assignedToken ?? null, seat: seat ?? null };
      const envelope: ServerMsgEnvelope = { toPeerId: peerId, msg: welcomeMsg };

      // Dispatch to local BroadcastChannel and WebRTC
      this.bc?.postMessage(envelope);
      if (this.serverAction) {
        this.serverAction.send(envelope, { target: peerId })
          .then(() => console.log('[P2P Host] Sent targeted welcome in response to join'))
          .catch((e) => console.warn('[P2P Host] Targeted welcome failed:', e));
        this.serverAction.send(envelope)
          .then(() => console.log('[P2P Host] Sent broadcast welcome in response to join'))
          .catch((e) => console.warn('[P2P Host] Broadcast welcome failed:', e));
      }

      this.saveHostSession();
      this.flushNotices();
      this.broadcastSnapshot();
      return;
    }

    let seat = this.peerSeats.get(peerId);
    if ((seat === undefined || seat === null) && token) {
      const joinRes = this.session.join(token);
      seat = joinRes.seat;
      if (seat !== null) {
        this.peerSeats.set(peerId, seat);
        this.session.connect(seat);
      }
    }

    if (seat === undefined || seat === null) {
      const errMsg: ServerMsg = { type: 'error', message: 'You have not joined this session yet' };
      const env: ServerMsgEnvelope = { toPeerId: peerId, msg: errMsg };
      this.bc?.postMessage(env);
      if (this.serverAction) {
        this.serverAction.send(env, { target: peerId }).catch(() => {});
        this.serverAction.send(env).catch(() => {});
      }
      return;
    }

    this.processSessionAction(seat, msg, peerId);
  }

  private processSessionAction(seat: number | null, msg: ClientMsg, targetPeerId?: string): void {
    if (!this.session) return;

    if (seat === null && msg.type !== 'start') {
      const errMsg: ServerMsg = { type: 'error', message: 'Spectators cannot perform game actions' };
      if (targetPeerId) {
        const env: ServerMsgEnvelope = { toPeerId: targetPeerId, msg: errMsg };
        this.bc?.postMessage(env);
        if (this.serverAction) {
          void this.serverAction.send(env, { target: targetPeerId });
        }
      } else {
        this.hud.toast(errMsg.message);
      }
      return;
    }

    let res: { ok: true } | { ok: false; error: string };

    switch (msg.type) {
      case 'seat':
        res = this.session.configureSeat(seat!, msg.seat, msg.kind, msg.difficulty);
        break;
      case 'start':
        res = this.session.start(seat ?? -1);
        console.log(`[P2P Host] session.start returned:`, res);
        break;
      case 'action':
        res = this.session.act(seat!, msg.action);
        break;
      case 'undo':
        res = this.session.requestUndo(seat!);
        break;
      case 'vote':
        res = this.session.voteUndo(seat!, msg.accept);
        break;
      case 'rematch':
        res = this.session.rematch(seat!);
        break;
      default:
        res = { ok: false, error: 'Unknown action' };
    }

    if (!res.ok) {
      const errMsg: ServerMsg = { type: 'error', message: res.error };
      if (targetPeerId) {
        const env: ServerMsgEnvelope = { toPeerId: targetPeerId, msg: errMsg };
        this.bc?.postMessage(env);
        if (this.serverAction) {
          this.serverAction.send(env, { target: targetPeerId }).catch(() => {});
          this.serverAction.send(env).catch(() => {});
        }
      } else {
        this.hud.toast(res.error);
        this.awaiting = false;
      }
      return;
    }

    this.flushNotices();
    this.broadcastSnapshot();
  }

  private maybeAutoStart(): void {
    if (!this.isHost || !this.session || this.disposed) return;
    if (this.session.phase !== 'lobby') return;

    const view = this.session.view();
    const hasOpenSeat = view.seats.some((s) => s.kind === 'open');
    if (hasOpenSeat) return;

    const allHumansConnected = view.seats.every((s) => s.kind !== 'human' || s.connected);
    if (!allHumansConnected) return;

    if (this.autoStartTimerId) {
      window.clearTimeout(this.autoStartTimerId);
    }

    console.log('[P2P Host] All players connected! Scheduling automatic game start...');
    this.autoStartTimerId = window.setTimeout(() => {
      this.autoStartTimerId = 0;
      if (!this.session || this.session.phase !== 'lobby' || this.disposed) return;
      const currentView = this.session.view();
      const stillReady = !currentView.seats.some((s) => s.kind === 'open') &&
        currentView.seats.every((s) => s.kind !== 'human' || s.connected);
      if (stillReady) {
        console.log('[P2P Host] All players connected! Automatically starting game with host.');
        this.sendOrHandle({ type: 'start' });
      }
    }, 400);
  }

  private flushNotices(): void {
    if (!this.session) return;
    const notices = this.session.drainNotices();
    for (const message of notices) {
      this.hud.toast(message);
      const env: ServerMsgEnvelope = { msg: { type: 'notice', message } };
      this.bc?.postMessage(env);
      if (this.serverAction) {
        this.serverAction.send(env).catch(() => {});
      }
    }
  }

  private broadcastSnapshot(): void {
    if (!this.session) return;
    this.saveHostSession();
    const view = this.session.view();
    this.applyView(view);

    const env: ServerMsgEnvelope = { msg: { type: 'snapshot', view } };
    this.bc?.postMessage(env);
    if (this.serverAction) {
      console.log(`[P2P Host] Broadcasting snapshot v${view.version} (phase: ${view.phase}) to peers`);
      this.serverAction.send(env)
        .then(() => console.log(`[P2P Host] Broadcast snapshot v${view.version} sent`))
        .catch((e) => console.warn(`[P2P Host] Broadcast snapshot v${view.version} failed:`, e));
    }
    this.maybeAutoStart();
  }

  // ------------------------------------------------------------------ Guest Logic
  private handleServerMsg(msg: ServerMsg): void {
    console.log('[P2P Guest] handleServerMsg:', msg.type);
    switch (msg.type) {
      case 'welcome':
        if (this.joinTimerId) {
          window.clearInterval(this.joinTimerId);
          this.joinTimerId = 0;
        }
        this.seat = msg.seat;
        if (msg.token) {
          sessionStorage.setItem(TOKEN_KEY(this.gameId), msg.token);
        }
        this.hud.setNet(msg.seat === null ? `Spectating · P2P ${this.gameId}` : `Seat ${msg.seat + 1} · P2P ${this.gameId}`, 'ok');
        console.log(`[P2P Guest] Welcomed! Assigned seat: ${msg.seat}`);
        if (this.view) {
          this.applyView(this.view);
        }
        break;
      case 'snapshot':
        console.log('[P2P Guest] Applied snapshot version:', msg.view.version, 'phase:', msg.view.phase);
        this.applyView(msg.view);
        break;
      case 'notice':
        this.hud.toast(msg.message);
        break;
      case 'error':
        this.hud.toast(msg.message);
        if (msg.fatal) {
          setUrlP2P(null);
          this.handleLeave();
          return;
        }
        this.awaiting = false;
        if (this.view) this.onUpdate({ type: 'seats', seats: this.toSeats(this.view) });
        break;
    }
  }

  private sendOrHandle(msg: ClientMsg): void {
    if (this.isHost) {
      this.processSessionAction(HOST_SEAT, msg);
    } else {
      const token = sessionStorage.getItem(TOKEN_KEY(this.gameId)) ?? undefined;
      const env: ClientMsgEnvelope = { fromPeerId: selfId, token, msg };
      this.bc?.postMessage(env);
      if (this.clientAction) {
        if (this.hostPeerId) {
          this.clientAction.send(env, { target: this.hostPeerId }).catch(() => {});
        }
        this.clientAction.send(env).catch(() => {});
      }
    }
  }

  // ------------------------------------------------------------------ View Sync
  private toSeats(v: SessionView): Seat[] {
    return v.seats.map((s, i) => ({
      animal: s.animal,
      human: s.kind !== 'ai',
      local: i === this.seat,
      away: s.kind === 'human' && !s.connected,
    }));
  }

  private applyView(v: SessionView): void {
    console.log(`[P2P ${this.isHost ? 'Host' : 'Guest'}] applyView called. Phase: ${v.phase}, Version: ${v.version}, MySeat: ${this.seat}, State: ${Boolean(v.state)}`);
    this.view = v;
    this.awaiting = false;
    this.renderUndo(v);

    if (v.phase === 'lobby' || !v.state) {
      console.log(`[P2P ${this.isHost ? 'Host' : 'Guest'}] Rendering Lobby Dialog (Phase: ${v.phase})`);
      this.lobby.render(v, this.seat, this.inviteLink());
      return;
    }
    console.log(`[P2P ${this.isHost ? 'Host' : 'Guest'}] Phase is '${v.phase}' with state present! Closing lobby and starting 3D board.`);
    this.lobby.close();
    document.querySelectorAll('dialog').forEach((d) => {
      if (d.open) {
        try { d.close(); } catch {}
      }
    });

    const seats = this.toSeats(v);
    const key = JSON.stringify(seats);
    const seatsChanged = key !== this.seatsKey;
    this.seatsKey = key;
    const state = fromWire(v.state);

    if (v.version === this.version) {
      this.onUpdate({ type: 'seats', seats });
    } else if (this.version < 0 || v.event?.type === 'start') {
      this.onUpdate({ type: 'reset', state, seats, turnTimer: v.turnTimer });
    } else if (v.version === this.version + 1 && v.event?.type === 'action') {
      if (seatsChanged) this.onUpdate({ type: 'seats', seats });
      this.onUpdate({ type: 'action', seat: v.event.seat, action: v.event.action, state });
    } else if (v.version === this.version + 1 && v.event?.type === 'undo') {
      if (seatsChanged) this.onUpdate({ type: 'seats', seats });
      this.onUpdate({ type: 'undo', seat: v.event.seat, state });
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
    const requesterSeat = v.seats[u.by];
    const requesterAnimal = requesterSeat ? requesterSeat.animal : undefined;
    const who = requesterAnimal ? ANIMALS[requesterAnimal].name : `Seat ${u.by + 1}`;
    if (u.by === this.seat) {
      this.hud.showUndo(`Waiting for opponents to accept your undo (${u.accepted.length}/${u.voters.length})`);
    } else if (u.voters.includes(this.seat) && !u.accepted.includes(this.seat)) {
      this.hud.showUndo(
        `${who} asks to take back their last move`,
        () => this.sendOrHandle({ type: 'vote', accept: true }),
        () => this.sendOrHandle({ type: 'vote', accept: false }),
        { requesterAnimal, requesterName: who },
      );
    } else {
      this.hud.showUndo(`Undo requested by ${who} — waiting for other players`);
    }
  }

  private inviteLink(): string {
    const url = new URL(location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('p2p', this.gameId);
    return url.toString();
  }

  // ------------------------------------------------------------------ GameController
  submit(action: Action): void {
    if (this.awaiting) return;
    this.awaiting = true;
    this.sendOrHandle({ type: 'action', action });
  }

  canAct(s: GameState): boolean {
    const v = this.view;
    return !!v && v.phase === 'playing' && !v.undo && !this.awaiting && s.winner === null && s.turn === this.seat;
  }

  canUndo(): boolean {
    return this.seat !== null && !this.awaiting && !!this.view?.undoable.includes(this.seat);
  }

  undo(): void {
    if (this.canUndo()) this.sendOrHandle({ type: 'undo' });
  }

  canRematch(): boolean {
    return this.seat !== null && this.seat === this.view?.hostSeat;
  }

  rematch(): void {
    this.sendOrHandle({ type: 'rematch' });
  }

  viewSeat(): number {
    return this.seat ?? 0;
  }

  idle(): void {}

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.autoStartTimerId) {
      window.clearTimeout(this.autoStartTimerId);
      this.autoStartTimerId = 0;
    }
    window.clearInterval(this.timerId);
    window.clearInterval(this.joinTimerId);
    window.clearInterval(this.statusTimerId);
    dbg.log('Controller', 'Disposed');
    this.abort.abort();
    this.lobby.dispose();
    this.bc?.close();
    this.bc = null;
    void this.room?.leave();
    this.room = null;
    this.clientAction = null;
    this.serverAction = null;
    this.hud.setNet(null);
    this.hud.showUndo(null);
    setUrlP2P(null);
  }
}
