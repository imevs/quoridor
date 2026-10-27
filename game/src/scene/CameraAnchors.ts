import * as THREE from 'three';

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

export const PHI_TOP = 0.01;
export const PHI_ISO = 0.75;
export const PHI_SEAT = 0.82;

export const SEAT_AZ_2 = [0, Math.PI];
export const SEAT_AZ_4 = [0, -Math.PI / 2, Math.PI, Math.PI / 2];

export const ANCHOR_ANGLE_OFFSET = Math.PI / 4; // 45 degrees for left/right perspectives
export const TOP_DOWN_THRESHOLD_PHI = 0.42; // Above this pitch angle (~24° from vertical), lock to player views

export const wrapAngle = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Generates discrete anchoring points for each player view:
 * 3 angles per seat (Left 45°, Center / Straight-on, Right 45°) plus Top-Down.
 */
export function getAnchors(seatCount: 2 | 4 = 2): CameraAnchor[] {
  const seatAzimuths = seatCount === 4 ? SEAT_AZ_4 : SEAT_AZ_2;
  const anchors: CameraAnchor[] = [];

  for (let seat = 0; seat < seatCount; seat++) {
    const az = seatAzimuths[seat] ?? 0;

    // 1. Left 45° perspective
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

    // 3. Right 45° perspective
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
 * Detects the nearest valid 3D board anchor point from the given camera spherical orientation.
 * If pitched up towards vertical (phi < 0.42), locks to the nearest Top-Down anchor.
 * Otherwise, locks to the nearest player perspective angle (Center, Left 45°, Right 45°).
 */
export function getNearestAnchor(sph: THREE.Spherical, seatCount: 2 | 4 = 2): CameraAnchor {
  const allAnchors = getAnchors(seatCount);

  // 1. Overhead view: snap to closest seat's Top-Down anchor
  if (sph.phi < TOP_DOWN_THRESHOLD_PHI) {
    const topAnchors = allAnchors.filter((a) => a.kind === 'top');
    let best = topAnchors[0] ?? allAnchors[0];
    let minDiff = Infinity;
    for (const a of topAnchors) {
      const diff = Math.abs(wrapAngle(a.theta - sph.theta));
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
    const diff = Math.abs(wrapAngle(a.theta - sph.theta));
    if (diff < minDiff) {
      minDiff = diff;
      best = a;
    }
  }

  return best;
}
