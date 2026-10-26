import * as THREE from 'three';
import { ANIMALS, type AnimalId } from '../game/animals';
import { type Cell } from '../game/rules';
import { type Tweener, ease } from './tween';
import { sounds } from './sounds';
import { cellToWorld, PAWN_SCALE, TILE_TOP, SEAT_YAW_2, SEAT_YAW_4 } from './BoardGeometry';

export interface Pawn {
  group: THREE.Group; // positioned on the tile
  model: THREE.Object3D; // yaw + hop squash
  ring: THREE.Mesh;
  glow: THREE.Mesh;
  color: THREE.Color;
  restingYaw: number;
  animating: boolean;
}

/**
 * Manages animal figurine pawns, placement, hopping animations, celebration spins,
 * and active-turn rotation and glow effects.
 */
export class BoardPawns {
  private scene: THREE.Scene;
  private tween: Tweener;

  private animalTemplates = new Map<AnimalId, THREE.Object3D>();
  private pawns: Pawn[] = [];
  private pawnGroups: THREE.Group[] = [];
  private activeSeat = -1;
  private seatCount: 2 | 4 = 2;

  constructor(scene: THREE.Scene, tween: Tweener) {
    this.scene = scene;
    this.tween = tween;
  }

  get pawnList(): Pawn[] {
    return this.pawns;
  }

  get pawnGroupList(): THREE.Group[] {
    return this.pawnGroups;
  }

  get seats(): 2 | 4 {
    return this.seatCount;
  }

  init(animalTemplates: Map<AnimalId, THREE.Object3D>): void {
    this.animalTemplates = animalTemplates;
  }

