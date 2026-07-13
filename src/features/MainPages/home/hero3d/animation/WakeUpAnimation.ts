import { easeInOutCubic } from '@/features/MainPages/home/hero3d/animation/AnimationMath';
import type { HeroAnimationObject, HeroObject } from '@/features/MainPages/home/hero3d/types';

export class WakeUpAnimation {
  apply(object: HeroObject, state: HeroAnimationObject, progress: number) {
    const staggeredProgress = Math.max(0, Math.min((progress - (state.index % 8) * 0.055) / 0.62, 1));
    const eased = easeInOutCubic(staggeredProgress);

    object.rootNode.position.copyFrom(object.originalTransform.position);
    object.rootNode.rotation.copyFrom(object.originalTransform.rotation);
    object.rootNode.rotation.y += eased * (0.22 + state.index * 0.07);
    object.rootNode.scaling.copyFrom(object.originalTransform.scaling);
  }
}
