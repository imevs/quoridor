import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import boardUrl from '../../../quoridor_board.glb?url';
import woodUrl from '../../../textures/wood_tile_texture.jpg?url';
import lawnUrl from '../../../textures/lawn_grass_texture.jpg?url';
import hedgeUrl from '../../../textures/hedge_leaf_texture.jpg?url';

import { ANIMALS, type AnimalId } from '../game/animals';

export interface LoadedAssets {
  boardRoot: THREE.Group;
  hedgeTemplate: THREE.Object3D;
  animalTemplates: Map<AnimalId, THREE.Object3D>;
}

/** Writes box-projected (triplanar-style) UVs, mirroring Blender's BOX mapping. */
export function boxProjectUVs(geo: THREE.BufferGeometry, scale: number): void {
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
export function addGrading(mat: THREE.MeshStandardMaterial, glsl: string): void {
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

export function findDetached(list: THREE.Object3D[], name: string): THREE.Object3D | undefined {
  for (const o of list) {
    if (o.name === name) return o;
    const f = o.getObjectByName(name);
    if (f) return f;
  }
  return undefined;
}

/**
 * Loads the 3D board GLTF asset, textures, and extracts templates for walls and animal figurines.
 */
export class BoardAssetLoader {
  static async load(renderer: THREE.WebGLRenderer, onProgress: (p: number) => void): Promise<LoadedAssets> {
    const texLoader = new THREE.TextureLoader();
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
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
    let hedgeTemplate: THREE.Object3D | null = null;
    const animalTemplates = new Map<AnimalId, THREE.Object3D>();

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
        if (name === 'Wall_Wolf_Left_Back') hedgeTemplate = child;
        toRemove.push(child);
      } else if (name.startsWith('Animal_')) {
        toRemove.push(child);
      }
    }
    toRemove.forEach((o) => o.removeFromParent());

    if (!hedgeTemplate) throw new Error('Hedge template not found in GLB');
    hedgeTemplate.position.set(0, 0, 0);
    hedgeTemplate.quaternion.identity();
    hedgeTemplate.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        project(o, 3.0);
        o.material = hedgeMat;
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });

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
      animalTemplates.set(info.id, node);
    }

    return {
      boardRoot: root,
      hedgeTemplate,
      animalTemplates,
    };
  }
}
