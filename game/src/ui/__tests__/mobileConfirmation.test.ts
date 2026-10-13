import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isMobileOrTouch, BoardInteractionManager } from '../../scene/BoardInteraction';
import { createGame } from '../../game/rules';

describe('Mobile Move Confirmation', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('isMobileOrTouch detection', () => {
    it('detects touch pointer type', () => {
      const touchEvent = { pointerType: 'touch' } as PointerEvent;
      expect(isMobileOrTouch(touchEvent)).toBe(true);
    });

    it('detects coarse pointer via matchMedia', () => {
      vi.stubGlobal('window', {
        matchMedia: (query: string) => ({
          matches: query === '(pointer: coarse)',
        }),
        innerWidth: 1024,
      });
      expect(isMobileOrTouch()).toBe(true);
    });

    it('detects narrow mobile viewport width <= 768', () => {
      vi.stubGlobal('window', {
        matchMedia: () => ({ matches: false }),
        innerWidth: 390,
      });
      expect(isMobileOrTouch()).toBe(true);
    });

    it('detects touch support on window or navigator', () => {
      vi.stubGlobal('window', {
        matchMedia: () => ({ matches: false }),
        innerWidth: 1024,
        ontouchstart: {},
      });
      vi.stubGlobal('navigator', { maxTouchPoints: 5 });
      expect(isMobileOrTouch()).toBe(true);
    });

    it('returns false for desktop mouse with wide viewport', () => {
      vi.stubGlobal('window', {
        matchMedia: () => ({ matches: false }),
        innerWidth: 1280,
      });
      vi.stubGlobal('navigator', { maxTouchPoints: 0 });
      const mouseEvent = { pointerType: 'mouse' } as PointerEvent;
      expect(isMobileOrTouch(mouseEvent)).toBe(false);
    });
  });

  describe('BoardInteractionManager Staging & Confirmation', () => {
    function setupManager() {
      const listeners: Record<string, Function> = {};
      const mockCanvas = {
        addEventListener: vi.fn((event: string, handler: Function) => {
          listeners[event] = handler;
        }),
        style: {},
      } as unknown as HTMLCanvasElement;

      const mockScene = {
        showGhost: vi.fn(),
        hoverMarker: vi.fn(),
        pickPawn: vi.fn(() => null),
        pick: vi.fn(),
      };

      const gameState = createGame(2);
      const onAction = vi.fn();
      const onToast = vi.fn();
      const onStageAction = vi.fn();

      const manager = new BoardInteractionManager(mockCanvas, mockScene as any, {
        getState: () => gameState,
        canAct: () => true,
        onAction,
        onHoverPawn: vi.fn(),
        onToast,
        onStageAction,
      });

      return {
        manager,
        listeners,
        mockScene,
        gameState,
        onAction,
        onToast,
        onStageAction,
      };
    }

    it('stages a pawn move on mobile touch instead of immediately executing', () => {
      const { manager, listeners, mockScene, onAction, onStageAction } = setupManager();
      vi.stubGlobal('window', {
        matchMedia: () => ({ matches: false }),
        innerWidth: 390,
      });

      // Destination for player 0 (starting at r=8, c=4): legal move is r=7, c=4
      mockScene.pick.mockReturnValue({ kind: 'cell', r: 7, c: 4 });

      // Trigger pointerdown then pointerup with touch
      listeners['pointerdown']({ clientX: 100, clientY: 100 });
      listeners['pointerup']({ clientX: 102, clientY: 102, pointerType: 'touch' });

      // Should be staged, NOT executed yet
      expect(manager.getStagedAction()).toEqual({ type: 'move', r: 7, c: 4 });
      expect(onAction).not.toHaveBeenCalled();
      expect(onStageAction).toHaveBeenCalledWith(
        { type: 'move', r: 7, c: 4 },
        expect.stringContaining('Move to E2'),
      );
      expect(mockScene.hoverMarker).toHaveBeenCalledWith({ type: 'move', r: 7, c: 4 });
    });

    it('confirms the staged move when confirmStagedAction is called', () => {
      const { manager, listeners, mockScene, onAction, onStageAction } = setupManager();
      vi.stubGlobal('window', {
        matchMedia: () => ({ matches: false }),
        innerWidth: 390,
      });

      mockScene.pick.mockReturnValue({ kind: 'cell', r: 7, c: 4 });
      listeners['pointerdown']({ clientX: 100, clientY: 100 });
      listeners['pointerup']({ clientX: 100, clientY: 100, pointerType: 'touch' });

      manager.confirmStagedAction();

      expect(manager.getStagedAction()).toBeNull();
      expect(onAction).toHaveBeenCalledWith({ type: 'move', r: 7, c: 4 });
      expect(onStageAction).toHaveBeenLastCalledWith(null, '');
    });

    it('confirms double-tap on the same move on mobile', () => {
      const { manager, listeners, mockScene, onAction } = setupManager();
      vi.stubGlobal('window', {
        matchMedia: () => ({ matches: false }),
        innerWidth: 390,
      });

      mockScene.pick.mockReturnValue({ kind: 'cell', r: 7, c: 4 });

      // First tap -> stages
      listeners['pointerdown']({ clientX: 100, clientY: 100 });
      listeners['pointerup']({ clientX: 100, clientY: 100, pointerType: 'touch' });
      expect(onAction).not.toHaveBeenCalled();

      // Second tap on same tile -> executes
      listeners['pointerdown']({ clientX: 100, clientY: 100 });
      listeners['pointerup']({ clientX: 100, clientY: 100, pointerType: 'touch' });
      expect(onAction).toHaveBeenCalledWith({ type: 'move', r: 7, c: 4 });
      expect(manager.getStagedAction()).toBeNull();
    });

    it('updates staged action when tapping a different target', () => {
      const { manager, listeners, mockScene, onAction } = setupManager();
      vi.stubGlobal('window', {
        matchMedia: () => ({ matches: false }),
        innerWidth: 390,
      });

      // First tap r=7, c=4
      mockScene.pick.mockReturnValue({ kind: 'cell', r: 7, c: 4 });
      listeners['pointerdown']({ clientX: 100, clientY: 100 });
      listeners['pointerup']({ clientX: 100, clientY: 100, pointerType: 'touch' });
      expect(manager.getStagedAction()).toEqual({ type: 'move', r: 7, c: 4 });

      // Next tap a wall
      mockScene.pick.mockReturnValue({ kind: 'wall', wall: { r: 5, c: 4, o: 'h' } });
      listeners['pointerdown']({ clientX: 150, clientY: 150 });
      listeners['pointerup']({ clientX: 150, clientY: 150, pointerType: 'touch' });
      expect(manager.getStagedAction()).toEqual({ type: 'wall', wall: { r: 5, c: 4, o: 'h' } });
      expect(onAction).not.toHaveBeenCalled();
    });

    it('cancels staged action when cancelStagedAction is called', () => {
      const { manager, listeners, mockScene, onAction, onStageAction } = setupManager();
      vi.stubGlobal('window', {
        matchMedia: () => ({ matches: false }),
        innerWidth: 390,
      });

      mockScene.pick.mockReturnValue({ kind: 'cell', r: 7, c: 4 });
      listeners['pointerdown']({ clientX: 100, clientY: 100 });
      listeners['pointerup']({ clientX: 100, clientY: 100, pointerType: 'touch' });

      manager.cancelStagedAction();

      expect(manager.getStagedAction()).toBeNull();
      expect(onAction).not.toHaveBeenCalled();
      expect(onStageAction).toHaveBeenLastCalledWith(null, '');
    });

    it('executes immediately without confirmation on desktop mouse', () => {
      const { manager, listeners, mockScene, onAction, onStageAction } = setupManager();
      vi.stubGlobal('window', {
        matchMedia: () => ({ matches: false }),
        innerWidth: 1440,
      });

      mockScene.pick.mockReturnValue({ kind: 'cell', r: 7, c: 4 });
      listeners['pointerdown']({ clientX: 200, clientY: 200 });
      listeners['pointerup']({ clientX: 200, clientY: 200, pointerType: 'mouse' });

      expect(manager.getStagedAction()).toBeNull();
      expect(onAction).toHaveBeenCalledWith({ type: 'move', r: 7, c: 4 });
      expect(onStageAction).toHaveBeenCalledWith(null, '');
    });

    it('passes intended move target to hoverMarker for animal body rotation', () => {
      const { listeners, mockScene } = setupManager();
      vi.stubGlobal('window', {
        matchMedia: () => ({ matches: false }),
        innerWidth: 390,
      });

      // Target move to north cell (7, 4)
      mockScene.pick.mockReturnValue({ kind: 'cell', r: 7, c: 4 });
      listeners['pointerdown']({ clientX: 100, clientY: 100 });
      listeners['pointerup']({ clientX: 100, clientY: 100, pointerType: 'touch' });

      expect(mockScene.hoverMarker).toHaveBeenCalledWith({ type: 'move', r: 7, c: 4 });
    });
  });
});
