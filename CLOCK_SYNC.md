# Clock Synchronization

Host/server sessions track time authoritatively. Clients extrapolate turn countdowns locally and snap to authoritative timestamps when receiving game events.

## Components

- [`Session`](game/src/game/session.ts): Host/server authority. Deducts elapsed turn time, resolves timeouts, and saves clock snapshots for undo.
- [`ChessClock`](game/src/game/clock.ts): Headless state machine tracking per-seat remaining seconds and move history.
- [`ClockCoordinator`](game/src/ui/ClockCoordinator.ts): Client-side 100ms ticker (`performance.now()`). Drives HUD countdown, urgent styles ($\le 15.1\text{s}$), and countdown beeps ($\le 10\text{s}$).

## State Fields

In `Session` (`game/src/game/session.ts`):

| Field | Type | Purpose |
| :--- | :--- | :--- |
| `turnTimer` | `number` | Time bank per player in seconds (`0` = disabled). |
| `clocks` | `number[]` | Remaining seconds per seat at start of current turn. |
| `turnStartedAt` | `number` | Monotonic timestamp (`deps.now()`) when current turn started. |
| `clockHistory` | `number[][]` | Stack of `clocks` snapshots pushed before each move for undo. |

`Session.view()` extrapolates the active player's remaining time when emitting snapshots:

```ts
const currentClocks = [...this.clocks];
if (this.phase === 'playing' && this.state && this.turnTimer > 0 && currentClocks.length > this.state.turn) {
  const elapsed = Math.max(0, (this.deps.now() - this.turnStartedAt) / 1000);
  currentClocks[this.state.turn] = Math.max(0, currentClocks[this.state.turn] - elapsed);
}
```

## Turn Lifecycle

### Move Execution (`Session.apply`)
1. Elapsed time is deducted: `clocks[seat] = Math.max(0, clocks[seat] - (now - turnStartedAt) / 1000)`.
2. Previous `clocks` are pushed to `clockHistory`.
3. `turnStartedAt` resets to `now`.
4. Event snapshot broadcasts updated `clocks`.

### Undo Rollback (`Session.resolveUndoIfComplete`)
Pops `clockHistory` back to the requesting player's prior turn, restores `this.clocks`, and resets `turnStartedAt = now`.

### Host/Server Ticker (`Session.tick`)
Runs every 100ms on P2P host, 200ms on server.
- Checks if active player's remaining time is $\le 0$. If so, marks `phase = 'finished'` and declares a timeout winner.
- In P2P host mode, saves session to `sessionStorage` every 1,000ms so a tab reload preserves elapsed time.

### Client Extrapolation & Reconciliation
Clients do not stream clock ticks over the network:
1. `ClockCoordinator` runs a local 100ms ticker, pausing when dialogs are open (`dialog[open]`).
2. When receiving an `Update` (`action`, `undo`, `sync`), `main.ts` stops the local clock, restores authoritative `clocks`, and restarts the ticker for the next active turn.

## Timeout Resolution (`resolveTimeoutWinner`)

When a player runs out of time:
- **2 players**: The remaining player wins (`1 - timedOutTurn`).
- **4 players**: Shortest BFS path to goal is evaluated for each non-timed-out player (`shortestPath(state, i)`). The player closest to their goal wins.

## Offline Local Persistence

In `LocalController`, `ClockCoordinator` fires `onTickSecond` on integer second boundaries to save remaining clocks to `localStorage['quoridors.local.save']`. Reloading or resuming restores these values.
