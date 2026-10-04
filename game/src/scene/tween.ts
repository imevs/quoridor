/** Lightweight promise-based tween runner driven by the render loop. */
export type Ease = (t: number) => number;

export const ease = {
  linear: (t: number) => t,
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

interface Tween {
  start: number;
  duration: number;
  ease: Ease;
  update: (k: number) => void;
  resolve: () => void;
}

export class Tweener {
  private tweens: Tween[] = [];
  get now(): number {
    return performance.now() / 1000;
  }

  run(duration: number, update: (k: number) => void, e: Ease = ease.inOutCubic): Promise<void> {
    return new Promise((resolve) => {
      this.tweens.push({ start: this.now, duration, ease: e, update, resolve });
    });
  }

  tick(): void {
    const t = this.now;
    this.tweens = this.tweens.filter((tw) => {
      const raw = Math.min(1, (t - tw.start) / tw.duration);
      tw.update(tw.ease(raw));
      if (raw >= 1) {
        tw.resolve();
        return false;
      }
      return true;
    });
  }

  clear(): void {
    this.tweens.forEach((tw) => tw.resolve());
    this.tweens = [];
  }
}
