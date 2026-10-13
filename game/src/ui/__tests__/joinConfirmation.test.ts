import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hud } from '../Hud';
import { hudStore } from '../hudStore';

describe('Guest Join Confirmation Dialog', () => {
  beforeEach(() => {
    hudStore.joinOpen.value = false;
    hudStore.joinData.value = null;
  });

  it('hud.showJoinDialog sets joinOpen and joinData with provided gameId and mode', () => {
    const hud = new Hud();
    const onConfirm = vi.fn();
    const onDecline = vi.fn();

    hud.showJoinDialog('room-123', 'p2p', onConfirm, onDecline);

    expect(hudStore.joinOpen.value).toBe(true);
    const data = hudStore.joinData.value;
    expect(data).not.toBeNull();
    expect(data?.gameId).toBe('room-123');
    expect(data?.mode).toBe('p2p');

    data?.onConfirm();
    expect(onConfirm).toHaveBeenCalledTimes(1);

    data?.onDecline();
    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it('hud.hideJoinDialog resets joinOpen to false and joinData to null', () => {
    const hud = new Hud();
    hud.showJoinDialog('room-456', 'online', () => {}, () => {});
    expect(hudStore.joinOpen.value).toBe(true);
    expect(hudStore.joinData.value).not.toBeNull();

    hud.hideJoinDialog();
    expect(hudStore.joinOpen.value).toBe(false);
    expect(hudStore.joinData.value).toBeNull();
  });

  it('supports declining and cleaning up url params', () => {
    const hud = new Hud();
    let urlCleaned = false;
    const onDecline = vi.fn(() => {
      hud.hideJoinDialog();
      urlCleaned = true;
    });

    hud.showJoinDialog('p2p-test', 'p2p', () => {}, onDecline);
    hudStore.joinData.value?.onDecline();

    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(urlCleaned).toBe(true);
    expect(hudStore.joinOpen.value).toBe(false);
  });
});
