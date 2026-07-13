import { easeInOutCubic } from '@/features/MainPages/home/hero3d/animation/AnimationMath';
import type { HeroAnimationObject, HeroObject } from '@/features/MainPages/home/hero3d/types';

export class LiftAnimation {
  apply(object: HeroObject, state: HeroAnimationObject, progress: number) {
    const lift = easeInOutCubic(progress) * (0.7 + Math.min(state.size * 0.32, 1.4));
    object.rootNode.position.copyFrom(object.originalTransform.position);
    object.rootNode.position.y += lift;
    object.rootNode.rotation.copyFrom(object.originalTransform.rotation);
    object.rootNode.rotation.y += 0.22 + state.index * 0.07;
    object.rootNode.scaling.copyFrom(object.originalTransform.scaling);
  }
}
