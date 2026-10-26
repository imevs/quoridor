import * as THREE from 'three';
import { type Cell, type Wall, type Goal } from '../game/rules';
import { cellToWorld, wallToWorld, HALF, PITCH, TILE_TOP } from './BoardGeometry';

/**
 * Manages move option markers, ghost wall placement previews, and destination goal highlights.
 */
export class BoardOverlays {
  private scene: THREE.Scene;

  private ghost!: THREE.Object3D;
  private ghostMat!: THREE.MeshStandardMaterial;

  private markers: THREE.Group[] = [];
  private markerCells: Cell[] = [];
  private hoveredMarker = -1;
  private markerColor = new THREE.Color('#ffe6a8');

  private destGroup = new THREE.Group();
  private destPads: THREE.Mesh[] = [];
  private destBar!: THREE.Mesh;
  private destActive = false;
  private destPadMat!: THREE.MeshBasicMaterial;
  private destBarMat!: THREE.MeshBasicMaterial;

  private currentIntendedTarget: THREE.Vector3 | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  get intendedTarget(): THREE.Vector3 | null {
    return this.currentIntendedTarget;
  }

  /** Initializes overlay meshes after GLB assets have been loaded. */
  init(hedgeTemplate: THREE.Object3D): void {
    this.createGhost(hedgeTemplate);
    this.createMarkers();
    this.createDestinationMarkers();
  }

  setMarkerColor(color: THREE.Color): void {
    this.markerColor.copy(color);
  }

