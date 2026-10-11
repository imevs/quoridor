import { signal } from '@preact/signals';
import type { AnimalId } from '../game/animals';
import type { Difficulty } from '../game/ai';
import type { Action } from '../game/rules';
import type { HistoryRecord } from '../game/history';
import type { SessionView } from '../game/protocol';
import type { GameConfig, Seat } from './Hud';

export interface PlayerCardItem {
  seat: Seat;
  index: number;
  wallsLeft: number;
  wallsMax: number;
  steps: number;
  clockVal?: number;
  initialClock: number;
  isTurn: boolean;
  isAway: boolean;
}

export interface HudCallbacks {
  onStartGame?: (cfg: GameConfig) => void;
  onOpenMenu?: () => void;
  onCloseMenu?: () => void;
  onCycleCamera?: () => void;
  onToggleSound?: () => void;
  onToggleBotMatch?: () => void;
  onUndo?: () => void;
  onRequestHint?: () => void;
  onApplyHint?: () => void;
  onHoverSeat?: (seatIndex: number | null) => void;
  onTapSeat?: (seatIndex: number) => void;
  onUnpinDestination?: () => void;
  onRematch?: () => void;
  onMenuFromWin?: () => void;
  onStartReplay?: (record: HistoryRecord) => void;
  onReplayPlay?: () => void;
  onReplayPrev?: () => void;
  onReplayNext?: () => void;
  onReplayFirst?: () => void;
  onReplayLast?: () => void;
  onReplayExit?: () => void;
  onClearHistory?: () => void;
  onLobbySeat?: (seat: number, kind: 'open' | 'ai', diff: Difficulty) => void;
  onLobbyStart?: () => void;
  onLobbyLeave?: () => void;
  onLobbyCopy?: (link: string) => void;
}

export class HudStore {
  // Loader
  readonly loadingProgress = signal(0);
  readonly loadingDone = signal(false);

  // Top Bar & Turn
  readonly netStatus = signal<{ text: string; tone: 'ok' | 'warn'; visible: boolean }>({
    text: '',
    tone: 'ok',
    visible: false,
  });
  readonly turnState = signal<{ seat: Seat | null; label: string; pop: boolean }>({
    seat: null,
    label: '—',
    pop: false,
  });
  readonly turnTimer = signal<{ remaining: number; initial: number; visible: boolean; urgent: boolean }>({
    remaining: 30,
    initial: 300,
    visible: false,
    urgent: false,
  });

  // Action Buttons & Controls
  readonly soundEnabled = signal(true);
  readonly canUndo = signal(false);
  readonly canHint = signal(false);
  readonly botMatchActive = signal(false);
  readonly botMatchPaused = signal(false);

  // Player Cards
  readonly playersList = signal<PlayerCardItem[]>([]);
  readonly pinnedSeat = signal<number | null>(null);

  // Notifications
  readonly hintState = signal<{ html: string; active: boolean; rawSummary?: string }>({
    html: '',
    active: false,
  });
  readonly toastState = signal<{ message: string; visible: boolean }>({
    message: '',
    visible: false,
  });
  readonly destinationState = signal<{
    seat: Seat;
    index: number;
    title: string;
    desc: string;
    pinned: boolean;
  } | null>(null);
  readonly undoBanner = signal<{
    text: string;
    visible: boolean;
    onAccept?: () => void;
    onDecline?: () => void;
  }>({
    text: '',
    visible: false,
  });

  // Replay
  readonly replayState = signal<{
    visible: boolean;
    title: string;
    desc: string;
    current: number;
    total: number;
    playing: boolean;
  }>({
    visible: false,
    title: 'Replay',
    desc: '—',
    current: 0,
    total: 0,
    playing: false,
  });

  // Dialogs
  readonly menuOpen = signal(false);
  readonly gameConfig = signal<GameConfig>({
    mode: 'ai',
    players: 2,
    difficulty: 'medium',
    animal: 'fox' as AnimalId,
    turnTimer: 300,
  });
  readonly rulesOpen = signal(false);
  readonly winOpen = signal(false);
  readonly winData = signal<{ seat: Seat; title: string; sub: string; canRematch: boolean } | null>(null);
  readonly historyOpen = signal(false);
  readonly historyRecords = signal<HistoryRecord[]>([]);
  readonly movesOpen = signal(false);
  readonly movesData = signal<{
    actions: Action[];
    seats: Seat[];
    currentStep: number;
    onSelect?: (step: number) => void;
  }>({
    actions: [],
    seats: [],
    currentStep: 0,
  });
  readonly lobbyOpen = signal(false);
  readonly lobbyData = signal<{ view: SessionView; mySeat: number | null; link: string } | null>(null);

  // Callbacks
  callbacks: HudCallbacks = {};
}

export const hudStore = new HudStore();
