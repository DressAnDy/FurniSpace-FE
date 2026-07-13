import { easeInOutCubic, lerp } from '@/features/MainPages/home/hero3d/animation/AnimationMath';
import type { HeroAnimationObject, HeroObject } from '@/features/MainPages/home/hero3d/types';
import { VortexAnimation } from '@/features/MainPages/home/hero3d/animation/VortexAnimation';

export class ReturnAnimation {
  constructor(private readonly vortex: VortexAnimation) {}

  apply(object: HeroObject, state: HeroAnimationObject, progress: number, vortexDuration: number) {
    // Resolve the frozen final vortex pose, then interpolate it home without retaining frame snapshots.
    this.vortex.apply(object, state, vortexDuration, false);
    const fromX = object.rootNode.position.x;
    const fromY = object.rootNode.position.y;
    const fromZ = object.rootNode.position.z;
    const fromRotationX = object.rootNode.rotation.x;
    const fromRotationY = object.rootNode.rotation.y;
    const eased = easeInOutCubic(progress);

    object.rootNode.position.x = lerp(fromX, object.originalTransform.position.x, eased);
    object.rootNode.position.y = lerp(fromY, object.originalTransform.position.y, eased);
    object.rootNode.position.z = lerp(fromZ, object.originalTransform.position.z, eased);
    object.rootNode.rotation.x = lerp(fromRotationX, object.originalTransform.rotation.x, eased);
    object.rootNode.rotation.y = lerp(fromRotationY, object.originalTransform.rotation.y, eased);
    object.rootNode.rotation.z = object.originalTransform.rotation.z;
    object.rootNode.scaling.copyFrom(object.originalTransform.scaling);
  }
}
