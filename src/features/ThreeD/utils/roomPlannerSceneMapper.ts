import type { PlacedProduct3D, Vector3State } from '@/features/ThreeD/components/RoomPreview3D';
import type { BlueprintTool, DoorSwingDirection, RoomLayoutState, RoomMaterialSelection, SelectedRoomItem } from '@/features/ThreeD/types/roomLayout.types';
import type { RoomPlannerObject, RoomPlannerScenePayload } from '@/features/ThreeD/types/roomPlannerScene.types';
import { getRoomArea, isRoomBoundaryClosed } from '@/features/ThreeD/utils/roomGeometry';

const SQM_TO_SQFT = 10.7639;

type HydratablePoint = {
  id: string;
  x: number;
  y: number;
};

type RawRoomPlannerLayout = {
  [key: string]: unknown;
  boundary?: Array<{ x?: number; y?: number; z?: number }>;
  doors?: Array<Record<string, unknown>>;
  floor?: Record<string, unknown> | null;
  floorMaterialId?: string | null;
  openings?: Array<Record<string, unknown>>;
  points?: Array<Record<string, unknown>>;
  type?: string;
  wallHeight?: number | null;
  wallMaterialId?: string | null;
  walls?: Array<Record<string, unknown>>;
  wallThickness?: number | null;
  windows?: Array<Record<string, unknown>>;
};

type CreateRoomPlannerPayloadInput = {
  activeTool: BlueprintTool;
  floorMaterial: RoomMaterialSelection;
  hideLabels: boolean;
  isSidebarCollapsed: boolean;
  layout: RoomLayoutState;
  placedProducts: PlacedProduct3D[];
  selectedProductId: string | null;
  selectedRoomItem: SelectedRoomItem | null;
  viewMode: '2d' | '3d';
  wallMaterial: RoomMaterialSelection;
};

export type HydratedRoomPlannerScene = {
  activeTool: BlueprintTool;
  hideLabels: boolean;
  isSidebarCollapsed: boolean;
  layout: RoomLayoutState | null;
  placedProducts: PlacedProduct3D[];
  selectedProductId: string | null;
  viewMode: '2d' | '3d';
};

export type HydrateRoomPlannerSceneOptions = {
  resolveModelUrl?: (object: Partial<RoomPlannerObject>) => string | null | undefined;
};

