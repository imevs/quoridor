import type { BoardScene, CameraPreset } from './BoardScene';
import type { Hud } from '../ui/Hud';

const NEXT_PRESET: Record<CameraPreset, CameraPreset> = {
  seat: 'top',
  top: 'iso',
  iso: 'seat',
};

const PRESET_LABELS: Record<CameraPreset, string> = {
  seat: 'Player View',
  top: 'Top-Down View',
  iso: 'Isometric View',
};

/**
 * Manages active camera perspective preset (seat / top / iso), transitions, and user notifications.
 */
export class CameraController {
  private scene: BoardScene;
  private hud: Hud;
  private getViewSeat: () => number;
  private currentPreset: CameraPreset = 'seat';

  constructor(scene: BoardScene, hud: Hud, getViewSeat: () => number) {
    this.scene = scene;
    this.hud = hud;
    this.getViewSeat = getViewSeat;
  }

  get preset(): CameraPreset {
    return this.currentPreset;
  }

  setPreset(preset: CameraPreset, duration = 0.7): void {
    this.currentPreset = preset;
    const seat = this.getViewSeat();
    void this.scene.setCameraPreset(this.currentPreset, seat, duration);
  }

  cycle(): void {
    this.currentPreset = NEXT_PRESET[this.currentPreset];
    const seat = this.getViewSeat();
    void this.scene.setCameraPreset(this.currentPreset, seat, 0.7);
    this.hud.toast(`Camera: ${PRESET_LABELS[this.currentPreset]}`);
  }
}