  private createGhost(hedgeTemplate: THREE.Object3D): void {
    this.ghostMat = new THREE.MeshStandardMaterial({
      color: 0x9cff8a,
      emissive: 0x2f8a2a,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    this.ghost = hedgeTemplate.clone(true);
    this.ghost.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.material = this.ghostMat;
        o.castShadow = false;
      }
    });
    this.ghost.visible = false;
    this.scene.add(this.ghost);
  }

  private createMarkers(): void {
    const ringGeo = new THREE.RingGeometry(0.3, 0.4, 48);
    const discGeo = new THREE.CircleGeometry(0.3, 48);
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group();
      const ring = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({ color: this.markerColor, transparent: true, opacity: 0.9, depthWrite: false }),
      );
      const disc = new THREE.Mesh(
        discGeo,
        new THREE.MeshBasicMaterial({ color: this.markerColor, transparent: true, opacity: 0.22, depthWrite: false }),
      );
      ring.rotation.x = disc.rotation.x = -Math.PI / 2;
      g.add(ring, disc);
      g.visible = false;
      g.renderOrder = 5;
      this.scene.add(g);
      this.markers.push(g);
    }
  }

  private createDestinationMarkers(): void {
    this.destPadMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const padGeo = new THREE.PlaneGeometry(0.85, 0.85);
    for (let i = 0; i < 9; i++) {
      const pad = new THREE.Mesh(padGeo, this.destPadMat);
      pad.rotation.x = -Math.PI / 2;
      pad.renderOrder = 4;
      this.destGroup.add(pad);
      this.destPads.push(pad);
    }

    this.destBarMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    const barGeo = new THREE.BoxGeometry(PITCH * 9 - 0.1, 0.05, 0.08);
    this.destBar = new THREE.Mesh(barGeo, this.destBarMat);
    this.destBar.renderOrder = 4;
    this.destGroup.add(this.destBar);

    this.destGroup.visible = false;
    this.scene.add(this.destGroup);
  }

  showMoveMarkers(cells: Cell[], hintCell: Cell | null = null): void {
    this.markerCells = cells;
    this.hoveredMarker = -1;
    this.currentIntendedTarget = null;
    this.markers.forEach((m, i) => {
      const cell = cells[i];
      m.visible = !!cell;
      if (cell) {
        m.position.copy(cellToWorld(cell.r, cell.c)).setY(TILE_TOP + 0.008);
        const isHint = !!hintCell && cell.r === hintCell.r && cell.c === hintCell.c;
        const color = isHint ? new THREE.Color(0xffd43b) : this.markerColor;
        m.children.forEach((ch) => ((ch as THREE.Mesh).material as THREE.MeshBasicMaterial).color.copy(color));
      }
    });
  }

  hoverMarker(cell: Cell | null): void {
    this.hoveredMarker = cell ? this.markerCells.findIndex((m) => m.r === cell.r && m.c === cell.c) : -1;
    if (cell) {
      this.currentIntendedTarget = cellToWorld(cell.r, cell.c);
    } else if (this.ghost?.visible) {
      this.currentIntendedTarget = this.ghost.position.clone();
    } else {
      this.currentIntendedTarget = null;
    }
  }

  showGhost(w: Wall | null, valid = true, isHint = false): void {
    if (!w) {
      this.ghost.visible = false;
      if (this.hoveredMarker !== -1 && this.markerCells[this.hoveredMarker]) {
        const mc = this.markerCells[this.hoveredMarker];
        this.currentIntendedTarget = cellToWorld(mc.r, mc.c);
      } else {
        this.currentIntendedTarget = null;
      }
      return;
    }
    this.ghost.visible = true;
    this.ghost.position.copy(wallToWorld(w));
    this.ghost.rotation.y = w.o === 'v' ? Math.PI / 2 : 0;
    this.currentIntendedTarget = this.ghost.position.clone();
    if (isHint) {
      this.ghostMat.color.set(0xffd43b);
      this.ghostMat.emissive.set(0xb58900);
    } else {
      this.ghostMat.color.set(valid ? 0x9cff8a : 0xff6b6b);
      this.ghostMat.emissive.set(valid ? 0x2f8a2a : 0x8a2020);
    }
  }

  showDestination(goal: Goal | null, colorHex?: string): void {
    if (!goal) {
      this.destActive = false;
      this.destGroup.visible = false;
      return;
    }
    this.destActive = true;
    this.destGroup.visible = true;
    const col = new THREE.Color(colorHex ?? '#ffe6a8');
    this.destPadMat.color.copy(col);
    this.destBarMat.color.copy(col);

    for (let i = 0; i < 9; i++) {
      const r = goal.axis === 'r' ? goal.value : i;
      const c = goal.axis === 'c' ? goal.value : i;
      this.destPads[i].position.copy(cellToWorld(r, c)).setY(TILE_TOP + 0.007);
    }

    if (goal.axis === 'r') {
      this.destBar.rotation.y = 0;
      const z = -HALF + goal.value * PITCH + (goal.value === 0 ? -PITCH / 2 + 0.04 : PITCH / 2 - 0.04);
      this.destBar.position.set(0, TILE_TOP + 0.025, z);
    } else {
      this.destBar.rotation.y = Math.PI / 2;
      const x = -HALF + goal.value * PITCH + (goal.value === 0 ? -PITCH / 2 + 0.04 : PITCH / 2 - 0.04);
      this.destBar.position.set(x, TILE_TOP + 0.025, 0);
    }
  }

  tick(t: number): void {
    // Breathing move markers
    this.markers.forEach((m, i) => {
      if (!m.visible) return;
      const hovered = i === this.hoveredMarker;
      const target = hovered ? 1.25 : 1 + 0.06 * Math.sin(t * 3 + i);
      m.scale.lerp(new THREE.Vector3(target, 1, target), 0.25);
      const disc = m.children[1] as THREE.Mesh;
      (disc.material as THREE.MeshBasicMaterial).opacity = hovered ? 0.55 : 0.2;
    });

    // Ghost hedge shimmer
    if (this.ghost?.visible) this.ghostMat.opacity = 0.45 + 0.12 * Math.sin(t * 6);

    // Destination goal shimmer
    if (this.destActive) {
      this.destPadMat.opacity = 0.4 + 0.2 * Math.sin(t * 5);
      this.destBarMat.opacity = 0.65 + 0.25 * Math.sin(t * 5);
    }
  }
}
