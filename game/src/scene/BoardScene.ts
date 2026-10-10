import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// Blender-generated assets (single source of truth lives in the parent project)
import boardUrl from '../../../quoridor_board.glb?url';
import woodUrl from '../../../textures/wood_tile_texture.jpg?url';
import lawnUrl from '../../../textures/lawn_grass_texture.jpg?url';
import hedgeUrl from '../../../textures/hedge_leaf_texture.jpg?url';

import { ANIMALS, type AnimalId } from '../game/animals';
import { type Cell, type GameState, type Wall, type Goal, N } from '../game/rules';
import { Tweener, ease } from './tween';
import { sounds } from './sounds';

export type CameraPreset = 'seat' | 'top' | 'iso';

/** Board geometry constants (must match build_quoridor_board.py). */
const PITCH = 1.2;
const HALF = ((N - 1) * PITCH) / 2; // 4.8
const TILE_TOP = 0.12;
const PAWN_SCALE = 0.9;

export const cellToWorld = (r: number, c: number) => new THREE.Vector3(-HALF + c * PITCH, TILE_TOP, -HALF + r * PITCH);
const wallToWorld = (w: Wall) => new THREE.Vector3(-HALF + w.c * PITCH + PITCH / 2, 0, -HALF + w.r * PITCH + PITCH / 2);
const wallKey = (w: Wall) => `${w.r},${w.c},${w.o}`;

export type Pick = { kind: 'cell'; r: number; c: number } | { kind: 'wall'; wall: Wall } | null;

/** Seat index -> yaw that faces the player's goal (figurines face +Z by default). */
const SEAT_YAW_2 = [Math.PI, 0];
const SEAT_YAW_4 = [Math.PI, Math.PI / 2, 0, -Math.PI / 2];
/** Camera azimuth looking from each seat's side of the board. */
const SEAT_AZ_2 = [0, Math.PI];
const SEAT_AZ_4 = [0, -Math.PI / 2, Math.PI, Math.PI / 2];

interface Pawn {
  group: THREE.Group; // positioned on the tile
  model: THREE.Object3D; // yaw + hop squash
  ring: THREE.Mesh;
  glow: THREE.Mesh;
  color: THREE.Color;
}

/** Writes box-projected (triplanar-style) UVs, mirroring the Blender BOX mapping. */
function boxProjectUVs(geo: THREE.BufferGeometry, scale: number): void {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  if (!pos || !nor) return;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const ax = Math.abs(nor.getX(i));
    const ay = Math.abs(nor.getY(i));
    const az = Math.abs(nor.getZ(i));
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    let u: number;
    let v: number;
    if (ay >= ax && ay >= az) {
      u = x;
      v = z;
    } else if (ax >= az) {
      u = z;
      v = y;
    } else {
      u = x;
      v = y;
    }
    uv[i * 2] = u * scale;
    uv[i * 2 + 1] = v * scale;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

/**
 * Injects world-space colour grading after the albedo lookup, re-creating the
 * Blender shader-node grading (groove moss vs. sunny lawn, sunlit hedge tops).
 */
function addGrading(mat: THREE.MeshStandardMaterial, glsl: string): void {
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWN;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvWN = normalize(mat3(modelMatrix) * objectNormal);',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWN;')
      .replace('#include <map_fragment>', `#include <map_fragment>\n${glsl}`);
  };
  mat.customProgramCacheKey = () => glsl;
}