export function createRoomPlannerScenePayload(input: CreateRoomPlannerPayloadInput): RoomPlannerScenePayload {
  const areaSqm = getRoomArea(input.layout);

  return {
    schemaVersion: 2,
    editorVersion: 'ROOM_PLANNER_BABYLON_V1',
    unit: input.layout.unit,
    layout: {
      type: 'BLUEPRINT_WALL_GRAPH',
      isClosed: isRoomBoundaryClosed(input.layout),
      areaSqFt: Number((areaSqm * SQM_TO_SQFT).toFixed(2)),
      areaSqm,
      wallHeight: input.layout.wallHeight,
      wallThickness: input.layout.wallThickness,
      floorMaterialId: input.floorMaterial.id,
      wallMaterialId: input.wallMaterial.id,
      points: input.layout.points.map((point) => ({
        pointId: point.id,
        x: point.x,
        y: point.y,
      })),
      walls: input.layout.walls.map((wall) => ({
        wallId: wall.id,
        startPointId: wall.startPointId,
        endPointId: wall.endPointId,
        height: wall.height,
        thickness: wall.thickness,
        visible: true,
        locked: false,
        style: {
          materialId: input.wallMaterial.id,
          color: input.wallMaterial.fallbackColor,
          textureFileId: null,
          textureUrlSnapshot: input.wallMaterial.textureUrl ?? null,
        },
      })),
      doors: input.layout.doors.map((door) => ({
        openingId: door.id,
        type: door.type,
        wallId: door.wallId,
        offset: door.offset,
        width: door.width,
        height: door.height,
        swingDirection: door.swingDirection,
        isOpen: true,
        locked: false,
      })),
      windows: input.layout.windows.map((windowOpening) => ({
        openingId: windowOpening.id,
        type: windowOpening.type,
        wallId: windowOpening.wallId,
        offset: windowOpening.offset,
        width: windowOpening.width,
        height: windowOpening.height,
        sillHeight: windowOpening.sillHeight,
        locked: false,
      })),
      openings: input.layout.openings.map((opening) => ({
        openingId: opening.id,
        type: opening.type,
        wallId: opening.wallId,
        offset: opening.offset,
        width: opening.width,
        height: opening.height,
        floorOffset: 0,
        locked: false,
      })),
      floor: {
        materialId: input.floorMaterial.id,
        color: input.floorMaterial.fallbackColor,
        textureFileId: null,
        textureUrlSnapshot: input.floorMaterial.textureUrl ?? null,
        rotation: 0,
        scale: 1,
      },
    },
    objects: input.placedProducts.map((product) => ({
      objectId: product.id,
      proposalItemId: product.proposalItemId ?? null,
      productVersionId: product.productVersionId ?? product.productId ?? null,
      productModelId: product.productId ?? product.productVersionId ?? product.id,
      objectType: 'FURNITURE',
      name: product.modelName,
      transform: {
        position: product.position,
        rotation: getVector3(product.rotation, { x: 0, y: 0, z: 0 }),
        scale: getVector3(product.scale, { x: 1, y: 1, z: 1 }),
      },
      placement: {
        mode: product.placementMode ?? 'FLOOR',
        heightOffset: product.heightOffset ?? product.position.y,
        supportObjectId: product.supportObjectId ?? null,
        mountedWallId: product.mountedWallId ?? null,
      },
      dimensionsSnapshot: {
        width: product.dimensionsSnapshot?.width ?? null,
        height: product.dimensionsSnapshot?.height ?? null,
        depth: product.dimensionsSnapshot?.depth ?? null,
        unit: product.dimensionsSnapshot?.unit === 'cm' ? 'cm' : input.layout.unit,
      },
      footprintSnapshot: null,
      visualSnapshot: {
        thumbnailFileId: null,
        thumbnailUrlSnapshot: product.thumbnailUrl ?? null,
        color: product.visualSnapshot?.color ?? null,
        material: product.visualSnapshot?.material ?? null,
        finish: product.visualSnapshot?.finish ?? null,
      },
      modelSnapshot: {
        modelFileId: product.fileId ?? null,
        format: getModelFormat(product.modelUrl),
        modelUrlSnapshot: product.modelUrl,
      },
      materialOverrides: {},
      visible: true,
      locked: false,
    })),
    layers: [
      {
        layerId: 'walls',
        name: 'Walls',
        visible: true,
        locked: false,
      },
      {
        layerId: 'openings',
        name: 'Openings',
        visible: true,
        locked: false,
      },
      {
        layerId: 'furniture',
        name: 'Furniture',
        visible: true,
        locked: false,
      },
    ],
    stylePreset: null,
    camera: {
      mode: 'ORBIT',
      viewMode: input.viewMode === '3d' ? 'THREE_D' : 'TWO_D',
      position: { x: 12, y: 14, z: 12 },
      target: { x: 6, y: 0, z: 6 },
      zoom: 1,
    },
    lighting: {
      preset: 'DEFAULT',
      environment: 'default',
      ambientIntensity: 0.8,
      directionalIntensity: 1,
      customLights: [],
    },
    validation: {
      status: 'NOT_VALIDATED',
      warnings: [],
      errors: [],
      lastValidatedAt: null,
    },
    editorState: {
      activeTool: input.activeTool,
      selectedObjectId: input.selectedProductId,
      selectedObjectIds: input.selectedProductId ? [input.selectedProductId] : [],
      selectedRoomItem: input.selectedRoomItem,
      viewMode: input.viewMode,
      gridEnabled: true,
      snapEnabled: false,
      snapSettings: {
        gridSize: 0.1,
      },
      hideLabels: input.hideLabels,
      sidebarCollapsed: input.isSidebarCollapsed,
    },
  };
}

export function hydrateRoomPlannerScenePayload(
  payload: Partial<RoomPlannerScenePayload> | null | undefined,
  options: HydrateRoomPlannerSceneOptions = {},
): HydratedRoomPlannerScene {
  const editorState = payload?.editorState;

  return {
    activeTool: isBlueprintTool(editorState?.activeTool) ? editorState.activeTool : 'select',
    hideLabels: Boolean(editorState?.hideLabels),
    isSidebarCollapsed: Boolean(editorState?.sidebarCollapsed),
    layout: hydrateLayout(payload),
    placedProducts: hydratePlacedProducts(payload, options),
    selectedProductId: typeof editorState?.selectedObjectId === 'string' ? editorState.selectedObjectId : null,
    viewMode: editorState?.viewMode === '2d' || editorState?.viewMode === '3d'
      ? editorState.viewMode
      : payload?.camera?.viewMode === 'TWO_D'
        ? '2d'
        : '3d',
  };
}

