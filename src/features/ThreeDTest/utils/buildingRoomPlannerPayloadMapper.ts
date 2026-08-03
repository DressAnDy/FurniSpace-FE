import type { DoorSwingDirection, RoomLayoutState, RoomOpeningItem } from '@/features/ThreeD/types/roomLayout.types';
import type { RoomPlannerScenePayload } from '@/features/ThreeD/types/roomPlannerScene.types';
import type {
  BuildingLevel,
  BuildingPlacementSurface,
  BuildingTestScene,
  PlacedBuildingProduct,
  Vector3State,
} from '@/features/ThreeDTest/schemas/buildingScene.types';
import {
  createDefaultBuildingTestScene,
  createLevelFloorSurface,
  getLevelCenter,
} from '@/features/ThreeDTest/utils/buildingTestSceneFactory';

type BlueprintLayoutDocument = {
  floors: BlueprintFloorDocument[];
  id: string;
  metadata?: Record<string, unknown>;
  name?: string | null;
  northDirection?: number | null;
  origin?: { pointId?: string; x: number; y?: number | null; z: number } | null;
  scale?: number | null;
  unit: string;
};

type BlueprintFloorDocument = {
  balconies: Array<Record<string, unknown>>;
  beams: Array<Record<string, unknown>>;
  columns: Array<Record<string, unknown>>;
  doors: ReturnType<typeof mapOpeningToDocument>[];
  elevation?: number | null;
  floorHeight?: number | null;
  id: string;
  levelIndex?: number | null;
  name?: string | null;
  openings: ReturnType<typeof mapOpeningToDocument>[];
  points: Array<{ pointId: string; x: number; y?: number | null; z: number }>;
  projectAreaId: string;
  rooms: Array<Record<string, unknown>>;
  slabThickness?: number | null;
  slabs: Array<Record<string, unknown>>;
  stairs: Array<Record<string, unknown>>;
  walls: Array<{
    end?: { pointId?: string; x: number; y?: number | null; z: number };
    endPointId?: string | null;
    height?: number | null;
    locked?: boolean;
    start?: { pointId?: string; x: number; y?: number | null; z: number };
    startPointId?: string | null;
    style?: Record<string, unknown>;
    thickness?: number | null;
    visible?: boolean;
    wallId: string;
  }>;
  windows: ReturnType<typeof mapOpeningToDocument>[];
  yards: Array<Record<string, unknown>>;
};

type BuildingRoomPlannerPayload = Omit<RoomPlannerScenePayload, 'layout' | 'objects'> & {
  blueprintLayout: BlueprintLayoutDocument;
  objects: Array<{
    dimensionsSnapshot?: Record<string, unknown> | null;
    floorId: string;
    locked: boolean;
    materialOverrides: Record<string, unknown>;
    modelSnapshot?: Record<string, unknown> | null;
    name?: string | null;
    objectId: string;
    objectType: 'FURNITURE';
    placement?: Record<string, unknown> | null;
    footprintSnapshot?: unknown | null;
    productModelId?: string | null;
    productVersionId: string;
    proposalItemId?: string | null;
    transform: {
      position: Vector3State;
      rotation: Vector3State;
      scale: Vector3State;
    };
    visible: boolean;
    visualSnapshot?: Record<string, unknown> | null;
  }>;
};

type HydrateBuildingPayload = Partial<BuildingRoomPlannerPayload> & {
  blueprintLayout?: Partial<BlueprintLayoutDocument> | null;
};

const LEVEL_STACK_VERTICAL_GAP = 0.14;
const LEVEL_STACK_ELEVATION_EPSILON = 0.12;

function getFloorId(level: BuildingLevel) {
  if (level.id.startsWith('floor-')) {
    return level.id;
  }

  return `floor-${level.projectAreaId ?? level.id}`;
}

function getLevelIdFromFloorId(floorId: string, scene: BuildingTestScene) {
  const level = scene.building.levels.find((candidate) => getFloorId(candidate) === floorId);

  return level?.id ?? floorId.replace(/^floor-/, '');
}

