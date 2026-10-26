import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export const SUN_COLOR = 0xfff0d9;
export const SUN_INTENSITY = 2.6;
export const SUN_SHADOW_MAP_SIZE = 2048;
export const SUN_SHADOW_FRUSTUM = 9;
export const SUN_SHADOW_BIAS = -0.0004;
export const SUN_SHADOW_NORMAL_BIAS = 0.02;
export const SUN_SHADOW_RADIUS = 4;
export const HEMI_SKY_COLOR = 0xdff0ff;
export const HEMI_GROUND_COLOR = 0x4a6b2a;
export const HEMI_INTENSITY = 0.9;
export const FILL_COLOR = 0xcfe6ff;
export const FILL_INTENSITY = 0.55;
export const SHADOW_PLANE_RADIUS = 16;
export const SHADOW_PLANE_OPACITY = 0.22;

/**
 * Configures scenic lighting, directional sun shadow maps, and ground shadow reception.
 */
export class BoardLighting {
  readonly sun: THREE.DirectionalLight;
  readonly fill: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  readonly ground: THREE.Mesh;

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.35;

    this.hemi = new THREE.HemisphereLight(HEMI_SKY_COLOR, HEMI_GROUND_COLOR, HEMI_INTENSITY);
    scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(SUN_COLOR, SUN_INTENSITY);
    this.sun.position.set(-7, 14, 9);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(SUN_SHADOW_MAP_SIZE, SUN_SHADOW_MAP_SIZE);
    this.sun.shadow.camera.left = -SUN_SHADOW_FRUSTUM;
    this.sun.shadow.camera.right = SUN_SHADOW_FRUSTUM;
    this.sun.shadow.camera.top = SUN_SHADOW_FRUSTUM;
    this.sun.shadow.camera.bottom = -SUN_SHADOW_FRUSTUM;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 40;
    this.sun.shadow.bias = SUN_SHADOW_BIAS;
    this.sun.shadow.normalBias = SUN_SHADOW_NORMAL_BIAS;
    this.sun.shadow.radius = SUN_SHADOW_RADIUS;
    scene.add(this.sun);

    this.fill = new THREE.DirectionalLight(FILL_COLOR, FILL_INTENSITY);
    this.fill.position.set(8, 6, -6);
    scene.add(this.fill);

    this.ground = new THREE.Mesh(
      new THREE.CircleGeometry(SHADOW_PLANE_RADIUS, 64),
      new THREE.ShadowMaterial({ color: 0x1d3317, opacity: SHADOW_PLANE_OPACITY }),
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -0.46;
    this.ground.receiveShadow = true;
    scene.add(this.ground);
  }
}
