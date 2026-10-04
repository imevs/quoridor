import { describe, it, expect, beforeEach } from 'vitest';
import { AI_DELAY_MS, AI_DELAY_START_MS, HOST_SEAT, Session, UNDO_TIMEOUT_MS, type SessionDeps } from '../session';
import type { Action } from '../rules';

let clock = 0;
let tokenN = 0;
const deps: SessionDeps = {
  now: () => clock,
  token: () => `token_${++tokenN}`,
};
/** Deterministic AI: always step towards its goal using the first legal move. */
const aiDeps: SessionDeps = {
  ...deps,
  ai: (s) => {
    const p = s.players[s.turn];
    const step = p.goal.axis === 'r' ? (p.goal.value > p.r ? 1 : -1) : 0;
    return { type: 'move', r: p.r + step, c: p.c };
  },
};

const up = (r: number, c = 4): Action => ({ type: 'move', r, c });

function twoHumans() {
  const { session, token } = Session.create('game1', 2, 'fox', deps);
  session.connect(HOST_SEAT);
  const guest = session.join();
  session.connect(guest.seat);
  return { session, hostToken: token, guest };
}

beforeEach(() => {
  clock = 1000;
  tokenN = 0;
});

describe('Session lobby', () => {
  it('creates a lobby with the host in seat 0 and remaining animals auto-assigned', () => {
    const { session, token } = Session.create('g', 4, 'bear', deps);
    const v = session.view();
    expect(token).toBe('token_1');
    expect(v.phase).toBe('lobby');
    expect(v.seats.map((s) => s.animal)).toEqual(['bear', 'fox', 'wolf_grey', 'owl']);
    expect(v.seats.map((s) => s.kind)).toEqual(['human', 'open', 'open', 'open']);
    expect(v.state).toBeNull();
    expect(v.undoable).toEqual([]);
  });

  it('assigns open seats to joiners, reconnects by token, and makes extras spectators', () => {
    const { session, hostToken, guest } = twoHumans();
    expect(guest).toEqual({ seat: 1, token: 'token_2' });
    expect(session.join(hostToken)).toEqual({ seat: 0, token: hostToken });
    expect(session.join('bogus_token')).toEqual({ seat: null, token: null });
    session.connect(null);
    expect(session.spectators).toBe(1);
    expect(session.connections()).toBe(3);
    session.disconnect(null);
    session.disconnect(null);
    expect(session.spectators).toBe(0);
  });

  it('only lets the host configure non-host seats that are not occupied', () => {
    const { session } = Session.create('g', 4, 'fox', deps);
    session.connect(0);
    const g = session.join();
    session.connect(g.seat);
    expect(session.configureSeat(1, 2, 'ai', 'easy')).toEqual({ ok: false, error: 'Only the host can change seats' });
    expect(session.configureSeat(0, 0, 'ai', 'easy').ok).toBe(false);
    expect(session.configureSeat(0, 7, 'ai', 'easy').ok).toBe(false);
    expect(session.configureSeat(0, 1, 'ai', 'easy')).toEqual({ ok: false, error: 'Seat is occupied' });
    expect(session.configureSeat(0, 2, 'ai', 'hard').ok).toBe(true);
    expect(session.view().seats[2]).toMatchObject({ kind: 'ai', difficulty: 'hard' });
    // Disconnected human can be kicked back to open
    session.disconnect(1);
    expect(session.configureSeat(0, 1, 'open', 'medium').ok).toBe(true);
    // The old token no longer matches; the player is treated as a new joiner
    expect(session.join(g.token!)).toEqual({ seat: 1, token: 'token_3' });
  });

  it('starts only when every seat is filled, and only by the host', () => {
    const { session } = Session.create('g', 2, 'fox', deps);
    expect(session.start(0)).toEqual({ ok: false, error: 'Fill or assign every seat first' });
    session.configureSeat(0, 1, 'ai', 'medium');
    expect(session.start(1).ok).toBe(false);
    expect(session.start(0).ok).toBe(true);
    expect(session.start(0)).toEqual({ ok: false, error: 'Game already started' });
    const v = session.view();
    expect(v.phase).toBe('playing');
    expect(v.version).toBe(1);
    expect(v.event).toEqual({ type: 'start' });
    expect(v.state?.turn).toBe(0);
  });

  it('does not hand out seats after the game started', () => {
    const { session } = twoHumans();
    session.start(0);
    expect(session.join()).toEqual({ seat: null, token: null });
  });
});