function hydrateLayout(payload: Partial<RoomPlannerScenePayload> | null | undefined): RoomLayoutState | null {
  const layout = payload?.layout as RawRoomPlannerLayout | undefined;

  if (!layout) {
    return null;
  }

  if (layout.type === 'WALL_BOUNDARY') {
    return hydrateWallBoundaryLayout(layout);
  }

  return hydrateBlueprintWallGraphLayout(layout);
}

function hydrateBlueprintWallGraphLayout(layout: RawRoomPlannerLayout): RoomLayoutState | null {
  const wallHeight = getNumberValue(layout.wallHeight, 9);
  const wallThickness = getNumberValue(layout.wallThickness, 0.3);
  const points = hydrateBlueprintPoints(layout.points);
  const walls = hydrateBlueprintWalls(layout.walls, points, wallHeight, wallThickness);

  if (points.length < 3 || walls.length === 0) {
    return null;
  }

  const doorOpenings = mergeOpeningsByType(layout.doors, layout.openings, 'DOOR');
  const windowOpenings = mergeOpeningsByType(layout.windows, layout.openings, 'WINDOW');
  const genericOpenings = mergeOpeningsByType(undefined, layout.openings, 'OPENING');
  const wallIds = new Set(walls.map((wall) => wall.id));

  return {
    doors: doorOpenings
      .map((door, index) => hydrateDoorOpening(door, index))
      .filter((door) => wallIds.has(door.wallId)),
    floorMaterialId: getStringValue(layout.floorMaterialId) || getStringValue(layout.floor?.materialId) || 'wood-floor',
    openings: genericOpenings
      .map((opening, index) => hydrateGenericOpening(opening, index))
      .filter((opening) => wallIds.has(opening.wallId)),
    points,
    unit: 'm',
    wallHeight,
    wallMaterialId: getStringValue(layout.wallMaterialId) || 'wall-base',
    wallThickness,
    walls,
    windows: windowOpenings
      .map((windowOpening, index) => hydrateWindowOpening(windowOpening, index))
      .filter((windowOpening) => wallIds.has(windowOpening.wallId)),
  };
}

function hydrateWallBoundaryLayout(layout: RawRoomPlannerLayout): RoomLayoutState | null {
  const boundary = Array.isArray(layout.boundary) ? layout.boundary : [];

  const points = boundary.length >= 3
    ? boundary.map((point, index) => ({
        id: `p-${index + 1}`,
        x: Number(point.x ?? 0),
        y: Number(point.z ?? point.y ?? 0),
      }))
    : hydratePointsFromWallCoordinates(layout.walls);

  if (points.length < 3) {
    return null;
  }

  const wallHeight = getNumberValue(layout.defaultWallHeight ?? layout.wallHeight, 9);
  const wallThickness = getNumberValue(layout.defaultWallThickness ?? layout.wallThickness, 0.3);
  const walls = Array.isArray(layout.walls) && layout.walls.length
    ? layout.walls.map((wall, index) => {
        const wallId = getStringValue(wall.wallId) || getStringValue(wall.id) || `w-${index + 1}`;
        const startPointId = findOrCreateWallPoint(points, wall.start, `start-${wallId}`);
        const endPointId = findOrCreateWallPoint(points, wall.end, `end-${wallId}`);

        return {
          endPointId,
          height: getNumberValue(wall.height, wallHeight),
          id: wallId,
          startPointId,
          thickness: getNumberValue(wall.thickness, wallThickness),
          type: 'WALL' as const,
        };
      })
    : points.map((point, index) => ({
        endPointId: points[(index + 1) % points.length].id,
        height: wallHeight,
        id: `w-${index + 1}`,
        startPointId: point.id,
        thickness: wallThickness,
        type: 'WALL' as const,
      }));
  const openings = Array.isArray(layout.openings) ? layout.openings : [];
  const wallIds = new Set(walls.map((wall) => wall.id));

  return {
    doors: openings
      .filter((opening) => getOpeningType(opening.type) === 'DOOR')
      .map((opening, index) => hydrateDoorOpening(opening, index))
      .filter((door) => wallIds.has(door.wallId)),
    floorMaterialId: getStringValue(layout.floor?.materialId) || getStringValue(layout.floor?.materialCode) || getStringValue(layout.floorMaterialId) || 'wood-floor',
    openings: openings
      .filter((opening) => getOpeningType(opening.type) === 'OPENING')
      .map((opening, index) => hydrateGenericOpening(opening, index))
      .filter((opening) => wallIds.has(opening.wallId)),
    points,
    unit: 'm',
    wallHeight,
    wallMaterialId: getStringValue(layout.wallMaterialId) || 'wall-base',
    wallThickness,
    walls,
    windows: openings
      .filter((opening) => getOpeningType(opening.type) === 'WINDOW')
      .map((opening, index) => hydrateWindowOpening(opening, index))
      .filter((windowOpening) => wallIds.has(windowOpening.wallId)),
  };
}