function isDoorSwingDirection(value: unknown): value is DoorSwingDirection {
  return value === 'IN_LEFT' || value === 'IN_RIGHT';
}

function getNumberValue(value: unknown, fallback: number) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === 'string') {
    const parsedValue = Number(value.trim());

    return Number.isFinite(parsedValue) ? parsedValue : fallback;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const nestedValue =
      record.$numberDecimal ??
      record.$numberDouble ??
      record.$numberInt ??
      record.$numberLong ??
      record.value ??
      record.Value;

    if (nestedValue !== undefined) {
      return getNumberValue(nestedValue, fallback);
    }
  }

  return fallback;
}

function getStringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : '';
}

function getPointById(points: RoomLayoutState['points'], pointId: string) {
  return points.find((point) => point.id === pointId) ?? null;
}

function mapPointToDocument(point: RoomLayoutState['points'][number]) {
  return {
    pointId: point.id,
    x: point.x,
    y: 0,
    z: point.y,
  };
}

function hydrateDoorOpening(opening: Record<string, unknown>, index: number) {
  return {
    height: getNumberValue(opening.height, 2.1),
    id: getStringValue(opening.openingId) || getStringValue(opening.id) || `door-${index + 1}`,
    offset: getNumberValue(opening.offsetFromWallStart ?? opening.offset, 0),
    swingDirection: isDoorSwingDirection(opening.swingDirection) ? opening.swingDirection : 'IN_LEFT',
    type: 'DOOR' as const,
    wallId: getStringValue(opening.wallId),
    width: getNumberValue(opening.width, 0.9),
  };
}

function hydrateWindowOpening(opening: Record<string, unknown>, index: number) {
  return {
    height: getNumberValue(opening.height, 1.1),
    id: getStringValue(opening.openingId) || getStringValue(opening.id) || `window-${index + 1}`,
    offset: getNumberValue(opening.offsetFromWallStart ?? opening.offset, 0),
    sillHeight: getNumberValue(opening.sillHeight ?? opening.floorOffset, 0.9),
    type: 'WINDOW' as const,
    wallId: getStringValue(opening.wallId),
    width: getNumberValue(opening.width, 1.2),
  };
}

function hydrateGenericOpening(opening: Record<string, unknown>, index: number) {
  return {
    height: getNumberValue(opening.height, 2.1),
    id: getStringValue(opening.openingId) || getStringValue(opening.id) || `opening-${index + 1}`,
    offset: getNumberValue(opening.offsetFromWallStart ?? opening.offset, 0),
    type: 'OPENING' as const,
    wallId: getStringValue(opening.wallId),
    width: getNumberValue(opening.width, 1),
  };
}

function mergeOpeningsByType(
  primaryOpenings: Array<Record<string, unknown>> | undefined,
  mixedOpenings: Array<Record<string, unknown>> | undefined,
  type: 'DOOR' | 'WINDOW' | 'OPENING',
) {
  const primary = (primaryOpenings ?? []).filter((opening) => !opening.type || opening.type === type);
  const mixed = (mixedOpenings ?? []).filter((opening) => opening.type === type);
  const seenIds = new Set<string>();

  return [...primary, ...mixed].filter((opening, index) => {
    const id = getStringValue(opening.openingId) || getStringValue(opening.id) || `${type}-${index}`;

    if (seenIds.has(id)) {
      return false;
    }

    seenIds.add(id);
    return true;
  });
}

function getPointBounds(points: RoomLayoutState['points']) {
  if (!points.length) {
    return null;
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    centerX: (minX + maxX) / 2,
    centerZ: (minY + maxY) / 2,
    depth: maxY - minY,
    width: maxX - minX,
  };
}

