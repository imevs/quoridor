import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  isMobileLandscape,
  getTargetViewOffset,
  applyViewOffset,
  calculateIdealDistance,
  MOBILE_LANDSCAPE_MAX_HEIGHT,
  MOBILE_LANDSCAPE_SEAT_DISTANCE,
  MOBILE_LANDSCAPE_ISO_DISTANCE,
  TOP_VIEW_BOARD_SPAN,
  CAMERA_FOV,
  MOBILE_LANDSCAPE_MEDIA_QUERY,
  syncMobileLandscapeAttribute,
} from '../CameraFraming';

describe('CameraFraming', () => {
  describe('isMobileLandscape', () => {
    it('returns true when height <= 550 and width / height >= 1.25', () => {
      expect(isMobileLandscape(800, 400)).toBe(true);
      expect(isMobileLandscape(700, 500)).toBe(true);
    });

    it('returns false for square, portrait, or tall viewports', () => {
      expect(isMobileLandscape(400, 800)).toBe(false);
      expect(isMobileLandscape(1000, 600)).toBe(false);
      expect(isMobileLandscape(500, 500)).toBe(false);
      expect(isMobileLandscape(600, MOBILE_LANDSCAPE_MAX_HEIGHT)).toBe(false); // 600/550 = 1.09 < 1.25
    });
  });

  describe('getTargetViewOffset', () => {
    it('returns x and y offsets for seat preset in mobile landscape', () => {
      const offset = getTargetViewOffset(800, 400, 'seat');
      expect(offset.x).toBeLessThan(0); // Offset to the left to give space for HUD
      expect(offset.y).toBeGreaterThan(0);
    });

    it('returns zero x offset and slight y offset for seat preset on desktop', () => {
      const offset = getTargetViewOffset(1200, 800, 'seat');
      expect(offset.x).toBe(0);
      expect(offset.y).toBeGreaterThan(0);
    });

    it('returns zero x offset and upward y offset for seat preset on square screens', () => {
      const offset = getTargetViewOffset(600, 600, 'seat');
      expect(offset.x).toBe(0);
      expect(offset.y).toBeGreaterThan(0);
    });

    it('returns (0, 0) for non-seat presets', () => {
      expect(getTargetViewOffset(800, 400, 'top')).toEqual({ x: 0, y: 0 });
      expect(getTargetViewOffset(800, 400, 'iso')).toEqual({ x: 0, y: 0 });
      expect(getTargetViewOffset(1200, 800, 'top')).toEqual({ x: 0, y: 0 });
    });
  });

  describe('applyViewOffset', () => {
    it('clears view offset when x and y are near zero', () => {
      const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100);
      camera.setViewOffset(800, 600, 20, 20, 800, 600);
      expect(camera.view?.enabled).toBe(true);

      applyViewOffset(camera, 800, 600, 0, 0);
      expect(camera.view?.enabled).toBe(false);
    });

    it('sets view offset when coordinates are non-zero', () => {
      const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100);
      applyViewOffset(camera, 800, 600, 25, 15);
      expect(camera.view?.enabled).toBe(true);
      expect(camera.view?.offsetX).toBe(25);
      expect(camera.view?.offsetY).toBe(15);
    });
  });

  describe('calculateIdealDistance', () => {
    it('returns dedicated distances in mobile landscape', () => {
      expect(calculateIdealDistance(2.0, true, 'seat')).toBe(MOBILE_LANDSCAPE_SEAT_DISTANCE);
      expect(calculateIdealDistance(2.0, true, 'iso')).toBe(MOBILE_LANDSCAPE_ISO_DISTANCE);

      const vFov = THREE.MathUtils.degToRad(CAMERA_FOV);
      const expectedTopDist = (TOP_VIEW_BOARD_SPAN / 2) / Math.tan(vFov / 2);
      expect(calculateIdealDistance(2.0, true, 'top')).toBeCloseTo(expectedTopDist, 3);
    });

    it('calculates aspect-ratio-scaled distances in normal orientation', () => {
      const distWide = calculateIdealDistance(1.6, false, 'seat');
      const distTall = calculateIdealDistance(0.8, false, 'seat');
      expect(distWide).toBeGreaterThanOrEqual(15);
      expect(distTall).toBeGreaterThanOrEqual(15);
    });

    it('increases camera distance on square screens to prevent UI overlap', () => {
      const distWide = calculateIdealDistance(1.6, false, 'seat');
      const distSquare = calculateIdealDistance(1.0, false, 'seat');
      expect(distSquare).toBeGreaterThan(distWide);
    });

    it('adds extra distance boost on narrow mobile landscape (aspect < 1.45)', () => {
      const distWideMobile = calculateIdealDistance(2.0, true, 'seat');
      const distNarrowMobile = calculateIdealDistance(1.15, true, 'seat');
      expect(distNarrowMobile).toBeGreaterThan(distWideMobile);
    });
  });

  describe('syncMobileLandscapeAttribute', () => {
    it('defines the correct media query matching the framing threshold', () => {
      expect(MOBILE_LANDSCAPE_MEDIA_QUERY).toBe(
        '(max-height: 550px) and (orientation: landscape) and (min-aspect-ratio: 5/4)',
      );
    });

    it('sets attribute when media query matches and removes it on change', () => {
      let listener: ((e: { matches: boolean }) => void) | null = null;
      let matchesState = true;

      const mockMql = {
        get matches() {
          return matchesState;
        },
        addEventListener: (_event: string, cb: (e: { matches: boolean }) => void) => {
          listener = cb;
        },
        removeEventListener: () => {
          listener = null;
        },
      };

      const globalObj = globalThis as unknown as { window?: { matchMedia?: unknown } };
      const originalWindow = globalObj.window;
      globalObj.window = {
        matchMedia: () => mockMql as unknown as MediaQueryList,
      };

      class MockElement {
        attrs = new Set<string>();
        setAttribute(name: string) {
          this.attrs.add(name);
        }
        removeAttribute(name: string) {
          this.attrs.delete(name);
        }
        hasAttribute(name: string) {
          return this.attrs.has(name);
        }
      }

      const dummyEl = new MockElement();
      const cleanup = syncMobileLandscapeAttribute(dummyEl as unknown as HTMLElement);
      expect(dummyEl.hasAttribute('data-mobile-landscape')).toBe(true);

      // Trigger change to false
      matchesState = false;
      if (listener) {
        (listener as (e: { matches: boolean }) => void)({ matches: false });
      }
      expect(dummyEl.hasAttribute('data-mobile-landscape')).toBe(false);

      cleanup();
      globalObj.window = originalWindow;
    });
  });
});
