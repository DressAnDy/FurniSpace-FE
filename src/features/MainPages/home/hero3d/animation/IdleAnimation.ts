import type { HeroAnimationObject, HeroObject } from '@/features/MainPages/home/hero3d/types';

export class IdleAnimation {
  apply(object: HeroObject, state: HeroAnimationObject, elapsed: number) {
    const transform = object.originalTransform;
    const breath = 1 + Math.sin(elapsed * 1.15 + state.phaseOffset) * 0.006;
    const float = Math.sin(elapsed * 0.8 + state.phaseOffset) * Math.min(state.height * 0.018, 0.045);

    object.rootNode.position.copyFrom(transform.position);
    object.rootNode.position.y += float;
    object.rootNode.rotation.copyFrom(transform.rotation);
    object.rootNode.rotation.y += Math.sin(elapsed * 0.45 + state.phaseOffset) * 0.025;
    object.rootNode.scaling.copyFrom(transform.scaling);
    object.rootNode.scaling.scaleInPlace(breath);
  }
}