function hydrateFloorLayout(
  floor: BlueprintFloorDocument,
  fallbackLevel: BuildingLevel,
  metadataLayout: RoomLayoutState | null | undefined,
): RoomLayoutState {
  const points = floor.points?.map((point) => ({ id: point.pointId, x: point.x, y: point.z })) ?? [];
  const wallHeight = floor.walls?.[0]?.height ?? metadataLayout?.wallHeight ?? fallbackLevel.wallHeight;
  const wallThickness = floor.walls?.[0]?.thickness ?? metadataLayout?.wallThickness ?? 0.16;
  const floorWalls = floor.walls?.map((wall) => ({
    endPointId: wall.endPointId ?? wall.end?.pointId ?? '',
    height: wall.height ?? wallHeight,
    id: wall.wallId,
    startPointId: wall.startPointId ?? wall.start?.pointId ?? '',
    thickness: wall.thickness ?? wallThickness,
    type: 'WALL' as const,
  })).filter((wall) => wall.startPointId && wall.endPointId) ?? [];

  if (!points.length || !floorWalls.length) {
    return metadataLayout ?? {
      doors: [],
      floorMaterialId: 'wood-floor',
      openings: [],
      points,
      unit: 'm',
      wallHeight,
      wallMaterialId: 'wall-base',
      wallThickness,
      walls: floorWalls,
      windows: [],
    };
  }

  return {
    doors: mergeOpeningsByType(floor.doors as Array<Record<string, unknown>>, floor.openings as Array<Record<string, unknown>>, 'DOOR')
      .map(hydrateDoorOpening),
    floorMaterialId: metadataLayout?.floorMaterialId ?? 'wood-floor',
    openings: mergeOpeningsByType(undefined, floor.openings as Array<Record<string, unknown>>, 'OPENING')
      .map(hydrateGenericOpening),
    points,
    unit: 'm',
    wallHeight,
    wallMaterialId: metadataLayout?.wallMaterialId ?? 'wall-base',
    wallThickness,
    walls: floorWalls,
    windows: mergeOpeningsByType(floor.windows as Array<Record<string, unknown>>, floor.openings as Array<Record<string, unknown>>, 'WINDOW')
      .map(hydrateWindowOpening),
  };
}

function mapOpeningToDocument(opening: RoomOpeningItem) {
  return {
    floorOffset: opening.type === 'WINDOW' ? opening.sillHeight : 0,
    height: opening.height,
    isOpen: true,
    locked: false,
    openingId: opening.id,
    offset: opening.offset,
    offsetFromWallStart: opening.offset,
    sillHeight: opening.type === 'WINDOW' ? opening.sillHeight : null,
    swingDirection: opening.type === 'DOOR' ? opening.swingDirection : null,
    type: opening.type,
    wallId: opening.wallId,
    width: opening.width,
  };
}

function mapLevelToFloor(level: BuildingLevel, index: number): BlueprintFloorDocument {
  const layout = level.layout;
  const points = layout?.points ?? [];

  return {
    balconies: [],
    beams: [],
    columns: [],
    doors: layout?.doors.map(mapOpeningToDocument) ?? [],
    elevation: level.elevation,
    floorHeight: level.height,
    id: getFloorId(level),
    levelIndex: index,
    name: level.label,
    openings: layout?.openings.map(mapOpeningToDocument) ?? [],
    points: points.map(mapPointToDocument),
    projectAreaId: level.projectAreaId ?? level.id,
    rooms: [],
    slabThickness: 0.28,
    slabs: [],
    stairs: [],
    walls: layout?.walls.map((wall) => {
      const startPoint = getPointById(points, wall.startPointId);
      const endPoint = getPointById(points, wall.endPointId);

      return {
        end: endPoint ? mapPointToDocument(endPoint) : undefined,
        endPointId: wall.endPointId,
        height: wall.height,
        locked: false,
        start: startPoint ? mapPointToDocument(startPoint) : undefined,
        startPointId: wall.startPointId,
        style: {
          color: null,
          materialCode: null,
          materialId: layout.wallMaterialId,
          textureFileId: null,
          textureRotation: 0,
          textureScale: 1,
          textureUrlSnapshot: null,
        },
        thickness: wall.thickness,
        visible: true,
        wallId: wall.id,
      };
    }) ?? [],
    windows: layout?.windows.map(mapOpeningToDocument) ?? [],
    yards: [],
  };
}

