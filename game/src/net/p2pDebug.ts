/**
 * P2P diagnostics: timestamped log buffer, ICE server resolution, an instrumented
 * RTCPeerConnection (passed to Trystero as `rtcPolyfill`), a STUN/TURN reachability
 * probe, and an optional on-screen log overlay for devices without DevTools.
 *
 * Usage when a cross-device connection fails:
 *   - Open the game with `?p2pdebug=1` on both devices to show the overlay
 *     (persists in localStorage; `?p2pdebug=0` turns it off).
 *   - Or run `quoridorsP2P.dump()` in the console to print the full log.
 *   - Use the overlay's "Download" button to save the log from a phone.
 */
import type { TurnServerConfig } from '@trystero-p2p/nostr';
import '../styles/p2p-debug.css';

type Level = 'log' | 'warn' | 'error';
type Entry = { t: number; level: Level; scope: string; text: string };

const MAX_ENTRIES = 2000;
const OVERLAY_KEY = 'quoridors.p2p.debug';
const TURN_OVERRIDE_KEY = 'quoridors.p2p.turn';

const entries: Entry[] = [];
const t0 = Date.now();
let overlayPre: HTMLPreElement | null = null;

function stringify(arg: unknown): string {
  if (typeof arg === 'string') return arg;
  if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

function formatEntry(e: Entry): string {
  const tag = e.level === 'log' ? '' : ` ${e.level.toUpperCase()}`;
  return `+${(e.t / 1000).toFixed(2)}s${tag} [${e.scope}] ${e.text}`;
}

function write(level: Level, scope: string, args: unknown[]): void {
  const entry: Entry = { t: Date.now() - t0, level, scope, text: args.map(stringify).join(' ') };
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
  console[level](`[P2P ${scope}] +${(entry.t / 1000).toFixed(2)}s`, ...args);
  if (overlayPre) {
    overlayPre.textContent += formatEntry(entry) + '\n';
    overlayPre.scrollTop = overlayPre.scrollHeight;
  }
}

export const dbg = {
  log: (scope: string, ...args: unknown[]) => write('log', scope, args),
  warn: (scope: string, ...args: unknown[]) => write('warn', scope, args),
  error: (scope: string, ...args: unknown[]) => write('error', scope, args),
};

export function dumpLog(): string {
  return entries.map(formatEntry).join('\n');
}

declare global {
  interface Window {
    quoridorsP2P?: { dump: () => string; entries: Entry[] };
  }
}
if (typeof window !== 'undefined') {
  window.quoridorsP2P = {
    dump: () => {
      const text = dumpLog();
      console.log(text);
      return text;
    },
    entries,
  };
}

// ------------------------------------------------------------------ Environment

/**
 * Logs browser capabilities relevant to WebRTC. Returns an error message if P2P
 * cannot work in this context, otherwise null.
 */
export function logEnvironment(): string | null {
  const nav = navigator as Navigator & { connection?: { type?: string; effectiveType?: string } };
  dbg.log('Env', {
    origin: location.origin,
    secureContext: window.isSecureContext,
    cryptoSubtle: Boolean(globalThis.crypto?.subtle),
    rtcPeerConnection: typeof RTCPeerConnection !== 'undefined',
    broadcastChannel: typeof BroadcastChannel !== 'undefined',
    online: navigator.onLine,
    connection: nav.connection ? `${nav.connection.type ?? '?'} / ${nav.connection.effectiveType ?? '?'}` : 'n/a',
    userAgent: navigator.userAgent,
  });

  if (!window.isSecureContext || !globalThis.crypto?.subtle) {
    const msg =
      `Insecure context (${location.origin}): crypto.subtle is unavailable, so P2P signaling cannot run. ` +
      'Open the game over HTTPS (or http://localhost). Plain http://<LAN-IP> on another device will not work.';
    dbg.error('Env', msg);
    return 'P2P needs HTTPS — open the game via an https:// URL';
  }
  if (typeof RTCPeerConnection === 'undefined') {
    const msg = 'WebRTC (RTCPeerConnection) is not available in this browser';
    dbg.error('Env', msg);
    return msg;
  }
  return null;
}

// ------------------------------------------------------------------ ICE servers

const FALLBACK_TURN: TurnServerConfig[] = [
  {
    // Public shared relay; heavily rate-limited and often unavailable.
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443?transport=tcp',
      'turns:openrelay.metered.ca:443?transport=tcp',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

const CREDENTIALS_FETCH_TIMEOUT_MS = 5000;

const isTurnUrl = (u: string) => /^turns?:/i.test(u);

/** Keeps only TURN entries: Trystero already adds its own STUN servers, and extra ones slow gathering. */
function onlyTurn(servers: TurnServerConfig[]): TurnServerConfig[] {
  return servers
    .map((s) => ({ ...s, urls: (Array.isArray(s.urls) ? s.urls : [s.urls]).filter(isTurnUrl) }))
    .filter((s) => s.urls.length > 0);
}

/** Fetches an RTCIceServer[] from a credentials endpoint (e.g. Metered's `/api/v1/turn/credentials?apiKey=`). */
async function fetchTurnCredentials(url: string): Promise<TurnServerConfig[] | null> {
  const host = (() => {
    try {
      return new URL(url).host;
    } catch {
      return url;
    }
  })();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CREDENTIALS_FETCH_TIMEOUT_MS);
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) {
      dbg.error('ICE', `TURN credentials request to ${host} failed: HTTP ${res.status} ${res.statusText}`);
      return null;
    }
    const body = (await res.json()) as unknown;
    const list = Array.isArray(body) ? onlyTurn(body as TurnServerConfig[]) : [];
    if (list.length === 0) {
      dbg.error('ICE', `TURN credentials response from ${host} contained no turn: URLs:`, body);
      return null;
    }
    dbg.log('ICE', `Fetched TURN credentials from ${host} in ${Date.now() - start}ms (${list.length} entries)`);
    return list;
  } catch (err) {
    dbg.error('ICE', `TURN credentials request to ${host} failed:`, ctrl.signal.aborted ? 'timeout' : err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * TURN servers, in priority order:
 *   1. localStorage `quoridors.p2p.turn` (JSON array of RTCIceServer) — for field testing
 *   2. VITE_TURN_CREDENTIALS_URL — endpoint returning RTCIceServer[] (Metered credentials API), fetched at runtime
 *   3. VITE_TURN_URLS (comma-separated) + VITE_TURN_USERNAME + VITE_TURN_CREDENTIAL — static credentials
 *   4. Public openrelay fallback
 * Trystero always prepends its default Google/Cloudflare STUN servers.
 */
export async function resolveTurnConfig(): Promise<TurnServerConfig[]> {
  try {
    const raw = localStorage.getItem(TURN_OVERRIDE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TurnServerConfig[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        dbg.log('ICE', `Using TURN override from localStorage "${TURN_OVERRIDE_KEY}"`);
        return parsed;
      }
    }
  } catch (err) {
    dbg.warn('ICE', `Ignoring invalid localStorage "${TURN_OVERRIDE_KEY}":`, err);
  }

  const credentialsUrl = import.meta.env.VITE_TURN_CREDENTIALS_URL?.trim();
  if (credentialsUrl) {
    const fetched = await fetchTurnCredentials(credentialsUrl);
    if (fetched) return fetched;
    dbg.warn('ICE', 'Falling back to static TURN config after credentials fetch failure');
  }

  const envUrls = import.meta.env.VITE_TURN_URLS?.trim();
  if (envUrls) {
    const username = import.meta.env.VITE_TURN_USERNAME?.trim();
    const credential = import.meta.env.VITE_TURN_CREDENTIAL?.trim();
    if (!username || !credential) dbg.warn('ICE', 'VITE_TURN_URLS is set but VITE_TURN_USERNAME / VITE_TURN_CREDENTIAL is missing');
    dbg.log('ICE', 'Using static TURN servers from VITE_TURN_URLS');
    return [{ urls: envUrls.split(',').map((u) => u.trim()).filter(Boolean), username, credential }];
  }

  dbg.warn('ICE', 'No TURN server configured (see game/.env.example); falling back to the public openrelay.metered.ca, ' +
    'which is often down. Devices behind different NATs / mobile networks may fail to connect.');
  return FALLBACK_TURN;
}

function describeServers(servers: RTCIceServer[] | undefined): string[] {
  return (servers ?? []).flatMap((s) => {
    const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
    return urls.map((u) => (s.username ? `${u} (user: ${s.username})` : u));
  });
}

// ------------------------------------------------------------------ Candidates

type CandidateInfo = { type: string; protocol: string; address: string; port: string; relayProtocol?: string };

/** Parses an `a=candidate:` / `candidate:` line. */
function parseCandidate(line: string): CandidateInfo | null {
  // candidate:<foundation> <component> <protocol> <priority> <address> <port> typ <type> ...
  const m = /candidate:\S+ \d+ (\S+) \d+ (\S+) (\d+) typ (\S+)/i.exec(line);
  if (!m) return null;
  return { protocol: m[1].toLowerCase(), address: m[2], port: m[3], type: m[4] };
}

function describeCandidate(c: CandidateInfo): string {
  return `${c.type}/${c.protocol}${c.relayProtocol ? `(relay via ${c.relayProtocol})` : ''} ${c.address}:${c.port}`;
}

function sdpCandidates(sdp: string | undefined): CandidateInfo[] {
  if (!sdp) return [];
  return sdp.split(/\r?\n/).filter((l) => l.startsWith('a=candidate:')).map(parseCandidate).filter((c): c is CandidateInfo => !!c);
}

function countTypes(list: CandidateInfo[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const c of list) counts[c.type] = (counts[c.type] ?? 0) + 1;
  return counts;
}

// ------------------------------------------------------------------ Instrumented peer connection

let pcSeq = 0;

async function logSelectedPair(pc: RTCPeerConnection, scope: string): Promise<void> {
  try {
    const stats = await pc.getStats();
    let pairId: string | undefined;
    stats.forEach((s) => {
      if (s.type === 'transport' && s.selectedCandidatePairId) pairId = s.selectedCandidatePairId;
    });
    if (!pairId) {
      stats.forEach((s) => {
        if (s.type === 'candidate-pair' && s.nominated && s.state === 'succeeded') pairId = s.id;
      });
    }
    const pair = pairId ? stats.get(pairId) : undefined;
    if (!pair) {
      dbg.warn(scope, 'Connected, but no selected candidate pair found in stats');
      return;
    }
    const local = stats.get(pair.localCandidateId);
    const remote = stats.get(pair.remoteCandidateId);
    const side = (c: any) => (c ? `${c.candidateType}/${c.protocol} ${c.address ?? c.ip ?? '?'}:${c.port}` : '?');
    const rtt = pair.currentRoundTripTime !== undefined ? `${Math.round(pair.currentRoundTripTime * 1000)}ms` : '?';
    const relayed = local?.candidateType === 'relay' || remote?.candidateType === 'relay';
    dbg.log(scope, `Selected pair: local ${side(local)} <-> remote ${side(remote)} (rtt ${rtt}${relayed ? ', via TURN relay' : ', direct'})`);
  } catch (err) {
    dbg.warn(scope, 'getStats failed:', err);
  }
}

async function logFailureStats(pc: RTCPeerConnection, scope: string): Promise<void> {
  try {
    const stats = await pc.getStats();
    const pairStates: Record<string, number> = {};
    const localTypes: Record<string, number> = {};
    const remoteTypes: Record<string, number> = {};
    stats.forEach((s) => {
      if (s.type === 'candidate-pair') pairStates[s.state] = (pairStates[s.state] ?? 0) + 1;
      if (s.type === 'local-candidate') localTypes[s.candidateType] = (localTypes[s.candidateType] ?? 0) + 1;
      if (s.type === 'remote-candidate') remoteTypes[s.candidateType] = (remoteTypes[s.candidateType] ?? 0) + 1;
    });
    dbg.error(scope, 'ICE failed. Stats:', { pairStates, localTypes, remoteTypes });
    if (!localTypes.relay && !remoteTypes.relay) {
      dbg.error(scope, 'Hint: neither side has a relay candidate — TURN is unreachable or credentials are rejected. ' +
        'Without TURN, peers behind symmetric NAT / mobile carriers / client-isolated Wi-Fi cannot connect.');
    } else if (!remoteTypes.relay) {
      dbg.error(scope, 'Hint: the remote peer has no relay candidate — check its TURN access (see its log).');
    }
  } catch (err) {
    dbg.warn(scope, 'getStats failed:', err);
  }
}

function instrument(pc: RTCPeerConnection, config: RTCConfiguration | undefined): void {
  const id = `pc${++pcSeq}`;
  const scope = `RTC ${id}`;
  const local: CandidateInfo[] = [];
  const remote: CandidateInfo[] = [];
  const createdAt = Date.now();

  dbg.log(scope, 'Created', {
    iceServers: describeServers(config?.iceServers),
    iceTransportPolicy: config?.iceTransportPolicy ?? 'all',
  });

  pc.addEventListener('icecandidate', (e) => {
    if (e.candidate && e.candidate.candidate) {
      const c = parseCandidate(e.candidate.candidate);
      if (!c) return;
      const relayProtocol = (e.candidate as RTCIceCandidate & { relayProtocol?: string }).relayProtocol;
      if (relayProtocol) c.relayProtocol = relayProtocol;
      local.push(c);
      dbg.log(scope, `Local candidate: ${describeCandidate(c)}`);
    } else if (!e.candidate) {
      const counts = countTypes(local);
      dbg.log(scope, `Local gathering complete in ${Date.now() - createdAt}ms:`, counts);
      if (!counts.srflx) dbg.warn(scope, 'No srflx candidate: STUN unreachable (UDP blocked?). Only host/relay paths possible.');
      if (!counts.relay) dbg.warn(scope, 'No relay candidate: TURN unreachable or credentials rejected. Cross-NAT connections may fail.');
    }
  });

  pc.addEventListener('icecandidateerror', (e) => {
    const ev = e as RTCPeerConnectionIceErrorEvent;
    // 701 = server unreachable for one address family/interface; noisy but worth recording.
    dbg.warn(scope, `ICE candidate error ${ev.errorCode} "${ev.errorText}" url=${ev.url} local=${ev.address ?? '?'}:${ev.port ?? '?'}`);
  });

  pc.addEventListener('icegatheringstatechange', () => dbg.log(scope, `iceGatheringState: ${pc.iceGatheringState}`));
  pc.addEventListener('signalingstatechange', () => dbg.log(scope, `signalingState: ${pc.signalingState}`));
  pc.addEventListener('iceconnectionstatechange', () => {
    const state = pc.iceConnectionState;
    (state === 'failed' ? dbg.error : state === 'disconnected' ? dbg.warn : dbg.log)(scope, `iceConnectionState: ${state}`);
    if (state === 'failed') void logFailureStats(pc, scope);
  });
  pc.addEventListener('connectionstatechange', () => {
    const state = pc.connectionState;
    (state === 'failed' ? dbg.error : dbg.log)(scope, `connectionState: ${state} (+${Date.now() - createdAt}ms)`);
    if (state === 'connected') void logSelectedPair(pc, scope);
  });
  pc.addEventListener('datachannel', (e) => watchChannel(e.channel, scope, 'remote'));

  const origCreateDataChannel = pc.createDataChannel.bind(pc);
  pc.createDataChannel = (label: string, init?: RTCDataChannelInit) => {
    const ch = origCreateDataChannel(label, init);
    watchChannel(ch, scope, 'local');
    return ch;
  };

  const origSetRemote = pc.setRemoteDescription.bind(pc);
  pc.setRemoteDescription = ((desc: RTCSessionDescriptionInit) => {
    const inSdp = sdpCandidates(desc?.sdp);
    dbg.log(scope, `setRemoteDescription(${desc?.type}) with ${inSdp.length} embedded candidates`, countTypes(inSdp));
    inSdp.forEach((c) => {
      remote.push(c);
      dbg.log(scope, `Remote candidate (sdp): ${describeCandidate(c)}`);
    });
    return origSetRemote(desc).catch((err: unknown) => {
      dbg.error(scope, 'setRemoteDescription failed:', err);
      throw err;
    });
  }) as typeof pc.setRemoteDescription;

  const origAddIce = pc.addIceCandidate.bind(pc);
  pc.addIceCandidate = ((candidate?: RTCIceCandidateInit | null) => {
    const c = candidate?.candidate ? parseCandidate(candidate.candidate) : null;
    if (c) {
      remote.push(c);
      dbg.log(scope, `Remote candidate: ${describeCandidate(c)}${c.address.endsWith('.local') ? ' (mDNS — only resolvable on the same LAN)' : ''}`);
    }
    return origAddIce(candidate ?? undefined).catch((err: unknown) => {
      dbg.warn(scope, 'addIceCandidate failed:', err);
      throw err;
    });
  }) as typeof pc.addIceCandidate;

  const origClose = pc.close.bind(pc);
  pc.close = () => {
    dbg.log(scope, `Closed after ${Date.now() - createdAt}ms (last state: ${pc.connectionState}); ` +
      `local ${JSON.stringify(countTypes(local))}, remote ${JSON.stringify(countTypes(remote))}`);
    origClose();
  };
}

function watchChannel(ch: RTCDataChannel, scope: string, origin: string): void {
  dbg.log(scope, `DataChannel "${ch.label}" (${origin}) created, state=${ch.readyState}`);
  ch.addEventListener('open', () => dbg.log(scope, `DataChannel "${ch.label}" open`));
  ch.addEventListener('close', () => dbg.log(scope, `DataChannel "${ch.label}" closed`));
  ch.addEventListener('error', (e) => dbg.warn(scope, `DataChannel "${ch.label}" error:`, (e as RTCErrorEvent).error?.message ?? e.type));
}

/** RTCPeerConnection subclass that logs ICE/connection lifecycle. Pass as Trystero `rtcPolyfill`. */
export function instrumentedPeerConnection(): typeof RTCPeerConnection | undefined {
  if (typeof RTCPeerConnection === 'undefined') return undefined;
  return class InstrumentedRTCPeerConnection extends RTCPeerConnection {
    constructor(config?: RTCConfiguration) {
      super(config);
      instrument(this, config);
    }
  };
}

// ------------------------------------------------------------------ Reachability probe

const PROBE_STUN: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun.cloudflare.com:3478' }];

/**
 * Gathers candidates against STUN and TURN separately (without any peer) and logs
 * whether each produced srflx / relay candidates. Detects broken TURN credentials early.
 */
export async function probeIceServers(turn: TurnServerConfig[], timeoutMs = 8000): Promise<void> {
  if (typeof RTCPeerConnection === 'undefined') return;
  const gather = async (label: string, config: RTCConfiguration): Promise<void> => {
    const scope = `Probe ${label}`;
    const pc = new RTCPeerConnection(config);
    const found: CandidateInfo[] = [];
    const errors: string[] = [];
    const start = Date.now();
    try {
      pc.addEventListener('icecandidateerror', (e) => {
        const ev = e as RTCPeerConnectionIceErrorEvent;
        errors.push(`${ev.errorCode} ${ev.errorText} (${ev.url})`);
      });
      const done = new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, timeoutMs);
        pc.addEventListener('icecandidate', (e) => {
          if (e.candidate?.candidate) {
            const c = parseCandidate(e.candidate.candidate);
            if (c) found.push(c);
          } else if (!e.candidate) {
            clearTimeout(timer);
            resolve();
          }
        });
      });
      pc.createDataChannel('probe');
      await pc.setLocalDescription(await pc.createOffer());
      await done;
      const counts = countTypes(found);
      const want = config.iceTransportPolicy === 'relay' ? 'relay' : 'srflx';
      const ok = Boolean(counts[want]);
      (ok ? dbg.log : dbg.error)(scope, `${ok ? 'OK' : 'FAILED'} in ${Date.now() - start}ms — candidates:`, counts,
        found.filter((c) => c.type === want).map(describeCandidate));
      if (errors.length) dbg.warn(scope, 'Errors:', [...new Set(errors)]);
    } catch (err) {
      dbg.error(scope, 'Probe threw:', err);
    } finally {
      pc.close();
    }
  };

  dbg.log('Probe', `Testing STUN and TURN reachability (servers: ${describeServers(turn).join(', ')})`);
  await Promise.all([
    gather('STUN', { iceServers: PROBE_STUN }),
    gather('TURN', { iceServers: turn, iceTransportPolicy: 'relay' }),
  ]);
}

