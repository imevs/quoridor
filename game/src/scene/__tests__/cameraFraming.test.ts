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
} from '../CameraFraming';

describe('CameraFraming', () => {
  describe('isMobileLandscape', () => {
    it('returns true when height <= 550 and width > height', () => {
      expect(isMobileLandscape(800, 400)).toBe(true);
      expect(isMobileLandscape(600, MOBILE_LANDSCAPE_MAX_HEIGHT)).toBe(true);
    });

    it('returns false for portrait orientations or tall heights', () => {
      expect(isMobileLandscape(400, 800)).toBe(false);
      expect(isMobileLandscape(1000, 600)).toBe(false);
      expect(isMobileLandscape(500, 500)).toBe(false);
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
  });
});
