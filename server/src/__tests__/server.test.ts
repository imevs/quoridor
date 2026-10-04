import { describe, it, expect, afterAll } from 'vitest';
import { WebSocket } from 'ws';
import { startServer } from '../index';
import type { ServerMsg } from '../../../game/src/game/protocol';

describe('Server Integration', () => {
  const port = 9898;
  const { server, store, manager } = startServer(port, ':memory:', '/tmp');

  afterAll(() => {
    manager.close();
    server.close();
    store.close();
  });

  const connectWs = (): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:${port}/ws`);
      ws.on('open', () => resolve(ws));
      ws.on('error', reject);
    });
  };

  const createMessageQueue = (ws: WebSocket) => {
    const queue: ServerMsg[] = [];
    const waiters: Array<(msg: ServerMsg) => void> = [];

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString()) as ServerMsg;
      if (waiters.length > 0) {
        const resolve = waiters.shift()!;
        resolve(msg);
      } else {
        queue.push(msg);
      }
    });

    return {
      next(): Promise<ServerMsg> {
        if (queue.length > 0) {
          return Promise.resolve(queue.shift()!);
        }
        return new Promise((resolve) => waiters.push(resolve));
      },
    };
  };

  it('runs complete create, join, lobby config, and start flow', async () => {
    const ws1 = await connectWs();
    const q1 = createMessageQueue(ws1);

    // 1. Host creates game
    ws1.send(JSON.stringify({ type: 'create', players: 2, animal: 'fox' }));
    const welcome1 = (await q1.next()) as { type: 'welcome'; gameId: string; token: string; seat: number };
    expect(welcome1.type).toBe('welcome');
    expect(welcome1.seat).toBe(0);
    const gameId = welcome1.gameId;

    const snap1 = (await q1.next()) as { type: 'snapshot'; view: any };
    expect(snap1.type).toBe('snapshot');
    expect(snap1.view.phase).toBe('lobby');

    // 2. Guest joins game
    const ws2 = await connectWs();
    const q2 = createMessageQueue(ws2);

    ws2.send(JSON.stringify({ type: 'join', gameId }));
    const welcome2 = (await q2.next()) as { type: 'welcome'; gameId: string; token: string; seat: number };
    expect(welcome2.type).toBe('welcome');
    expect(welcome2.seat).toBe(1);

    // Both receive updated snapshots
    const snapHost = (await q1.next()) as { type: 'snapshot'; view: any };
    const snapGuest = (await q2.next()) as { type: 'snapshot'; view: any };
    expect(snapHost.view.seats[1].connected).toBe(true);
    expect(snapGuest.view.seats[1].connected).toBe(true);

    // 3. Host starts game
    ws1.send(JSON.stringify({ type: 'start' }));
    const snapStart1 = (await q1.next()) as { type: 'snapshot'; view: any };
    const snapStart2 = (await q2.next()) as { type: 'snapshot'; view: any };
    expect(snapStart1.view.phase).toBe('playing');
    expect(snapStart2.view.phase).toBe('playing');

    // 4. Host plays valid move (8,4) -> (7,4)
    ws1.send(JSON.stringify({ type: 'action', action: { type: 'move', r: 7, c: 4 } }));
    const snapMove1 = (await q1.next()) as { type: 'snapshot'; view: any };
    const snapMove2 = (await q2.next()) as { type: 'snapshot'; view: any };
    expect(snapMove1.view.state.players[0].r).toBe(7);
    expect(snapMove2.view.state.turn).toBe(1);

    // 5. Guest tries illegal move (not adjacent)
    ws2.send(JSON.stringify({ type: 'action', action: { type: 'move', r: 5, c: 4 } }));
    const err = (await q2.next()) as { type: 'error'; message: string };
    expect(err.type).toBe('error');
    expect(err.message).toBe('Illegal move');

    ws1.close();
    ws2.close();
  });
});
