# Quoridors P2P Post-Mortem & Engineering Lessons

This document contains the root-cause analysis, failure modes, and architectural lessons learned during the development and stabilization of the serverless Peer-to-Peer (P2P) multiplayer system for Quoridors.

---

## 1. Why the Initial Versions Failed

---

### Failure 1: Public WebTorrent Tracker Sandboxing & Nostr Relay Payment Walls

#### Symptom
Guests in separate browser instances (e.g. Chrome vs Safari, or isolated profiles) failed to discover the host room. In the console:
```text
Trystero: relay failure from wss://nostr.land/ - restricted: Pay on https://nostr.land for access.
```

#### Root Cause
1. **Paid Relay Restrictions**: Default Nostr relay lists included relays requiring paid subscription keys (`nostr.land`). When pairing negotiations routed through restricted relays, SDP handshakes dropped silently.
2. **WebTorrent Tracker Isolation**: WebTorrent tracker strategies failed across isolated browser sandboxes when WebTorrent client instances could not resolve ephemeral torrent swarms.

#### Fix
Configured `@trystero-p2p/nostr` with verified, free public relays and STUN/TURN servers:
```ts
joinRoom({
  appId: 'quoridors-v1',
  relayConfig: {
    urls: ['wss://nos.lol', 'wss://nostr.mom', 'wss://relay.primal.net', 'wss://purplerelay.com'],
    redundancy: 4,
  },
  turnConfig: [
    {
      urls: [
        'stun:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelay',
      credential: 'openrelay',
    },
  ],
  rtcConfig: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:cloudflare.com:3478' },
    ],
  },
}, roomId);
```

---

### Failure 2: The "Frozen Board" Illusion (CSS Pointer-Events Override)

#### Symptom
Both host and guest connected and rendered the 3D grass board and animal figurines, but clicking cells or dragging to rotate the camera did nothing.

#### Root Cause
Under Chrome DevTools Protocol, inspecting `document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2)` revealed:
```json
{ "tag": "HEADER", "class": "_topbar_zsrdt_1" }
```
1. In `tokens.css`, the rule `#hud-root > * { pointer-events: auto; }` was applied.
2. In `TopBar.module.css`, a landscape media query (`@media (max-height: 550px) and (orientation: landscape)`) styled `.topbar` with `position: fixed; inset: 0; width: 100%; height: 100%; pointer-events: none;`.
3. Because ID-combinator specificity (`#hud-root > *`) is higher than class specificity (`.topbar`), the browser evaluated `pointer-events: auto` across `inset: 0`.
4. The `<header>` element covered 100% of the screen with an invisible box, intercepting every mouse click and drag before it could reach `<canvas>`.

#### Fix
- Removed the overarching `#hud-root > * { pointer-events: auto; }` rule from `tokens.css`.
- Switched to an opt-in model: HUD containers default to `pointer-events: none;`, while only interactive buttons, chips, and cards explicitly set `pointer-events: auto;`.

---

### Failure 3: Reset Animation Spam (Version Precedence Inversion)

#### Symptom
The camera animation kept restarting every second, figurines flickered, and turn controls were unresponsive.

#### Root Cause
In `P2PController.ts`, `applyView(v)` evaluated:
```ts
// BUGGY PRECEDENCE:
if (this.version < 0 || v.event?.type === 'start') {
  this.onUpdate({ type: 'reset', state, seats });
} else if (v.version === this.version) {
  this.onUpdate({ type: 'seats', seats });
}
```
Until a move was made, `v.event` remained `{ type: 'start' }`. Every snapshot broadcast triggered `onUpdate({ type: 'reset' })`, restarting the 1.2s camera glide and destroying/rebuilding Three.js pawn meshes repeatedly.

#### Fix
Prioritized identical version checks before checking start events:
```ts
if (v.version === this.version) {
  this.onUpdate({ type: 'seats', seats });
} else if (this.version < 0 || v.event?.type === 'start') {
  this.onUpdate({ type: 'reset', state, seats });
}
```

---

