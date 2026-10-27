import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Tweener, ease, type Ease } from './tween';
import { sounds } from './sounds';

export type CameraPreset = 'seat' | 'top' | 'iso';
export type AnchorAngleKind = 'center' | 'left' | 'right' | 'top';

export interface CameraAnchor {
  id: string;
  preset: CameraPreset;
  seat: number;
  kind: AnchorAngleKind;
  theta: number;
  phi: number;
  name: string;
}

/** Camera & viewport framing constants. */
export const MOBILE_LANDSCAPE_MAX_HEIGHT = 550;
export const DESKTOP_MIN_WIDTH = 760;
export const DESKTOP_MIN_HEIGHT = 450;

export const CAMERA_FOV = 32;
export const CAMERA_NEAR = 0.1;
export const CAMERA_FAR = 200;
export const CONTROLS_MIN_DISTANCE = 8;
export const CONTROLS_MIN_POLAR_ANGLE = 0.01;
export const CONTROLS_MAX_POLAR_ANGLE = 1.22;
export const CONTROLS_DAMPING = 0.08;

export const PHI_TOP = 0.01;
export const PHI_ISO = 0.75;
export const PHI_SEAT = 0.82;

export const DEFAULT_BOARD_SPAN = 13.4;
export const TOP_VIEW_BOARD_SPAN = 12.8;
export const MOBILE_LANDSCAPE_SEAT_DISTANCE = 16.5;
export const MOBILE_LANDSCAPE_ISO_DISTANCE = 18.5;

export const MOBILE_LANDSCAPE_OFFSET_Y_RATIO = 0.11;
export const MOBILE_LANDSCAPE_OFFSET_X_RATIO = 0.035;
export const MOBILE_LANDSCAPE_OFFSET_X_MIN = 16;
export const MOBILE_LANDSCAPE_OFFSET_X_MAX = 36;
export const DESKTOP_OFFSET_Y_RATIO = 0.04;
export const DESKTOP_OFFSET_Y_MAX = 32;

export const SEAT_AZ_2 = [0, Math.PI];
export const SEAT_AZ_4 = [0, -Math.PI / 2, Math.PI, Math.PI / 2];

export const ANCHOR_ANGLE_OFFSET = Math.PI / 4; // 45 degrees for left/right perspectives
/** Approximate time (s) for the release snap to visually settle. */
export const SNAP_DURATION = 0.6;
/** How far ahead (s) the release velocity is projected when choosing the anchor, so flicks carry over. */
export const SNAP_FLING_LOOKAHEAD = 0.12;
/** Upper bound on the angular release velocity (rad/s) carried into the snap. */
export const SNAP_MAX_VELOCITY = 6;
export const DRAG_THRESHOLD_MOUSE = 8;
export const DRAG_THRESHOLD_TOUCH = 14;
export const TOP_DOWN_THRESHOLD_PHI = 0.42; // Above this pitch angle (~24° from vertical), lock to player views

/**
 * Critically damped spring step (Game Programming Gems 4, "SmoothDamp").
 * Returns the new value and velocity; velocity stays continuous across calls.
 */
function smoothDamp(current: number, target: number, velocity: number, smoothTime: number, dt: number): [number, number] {
  const omega = 2 / Math.max(1e-4, smoothTime);
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = current - target;
  const temp = (velocity + omega * change) * dt;
  return [target + (change + temp) * exp, (velocity - omega * temp) * exp];
}

const wrapAngle = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

interface SnapMotion {
  theta: number;
  phi: number;
  offX: number;
  offY: number;
  vTheta: number;
  vPhi: number;
  vOffX: number;
  vOffY: number;
  toTheta: number;
  toPhi: number;
  toOffX: number;
  toOffY: number;
  radius: number;
  smoothTime: number;
  elapsed: number;
  resolve: (completed: boolean) => void;
}

/**
 * Manages the camera, OrbitControls, preset perspectives, smooth view-offset transitions,
 * and anchoring positions after dragging the 3D board.
 */
export class BoardCameraRig {
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;

  private container: HTMLElement;
  private domElement: HTMLElement;
  private cameraTween = new Tweener();
  private activePreset: CameraPreset = 'seat';
  private seatCount: 2 | 4 = 2;
  private activeAnchor: CameraAnchor | null = null;
  /** Incremented whenever a camera animation starts or is cancelled; used to detect superseded tweens. */
  private animGen = 0;
  private snapMotion: SnapMotion | null = null;
  /** Smoothed angular velocity of the camera (rad/s), sampled every frame. */
  private velTheta = 0;
  private velPhi = 0;
  private lastSample: { theta: number; phi: number; t: number } | null = null;
  private lastFrameTime: number | null = null;

