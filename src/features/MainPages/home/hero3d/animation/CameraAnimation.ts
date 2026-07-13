import type { ArcRotateCamera } from 'babylonjs';

export class CameraAnimation {
  private baseAlpha = 0;
  private baseRadius = 0;
  private nudge = 0;
  private targetNudge = 0;

  setBase(camera: ArcRotateCamera) {
    this.baseAlpha = camera.alpha;
    this.baseRadius = camera.radius;
  }

  setNudge(active: boolean) {
    this.targetNudge = active ? 1 : 0;
  }

  update(camera: ArcRotateCamera | null, elapsed: number) {
    if (!camera) return;
    this.nudge += (this.targetNudge - this.nudge) * 0.08;
    camera.alpha = this.baseAlpha + Math.sin(elapsed * 0.13) * 0.035 + this.nudge * 0.025;
    camera.radius = this.baseRadius * (1 + Math.sin(elapsed * 0.19) * 0.012 - this.nudge * 0.018);
  }
}
