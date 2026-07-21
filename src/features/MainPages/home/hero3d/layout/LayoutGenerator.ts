import { Vector3 } from 'babylonjs';

import type {
  HeroBounds,
  HeroCompositionBounds,
  HeroModelCategory,
  HeroObject,
} from '@/features/MainPages/home/hero3d/types';

type FloatingPlacement = {
  radius: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  side: 'left' | 'right';
  x: number;
  y: number;
  z: number;
};

type FloatingPlacementWithObject = FloatingPlacement & {
  object: HeroObject;
};

const CATEGORY_RADIUS: Record<HeroModelCategory, number> = {
  Sofa: 0.96,
  Chair: 0.78,
  CoffeeTable: 0.56,
  DiningTable: 0.78,
  Plant: 0.64,
  Lamp: 0.54,
  Pouf: 0.54,
  Cabinet: 0.76,
  Decoration: 0.48,
};

const CENTER_DEAD_ZONE = 3.35;
const MAX_FLOATING_MODELS = 10;
const MIN_DISTANCE_MULTIPLIER = 2.75;
const PLACEMENT_ATTEMPTS = 90;
const SIDE_BOUNDS = {
  left: {
    maxX: -3.85,
    minX: -6.85,
  },
  right: {
    maxX: 6.85,
    minX: 3.85,
  },
};
const Y_BOUNDS = {
  max: 4.45,
  min: 0.85,
};
const Z_BOUNDS = {
  max: 1.35,
  min: -1.35,
};

export class LayoutGenerator {
  private compositionBounds: HeroCompositionBounds | null = null;
  private heroObject: HeroObject | null = null;

  layout(objects: HeroObject[]) {
    this.compositionBounds = null;
    this.heroObject = null;
    if (!objects.length) return null;

    objects.forEach((object) => object.rootNode.setEnabled(false));

    const visibleObjects = objects
      .filter((object) => object.metadata.layout?.enabled !== false)
      .sort((left, right) => this.priority(right) - this.priority(left))
      .slice(0, MAX_FLOATING_MODELS);
    const placements = this.generateTwoSideFloatingLayout(visibleObjects);

    placements.forEach((placement) => {
      placement.object.rootNode.setEnabled(true);
      this.placeFloatingObject(placement.object, placement);
      this.storeRestingTransform(placement.object);
    });

    this.heroObject = visibleObjects[0] ?? null;
    this.compositionBounds = this.measureComposition(visibleObjects);
    this.debugComposition(placements, this.compositionBounds);
    return this.compositionBounds;
  }

  getCompositionBounds() {
    return this.compositionBounds;
  }

  getHeroObject() {
    return this.heroObject;
  }

  private generateTwoSideFloatingLayout(objects: HeroObject[]) {
    const placements: FloatingPlacementWithObject[] = [];

    objects.forEach((object, index) => {
      const side = this.sideForIndex(index, placements);
      const placement = this.findPlacement(object, index, side, placements);
      placements.push({ ...placement, object });
    });

    return placements;
  }

  private sideForIndex(index: number, placements: FloatingPlacementWithObject[]): 'left' | 'right' {
    const leftCount = placements.filter((placement) => placement.side === 'left').length;
    const rightCount = placements.length - leftCount;

    if (leftCount < rightCount) return 'left';
    if (rightCount < leftCount) return 'right';
    return index % 2 === 0 ? 'left' : 'right';
  }

  private findPlacement(
    object: HeroObject,
    index: number,
    side: 'left' | 'right',
    existing: FloatingPlacementWithObject[],
  ): FloatingPlacement {
    const random = this.createRandom(this.seedForObject(object, index));
    const radius = this.targetRadius(object, random);
    let bestPlacement: FloatingPlacement | null = null;
    let bestDistance = -Infinity;

    for (let attempt = 0; attempt < PLACEMENT_ATTEMPTS; attempt += 1) {
      const candidate = this.createCandidate(random, side, radius);
      const nearestDistance = this.nearestDistance(candidate, existing);

      if (this.isValidPlacement(candidate, existing) && nearestDistance > bestDistance) {
        bestPlacement = candidate;
        bestDistance = nearestDistance;
      }

      if (!bestPlacement && nearestDistance > bestDistance) {
        bestPlacement = candidate;
        bestDistance = nearestDistance;
      }
    }

    return bestPlacement ?? this.createFallbackPlacement(side, radius, index);
  }

  private createCandidate(random: () => number, side: 'left' | 'right', radius: number): FloatingPlacement {
    const bounds = SIDE_BOUNDS[side];
    const x = this.range(random, bounds.minX, bounds.maxX);
    const y = this.range(random, Y_BOUNDS.min, Y_BOUNDS.max);
    const z = this.range(random, Z_BOUNDS.min, Z_BOUNDS.max);

    return {
      radius,
      rotationX: this.range(random, -0.08, 0.08),
      rotationY: this.range(random, -Math.PI, Math.PI),
      rotationZ: this.range(random, -0.04, 0.04),
      side,
      x: side === 'left' ? Math.min(x, -CENTER_DEAD_ZONE - radius) : Math.max(x, CENTER_DEAD_ZONE + radius),
      y,
      z,
    };
  }

  private createFallbackPlacement(side: 'left' | 'right', radius: number, index: number): FloatingPlacement {
    const slot = Math.floor(index / 2);
    const bounds = SIDE_BOUNDS[side];
    const x = side === 'left'
      ? bounds.minX + (slot % 2) * 1.25
      : bounds.maxX - (slot % 2) * 1.25;
    const y = Y_BOUNDS.min + (slot % 3) * 1.35;

    return {
      radius,
      rotationX: 0,
      rotationY: side === 'left' ? Math.PI * 0.18 : -Math.PI * 0.18,
      rotationZ: 0,
      side,
      x,
      y,
      z: slot % 2 === 0 ? -0.8 : 0.8,
    };
  }