export class BoardScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  readonly tween = new Tweener();

  private raycaster = new THREE.Raycaster();
  private pickPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -TILE_TOP);

  private hedgeTemplate!: THREE.Object3D;
  private animalTemplates = new Map<AnimalId, THREE.Object3D>();
  private pawns: Pawn[] = [];
  private walls = new Map<string, THREE.Object3D>();
  private ghost!: THREE.Object3D;
  private ghostMat!: THREE.MeshStandardMaterial;
  private markers: THREE.Group[] = [];
  private markerCells: Cell[] = [];
  private hoveredMarker = -1;
  private markerColor = new THREE.Color('#ffe6a8');
  private activeSeat = -1;
  private particles: { points: THREE.Points; vel: Float32Array; born: number; life: number }[] = [];
  private seatCount: 2 | 4 = 2;
  private destGroup = new THREE.Group();
  private destPads: THREE.Mesh[] = [];
  private destBar!: THREE.Mesh;
  private destActive = false;
  private destPadMat!: THREE.MeshBasicMaterial;
  private destBarMat!: THREE.MeshBasicMaterial;

  private container: HTMLElement;

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

    this.camera = new THREE.PerspectiveCamera(32, container.clientWidth / container.clientHeight, 0.1, 200);
    this.camera.position.set(0, 15, 15);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 8;
    this.controls.maxDistance = Math.max(50, this.idealDistance() * 1.45);
    this.controls.minPolarAngle = 0.15;
    this.controls.maxPolarAngle = 1.22;
    this.controls.target.set(0, 0, 0.3);

    this.setupLighting();
    this.updateCameraProjection();
    this.fitCamera();

    window.addEventListener('resize', () => this.onResize());
    this.renderer.setAnimationLoop(() => this.frame());
  }

  // ---------------------------------------------------------------------------
  // Setup
  // ---------------------------------------------------------------------------
  private setupLighting(): void {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.35;

    const hemi = new THREE.HemisphereLight(0xdff0ff, 0x4a6b2a, 0.9);
    this.scene.add(hemi);

    // Key directional light
    const sun = new THREE.DirectionalLight(0xfff0d9, 2.6);
    sun.position.set(-7, 14, 9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -9;
    sun.shadow.camera.right = 9;
    sun.shadow.camera.top = 9;
    sun.shadow.camera.bottom = -9;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 40;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    sun.shadow.radius = 4;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0xcfe6ff, 0.55);
    fill.position.set(8, 6, -6);
    this.scene.add(fill);

    // Ground plane for shadow reception
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(16, 64),
      new THREE.ShadowMaterial({ color: 0x1d3317, opacity: 0.22 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.46;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  async load(onProgress: (p: number) => void): Promise<void> {
    const texLoader = new THREE.TextureLoader();
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const loadTex = async (url: string) => {
      const t = await texLoader.loadAsync(url);
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = maxAniso;
      return t;
    };

    const gltfPromise = new GLTFLoader().loadAsync(boardUrl, (e) => {
      if (e.total) onProgress(Math.min(0.95, e.loaded / e.total));
    });
    const [gltf, wood, lawn, hedge] = await Promise.all([gltfPromise, loadTex(woodUrl), loadTex(lawnUrl), loadTex(hedgeUrl)]);
    onProgress(1);

    const woodMat = new THREE.MeshStandardMaterial({ map: wood, roughness: 0.62, color: new THREE.Color(1.05, 0.98, 0.92) });
    addGrading(
      woodMat,
      'float side = 1.0 - smoothstep(0.35, 0.85, abs(vWN.y));\ndiffuseColor.rgb *= mix(vec3(1.0), vec3(0.62, 0.48, 0.38), side);',
    );
    const lawnMat = new THREE.MeshStandardMaterial({ map: lawn, roughness: 0.95 });
    addGrading(
      lawnMat,
      'float inner = 1.0 - smoothstep(4.9, 5.45, max(abs(vWPos.x), abs(vWPos.z)));\n' +
        'diffuseColor.rgb *= mix(vec3(1.10, 1.22, 0.95), vec3(0.50, 0.68, 0.38), inner);',
    );
    const tuftMat = new THREE.MeshStandardMaterial({ map: lawn, roughness: 0.9, side: THREE.DoubleSide });
    addGrading(tuftMat, 'diffuseColor.rgb *= mix(vec3(0.75, 0.95, 0.65), vec3(1.25, 1.35, 0.85), smoothstep(-0.1, 0.25, vWPos.y));');
    const hedgeMat = new THREE.MeshStandardMaterial({ map: hedge, roughness: 0.85 });
    addGrading(
      hedgeMat,
      'float up = smoothstep(0.15, 0.9, vWN.y);\ndiffuseColor.rgb *= mix(vec3(0.80, 0.98, 0.78), vec3(1.25, 1.32, 0.88), up);',
    );

    const processed = new Set<string>();
    const project = (mesh: THREE.Mesh, scale: number) => {
      if (processed.has(mesh.geometry.uuid)) return;
      processed.add(mesh.geometry.uuid);
      boxProjectUVs(mesh.geometry, scale);
    };

    const root = gltf.scene;
    const toRemove: THREE.Object3D[] = [];
    for (const child of [...root.children]) {
      const name = child.name;
      if (name.startsWith('Tile_')) {
        child.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            project(o, 0.95);
            o.material = woodMat;
            o.castShadow = true;
            o.receiveShadow = true;
          }
        });
      } else if (name === 'Board_Lawn_Platform') {
        child.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            project(o, 1.6);
            o.material = lawnMat;
            o.receiveShadow = true;
          }
        });
      } else if (name === 'Board_Grass_Tufts') {
        child.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            project(o, 2.2);
            o.material = tuftMat;
            o.castShadow = true;
          }
        });
      } else if (name === 'Board_Base_Soil') {
        child.traverse((o) => {
          if (o instanceof THREE.Mesh) o.receiveShadow = true;
        });
      } else if (name.startsWith('Wall_')) {
        // Decorative maze walls from the diorama -> use one as the hedge template
        if (name === 'Wall_Wolf_Left_Back') this.hedgeTemplate = child;
        toRemove.push(child);
      } else if (name.startsWith('Animal_')) {
        toRemove.push(child);
      }
    }
    toRemove.forEach((o) => o.removeFromParent());

    // Hedge template: centred, unrotated, length 2.2 along X
    if (!this.hedgeTemplate) throw new Error('Hedge template not found in GLB');
    this.hedgeTemplate.position.set(0, 0, 0);
    this.hedgeTemplate.quaternion.identity();
    this.hedgeTemplate.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        project(o, 3.0);
        o.material = hedgeMat;
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });

    // Animal templates
    for (const info of Object.values(ANIMALS)) {
      const node = gltf.scene.getObjectByName(info.node) ?? findDetached(toRemove, info.node);
      if (!node) continue;
      node.position.set(0, 0, 0);
      node.quaternion.identity();
      node.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      this.animalTemplates.set(info.id, node);
    }

    this.scene.add(root);
    this.createGhost();
    this.createMarkers();
    this.createDestinationMarkers();
  }

  private createGhost(): void {
    this.ghostMat = new THREE.MeshStandardMaterial({
      color: 0x9cff8a,
      emissive: 0x2f8a2a,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    this.ghost = this.hedgeTemplate.clone(true);
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

  // ---------------------------------------------------------------------------
  // Game state -> scene
  // ---------------------------------------------------------------------------
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
      model.rotation.y = this.seatYaw(seat);
      const color = new THREE.Color(ANIMALS[id].color);
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false }));
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
      this.pawns.push({ group, model, ring, glow, color });
    });
  }

  private seatYaw(seat: number): number {
    return (this.seatCount === 4 ? SEAT_YAW_4 : SEAT_YAW_2)[seat] ?? 0;
  }

  /** Instantly mirrors a full game state (used on start / undo). */
  syncState(s: GameState): void {
    this.tween.clear();
    s.players.forEach((p, i) => {
      const pawn = this.pawns[i];
      pawn.group.position.copy(cellToWorld(p.r, p.c));
      pawn.model.rotation.set(0, this.seatYaw(i), 0);
      pawn.model.position.set(0, 0, 0);
      pawn.model.scale.setScalar(PAWN_SCALE);
    });
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
    this.activeSeat = seat;
    this.pawns.forEach((p, i) => {
      if (i !== seat) (p.glow.material as THREE.MeshBasicMaterial).opacity = 0;
    });
    if (this.pawns[seat]) this.markerColor.copy(this.pawns[seat].color).lerp(new THREE.Color('#ffffff'), 0.35);
  }

  // ---------------------------------------------------------------------------
  // Animations
  // ---------------------------------------------------------------------------
  async animateMove(seat: number, to: Cell): Promise<void> {
    const pawn = this.pawns[seat];
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
    this.burst(target.clone().setY(TILE_TOP + 0.05), [0xe8d3a8, 0xc9a66b], 14, 1.6);
    // Landing squash & settle
    await this.tween.run(0.22, (k) => {
      const s = Math.sin(Math.PI * k) * 0.16;
      pawn.model.scale.set(PAWN_SCALE * (1 + s * 0.5), PAWN_SCALE * (1 - s), PAWN_SCALE * (1 + s * 0.5));
      pawn.model.position.y = 0;
    }, ease.outCubic);
    pawn.model.scale.setScalar(PAWN_SCALE);
  }

  async animateWall(w: Wall): Promise<void> {
    sounds.playWall();
    const obj = this.addWallMesh(w);
    obj.scale.set(1, 0.01, 1);
    const pos = wallToWorld(w).setY(0.5);
    this.burst(pos, [0x5fa83a, 0x8fd14f, 0x3d7a2a, 0xb7e070], 46, 3.2);
    await this.tween.run(0.55, (k) => {
      obj.scale.set(1 - 0.06 * Math.sin(Math.PI * k), Math.max(0.01, k), 1 + 0.12 * Math.sin(Math.PI * k));
    }, ease.outBack);
    obj.scale.set(1, 1, 1);
  }

  async celebrate(seat: number): Promise<void> {
    sounds.playWin();
    const pawn = this.pawns[seat];
    const base = pawn.group.position.clone();
    this.burst(base.clone().setY(1.2), [0xff8a3d, 0xf5c94c, 0x8fd14f, 0x7fb2e5, 0xff5d8f], 120, 4.5);
    for (let i = 0; i < 3; i++) {
      const y0 = pawn.model.rotation.y;
      await this.tween.run(0.5, (k) => {
        pawn.model.position.y = Math.sin(Math.PI * k) * 0.9;
        pawn.model.rotation.y = y0 + Math.PI * 2 * k;
      }, ease.inOutCubic);
    }
    pawn.model.position.y = 0;
  }

  private burst(origin: THREE.Vector3, colors: number[], count: number, speed: number): void {
    const positions = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      positions.set([origin.x + (Math.random() - 0.5) * 0.6, origin.y, origin.z + (Math.random() - 0.5) * 0.6], i * 3);
      const a = Math.random() * Math.PI * 2;
      const up = 0.6 + Math.random();
      const sp = speed * (0.3 + Math.random() * 0.7);
      vel.set([Math.cos(a) * sp * 0.5, up * sp * 0.7, Math.sin(a) * sp * 0.5], i * 3);
      c.setHex(colors[i % colors.length]);
      cols.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const mat = new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, depthWrite: false });
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
    this.particles.push({ points, vel, born: this.tween.now, life: 1.1 });
  }

  // ---------------------------------------------------------------------------
  // Interaction helpers
  // ---------------------------------------------------------------------------
  showMoveMarkers(cells: Cell[], hintCell: Cell | null = null): void {
    this.markerCells = cells;
    this.hoveredMarker = -1;
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
  }

  showGhost(w: Wall | null, valid = true, isHint = false): void {
    if (!w) {
      this.ghost.visible = false;
      return;
    }
    this.ghost.visible = true;
    this.ghost.position.copy(wallToWorld(w));
    this.ghost.rotation.y = w.o === 'v' ? Math.PI / 2 : 0;
    if (isHint) {
      this.ghostMat.color.set(0xffd43b);
      this.ghostMat.emissive.set(0xb58900);
    } else {
      this.ghostMat.color.set(valid ? 0x9cff8a : 0xff6b6b);
      this.ghostMat.emissive.set(valid ? 0x2f8a2a : 0x8a2020);
    }
  }

  /** Converts a pointer position to a cell (tile centre zone) or a wall slot (grooves). */
  pick(clientX: number, clientY: number): Pick {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
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
    if (Math.max(Math.abs(dr), Math.abs(dc)) < 0.27) return { kind: 'cell', r: rr, c: rc };
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
  pickPawn(clientX: number, clientY: number): number | null {
    if (this.pawns.length === 0) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.pawns.map((p) => p.group), true);
    if (hits.length > 0) {
      let obj: THREE.Object3D | null = hits[0].object;
      while (obj) {
        const idx = this.pawns.findIndex((p) => p.group === obj);
        if (idx !== -1) return idx;
        obj = obj.parent;
      }
    }
    return null;
  }

  /** Highlights the 9 destination goal tiles and edge runner for a player's goal. */
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

  /** Smoothly orbit the camera behind a seat. */
  async focusSeat(seat: number, duration = 1.0): Promise<void> {
    const az = (this.seatCount === 4 ? SEAT_AZ_4 : SEAT_AZ_2)[seat] ?? 0;
    await this.animateCameraSpherical(az, 0.82, this.idealDistance(), duration);
  }

  /** Set spectator camera preset (seat POV, direct top-down, or isometric angle). */
  async setCameraPreset(preset: CameraPreset, seat = 0, duration = 0.8): Promise<void> {
    sounds.playWhoosh();
    switch (preset) {
      case 'top':
        // Top-down overhead view
        await this.animateCameraSpherical(0, 0.05, this.idealDistance() * 0.95, duration);
        break;
      case 'iso':
        // Isometric angled spectator view
        await this.animateCameraSpherical(Math.PI / 4, 0.75, this.idealDistance() * 1.1, duration);
        break;
      case 'seat':
      default:
        await this.focusSeat(seat, duration);
        break;
    }
  }

  private async animateCameraSpherical(toTheta: number, toPhi: number, toR: number, duration: number): Promise<void> {
    const offset = this.camera.position.clone().sub(this.controls.target);
    const sph = new THREE.Spherical().setFromVector3(offset);
    const fromTheta = sph.theta;
    let d = toTheta - fromTheta;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    const fromPhi = sph.phi;
    const fromR = sph.radius;

    await this.tween.run(duration, (k) => {
      sph.theta = fromTheta + d * k;
      sph.phi = fromPhi + (toPhi - fromPhi) * k;
      sph.radius = fromR + (toR - fromR) * k;
      this.camera.position.copy(this.controls.target).add(new THREE.Vector3().setFromSpherical(sph));
    });
  }

  private idealDistance(): number {
    const aspect = this.camera.aspect;
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const boardSpan = 13.4;
    const distV = boardSpan / 2 / Math.tan(vFov / 2);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const distH = boardSpan / 2 / Math.tan(hFov / 2);
    // On desktop, scale 1.05 provides clean clearance above the bottom player cards row.
    // On mobile portrait, scale 0.94 fits the narrow screen snugly.
    const scale = aspect >= 1.0 ? 1.05 : 0.94;
    return Math.max(distV * scale, distH * scale, 15);
  }

  private updateCameraProjection(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    if (w > 760 && h > 450) {
      // Offset view slightly upward on desktop (~30px) so board has generous clearance above bottom player cards
      const offsetY = Math.round(Math.min(32, h * 0.04));
      this.camera.setViewOffset(w, h, 0, offsetY, w, h);
    } else {
      this.camera.clearViewOffset();
    }
    this.camera.updateProjectionMatrix();
  }

  private fitCamera(): void {
    const r = this.idealDistance();
    const sph = new THREE.Spherical(r, 0.82, 0);
    this.camera.position.copy(this.controls.target).add(new THREE.Vector3().setFromSpherical(sph));
  }

  private onResize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.updateCameraProjection();
    this.renderer.setSize(w, h);
    this.controls.maxDistance = Math.max(50, this.idealDistance() * 1.45);
    this.fitCamera();
  }

  // ---------------------------------------------------------------------------
  // Render loop
  // ---------------------------------------------------------------------------
  private frame(): void {
    this.tween.tick();
    const t = this.tween.now;

    // Pulse active-player glow
    const active = this.pawns[this.activeSeat];
    if (active) {
      (active.glow.material as THREE.MeshBasicMaterial).opacity = 0.35 + 0.25 * Math.sin(t * 4);
      active.glow.scale.setScalar(1 + 0.08 * Math.sin(t * 4));
    }

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

    // Particles
    const dt = 1 / 60;
    this.particles = this.particles.filter((p) => {
      const age = t - p.born;
      const pos = p.points.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        p.vel[i * 3 + 1] -= 9.0 * dt;
        pos.setXYZ(i, pos.getX(i) + p.vel[i * 3] * dt, Math.max(0.13, pos.getY(i) + p.vel[i * 3 + 1] * dt), pos.getZ(i) + p.vel[i * 3 + 2] * dt);
      }
      pos.needsUpdate = true;
      (p.points.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - age / p.life);
      if (age > p.life) {
        p.points.removeFromParent();
        p.points.geometry.dispose();
        (p.points.material as THREE.Material).dispose();
        return false;
      }
      return true;
    });

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

function findDetached(list: THREE.Object3D[], name: string): THREE.Object3D | undefined {
  for (const o of list) {
    if (o.name === name) return o;
    const f = o.getObjectByName(name);
    if (f) return f;
  }
  return undefined;
}
