import { Vector3 } from 'babylonjs';

import type { HeroAnimationObject, HeroObject } from '@/features/MainPages/home/hero3d/types';

type FloatingFrame = {
  phase: 'floating';
  progress: number;
  time: number;
};

export class FloatingAnimationController {
  private readonly objectStates: HeroAnimationObject[] = [];
  private elapsed = 0;
  private lastTime = 0;

  setObjects(objects: HeroObject[]) {
    this.objectStates.length = 0;
    objects.forEach((object, index) => {
      const random = this.createRandom(this.seedForObject(object, index));
      const height = Math.max((object.metadata.height ?? 1) * object.rootNode.scaling.y, 0.1);

      this.objectStates.push({
        basePosition: object.originalTransform.position.clone(),
        baseRotation: object.originalTransform.rotation.clone(),
        floatAmplitude: Math.min(Math.max(height * this.range(random, 0.012, 0.022), 0.018), 0.055),
        floatSpeed: this.range(random, 0.42, 0.72),
        phaseOffset: this.range(random, 0, Math.PI * 2),
        randomSeed: this.seedForObject(object, index),
        rotationAmplitude: new Vector3(
          this.range(random, 0.018, 0.045),
          this.range(random, 0.035, 0.085),
          this.range(random, 0.014, 0.038),
        ),
        rotationSpeed: this.range(random, 0.28, 0.48),
      });
    });
  }

  update(objects: HeroObject[], now: number): FloatingFrame {
    const delta = this.lastTime ? (now - this.lastTime) / 1000 : 0;
    this.lastTime = now;
    this.elapsed += Math.min(delta, 0.05);

    objects.forEach((object, index) => this.apply(object, this.objectStates[index]));

    return {
      phase: 'floating',
      progress: 0,
      time: this.elapsed,
    };
  }

  private apply(object: HeroObject, state: HeroAnimationObject | undefined) {
    if (!state || !object.rootNode.isEnabled()) return;

    const floatTime = this.elapsed * state.floatSpeed + state.phaseOffset;
    const rotateTime = this.elapsed * state.rotationSpeed + state.phaseOffset;

    object.rootNode.position.x = state.basePosition.x;
    object.rootNode.position.y = state.basePosition.y + Math.sin(floatTime) * state.floatAmplitude;
    object.rootNode.position.z = state.basePosition.z;

    object.rootNode.rotation.x = state.baseRotation.x + Math.sin(rotateTime * 0.82) * state.rotationAmplitude.x;
    object.rootNode.rotation.y = state.baseRotation.y + Math.sin(rotateTime) * state.rotationAmplitude.y;
    object.rootNode.rotation.z = state.baseRotation.z + Math.cos(rotateTime * 0.73) * state.rotationAmplitude.z;
  }

  private seedForObject(object: HeroObject, index: number) {
    const source = `${object.metadata.name}:${object.metadata.path}:${index}`;
    let hash = 2166136261;
    for (let charIndex = 0; charIndex < source.length; charIndex += 1) {
      hash ^= source.charCodeAt(charIndex);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  private createRandom(seed: number) {
    let state = seed || 1;
    return () => {
      state = Math.imul(1664525, state) + 1013904223;
      return (state >>> 0) / 4294967296;
    };
  }

  private range(random: () => number, min: number, max: number) {
    return min + (max - min) * random();
  }
}
