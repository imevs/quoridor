import * as THREE from 'three';

interface ParticleGroup {
  points: THREE.Points;
  vel: Float32Array;
  born: number;
  life: number;
}

const PARTICLE_GRAVITY = 9.0;
const PARTICLE_LIFETIME = 1.1;
const PARTICLE_SIZE = 0.09;

/**
 * Manages celebration confetti and leaf particle physics, lifetime decay, and cleanup.
 */
export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: ParticleGroup[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /** Spawns a burst of celebratory particles with random initial velocities. */
  burst(origin: THREE.Vector3, colors: number[], count: number, speed: number, now: number): void {
    const positions = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const c = new THREE.Color();

    for (let i = 0; i < count; i++) {
      positions.set([
        origin.x + (Math.random() - 0.5) * 0.6,
        origin.y,
        origin.z + (Math.random() - 0.5) * 0.6,
      ], i * 3);

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
    const mat = new THREE.PointsMaterial({
      size: PARTICLE_SIZE,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
    });
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
    this.particles.push({ points, vel, born: now, life: PARTICLE_LIFETIME });
  }

  /** Ticks particle physics by integrating gravity and disposing expired meshes. */
  tick(now: number, dt = 1 / 60): void {
    this.particles = this.particles.filter((p) => {
      const age = now - p.born;
      const pos = p.points.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        p.vel[i * 3 + 1] -= PARTICLE_GRAVITY * dt;
        pos.setXYZ(
          i,
          pos.getX(i) + p.vel[i * 3] * dt,
          Math.max(0.13, pos.getY(i) + p.vel[i * 3 + 1] * dt),
          pos.getZ(i) + p.vel[i * 3 + 2] * dt,
        );
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
  }

  /** Disposes all active particle systems immediately. */
  dispose(): void {
    for (const p of this.particles) {
      p.points.removeFromParent();
      p.points.geometry.dispose();
      (p.points.material as THREE.Material).dispose();
    }
    this.particles = [];
  }
}
