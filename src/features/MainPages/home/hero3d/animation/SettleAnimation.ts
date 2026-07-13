import { easeOutCubic } from '@/features/MainPages/home/hero3d/animation/AnimationMath';
import type { HeroAnimationObject, HeroObject } from '@/features/MainPages/home/hero3d/types';

export class SettleAnimation {
  apply(object: HeroObject, state: HeroAnimationObject, progress: number) {
    const damping = (1 - easeOutCubic(progress)) * Math.exp(-progress * 4.5);
    const bounce = Math.sin(progress * Math.PI * 3.2 + state.phaseOffset) * damping * Math.min(state.height * 0.075, 0.09);

    object.rootNode.position.copyFrom(object.originalTransform.position);
    object.rootNode.position.y += bounce;
    object.rootNode.rotation.copyFrom(object.originalTransform.rotation);
    object.rootNode.rotation.y += bounce * 0.08;
    object.rootNode.scaling.copyFrom(object.originalTransform.scaling);
  }
}
