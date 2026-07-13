import { easeInOutCubic, lerp } from '@/features/MainPages/home/hero3d/animation/AnimationMath';
import type { HeroAnimationObject, HeroObject } from '@/features/MainPages/home/hero3d/types';

export class VortexAnimation {
  apply(object: HeroObject, state: HeroAnimationObject, elapsed: number, blendFromLift: boolean) {
    const rampDuration = 0.45;
    const vortexTime = Math.max(0, elapsed - rampDuration);
    const blend = blendFromLift ? easeInOutCubic(Math.min(elapsed / rampDuration, 1)) : 1;
    const angle = state.phaseOffset + vortexTime * state.rotationSpeed;
    const changingRadius = state.vortexRadius * (1 + Math.sin(vortexTime * 0.55 + state.phaseOffset) * 0.12);
    const vortexX = Math.cos(angle) * changingRadius;
    const vortexZ = Math.sin(angle) * changingRadius;
    const vortexY = state.height * 0.5 + 0.9 + state.index * 0.18
      + Math.sin(vortexTime * 1.2 + state.phaseOffset) * 0.18;
    const liftY = object.originalTransform.position.y + 0.7 + Math.min(state.size * 0.32, 1.4);

    object.rootNode.position.x = lerp(object.originalTransform.position.x, vortexX, blend);
    object.rootNode.position.y = lerp(liftY, vortexY, blend);
    object.rootNode.position.z = lerp(object.originalTransform.position.z, vortexZ, blend);
    object.rootNode.rotation.copyFrom(object.originalTransform.rotation);
    object.rootNode.rotation.y += 0.22 + state.index * 0.07 + vortexTime * (state.rotationSpeed * 0.72);
    object.rootNode.rotation.x += Math.sin(vortexTime * 0.8 + state.phaseOffset) * 0.1;
    object.rootNode.scaling.copyFrom(object.originalTransform.scaling);
  }
}