  private isPointerDown = false;
  private hasDragged = false;
  private pointerDownPos = { x: 0, y: 0 };
  private activePointerId: number | null = null;
  private abort = new AbortController();

  onAnchorSnapped?: (anchor: CameraAnchor) => void;

  constructor(container: HTMLElement, domElement: HTMLElement, _tween?: Tweener) {
    this.container = container;
    this.domElement = domElement;

    this.camera = new THREE.PerspectiveCamera(
      CAMERA_FOV,
      container.clientWidth / container.clientHeight,
      CAMERA_NEAR,
      CAMERA_FAR,
    );
    this.camera.position.set(0, 15, 15);

    this.controls = new OrbitControls(this.camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = CONTROLS_DAMPING;
    this.controls.enablePan = false;
    this.controls.minDistance = CONTROLS_MIN_DISTANCE;
    this.controls.maxDistance = Math.max(50, this.idealDistance() * 1.45);
    this.controls.minPolarAngle = CONTROLS_MIN_POLAR_ANGLE;
    this.controls.maxPolarAngle = CONTROLS_MAX_POLAR_ANGLE;
    this.controls.target.set(0, 0, 0);

    this.bindEvents();
    this.updateProjection();
    this.fitCamera();
  }

  get preset(): CameraPreset {
    return this.activePreset;
  }

  get currentAnchor(): CameraAnchor | null {
    return this.activeAnchor;
  }

  get currentSeatCount(): 2 | 4 {
    return this.seatCount;
  }

  setSeatCount(seats: 2 | 4): void {
    this.seatCount = seats;
  }

  /** Whether the current viewport is mobile landscape (compact vertical height). */
  isMobileLandscape(): boolean {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    return h <= MOBILE_LANDSCAPE_MAX_HEIGHT && w > h;
  }

  /**
   * Generates discrete anchoring points for each player view:
   * 3 angles per seat (Left 30°, Center / Straight-on, Right 30°) plus Top-Down.
   */
  getAnchors(seatCount: 2 | 4 = this.seatCount): CameraAnchor[] {
    const seatAzimuths = seatCount === 4 ? SEAT_AZ_4 : SEAT_AZ_2;
    const anchors: CameraAnchor[] = [];

    for (let seat = 0; seat < seatCount; seat++) {
      const az = seatAzimuths[seat] ?? 0;

      // 1. Left 30° perspective
      anchors.push({
        id: `seat-${seat}-left`,
        preset: 'seat',
        seat,
        kind: 'left',
        theta: az - ANCHOR_ANGLE_OFFSET,
        phi: PHI_SEAT,
        name: `Seat ${seat + 1} (Left 30°)`,
      });

      // 2. Straight-on / Center perspective
      anchors.push({
        id: `seat-${seat}-center`,
        preset: 'seat',
        seat,
        kind: 'center',
        theta: az,
        phi: PHI_SEAT,
        name: `Seat ${seat + 1} (Center)`,
      });

      // 3. Right 30° perspective
      anchors.push({
        id: `seat-${seat}-right`,
        preset: 'seat',
        seat,
        kind: 'right',
        theta: az + ANCHOR_ANGLE_OFFSET,
        phi: PHI_SEAT,
        name: `Seat ${seat + 1} (Right 30°)`,
      });

      // 4. Top-Down perspective aligned with this player view
      anchors.push({
        id: `seat-${seat}-top`,
        preset: 'top',
        seat,
        kind: 'top',
        theta: az,
        phi: PHI_TOP,
        name: `Seat ${seat + 1} (Top-Down)`,
      });
    }

    return anchors;
  }

  /**
   * Detects the nearest valid 3D board anchor point from the given (default: current) camera orientation.
   * If pitched up towards vertical (phi < 0.42), locks to the nearest Top-Down anchor.
   * Otherwise, locks to the nearest player perspective angle (Center, Left 45°, Right 45°).
   */
  getNearestAnchor(sph: THREE.Spherical = this.currentSpherical()): CameraAnchor {
    const allAnchors = this.getAnchors();

    // 1. Overhead view: snap to closest seat's Top-Down anchor
    if (sph.phi < TOP_DOWN_THRESHOLD_PHI) {
      const topAnchors = allAnchors.filter((a) => a.kind === 'top');
      let best = topAnchors[0] ?? allAnchors[0];
      let minDiff = Infinity;
      for (const a of topAnchors) {
        const diff = Math.abs(Math.atan2(Math.sin(a.theta - sph.theta), Math.cos(a.theta - sph.theta)));
        if (diff < minDiff) {
          minDiff = diff;
          best = a;
        }
      }
      return best;
    }

    // 2. Player view height: snap to closest player perspective angle. Anchors are 45° apart
    //    (with 4 seats, neighbouring seats share their ±45° anchors), so adjustment is at most 22.5°.
    const seatAnchors = allAnchors.filter((a) => a.kind !== 'top');
    let best = seatAnchors[0] ?? allAnchors[0];
    let minDiff = Infinity;

    for (const a of seatAnchors) {
      const diff = Math.abs(Math.atan2(Math.sin(a.theta - sph.theta), Math.cos(a.theta - sph.theta)));
      if (diff < minDiff) {
        minDiff = diff;
        best = a;
      }
    }

    return best;
  }

  /**
   * Snaps the camera to the nearest allowed board anchor using a critically damped spring seeded
   * with the drag's release velocity, so motion stays continuous (no stop-and-restart). The anchor
   * is picked from a short velocity lookahead so a flick carries over to the next anchor.
   * Preserves the current zoom distance. Iso is a free-orbit preset and is never snapped.
   * `duration` is the approximate settle time; `<= 0` jumps instantly.
   * Resolves to `null` when skipped (iso) or when the snap was cancelled before completing.
   */
  async snapToNearestAnchor(duration = SNAP_DURATION): Promise<CameraAnchor | null> {
    if (this.activePreset === 'iso') return null;

    this.discardControlsInertia();

    const sph = this.currentSpherical();
    const clampV = (v: number) => THREE.MathUtils.clamp(v, -SNAP_MAX_VELOCITY, SNAP_MAX_VELOCITY);
    const vTheta = clampV(this.velTheta);
    const vPhi = clampV(this.velPhi);

    const projected = sph.clone();
    projected.theta += vTheta * SNAP_FLING_LOOKAHEAD;
    projected.phi += vPhi * SNAP_FLING_LOOKAHEAD;
    const anchor = this.getNearestAnchor(projected);
    this.activePreset = anchor.preset;

    const dTheta = wrapAngle(anchor.theta - sph.theta);
    const dPhi = anchor.phi - sph.phi;

    // Negligible difference; skip animation and record active anchor
    if (Math.abs(dTheta) < 0.005 && Math.abs(dPhi) < 0.005) {
      this.activeAnchor = anchor;
      this.onAnchorSnapped?.(anchor);
      return anchor;
    }

    this.activeAnchor = null;
    let completed: boolean;
    if (duration <= 0) {
      completed = await this.animateCameraSpherical(anchor.theta, anchor.phi, sph.radius, 0);
    } else {
      // Supersede any running tween/snap, then hand control to the per-frame spring.
      this.animGen++;
      this.cameraTween.clear();
      this.stopSnapMotion();
      const view = this.camera.view;
      const toOffset = this.getTargetViewOffset(anchor.preset);
      completed = await new Promise<boolean>((resolve) => {
        this.snapMotion = {
          // Target expressed relative to the start so the spring never takes the long way round.
          theta: sph.theta,
          phi: sph.phi,
          offX: view && view.enabled ? view.offsetX : 0,
          offY: view && view.enabled ? view.offsetY : 0,
          vTheta,
          vPhi,
          vOffX: 0,
          vOffY: 0,
          toTheta: sph.theta + dTheta,
          toPhi: anchor.phi,
          toOffX: toOffset.x,
          toOffY: toOffset.y,
          radius: sph.radius,
          // A critically damped spring is ~98% settled after ~3 smooth-times.
          smoothTime: duration / 3,
          elapsed: 0,
          resolve,
        };
      });
    }
    if (!completed) return null;
    this.activeAnchor = anchor;
    this.onAnchorSnapped?.(anchor);
    return anchor;
  }

  /** Cancels any active camera animation so manual drag immediately takes control. */
  cancelSnap(): void {
    this.animGen++;
    this.cameraTween.clear();
    this.stopSnapMotion();
  }

  private stopSnapMotion(): void {
    const motion = this.snapMotion;
    this.snapMotion = null;
    motion?.resolve(false);
  }

  /** Advances the release-snap spring by `dt` seconds. */
  private tickSnapMotion(dt: number): void {
    const m = this.snapMotion;
    if (!m || dt <= 0) return;
    m.elapsed += dt;
    [m.theta, m.vTheta] = smoothDamp(m.theta, m.toTheta, m.vTheta, m.smoothTime, dt);
    [m.phi, m.vPhi] = smoothDamp(m.phi, m.toPhi, m.vPhi, m.smoothTime, dt);
    [m.offX, m.vOffX] = smoothDamp(m.offX, m.toOffX, m.vOffX, m.smoothTime, dt);
    [m.offY, m.vOffY] = smoothDamp(m.offY, m.toOffY, m.vOffY, m.smoothTime, dt);

    const settled =
      (Math.abs(m.theta - m.toTheta) < 1e-4 &&
        Math.abs(m.phi - m.toPhi) < 1e-4 &&
        Math.abs(m.vTheta) < 1e-3 &&
        Math.abs(m.vPhi) < 1e-3 &&
        Math.abs(m.offX - m.toOffX) < 0.05 &&
        Math.abs(m.offY - m.toOffY) < 0.05) ||
      m.elapsed > m.smoothTime * 10;
    if (settled) {
      m.theta = m.toTheta;
      m.phi = m.toPhi;
      m.offX = m.toOffX;
      m.offY = m.toOffY;
    }

    const phi = THREE.MathUtils.clamp(m.phi, CONTROLS_MIN_POLAR_ANGLE, CONTROLS_MAX_POLAR_ANGLE);
    const sph = new THREE.Spherical(m.radius, phi, m.theta);
    this.camera.position.copy(this.controls.target).add(new THREE.Vector3().setFromSpherical(sph));
    this.camera.lookAt(this.controls.target);
    this.applyViewOffset(m.offX, m.offY);

    if (settled) {
      this.snapMotion = null;
      m.resolve(true);
    }
  }

  /**
   * Drops OrbitControls' residual damping inertia without moving the camera.
   * A non-damped update consumes the pending delta; restoring the position undoes its effect.
   */
  private discardControlsInertia(): void {
    const pos = this.camera.position.clone();
    this.controls.enableDamping = false;
    this.controls.update();
    this.controls.enableDamping = true;
    this.camera.position.copy(pos);
    this.camera.lookAt(this.controls.target);
    this.controls.update();
  }

  private currentSpherical(): THREE.Spherical {
    return new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target));
  }

  /** Tracks a smoothed angular velocity of the camera so release snaps can continue the motion. */
  private sampleVelocity(now: number): void {
    const sph = this.currentSpherical();
    const last = this.lastSample;
    if (last) {
      const dt = now - last.t;
      if (dt > 1e-4) {
        const vTheta = wrapAngle(sph.theta - last.theta) / dt;
        const vPhi = (sph.phi - last.phi) / dt;
        const k = Math.min(1, dt / 0.05);
        this.velTheta += (vTheta - this.velTheta) * k;
        this.velPhi += (vPhi - this.velPhi) * k;
      }
    }
    this.lastSample = { theta: sph.theta, phi: sph.phi, t: now };
  }

  /** Smoothly orbit the camera behind a seat. */
  async focusSeat(seat: number, seatCount: 2 | 4 = this.seatCount, duration = 1.0): Promise<void> {
    this.seatCount = seatCount;
    this.activePreset = 'seat';
    const az = (seatCount === 4 ? SEAT_AZ_4 : SEAT_AZ_2)[seat] ?? 0;
    this.activeAnchor = null;
    const completed = await this.animateCameraSpherical(az, PHI_SEAT, this.idealDistance('seat'), duration);
    if (completed) {
      this.activeAnchor = {
        id: `seat-${seat}-center`,
        preset: 'seat',
        seat,
        kind: 'center',
        theta: az,
        phi: PHI_SEAT,
        name: `Seat ${seat + 1} (Center)`,
      };
    }
  }

  /** Set spectator camera preset (seat POV, direct top-down, or isometric angle). */
  async setCameraPreset(preset: CameraPreset, seat = 0, seatCount: 2 | 4 = this.seatCount, duration = 0.8): Promise<void> {
    this.seatCount = seatCount;
    this.activePreset = preset;
    sounds.playWhoosh();
    switch (preset) {
      case 'top': {
        const az = (seatCount === 4 ? SEAT_AZ_4 : SEAT_AZ_2)[seat] ?? 0;
        this.activeAnchor = null;
        const completed = await this.animateCameraSpherical(az, PHI_TOP, this.idealDistance('top'), duration);
        if (completed) {
          this.activeAnchor = {
            id: `seat-${seat}-top`,
            preset: 'top',
            seat,
            kind: 'top',
            theta: az,
            phi: PHI_TOP,
            name: `Seat ${seat + 1} (Top-Down)`,
          };
        }
        break;
      }
      case 'iso':
        this.activeAnchor = null;
        await this.animateCameraSpherical(Math.PI / 4, PHI_ISO, this.idealDistance('iso'), duration);
        break;
      case 'seat':
      default:
        await this.focusSeat(seat, seatCount, duration);
        break;
    }
  }

  getTargetViewOffset(preset: CameraPreset = this.activePreset): { x: number; y: number } {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (this.isMobileLandscape()) {
      if (preset === 'seat') {
        const offsetY = Math.round(h * MOBILE_LANDSCAPE_OFFSET_Y_RATIO);
        const offsetX = -Math.round(
          Math.min(MOBILE_LANDSCAPE_OFFSET_X_MAX, Math.max(MOBILE_LANDSCAPE_OFFSET_X_MIN, w * MOBILE_LANDSCAPE_OFFSET_X_RATIO)),
        );
        return { x: offsetX, y: offsetY };
      }
    } else if (w > DESKTOP_MIN_WIDTH && h > DESKTOP_MIN_HEIGHT) {
      if (preset === 'seat') {
        const offsetY = Math.round(Math.min(DESKTOP_OFFSET_Y_MAX, h * DESKTOP_OFFSET_Y_RATIO));
        return { x: 0, y: offsetY };
      }
    }
    return { x: 0, y: 0 };
  }

  applyViewOffset(x: number, y: number): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (Math.abs(x) < 0.1 && Math.abs(y) < 0.1) {
      this.camera.clearViewOffset();
    } else {
      this.camera.setViewOffset(w, h, Math.round(x), Math.round(y), w, h);
    }
    this.camera.updateProjectionMatrix();
  }

  async animateCameraSpherical(
    toTheta: number,
    toPhi: number,
    toR: number,
    duration: number,
    easing: Ease = ease.inOutCubic,
  ): Promise<boolean> {
    // Bump the generation before clearing so any in-flight animation sees it was superseded.
    const gen = ++this.animGen;
    this.cameraTween.clear();
    this.stopSnapMotion();
    const offset = this.camera.position.clone().sub(this.controls.target);
    const sph = new THREE.Spherical().setFromVector3(offset);

    if (duration <= 0) {
      sph.theta = toTheta;
      sph.phi = toPhi;
      sph.radius = toR;
      this.camera.position.copy(this.controls.target).add(new THREE.Vector3().setFromSpherical(sph));
      this.camera.lookAt(this.controls.target);
      const toOffset = this.getTargetViewOffset(this.activePreset);
      this.applyViewOffset(toOffset.x, toOffset.y);
      this.controls.update();
      return true;
    }

    const fromTheta = sph.theta;
    let d = toTheta - fromTheta;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    const fromPhi = sph.phi;
    const fromR = sph.radius;

    const fromOffsetX = this.camera.view && this.camera.view.enabled ? this.camera.view.offsetX : 0;
    const fromOffsetY = this.camera.view && this.camera.view.enabled ? this.camera.view.offsetY : 0;
    const toOffset = this.getTargetViewOffset(this.activePreset);

    await this.cameraTween.run(
      duration,
      (k) => {
        sph.theta = fromTheta + d * k;
        sph.phi = fromPhi + (toPhi - fromPhi) * k;
        sph.radius = fromR + (toR - fromR) * k;
        this.camera.position.copy(this.controls.target).add(new THREE.Vector3().setFromSpherical(sph));
        this.camera.lookAt(this.controls.target);

        const curX = fromOffsetX + (toOffset.x - fromOffsetX) * k;
        const curY = fromOffsetY + (toOffset.y - fromOffsetY) * k;
        this.applyViewOffset(curX, curY);

        this.controls.update();
      },
      easing,
    );
    return gen === this.animGen;
  }

  idealDistance(preset: CameraPreset = this.activePreset): number {
    const aspect = this.camera.aspect;
    const vFov = THREE.MathUtils.degToRad(CAMERA_FOV);
    if (this.isMobileLandscape()) {
      if (preset === 'seat') {
        return MOBILE_LANDSCAPE_SEAT_DISTANCE;
      }
      if (preset === 'top') {
        return (TOP_VIEW_BOARD_SPAN / 2) / Math.tan(vFov / 2);
      }
      if (preset === 'iso') {
        return MOBILE_LANDSCAPE_ISO_DISTANCE;
      }
    }
    const boardSpan = DEFAULT_BOARD_SPAN;
    const distV = boardSpan / 2 / Math.tan(vFov / 2);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const distH = boardSpan / 2 / Math.tan(hFov / 2);
    const scale = aspect >= 1.0 ? 1.05 : 0.94;
    return Math.max(distV * scale, distH * scale, 15);
  }

  updateProjection(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    const target = this.getTargetViewOffset(this.activePreset);
    this.applyViewOffset(target.x, target.y);
  }

  fitCamera(preserveAngles = false): void {
    const r = this.idealDistance(this.activePreset);
    if (preserveAngles) {
      const offset = this.camera.position.clone().sub(this.controls.target);
      const sph = new THREE.Spherical().setFromVector3(offset);
      sph.radius = r;
      this.camera.position.copy(this.controls.target).add(new THREE.Vector3().setFromSpherical(sph));
    } else {
      const phi = this.activePreset === 'top' ? PHI_TOP : this.activePreset === 'iso' ? PHI_ISO : PHI_SEAT;
      const sph = new THREE.Spherical(r, phi, 0);
      this.camera.position.copy(this.controls.target).add(new THREE.Vector3().setFromSpherical(sph));
    }
    this.camera.lookAt(this.controls.target);
    const target = this.getTargetViewOffset(this.activePreset);
    this.applyViewOffset(target.x, target.y);
    this.controls.update();
  }

  onResize(): void {
    this.updateProjection();
    this.controls.maxDistance = Math.max(50, this.idealDistance(this.activePreset) * 1.45);
    this.fitCamera(true);
  }

  /**
   * Per-frame update: advances camera tweens / release-snap spring, then OrbitControls.
   * `dt` overrides the measured frame delta (seconds), mainly for tests.
   */
  updateControls(dt?: number): void {
    const now = performance.now() / 1000;
    const frameDt = dt ?? (this.lastFrameTime === null ? 0 : Math.min(now - this.lastFrameTime, 1 / 20));
    this.lastFrameTime = now;

    this.cameraTween.tick();
    this.tickSnapMotion(frameDt);
    this.controls.update();
    this.sampleVelocity(now);
  }

  dispose(): void {
    this.abort.abort();
    this.cancelSnap();
    this.controls.dispose();
  }

  private bindEvents(): void {
    const signal = this.abort.signal;

    this.domElement.addEventListener(
      'pointerdown',
      (e) => this.onPointerDown(e),
      { signal },
    );

    if (typeof window !== 'undefined') {
      window.addEventListener(
        'pointermove',
        (e) => this.onPointerMove(e),
        { signal },
      );
      window.addEventListener(
        'pointerup',
        (e) => this.onPointerUp(e),
        { signal },
      );
      window.addEventListener(
        'pointercancel',
        (e) => this.onPointerCancel(e),
        { signal },
      );
    }

    this.controls.addEventListener('end', () => {
      if (this.hasDragged) {
        this.hasDragged = false;
        this.isPointerDown = false;
        this.activePointerId = null;
        void this.snapToNearestAnchor();
      }
    });
  }

  private onPointerDown(e: PointerEvent): void {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    this.activePointerId = e.pointerId;
    this.isPointerDown = true;
    this.hasDragged = false;
    this.pointerDownPos = { x: e.clientX, y: e.clientY };

    // Stop any active camera tweens immediately so user drag has zero latency/jitter
    this.cancelSnap();
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.isPointerDown) return;
    if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;

    if (!this.hasDragged) {
      const threshold = e.pointerType === 'touch' ? DRAG_THRESHOLD_TOUCH : DRAG_THRESHOLD_MOUSE;
      const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
      if (dist >= threshold) {
        this.hasDragged = true;
      }
    }
  }

  private onPointerUp(e: PointerEvent): void {
    if (!this.isPointerDown) return;
    if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;

    const hadDragged = this.hasDragged;
    this.isPointerDown = false;
    this.hasDragged = false;
    this.activePointerId = null;

    if (hadDragged) {
      void this.snapToNearestAnchor();
    }
  }

  private onPointerCancel(e: PointerEvent): void {
    this.onPointerUp(e);
  }
}
