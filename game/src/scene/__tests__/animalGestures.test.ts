import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import {
  isAreaAroundAnimal,
  resolveAnimalGesture,
  BoardInteractionManager,
} from '../BoardInteraction';
import { createGame, applyAction } from '../../game/rules';

describe('Animal Gestures on Mobile', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('isAreaAroundAnimal', () => {
    it('returns true when direct raycast hits the active player animal mesh', () => {
      const state = createGame(2); // turn = 0, player 0 at (8, 4)
      const mockScene = {
        pickPawn: vi.fn((_x, _y) => 0), // hit seat 0
        pick: vi.fn(() => null),
      };
      const mockCanvas = {
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 360, height: 360 }),
      } as any;
      expect(isAreaAroundAnimal(100, 100, state, mockScene as any, mockCanvas)).toBe(true);
    });

    it('returns false when raycast hits an opponent animal mesh', () => {
      const state = createGame(2);
      const mockScene = {
        pickPawn: vi.fn((_x, _y) => 1), // hit seat 1 (opponent)
        pick: vi.fn(() => null),
      };
      const mockCanvas = {
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 360, height: 360 }),
      } as any;
      expect(isAreaAroundAnimal(100, 100, state, mockScene as any, mockCanvas)).toBe(false);
    });

    it('returns true when cell pick is the animal own cell', () => {
      const state = createGame(2); // player 0 at (8, 4)
      const mockScene = {
        pickPawn: vi.fn(() => null),
        pick: vi.fn(() => ({ kind: 'cell' as const, r: 8, c: 4 })),
      };
      const mockCanvas = {
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 360, height: 360 }),
      } as any;
      expect(isAreaAroundAnimal(100, 100, state, mockScene as any, mockCanvas)).toBe(true);
    });

    it('returns true when cell pick is an immediate adjacent cell', () => {
      const state = createGame(2); // player 0 at (8, 4)
      const mockScene = {
        pickPawn: vi.fn(() => null),
        pick: vi.fn(() => ({ kind: 'cell' as const, r: 7, c: 4 })), // north cell
      };
      const mockCanvas = {
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 360, height: 360 }),
      } as any;
      expect(isAreaAroundAnimal(100, 100, state, mockScene as any, mockCanvas)).toBe(true);
    });

    it('returns false when cell pick is far away from the animal', () => {
      const state = createGame(2); // player 0 at (8, 4)
      const mockScene = {
        pickPawn: vi.fn(() => null),
        pick: vi.fn(() => ({ kind: 'cell' as const, r: 2, c: 4 })),
      };
      const mockCanvas = {
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 360, height: 360 }),
      } as any;
      expect(isAreaAroundAnimal(100, 100, state, mockScene as any, mockCanvas)).toBe(false);
    });

    it('returns false if the game already has a winner', () => {
      const state = createGame(2);
      state.winner = 0;
      const mockScene = {
        pickPawn: vi.fn(() => 0),
        pick: vi.fn(() => ({ kind: 'cell' as const, r: 8, c: 4 })),
      };
      const mockCanvas = {
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 360, height: 360 }),
      } as any;
      expect(isAreaAroundAnimal(100, 100, state, mockScene as any, mockCanvas)).toBe(false);
    });
  });

  describe('resolveAnimalGesture', () => {
    it('resolves forward swipe to moving north for player 0', () => {
      const state = createGame(2); // player 0 at (8, 4), goal r=0
      // Swiping up (dy < 0)
      const res = resolveAnimalGesture(0, -50, state, 0);
      expect(res.direction).toBe('forward');
      expect(res.action).toEqual({ type: 'move', r: 7, c: 4 });
    });

    it('resolves backward swipe to off-board for player 0 starting at row 8', () => {
      const state = createGame(2);
      // Swiping down (dy > 0)
      const res = resolveAnimalGesture(0, 50, state, 0);
      expect(res.direction).toBe('backward');
      expect(res.action).toBeNull();
      expect(res.reason).toBe('off_board');
    });

    it('resolves left swipe to moving west for player 0', () => {
      const state = createGame(2); // player 0 at (8, 4)
      // Swiping left (dx < 0)
      const res = resolveAnimalGesture(-50, 0, state, 0);
      expect(res.direction).toBe('left');
      expect(res.action).toEqual({ type: 'move', r: 8, c: 3 });
    });

    it('resolves right swipe to moving east for player 0', () => {
      const state = createGame(2); // player 0 at (8, 4)
      // Swiping right (dx > 0)
      const res = resolveAnimalGesture(50, 0, state, 0);
      expect(res.direction).toBe('right');
      expect(res.action).toEqual({ type: 'move', r: 8, c: 5 });
    });

    it('resolves forward swipe to straight jump when an opponent is directly in front', () => {
      const state = createGame(2);
      // Place player 0 at (8, 4) and opponent player 1 at (7, 4)
      state.players[1].r = 7;
      state.players[1].c = 4;

      const res = resolveAnimalGesture(0, -50, state, 0);
      expect(res.direction).toBe('forward');
      // Should straight jump over player 1 to (6, 4)
      expect(res.action).toEqual({ type: 'move', r: 6, c: 4 });
    });

    it('returns blocked_by_hedge when move is blocked by a wall', () => {
      const state = createGame(2); // player 0 at (8, 4)
      // Place horizontal wall between row 7 and row 8 at col 4
      applyAction(state, { type: 'wall', wall: { r: 7, c: 4, o: 'h' } });
      state.turn = 0; // reset turn to player 0

      const res = resolveAnimalGesture(0, -50, state, 0);
      expect(res.direction).toBe('forward');
      expect(res.action).toBeNull();
      expect(res.reason).toBe('blocked_by_hedge');
    });

    it('resolves diagonal jump when straight jump is blocked by a wall behind the opponent', () => {
      const state = createGame(2);
      state.players[0].r = 8;
      state.players[0].c = 4;
      state.players[1].r = 7;
      state.players[1].c = 4;

      // Wall blocks jump straight between row 6 and row 7
      applyAction(state, { type: 'wall', wall: { r: 6, c: 4, o: 'h' } });
      state.turn = 0;

      // Swiping diagonal forward-left (dx < 0, dy < 0)
      const res = resolveAnimalGesture(-40, -40, state, 0);
      expect(res.action).toEqual({ type: 'move', r: 7, c: 3 });
    });

    it('resolves forward for player 1 (moving south towards row 8)', () => {
      const state = createGame(2);
      state.turn = 1; // player 1 starts at (0, 4), goal r=8
      // Mock screen projection where south is visually down, or camera behind seat 1
      const mockProject = (pos: THREE.Vector3) => ({
        x: 100,
        // For seat 1, row 1 is forward (up on player 1's screen)
        y: pos.z > 0 ? 50 : 150,
      });

      const res = resolveAnimalGesture(0, -50, state, 1, mockProject);
      expect(res.direction).toBe('forward');
      expect(res.action).toEqual({ type: 'move', r: 1, c: 4 });
    });
  });

  describe('BoardInteractionManager Animal Gesture Handling', () => {
    function setupManager() {
      const listeners: Record<string, Function> = {};
      const mockCanvas = {
        addEventListener: vi.fn((event: string, handler: Function) => {
          listeners[event] = handler;
        }),
        getBoundingClientRect: vi.fn(() => ({
          left: 0,
          top: 0,
          width: 360,
          height: 360,
        })),
        setPointerCapture: vi.fn(),
        releasePointerCapture: vi.fn(),
        hasPointerCapture: vi.fn(() => true),
        style: {},
      } as unknown as HTMLCanvasElement;

      const mockControls = {
        enabled: true,
      };

      const mockScene = {
        controls: mockControls,
        showGhost: vi.fn(),
        hoverMarker: vi.fn(),
        pickPawn: vi.fn(() => null),
        pick: vi.fn(() => ({ kind: 'cell' as const, r: 8, c: 4 })),
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
        mockControls,
        gameState,
        onAction,
        onToast,
        onStageAction,
      };
    }

    it('disables camera controls on pointerdown in the active animal area on mobile', () => {
      const { listeners, mockControls, manager } = setupManager();
      vi.stubGlobal('window', {
        matchMedia: () => ({ matches: false }),
        innerWidth: 390,
      });

      // Pointer down on animal cell (8, 4)
      listeners['pointerdown']({
        clientX: 180,
        clientY: 320,
        pointerType: 'touch',
        pointerId: 1,
        stopImmediatePropagation: vi.fn(),
      });

      expect(mockControls.enabled).toBe(false);
      expect(manager.getActiveGesture()).not.toBeNull();
    });

    it('updates hoverMarker during drag and executes move on release', () => {
      const { listeners, mockScene, mockControls, onAction } = setupManager();
      vi.stubGlobal('window', {
        matchMedia: () => ({ matches: false }),
        innerWidth: 390,
      });

      // Start touch on animal
      listeners['pointerdown']({
        clientX: 180,
        clientY: 320,
        pointerType: 'touch',
        pointerId: 1,
        stopImmediatePropagation: vi.fn(),
      });

      // Drag up by 40px (forward gesture)
      listeners['pointermove']({
        clientX: 180,
        clientY: 280,
        pointerType: 'touch',
        pointerId: 1,
      });

      expect(mockScene.hoverMarker).toHaveBeenCalledWith({ type: 'move', r: 7, c: 4 });

      // Release swipe
      listeners['pointerup']({
        clientX: 180,
        clientY: 280,
        pointerType: 'touch',
        pointerId: 1,
      });

      // Camera controls re-enabled
      expect(mockControls.enabled).toBe(true);

      // Move executed
      expect(onAction).toHaveBeenCalledWith({ type: 'move', r: 7, c: 4 });
    });

    it('toasts blocked by hedge when swiping into a wall', () => {
      const { listeners, gameState, mockControls, onAction, onToast } = setupManager();
      vi.stubGlobal('window', {
        matchMedia: () => ({ matches: false }),
        innerWidth: 390,
      });

      // Place a blocking hedge
      applyAction(gameState, { type: 'wall', wall: { r: 7, c: 4, o: 'h' } });
      gameState.turn = 0;

      listeners['pointerdown']({
        clientX: 180,
        clientY: 320,
        pointerType: 'touch',
        pointerId: 1,
        stopImmediatePropagation: vi.fn(),
      });

      listeners['pointermove']({
        clientX: 180,
        clientY: 270,
        pointerType: 'touch',
        pointerId: 1,
      });

      listeners['pointerup']({
        clientX: 180,
        clientY: 270,
        pointerType: 'touch',
        pointerId: 1,
      });

      expect(mockControls.enabled).toBe(true);
      expect(onAction).not.toHaveBeenCalled();
      expect(onToast).toHaveBeenCalledWith('Move blocked by hedge');
    });

    it('cleans up gesture and restores camera controls on pointercancel', () => {
      const { listeners, mockControls, manager } = setupManager();
      vi.stubGlobal('window', {
        matchMedia: () => ({ matches: false }),
        innerWidth: 390,
      });

      listeners['pointerdown']({
        clientX: 180,
        clientY: 320,
        pointerType: 'touch',
        pointerId: 1,
        stopImmediatePropagation: vi.fn(),
      });

      expect(mockControls.enabled).toBe(false);

      listeners['pointercancel']({
        pointerType: 'touch',
        pointerId: 1,
      });

      expect(mockControls.enabled).toBe(true);
      expect(manager.getActiveGesture()).toBeNull();
    });

    it('does not intercept gesture when touching outside the animal area', () => {
      const { listeners, mockScene, mockControls, manager } = setupManager();
      vi.stubGlobal('window', {
        matchMedia: () => ({ matches: false }),
        innerWidth: 390,
      });

      // Pick cell far away (0, 0)
      mockScene.pick.mockReturnValue({ kind: 'cell', r: 0, c: 0 });

      listeners['pointerdown']({
        clientX: 10,
        clientY: 10,
        pointerType: 'touch',
        pointerId: 1,
        stopImmediatePropagation: vi.fn(),
      });

      // Controls should remain enabled for normal camera orbit
      expect(mockControls.enabled).toBe(true);
      expect(manager.getActiveGesture()).toBeNull();
    });
  });
});
