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

export const MOBILE_LANDSCAPE_MIN_ASPECT = 1.25;

export const MOBILE_LANDSCAPE_MEDIA_QUERY = `(max-height: ${MOBILE_LANDSCAPE_MAX_HEIGHT}px) and (orientation: landscape) and (min-aspect-ratio: 5/4)`;

/**
 * Synchronizes the `data-mobile-landscape` attribute on the target element
 * (defaulting to document.documentElement) with the mobile landscape media query.
 * Returns an unsubscribe cleanup function.
 */
export function syncMobileLandscapeAttribute(
  target: HTMLElement | null = typeof document !== 'undefined' ? document.documentElement : null,
): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function' || !target) {
    return () => {};
  }
  const mql = window.matchMedia(MOBILE_LANDSCAPE_MEDIA_QUERY);
  const update = () => {
    if (mql.matches) {
      target.setAttribute('data-mobile-landscape', '');
    } else {
      target.removeAttribute('data-mobile-landscape');
    }
  };
  update();
  mql.addEventListener('change', update);
  return () => {
    mql.removeEventListener('change', update);
  };
}

/** Whether the given viewport dimensions correspond to mobile landscape (compact vertical height with widescreen aspect ratio). */
export function isMobileLandscape(width: number, height: number): boolean {
  return height <= MOBILE_LANDSCAPE_MAX_HEIGHT && width / height >= MOBILE_LANDSCAPE_MIN_ASPECT;
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
  const aspect = width / height;
  if (isMobileLandscape(width, height)) {
    if (preset === 'seat') {
      const offsetY = Math.round(height * MOBILE_LANDSCAPE_OFFSET_Y_RATIO);
      const offsetX = -Math.round(
        Math.min(MOBILE_LANDSCAPE_OFFSET_X_MAX, Math.max(MOBILE_LANDSCAPE_OFFSET_X_MIN, width * MOBILE_LANDSCAPE_OFFSET_X_RATIO)),
      );
      return { x: offsetX, y: offsetY };
    }
  } else if (aspect >= 0.8 && aspect <= 1.35) {
    // On square or near-square screens, offset view upward so board clears bottom player cards
    if (preset === 'seat') {
      const offsetY = Math.round(Math.min(42, Math.max(20, height * 0.06)));
      return { x: 0, y: offsetY };
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
    const baseDist =
      preset === 'seat'
        ? MOBILE_LANDSCAPE_SEAT_DISTANCE
        : preset === 'top'
          ? (TOP_VIEW_BOARD_SPAN / 2) / Math.tan(vFov / 2)
          : MOBILE_LANDSCAPE_ISO_DISTANCE;

    // On narrow landscape / near-square mobile view (aspect < 1.45), widen distance so board clears side UI
    if (aspect < 1.45) {
      const boost = 1 + (1.45 - aspect) * 0.45;
      return baseDist * boost;
    }
    return baseDist;
  }
  const boardSpan = DEFAULT_BOARD_SPAN;
  const distV = boardSpan / 2 / Math.tan(vFov / 2);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  const distH = boardSpan / 2 / Math.tan(hFov / 2);

  // For square or near-square aspect ratios (e.g. 0.8 to 1.35),
  // UI overlays at top and bottom occupy both axes simultaneously.
  // Add safe-area clearance so the board fits cleanly inside the unoccluded center.
  let scale = aspect >= 1.0 ? 1.05 : 0.94;
  if (aspect >= 0.8 && aspect <= 1.35) {
    const squareFactor = Math.max(0, 1 - Math.abs(aspect - 1.0) / 0.35);
    scale = 1.05 + 0.28 * squareFactor;
  }

  return Math.max(distV * scale, distH * scale, 15);
}
