import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import {
  isAreaAroundAnimal,
  resolveAnimalGesture,
  BoardInteractionManager,
} from '../BoardInteraction';
import { BoardPicker } from '../BoardPicker';
import { BoardPawns } from '../BoardPawns';
import { Tweener } from '../tween';
import { cellToWorld } from '../BoardGeometry';
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
        setPawnGestureDrag: vi.fn(),
        resetPawnGesture: vi.fn(),
        pickPawn: vi.fn(() => null),
        pick: vi.fn(() => ({ kind: 'cell' as const, r: 8, c: 4 })),
        isOnBoard: vi.fn(() => true),
      };

      const gameState = createGame(2);
      const onAction = vi.fn();
      const onToast = vi.fn();
      const onStageAction = vi.fn();
      const onDismissGestureHint = vi.fn();

      const manager = new BoardInteractionManager(mockCanvas, mockScene as any, {
        getState: () => gameState,
        canAct: () => true,
        onAction,
        onHoverPawn: vi.fn(),
        onToast,
        onStageAction,
        onDismissGestureHint,
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
        onDismissGestureHint,
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

    it('moves animal proportionally towards target and executes move on release', () => {
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

      // Short drag up by 15px
      listeners['pointermove']({
        clientX: 180,
        clientY: 305,
        pointerType: 'touch',
        pointerId: 1,
      });

      expect(mockScene.setPawnGestureDrag).toHaveBeenCalled();
      const firstCall = mockScene.setPawnGestureDrag.mock.calls[0];
      expect(firstCall[0]).toBe(0); // seat 0
      expect(firstCall[1]).toEqual({ r: 8, c: 4 }); // from
      expect(firstCall[2]).toEqual({ r: 7, c: 4 }); // to
      const shortProgress = firstCall[3];
      expect(shortProgress).toBeGreaterThan(0);
      expect(shortProgress).toBeLessThan(0.4);

      // Longer drag up by 45px
      listeners['pointermove']({
        clientX: 180,
        clientY: 275,
        pointerType: 'touch',
        pointerId: 1,
      });

      const secondCall = mockScene.setPawnGestureDrag.mock.calls[1];
      const longProgress = secondCall[3];
      // Longer gesture moves the animal more
      expect(longProgress).toBeGreaterThan(shortProgress);
      expect(longProgress).toBeCloseTo(1.0, 1);

      expect(mockScene.hoverMarker).toHaveBeenCalledWith({ type: 'move', r: 7, c: 4 });

      // Release swipe
      listeners['pointerup']({
        clientX: 180,
        clientY: 275,
        pointerType: 'touch',
        pointerId: 1,
      });

      // Camera controls re-enabled
      expect(mockControls.enabled).toBe(true);

      // Move executed
      expect(onAction).toHaveBeenCalledWith({ type: 'move', r: 7, c: 4 });
    });

    it('toasts and springs animal back when swiping into a wall', () => {
      const { listeners, gameState, mockScene, mockControls, onAction, onToast } = setupManager();
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

      expect(mockScene.setPawnGestureDrag).toHaveBeenCalledWith(
        0,
        { r: 8, c: 4 },
        { r: 7, c: 4 },
        expect.any(Number),
        true, // blocked
      );

      listeners['pointerup']({
        clientX: 180,
        clientY: 270,
        pointerType: 'touch',
        pointerId: 1,
      });

      expect(mockControls.enabled).toBe(true);
      expect(mockScene.resetPawnGesture).toHaveBeenCalledWith(0, { r: 8, c: 4 });
      expect(onAction).not.toHaveBeenCalled();
      expect(onToast).toHaveBeenCalledWith('Move blocked by hedge');
    });

    it('cleans up gesture, springs animal back and restores camera controls on pointercancel', () => {
      const { listeners, mockScene, mockControls, manager } = setupManager();
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
      expect(mockScene.resetPawnGesture).toHaveBeenCalledWith(0, { r: 8, c: 4 });
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

    it('returns animal back and does not execute action when released outside the board', () => {
      const { listeners, mockScene, mockControls, onAction, onToast } = setupManager();
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

      // Swipe forward over 22px
      listeners['pointermove']({
        clientX: 180,
        clientY: 270,
        pointerType: 'touch',
        pointerId: 1,
      });

      expect(mockScene.setPawnGestureDrag).toHaveBeenCalled();

      // Release outside the board
      mockScene.isOnBoard.mockReturnValue(false);

      listeners['pointerup']({
        clientX: 180,
        clientY: 10,
        pointerType: 'touch',
        pointerId: 1,
      });

      expect(mockControls.enabled).toBe(true);
      expect(mockScene.resetPawnGesture).toHaveBeenCalledWith(0, { r: 8, c: 4 });
      expect(onAction).not.toHaveBeenCalled();
      expect(onToast).not.toHaveBeenCalled();
    });

    it('springs animal back during drag if pointer moves outside the board and resumes if moved back', () => {
      const { listeners, mockScene } = setupManager();
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

      // Pointer moves outside the board while dragging
      mockScene.isOnBoard.mockReturnValue(false);
      listeners['pointermove']({
        clientX: 10,
        clientY: 10,
        pointerType: 'touch',
        pointerId: 1,
      });

      expect(mockScene.resetPawnGesture).toHaveBeenCalledWith(0, { r: 8, c: 4 });
      expect(mockScene.hoverMarker).toHaveBeenCalledWith(null);
      expect(mockScene.showGhost).toHaveBeenCalledWith(null);

      // Pointer moves back onto the board
      mockScene.isOnBoard.mockReturnValue(true);
      listeners['pointermove']({
        clientX: 180,
        clientY: 280,
        pointerType: 'touch',
        pointerId: 1,
      });

      expect(mockScene.setPawnGestureDrag).toHaveBeenCalledWith(
        0,
        { r: 8, c: 4 },
        { r: 7, c: 4 },
        expect.any(Number),
        false,
      );
    });

    it('dismisses gesture hint on pointerdown', () => {
      const { listeners, onDismissGestureHint } = setupManager();
      listeners['pointerdown']({
        clientX: 180,
        clientY: 320,
        pointerType: 'touch',
        pointerId: 1,
        stopImmediatePropagation: vi.fn(),
      });
      expect(onDismissGestureHint).toHaveBeenCalledTimes(1);
    });
  });

  describe('BoardPicker.isOnBoard', () => {
    it('returns true on board tiles and false when pointing outside', () => {
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      camera.position.set(0, 15, 10);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();

      const canvas = {
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 400 }),
      } as HTMLElement;

      const picker = new BoardPicker(camera, canvas);

      // Center of canvas points near board center (0, 0, 0)
      expect(picker.isOnBoard(200, 200)).toBe(true);

      // Screen coordinate completely outside canvas bounds
      expect(picker.isOnBoard(-50, 200)).toBe(false);
      expect(picker.isOnBoard(500, 200)).toBe(false);
      expect(picker.isOnBoard(200, -100)).toBe(false);
      expect(picker.isOnBoard(200, 500)).toBe(false);
    });
  });


  describe('BoardPawns Physical Gesture Motion', () => {
    function setupPawns() {
      const scene = new THREE.Scene();
      const tween = new Tweener();
      const pawns = new BoardPawns(scene, tween);
      pawns.setupPlayers(['fox', 'bear']);
      pawns.syncPositions([
        { r: 8, c: 4 },
        { r: 0, c: 4 },
      ]);
      pawns.setActiveSeat(0);
      return { scene, tween, pawns };
    }

    it('moves animal half way to aimed destination at full gesture progress', () => {
      const { pawns } = setupPawns();
      const pawn0 = pawns.pawnList[0];
      const from = { r: 8, c: 4 };
      const to = { r: 7, c: 4 };

      const fromPos = cellToWorld(from.r, from.c);
      const toPos = cellToWorld(to.r, to.c);
      const totalDist = fromPos.distanceTo(toPos);

      pawns.setPawnGestureDrag(0, from, to, 1.0, false);
      for (let i = 1; i <= 25; i++) pawns.tick(i * 0.016, null);

      const currentDist = fromPos.distanceTo(pawn0.group.position);
      // Half way towards target (0.50 of total tile distance)
      expect(currentDist / totalDist).toBeCloseTo(0.5, 2);
    });

    it('moves animal lesser on shorter gesture', () => {
      const { pawns } = setupPawns();
      const pawn0 = pawns.pawnList[0];
      const from = { r: 8, c: 4 };
      const to = { r: 7, c: 4 };
      const fromPos = cellToWorld(from.r, from.c);
      const toPos = cellToWorld(to.r, to.c);
      const totalDist = fromPos.distanceTo(toPos);

      // Short gesture: progress 0.3
      pawns.setPawnGestureDrag(0, from, to, 0.3, false);
      for (let i = 1; i <= 25; i++) pawns.tick(i * 0.016, null);
      const shortDist = fromPos.distanceTo(pawn0.group.position);
      expect(shortDist / totalDist).toBeCloseTo(0.15, 2);

      // Medium gesture: progress 0.6
      pawns.setPawnGestureDrag(0, from, to, 0.6, false);
      for (let i = 26; i <= 50; i++) pawns.tick(i * 0.016, null);
      const medDist = fromPos.distanceTo(pawn0.group.position);
      expect(medDist / totalDist).toBeCloseTo(0.3, 2);
      expect(medDist).toBeGreaterThan(shortDist);
    });

    it('restricts displacement when movement direction is blocked', () => {
      const { pawns } = setupPawns();
      const pawn0 = pawns.pawnList[0];
      const from = { r: 8, c: 4 };
      const to = { r: 7, c: 4 };
      const fromPos = cellToWorld(from.r, from.c);
      const toPos = cellToWorld(to.r, to.c);
      const totalDist = fromPos.distanceTo(toPos);

      // Blocked drag at full progress
      pawns.setPawnGestureDrag(0, from, to, 1.0, true);
      for (let i = 1; i <= 25; i++) pawns.tick(i * 0.016, null);
      const blockedDist = fromPos.distanceTo(pawn0.group.position);
      // Limited displacement against resistance (max 0.14)
      expect(blockedDist / totalDist).toBeCloseTo(0.14, 2);
    });

    it('smoothly animates when gesture direction changes from upper to right without instant teleport', () => {
      const { pawns } = setupPawns();
      const pawn0 = pawns.pawnList[0];
      const from = { r: 8, c: 4 };
      const upperTo = { r: 7, c: 4 };
      const rightTo = { r: 8, c: 5 };

      const fromPos = cellToWorld(from.r, from.c);
      const upperTarget = fromPos.clone().lerp(cellToWorld(upperTo.r, upperTo.c), 0.5);
      const rightTarget = fromPos.clone().lerp(cellToWorld(rightTo.r, rightTo.c), 0.5);

      // Drag upwards
      pawns.setPawnGestureDrag(0, from, upperTo, 1.0, false);
      for (let i = 1; i <= 25; i++) pawns.tick(i * 0.016, null);
      expect(pawn0.group.position.distanceTo(upperTarget)).toBeCloseTo(0, 2);

      // Switch gesture direction to right
      pawns.setPawnGestureDrag(0, from, rightTo, 1.0, false);

      // On next frame (16ms), the pawn does NOT instantly jump to rightTarget
      pawns.tick(26 * 0.016, null);
      expect(pawn0.group.position.distanceTo(rightTarget)).toBeGreaterThan(0.2);
      expect(pawn0.group.position.distanceTo(upperTarget)).toBeGreaterThan(0.05);

      // Over subsequent frames, it smoothly animates all the way to rightTarget
      for (let i = 27; i <= 55; i++) pawns.tick(i * 0.016, null);
      expect(pawn0.group.position.distanceTo(rightTarget)).toBeCloseTo(0, 2);
    });

    it('springs animal back to home square on resetPawnGesture', () => {
      const { pawns, tween } = setupPawns();
      const pawn0 = pawns.pawnList[0];
      const from = { r: 8, c: 4 };
      const to = { r: 7, c: 4 };
      const fromPos = cellToWorld(from.r, from.c);

      pawns.setPawnGestureDrag(0, from, to, 1.0, false);
      for (let i = 1; i <= 25; i++) pawns.tick(i * 0.016, null);
      expect(pawn0.group.position.distanceTo(fromPos)).toBeGreaterThan(0.2);

      let mockNow = 1000;
      vi.spyOn(performance, 'now').mockImplementation(() => mockNow);

      pawns.resetPawnGesture(0, from);
      // Advance time beyond 0.18s
      mockNow += 300;
      tween.tick();

      expect(pawn0.group.position.distanceTo(fromPos)).toBeCloseTo(0, 2);
    });
  });
});
