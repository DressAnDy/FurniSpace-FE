import type { HeroAnimationPhase } from '@/features/MainPages/home/hero3d/types';

const TIMELINE: Array<{ duration: number; phase: HeroAnimationPhase }> = [
  { phase: 'idle', duration: 10 },
  { phase: 'wakeUp', duration: 0.35 },
  { phase: 'lift', duration: 0.45 },
  { phase: 'vortex', duration: 1.4 },
  { phase: 'return', duration: 0.55 },
  { phase: 'settle', duration: 0.3 },
];

export type AnimationFrame = {
  phase: HeroAnimationPhase;
  progress: number;
  time: number;
};

export class AnimationStateMachine {
  private elapsed = 0;
  private index = 0;

  update(deltaSeconds: number): AnimationFrame {
    this.elapsed += Math.min(deltaSeconds, 0.1);
    let current = TIMELINE[this.index];

    while (this.elapsed >= current.duration) {
      this.elapsed -= current.duration;
      this.index = (this.index + 1) % TIMELINE.length;
      current = TIMELINE[this.index];
    }

    return {
      phase: current.phase,
      progress: this.elapsed / current.duration,
      time: this.elapsed,
    };
  }
}