// ------------------------------------------------------------------ Overlay

/** Reads `?p2pdebug=1|0` (persisted) and shows the on-screen log overlay when enabled. */
export function maybeInstallOverlay(): void {
  try {
    const param = new URL(location.href).searchParams.get('p2pdebug');
    if (param !== null) localStorage.setItem(OVERLAY_KEY, param === '0' ? '0' : '1');
    if (localStorage.getItem(OVERLAY_KEY) !== '1') return;
  } catch {
    return;
  }
  if (overlayPre || document.getElementById('p2p-debug')) return;

  const root = document.createElement('aside');
  root.id = 'p2p-debug';
  root.className = 'p2p-debug';
  root.innerHTML = `
    <header class="p2p-debug__bar">
      <strong>P2P debug</strong>
      <button type="button" id="p2p-debug-copy">Copy</button>
      <button type="button" id="p2p-debug-download">Download</button>
      <button type="button" id="p2p-debug-toggle">Hide</button>
    </header>
    <pre class="p2p-debug__log"></pre>`;
  document.body.append(root);
  overlayPre = root.querySelector('pre');
  if (overlayPre) overlayPre.textContent = entries.length ? dumpLog() + '\n' : '';

  root.querySelector('#p2p-debug-copy')?.addEventListener('click', () => {
    const text = dumpLog();
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(text).catch(() => selectLog());
    } else {
      selectLog();
    }
  });
  root.querySelector('#p2p-debug-download')?.addEventListener('click', () => {
    const blob = new Blob([dumpLog()], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `quoridors-p2p-${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  root.querySelector('#p2p-debug-toggle')?.addEventListener('click', (e) => {
    const collapsed = root.classList.toggle('p2p-debug--collapsed');
    (e.currentTarget as HTMLButtonElement).textContent = collapsed ? 'Show' : 'Hide';
  });
}

function selectLog(): void {
  if (!overlayPre) return;
  const range = document.createRange();
  range.selectNodeContents(overlayPre);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}