  setupPlayers(animals: AnimalId[]): void {
    this.pawns.forEach((p) => p.group.removeFromParent());
    this.pawns = [];
    this.seatCount = animals.length === 4 ? 4 : 2;

    const ringGeo = new THREE.RingGeometry(0.4, 0.48, 48);
    const glowGeo = new THREE.CircleGeometry(0.62, 48);

    animals.forEach((id, seat) => {
      const tmpl = this.animalTemplates.get(id);
      const group = new THREE.Group();
      const model = tmpl ? tmpl.clone(true) : new THREE.Mesh(new THREE.SphereGeometry(0.4));
      model.scale.setScalar(PAWN_SCALE);
      const restingYaw = this.seatYaw(seat);
      model.rotation.y = restingYaw;

      const color = new THREE.Color(ANIMALS[id].color);
      const ring = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.006;

      const glow = new THREE.Mesh(
        glowGeo,
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      glow.rotation.x = -Math.PI / 2;
      glow.position.y = 0.004;

      group.add(glow, ring, model);
      this.scene.add(group);
      this.pawns.push({ group, model, ring, glow, color, restingYaw, animating: false });
    });

    this.pawnGroups = this.pawns.map((p) => p.group);
  }

  seatYaw(seat: number): number {
    return (this.seatCount === 4 ? SEAT_YAW_4 : SEAT_YAW_2)[seat] ?? 0;
  }

  syncPositions(players: Cell[]): void {
    players.forEach((p, i) => {
      const pawn = this.pawns[i];
      if (!pawn) return;
      pawn.group.position.copy(cellToWorld(p.r, p.c));
      pawn.restingYaw = this.seatYaw(i);
      pawn.animating = false;
      pawn.model.rotation.set(0, pawn.restingYaw, 0);
      pawn.model.position.set(0, 0, 0);
      pawn.model.scale.setScalar(PAWN_SCALE);
    });
  }

  setActiveSeat(seat: number): THREE.Color | null {
    this.activeSeat = seat;
    this.pawns.forEach((p, i) => {
      if (i !== seat) (p.glow.material as THREE.MeshBasicMaterial).opacity = 0;
    });
    return this.pawns[seat]?.color ?? null;
  }

  async animateMove(seat: number, to: Cell, onHopBurst?: (target: THREE.Vector3) => void): Promise<void> {
    const pawn = this.pawns[seat];
    if (!pawn) return;
    pawn.animating = true;
    const from = pawn.group.position.clone();
    const target = cellToWorld(to.r, to.c);
    const dir = target.clone().sub(from);
    const yawTo = Math.atan2(dir.x, dir.z);
    const yawFrom = pawn.model.rotation.y;
    let dYaw = yawTo - yawFrom;
    dYaw = Math.atan2(Math.sin(dYaw), Math.cos(dYaw));
    const dist = dir.length();
    const height = 0.45 + dist * 0.18;

    // Anticipation squash
    await this.tween.run(0.09, (k) => {
      pawn.model.scale.set(PAWN_SCALE * (1 + 0.08 * k), PAWN_SCALE * (1 - 0.14 * k), PAWN_SCALE * (1 + 0.08 * k));
      pawn.model.rotation.y = yawFrom + dYaw * k * 0.5;
    }, ease.outCubic);

    // Hop arc
    sounds.playHop();
    await this.tween.run(0.38 + dist * 0.05, (k) => {
      pawn.group.position.lerpVectors(from, target, k);
      pawn.model.position.y = Math.sin(Math.PI * k) * height;
      pawn.model.rotation.y = yawFrom + dYaw * (0.5 + 0.5 * k);
      const st = 1 + 0.1 * Math.sin(Math.PI * k);
      pawn.model.scale.set(PAWN_SCALE / Math.sqrt(st), PAWN_SCALE * st, PAWN_SCALE / Math.sqrt(st));
    }, ease.inOutCubic);

    if (onHopBurst) {
      onHopBurst(target.clone().setY(TILE_TOP + 0.05));
    }

    // Landing squash & settle
    await this.tween.run(0.22, (k) => {
      const s = Math.sin(Math.PI * k) * 0.16;
      pawn.model.scale.set(PAWN_SCALE * (1 + s * 0.5), PAWN_SCALE * (1 - s), PAWN_SCALE * (1 + s * 0.5));
      pawn.model.position.y = 0;
    }, ease.outCubic);

    pawn.model.scale.setScalar(PAWN_SCALE);
    pawn.restingYaw = yawTo;
    pawn.animating = false;
  }

  async celebrate(seat: number, onCelebrateBurst?: (base: THREE.Vector3) => void): Promise<void> {
    sounds.playWin();
    const pawn = this.pawns[seat];
    if (!pawn) return;
    pawn.animating = true;
    const base = pawn.group.position.clone();

    if (onCelebrateBurst) {
      onCelebrateBurst(base.clone().setY(1.2));
    }

    for (let i = 0; i < 3; i++) {
      const y0 = pawn.model.rotation.y;
      await this.tween.run(0.5, (k) => {
        pawn.model.position.y = Math.sin(Math.PI * k) * 0.9;
        pawn.model.rotation.y = y0 + Math.PI * 2 * k;
      }, ease.inOutCubic);
    }
    pawn.model.position.y = 0;
    pawn.animating = false;
  }

  tick(t: number, intendedTarget: THREE.Vector3 | null): void {
    const active = this.pawns[this.activeSeat];
    if (active) {
      (active.glow.material as THREE.MeshBasicMaterial).opacity = 0.35 + 0.25 * Math.sin(t * 4);
      active.glow.scale.setScalar(1 + 0.08 * Math.sin(t * 4));

      if (!active.animating) {
        let desiredYaw = active.restingYaw;
        if (intendedTarget) {
          const dir = intendedTarget.clone().sub(active.group.position);
          if (dir.lengthSq() > 0.002) {
            desiredYaw = Math.atan2(dir.x, dir.z);
          }
        }
        let dYaw = desiredYaw - active.model.rotation.y;
        dYaw = Math.atan2(Math.sin(dYaw), Math.cos(dYaw));
        if (Math.abs(dYaw) > 0.001) {
          active.model.rotation.y += dYaw * 0.22;
        } else {
          active.model.rotation.y = desiredYaw;
        }
      }
    }
  }
}