  private isValidPlacement(candidate: FloatingPlacement, existing: FloatingPlacementWithObject[]) {
    if (Math.abs(candidate.x) < CENTER_DEAD_ZONE + candidate.radius) return false;

    return existing.every((placement) => {
      const requiredDistance = (candidate.radius + placement.radius) * MIN_DISTANCE_MULTIPLIER;
      return this.visualDistance(candidate, placement) >= requiredDistance;
    });
  }

  private nearestDistance(candidate: FloatingPlacement, existing: FloatingPlacementWithObject[]) {
    if (!existing.length) return Infinity;

    return existing.reduce((nearest, placement) => (
      Math.min(nearest, this.visualDistance(candidate, placement))
    ), Infinity);
  }

  private visualDistance(left: FloatingPlacement, right: FloatingPlacement) {
    const dx = left.x - right.x;
    const dy = left.y - right.y;
    const dz = (left.z - right.z) * 0.52;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private placeFloatingObject(object: HeroObject, placement: FloatingPlacement) {
    this.applyScale(object, placement.radius);
    object.rootNode.position.set(placement.x, placement.y, placement.z);
    object.rootNode.rotation.set(placement.rotationX, placement.rotationY, placement.rotationZ);
    object.rootNode.computeWorldMatrix(true);
  }

  private applyScale(object: HeroObject, targetRadius: number) {
    const radius = this.rawRadius(object);
    const multiplier = targetRadius / Math.max(radius, 0.001);
    object.rootNode.scaling.setAll(Math.min(Math.max(multiplier, 0.16), 3.6));
  }

  private targetRadius(object: HeroObject, random: () => number) {
    const baseRadius = object.metadata.layout?.targetRadius
      ?? CATEGORY_RADIUS[object.metadata.category ?? 'Decoration']
      ?? 0.56;
    const jitter = this.range(random, 0.9, 1.08);
    return baseRadius * (object.metadata.preferredScale ?? 1) * jitter;
  }

  private priority(object: HeroObject) {
    return (object.metadata.priority ?? 0) + this.visualWeightObject(object) * 0.04;
  }

  private visualWeightObject(object: HeroObject) {
    return this.rawRadius(object) * 2.2 + this.rawHeight(object) * 0.28;
  }

  private storeRestingTransform(object: HeroObject) {
    object.originalTransform = {
      position: object.rootNode.position.clone(),
      rotation: object.rootNode.rotation.clone(),
      scaling: object.rootNode.scaling.clone(),
    };
  }

  private measureComposition(objects: HeroObject[]) {
    const meshes = objects.flatMap((object) => object.meshes).filter((mesh) => mesh.isEnabled() && mesh.getTotalVertices() > 0);

    if (!meshes.length) {
      return {
        maximum: Vector3.One(),
        minimum: Vector3.One().scale(-1),
      };
    }

    return meshes.reduce<HeroCompositionBounds>((current, mesh) => {
      const meshBounds = mesh.getHierarchyBoundingVectors(true);
      return {
        maximum: Vector3.Maximize(current.maximum, meshBounds.max),
        minimum: Vector3.Minimize(current.minimum, meshBounds.min),
      };
    }, {
      maximum: new Vector3(-Infinity, -Infinity, -Infinity),
      minimum: new Vector3(Infinity, Infinity, Infinity),
    });
  }

  private debugComposition(placements: FloatingPlacementWithObject[], bounds: HeroCompositionBounds | null) {
    const rows = placements.map((placement) => ({
      name: placement.object.metadata.name,
      nearestNeighborDistance: this.round(this.nearestDistance(placement, placements.filter((item) => item !== placement))),
      radius: this.round(placement.radius),
      scale: this.round(placement.object.rootNode.scaling.x),
      side: placement.side,
      x: this.round(placement.x),
      y: this.round(placement.y),
      z: this.round(placement.z),
    }));
    const compositionWidth = bounds ? bounds.maximum.x - bounds.minimum.x : 0;
    const compositionHeight = bounds ? bounds.maximum.y - bounds.minimum.y : 0;
    const compositionDepth = bounds ? bounds.maximum.z - bounds.minimum.z : 0;

    console.groupCollapsed('[Hero3D] Two-side floating layout');
    console.table(rows);
    console.info('[Hero3D] Composition', {
      centerDeadZone: CENTER_DEAD_ZONE,
      compositionDepth: this.round(compositionDepth),
      compositionHeight: this.round(compositionHeight),
      compositionWidth: this.round(compositionWidth),
      minDistanceMultiplier: MIN_DISTANCE_MULTIPLIER,
    });
    console.groupEnd();
  }

  private rawHeight(object: HeroObject) {
    return Math.max(object.metadata.height ?? this.dimension(object.metadata.boundingBox, 'y'), 0.1);
  }

  private rawRadius(object: HeroObject) {
    return Math.max(object.metadata.radius ?? Math.max(
      this.dimension(object.metadata.boundingBox, 'x'),
      this.dimension(object.metadata.boundingBox, 'z'),
    ) / 2, 0.1);
  }

  private dimension(bounds: HeroBounds | null, axis: 'x' | 'y' | 'z') {
    if (!bounds) return 1;
    return Math.abs(bounds.maximum[axis] - bounds.minimum[axis]);
  }

  private seedForObject(object: HeroObject, index: number) {
    const source = `${object.metadata.name}:${object.metadata.category ?? 'Unknown'}:${index}`;
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

  private round(value: number) {
    return Math.round(value * 1000) / 1000;
  }
}