describe('Session play', () => {
  it('validates turn order and legality', () => {
    const { session } = twoHumans();
    expect(session.act(0, up(7)).ok).toBe(false); // lobby
    session.start(0);
    expect(session.act(1, up(1))).toEqual({ ok: false, error: 'Not your turn' });
    expect(session.act(0, up(5))).toEqual({ ok: false, error: 'Illegal move' });
    expect(session.act(0, up(7)).ok).toBe(true);
    const v = session.view();
    expect(v.version).toBe(2);
    expect(v.event).toEqual({ type: 'action', seat: 0, action: up(7) });
    expect(v.state?.turn).toBe(1);
    expect(session.nextTimer()).toBeNull();
  });

  it('finishes the game on a win and supports host rematch', () => {
    const { session } = twoHumans();
    expect(session.rematch(0)).toEqual({ ok: false, error: 'Game is not finished' });
    session.start(0);
    // Host walks up column 4; guest shuffles along row 0 out of the way.
    expect(session.act(0, up(7)).ok).toBe(true);
    expect(session.act(1, { type: 'move', r: 0, c: 3 }).ok).toBe(true);
    for (let r = 6; r >= 0; r--) {
      expect(session.act(0, up(r)).ok).toBe(true);
      if (r > 0) expect(session.act(1, { type: 'move', r: 0, c: r % 2 ? 3 : 2 }).ok).toBe(true);
    }
    expect(session.phase).toBe('finished');
    expect(session.state?.winner).toBe(0);
    expect(session.view().undoable).toEqual([]);
    expect(session.act(1, up(1)).ok).toBe(false);
    expect(session.configureSeat(0, 1, 'ai', 'easy')).toEqual({ ok: false, error: 'Game is over' });
    expect(session.rematch(1).ok).toBe(false);
    expect(session.rematch(0).ok).toBe(true);
    expect(session.phase).toBe('playing');
    expect(session.event).toEqual({ type: 'start' });
    expect(session.state?.players[0].r).toBe(8);
  });

  it('schedules AI turns and plays them on tick', () => {
    const { session } = Session.create('g', 2, 'fox', aiDeps);
    session.connect(0);
    session.configureSeat(0, 1, 'ai', 'easy');
    session.start(0);
    expect(session.nextTimer()).toBeNull(); // human starts
    session.act(0, up(7));
    expect(session.nextTimer()).toBe(clock + AI_DELAY_MS);
    expect(session.tick()).toBe(false);
    clock += AI_DELAY_MS;
    expect(session.tick()).toBe(true);
    expect(session.state?.players[1].r).toBe(1);
    expect(session.state?.turn).toBe(0);
    expect(session.nextTimer()).toBeNull();
  });

  it('uses the real AI when none is injected', () => {
    const { session } = Session.create('g', 4, 'fox', deps);
    session.connect(0);
    for (const i of [1, 2, 3]) session.configureSeat(0, i, 'ai', 'easy');
    session.start(0);
    session.act(0, up(7));
    for (let i = 0; i < 3; i++) {
      clock += AI_DELAY_MS;
      expect(session.tick()).toBe(true);
    }
    expect(session.state?.turn).toBe(0);
    expect(session.version).toBe(5);
  });

  it('lets the host replace an absent player with AI mid-game', () => {
    const { session } = twoHumans();
    session.start(0);
    session.act(0, up(7));
    expect(session.configureSeat(0, 1, 'ai', 'easy')).toEqual({ ok: false, error: 'Seat is occupied' });
    session.disconnect(1);
    expect(session.configureSeat(0, 1, 'open', 'easy').ok).toBe(false);
    expect(session.configureSeat(0, 1, 'ai', 'easy').ok).toBe(true);
    expect(session.drainNotices()).toEqual(['An absent player was replaced by the computer']);
    expect(session.drainNotices()).toEqual([]);
    expect(session.nextTimer()).toBe(clock + AI_DELAY_MS);
  });
});

