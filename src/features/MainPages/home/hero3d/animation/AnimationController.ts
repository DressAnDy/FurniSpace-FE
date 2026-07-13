import { AnimationStateMachine } from '@/features/MainPages/home/hero3d/animation/AnimationStateMachine';
import { IdleAnimation } from '@/features/MainPages/home/hero3d/animation/IdleAnimation';
import { LiftAnimation } from '@/features/MainPages/home/hero3d/animation/LiftAnimation';
import { ReturnAnimation } from '@/features/MainPages/home/hero3d/animation/ReturnAnimation';
import { SettleAnimation } from '@/features/MainPages/home/hero3d/animation/SettleAnimation';
import { VortexAnimation } from '@/features/MainPages/home/hero3d/animation/VortexAnimation';
import { WakeUpAnimation } from '@/features/MainPages/home/hero3d/animation/WakeUpAnimation';
import type { HeroAnimationObject, HeroAnimationPhase, HeroObject } from '@/features/MainPages/home/hero3d/types';

const VORTEX_DURATION = 1.4;

export class AnimationController {
  private readonly idle = new IdleAnimation();
  private readonly lift = new LiftAnimation();
  private readonly machine = new AnimationStateMachine();
  private readonly objectStates: HeroAnimationObject[] = [];
  private readonly returnAnimation = new ReturnAnimation(new VortexAnimation());
  private readonly settle = new SettleAnimation();
  private readonly vortex = new VortexAnimation();
  private readonly wakeUp = new WakeUpAnimation();
  private elapsed = 0;
  private lastTime = 0;

  setObjects(objects: HeroObject[]) {
    this.objectStates.length = 0;
    objects.forEach((object, index) => {
      const horizontalScale = object.rootNode.scaling.x;
      const verticalScale = object.rootNode.scaling.y;
      const size = (object.metadata.estimatedSize ?? 1) * horizontalScale;
      const height = (object.metadata.height ?? 1) * verticalScale;
      const radius = (object.metadata.radius ?? 0.5) * horizontalScale;

      this.objectStates.push({
        height,
        index,
        phaseOffset: index * 1.71,
        radius,
        rotationSpeed: 0.55 + (index % 4) * 0.12,
        size,
        vortexRadius: Math.max(size * 0.72 + index * 0.24, 0.8),
      });
    });
  }

  update(objects: HeroObject[], now: number) {
    const delta = this.lastTime ? (now - this.lastTime) / 1000 : 0;
    this.lastTime = now;
    this.elapsed += delta;
    const frame = this.machine.update(delta);

    objects.forEach((object, index) => this.apply(object, this.objectStates[index], frame.phase, frame.progress, frame.time));
    return frame;
  }

  private apply(object: HeroObject, state: HeroAnimationObject | undefined, phase: HeroAnimationPhase, progress: number, time: number) {
    if (!state) return;
    if (phase === 'idle') this.idle.apply(object, state, this.elapsed);
    if (phase === 'wakeUp') this.wakeUp.apply(object, state, progress);
    if (phase === 'lift') this.lift.apply(object, state, progress);
    if (phase === 'vortex') this.vortex.apply(object, state, time, true);
    if (phase === 'highlight') this.vortex.apply(object, state, VORTEX_DURATION, false);
    if (phase === 'return') this.returnAnimation.apply(object, state, progress, VORTEX_DURATION);
    if (phase === 'settle') this.settle.apply(object, state, progress);
  }
}
