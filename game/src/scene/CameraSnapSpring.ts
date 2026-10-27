import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { wrapAngle } from './CameraAnchors';
import { CONTROLS_MIN_POLAR_ANGLE, CONTROLS_MAX_POLAR_ANGLE } from './CameraFraming';

/** Approximate time (s) for the release snap to visually settle. */
export const SNAP_DURATION = 0.6;
/** How far ahead (s) the release velocity is projected when choosing the anchor, so flicks carry over. */
export const SNAP_FLING_LOOKAHEAD = 0.12;
/** Upper bound on the angular release velocity (rad/s) carried into the snap. */
export const SNAP_MAX_VELOCITY = 6;
export const DRAG_THRESHOLD_MOUSE = 8;
export const DRAG_THRESHOLD_TOUCH = 14;

/**
 * Critically damped spring step (Game Programming Gems 4, "SmoothDamp").
 * Returns the new value and velocity; velocity stays continuous across calls.
 */
export function smoothDamp(
  current: number,
  target: number,
  velocity: number,
  smoothTime: number,
  dt: number,
): [number, number] {
  const omega = 2 / Math.max(1e-4, smoothTime);
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = current - target;
  const temp = (velocity + omega * change) * dt;
  return [target + (change + temp) * exp, (velocity - omega * temp) * exp];
}

export interface SnapMotion {
  theta: number;
  phi: number;
  radius: number;
  offX: number;
  offY: number;
  vTheta: number;
  vPhi: number;
  vRadius: number;
  vOffX: number;
  vOffY: number;
  toTheta: number;
  toPhi: number;
  toRadius: number;
  toOffX: number;
  toOffY: number;
  smoothTime: number;
  elapsed: number;
  resolve: (completed: boolean) => void;
}

export interface StartSnapParams {
  startSph: THREE.Spherical;
  dTheta: number;
  toPhi: number;
  toRadius?: number;
  startOffset: { x: number; y: number };
  toOffset: { x: number; y: number };
  duration: number;
}

/**
 * Manages release velocity sampling, OrbitControls damping inertia discard,
 * and critically damped spring animation towards target camera anchors.
 */
export class CameraSnapSpring {
  private motion: SnapMotion | null = null;
  velTheta = 0;
  velPhi = 0;
  private lastSample: { theta: number; phi: number; t: number } | null = null;

  get isSnapping(): boolean {
    return this.motion !== null;
  }

  get currentMotion(): SnapMotion | null {
    return this.motion;
  }

  /** Tracks a smoothed angular velocity of the camera so release snaps can continue the motion. */
  sampleVelocity(sph: THREE.Spherical, now: number): void {
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

  /**
   * Drops OrbitControls' residual damping inertia without moving the camera.
   * A non-damped update consumes the pending delta; restoring the position undoes its effect.
   */
  discardControlsInertia(camera: THREE.PerspectiveCamera, controls: OrbitControls): void {
    const pos = camera.position.clone();
    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = true;
    camera.position.copy(pos);
    camera.lookAt(controls.target);
    controls.update();
  }

  /** Starts a damped spring snap towards target spherical coordinates and view offset. */
  startSnap(params: StartSnapParams): Promise<boolean> {
    this.stop();

    const clampV = (v: number) => THREE.MathUtils.clamp(v, -SNAP_MAX_VELOCITY, SNAP_MAX_VELOCITY);
    const vTheta = clampV(this.velTheta);
    const vPhi = clampV(this.velPhi);

    return new Promise<boolean>((resolve) => {
      this.motion = {
        theta: params.startSph.theta,
        phi: params.startSph.phi,
        radius: params.startSph.radius,
        offX: params.startOffset.x,
        offY: params.startOffset.y,
        vTheta,
        vPhi,
        vRadius: 0,
        vOffX: 0,
        vOffY: 0,
        toTheta: params.startSph.theta + params.dTheta,
        toPhi: params.toPhi,
        toRadius: params.toRadius ?? params.startSph.radius,
        toOffX: params.toOffset.x,
        toOffY: params.toOffset.y,
        // A critically damped spring is ~98% settled after ~3 smooth-times.
        smoothTime: params.duration / 3,
        elapsed: 0,
        resolve,
      };
    });
  }

  /** Advances the release-snap spring by `dt` seconds and updates camera transform and offset. */
  tick(
    dt: number,
    camera: THREE.PerspectiveCamera,
    controlsTarget: THREE.Vector3,
    applyViewOffsetFn: (x: number, y: number) => void,
  ): void {
    const m = this.motion;
    if (!m || dt <= 0) return;
    m.elapsed += dt;
    [m.theta, m.vTheta] = smoothDamp(m.theta, m.toTheta, m.vTheta, m.smoothTime, dt);
    [m.phi, m.vPhi] = smoothDamp(m.phi, m.toPhi, m.vPhi, m.smoothTime, dt);
    [m.radius, m.vRadius] = smoothDamp(m.radius, m.toRadius, m.vRadius, m.smoothTime, dt);
    [m.offX, m.vOffX] = smoothDamp(m.offX, m.toOffX, m.vOffX, m.smoothTime, dt);
    [m.offY, m.vOffY] = smoothDamp(m.offY, m.toOffY, m.vOffY, m.smoothTime, dt);

    const settled =
      (Math.abs(m.theta - m.toTheta) < 1e-4 &&
        Math.abs(m.phi - m.toPhi) < 1e-4 &&
        Math.abs(m.radius - m.toRadius) < 1e-3 &&
        Math.abs(m.vTheta) < 1e-3 &&
        Math.abs(m.vPhi) < 1e-3 &&
        Math.abs(m.vRadius) < 1e-3 &&
        Math.abs(m.offX - m.toOffX) < 0.05 &&
        Math.abs(m.offY - m.toOffY) < 0.05) ||
      m.elapsed > m.smoothTime * 10;

    if (settled) {
      m.theta = m.toTheta;
      m.phi = m.toPhi;
      m.radius = m.toRadius;
      m.offX = m.toOffX;
      m.offY = m.toOffY;
    }

    const phi = THREE.MathUtils.clamp(m.phi, CONTROLS_MIN_POLAR_ANGLE, CONTROLS_MAX_POLAR_ANGLE);
    const sph = new THREE.Spherical(m.radius, phi, m.theta);
    camera.position.copy(controlsTarget).add(new THREE.Vector3().setFromSpherical(sph));
    camera.lookAt(controlsTarget);
    applyViewOffsetFn(m.offX, m.offY);

    if (settled) {
      this.motion = null;
      m.resolve(true);
    }
  }

  /** Cancels any active snap motion. */
  stop(): void {
    const motion = this.motion;
    this.motion = null;
    motion?.resolve(false);
  }
}