function findOrCreateWallPoint(points: Array<{ id: string; x: number; y: number }>, point: unknown, fallbackId: string) {
  const position = point as { x?: number; y?: number; z?: number } | null | undefined;
  const x = getNumberValue(position?.x, 0);
  const y = getNumberValue(position?.z ?? position?.y, 0);
  const existingPoint = points.find((candidate) => Math.abs(candidate.x - x) < 0.001 && Math.abs(candidate.y - y) < 0.001);

  if (existingPoint) {
    return existingPoint.id;
  }

  const id = `p-${fallbackId}`;
  points.push({ id, x, y });

  return id;
}

function hydrateBlueprintPoints(rawPoints: RawRoomPlannerLayout['points']): HydratablePoint[] {
  return (rawPoints ?? []).map((point, index) => ({
    id: getStringValue(point.pointId) || getStringValue(point.id) || `p-${index + 1}`,
    x: getNumberValue(point.x, 0),
    y: getNumberValue(point.y ?? point.z, 0),
  }));
}

function hydratePointsFromWallCoordinates(rawWalls: RawRoomPlannerLayout['walls']): HydratablePoint[] {
  const points: HydratablePoint[] = [];

  (rawWalls ?? []).forEach((wall, index) => {
    findOrCreateWallPoint(points, wall.start ?? wall.startPoint, `w-${index + 1}-start`);
    findOrCreateWallPoint(points, wall.end ?? wall.endPoint, `w-${index + 1}-end`);
  });

  return points;
}

