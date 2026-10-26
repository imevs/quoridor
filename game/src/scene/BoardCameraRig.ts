import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Tweener } from './tween';
import { sounds } from './sounds';

export type CameraPreset = 'seat' | 'top' | 'iso';

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

/**
 * Manages the camera, OrbitControls, preset perspectives, and smooth view-offset transitions.
 */
export class BoardCameraRig {
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;

  private container: HTMLElement;
  private tween: Tweener;
  private activePreset: CameraPreset = 'seat';

  constructor(container: HTMLElement, domElement: HTMLElement, tween: Tweener) {
    this.container = container;
    this.tween = tween;

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

    this.updateProjection();
    this.fitCamera();
  }

  get preset(): CameraPreset {
    return this.activePreset;
  }

  /** Whether the current viewport is mobile landscape (compact vertical height). */
  isMobileLandscape(): boolean {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    return h <= MOBILE_LANDSCAPE_MAX_HEIGHT && w > h;
  }

  /** Smoothly orbit the camera behind a seat. */
  async focusSeat(seat: number, seatCount: 2 | 4, duration = 1.0): Promise<void> {
    this.activePreset = 'seat';
    const az = (seatCount === 4 ? SEAT_AZ_4 : SEAT_AZ_2)[seat] ?? 0;
    await this.animateCameraSpherical(az, PHI_SEAT, this.idealDistance('seat'), duration);
  }

  /** Set spectator camera preset (seat POV, direct top-down, or isometric angle). */
  async setCameraPreset(preset: CameraPreset, seat = 0, seatCount: 2 | 4 = 2, duration = 0.8): Promise<void> {
    this.activePreset = preset;
    sounds.playWhoosh();
    switch (preset) {
      case 'top':
        await this.animateCameraSpherical(0, PHI_TOP, this.idealDistance('top'), duration);
        break;
      case 'iso':
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

  async animateCameraSpherical(toTheta: number, toPhi: number, toR: number, duration: number): Promise<void> {
    const offset = this.camera.position.clone().sub(this.controls.target);
    const sph = new THREE.Spherical().setFromVector3(offset);
    const fromTheta = sph.theta;
    let d = toTheta - fromTheta;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    const fromPhi = sph.phi;
    const fromR = sph.radius;

    const fromOffsetX = this.camera.view && this.camera.view.enabled ? this.camera.view.offsetX : 0;
    const fromOffsetY = this.camera.view && this.camera.view.enabled ? this.camera.view.offsetY : 0;
    const toOffset = this.getTargetViewOffset(this.activePreset);

    await this.tween.run(duration, (k) => {
      sph.theta = fromTheta + d * k;
      sph.phi = fromPhi + (toPhi - fromPhi) * k;
      sph.radius = fromR + (toR - fromR) * k;
      this.camera.position.copy(this.controls.target).add(new THREE.Vector3().setFromSpherical(sph));

      const curX = fromOffsetX + (toOffset.x - fromOffsetX) * k;
      const curY = fromOffsetY + (toOffset.y - fromOffsetY) * k;
      this.applyViewOffset(curX, curY);
    });
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
    const target = this.getTargetViewOffset(this.activePreset);
    this.applyViewOffset(target.x, target.y);
  }

  onResize(): void {
    this.updateProjection();
    this.controls.maxDistance = Math.max(50, this.idealDistance(this.activePreset) * 1.45);
    this.fitCamera(true);
  }

  updateControls(): void {
    this.controls.update();
  }
}
