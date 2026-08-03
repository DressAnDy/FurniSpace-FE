import type { RoomLayoutState } from '@/features/ThreeD/types/roomLayout.types';
import type { ProductPlacementMode } from '@/features/ThreeD/components/RoomPreview3D';

export type BuildingLevelId = string;
export type BuildingLevelVisibility = 'all' | 'site' | BuildingLevelId;

export type Vector3State = {
  x: number;
  y: number;
  z: number;
};

export type BuildingPlacementSurface = {
  bounds?: {
    maxX: number;
    maxZ: number;
    minX: number;
    minZ: number;
  };
  depth: number;
  elevation: number;
  id: string;
  label: string;
  levelId: BuildingLevelId | 'site';
  position: Vector3State;
  type: 'YARD' | 'FLOOR' | 'BALCONY';
  width: number;
};

export type BuildingSurfaceType = BuildingPlacementSurface['type'] | 'WALL' | 'CEILING' | 'OBJECT';

export type BuildingLevel = {
  depth: number;
  elevation: number;
  footprintOffset: {
    x: number;
    z: number;
  };
  height: number;
  id: BuildingLevelId;
  label: string;
  layout?: RoomLayoutState | null;
  projectAreaId?: string | null;
  wallHeight: number;
  width: number;
};

export type BuildingTestScene = {
  building: {
    depth: number;
    levels: BuildingLevel[];
    position: Vector3State;
    width: number;
  };
  camera: {
    target: Vector3State;
  };
  site: {
    depth: number;
    width: number;
  };
  surfaces: BuildingPlacementSurface[];
};

export type BuildingProductModel = {
  categoryId?: string | null;
  categoryName?: string | null;
  color?: string | null;
  depth?: number | null;
  fileId?: string;
  height?: number | null;
  id: string;
  material?: string | null;
  modelUrl: string;
  name: string;
  productId?: string;
  productVersionId?: string;
  scale?: Vector3State;
  thumbnailUrl?: string | null;
  width?: number | null;
};

export type PlacedBuildingProduct = BuildingProductModel & {
  dimensionsSnapshot?: {
    depth: number | null;
    height: number | null;
    unit: string;
    width: number | null;
  };
  heightOffset?: number;
  levelId: BuildingLevelVisibility;
  locked?: boolean;
  modelSnapshot?: {
    format?: string | null;
    modelFileId?: string | null;
    modelUrlSnapshot: string;
  };
  mountedWallId?: string | null;
  placementMode?: ProductPlacementMode;
  placementRules?: {
    boundaryEnabled: boolean;
    collisionEnabled: boolean;
    snapToSurface: boolean;
  };
  position: Vector3State;
  proposalItemId?: string | null;
  rotation: Vector3State;
  sceneObjectId: string;
  scale: Vector3State;
  surfaceId: string;
  surfaceType?: BuildingSurfaceType;
  supportObjectId?: string | null;
  visible?: boolean;
  visualSnapshot?: {
    color: string | null;
    finish: string | null;
    material: string | null;
  };
};