describe('Session undo', () => {
  it('applies immediately when no other humans are connected (vs AI)', () => {
    const { session } = Session.create('g', 2, 'fox', aiDeps);
    session.connect(0);
    session.configureSeat(0, 1, 'ai', 'easy');
    session.start(0);
    expect(session.requestUndo(0)).toEqual({ ok: false, error: 'Nothing to undo' });
    session.act(0, up(7));
    clock += AI_DELAY_MS;
    session.tick();
    expect(session.view().undoable).toEqual([0]);
    expect(session.requestUndo(0).ok).toBe(true);
    expect(session.state?.players[0].r).toBe(8);
    expect(session.state?.players[1].r).toBe(0);
    expect(session.state?.turn).toBe(0);
    expect(session.event).toEqual({ type: 'undo', seat: 0 });
  });

  it('requires opponents to accept', () => {
    const { session } = twoHumans();
    session.start(0);
    session.act(0, up(7));
    expect(session.requestUndo(1).ok).toBe(false); // guest has not moved yet
    expect(session.requestUndo(0).ok).toBe(true);
    const v = session.view();
    expect(v.undo).toEqual({ by: 0, voters: [1], accepted: [], expiresAt: clock + UNDO_TIMEOUT_MS });
    expect(v.undoable).toEqual([]);
    expect(session.act(1, up(1))).toEqual({ ok: false, error: 'Waiting for the undo vote' });
    expect(session.voteUndo(0, true).ok).toBe(false);
    expect(session.voteUndo(1, true).ok).toBe(true);
    expect(session.state?.players[0].r).toBe(8);
    expect(session.state?.turn).toBe(0);
    expect(session.voteUndo(1, true).ok).toBe(false);
  });

  it('cancels on decline', () => {
    const { session } = twoHumans();
    session.start(0);
    session.act(0, up(7));
    session.requestUndo(0);
    expect(session.voteUndo(1, false).ok).toBe(true);
    expect(session.drainNotices()).toEqual(['Undo request declined']);
    expect(session.state?.players[0].r).toBe(7);
  });

  it('expires after the timeout and resumes a pending AI turn', () => {
    const { session } = Session.create('g', 4, 'fox', aiDeps);
    session.connect(0);
    const g = session.join();
    session.connect(g.seat);
    session.configureSeat(0, 2, 'ai', 'easy');
    session.configureSeat(0, 3, 'ai', 'easy');
    session.start(0);
    session.act(0, up(7));
    session.requestUndo(0);
    expect(session.nextTimer()).toBe(clock + UNDO_TIMEOUT_MS);
    clock += 10;
    expect(session.tick()).toBe(false);
    clock += UNDO_TIMEOUT_MS;
    expect(session.tick()).toBe(true);
    expect(session.drainNotices()).toEqual(['Undo request expired']);
    expect(session.view().undo).toBeNull();
    expect(session.nextTimer()).toBeNull(); // seat 1 is human
  });

  it('cancels when the requester disconnects and resolves when the last voter leaves', () => {
    const { session } = twoHumans();
    session.start(0);
    session.act(0, up(7));
    session.requestUndo(0);
    session.disconnect(0);
    expect(session.drainNotices()).toEqual(['Undo request cancelled']);
    session.connect(0);
    session.requestUndo(0);
    session.connect(1); // second tab for the guest
    session.disconnect(1);
    expect(session.view().undo).not.toBeNull();
    session.disconnect(1);
    expect(session.view().undo).toBeNull();
    expect(session.state?.players[0].r).toBe(8);
    session.disconnect(1); // extra disconnects are harmless
  });

  it('resolves when an absent voter is replaced by AI', () => {
    const { session } = Session.create('g', 4, 'fox', deps);
    session.connect(0);
    for (let i = 1; i < 4; i++) session.connect(session.join().seat);
    session.start(0);
    session.act(0, up(7));
    session.requestUndo(0);
    session.voteUndo(1, true);
    session.voteUndo(2, true);
    expect(session.view().undo?.accepted).toEqual([1, 2]);
    session.disconnect(3);
    expect(session.state?.players[0].r).toBe(8);
  });
});

describe('Session persistence', () => {
  it('round-trips through JSON and reschedules AI', () => {
    const { session } = Session.create('g', 2, 'owl', aiDeps);
    session.connect(0);
    session.configureSeat(0, 1, 'ai', 'hard');
    session.start(0);
    session.act(0, up(7));
    session.requestUndo(0); // applies immediately; undo itself is not persisted
    session.act(0, up(7));
    const data = JSON.parse(JSON.stringify(session.toJSON()));
    expect(data.seats[0].token).toBe('token_1');
    clock += 50_000;
    const restored = Session.fromJSON(data, aiDeps);
    expect(restored.view()).toEqual({ ...session.view(), seats: restored.view().seats });
    expect(restored.view().seats[0].connected).toBe(false);
    expect(restored.join('token_1').seat).toBe(0);
    expect(restored.nextTimer()).toBe(clock + AI_DELAY_START_MS);
    expect(restored.lastSeen).toBe(data.lastSeen);
  });

  it('restores lobbies without state', () => {
    const { session } = Session.create('g', 2, 'fox', deps);
    const restored = Session.fromJSON(session.toJSON(), deps);
    expect(restored.state).toBeNull();
    expect(restored.phase).toBe('lobby');
    expect(restored.nextTimer()).toBeNull();
  });
});
