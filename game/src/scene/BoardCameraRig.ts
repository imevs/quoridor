import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Tweener, ease, type Ease } from './tween';
import { sounds } from './sounds';
import {
  type CameraPreset,
  type CameraAnchor,
  getAnchors,
  getNearestAnchor,
  wrapAngle,
  SEAT_AZ_2,
  SEAT_AZ_4,
  PHI_SEAT,
  PHI_ISO,
  PHI_TOP,
} from './CameraAnchors';
import {
  CAMERA_FOV,
  CAMERA_NEAR,
  CAMERA_FAR,
  CONTROLS_DAMPING,
  CONTROLS_MIN_DISTANCE,
  CONTROLS_MIN_POLAR_ANGLE,
  CONTROLS_MAX_POLAR_ANGLE,
  isMobileLandscape,
  isMobileView,
  getTargetViewOffset,
  applyViewOffset,
  calculateIdealDistance,
} from './CameraFraming';
import {
  CameraSnapSpring,
  SNAP_DURATION,
  SNAP_FLING_LOOKAHEAD,
  SNAP_MAX_VELOCITY,
  DRAG_THRESHOLD_MOUSE,
  DRAG_THRESHOLD_TOUCH,
} from './CameraSnapSpring';

// Re-export all types, constants, and utilities for backward compatibility
export * from './CameraAnchors';
export * from './CameraFraming';
export * from './CameraSnapSpring';

/**
 * Coordinates the 3D camera, OrbitControls, preset perspectives, smooth view offsets,
 * pointer drag gestures, and discrete anchor snapping.
 */
export class BoardCameraRig {
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;

  private container: HTMLElement;
  private domElement: HTMLElement;
  private cameraTween = new Tweener();
  private snapSpring = new CameraSnapSpring();
  private activePreset: CameraPreset = 'seat';
  private seatCount: 2 | 4 = 2;
  private activeAnchor: CameraAnchor | null = null;
  /** Incremented whenever a camera animation starts or is cancelled; used to detect superseded tweens. */
  private animGen = 0;
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
    return isMobileLandscape(this.container.clientWidth, this.container.clientHeight);
  }

  /** Whether the current viewport is mobile (compact portrait or landscape). */
  isMobileView(): boolean {
    return isMobileView(this.container.clientWidth, this.container.clientHeight);
  }

  /**
   * Generates discrete anchoring points for each player view:
   * 3 angles per seat (Left 45°, Center / Straight-on, Right 45°) plus Top-Down.
   */
  getAnchors(seatCount: 2 | 4 = this.seatCount): CameraAnchor[] {
    return getAnchors(seatCount);
  }

  /**
   * Detects the nearest valid 3D board anchor point from the given (default: current) camera orientation.
   */
  getNearestAnchor(sph: THREE.Spherical = this.currentSpherical()): CameraAnchor {
    return getNearestAnchor(sph, this.seatCount);
  }

  /**
   * Snaps the camera to the nearest allowed board anchor using a critically damped spring seeded
   * with the drag's release velocity, so motion stays continuous (no stop-and-restart). The anchor
   * is picked from a short velocity lookahead so a flick carries over to the next anchor.
   * On mobile view, adjusts distance so the board automatically rescales to the ideal fit for the screen.
   */
  async snapToNearestAnchor(duration = SNAP_DURATION): Promise<CameraAnchor | null> {
    this.snapSpring.discardControlsInertia(this.camera, this.controls);

    const sph = this.currentSpherical();
    const clampV = (v: number) => THREE.MathUtils.clamp(v, -SNAP_MAX_VELOCITY, SNAP_MAX_VELOCITY);
    const vTheta = clampV(this.snapSpring.velTheta);
    const vPhi = clampV(this.snapSpring.velPhi);

    const projected = sph.clone();
    projected.theta += vTheta * SNAP_FLING_LOOKAHEAD;
    projected.phi += vPhi * SNAP_FLING_LOOKAHEAD;
    const anchor = this.getNearestAnchor(projected);
    this.activePreset = anchor.preset;

    const toRadius = this.isMobileView() ? this.idealDistance(anchor.preset) : sph.radius;
    const dTheta = wrapAngle(anchor.theta - sph.theta);
    const dPhi = anchor.phi - sph.phi;
    const dRadius = toRadius - sph.radius;

    // Negligible difference; skip animation and record active anchor
    if (Math.abs(dTheta) < 0.005 && Math.abs(dPhi) < 0.005 && Math.abs(dRadius) < 0.05) {
      this.activeAnchor = anchor;
      this.onAnchorSnapped?.(anchor);
      return anchor;
    }

    this.activeAnchor = null;
    let completed: boolean;
    if (duration <= 0) {
      completed = await this.animateCameraSpherical(anchor.theta, anchor.phi, toRadius, 0);
    } else {
      // Supersede any running tween/snap, then hand control to the per-frame spring.
      this.animGen++;
      this.cameraTween.clear();
      this.snapSpring.stop();
      const view = this.camera.view;
      const startOffset = {
        x: view && view.enabled ? view.offsetX : 0,
        y: view && view.enabled ? view.offsetY : 0,
      };
      const toOffset = this.getTargetViewOffset(anchor.preset);
      completed = await this.snapSpring.startSnap({
        startSph: sph,
        dTheta,
        toPhi: anchor.phi,
        toRadius,
        startOffset,
        toOffset,
        duration,
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
    this.snapSpring.stop();
  }

  private currentSpherical(): THREE.Spherical {
    return new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target));
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
      case 'iso': {
        this.activeAnchor = null;
        const completed = await this.animateCameraSpherical(Math.PI / 4, PHI_ISO, this.idealDistance('iso'), duration);
        if (completed) {
          this.activeAnchor = this.getNearestAnchor(new THREE.Spherical(this.idealDistance('iso'), PHI_ISO, Math.PI / 4));
        }
        break;
      }
      case 'seat':
      default:
        await this.focusSeat(seat, seatCount, duration);
        break;
    }
  }

  getTargetViewOffset(preset: CameraPreset = this.activePreset): { x: number; y: number } {
    return getTargetViewOffset(this.container.clientWidth, this.container.clientHeight, preset);
  }

  applyViewOffset(x: number, y: number): void {
    applyViewOffset(this.camera, this.container.clientWidth, this.container.clientHeight, x, y);
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
    this.snapSpring.stop();
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
    return calculateIdealDistance(this.camera.aspect, this.isMobileLandscape(), preset);
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
    this.snapSpring.tick(frameDt, this.camera, this.controls.target, (x, y) => this.applyViewOffset(x, y));
    this.controls.update();
    this.snapSpring.sampleVelocity(this.currentSpherical(), now);
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

    if (e.pointerType === 'touch' || this.isMobileView()) {
      if (this.controls) this.controls.enableRotate = false;
    }

    // Stop any active camera tweens immediately so user drag has zero latency/jitter
    this.cancelSnap();
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.isPointerDown) return;
    if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;

    if (!this.hasDragged) {
      const isMobile = e.pointerType === 'touch' || this.isMobileView();
      const threshold = isMobile ? DRAG_THRESHOLD_TOUCH : DRAG_THRESHOLD_MOUSE;
      const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
      if (dist >= threshold) {
        this.hasDragged = true;
        if (this.controls) this.controls.enableRotate = true;
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
    if (this.controls) this.controls.enableRotate = true;

    if (hadDragged) {
      void this.snapToNearestAnchor();
    }
  }

  private onPointerCancel(e: PointerEvent): void {
    if (this.controls) this.controls.enableRotate = true;
    this.onPointerUp(e);
  }
}
