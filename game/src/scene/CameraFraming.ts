import * as THREE from 'three';
import type { CameraPreset } from './CameraAnchors';

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

/** Whether the given viewport dimensions correspond to mobile landscape (compact vertical height). */
export function isMobileLandscape(width: number, height: number): boolean {
  return height <= MOBILE_LANDSCAPE_MAX_HEIGHT && width > height;
}

/** Whether the given viewport dimensions correspond to a mobile screen (portrait or landscape). */
export function isMobileView(width: number, height: number): boolean {
  return width <= 768 || height <= MOBILE_LANDSCAPE_MAX_HEIGHT;
}

/** Calculates the desired 2D camera viewport offset (px) for the active perspective preset and screen size. */
export function getTargetViewOffset(
  width: number,
  height: number,
  preset: CameraPreset,
): { x: number; y: number } {
  if (isMobileLandscape(width, height)) {
    if (preset === 'seat') {
      const offsetY = Math.round(height * MOBILE_LANDSCAPE_OFFSET_Y_RATIO);
      const offsetX = -Math.round(
        Math.min(MOBILE_LANDSCAPE_OFFSET_X_MAX, Math.max(MOBILE_LANDSCAPE_OFFSET_X_MIN, width * MOBILE_LANDSCAPE_OFFSET_X_RATIO)),
      );
      return { x: offsetX, y: offsetY };
    }
  } else if (width > DESKTOP_MIN_WIDTH && height > DESKTOP_MIN_HEIGHT) {
    if (preset === 'seat') {
      const offsetY = Math.round(Math.min(DESKTOP_OFFSET_Y_MAX, height * DESKTOP_OFFSET_Y_RATIO));
      return { x: 0, y: offsetY };
    }
  }
  return { x: 0, y: 0 };
}

/** Applies a pixel-based view offset to the camera projection matrix. */
export function applyViewOffset(
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number,
  x: number,
  y: number,
): void {
  if (Math.abs(x) < 0.1 && Math.abs(y) < 0.1) {
    camera.clearViewOffset();
  } else {
    camera.setViewOffset(width, height, Math.round(x), Math.round(y), width, height);
  }
  camera.updateProjectionMatrix();
}

/** Computes the ideal camera orbital distance based on field of view, aspect ratio, and perspective preset. */
export function calculateIdealDistance(
  aspect: number,
  isMobileLandscapeView: boolean,
  preset: CameraPreset,
): number {
  const vFov = THREE.MathUtils.degToRad(CAMERA_FOV);
  if (isMobileLandscapeView) {
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
