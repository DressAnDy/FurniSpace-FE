import { Vector3 } from 'babylonjs';

import type { HeroBounds, Vector3Data } from '@/features/MainPages/home/hero3d/types';

export function toVector3Data(vector: Vector3): Vector3Data {
  return { x: vector.x, y: vector.y, z: vector.z };
}

export function createBounds(minimum: Vector3, maximum: Vector3): HeroBounds {
  return {
    maximum: toVector3Data(maximum),
    minimum: toVector3Data(minimum),
  };
}
