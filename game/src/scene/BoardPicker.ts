import * as THREE from 'three';
import { N, type Wall } from '../game/rules';
import { HALF, PITCH, TILE_TOP } from './BoardGeometry';

export type Pick = { kind: 'cell'; r: number; c: number } | { kind: 'wall'; wall: Wall } | null;

export interface PawnTarget {
  group: THREE.Object3D;
}

/**
 * Handles screen coordinate raycasting against the board plane (cells & wall grooves)
 * and 3D pawn figurine models.
 */
export class BoardPicker {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private raycaster = new THREE.Raycaster();
  private pickPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -TILE_TOP);

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;
  }

  /** Converts a pointer position to a cell (tile centre zone) or a wall slot (grooves). */
  pick(clientX: number, clientY: number): Pick {
    const rect = this.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.pickPlane, hit)) return null;

    const fc = (hit.x + HALF) / PITCH;
    const fr = (hit.z + HALF) / PITCH;
    if (fr < -0.5 || fr > N - 0.5 || fc < -0.5 || fc > N - 0.5) return null;

    const rr = Math.round(fr);
    const rc = Math.round(fc);
    const dr = fr - rr;
    const dc = fc - rc;
    const clampW = (v: number) => Math.max(0, Math.min(N - 2, v));

    if (Math.max(Math.abs(dr), Math.abs(dc)) < 0.27) {
      return { kind: 'cell', r: rr, c: rc };
    }

    if (Math.abs(dr) >= Math.abs(dc)) {
      // Near a horizontal groove (between rows)
      const wr = dr > 0 ? rr : rr - 1;
      if (wr < 0 || wr > N - 2) return { kind: 'cell', r: rr, c: rc };
      return { kind: 'wall', wall: { r: wr, c: clampW(Math.round(fc - 0.5)), o: 'h' } };
    }

    const wc = dc > 0 ? rc : rc - 1;
    if (wc < 0 || wc > N - 2) return { kind: 'cell', r: rr, c: rc };
    return { kind: 'wall', wall: { r: clampW(Math.round(fr - 0.5)), c: wc, o: 'v' } };
  }

  /** Raycasts directly against animal figurine models to detect hovered pawn. */
  pickPawn(clientX: number, clientY: number, pawns: PawnTarget[], pawnGroups: THREE.Object3D[]): number | null {
    if (pawns.length === 0) return null;
    const rect = this.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(pawnGroups, true);
    if (hits.length > 0) {
      let obj: THREE.Object3D | null = hits[0].object;
      while (obj) {
        const idx = pawns.findIndex((p) => p.group === obj);
        if (idx !== -1) return idx;
        obj = obj.parent;
      }
    }
    return null;
  }

  /** Checks if the screen coordinates fall within the board platform area or canvas. */
  isOnBoard(clientX: number, clientY: number): boolean {
    const rect = this.domElement.getBoundingClientRect();
    if (
      rect.width > 0 &&
      rect.height > 0 &&
      (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom)
    ) {
      return false;
    }
    const ndc = new THREE.Vector2(
      rect.width > 0 ? ((clientX - rect.left) / rect.width) * 2 - 1 : 0,
      rect.height > 0 ? -((clientY - rect.top) / rect.height) * 2 + 1 : 0,
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.pickPlane, hit)) return false;

    const fc = (hit.x + HALF) / PITCH;
    const fr = (hit.z + HALF) / PITCH;
    return fr >= -1.0 && fr <= N && fc >= -1.0 && fc <= N;
  }
}
