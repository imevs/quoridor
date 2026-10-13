import { describe, it, expect } from 'vitest';
import { ReplayController } from '../../net/ReplayController';
import { LocalController, LOCAL_STORAGE_KEY } from '../../net/LocalController';
import type { HistoryRecord } from '../../game/history';
import type { Action } from '../../game/rules';

describe('ReplayController and match history replay', () => {
  const sampleActions: Action[] = [
    { type: 'move', r: 7, c: 4 },
    { type: 'move', r: 1, c: 4 },
    { type: 'wall', wall: { r: 4, c: 3, o: 'h' } },
  ];

  const sampleRecord: HistoryRecord = {
    id: 'test-rec-1',
    date: Date.now(),
    mode: 'ai',
    players: 2,
    winner: 0,
    winnerAnimal: 'fox',
    winnerName: 'Fox',
    movesCount: 2,
    wallsCount: 1,
    animals: ['fox', 'wolf_grey'],
    actions: sampleActions,
  };

  it('initializes with reconstructed states and matching steps', () => {
    const ctrl = new ReplayController(sampleRecord);
    expect(ctrl.totalSteps).toBe(3);
    expect(ctrl.currentStep).toBe(0);
    expect(ctrl.playing).toBe(false);
    expect(ctrl.seats).toHaveLength(2);
    expect(ctrl.seats[0].animal).toBe('fox');
    expect(ctrl.seats[1].animal).toBe('wolf_grey');
  });

  it('start() resets to step 0 and dispatches reset update', () => {
    const ctrl = new ReplayController(sampleRecord);
    const updates: any[] = [];
    ctrl.onUpdate = (u) => updates.push(u);

    ctrl.start();
    expect(ctrl.currentStep).toBe(0);
    expect(updates).toHaveLength(1);
    expect(updates[0].type).toBe('reset');
    expect(updates[0].state.players[0].r).toBe(8);
  });

  it('next() advances step and emits action updates', () => {
    const ctrl = new ReplayController(sampleRecord);
    const updates: any[] = [];
    ctrl.onUpdate = (u) => updates.push(u);

    ctrl.start();
    updates.length = 0;

    ctrl.next();
    expect(ctrl.currentStep).toBe(1);
    expect(updates).toHaveLength(1);
    expect(updates[0].type).toBe('action');
    expect(updates[0].seat).toBe(0);
    expect(updates[0].action).toEqual(sampleActions[0]);

    ctrl.next();
    expect(ctrl.currentStep).toBe(2);
    expect(updates[1].type).toBe('action');
    expect(updates[1].seat).toBe(1);

    ctrl.next();
    expect(ctrl.currentStep).toBe(3);
    expect(updates[2].type).toBe('action');
  });

  it('prev() steps backwards via jumpTo', () => {
    const ctrl = new ReplayController(sampleRecord);
    const updates: any[] = [];
    ctrl.onUpdate = (u) => updates.push(u);

    ctrl.start();
    ctrl.next();
    ctrl.next();
    expect(ctrl.currentStep).toBe(2);

    updates.length = 0;
    ctrl.prev();
    expect(ctrl.currentStep).toBe(1);
    expect(updates).toHaveLength(1);
    expect(updates[0].type).toBe('sync');
  });

  it('jumpTo, first, and last correctly jump to targeted positions', () => {
    const ctrl = new ReplayController(sampleRecord);
    const updates: any[] = [];
    ctrl.onUpdate = (u) => updates.push(u);

    ctrl.start();
    ctrl.last();
    expect(ctrl.currentStep).toBe(3);

    ctrl.first();
    expect(ctrl.currentStep).toBe(0);

    ctrl.jumpTo(2);
    expect(ctrl.currentStep).toBe(2);
  });

  it('play() and pause() toggle isPlaying state', () => {
    const ctrl = new ReplayController(sampleRecord);
    ctrl.start();
    expect(ctrl.playing).toBe(false);

    ctrl.play();
    expect(ctrl.playing).toBe(true);

    ctrl.pause();
    expect(ctrl.playing).toBe(false);
  });

  it('reconstructs actions correctly in LocalController saved game persistence', () => {
    const store = new Map<string, string>();
    const originalStorage = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, val: string) => store.set(key, String(val)),
        removeItem: (key: string) => store.delete(key),
        clear: () => store.clear(),
        key: (_idx: number) => null,
        length: store.size,
      },
      writable: true,
      configurable: true,
    });

    try {
      const ctrl = new LocalController({
        mode: 'local',
        players: 2,
        difficulty: 'medium',
        animal: 'fox',
      });

      const updates: any[] = [];
      ctrl.onUpdate = (u) => updates.push(u);
      ctrl.start(false);

      // Make 2 moves
      ctrl.submit({ type: 'move', r: 7, c: 4 });
      ctrl.submit({ type: 'move', r: 1, c: 4 });

      // Verify localStorage contains saved actions
      const raw = store.get(LOCAL_STORAGE_KEY);
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed.actions).toHaveLength(2);
      expect(parsed.actions[0]).toEqual({ type: 'move', r: 7, c: 4 });

      // Restore controller from saved game
      const restoredCtrl = new LocalController({
        mode: 'local',
        players: 2,
        difficulty: 'medium',
        animal: 'fox',
      });
      const restoredUpdates: any[] = [];
      restoredCtrl.onUpdate = (u) => restoredUpdates.push(u);
      restoredCtrl.start(true);

      expect(restoredUpdates).toHaveLength(1);
      expect(restoredUpdates[0].type).toBe('reset');
      expect(restoredUpdates[0].actions).toHaveLength(2);
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        value: originalStorage,
        writable: true,
        configurable: true,
      });
    }
  });
});