### Failure 4: Queue Lockup Without Exception Handling

#### Symptom
If any asynchronous action inside `applyUpdate` threw an error or was interrupted, the UI froze permanently.

#### Root Cause
In `main.ts`, `drainQueue()` set `this.processing = true` before loop execution, but lacked a `try ... finally` block. If an operation rejected, `this.processing` remained stuck at `true`, preventing `canAct()` from ever returning `true` again.

#### Fix
Wrapped queue draining in `try ... finally`:
```ts
private async drainQueue(): Promise<void> {
  if (this.processing) return;
  this.processing = true;
  try {
    while (this.queue.length > 0) {
      await this.applyUpdate(this.queue.shift()!);
    }
  } finally {
    this.processing = false;
    this.refreshTurnUi();
    this.controller?.idle();
  }
}
```

---

### Failure 5: Host Session Loss on Page Refresh

#### Symptom
When the host refreshed their browser tab (Cmd+R / F5), the entire session was lost. The host reloaded as a guest and sat waiting indefinitely.

#### Root Cause
1. **In-Memory Volatility**: The authoritative `Session` instance was stored purely in heap memory.
2. **URL Ambiguity**: On reload, the URL contained `?p2p=<gameId>`. `main.ts` parsed this parameter and invoked `startP2P({ join: p2pId })`. `P2PController` checked `'create' in intent` (which was false) and initialized as a guest.

#### Fix
1. **Session Serialization**: Every state change serializes the session via `Session.toJSON()` into tab-scoped `sessionStorage.setItem('quoridors.p2p.host_session.<id>', ...)`.
2. **Role Recovery**: When initializing with `{ join: id }`, `P2PController` checks `sessionStorage` for a stored host session matching `id`. If found, it marks `this.isHost = true`, restores the session via `Session.fromJSON()`, reclaims seat 0, and immediately re-broadcasts the snapshot.
3. **Clean Teardown**: Explicitly clicking Leave or exiting to the menu clears `sessionStorage`.

---

### Failure 6: Premature Seat Demotion on Reconnection

#### Symptom
When a guest reconnected after temporary disconnection or host reload, they were demoted to spectator (`seat: null`).

#### Root Cause
In `room.onPeerJoin`, the host previously called `this.session.join()` without a token. In `Session.ts`, calling `join()` during the `'playing'` phase without a token returns `{ seat: null }` (spectator).

#### Fix
1. Guests attach their stored token in every message (`ClientMsgEnvelope.token`).
2. When a peer connects during the `'playing'` phase, the host does not assign open seats blindly; it waits for the guest's token, matches the token to the seat, and restores the player with their assigned animal and seat number.

---

## 2. Architectural Lessons & Engineering Principles

### 1. Opt-In Pointer Events for 3D Viewports
In web applications with Three.js viewports beneath 2D HUD layers:
- Never use wildcard ID rules like `#hud > * { pointer-events: auto; }`.
- Set container overlays to `pointer-events: none !important;`.
- Set only interactive leaf elements (`button`, `input`, `.card`) to `pointer-events: auto;`.

### 2. Tab-Scoped Storage (`sessionStorage`) vs Origin Storage (`localStorage`)
- Avoid `localStorage` for P2P multiplayer role tokens. If a developer or user opens two tabs in the same browser (one host, one guest), `localStorage` shares state between tabs, causing identity collisions.
- `sessionStorage` is tab-isolated yet survives page refreshes within the same tab, making it the ideal choice for single-tab host state.

### 3. Decoupling Networking from Algorithmic Logic
The rules engine in `rules.ts` and `session.ts` has zero dependencies on WebRTC, Three.js, or DOM APIs. This headless design allowed both unit testing in Vitest and headless Chrome E2E testing without mock infrastructure.

### 4. Dual-Transport Fallbacks
Adding `BroadcastChannel` alongside WebRTC drastically accelerates local iteration:
- Local tests execute in <2ms without waiting for STUN/TURN or relay handshakes.
- When relays experience latency, local testing remains completely unaffected.
