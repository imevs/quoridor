import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { type AnimalId } from '../game/animals';
import { type Cell, type GameState, type Wall, type Goal } from '../game/rules';
import { Tweener, ease } from './tween';
import { sounds } from './sounds';

import { wallToWorld, wallKey } from './BoardGeometry';
import { BoardCameraRig, type CameraPreset, type CameraAnchor, type AnchorAngleKind } from './BoardCameraRig';
import { BoardLighting } from './BoardLighting';
import { BoardPicker, type Pick } from './BoardPicker';
import { ParticleSystem } from './ParticleSystem';
import { BoardAssetLoader } from './BoardAssetLoader';
import { BoardOverlays } from './BoardOverlays';
import { BoardPawns } from './BoardPawns';

export { cellToWorld } from './BoardGeometry';
export type { CameraPreset, Pick, CameraAnchor, AnchorAngleKind };

/**
 * Top-level coordinator for the Quoridor 3D board scene.
 * Delegates rendering, camera framing, asset loading, overlays, raycasting,
 * pawn animations, and lighting to single-responsibility modules.
 */
export class BoardScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly cameraRig: BoardCameraRig;
  readonly lighting: BoardLighting;
  readonly picker: BoardPicker;
  readonly particles: ParticleSystem;
  readonly overlays: BoardOverlays;
  readonly pawns: BoardPawns;
  readonly tween = new Tweener();

  get camera(): THREE.PerspectiveCamera {
    return this.cameraRig.camera;
  }

  get controls(): OrbitControls {
    return this.cameraRig.controls;
  }

  get cameraPreset(): CameraPreset {
    return this.cameraRig.preset;
  }

  get currentAnchor(): CameraAnchor | null {
    return this.cameraRig.currentAnchor;
  }

  private hedgeTemplate!: THREE.Object3D;
  private walls = new Map<string, THREE.Object3D>();
  private container: HTMLElement;
  onFrame?: () => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);

    this.cameraRig = new BoardCameraRig(container, this.renderer.domElement, this.tween);
    this.lighting = new BoardLighting(this.scene, this.renderer);
    this.picker = new BoardPicker(this.cameraRig.camera, this.renderer.domElement);
    this.particles = new ParticleSystem(this.scene);
    this.overlays = new BoardOverlays(this.scene);
    this.pawns = new BoardPawns(this.scene, this.tween);

    window.addEventListener('resize', () => this.onResize());
    this.renderer.setAnimationLoop(() => this.frame());
  }

  /** Loads GLTF board assets, textures, and initializes overlays and pawn templates. */
  async load(onProgress: (p: number) => void): Promise<void> {
    const assets = await BoardAssetLoader.load(this.renderer, onProgress);
    this.scene.add(assets.boardRoot);
    this.hedgeTemplate = assets.hedgeTemplate;
    this.overlays.init(this.hedgeTemplate);
    this.pawns.init(assets.animalTemplates);
  }

  // ---------------------------------------------------------------------------
  // Game state -> scene
  // ---------------------------------------------------------------------------
  setupPlayers(animals: AnimalId[]): void {
    this.pawns.setupPlayers(animals);
    this.cameraRig.setSeatCount(animals.length === 4 ? 4 : 2);
  }

  /** Instantly mirrors a full game state (used on start / undo). */
  syncState(s: GameState): void {
    this.tween.clear();
    this.pawns.syncPositions(s.players);

    const wanted = new Set(s.wallList.map(wallKey));
    for (const [k, obj] of this.walls) {
      if (!wanted.has(k)) {
        obj.removeFromParent();
        this.walls.delete(k);
      }
    }
    s.wallList.forEach((w) => {
      if (!this.walls.has(wallKey(w))) this.addWallMesh(w);
    });
  }

  private addWallMesh(w: Wall): THREE.Object3D {
    const obj = this.hedgeTemplate.clone(true);
    obj.position.copy(wallToWorld(w));
    obj.rotation.y = w.o === 'v' ? Math.PI / 2 : 0;
    this.scene.add(obj);
    this.walls.set(wallKey(w), obj);
    return obj;
  }

  setActiveSeat(seat: number): void {
    const color = this.pawns.setActiveSeat(seat);
    if (color) {
      const markerColor = color.clone().lerp(new THREE.Color('#ffffff'), 0.35);
      this.overlays.setMarkerColor(markerColor);
    }
  }

  // ---------------------------------------------------------------------------
  // Animations
  // ---------------------------------------------------------------------------
  async animateMove(seat: number, to: Cell): Promise<void> {
    await this.pawns.animateMove(seat, to, (pos) => {
      this.particles.burst(pos, [0xe8d3a8, 0xc9a66b], 14, 1.6, this.tween.now);
    });
  }

  async animateWall(w: Wall): Promise<void> {
    sounds.playWall();
    const obj = this.addWallMesh(w);
    obj.scale.set(1, 0.01, 1);
    const pos = wallToWorld(w).setY(0.5);
    this.particles.burst(pos, [0x5fa83a, 0x8fd14f, 0x3d7a2a, 0xb7e070], 46, 3.2, this.tween.now);
    await this.tween.run(0.55, (k) => {
      obj.scale.set(1 - 0.06 * Math.sin(Math.PI * k), Math.max(0.01, k), 1 + 0.12 * Math.sin(Math.PI * k));
    }, ease.outBack);
    obj.scale.set(1, 1, 1);
  }

  async celebrate(seat: number): Promise<void> {
    await this.pawns.celebrate(seat, (pos) => {
      this.particles.burst(pos, [0xff8a3d, 0xf5c94c, 0x8fd14f, 0x7fb2e5, 0xff5d8f], 120, 4.5, this.tween.now);
    });
  }

  // ---------------------------------------------------------------------------
  // Interaction & Overlays
  // ---------------------------------------------------------------------------
  showMoveMarkers(cells: Cell[], hintCell: Cell | null = null): void {
    this.overlays.showMoveMarkers(cells, hintCell);
  }

  hoverMarker(cell: Cell | null): void {
    this.overlays.hoverMarker(cell);
  }

  showGhost(w: Wall | null, valid = true, isHint = false): void {
    this.overlays.showGhost(w, valid, isHint);
  }

  showDestination(goal: Goal | null, colorHex?: string): void {
    this.overlays.showDestination(goal, colorHex);
  }

  setPawnGestureDrag(seat: number, from: Cell, to: Cell, progress: number, blocked = false): void {
    this.pawns.setPawnGestureDrag(seat, from, to, progress, blocked);
  }

  resetPawnGesture(seat: number, from: Cell): void {
    this.pawns.resetPawnGesture(seat, from);
  }

  // ---------------------------------------------------------------------------
  // Picking & Camera
  // ---------------------------------------------------------------------------
  /** Converts a pointer position to a cell (tile centre zone) or a wall slot (grooves). */
  pick(clientX: number, clientY: number): Pick {
    return this.picker.pick(clientX, clientY);
  }

  /** Raycasts directly against animal figurine models to detect hovered pawn. */
  pickPawn(clientX: number, clientY: number): number | null {
    return this.picker.pickPawn(clientX, clientY, this.pawns.pawnList, this.pawns.pawnGroupList);
  }

  /** Checks if the screen coordinates fall within the board platform area or canvas. */
  isOnBoard(clientX: number, clientY: number): boolean {
    if (this.picker.pickPawn(clientX, clientY, this.pawns.pawnList, this.pawns.pawnGroupList) !== null) {
      return true;
    }
    return this.picker.isOnBoard(clientX, clientY);
  }

  /** Gets 2D viewport coordinates for the animal figurine at the given seat. */
  getPawnScreenPosition(seat: number): { x: number; y: number } | null {
    const pawn = this.pawns.pawnList[seat];
    if (!pawn || !this.cameraRig?.camera) return null;
    const canvas = this.renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const worldPos = pawn.group.position.clone();
    worldPos.y = 0.55;
    const proj = worldPos.project(this.cameraRig.camera);
    if (proj.z > 1) return null;
    return {
      x: rect.left + ((proj.x + 1) / 2) * rect.width,
      y: rect.top + ((-proj.y + 1) / 2) * rect.height,
    };
  }

  /** Smoothly orbit the camera behind a seat. */
  async focusSeat(seat: number, duration = 1.0): Promise<void> {
    await this.cameraRig.focusSeat(seat, this.pawns.seats, duration);
  }

  /** Set spectator camera preset (seat POV, direct top-down, or isometric angle). */
  async setCameraPreset(preset: CameraPreset, seat = 0, duration = 0.8): Promise<void> {
    await this.cameraRig.setCameraPreset(preset, seat, this.pawns.seats, duration);
  }

  /** Snap camera to the nearest allowed anchor point (~0.4s ease-out). */
  async snapToNearestAnchor(duration = 0.4): Promise<CameraAnchor | null> {
    return await this.cameraRig.snapToNearestAnchor(duration);
  }

  getAnchors(): CameraAnchor[] {
    return this.cameraRig.getAnchors();
  }

  getNearestAnchor(): CameraAnchor {
    return this.cameraRig.getNearestAnchor();
  }

  private onResize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.cameraRig.onResize();
    this.renderer.setSize(w, h);
  }

  // ---------------------------------------------------------------------------
  // Render loop
  // ---------------------------------------------------------------------------
  private frame(): void {
    this.tween.tick();
    const t = this.tween.now;

    this.pawns.tick(t, this.overlays.intendedTarget);
    this.overlays.tick(t);
    this.particles.tick(t);

    this.cameraRig.updateControls();
    this.renderer.render(this.scene, this.cameraRig.camera);

    this.onFrame?.();
  }
}
