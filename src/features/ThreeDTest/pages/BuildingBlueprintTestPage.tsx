import { useEffect, useMemo, useRef, useState } from 'react';
import { IconBuilding, IconRotateClockwise } from '@tabler/icons-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { BlueprintCanvas } from '@/features/ThreeD/components/BlueprintCanvas';
import type { BlueprintTool, RoomLayoutState, SelectedRoomItem } from '@/features/ThreeD/types/roomLayout.types';
import {
  createDefaultRoomLayout,
  getRoomBounds,
  getWallLength,
  normalizeDoorAndOpeningDimensions,
} from '@/features/ThreeD/utils/roomGeometry';
import { useBuildingTestSceneState } from '@/features/ThreeDTest/hooks';
import { hydrateBuildingRoomPlannerPayload } from '@/features/ThreeDTest/utils/buildingRoomPlannerPayloadMapper';
import type {
  BuildingLevel,
  BuildingLevelVisibility,
  BuildingPlacementSurface,
  BuildingTestScene,
  PlacedBuildingProduct,
} from '@/features/ThreeDTest/schemas/buildingScene.types';
import {
  createBuildingTestSceneFromProjectFloorAreas,
  createRectLevelLayout,
  getLevelCenter,
  type BuildingProjectFloorAreaSource,
} from '@/features/ThreeDTest/utils/buildingTestSceneFactory';
import { useProjectAreas, useProposalDetail, useRoomPlannerScene } from '@/services/queries';

import '@/features/ThreeD/pages/ThreeDTestPage.css';
import './BuildingBlueprintTestPage.css';

const blueprintTools: Array<{ label: string; value: BlueprintTool }> = [
  { label: 'Select', value: 'select' },
  { label: 'Draw Wall', value: 'draw' },
  { label: 'Door', value: 'door' },
  { label: 'Window', value: 'window' },
  { label: 'Opening', value: 'opening' },
  { label: 'Node', value: 'node' },
  { label: 'Floor Hole', value: 'floor-hole' },
];
const SHOW_SITE_CONTROLS = false;
const SHOW_FRONT_YARD_CONTROLS = false;
const SHOW_BUILDING_FOOTPRINT_CONTROLS = false;
const LEVEL_STACK_VERTICAL_GAP = 0.3;
const LINKED_AREA_LAYOUT_SYNC_TOLERANCE = 0.05;

type BuildingBlueprintRouteState = {
  areas?: BuildingProjectFloorAreaSource[];
  mode?: 'create-proposal';
  projectAreaIds?: string[];
  projectId?: string;
  proposalId?: string;
  returnTo?: string;
  transientPlacedProducts?: PlacedBuildingProduct[];
  transientSelectedProductId?: string | null;
};

type NumberFieldProps = {
  label: string;
  max?: number;
  min?: number;
  onChange: (value: number) => void;
  step?: number;
  value: number;
};

function clamp(value: number, min: number, max = Number.POSITIVE_INFINITY) {
  return Math.min(Math.max(value, min), max);
}

function roundMetric(value: number) {
  return Number(value.toFixed(2));
}

function formatNumberInput(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
}

function createAreaTemplateKey(areas: BuildingProjectFloorAreaSource[]) {
  return areas
    .map((area) => [
      area.projectAreaId,
      area.areaName,
      area.width ?? '',
      area.length ?? '',
      area.height ?? '',
    ].join(':'))
    .join('|');
}

function toBuildingProjectFloorAreaSource(area: BuildingProjectFloorAreaSource): BuildingProjectFloorAreaSource {
  return {
    areaName: area.areaName,
    floorNumber: area.floorNumber ?? null,
    height: area.height ?? null,
    length: area.length ?? null,
    projectAreaId: area.projectAreaId,
    width: area.width ?? null,
  };
}

function getSceneProjectAreaIds(
  routeState: BuildingBlueprintRouteState | null,
  roomPlannerScene: ReturnType<typeof useRoomPlannerScene>['data'],
) {
  if (routeState?.projectAreaIds?.length) {
    return routeState.projectAreaIds;
  }

  if (roomPlannerScene?.projectAreaIds?.length) {
    return roomPlannerScene.projectAreaIds;
  }

  const roomPlannerAreaIds = roomPlannerScene?.areas?.map((area) => area.projectAreaId).filter(Boolean) ?? [];

  if (roomPlannerAreaIds.length) {
    return roomPlannerAreaIds;
  }

  return roomPlannerScene?.projectAreaId ? [roomPlannerScene.projectAreaId] : [];
}

