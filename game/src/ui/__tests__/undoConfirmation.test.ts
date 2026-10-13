import { describe, it, expect, vi } from 'vitest';
import type { UndoView } from '../../game/protocol';
import { Hud } from '../Hud';
import { hudStore } from '../hudStore';

describe('P2P & Online Undo confirmation banner', () => {
  it('hud.showUndo sets banner text and callbacks', () => {
    const hud = new Hud();
    const onAccept = vi.fn();
    const onDecline = vi.fn();

    hud.showUndo('Fox asks to take back their last move', onAccept, onDecline);
    const banner = hudStore.undoBanner.value;

    expect(banner.visible).toBe(true);
    expect(banner.text).toBe('Fox asks to take back their last move');
    expect(typeof banner.onAccept).toBe('function');
    expect(typeof banner.onDecline).toBe('function');

    banner.onAccept?.();
    expect(onAccept).toHaveBeenCalledTimes(1);

    banner.onDecline?.();
    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it('hud.showUndo(null) closes the banner', () => {
    const hud = new Hud();
    hud.showUndo('Some message', () => {}, () => {});
    expect(hudStore.undoBanner.value.visible).toBe(true);

    hud.showUndo(null);
    expect(hudStore.undoBanner.value.visible).toBe(false);
    expect(hudStore.undoBanner.value.onAccept).toBeUndefined();
    expect(hudStore.undoBanner.value.onDecline).toBeUndefined();
  });

  it('renders P2P undo confirmation with Accept and Decline actions for voters', () => {
    const hud = new Hud();
    const sentMessages: any[] = [];
    const mockSendOrHandle = (msg: any) => sentMessages.push(msg);

    // Simulate P2PController.renderUndo for Seat 1 (opponent/voter)
    const who = 'Fox';
    hud.showUndo(
      `${who} asks to take back their last move`,
      () => mockSendOrHandle({ type: 'vote', accept: true }),
      () => mockSendOrHandle({ type: 'vote', accept: false }),
    );

    const banner = hudStore.undoBanner.value;
    expect(banner.visible).toBe(true);
    expect(banner.text).toContain('Fox asks to take back their last move');
    expect(banner.onAccept).toBeDefined();
    expect(banner.onDecline).toBeDefined();

    // Voter accepts
    banner.onAccept?.();
    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0]).toEqual({ type: 'vote', accept: true });

    // Voter declines
    banner.onDecline?.();
    expect(sentMessages).toHaveLength(2);
    expect(sentMessages[1]).toEqual({ type: 'vote', accept: false });
  });

  it('renders waiting banner without actions for the requester', () => {
    const hud = new Hud();
    const undoView: UndoView = {
      by: 0, // Seat 0 is requester
      voters: [1],
      accepted: [],
      expiresAt: Date.now() + 15000,
    };

    // Simulate P2PController.renderUndo for Seat 0 (requester)
    hud.showUndo(`Waiting for opponents to accept your undo (${undoView.accepted.length}/${undoView.voters.length})`);

    const banner = hudStore.undoBanner.value;
    expect(banner.visible).toBe(true);
    expect(banner.text).toBe('Waiting for opponents to accept your undo (0/1)');
    expect(banner.onAccept).toBeUndefined();
    expect(banner.onDecline).toBeUndefined();
  });

  it('detects requester animal and name automatically from message text', () => {
    const hud = new Hud();
    hud.showUndo('Bear asks to take back their last move', () => {}, () => {});
    const banner = hudStore.undoBanner.value;
    expect(banner.requesterAnimal).toBe('bear');
    expect(banner.requesterName).toBe('Bear');
  });

  it('supports explicit requester animal and name metadata', () => {
    const hud = new Hud();
    hud.showUndo('Some message', () => {}, () => {}, {
      requesterAnimal: 'owl',
      requesterName: 'Wise Owl',
    });
    const banner = hudStore.undoBanner.value;
    expect(banner.requesterAnimal).toBe('owl');
    expect(banner.requesterName).toBe('Wise Owl');
  });
});
