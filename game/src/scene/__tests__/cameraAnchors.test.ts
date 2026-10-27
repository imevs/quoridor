import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import {
  BoardCameraRig,
  ANCHOR_ANGLE_OFFSET,
  PHI_SEAT,
  PHI_TOP,
  SEAT_AZ_2,
  SEAT_AZ_4,
} from '../BoardCameraRig';

describe('BoardCameraRig Anchoring Logic', () => {
  let rig: BoardCameraRig;

  beforeEach(() => {
    vi.stubGlobal('window', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      devicePixelRatio: 1,
    });
    vi.stubGlobal('document', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    const mockContainer = {
      clientWidth: 1000,
      clientHeight: 800,
    } as unknown as HTMLElement;

    const docMock = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    const mockDomElement = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      ownerDocument: docMock,
      getRootNode: vi.fn(() => docMock),
      style: {},
    } as unknown as HTMLElement;

    rig = new BoardCameraRig(mockContainer, mockDomElement);
  });

  afterEach(() => {
    rig.dispose();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('generates 4 anchoring points per player view in 2-player mode (8 total)', () => {
    rig.setSeatCount(2);
    const anchors = rig.getAnchors(2);
    expect(anchors).toHaveLength(8);

    // Player 1 (seat 0)
    const seat0Anchors = anchors.filter((a) => a.seat === 0);
    expect(seat0Anchors).toHaveLength(4);
    expect(seat0Anchors.map((a) => a.kind)).toEqual(['left', 'center', 'right', 'top']);

    const s0Left = seat0Anchors.find((a) => a.kind === 'left')!;
    const s0Center = seat0Anchors.find((a) => a.kind === 'center')!;
    const s0Right = seat0Anchors.find((a) => a.kind === 'right')!;
    const s0Top = seat0Anchors.find((a) => a.kind === 'top')!;

    expect(s0Center.theta).toBeCloseTo(SEAT_AZ_2[0]);
    expect(s0Left.theta).toBeCloseTo(SEAT_AZ_2[0] - ANCHOR_ANGLE_OFFSET);
    expect(s0Right.theta).toBeCloseTo(SEAT_AZ_2[0] + ANCHOR_ANGLE_OFFSET);
    expect(s0Center.phi).toBeCloseTo(PHI_SEAT);
    expect(s0Top.phi).toBeCloseTo(PHI_TOP);

    // Player 2 (seat 1)
    const seat1Anchors = anchors.filter((a) => a.seat === 1);
    expect(seat1Anchors).toHaveLength(4);

    const s1Center = seat1Anchors.find((a) => a.kind === 'center')!;
    const s1Left = seat1Anchors.find((a) => a.kind === 'left')!;
    const s1Right = seat1Anchors.find((a) => a.kind === 'right')!;
    const s1Top = seat1Anchors.find((a) => a.kind === 'top')!;

    expect(s1Center.theta).toBeCloseTo(SEAT_AZ_2[1]);
    expect(s1Left.theta).toBeCloseTo(SEAT_AZ_2[1] - ANCHOR_ANGLE_OFFSET);
    expect(s1Right.theta).toBeCloseTo(SEAT_AZ_2[1] + ANCHOR_ANGLE_OFFSET);
    expect(s1Top.phi).toBeCloseTo(PHI_TOP);
  });

  it('generates 4 anchoring points per player view in 4-player mode (16 total)', () => {
    rig.setSeatCount(4);
    const anchors = rig.getAnchors(4);
    expect(anchors).toHaveLength(16);

    for (let seat = 0; seat < 4; seat++) {
      const seatAnchors = anchors.filter((a) => a.seat === seat);
      expect(seatAnchors).toHaveLength(4);
      const center = seatAnchors.find((a) => a.kind === 'center')!;
      expect(center.theta).toBeCloseTo(SEAT_AZ_4[seat]);
    }
  });

  it('detects Seat 1 Center anchor when camera is behind Seat 1', () => {
    rig.setSeatCount(2);
    const r = rig.idealDistance('seat');
    rig.camera.position.set(0, r * Math.cos(PHI_SEAT), r * Math.sin(PHI_SEAT));
    rig.controls.target.set(0, 0, 0);

    const nearest = rig.getNearestAnchor();
    expect(nearest.seat).toBe(0);
    expect(nearest.kind).toBe('center');
    expect(nearest.preset).toBe('seat');
  });

  it('detects Seat 1 Left 45° anchor when camera is dragged to the left (~ -35°)', () => {
    rig.setSeatCount(2);
    const theta = -35 * (Math.PI / 180);
    const r = rig.idealDistance('seat');
    const sph = new THREE.Spherical(r, PHI_SEAT, theta);
    rig.camera.position.setFromSpherical(sph);
    rig.controls.target.set(0, 0, 0);

    const nearest = rig.getNearestAnchor();
    expect(nearest.seat).toBe(0);
    expect(nearest.kind).toBe('left');
  });

  it('detects Seat 1 Right 45° anchor when camera is dragged to the right (~ +35°)', () => {
    rig.setSeatCount(2);
    const theta = 35 * (Math.PI / 180);
    const r = rig.idealDistance('seat');
    const sph = new THREE.Spherical(r, PHI_SEAT, theta);
    rig.camera.position.setFromSpherical(sph);
    rig.controls.target.set(0, 0, 0);

    const nearest = rig.getNearestAnchor();
    expect(nearest.seat).toBe(0);
    expect(nearest.kind).toBe('right');
  });

  it('detects Top-Down anchor when camera is dragged overhead (low phi)', () => {
    rig.setSeatCount(2);
    const r = rig.idealDistance('top');
    const sph = new THREE.Spherical(r, 0.1, 0.05);
    rig.camera.position.setFromSpherical(sph);
    rig.controls.target.set(0, 0, 0);

    const nearest = rig.getNearestAnchor();
    expect(nearest.preset).toBe('top');
    expect(nearest.kind).toBe('top');
    expect(nearest.seat).toBe(0);
  });

  it('detects Seat 2 Center anchor when camera is dragged around towards Seat 2 (theta ~ PI)', () => {
    rig.setSeatCount(2);
    const r = rig.idealDistance('seat');
    const sph = new THREE.Spherical(r, PHI_SEAT, Math.PI - 0.05);
    rig.camera.position.setFromSpherical(sph);
    rig.controls.target.set(0, 0, 0);

    const nearest = rig.getNearestAnchor();
    expect(nearest.seat).toBe(1);
    expect(nearest.kind).toBe('center');
  });

  it('snaps camera to nearest anchor upon snapToNearestAnchor', async () => {
    rig.setSeatCount(2);
    const r = rig.idealDistance('seat');
    const sph = new THREE.Spherical(r, PHI_SEAT, 0.6);
    rig.camera.position.setFromSpherical(sph);
    rig.controls.target.set(0, 0, 0);

    let snappedAnchor = null;
    rig.onAnchorSnapped = (a) => {
      snappedAnchor = a;
    };

    const targetAnchor = await rig.snapToNearestAnchor(0);
    expect(targetAnchor?.seat).toBe(0);
    expect(targetAnchor?.kind).toBe('right');
    expect(snappedAnchor).toEqual(targetAnchor);
    expect(rig.currentAnchor).toEqual(targetAnchor);
  });

  it('animates camera snap with a spring when ticked through updateControls', async () => {
    rig.setSeatCount(2);
    const r = rig.idealDistance('seat');
    const sph = new THREE.Spherical(r, PHI_SEAT, -0.6);
    rig.camera.position.setFromSpherical(sph);
    rig.controls.target.set(0, 0, 0);

    let resolved = false;
    const promise = rig.snapToNearestAnchor(0.3).then((a) => {
      resolved = true;
      return a;
    });

    // Simulate 60fps render frames ticking the spring; theta must approach the anchor monotonically.
    let prevErr = Infinity;
    for (let i = 0; i < 120 && !resolved; i++) {
      rig.updateControls(1 / 60);
      const cur = new THREE.Spherical().setFromVector3(rig.camera.position.clone());
      const err = Math.abs(cur.theta - -ANCHOR_ANGLE_OFFSET);
      expect(err).toBeLessThanOrEqual(prevErr + 1e-9);
      prevErr = err;
      await Promise.resolve();
    }

    const targetAnchor = await promise;
    expect(targetAnchor?.seat).toBe(0);
    expect(targetAnchor?.kind).toBe('left');
    expect(prevErr).toBeLessThan(1e-3);
  });

  it('uses release velocity to carry a flick over to the next anchor', async () => {
    rig.setSeatCount(2);
    const r = rig.idealDistance('seat');
    // 15° right of seat 0: nearest at rest is Center, but a fast rightward drag should carry to Right 45°.
    const theta0 = THREE.MathUtils.degToRad(15);
    rig.camera.position.setFromSpherical(new THREE.Spherical(r, PHI_SEAT, theta0 - 0.1));
    rig.updateControls(1 / 60);
    await new Promise((resolve) => setTimeout(resolve, 20));
    rig.camera.position.setFromSpherical(new THREE.Spherical(r, PHI_SEAT, theta0));
    rig.updateControls(1 / 60);

    expect(rig.getNearestAnchor().kind).toBe('center');
    const anchor = await rig.snapToNearestAnchor(0);
    expect(anchor?.id).toBe('seat-0-right');
  });

  it('does not report a snap that was cancelled before completing', async () => {
    rig.setSeatCount(2);
    const r = rig.idealDistance('seat');
    rig.camera.position.setFromSpherical(new THREE.Spherical(r, PHI_SEAT, 0.35));

    const onSnapped = vi.fn();
    rig.onAnchorSnapped = onSnapped;

    const promise = rig.snapToNearestAnchor(10);
    rig.cancelSnap();

    expect(await promise).toBeNull();
    expect(onSnapped).not.toHaveBeenCalled();
    expect(rig.currentAnchor).toBeNull();
  });

  it('does not let a superseded snap overwrite the anchor set by focusSeat', async () => {
    rig.setSeatCount(2);
    const r = rig.idealDistance('seat');
    rig.camera.position.setFromSpherical(new THREE.Spherical(r, PHI_SEAT, 0.35));

    const snap = rig.snapToNearestAnchor(10);
    const focus = rig.focusSeat(1, 2, 0);

    expect(await snap).toBeNull();
    await focus;
    expect(rig.currentAnchor?.id).toBe('seat-1-center');
  });

  it('preserves the user zoom distance when snapping on desktop', async () => {
    rig.setSeatCount(2);
    const zoomedR = rig.idealDistance('seat') * 0.7;
    rig.camera.position.setFromSpherical(new THREE.Spherical(zoomedR, PHI_SEAT, 0.6));

    await rig.snapToNearestAnchor(0);

    const sph = new THREE.Spherical().setFromVector3(rig.camera.position.clone().sub(rig.controls.target));
    expect(sph.radius).toBeCloseTo(zoomedR, 3);
    expect(sph.theta).toBeCloseTo(ANCHOR_ANGLE_OFFSET, 3);
  });

  it('automatically rescales the board to ideal screen fit when snapping on mobile view', async () => {
    const docMock = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
    const mockDomElement = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      ownerDocument: docMock,
      getRootNode: vi.fn(() => docMock),
      style: {},
    } as unknown as HTMLElement;

    const mobileRig = new BoardCameraRig(
      { clientWidth: 390, clientHeight: 844 } as unknown as HTMLElement,
      mockDomElement,
    );
    mobileRig.setSeatCount(2);
    const offScaleR = mobileRig.idealDistance('seat') * 1.5;
    mobileRig.camera.position.setFromSpherical(new THREE.Spherical(offScaleR, PHI_SEAT, 0.6));

    await mobileRig.snapToNearestAnchor(0);

    const sph = new THREE.Spherical().setFromVector3(mobileRig.camera.position.clone().sub(mobileRig.controls.target));
    expect(sph.radius).toBeCloseTo(mobileRig.idealDistance('seat'), 2);
    mobileRig.dispose();
  });

  it('supports snapping to nearest anchor after switching to isometric view', async () => {
    rig.setSeatCount(2);
    await rig.setCameraPreset('iso', 0, 2, 0);

    const anchor = await rig.snapToNearestAnchor(0);
    expect(anchor).not.toBeNull();
    expect(anchor?.id).toBe('seat-0-right');
    expect(rig.currentAnchor).toEqual(anchor);
  });

  it('resolves the 90° gap between seats in 2-player mode to the closer side', () => {
    rig.setSeatCount(2);
    const r = rig.idealDistance('seat');

    rig.camera.position.setFromSpherical(new THREE.Spherical(r, PHI_SEAT, THREE.MathUtils.degToRad(80)));
    expect(rig.getNearestAnchor().id).toBe('seat-0-right');

    rig.camera.position.setFromSpherical(new THREE.Spherical(r, PHI_SEAT, THREE.MathUtils.degToRad(100)));
    expect(rig.getNearestAnchor().id).toBe('seat-1-left');
  });

  it('suppresses board rotation on mobile until drag exceeds increased threshold (28px)', () => {
    const elementListeners: Record<string, Function> = {};
    const windowListeners: Record<string, Function> = {};
    vi.stubGlobal('window', {
      addEventListener: vi.fn((event: string, handler: Function) => {
        windowListeners[event] = handler;
      }),
      removeEventListener: vi.fn(),
      devicePixelRatio: 1,
    });

    const docMock = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    const mockElement = {
      addEventListener: vi.fn((event: string, handler: Function) => {
        elementListeners[event] = handler;
      }),
      removeEventListener: vi.fn(),
      ownerDocument: docMock,
      getRootNode: vi.fn(() => docMock),
      clientWidth: 390,
      clientHeight: 844,
      style: {},
    } as unknown as HTMLElement;

    const mobileRig = new BoardCameraRig(mockElement, mockElement);

    // Initial state: rotation is enabled
    expect(mobileRig.controls.enableRotate).toBe(true);

    // Touch down on mobile
    elementListeners['pointerdown']({
      pointerType: 'touch',
      pointerId: 1,
      clientX: 100,
      clientY: 100,
    });

    // Rotation is suppressed during touch down on mobile
    expect(mobileRig.controls.enableRotate).toBe(false);

    // Move below threshold (20px < 28px)
    windowListeners['pointermove']({
      pointerType: 'touch',
      pointerId: 1,
      clientX: 120,
      clientY: 100,
    });

    // Rotation remains suppressed
    expect(mobileRig.controls.enableRotate).toBe(false);

    // Move beyond threshold (30px >= 28px)
    windowListeners['pointermove']({
      pointerType: 'touch',
      pointerId: 1,
      clientX: 130,
      clientY: 100,
    });

    // Rotation is engaged
    expect(mobileRig.controls.enableRotate).toBe(true);

    // Touch up restores rotation
    windowListeners['pointerup']({
      pointerType: 'touch',
      pointerId: 1,
      clientX: 130,
      clientY: 100,
    });

    expect(mobileRig.controls.enableRotate).toBe(true);
    mobileRig.dispose();
  });
});