function getObjectFloorId(product: PlacedBuildingProduct, sceneData: BuildingTestScene) {
  const level = sceneData.building.levels.find((candidate) => candidate.id === product.levelId);

  if (level) {
    return getFloorId(level);
  }

  const firstLevel = sceneData.building.levels[0];

  return getFloorId(firstLevel ?? {
    depth: sceneData.building.depth,
    elevation: 0,
    footprintOffset: { x: 0, z: 0 },
    height: 3,
    id: 'site',
    label: 'Site',
    projectAreaId: 'site',
    wallHeight: 2.8,
    width: sceneData.building.width,
  });
}

function mapObjectToDocument(product: PlacedBuildingProduct, sceneData: BuildingTestScene): BuildingRoomPlannerPayload['objects'][number] {
  return {
    dimensionsSnapshot: {
      depth: product.dimensionsSnapshot?.depth ?? product.depth ?? null,
      height: product.dimensionsSnapshot?.height ?? product.height ?? null,
      unit: 'cm',
      width: product.dimensionsSnapshot?.width ?? product.width ?? null,
    },
    floorId: getObjectFloorId(product, sceneData),
    locked: product.locked ?? false,
    materialOverrides: {},
    modelSnapshot: null,
    name: product.name,
    objectId: product.sceneObjectId,
    objectType: 'FURNITURE',
    placement: {
      heightOffset: product.heightOffset ?? product.position.y,
      mode: product.placementMode ?? 'FLOOR',
      mountedWallId: product.mountedWallId ?? null,
      supportObjectId: product.supportObjectId ?? null,
    },
    footprintSnapshot: null,
    productVersionId: product.productVersionId ?? product.id,
    proposalItemId: product.proposalItemId ?? null,
    transform: {
      position: product.position,
      rotation: product.rotation,
      scale: product.scale,
    },
    visible: product.visible ?? true,
    visualSnapshot: null,
  };
}

export function createBuildingRoomPlannerPayload(input: {
  activeLevel: string;
  placedProducts: PlacedBuildingProduct[];
  sceneData: BuildingTestScene;
  sceneId: string;
  selectedProductId: string | null;
}): RoomPlannerScenePayload {
  const floors = input.sceneData.building.levels.map(mapLevelToFloor);
  const payload: BuildingRoomPlannerPayload = {
    blueprintLayout: {
      floors,
      id: `blueprint-${input.sceneId}`,
      metadata: {},
      name: 'Room Planner Blueprint',
      northDirection: 0,
      origin: { pointId: 'origin', x: 0, y: 0, z: 0 },
      scale: 1,
      unit: 'm',
    },
    camera: {
      mode: 'ORBIT',
      position: { x: 0, y: 8, z: -12 },
      target: input.sceneData.camera.target,
      viewMode: 'THREE_D',
      zoom: null,
    },
    editorState: {
      activeTool: input.activeLevel,
      gridEnabled: true,
      hideLabels: false,
      selectedObjectId: input.selectedProductId,
      selectedObjectIds: input.selectedProductId ? [input.selectedProductId] : [],
      snapEnabled: true,
      viewMode: '3d',
    },
    editorVersion: 'ROOM_PLANNER_BABYLON_BUILDING_V1',
    layers: floors.map((floor) => ({
      layerId: floor.id,
      locked: false,
      name: floor.name ?? floor.id,
      visible: true,
    })),
    lighting: {
      ambientIntensity: null,
      customLights: [],
      directionalIntensity: null,
      environment: 'DEFAULT',
      preset: 'DEFAULT',
    },
    objects: input.placedProducts.map((product) => mapObjectToDocument(product, input.sceneData)),
    schemaVersion: 3,
    stylePreset: null,
    unit: 'm',
    validation: {
      errors: [],
      lastValidatedAt: null,
      status: 'NOT_VALIDATED',
      warnings: [],
    },
  };

  return payload as unknown as RoomPlannerScenePayload;
}