function parseNumberInput(value: string, fallback: number) {
  const normalizedValue = value.trim().replace(',', '.');

  if (!normalizedValue || normalizedValue === '-' || normalizedValue === '.' || normalizedValue === '-.') {
    return fallback;
  }

  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function translateLayout(layout: RoomLayoutState | null | undefined, deltaX: number, deltaZ: number) {
  if (!layout || (deltaX === 0 && deltaZ === 0)) {
    return layout;
  }

  return {
    ...layout,
    points: layout.points.map((point) => ({
      ...point,
      x: roundMetric(point.x + deltaX),
      y: roundMetric(point.y + deltaZ),
    })),
  };
}

function updateSurface(
  scene: BuildingTestScene,
  surfaceId: string,
  update: (surface: BuildingPlacementSurface) => BuildingPlacementSurface,
) {
  return {
    ...scene,
    surfaces: scene.surfaces.map((surface) => (surface.id === surfaceId ? update(surface) : surface)),
  };
}

function removeSurface(scene: BuildingTestScene, surfaceId: string) {
  return {
    ...scene,
    surfaces: scene.surfaces.filter((surface) => surface.id !== surfaceId),
  };
}

function getFrontYardBasePlacement(scene: BuildingTestScene, yardDepth: number) {
  const baseLevel = scene.building.levels[0] ?? null;
  const baseCenter = baseLevel ? getLevelCenter(scene, baseLevel) : scene.building.position;
  const baseDepth = baseLevel?.depth ?? scene.building.depth;
  const baseWidth = baseLevel?.width ?? scene.building.width;

  return {
    defaultWidth: Math.max(baseWidth + 2, 4),
    x: baseCenter.x,
    z: roundMetric(baseCenter.z - baseDepth / 2 - yardDepth / 2 - 0.15),
  };
}

function createSyncedFrontYard(scene: BuildingTestScene, currentYard?: BuildingPlacementSurface): BuildingPlacementSurface {
  const yardDepth = currentYard?.depth ?? 5.5;
  const basePlacement = getFrontYardBasePlacement(scene, yardDepth);

  return {
    depth: yardDepth,
    elevation: currentYard?.elevation ?? 0.03,
    id: 'front-yard',
    label: currentYard?.label ?? 'Front Yard',
    levelId: 'site',
    position: {
      x: currentYard?.position.x ?? basePlacement.x,
      y: currentYard?.position.y ?? 0.03,
      z: currentYard?.position.z ?? basePlacement.z,
    },
    type: 'YARD',
    width: currentYard?.width ?? basePlacement.defaultWidth,
  };
}

function centerFrontYardToFloorOne(scene: BuildingTestScene) {
  const frontYard = scene.surfaces.find((surface) => surface.id === 'front-yard');

  if (!frontYard) {
    return addFrontYard(scene);
  }

  const basePlacement = getFrontYardBasePlacement(scene, frontYard.depth);

  return updateSurface(scene, 'front-yard', (surface) => ({
    ...surface,
    position: {
      ...surface.position,
      x: basePlacement.x,
      z: basePlacement.z,
    },
  }));
}

function syncFrontYardWithFloorOne(
  previousScene: BuildingTestScene,
  nextScene: BuildingTestScene,
  surface: BuildingPlacementSurface,
) {
  const previousBasePlacement = getFrontYardBasePlacement(previousScene, surface.depth);
  const nextBasePlacement = getFrontYardBasePlacement(nextScene, surface.depth);

  return {
    ...surface,
    position: {
      ...surface.position,
      x: roundMetric(nextBasePlacement.x + surface.position.x - previousBasePlacement.x),
      z: roundMetric(nextBasePlacement.z + surface.position.z - previousBasePlacement.z),
    },
  };
}

function addFrontYard(scene: BuildingTestScene) {
  if (scene.surfaces.some((surface) => surface.id === 'front-yard')) {
    return scene;
  }

  return {
    ...scene,
    surfaces: [...scene.surfaces, createSyncedFrontYard(scene)],
  };
}

function addBalconyForLevel(scene: BuildingTestScene, levelId: string) {
  const surfaceId = `${levelId}-balcony`;

  if (scene.surfaces.some((surface) => surface.id === surfaceId)) {
    return scene;
  }

  const targetLevel = scene.building.levels.find((level) => level.id === levelId);

  if (!targetLevel) {
    return scene;
  }

  const levelCenter = getLevelCenter(scene, targetLevel);
  const balcony: BuildingPlacementSurface = {
    depth: 1.8,
    elevation: targetLevel.elevation,
    id: surfaceId,
    label: `${targetLevel.label} Balcony`,
    levelId: targetLevel.id,
    position: {
      x: levelCenter.x,
      y: targetLevel.elevation,
      z: levelCenter.z - targetLevel.depth / 2 - 1.05,
    },
    type: 'BALCONY',
    width: Math.min(Math.max(targetLevel.width * 0.54, 2.4), targetLevel.width),
  };

  return {
    ...scene,
    surfaces: [...scene.surfaces, balcony],
  };
}

function getLevelStackStep(level: BuildingLevel) {
  return Math.max(level.height, level.wallHeight, 2.4) + LEVEL_STACK_VERTICAL_GAP;
}

function normalizeLevelStackClearance(levels: BuildingLevel[]) {
  const sortedLevels = [...levels].sort((first, second) => first.elevation - second.elevation);
  const nextElevationsById = new Map<BuildingLevel['id'], number>();

  sortedLevels.forEach((level, index) => {
    if (index === 0) {
      nextElevationsById.set(level.id, level.elevation);
      return;
    }

    const previousLevel = sortedLevels[index - 1];
    const previousElevation = nextElevationsById.get(previousLevel.id) ?? previousLevel.elevation;
    const minimumElevation = roundMetric(previousElevation + getLevelStackStep(previousLevel));

    nextElevationsById.set(level.id, Math.max(level.elevation, minimumElevation));
  });

  return levels.map((level) => ({
    ...level,
    elevation: nextElevationsById.get(level.id) ?? level.elevation,
  }));
}

function syncBuildingShell(scene: BuildingTestScene, update: Partial<BuildingTestScene['building']>) {
  const previousPosition = scene.building.position;
  const nextBuilding = {
    ...scene.building,
    ...update,
  };
  const deltaX = roundMetric(nextBuilding.position.x - previousPosition.x);
  const deltaZ = roundMetric(nextBuilding.position.z - previousPosition.z);
  const shiftedBuilding = {
    ...nextBuilding,
    levels: nextBuilding.levels.map((level) => ({
      ...level,
      layout: translateLayout(level.layout, deltaX, deltaZ) ?? level.layout,
    })),
  };
  const highestLevel = nextBuilding.levels.reduce<BuildingLevel | null>((currentLevel, level) =>
    !currentLevel || level.elevation > currentLevel.elevation ? level : currentLevel,
  null);

  return {
    ...scene,
    building: shiftedBuilding,
    camera: {
      target: {
        x: shiftedBuilding.position.x,
        y: ((highestLevel?.elevation ?? 3.4) + (highestLevel?.wallHeight ?? 2.6)) / 2,
        z: shiftedBuilding.position.z,
      },
    },
    surfaces: scene.surfaces.map((surface) => {
      if (surface.type === 'FLOOR') {
        const level = shiftedBuilding.levels.find((candidate) => candidate.id === surface.levelId);

        if (!level) {
          return surface;
        }

        const levelCenter = getLevelCenter({ ...scene, building: shiftedBuilding }, level);

        return {
          ...surface,
          depth: Math.max(level.depth - 0.7, 1),
          elevation: level.elevation + 0.02,
          position: {
            x: levelCenter.x,
            y: level.elevation + 0.02,
            z: levelCenter.z,
          },
          width: Math.max(level.width - 0.7, 1),
        };
      }

      if (surface.type === 'BALCONY') {
        const level = shiftedBuilding.levels.find((candidate) => candidate.id === surface.levelId);

        if (!level) {
          return surface;
        }

        const levelCenter = getLevelCenter({ ...scene, building: shiftedBuilding }, level);

        return {
          ...surface,
          elevation: level.elevation,
          position: {
            ...surface.position,
            x: levelCenter.x,
            y: level.elevation,
            z: levelCenter.z - level.depth / 2 - surface.depth / 2 - 0.15,
          },
        };
      }

      if (surface.id === 'front-yard') {
        return syncFrontYardWithFloorOne(scene, { ...scene, building: shiftedBuilding }, surface);
      }

      return surface;
    }),
  };
}

function updateLevel(
  scene: BuildingTestScene,
  levelId: BuildingLevel['id'],
  update: (level: BuildingLevel) => BuildingLevel,
) {
  const nextLevels = scene.building.levels.map((level) => {
    if (level.id !== levelId) {
      return level;
    }

    const previousCenter = getLevelCenter(scene, level);
    const updatedLevel = update(level);
    const nextCenter = getLevelCenter(
      {
        ...scene,
        building: {
          ...scene.building,
          levels: scene.building.levels.map((candidate) => (candidate.id === levelId ? updatedLevel : candidate)),
        },
      },
      updatedLevel,
    );
    const centerDeltaX = roundMetric(nextCenter.x - previousCenter.x);
    const centerDeltaZ = roundMetric(nextCenter.z - previousCenter.z);

    return {
      ...updatedLevel,
      layout: updatedLevel.layout === level.layout
        ? translateLayout(updatedLevel.layout, centerDeltaX, centerDeltaZ) ?? updatedLevel.layout
        : updatedLevel.layout,
    };
  });

  return syncBuildingShell(scene, {
    levels: normalizeLevelStackClearance(nextLevels),
  });
}

function getFloorStackBounds(scene: BuildingTestScene) {
  const levelBounds = scene.building.levels.map((level) => {
    const center = getLevelCenter(scene, level);

    return {
      maxX: center.x + level.width / 2,
      maxZ: center.z + level.depth / 2,
      minX: center.x - level.width / 2,
      minZ: center.z - level.depth / 2,
    };
  });

  if (!levelBounds.length) {
    return null;
  }

  return levelBounds.reduce((bounds, levelBound) => ({
    maxX: Math.max(bounds.maxX, levelBound.maxX),
    maxZ: Math.max(bounds.maxZ, levelBound.maxZ),
    minX: Math.min(bounds.minX, levelBound.minX),
    minZ: Math.min(bounds.minZ, levelBound.minZ),
  }));
}

function centerFloorStackOnSite(scene: BuildingTestScene) {
  const floorStackBounds = getFloorStackBounds(scene);

  if (!floorStackBounds) {
    return scene;
  }

  const centerX = (floorStackBounds.minX + floorStackBounds.maxX) / 2;
  const centerZ = (floorStackBounds.minZ + floorStackBounds.maxZ) / 2;

  return syncBuildingShell(scene, {
    position: {
      ...scene.building.position,
      x: roundMetric(scene.building.position.x - centerX),
      z: roundMetric(scene.building.position.z - centerZ),
    },
  });
}

function fitSiteToFloorStack(scene: BuildingTestScene) {
  const floorStackBounds = getFloorStackBounds(scene);

  if (!floorStackBounds) {
    return scene;
  }

  const padding = 4;
  const width = roundMetric(Math.max(8, floorStackBounds.maxX - floorStackBounds.minX + padding * 2));
  const depth = roundMetric(Math.max(8, floorStackBounds.maxZ - floorStackBounds.minZ + padding * 2));

  return {
    ...scene,
    site: {
      ...scene.site,
      depth,
      width,
    },
  };
}

function centerAndFitFloorStackOnSite(scene: BuildingTestScene) {
  return fitSiteToFloorStack(centerFloorStackOnSite(scene));
}

function getLayoutSize(layout: RoomLayoutState) {
  const bounds = getRoomBounds(layout.points);

  return {
    centerX: (bounds.minX + bounds.maxX) / 2,
    centerZ: (bounds.minY + bounds.maxY) / 2,
    depth: Math.max(bounds.maxY - bounds.minY, 1),
    width: Math.max(bounds.maxX - bounds.minX, 1),
  };
}

function getLevelDimensionScale(currentValue: number, nextValue: number) {
  return currentValue > 0 ? nextValue / currentValue : 1;
}

function getWallLengthMap(layout: RoomLayoutState) {
  return new Map(layout.walls.map((wall) => [wall.id, getWallLength(wall, layout.points)]));
}

function resizeLevelLayout(layout: RoomLayoutState | null | undefined, nextWidth: number, nextDepth: number) {
  if (!layout) {
    return layout;
  }

  const currentSize = getLayoutSize(layout);
  const scaleX = getLevelDimensionScale(currentSize.width, nextWidth);
  const scaleZ = getLevelDimensionScale(currentSize.depth, nextDepth);
  const previousWallLengths = getWallLengthMap(layout);
  const nextPoints = layout.points.map((point) => ({
    ...point,
    x: roundMetric(currentSize.centerX + (point.x - currentSize.centerX) * scaleX),
    y: roundMetric(currentSize.centerZ + (point.y - currentSize.centerZ) * scaleZ),
  }));
  const nextLayout: RoomLayoutState = {
    ...layout,
    points: nextPoints,
  };
  const nextWallLengths = getWallLengthMap(nextLayout);
  const scaleOpeningOffset = <T extends { offset: number; wallId: string }>(opening: T) => {
    const previousWallLength = previousWallLengths.get(opening.wallId) ?? 0;
    const nextWallLength = nextWallLengths.get(opening.wallId) ?? previousWallLength;

    return {
      ...opening,
      offset: roundMetric(opening.offset * getLevelDimensionScale(previousWallLength, nextWallLength)),
    };
  };

  return normalizeDoorAndOpeningDimensions({
    ...nextLayout,
    doors: nextLayout.doors.map(scaleOpeningOffset),
    openings: nextLayout.openings.map(scaleOpeningOffset),
    windows: nextLayout.windows.map(scaleOpeningOffset),
  });
}

function resizeLevel(scene: BuildingTestScene, levelId: BuildingLevel['id'], update: Partial<Pick<BuildingLevel, 'depth' | 'width'>>) {
  return updateLevel(scene, levelId, (level) => {
    const width = update.width ?? level.width;
    const depth = update.depth ?? level.depth;

    return {
      ...level,
      ...update,
      layout: resizeLevelLayout(level.layout, width, depth),
    };
  });
}

function createStairOpeningId(level: BuildingLevel) {
  const existingIds = new Set((level.floorOpenings ?? []).map((opening) => opening.id));
  let index = existingIds.size + 1;
  let candidate = `stair-opening-${index}`;

  while (existingIds.has(candidate)) {
    index += 1;
    candidate = `stair-opening-${index}`;
  }

  return candidate;
}

function addStairOpening(scene: BuildingTestScene, levelId: BuildingLevel['id']) {
  const targetLevel = scene.building.levels.find((level) => level.id === levelId);

  if (!targetLevel) {
    return scene;
  }

  const levelCenter = getLevelCenter(scene, targetLevel);

  return updateLevel(scene, levelId, (level) => ({
    ...level,
    floorOpenings: [
      ...(level.floorOpenings ?? []),
      {
        depth: Math.min(Math.max(level.depth * 0.22, 1.2), Math.max(level.depth - 1, 1.2)),
        id: createStairOpeningId(level),
        label: 'Stair opening',
        position: {
          x: roundMetric(levelCenter.x + Math.min(level.width * 0.2, 2)),
          z: levelCenter.z,
        },
        type: 'STAIR',
        width: Math.min(Math.max(level.width * 0.18, 1.2), Math.max(level.width - 1, 1.2)),
      },
    ],
  }));
}

function addFloorOpeningAtPosition(
  scene: BuildingTestScene,
  levelId: BuildingLevel['id'],
  position: { x: number; z: number },
) {
  const targetLevel = scene.building.levels.find((level) => level.id === levelId);

  if (!targetLevel) {
    return scene;
  }

  const levelCenter = getLevelCenter(scene, targetLevel);
  const width = Math.min(Math.max(targetLevel.width * 0.18, 1.2), Math.max(targetLevel.width - 1, 1.2));
  const depth = Math.min(Math.max(targetLevel.depth * 0.22, 1.2), Math.max(targetLevel.depth - 1, 1.2));
  const maxOffsetX = Math.max((targetLevel.width - width) / 2, 0);
  const maxOffsetZ = Math.max((targetLevel.depth - depth) / 2, 0);
  const offsetX = clamp(position.x - levelCenter.x, -maxOffsetX, maxOffsetX);
  const offsetZ = clamp(position.z - levelCenter.z, -maxOffsetZ, maxOffsetZ);

  return updateLevel(scene, levelId, (level) => ({
    ...level,
    floorOpenings: [
      ...(level.floorOpenings ?? []),
      {
        depth,
        id: createStairOpeningId(level),
        label: 'Floor hole',
        position: {
          x: roundMetric(levelCenter.x + offsetX),
          z: roundMetric(levelCenter.z + offsetZ),
        },
        type: 'STAIR',
        width,
      },
    ],
  }));
}

function updateStairOpening(
  scene: BuildingTestScene,
  levelId: BuildingLevel['id'],
  openingId: string,
  update: Partial<{ depth: number; offsetX: number; offsetZ: number; width: number }>,
) {
  const targetLevel = scene.building.levels.find((level) => level.id === levelId);

  if (!targetLevel) {
    return scene;
  }

  const levelCenter = getLevelCenter(scene, targetLevel);

  return updateLevel(scene, levelId, (level) => ({
    ...level,
    floorOpenings: (level.floorOpenings ?? []).map((opening) =>
      {
        if (opening.id !== openingId) {
          return opening;
        }

        const width = update.width === undefined ? opening.width : roundMetric(clamp(update.width, 0.6, Math.max(level.width - 0.6, 0.6)));
        const depth = update.depth === undefined ? opening.depth : roundMetric(clamp(update.depth, 0.6, Math.max(level.depth - 0.6, 0.6)));
        const maxOffsetX = Math.max((level.width - width) / 2, 0);
        const maxOffsetZ = Math.max((level.depth - depth) / 2, 0);
        const currentOffsetX = opening.position.x - levelCenter.x;
        const currentOffsetZ = opening.position.z - levelCenter.z;
        const offsetX = roundMetric(clamp(update.offsetX ?? currentOffsetX, -maxOffsetX, maxOffsetX));
        const offsetZ = roundMetric(clamp(update.offsetZ ?? currentOffsetZ, -maxOffsetZ, maxOffsetZ));

        return {
          ...opening,
          depth,
          position: {
            x: roundMetric(levelCenter.x + offsetX),
            z: roundMetric(levelCenter.z + offsetZ),
          },
          width,
        };
      }
    ),
  }));
}

function removeStairOpening(scene: BuildingTestScene, levelId: BuildingLevel['id'], openingId: string) {
  return updateLevel(scene, levelId, (level) => ({
    ...level,
    floorOpenings: (level.floorOpenings ?? []).filter((opening) => opening.id !== openingId),
  }));
}

function updateLevelLayout(scene: BuildingTestScene, levelId: BuildingLevel['id'], layout: RoomLayoutState) {
  const size = getLayoutSize(layout);

  return updateLevel(scene, levelId, (level) => ({
    ...level,
    depth: level.projectAreaId ? level.depth : roundMetric(size.depth),
    footprintOffset: {
      x: roundMetric(size.centerX - scene.building.position.x),
      z: roundMetric(size.centerZ - scene.building.position.z),
    },
    layout: level.projectAreaId
      ? {
          ...layout,
          wallHeight: level.wallHeight,
          walls: layout.walls.map((wall) => ({ ...wall, height: level.wallHeight })),
        }
      : layout,
    wallHeight: level.projectAreaId ? level.wallHeight : layout.wallHeight,
    width: level.projectAreaId ? level.width : roundMetric(size.width),
  }));
}

function createLevelBox(scene: BuildingTestScene, levelId: BuildingLevel['id']) {
  const level = scene.building.levels.find((candidate) => candidate.id === levelId);

  if (!level) {
    return scene;
  }

  const center = getLevelCenter(scene, level);
  const layout = createDefaultRoomLayout();
  const defaultSize = getLayoutSize(layout);
  const dx = center.x - defaultSize.centerX;
  const dz = center.z - defaultSize.centerZ;
  const shiftedLayout = {
    ...layout,
    wallHeight: level.wallHeight,
    wallThickness: 0.16,
    points: layout.points.map((point) => ({
      ...point,
      x: roundMetric(point.x + dx),
      y: roundMetric(point.y + dz),
    })),
    walls: layout.walls.map((wall) => ({
      ...wall,
      height: level.wallHeight,
      thickness: 0.16,
    })),
  };

  return updateLevelLayout(scene, levelId, shiftedLayout);
}

function resetLevelToAreaBox(scene: BuildingTestScene, levelId: BuildingLevel['id']) {
  const level = scene.building.levels.find((candidate) => candidate.id === levelId);

  if (!level) {
    return scene;
  }

  const center = getLevelCenter(scene, level);
  const layout = createRectLevelLayout(level.id, level.width, level.depth, center.x, center.z, level.wallHeight);

  return updateLevelLayout(scene, levelId, layout);
}

function copyLowerLevelLayout(scene: BuildingTestScene, levelId: BuildingLevel['id']) {
  const sortedLevels = [...scene.building.levels].sort((first, second) => first.elevation - second.elevation);
  const levelIndex = sortedLevels.findIndex((level) => level.id === levelId);
  const targetLevel = sortedLevels[levelIndex];
  const lowerLevel = levelIndex > 0 ? sortedLevels[levelIndex - 1] : null;

  if (!targetLevel || !lowerLevel?.layout) {
    return scene;
  }

  const targetCenter = getLevelCenter(scene, targetLevel);
  const copiedLayout = resizeLevelLayout(lowerLevel.layout, targetLevel.width, targetLevel.depth);

  if (!copiedLayout) {
    return scene;
  }

  const copiedSize = getLayoutSize(copiedLayout);
  const shiftedLayout = translateLayout(
    {
      ...copiedLayout,
      wallHeight: targetLevel.wallHeight,
      walls: copiedLayout.walls.map((wall) => ({
        ...wall,
        id: `${targetLevel.id}-${wall.id}`,
        endPointId: `${targetLevel.id}-${wall.endPointId}`,
        height: targetLevel.wallHeight,
        startPointId: `${targetLevel.id}-${wall.startPointId}`,
      })),
      points: copiedLayout.points.map((point) => ({
        ...point,
        id: `${targetLevel.id}-${point.id}`,
      })),
      doors: copiedLayout.doors.map((door) => ({ ...door, id: `${targetLevel.id}-${door.id}`, wallId: `${targetLevel.id}-${door.wallId}` })),
      openings: copiedLayout.openings.map((opening) => ({ ...opening, id: `${targetLevel.id}-${opening.id}`, wallId: `${targetLevel.id}-${opening.wallId}` })),
      windows: copiedLayout.windows.map((windowOpening) => ({ ...windowOpening, id: `${targetLevel.id}-${windowOpening.id}`, wallId: `${targetLevel.id}-${windowOpening.wallId}` })),
    },
    roundMetric(targetCenter.x - copiedSize.centerX),
    roundMetric(targetCenter.z - copiedSize.centerZ),
  );

  return updateLevelLayout(scene, levelId, shiftedLayout ?? copiedLayout);
}

function alignLevelToBase(scene: BuildingTestScene, levelId: string) {
  const baseLevel = scene.building.levels[0];

  if (!baseLevel) {
    return scene;
  }

  return updateLevel(scene, levelId, (level) => ({
    ...level,
    footprintOffset: { x: 0, z: 0 },
  }));
}

function removeBuildingFloor(scene: BuildingTestScene, levelId: string) {
  if (scene.building.levels.length <= 1) {
    return scene;
  }

  return syncBuildingShell({
    ...scene,
    building: {
      ...scene.building,
      levels: scene.building.levels.filter((level) => level.id !== levelId),
    },
    surfaces: scene.surfaces.filter((surface) => surface.levelId !== levelId),
  }, {});
}

function syncLinkedLevelDimensionsFromAreas(
  scene: BuildingTestScene,
  areaByProjectAreaId: Map<string, BuildingProjectFloorAreaSource>,
) {
  if (areaByProjectAreaId.size === 0) {
    return scene;
  }

  const nextLevels = scene.building.levels.map((level) => {
    const area = level.projectAreaId ? areaByProjectAreaId.get(level.projectAreaId) : undefined;

    if (!area) {
      return level;
    }

    const width = typeof area.width === 'number' ? Math.max(area.width, 4) : level.width;
    const depth = typeof area.length === 'number' ? Math.max(area.length, 4) : level.depth;
    const height = typeof area.height === 'number' ? Math.max(area.height, 2.4) : level.height;
    const wallHeight = typeof area.height === 'number' ? Math.max(area.height - 0.25, 1.8) : level.wallHeight;
    const layoutSize = level.layout ? getLayoutSize(level.layout) : null;
    const shouldResizeLayout =
      !layoutSize ||
      Math.abs(layoutSize.width - width) > LINKED_AREA_LAYOUT_SYNC_TOLERANCE ||
      Math.abs(layoutSize.depth - depth) > LINKED_AREA_LAYOUT_SYNC_TOLERANCE;
    const levelCenter = getLevelCenter(scene, level);
    const resizedLayout = shouldResizeLayout
      ? resizeLevelLayout(level.layout, width, depth) ?? createRectLevelLayout(level.id, width, depth, levelCenter.x, levelCenter.z, wallHeight)
      : level.layout;

    return {
      ...level,
      depth,
      height,
      label: area.areaName || level.label,
      layout: resizedLayout
        ? {
            ...resizedLayout,
            wallHeight,
            walls: resizedLayout.walls.map((wall) => ({ ...wall, height: wallHeight })),
          }
        : resizedLayout,
      wallHeight,
      width,
    };
  });

  return syncBuildingShell(scene, {
    levels: normalizeLevelStackClearance(nextLevels),
  });
}

function formatOptionalMetric(value: number | null | undefined, unit: string) {
  return typeof value === 'number' ? `${roundMetric(value)}${unit}` : '-';
}

function getLevelAreaInfo(
  areaByProjectAreaId: Map<string, BuildingProjectFloorAreaSource>,
  level: BuildingLevel,
) {
  const area = level.projectAreaId ? areaByProjectAreaId.get(level.projectAreaId) : undefined;

  return {
    areaName: area?.areaName ?? level.label,
    floorNumber: area?.floorNumber,
    height: area?.height ?? level.height,
    length: area?.length ?? level.depth,
    projectAreaId: level.projectAreaId ?? null,
    width: area?.width ?? level.width,
  };
}

function hasAreaDimensions(areaInfo: ReturnType<typeof getLevelAreaInfo>) {
  return typeof areaInfo.width === 'number' || typeof areaInfo.length === 'number' || typeof areaInfo.height === 'number';
}

function NumberField({ label, max, min = 0, onChange, step = 0.1, value }: NumberFieldProps) {
  const [draftValue, setDraftValue] = useState(formatNumberInput(value));

  useEffect(() => {
    setDraftValue(formatNumberInput(value));
  }, [value]);

  function commitDraft() {
    const parsedValue = parseNumberInput(draftValue, value);
    const nextValue = roundMetric(clamp(parsedValue, min, max ?? Number.POSITIVE_INFINITY));

    setDraftValue(formatNumberInput(nextValue));

    if (nextValue !== value) {
      onChange(nextValue);
    }
  }

  return (
    <label className="blueprint-number-field">
      <span>{label}</span>
      <input
        inputMode="decimal"
        max={max}
        min={min}
        step={step}
        type="text"
        value={draftValue}
        onBlur={commitDraft}
        onChange={(event) => setDraftValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

function ReadonlyMetricField({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="blueprint-readonly-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function BuildingBlueprintTestPage() {
  const { sceneId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state as BuildingBlueprintRouteState | null;
  const { resetSceneData, sceneData, setRemoteSceneData, setSceneData, shouldKeepSceneDraft } = useBuildingTestSceneState(sceneId);
  const hasLocalSceneEditsRef = useRef(false);
  const appliedAreaTemplateRef = useRef<string | null>(null);
  const roomPlannerSceneQuery = useRoomPlannerScene(sceneId, { enabled: Boolean(sceneId) });
  const currentProposalId = routeState?.proposalId ?? roomPlannerSceneQuery.data?.proposalId ?? null;
  const proposalDetailQuery = useProposalDetail(currentProposalId ?? undefined, {
    enabled: Boolean(currentProposalId && !roomPlannerSceneQuery.data?.projectId),
  });
  const currentProjectId = routeState?.projectId ?? roomPlannerSceneQuery.data?.projectId ?? proposalDetailQuery.data?.projectId ?? null;
  const projectAreasQuery = useProjectAreas(
    currentProjectId ? { projectId: currentProjectId, includeCancelled: false } : undefined,
    { enabled: Boolean(currentProjectId) },
  );
  const [activeLayer, setActiveLayer] = useState<BuildingLevelVisibility>('ground');
  const [activeTool, setActiveTool] = useState<BlueprintTool>('select');
  const [selectedItem, setSelectedItem] = useState<SelectedRoomItem | null>(null);
  const [blueprintMessage, setBlueprintMessage] = useState('');
  const bounds = useMemo(() => {
    const padding = 28;
    const scale = Math.min(760 / sceneData.site.width, 560 / sceneData.site.depth);

    return {
      centerX: 420,
      centerY: 320,
      padding,
      scale,
      siteHeight: sceneData.site.depth * scale,
      siteWidth: sceneData.site.width * scale,
    };
  }, [sceneData.site.depth, sceneData.site.width]);
  const visibleSurfaces = sceneData.surfaces.filter((surface) => activeLayer === 'site' ? surface.levelId === 'site' : surface.levelId === activeLayer);
  const sortedLevels = useMemo(
    () => [...sceneData.building.levels].sort((first, second) => first.elevation - second.elevation),
    [sceneData.building.levels],
  );
  const levelTabs = useMemo<Array<{ label: string; value: BuildingLevelVisibility }>>(
    () => sortedLevels.map((level) => ({ label: level.label, value: level.id })),
    [sortedLevels],
  );
  const activeLevel = sortedLevels.find((level) => level.id === activeLayer) ?? null;
  const activeLevelIndex = activeLevel ? sortedLevels.findIndex((level) => level.id === activeLevel.id) : -1;
  const underlayLevel = activeLevelIndex > 0 ? sortedLevels[activeLevelIndex - 1] : null;
  const activeLevelCenter = activeLevel ? getLevelCenter(sceneData, activeLevel) : sceneData.building.position;
  const underlayCenter = underlayLevel ? getLevelCenter(sceneData, underlayLevel) : null;
  const frontYard = sceneData.surfaces.find((surface) => surface.id === 'front-yard');
  const frontYardBasePlacement = frontYard ? getFrontYardBasePlacement(sceneData, frontYard.depth) : null;
  const frontYardOffset = frontYard && frontYardBasePlacement
    ? {
        x: roundMetric(frontYard.position.x - frontYardBasePlacement.x),
        z: roundMetric(frontYard.position.z - frontYardBasePlacement.z),
      }
    : null;
  const sceneProjectAreaIds = useMemo(
    () => getSceneProjectAreaIds(routeState, roomPlannerSceneQuery.data),
    [routeState, roomPlannerSceneQuery.data],
  );
  const templateAreas = useMemo<BuildingProjectFloorAreaSource[]>(() => {
    if (routeState?.areas?.length) {
      return routeState.areas;
    }

    const fetchedAreas = projectAreasQuery.data ?? [];
    const selectedAreaIds = new Set(sceneProjectAreaIds);

    return selectedAreaIds.size > 0
      ? sceneProjectAreaIds
          .map((areaId) => fetchedAreas.find((area) => area.projectAreaId === areaId))
          .filter((area): area is NonNullable<typeof area> => Boolean(area))
          .map(toBuildingProjectFloorAreaSource)
      : fetchedAreas.map(toBuildingProjectFloorAreaSource);
  }, [projectAreasQuery.data, routeState?.areas, sceneProjectAreaIds]);
  const areaByProjectAreaId = useMemo(
    () => new Map(templateAreas.map((area) => [area.projectAreaId, area])),
    [templateAreas],
  );

  useEffect(() => {
    if (activeLayer === 'site' || !sceneData.building.levels.some((level) => level.id === activeLayer)) {
      setActiveLayer(sceneData.building.levels[0]?.id ?? 'ground');
    }
  }, [activeLayer, sceneData.building.levels]);

  useEffect(() => {
    if (areaByProjectAreaId.size === 0) {
      return;
    }

    if (roomPlannerSceneQuery.isLoading) {
      return;
    }

    const nextScene = syncLinkedLevelDimensionsFromAreas(sceneData, areaByProjectAreaId);

    if (nextScene === sceneData || JSON.stringify(nextScene.building.levels) === JSON.stringify(sceneData.building.levels)) {
      return;
    }

    if (hasLocalSceneEditsRef.current) {
      setSceneData(nextScene);
      return;
    }

    setRemoteSceneData(nextScene, roomPlannerSceneQuery.data?.lastSavedAt ?? null);
  }, [
    areaByProjectAreaId,
    roomPlannerSceneQuery.data?.lastSavedAt,
    roomPlannerSceneQuery.isLoading,
    sceneData,
    setRemoteSceneData,
    setSceneData,
  ]);

  useEffect(() => {
    setSelectedItem(null);
  }, [activeLayer]);

  function worldXToSvg(x: number) {
    return bounds.centerX + x * bounds.scale;
  }

  function worldZToSvg(z: number) {
    return bounds.centerY + z * bounds.scale;
  }

  function rectProps(width: number, depth: number, x: number, z: number) {
    return {
      height: depth * bounds.scale,
      width: width * bounds.scale,
      x: worldXToSvg(x - width / 2),
      y: worldZToSvg(z - depth / 2),
    };
  }

  function getCurrentLevelId() {
    return sceneData.building.levels.some((level) => level.id === activeLayer) ? activeLayer : null;
  }

  const currentLevelId = getCurrentLevelId();
  const currentLayout = currentLevelId
    ? sceneData.building.levels.find((level) => level.id === currentLevelId)?.layout ?? null
    : null;
  const underlayLayout = underlayLevel?.layout ?? null;
  const activeLayerLabel = levelTabs.find((tab) => tab.value === activeLayer)?.label ?? 'Layer';
  const activeToolLabel = blueprintTools.find((tool) => tool.value === activeTool)?.label ?? 'Tool';
  const activeAreaInfo = activeLevel ? getLevelAreaInfo(areaByProjectAreaId, activeLevel) : null;

  function updateSceneDraft(update: Parameters<typeof setSceneData>[0]) {
    hasLocalSceneEditsRef.current = true;
    setSceneData(update);
  }

  function handleBlueprintLayoutChange(layout: RoomLayoutState) {
    if (!currentLevelId) {
      return;
    }

    updateSceneDraft((scene) => updateLevelLayout(scene, currentLevelId as BuildingLevel['id'], layout));
  }

  function handleFloorOpeningAdd(position: { x: number; z: number }) {
    if (!currentLevelId) {
      return;
    }

    updateSceneDraft((scene) => addFloorOpeningAtPosition(scene, currentLevelId as BuildingLevel['id'], position));
  }

  function handleFloorOpeningUpdate(
    openingId: string,
    update: Partial<{ depth: number; position: { x: number; z: number }; width: number }>,
  ) {
    if (!currentLevelId) {
      return;
    }

    updateSceneDraft((scene) => {
      const level = scene.building.levels.find((candidate) => candidate.id === currentLevelId);
      const opening = level?.floorOpenings?.find((candidate) => candidate.id === openingId);

      if (!level || !opening) {
        return scene;
      }

      const levelCenter = getLevelCenter(scene, level);
      return updateStairOpening(scene, currentLevelId as BuildingLevel['id'], openingId, {
        depth: update.depth,
        offsetX: update.position ? update.position.x - levelCenter.x : undefined,
        offsetZ: update.position ? update.position.z - levelCenter.z : undefined,
        width: update.width,
      });
    });
  }

  function handleFloorOpeningDelete(openingId: string) {
    if (!currentLevelId) {
      return;
    }

    updateSceneDraft((scene) => removeStairOpening(scene, currentLevelId as BuildingLevel['id'], openingId));
    setSelectedItem((currentItem) => currentItem?.type === 'floor-hole' && currentItem.id === openingId ? null : currentItem);
  }

  function openThreeDPlanner() {
    const nextScene = centerAndFitFloorStackOnSite(sceneData);

    hasLocalSceneEditsRef.current = true;
    setSceneData(nextScene);
    navigate(sceneId ? `/proposal-scenes/${sceneId}/room-planner` : '/3d-building-test', {
      state: routeState ?? undefined,
    });
  }

  useEffect(() => {
    if (hasLocalSceneEditsRef.current || !roomPlannerSceneQuery.data || shouldKeepSceneDraft(roomPlannerSceneQuery.data.lastSavedAt)) {
      return;
    }

    const hydratedScene = hydrateBuildingRoomPlannerPayload(roomPlannerSceneQuery.data);

    if (hydratedScene.sceneData) {
      setRemoteSceneData(hydratedScene.sceneData, roomPlannerSceneQuery.data.lastSavedAt);
    }
  }, [roomPlannerSceneQuery.data, setRemoteSceneData, shouldKeepSceneDraft]);

  useEffect(() => {
    if (!templateAreas.length || roomPlannerSceneQuery.isLoading || projectAreasQuery.isLoading || hasLocalSceneEditsRef.current) {
      return;
    }

    const hydratedScene = roomPlannerSceneQuery.data
      ? hydrateBuildingRoomPlannerPayload(roomPlannerSceneQuery.data)
      : null;

    if (hydratedScene?.sceneData || shouldKeepSceneDraft(roomPlannerSceneQuery.data?.lastSavedAt ?? null)) {
      return;
    }

    const templateKey = createAreaTemplateKey(templateAreas);

    if (appliedAreaTemplateRef.current === templateKey) {
      return;
    }

    appliedAreaTemplateRef.current = templateKey;
    setRemoteSceneData(
      centerAndFitFloorStackOnSite(createBuildingTestSceneFromProjectFloorAreas(templateAreas)),
      roomPlannerSceneQuery.data?.lastSavedAt ?? null,
    );
  }, [
    projectAreasQuery.isLoading,
    roomPlannerSceneQuery.data,
    roomPlannerSceneQuery.isLoading,
    setRemoteSceneData,
    shouldKeepSceneDraft,
    templateAreas,
  ]);

  return (
    <main className="building-blueprint-page">
      <header className="building-blueprint-header">
        <div>
          <span><IconBuilding size={16} /> Building 2D Blueprint</span>
          <h1>Layered campus layout</h1>
        </div>
        <nav>
          <button type="button" onClick={openThreeDPlanner}>
            Open 3D
          </button>
          <button type="button" onClick={resetSceneData}>
            <IconRotateClockwise size={15} />
            Reset Blueprint
          </button>
        </nav>
      </header>

      <section className="building-blueprint-shell">
        <aside className="building-blueprint-controls">
          <section className="building-blueprint-panel">
            <div className="building-blueprint-panel-heading">
              <strong>Layers</strong>
              <span>{activeLayerLabel}</span>
            </div>
            <div className="building-blueprint-tabs">
              {levelTabs.map((tab) => (
                <button
                  className={activeLayer === tab.value ? 'is-active' : ''}
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveLayer(tab.value)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </section>

          {currentLevelId ? (
            <section className="building-blueprint-panel">
              <div className="building-blueprint-panel-heading">
                <strong>Blueprint Tools</strong>
                <span>{activeToolLabel}</span>
              </div>
              <div className="building-blueprint-tool-grid">
                {blueprintTools.map((tool) => (
                  <button
                    className={activeTool === tool.value ? 'is-active' : ''}
                    key={tool.value}
                    type="button"
                    onClick={() => setActiveTool(tool.value)}
                  >
                    {tool.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSceneData((scene) => createLevelBox(scene, currentLevelId))}
                >
                  Add Box
                </button>
              </div>
              {blueprintMessage ? <div className="building-blueprint-note">{blueprintMessage}</div> : null}
            </section>
          ) : null}

          {SHOW_SITE_CONTROLS ? (
          <section className="building-blueprint-panel">
            <div className="building-blueprint-panel-heading">
              <strong>Site</strong>
              <span>meters</span>
            </div>
            <div className="blueprint-field-grid">
              <NumberField
                label="Site width"
                min={8}
                value={sceneData.site.width}
                onChange={(value) => setSceneData((scene) => ({ ...scene, site: { ...scene.site, width: value } }))}
              />
              <NumberField
                label="Site depth"
                min={8}
                value={sceneData.site.depth}
                onChange={(value) => setSceneData((scene) => ({ ...scene, site: { ...scene.site, depth: value } }))}
              />
              <button className="blueprint-align-button" type="button" onClick={() => setSceneData(centerFloorStackOnSite)}>
                Center Floors on Site
              </button>
              <button className="blueprint-align-button" type="button" onClick={() => setSceneData(fitSiteToFloorStack)}>
                Fit Site to Floors
              </button>
              <button className="blueprint-align-button" type="button" onClick={() => setSceneData(centerAndFitFloorStackOnSite)}>
                Center + Fit Site
              </button>
              {SHOW_FRONT_YARD_CONTROLS && frontYard ? (
                <>
                  <NumberField
                    label="Yard width"
                    min={2}
                    value={frontYard.width}
                    onChange={(value) => setSceneData((scene) => updateSurface(scene, 'front-yard', (surface) => createSyncedFrontYard(scene, { ...surface, width: value })))}
                  />
                  <NumberField
                    label="Yard depth"
                    min={2}
                    value={frontYard.depth}
                    onChange={(value) => setSceneData((scene) => updateSurface(scene, 'front-yard', (surface) => createSyncedFrontYard(scene, { ...surface, depth: value })))}
                  />
                  <NumberField
                    label="Yard offset X"
                    min={-20}
                    value={frontYardOffset?.x ?? 0}
                    onChange={(value) => setSceneData((scene) => {
                      const yard = scene.surfaces.find((surface) => surface.id === 'front-yard');

                      if (!yard) {
                        return scene;
                      }

                      const basePlacement = getFrontYardBasePlacement(scene, yard.depth);

                      return updateSurface(scene, 'front-yard', (surface) => ({
                        ...surface,
                        position: {
                          ...surface.position,
                          x: roundMetric(basePlacement.x + value),
                        },
                      }));
                    })}
                  />
                  <NumberField
                    label="Yard offset Z"
                    min={-20}
                    value={frontYardOffset?.z ?? 0}
                    onChange={(value) => setSceneData((scene) => {
                      const yard = scene.surfaces.find((surface) => surface.id === 'front-yard');

                      if (!yard) {
                        return scene;
                      }

                      const basePlacement = getFrontYardBasePlacement(scene, yard.depth);

                      return updateSurface(scene, 'front-yard', (surface) => ({
                        ...surface,
                        position: {
                          ...surface.position,
                          z: roundMetric(basePlacement.z + value),
                        },
                      }));
                    })}
                  />
                  <button className="blueprint-align-button" type="button" onClick={() => setSceneData(centerFrontYardToFloorOne)}>
                    Center to Floor 1
                  </button>
                  <button className="blueprint-remove-button" type="button" onClick={() => setSceneData((scene) => removeSurface(scene, 'front-yard'))}>
                    Remove Yard
                  </button>
                </>
              ) : SHOW_FRONT_YARD_CONTROLS ? (
                <button className="blueprint-add-button" type="button" onClick={() => setSceneData(addFrontYard)}>
                  Add Front Yard
                </button>
              ) : null}
            </div>
          </section>
          ) : null}

          {SHOW_BUILDING_FOOTPRINT_CONTROLS ? (
          <section className="building-blueprint-panel">
            <div className="building-blueprint-panel-heading">
              <strong>Building Footprint</strong>
              <span>{sceneData.building.width}m x {sceneData.building.depth}m</span>
            </div>
            <div className="blueprint-field-grid">
              <NumberField
                label="Building width"
                min={4}
                value={sceneData.building.width}
                onChange={(value) => setSceneData((scene) => syncBuildingShell(scene, { width: value }))}
              />
              <NumberField
                label="Building depth"
                min={4}
                value={sceneData.building.depth}
                onChange={(value) => setSceneData((scene) => syncBuildingShell(scene, { depth: value }))}
              />
              <NumberField
                label="Position X"
                min={-8}
                value={sceneData.building.position.x}
                onChange={(value) => setSceneData((scene) => syncBuildingShell(scene, { position: { ...scene.building.position, x: value } }))}
              />
              <NumberField
                label="Position Z"
                min={-8}
                value={sceneData.building.position.z}
                onChange={(value) => setSceneData((scene) => syncBuildingShell(scene, { position: { ...scene.building.position, z: value } }))}
              />
              <button className="blueprint-align-button" type="button" onClick={() => setSceneData(centerFloorStackOnSite)}>
                Center Floors on Site
              </button>
            </div>
          </section>
          ) : null}

          <section className="building-blueprint-panel">
            <div className="building-blueprint-panel-heading">
              <strong>Floor Stack</strong>
              <span>{sceneData.building.levels.length} floor(s)</span>
            </div>
            <div className="blueprint-field-grid">
              {sortedLevels.map((level, index) => {
                const balcony = sceneData.surfaces.find((surface) => surface.id === `${level.id}-balcony`);
                const areaInfo = getLevelAreaInfo(areaByProjectAreaId, level);
                const isDimensionLocked = Boolean(level.projectAreaId) && hasAreaDimensions(areaInfo);
                const levelCenter = getLevelCenter(sceneData, level);
                const stairOpening = level.floorOpenings?.[0] ?? null;

                return (
                  <div className="blueprint-floor-card" key={level.id}>
                    <div className="blueprint-floor-card-heading">
                      <strong>{level.label}</strong>
                      <span>{level.projectAreaId ? 'Linked project area' : 'Manual floor'}</span>
                    </div>
                  {isDimensionLocked ? (
                    <>
                      <ReadonlyMetricField label="Width" value={formatOptionalMetric(areaInfo.width, 'm')} />
                      <ReadonlyMetricField label="Depth" value={formatOptionalMetric(areaInfo.length, 'm')} />
                    </>
                  ) : (
                    <>
                      <NumberField
                        label="Width"
                        min={4}
                        value={level.width}
                        onChange={(value) => setSceneData((scene) => resizeLevel(scene, level.id, { width: value }))}
                      />
                      <NumberField
                        label="Depth"
                        min={4}
                        value={level.depth}
                        onChange={(value) => setSceneData((scene) => resizeLevel(scene, level.id, { depth: value }))}
                      />
                    </>
                  )}
                  <NumberField
                    label="Offset X"
                    max={50}
                    min={-50}
                    value={level.footprintOffset.x}
                    onChange={(value) => setSceneData((scene) => updateLevel(scene, level.id, (currentLevel) => ({ ...currentLevel, footprintOffset: { ...currentLevel.footprintOffset, x: value } })))}
                  />
                  <NumberField
                    label="Offset Z"
                    max={50}
                    min={-50}
                    value={level.footprintOffset.z}
                    onChange={(value) => setSceneData((scene) => updateLevel(scene, level.id, (currentLevel) => ({ ...currentLevel, footprintOffset: { ...currentLevel.footprintOffset, z: value } })))}
                  />
                  <NumberField
                    label="Elevation"
                    min={index === 0 ? 0 : 0.1}
                    value={level.elevation}
                    onChange={(value) => setSceneData((scene) => updateLevel(scene, level.id, (currentLevel) => ({ ...currentLevel, elevation: value })))}
                  />
                  {isDimensionLocked ? (
                    <ReadonlyMetricField label="Wall height" value={formatOptionalMetric(level.wallHeight, 'm')} />
                  ) : (
                    <NumberField
                      label="Wall height"
                      min={1.8}
                      value={level.wallHeight}
                      onChange={(value) => setSceneData((scene) => updateLevel(scene, level.id, (currentLevel) => ({ ...currentLevel, wallHeight: value })))}
                    />
                  )}
                    {stairOpening ? (
                      <div className="blueprint-stair-opening-fields">
                        <strong>Stair hole</strong>
                        <NumberField
                          label="Hole width"
                          max={Math.max(level.width - 0.6, 0.6)}
                          min={0.6}
                          value={stairOpening.width}
                          onChange={(value) => setSceneData((scene) => updateStairOpening(scene, level.id, stairOpening.id, { width: value }))}
                        />
                        <NumberField
                          label="Hole depth"
                          max={Math.max(level.depth - 0.6, 0.6)}
                          min={0.6}
                          value={stairOpening.depth}
                          onChange={(value) => setSceneData((scene) => updateStairOpening(scene, level.id, stairOpening.id, { depth: value }))}
                        />
                        <NumberField
                          label="Hole offset X"
                          max={Math.max((level.width - stairOpening.width) / 2, 0)}
                          min={-Math.max((level.width - stairOpening.width) / 2, 0)}
                          value={roundMetric(stairOpening.position.x - levelCenter.x)}
                          onChange={(value) => setSceneData((scene) => updateStairOpening(scene, level.id, stairOpening.id, { offsetX: value }))}
                        />
                        <NumberField
                          label="Hole offset Z"
                          max={Math.max((level.depth - stairOpening.depth) / 2, 0)}
                          min={-Math.max((level.depth - stairOpening.depth) / 2, 0)}
                          value={roundMetric(stairOpening.position.z - levelCenter.z)}
                          onChange={(value) => setSceneData((scene) => updateStairOpening(scene, level.id, stairOpening.id, { offsetZ: value }))}
                        />
                      </div>
                    ) : null}
                    <div className="blueprint-floor-actions">
                      <button className="blueprint-align-button" type="button" onClick={() => setActiveLayer(level.id)}>
                        Edit Floor Layout
                      </button>
                      {index > 0 ? (
                        <>
                          <button className="blueprint-align-button" type="button" onClick={() => setSceneData((scene) => alignLevelToBase(scene, level.id))}>
                            Align Position to Floor 1
                          </button>
                          <button className="blueprint-align-button" type="button" onClick={() => setSceneData((scene) => copyLowerLevelLayout(scene, level.id))}>
                            Copy Lower Layout
                          </button>
                        </>
                      ) : null}
                      <button className="blueprint-align-button" type="button" onClick={() => setSceneData((scene) => resetLevelToAreaBox(scene, level.id))}>
                        Reset Area Box
                      </button>
                      {balcony ? (
                        <button className="blueprint-remove-button" type="button" onClick={() => setSceneData((scene) => removeSurface(scene, `${level.id}-balcony`))}>
                          Remove Balcony
                        </button>
                      ) : (
                        <button className="blueprint-add-button" type="button" onClick={() => setSceneData((scene) => addBalconyForLevel(scene, level.id))}>
                          Add Balcony
                        </button>
                      )}
                      {stairOpening ? (
                        <button className="blueprint-remove-button" type="button" onClick={() => setSceneData((scene) => removeStairOpening(scene, level.id, stairOpening.id))}>
                          Remove Stair Hole
                        </button>
                      ) : (
                        <button className="blueprint-add-button" type="button" onClick={() => setSceneData((scene) => addStairOpening(scene, level.id))}>
                          Add Stair Hole
                        </button>
                      )}
                      {sceneData.building.levels.length > 1 ? (
                        <button className="blueprint-remove-button" type="button" onClick={() => setSceneData((scene) => removeBuildingFloor(scene, level.id))}>
                          Remove Floor
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </aside>

        <section className={currentLevelId ? 'building-blueprint-workspace is-editor' : 'building-blueprint-workspace'}>
          <div className="building-blueprint-toolbar">
            <div>
              <strong>{levelTabs.find((tab) => tab.value === activeLayer)?.label ?? activeLayer} Plan</strong>
              <span>Parametric test blueprint shared with the 3D prototype.</span>
              {activeAreaInfo ? (
                <dl className="building-blueprint-toolbar-area-info">
                  <div><dt>Area</dt><dd>{activeAreaInfo.areaName}</dd></div>
                  <div><dt>Floor</dt><dd>{activeAreaInfo.floorNumber ?? activeLevelIndex + 1}</dd></div>
                  <div><dt>Size</dt><dd>{formatOptionalMetric(activeAreaInfo.width, 'm')} x {formatOptionalMetric(activeAreaInfo.length, 'm')}</dd></div>
                  <div><dt>Height</dt><dd>{formatOptionalMetric(activeAreaInfo.height, 'm')}</dd></div>
                </dl>
              ) : null}
            </div>
          </div>

          {currentLevelId ? (
            <BlueprintCanvas
              activeTool={activeTool}
              floorFillColor="#d8c5a9"
              floorOpenings={activeLevel?.floorOpenings ?? []}
              hideLabels={false}
              layout={currentLayout}
              selectedItem={selectedItem}
              underlay={underlayLayout ? { label: `${underlayLevel?.label ?? 'Lower floor'} underlay`, layout: underlayLayout } : null}
              wallFillColor="#f1eee7"
              onLayoutChange={handleBlueprintLayoutChange}
              onFloorOpeningAdd={handleFloorOpeningAdd}
              onFloorOpeningDelete={handleFloorOpeningDelete}
              onFloorOpeningUpdate={handleFloorOpeningUpdate}
              onMessage={setBlueprintMessage}
              onSelectItem={setSelectedItem}
            />
          ) : (
          <svg className="building-blueprint-canvas" role="img" viewBox="0 0 840 640">
            <defs>
              <pattern height="24" id="blueprint-grid" patternUnits="userSpaceOnUse" width="24">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect fill="#123f56" height="640" width="840" />
            <rect fill="url(#blueprint-grid)" height="640" width="840" />
            <rect
              className="blueprint-site-rect"
              {...rectProps(sceneData.site.width, sceneData.site.depth, 0, 0)}
            />
            <rect
              className="blueprint-building-rect"
              {...rectProps(sceneData.building.width, sceneData.building.depth, sceneData.building.position.x, sceneData.building.position.z)}
            />
            {underlayLevel && underlayCenter ? (
              <g>
                <rect
                  className="blueprint-underlay-rect"
                  {...rectProps(underlayLevel.width, underlayLevel.depth, underlayCenter.x, underlayCenter.z)}
                />
                <text
                  className="blueprint-underlay-label"
                  x={worldXToSvg(underlayCenter.x)}
                  y={worldZToSvg(underlayCenter.z - underlayLevel.depth / 2) - 10}
                >
                  {underlayLevel.label} underlay
                </text>
              </g>
            ) : null}
            {activeLevel ? (
              <rect
                className="blueprint-active-level-rect"
                {...rectProps(activeLevel.width, activeLevel.depth, activeLevelCenter.x, activeLevelCenter.z)}
              />
            ) : null}
            {visibleSurfaces.map((surface) => (
              <g key={surface.id}>
                <rect
                  className={`blueprint-surface-rect is-${surface.type.toLowerCase()}`}
                  {...rectProps(surface.width, surface.depth, surface.position.x, surface.position.z)}
                />
                <text
                  className="blueprint-surface-label"
                  x={worldXToSvg(surface.position.x)}
                  y={worldZToSvg(surface.position.z)}
                >
                  {surface.label}
                </text>
              </g>
            ))}
            <text className="blueprint-scale-label" x="34" y="594">
              Site {sceneData.site.width}m x {sceneData.site.depth}m / Building {sceneData.building.width}m x {sceneData.building.depth}m
            </text>
          </svg>
          )}
        </section>
      </section>
    </main>
  );
}
