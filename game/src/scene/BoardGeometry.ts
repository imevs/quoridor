import * as THREE from 'three';
import { N, type Wall } from '../game/rules';

/** Board geometry constants (must match build_quoridor_board.py). */
export const PITCH = 1.2;
export const HALF = ((N - 1) * PITCH) / 2; // 4.8
export const TILE_TOP = 0.12;
export const PAWN_SCALE = 0.9;

export const cellToWorld = (r: number, c: number): THREE.Vector3 =>
  new THREE.Vector3(-HALF + c * PITCH, TILE_TOP, -HALF + r * PITCH);

export const wallToWorld = (w: Wall): THREE.Vector3 =>
  new THREE.Vector3(-HALF + w.c * PITCH + PITCH / 2, 0, -HALF + w.r * PITCH + PITCH / 2);

export const wallKey = (w: Wall): string => `${w.r},${w.c},${w.o}`;

/** Seat index -> yaw that faces the player's goal (figurines face +Z by default). */
export const SEAT_YAW_2 = [Math.PI, 0];
export const SEAT_YAW_4 = [Math.PI, Math.PI / 2, 0, -Math.PI / 2];