function hydrateSurfaces(scene: BuildingTestScene, payload: HydrateBuildingPayload): BuildingPlacementSurface[] {
  const metadataSurfaces = payload.blueprintLayout?.metadata?.surfaces;

  if (Array.isArray(metadataSurfaces)) {
    return reconcileHydratedSurfaces(scene, metadataSurfaces as BuildingPlacementSurface[]);
  }

  return scene.building.levels.map((level) => createLevelFloorSurface(level, scene.building.position));
}

function getNextStackElevation(previousLevel: BuildingLevel) {
  return previousLevel.elevation + Math.max(previousLevel.height, previousLevel.wallHeight, 2.6) + LEVEL_STACK_VERTICAL_GAP;
}

function normalizeHydratedLevelStack(levels: BuildingLevel[]) {
  return levels.reduce<BuildingLevel[]>((stackedLevels, level, index) => {
    const previousLevel = stackedLevels[index - 1];
    const rawElevation = Number.isFinite(level.elevation) ? level.elevation : (index === 0 ? 0.16 : getNextStackElevation(previousLevel));

    if (!previousLevel) {
      return [...stackedLevels, { ...level, elevation: rawElevation }];
    }

    const minimumElevation = getNextStackElevation(previousLevel);
    const isFlattenedIntoPreviousLevel = rawElevation <= previousLevel.elevation + LEVEL_STACK_ELEVATION_EPSILON;

    return [
      ...stackedLevels,
      {
        ...level,
        elevation: isFlattenedIntoPreviousLevel ? Number(minimumElevation.toFixed(3)) : rawElevation,
      },
    ];
  }, []);
}

function reconcileHydratedSurfaces(scene: BuildingTestScene, surfaces: BuildingPlacementSurface[]) {
  const levelById = new Map(scene.building.levels.map((level) => [level.id, level]));

  return surfaces.map((surface) => {
    if (surface.type !== 'FLOOR') {
      return surface;
    }

    const level = levelById.get(surface.levelId);

    if (!level) {
      return surface;
    }

    const refreshedSurface = createLevelFloorSurface(level, scene.building.position);

    return {
      ...surface,
      bounds: refreshedSurface.bounds ?? surface.bounds,
      depth: refreshedSurface.depth,
      elevation: refreshedSurface.elevation,
      position: refreshedSurface.position,
      width: refreshedSurface.width,
    };
  });
}

function hydrateSceneData(payload: HydrateBuildingPayload): BuildingTestScene | null {
  const floors = payload.blueprintLayout?.floors;

  if (!Array.isArray(floors) || floors.length === 0) {
    return null;
  }

  const defaultScene = createDefaultBuildingTestScene();
  const metadataBuilding = payload.blueprintLayout?.metadata?.building as BuildingTestScene['building'] | undefined;
  const buildingPosition = metadataBuilding?.position ?? defaultScene.building.position;
  const rawLevels = floors.map((floor, index) => {
    const fallbackLevel = defaultScene.building.levels[index] ?? defaultScene.building.levels[0];
    const metadataLevel = metadataBuilding?.levels?.[index];
    const layout = hydrateFloorLayout(floor, fallbackLevel, metadataLevel?.layout);
    const pointBounds = getPointBounds(layout.points);

    return {
      ...fallbackLevel,
      depth: pointBounds ? Math.max(pointBounds.depth, 1) : metadataLevel?.depth ?? fallbackLevel.depth,
      elevation: floor.elevation ?? metadataLevel?.elevation ?? fallbackLevel.elevation,
      footprintOffset: pointBounds
        ? {
            x: pointBounds.centerX - buildingPosition.x,
            z: pointBounds.centerZ - buildingPosition.z,
          }
        : metadataLevel?.footprintOffset ?? fallbackLevel.footprintOffset,
      height: floor.floorHeight ?? metadataLevel?.height ?? fallbackLevel.height,
      id: floor.id || metadataLevel?.id || fallbackLevel.id,
      label: floor.name ?? `Floor ${index + 1}`,
      layout,
      projectAreaId: floor.projectAreaId,
      wallHeight: layout.wallHeight,
      width: pointBounds ? Math.max(pointBounds.width, 1) : metadataLevel?.width ?? fallbackLevel.width,
    };
  });
  const levels = normalizeHydratedLevelStack(rawLevels);
  const scene: BuildingTestScene = {
    building: {
      ...(metadataBuilding ?? {
        depth: Math.max(...levels.map((level) => level.depth)),
        position: defaultScene.building.position,
        width: Math.max(...levels.map((level) => level.width)),
      }),
      depth: Math.max(...levels.map((level) => level.depth)),
      levels,
      position: buildingPosition,
      width: Math.max(...levels.map((level) => level.width)),
    },
    camera: {
      target: payload.camera?.target ?? defaultScene.camera.target,
    },
    site: (payload.blueprintLayout?.metadata?.site as BuildingTestScene['site'] | undefined) ?? defaultScene.site,
    surfaces: [],
  };

  return {
    ...scene,
    building: {
      ...scene.building,
      levels,
    },
    surfaces: hydrateSurfaces({ ...scene, building: { ...scene.building, levels } }, payload),
  };
}

