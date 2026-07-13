import type { AbstractMesh, BoundingInfo, TransformNode, Vector3 } from 'babylonjs';

export type Vector3Data = {
  x: number;
  y: number;
  z: number;
};

export type HeroBounds = {
  maximum: Vector3Data;
  minimum: Vector3Data;
};

export type HeroCompositionBounds = {
  maximum: Vector3;
  minimum: Vector3;
};

export type HeroModelCategory =
  | 'Cabinet'
  | 'Chair'
  | 'CoffeeTable'
  | 'Decoration'
  | 'DiningTable'
  | 'Lamp'
  | 'Plant'
  | 'Pouf'
  | 'Sofa';

export type HeroModelLayoutOverride = {
  enabled?: boolean;
  rotationY?: number;
  targetRadius?: number;
  x?: number;
  y?: number;
  z?: number;
};

export type HeroModelMetadata = {
  boundingBox: HeroBounds | null;
  category?: HeroModelCategory;
  center: Vector3Data | null;
  estimatedSize: number | null;
  meshCount: number | null;
  name: string;
  nodeCount: number | null;
  path: string;
  layout?: HeroModelLayoutOverride;
  preferredScale?: number;
  priority?: number;
  radius: number | null;
  height: number | null;
  sceneGroup?: string;
};

export type HeroTransform = {
  position: Vector3;
  rotation: Vector3;
  scaling: Vector3;
};

export type HeroObject = {
  boundingInfo: BoundingInfo;
  mesh: AbstractMesh | null;
  meshes: AbstractMesh[];
  metadata: HeroModelMetadata;
  originalTransform: HeroTransform;
  pivot: Vector3;
  rootNode: TransformNode;
};

export type HeroModelManifest = {
  generatedAt: string;
  models: Array<Pick<HeroModelMetadata, 'category' | 'layout' | 'name' | 'path' | 'preferredScale' | 'priority' | 'sceneGroup'>>;
  root: string;
};

export type HeroAnimationPhase = 'idle' | 'wakeUp' | 'lift' | 'vortex' | 'highlight' | 'return' | 'settle';

export type HeroAnimationObject = {
  height: number;
  index: number;
  phaseOffset: number;
  radius: number;
  rotationSpeed: number;
  size: number;
  vortexRadius: number;
};
