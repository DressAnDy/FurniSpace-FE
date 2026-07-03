import type { ProductPlacementMode, Vector3State } from '@/features/ThreeD/components/RoomPreview3D';

export type RoomPlannerScenePayload = {
  schemaVersion: number;
  editorVersion: string;
  unit: string;
  layout: RoomPlannerBlueprintLayout | RoomPlannerWallBoundaryLayout;
  objects: RoomPlannerObject[];
  layers: Array<{
    layerId: string;
    name: string;
    visible: boolean;
    locked: boolean;
  }>;
  stylePreset: string | null;
  camera: {
    mode: 'ORBIT';
    viewMode?: 'TWO_D' | 'THREE_D';
    position: Vector3State;
    target: Vector3State;
    zoom: number | null;
  };
  lighting: {
    preset: 'DEFAULT';
    environment: string;
    ambientIntensity: number | null;
    directionalIntensity: number | null;
    customLights: unknown[];
  };
  validation: {
    status: 'NOT_VALIDATED' | 'VALID' | 'HAS_WARNINGS' | 'HAS_ERRORS';
    warnings: unknown[];
    errors: unknown[];
    lastValidatedAt: string | null;
  };
  editorState: {
    activeTool?: string;
    selectedObjectId?: string | null;
    selectedObjectIds?: string[];
    selectedRoomItem?: unknown | null;
    viewMode?: '2d' | '3d';
    gridEnabled?: boolean;
    snapEnabled?: boolean;
    snapSettings?: {
      gridSize: number;
    };
    hideLabels?: boolean;
    sidebarCollapsed?: boolean;
  } | null;
};

export type RoomPlannerBlueprintLayout = {
  type: 'BLUEPRINT_WALL_GRAPH';
    isClosed: boolean;
    areaSqFt: number;
    areaSqm: number;
    wallHeight: number;
    wallThickness: number;
    floorMaterialId: string;
    wallMaterialId: string;
    points: Array<{
      pointId: string;
      x: number;
      y: number;
    }>;
    walls: Array<{
      wallId: string;
      startPointId: string;
      endPointId: string;
      height: number;
      thickness: number;
      visible: boolean;
      locked: boolean;
      style: {
        materialId: string;
        color: string | null;
        textureFileId: string | null;
        textureUrlSnapshot: string | null;
      };
    }>;
    doors: RoomPlannerOpening[];
    windows: Array<RoomPlannerOpening & { sillHeight: number }>;
    openings: RoomPlannerOpening[];
    floor: {
      materialId: string;
      color: string | null;
      textureFileId: string | null;
      textureUrlSnapshot: string | null;
      rotation: number;
      scale: number;
    };
};

export type RoomPlannerWallBoundaryLayout = {
  type: 'WALL_BOUNDARY';
  isClosed: boolean;
  areaSqm?: number | null;
  defaultWallHeight?: number | null;
  defaultWallThickness?: number | null;
  wallHeight?: number | null;
  wallThickness?: number | null;
  floorMaterialId?: string | null;
  wallMaterialId?: string | null;
  boundary: Array<{
    x: number;
    y?: number;
    z?: number;
  }>;
  walls: Array<{
    wallId: string;
    start?: {
      x: number;
      y?: number;
      z?: number;
    };
    end?: {
      x: number;
      y?: number;
      z?: number;
    };
    height?: number | null;
    thickness?: number | null;
    visible?: boolean;
    locked?: boolean;
    style?: Record<string, unknown>;
  }>;
  openings: RoomPlannerOpening[];
  floor: {
    materialId?: string | null;
    materialCode?: string | null;
    color: string | null;
    textureFileId: string | null;
    rotation: number | null;
    scale: number | null;
  };
};

export type RoomPlannerOpening = {
  openingId: string;
  type: 'DOOR' | 'WINDOW' | 'OPENING';
  wallId: string;
  offset: number;
  width: number;
  height: number;
  floorOffset?: number;
  swingDirection?: 'IN_LEFT' | 'IN_RIGHT';
  isOpen?: boolean;
  locked: boolean;
};

export type RoomPlannerObject = {
  objectId: string;
  proposalItemId?: string | null;
  productVersionId?: string | null;
  productModelId?: string | null;
  objectType?: 'FURNITURE';
  name?: string | null;
  transform?: {
    position?: Vector3State;
    rotation?: Vector3State;
    scale?: Vector3State;
  };
  placement?: {
    mode?: ProductPlacementMode;
    heightOffset?: number | null;
    supportObjectId?: string | null;
    mountedWallId?: string | null;
  };
  dimensionsSnapshot?: {
    width?: number | null;
    height?: number | null;
    depth?: number | null;
    unit?: string | null;
  };
  footprintSnapshot?: unknown | null;
  visualSnapshot?: {
    thumbnailFileId?: string | null;
    thumbnailUrlSnapshot?: string | null;
    color?: string | null;
    material?: string | null;
    finish?: string | null;
  };
  modelSnapshot?: {
    modelFileId?: string | null;
    format?: string | null;
    modelUrlSnapshot?: string | null;
  };
  materialOverrides?: Record<string, unknown>;
  visible?: boolean;
  locked?: boolean;
};