function hydrateProducts(payload: HydrateBuildingPayload, scene: BuildingTestScene): PlacedBuildingProduct[] {
  return (payload.objects ?? [])
    .filter((object) => object.objectType === 'FURNITURE' && object.productVersionId)
    .map((object) => {
      const position = object.transform?.position ?? { x: 0, y: 0, z: 0 };
      const floorId = object.floorId;
      const levelId = getLevelIdFromFloorId(floorId, scene);

      return {
        dimensionsSnapshot: object.dimensionsSnapshot as PlacedBuildingProduct['dimensionsSnapshot'],
        heightOffset: Number(object.placement?.heightOffset ?? position.y),
        id: object.productVersionId,
        levelId,
        locked: object.locked,
        modelSnapshot: object.modelSnapshot as PlacedBuildingProduct['modelSnapshot'],
        modelUrl: String(object.modelSnapshot?.modelUrlSnapshot ?? ''),
        mountedWallId: String(object.placement?.mountedWallId ?? '') || null,
        name: object.name ?? 'Furniture',
        placementMode: object.placement?.mode as PlacedBuildingProduct['placementMode'],
        placementRules: {
          boundaryEnabled: true,
          collisionEnabled: true,
          snapToSurface: true,
        },
        position,
        productVersionId: object.productVersionId,
        proposalItemId: object.proposalItemId ?? null,
        rotation: object.transform?.rotation ?? { x: 0, y: 0, z: 0 },
        scale: object.transform?.scale ?? { x: 1, y: 1, z: 1 },
        sceneObjectId: object.objectId,
        surfaceId: String(object.placement?.surfaceId ?? `${levelId}-layout-floor`),
        surfaceType: object.placement?.surfaceType as PlacedBuildingProduct['surfaceType'],
        supportObjectId: String(object.placement?.supportObjectId ?? '') || null,
        visible: object.visible,
        visualSnapshot: object.visualSnapshot as PlacedBuildingProduct['visualSnapshot'],
      };
    });
}

export function hydrateBuildingRoomPlannerPayload(payload: unknown): {
  activeLevel?: string;
  placedProducts: PlacedBuildingProduct[];
  sceneData: BuildingTestScene | null;
  selectedProductId?: string | null;
} {
  const typedPayload = payload as HydrateBuildingPayload | null | undefined;

  if (!typedPayload?.blueprintLayout) {
    return {
      placedProducts: [],
      sceneData: null,
    };
  }

  const sceneData = hydrateSceneData(typedPayload);

  if (!sceneData) {
    return {
      placedProducts: [],
      sceneData: null,
    };
  }

  return {
    activeLevel: typedPayload.editorState?.activeTool,
    placedProducts: hydrateProducts(typedPayload, sceneData),
    sceneData,
    selectedProductId: typedPayload.editorState?.selectedObjectId ?? null,
  };
}