function hydrateBlueprintWalls(
  rawWalls: RawRoomPlannerLayout['walls'],
  points: HydratablePoint[],
  wallHeight: number,
  wallThickness: number,
): RoomLayoutState['walls'] {
  if (!rawWalls?.length && points.length >= 3) {
    return points.map((point, index) => ({
      endPointId: points[(index + 1) % points.length].id,
      height: wallHeight,
      id: `w-${index + 1}`,
      startPointId: point.id,
      thickness: wallThickness,
      type: 'WALL' as const,
    }));
  }

  const hydratedWalls: RoomLayoutState['walls'] = [];

  (rawWalls ?? []).forEach((wall, index) => {
    const wallId = getStringValue(wall.wallId) || getStringValue(wall.id) || `w-${index + 1}`;
    const startPointId = getStringValue(wall.startPointId) ||
      getStringValue(getRecordValue(wall.startPoint, 'pointId')) ||
      getStringValue(getRecordValue(wall.startPoint, 'id')) ||
      (hasPointCoordinates(wall.start) || hasPointCoordinates(wall.startPoint)
        ? findOrCreateWallPoint(points, wall.start ?? wall.startPoint, `start-${wallId}`)
        : '');
    const endPointId = getStringValue(wall.endPointId) ||
      getStringValue(getRecordValue(wall.endPoint, 'pointId')) ||
      getStringValue(getRecordValue(wall.endPoint, 'id')) ||
      (hasPointCoordinates(wall.end) || hasPointCoordinates(wall.endPoint)
        ? findOrCreateWallPoint(points, wall.end ?? wall.endPoint, `end-${wallId}`)
        : '');

    if (!startPointId || !endPointId) {
      return;
    }

    hydratedWalls.push({
      endPointId,
      height: getNumberValue(wall.height, wallHeight),
      id: wallId,
      startPointId,
      thickness: getNumberValue(wall.thickness, wallThickness),
      type: 'WALL',
    });
  });

  return hydratedWalls;
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

function hydrateDoorOpening(opening: Record<string, unknown>, index: number) {
  return {
    height: getNumberValue(opening.height, 0),
    id: getStringValue(opening.openingId) || getStringValue(opening.id) || `door-${index + 1}`,
    offset: getNumberValue(opening.offset, 0),
    swingDirection: isDoorSwingDirection(opening.swingDirection) ? opening.swingDirection : 'IN_LEFT',
    type: 'DOOR' as const,
    wallId: getStringValue(opening.wallId),
    width: getNumberValue(opening.width, 0),
  };
}

function hydrateWindowOpening(opening: Record<string, unknown>, index: number) {
  return {
    height: getNumberValue(opening.height, 0),
    id: getStringValue(opening.openingId) || getStringValue(opening.id) || `window-${index + 1}`,
    offset: getNumberValue(opening.offset, 0),
    sillHeight: getNumberValue(opening.sillHeight, 0),
    type: 'WINDOW' as const,
    wallId: getStringValue(opening.wallId),
    width: getNumberValue(opening.width, 0),
  };
}

function hydrateGenericOpening(opening: Record<string, unknown>, index: number) {
  return {
    height: getNumberValue(opening.height, 0),
    id: getStringValue(opening.openingId) || getStringValue(opening.id) || `opening-${index + 1}`,
    offset: getNumberValue(opening.offset, 0),
    type: 'OPENING' as const,
    wallId: getStringValue(opening.wallId),
    width: getNumberValue(opening.width, 0),
  };
}

function hasPointCoordinates(value: unknown) {
  return Boolean(value && typeof value === 'object' && 'x' in value);
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

function getRecordValue(value: unknown, key: string) {
  return value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined;
}

function hydratePlacedProducts(
  payload: Partial<RoomPlannerScenePayload> | null | undefined,
  options: HydrateRoomPlannerSceneOptions,
): PlacedProduct3D[] {
  const hydratedProducts: Array<PlacedProduct3D | null> = (payload?.objects ?? [])
    .map((object, index) => {
      const modelUrl = object.modelSnapshot?.modelUrlSnapshot || options.resolveModelUrl?.(object);

      if (!modelUrl) {
        return null;
      }

      const position = getVector3(object.transform?.position, { x: 0, y: 0, z: 0 });
      const rawPlacementMode = object.placement?.mode;
      const placementMode = isProductPlacementMode(rawPlacementMode) ? rawPlacementMode : 'FLOOR';
      const objectId = object.objectId || object.proposalItemId || object.productVersionId || `object-${index + 1}`;

      return {
        fileId: object.modelSnapshot?.modelFileId ?? undefined,
        dimensionsSnapshot: {
          depth: object.dimensionsSnapshot?.depth ?? null,
          height: object.dimensionsSnapshot?.height ?? null,
          unit: object.dimensionsSnapshot?.unit ?? 'm',
          width: object.dimensionsSnapshot?.width ?? null,
        },
        heightOffset: object.placement?.heightOffset ?? position.y,
        id: objectId,
        mountedWallId: object.placement?.mountedWallId ?? null,
        modelName: object.name || object.productVersionId || objectId,
        modelUrl,
        placementMode,
        position,
        productId: object.productModelId ?? object.productVersionId ?? undefined,
        productVersionId: object.productVersionId ?? undefined,
        proposalItemId: object.proposalItemId ?? null,
        rotation: getVector3(object.transform?.rotation, { x: 0, y: 0, z: 0 }),
        scale: getVector3(object.transform?.scale, { x: 1, y: 1, z: 1 }),
        source: 'api' as const,
        supportObjectId: object.placement?.supportObjectId ?? null,
        thumbnailUrl: object.visualSnapshot?.thumbnailUrlSnapshot ?? null,
        visualSnapshot: {
          color: object.visualSnapshot?.color ?? null,
          finish: object.visualSnapshot?.finish ?? null,
          material: object.visualSnapshot?.material ?? null,
        },
      };
    });

  return hydratedProducts.filter((product): product is PlacedProduct3D => product !== null);
}

function getVector3(value: Partial<Vector3State> | undefined, fallback: Vector3State): Vector3State {
  return {
    x: value?.x ?? fallback.x,
    y: value?.y ?? fallback.y,
    z: value?.z ?? fallback.z,
  };
}

function getModelFormat(modelUrl: string) {
  const extension = modelUrl.split('?')[0].split('.').pop()?.toUpperCase();

  return extension || null;
}

function isDoorSwingDirection(value: unknown): value is DoorSwingDirection {
  return value === 'IN_LEFT' || value === 'IN_RIGHT';
}

function getOpeningType(value: unknown) {
  return typeof value === 'string' ? value.toUpperCase() : '';
}

function isProductPlacementMode(value: unknown): value is PlacedProduct3D['placementMode'] {
  return value === 'FLOOR' || value === 'ON_OBJECT' || value === 'WALL_MOUNTED' || value === 'CUSTOM_HEIGHT';
}

function isBlueprintTool(value: unknown): value is BlueprintTool {
  return typeof value === 'string' &&
    ['home', 'select', 'draw', 'add-box', 'l-shape', 'door', 'window', 'opening', 'ceiling', 'hide-labels', 'save'].includes(value);
}
