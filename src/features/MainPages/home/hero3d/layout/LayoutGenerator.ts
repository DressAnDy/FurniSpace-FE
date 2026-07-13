import { Vector3 } from 'babylonjs';

import type {
  HeroBounds,
  HeroCompositionBounds,
  HeroModelCategory,
  HeroObject,
} from '@/features/MainPages/home/hero3d/types';

type HeroRole = 'accentChair' | 'coffeeTable' | 'floorLamp' | 'plant' | 'sideTable' | 'sofa';

type HeroItem = {
  object: HeroObject;
  rawHeight: number;
  rawRadius: number;
  role: HeroRole;
};

type HeroPlacement = {
  radius: number;
  rotationY: number;
  x: number;
  z: number;
};

const CATEGORY_PRIORITY: Record<HeroModelCategory, number> = {
  Sofa: 100,
  Chair: 82,
  CoffeeTable: 86,
  DiningTable: 70,
  Plant: 58,
  Lamp: 56,
  Pouf: 44,
  Cabinet: 54,
  Decoration: 38,
};

export class LayoutGenerator {
  private compositionBounds: HeroCompositionBounds | null = null;
  private heroObject: HeroObject | null = null;

  layout(objects: HeroObject[]) {
    this.compositionBounds = null;
    this.heroObject = null;
    if (!objects.length) return null;

    objects.forEach((object) => object.rootNode.setEnabled(false));

    const items = this.createHeroItems(objects);
    items.forEach((item) => {
      item.object.rootNode.setEnabled(true);
      this.place(item);
      this.storeRestingTransform(item.object);
    });

    this.heroObject = items.find((item) => item.role === 'sofa')?.object ?? items[0]?.object ?? null;
    this.compositionBounds = this.measureComposition(items.map((item) => item.object));
    return this.compositionBounds;
  }

  getCompositionBounds() {
    return this.compositionBounds;
  }

  getHeroObject() {
    return this.heroObject;
  }

  private createHeroItems(objects: HeroObject[]) {
    const enabledObjects = objects.filter((object) => object.metadata.layout?.enabled !== false);
    const sofa = this.findByRole(enabledObjects, 'sofa') ?? this.findLargest(enabledObjects);
    const selected = new Map<HeroRole, HeroObject>();

    if (sofa) selected.set('sofa', sofa);
    this.pickRole(enabledObjects, selected, 'accentChair');
    this.pickRole(enabledObjects, selected, 'coffeeTable');
    this.pickRole(enabledObjects, selected, 'plant');
    this.pickRole(enabledObjects, selected, 'floorLamp');
    this.pickRole(enabledObjects, selected, 'sideTable');

    return [...selected.entries()].map(([role, object]) => ({
      object,
      rawHeight: this.rawHeight(object),
      rawRadius: this.rawRadius(object),
      role,
    }));
  }

  private pickRole(objects: HeroObject[], selected: Map<HeroRole, HeroObject>, role: HeroRole) {
    const object = this.findByRole(objects, role);
    if (object && ![...selected.values()].includes(object)) selected.set(role, object);
  }

  private place(item: HeroItem) {
    const placement = this.getPlacement(item.role);
    this.applyScale(item, placement.radius);

    const height = this.height(item.object);
    item.object.rootNode.position.set(placement.x, height / 2, placement.z);
    item.object.rootNode.rotation.set(0, placement.rotationY, 0);
  }

  private getPlacement(role: HeroRole): HeroPlacement {
    const placements: Record<HeroRole, HeroPlacement> = {
      sofa: {
        radius: 2.82,
        rotationY: Math.PI / 2,
        x: 0.52,
        z: 0,
      },
      accentChair: {
        radius: 1.08,
        rotationY: Math.PI / 2 - 0.24,
        x: -2.05,
        z: -0.12,
      },
      coffeeTable: {
        radius: 0.78,
        rotationY: Math.PI / 2,
        x: 0.18,
        z: -1.08,
      },
      sideTable: {
        radius: 0.42,
        rotationY: Math.PI / 2 + 0.08,
        x: 1.95,
        z: -0.38,
      },
      plant: {
        radius: 0.56,
        rotationY: Math.PI / 2,
        x: -1.24,
        z: 0.86,
      },
      floorLamp: {
        radius: 0.42,
        rotationY: Math.PI / 2 + 0.06,
        x: 2.62,
        z: 0.92,
      },
    };

    return placements[role];
  }

  private findByRole(objects: HeroObject[], role: HeroRole) {
    return objects
      .filter((object) => this.roleForObject(object) === role)
      .sort((left, right) => this.semanticScore(right) - this.semanticScore(left))[0] ?? null;
  }

  private roleForObject(object: HeroObject): HeroRole | null {
    const name = object.metadata.name.replace(/\s+/g, '').toLowerCase();

    if (name.includes('sofa') || object.metadata.category === 'Sofa') return 'sofa';
    if (name.includes('accentchair') || name.includes('chair')) return 'accentChair';
    if (name.includes('coffeetable') || object.metadata.category === 'CoffeeTable') return 'coffeeTable';
    if (name.includes('sidetable') || name.includes('marble')) return 'sideTable';
    if (name.includes('floorlamp') || name.includes('lamp')) return 'floorLamp';
    if (name.includes('plant') || object.metadata.category === 'Plant') return 'plant';
    return null;
  }

  private findLargest(objects: HeroObject[]) {
    return [...objects].sort((left, right) => this.visualWeight(right) - this.visualWeight(left))[0] ?? null;
  }

  private applyScale(item: HeroItem, targetRadius: number) {
    const multiplier = (targetRadius * (item.object.metadata.preferredScale ?? 1)) / Math.max(item.rawRadius, 0.001);
    item.object.rootNode.scaling.setAll(Math.min(Math.max(multiplier, 0.12), 7));
  }

  private semanticScore(object: HeroObject) {
    const categoryWeight = object.metadata.category ? CATEGORY_PRIORITY[object.metadata.category] : 0;
    return categoryWeight + (object.metadata.priority ?? 0) + this.visualWeightObject(object) * 0.1;
  }

  private visualWeight(item: HeroObject) {
    return this.visualWeightObject(item);
  }

  private visualWeightObject(object: HeroObject) {
    return this.rawRadius(object) * 2.8 + this.rawHeight(object) * 0.42;
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

  private height(object: HeroObject) {
    return Math.max(this.rawHeight(object) * object.rootNode.scaling.y, 0.1);
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
}
