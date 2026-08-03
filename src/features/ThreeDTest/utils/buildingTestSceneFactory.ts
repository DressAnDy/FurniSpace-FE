import {
  ArcRotateCamera,
  Color3,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Texture,
  Tools,
  Vector3,
  VertexData,
} from 'babylonjs';

import type { BlueprintWall, DoorOpening, RoomLayoutState, RoomOpeningItem, WindowOpening } from '@/features/ThreeD/types/roomLayout.types';
import {
  getClosedRoomBoundary,
  getPointAtWallOffset,
  getPointById,
  getRoomBounds,
  getWallDirection,
  getWallLength,
  getWallNormal,
} from '@/features/ThreeD/utils/roomGeometry';
import type {
  BuildingLevel,
  BuildingLevelId,
  BuildingLevelVisibility,
  BuildingPlacementSurface,
  BuildingTestScene,
  Vector3State,
} from '@/features/ThreeDTest/schemas/buildingScene.types';

const WALL_THICKNESS = 0.16;
const SLAB_THICKNESS = 0.28;
const FLOOR_SURFACE_OFFSET = 0.018;
const DEFAULT_LEVEL_HEIGHT = 3.1;

export type BuildingProjectFloorAreaSource = {
  areaName: string;
  floorNumber?: number | null;
  height?: number | null;
  length?: number | null;
  projectAreaId: string;
  width?: number | null;
};

export function createRectLevelLayout(
  idPrefix: string,
  width: number,
  depth: number,
  centerX: number,
  centerZ: number,
  wallHeight: number,
): RoomLayoutState {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const points = [
    { id: `${idPrefix}-p1`, x: centerX - halfWidth, y: centerZ - halfDepth },
    { id: `${idPrefix}-p2`, x: centerX + halfWidth, y: centerZ - halfDepth },
    { id: `${idPrefix}-p3`, x: centerX + halfWidth, y: centerZ + halfDepth },
    { id: `${idPrefix}-p4`, x: centerX - halfWidth, y: centerZ + halfDepth },
  ];

  return {
    doors: [],
    floorMaterialId: 'wood-floor',
    openings: [],
    points,
    unit: 'm',
    wallHeight,
    wallMaterialId: 'wall-base',
    wallThickness: WALL_THICKNESS,
    walls: [
      { endPointId: points[1].id, height: wallHeight, id: `${idPrefix}-w1`, startPointId: points[0].id, thickness: WALL_THICKNESS, type: 'WALL' },
      { endPointId: points[2].id, height: wallHeight, id: `${idPrefix}-w2`, startPointId: points[1].id, thickness: WALL_THICKNESS, type: 'WALL' },
      { endPointId: points[3].id, height: wallHeight, id: `${idPrefix}-w3`, startPointId: points[2].id, thickness: WALL_THICKNESS, type: 'WALL' },
      { endPointId: points[0].id, height: wallHeight, id: `${idPrefix}-w4`, startPointId: points[3].id, thickness: WALL_THICKNESS, type: 'WALL' },
    ],
    windows: [],
  };
}

function material(scene: Scene, name: string, color: string, alpha = 1) {
  const nextMaterial = new StandardMaterial(name, scene);
  nextMaterial.diffuseColor = Color3.FromHexString(color);
  nextMaterial.specularColor = Color3.Black();
  nextMaterial.alpha = alpha;
  nextMaterial.backFaceCulling = false;

  return nextMaterial;
}

export function createDefaultBuildingTestScene(): BuildingTestScene {
  const buildingPosition = { x: 0, y: 0, z: 0 };
  const buildingWidth = 11;
  const buildingDepth = 8;
  const levels = [
    createBuildingLevel('ground', 0, buildingWidth, buildingDepth, buildingPosition),
    createBuildingLevel('level-2', 1, buildingWidth, buildingDepth, buildingPosition),
  ];

  return {
    building: {
      depth: buildingDepth,
      levels,
      position: buildingPosition,
      width: buildingWidth,
    },
    camera: {
      target: { x: 0, y: 2.3, z: 1.5 },
    },
    site: {
      depth: 18,
      width: 18,
    },
    surfaces: levels.map((level) => createLevelFloorSurface(level, buildingPosition)),
  };
}

export function createBuildingLevel(
  id: BuildingLevelId,
  levelIndex: number,
  width: number,
  depth: number,
  buildingPosition: Vector3State,
  projectAreaId?: string | null,
): BuildingLevel {
  const elevation = levelIndex === 0 ? 0.16 : levelIndex * DEFAULT_LEVEL_HEIGHT + 0.3;
  const wallHeight = levelIndex === 0 ? 2.85 : 2.65;
  const layout = createRectLevelLayout(id, width, depth, buildingPosition.x, buildingPosition.z, wallHeight);

  return {
    depth,
    elevation,
    footprintOffset: { x: 0, z: 0 },
    height: DEFAULT_LEVEL_HEIGHT,
    id,
    label: `Floor ${levelIndex + 1}`,
    layout,
    projectAreaId: projectAreaId ?? null,
    wallHeight,
    width,
  };
}

export function createLevelFloorSurface(level: BuildingLevel, buildingPosition: Vector3State): BuildingPlacementSurface {
  const levelCenter = {
    x: buildingPosition.x + level.footprintOffset.x,
    z: buildingPosition.z + level.footprintOffset.z,
  };

  return {
    depth: Math.max(level.depth - 0.7, 1),
    elevation: level.elevation + 0.02,
    id: `${level.id}-floor-surface`,
    label: `${level.label} Surface`,
    levelId: level.id,
    position: { x: levelCenter.x, y: level.elevation + 0.02, z: levelCenter.z },
    type: 'FLOOR',
    width: Math.max(level.width - 0.7, 1),
  };
}

export function createBuildingTestSceneFromProjectFloorAreas(
  areas: BuildingProjectFloorAreaSource[],
): BuildingTestScene {
  const baseScene = createDefaultBuildingTestScene();
  const floorAreas = [...areas]
    .filter((area) => area.projectAreaId)
    .sort((first, second) =>
      (first.floorNumber ?? Number.MAX_SAFE_INTEGER) - (second.floorNumber ?? Number.MAX_SAFE_INTEGER) ||
      first.areaName.localeCompare(second.areaName),
    );

  if (!floorAreas.length) {
    return baseScene;
  }

  const levels = floorAreas.map((area, index) => {
    const width = Math.max(area.width ?? baseScene.building.width, 4);
    const depth = Math.max(area.length ?? baseScene.building.depth, 4);
    const levelId = `floor-area-${area.projectAreaId}`;
    const wallHeight = Math.max((area.height ?? 3) - 0.25, 1.8);
    const level = createBuildingLevel(
      levelId,
      index,
      width,
      depth,
      baseScene.building.position,
      area.projectAreaId,
    );

    return {
      ...level,
      height: Math.max(area.height ?? level.height, 2.4),
      label: area.areaName || `Floor ${index + 1}`,
      layout: level.layout
        ? {
            ...level.layout,
            wallHeight,
            walls: level.layout.walls.map((wall) => ({ ...wall, height: wallHeight })),
          }
        : level.layout,
      wallHeight,
    };
  });
  const maxWidth = Math.max(...levels.map((level) => level.width));
  const maxDepth = Math.max(...levels.map((level) => level.depth));

  return {
    ...baseScene,
    building: {
      ...baseScene.building,
      depth: maxDepth,
      levels,
      width: maxWidth,
    },
    camera: {
      target: {
        x: baseScene.building.position.x,
        y: Math.max(...levels.map((level) => level.elevation + level.wallHeight)) / 2,
        z: baseScene.building.position.z,
      },
    },
    site: {
      depth: Math.max(maxDepth + 10, baseScene.site.depth),
      width: Math.max(maxWidth + 10, baseScene.site.width),
    },
    surfaces: levels.map((level) => createLevelFloorSurface(level, baseScene.building.position)),
  };
}

export function createBuildingTestCamera(scene: Scene, canvas: HTMLCanvasElement, sceneData: BuildingTestScene) {
  const camera = new ArcRotateCamera(
    'building-test-camera',
    // Match the 2D blueprint orientation: screen-right is world +X and screen-down is world +Z.
    Tools.ToRadians(-90),
    Tools.ToRadians(56),
    18,
    new Vector3(sceneData.camera.target.x, sceneData.camera.target.y, sceneData.camera.target.z),
    scene,
  );

  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 6;
  camera.upperRadiusLimit = 44;
  camera.wheelDeltaPercentage = 0.01;
  camera.panningSensibility = 70;
  camera.maxZ = 1000;

  return camera;
}

export function createBuildingTestLighting(scene: Scene) {
  const light = new HemisphericLight('building-test-hemi-light', new Vector3(0.4, 1, 0.25), scene);
  light.intensity = 0.92;

  return light;
}

export function getLevelCenter(sceneData: BuildingTestScene, level: BuildingLevel) {
  return {
    x: sceneData.building.position.x + level.footprintOffset.x,
    z: sceneData.building.position.z + level.footprintOffset.z,
  };
}

export function buildBuildingEnvironment(
  scene: Scene,
  sceneData: BuildingTestScene,
  activeLevel: BuildingLevelVisibility,
) {
  clearBuildingEnvironment(scene);

  const siteMaterial = material(scene, 'building-test-site-material', '#d7dfd4');
  const yardMaterial = material(scene, 'building-test-yard-material', '#c5d5c4');
  const floorMaterial = material(scene, 'building-test-floor-material', '#d8c5a9');
  const slabMaterial = material(scene, 'building-test-slab-material', '#aeb7b8');
  const wallMaterial = material(scene, 'building-test-wall-material', '#f1eee7');
  const glassMaterial = material(scene, 'building-test-glass-material', '#85bdd0', 0.42);
  const doorMaterial = createDoorMaterial(scene);
  const windowFrameMaterial = material(scene, 'building-test-window-frame-material', '#d8e1e4');
  const railMaterial = material(scene, 'building-test-rail-material', '#51656b');

  const site = MeshBuilder.CreateGround(
    'building-test-site',
    { height: sceneData.site.depth, subdivisions: 1, width: sceneData.site.width },
    scene,
  );
  site.material = siteMaterial;
  site.metadata = { source: 'building-test-environment', kind: 'site' };

  sceneData.surfaces
    .filter((surface) => {
      if (surface.type !== 'FLOOR') {
        return true;
      }

      return !sceneData.building.levels.some((level) => level.id === surface.levelId && level.layout);
    })
    .forEach((surface) => {
    const isYard = surface.type === 'YARD';
    const surfaceMesh = MeshBuilder.CreateGround(
      `building-test-surface-${surface.id}`,
      { height: surface.depth, subdivisions: 1, width: surface.width },
      scene,
    );
    surfaceMesh.position = new Vector3(surface.position.x, surface.elevation, surface.position.z);
    surfaceMesh.material = isYard ? yardMaterial : floorMaterial;
    surfaceMesh.metadata = {
      elevation: surface.elevation,
      kind: 'placement-surface',
      levelId: surface.levelId,
      source: 'building-test-environment',
      surfaceId: surface.id,
      surfaceLabel: surface.label,
      surfaceType: surface.type,
    };

    if (surface.type === 'BALCONY') {
      createBalconyRailing(scene, surface, railMaterial);
    }
  });

  const sortedLevels = [...sceneData.building.levels].sort((first, second) => first.elevation - second.elevation);

  sortedLevels.forEach((level, levelIndex) => {
    const nextLevel = sortedLevels[levelIndex + 1] ?? null;
    const visible = activeLevel === 'all' || activeLevel === level.id;
    const ghosted = activeLevel !== 'all' && activeLevel !== level.id;
    const y = level.elevation;
    const levelCenter = getLevelCenter(sceneData, level);
    const levelLayout = level.layout;
    const facadeBaseY = level.elevation - SLAB_THICKNESS;
    const facadeHeight = getFacadeHeight(level, nextLevel);
    const slabWidth = Math.max(level.width - WALL_THICKNESS * 2.4, 0.5);
    const slabDepth = Math.max(level.depth - WALL_THICKNESS * 2.4, 0.5);
    const slab = MeshBuilder.CreateBox(
      `building-test-${level.id}-slab`,
      { depth: slabDepth, height: SLAB_THICKNESS, width: slabWidth },
      scene,
    );
    slab.position = new Vector3(levelCenter.x, y - SLAB_THICKNESS / 2, levelCenter.z);
    slab.material = slabMaterial;
    slab.isPickable = false;
    slab.metadata = { kind: 'level-slab', levelId: level.id, source: 'building-test-environment' };

    if (levelLayout) {
      createLevelLayoutMeshes(scene, level.id, y, facadeBaseY, facadeHeight, levelLayout, floorMaterial, wallMaterial, glassMaterial, doorMaterial, windowFrameMaterial);
    } else {
      createLevelWalls(scene, levelCenter, level.id, y, facadeBaseY, level.width, level.depth, facadeHeight, wallMaterial, glassMaterial);
    }

    scene.meshes
      .filter((mesh) => mesh.metadata?.source === 'building-test-environment' && mesh.metadata?.levelId === level.id)
      .forEach((mesh) => {
        mesh.isVisible = visible;
        if (mesh.material && 'alpha' in mesh.material) {
          (mesh.material as StandardMaterial).alpha = ghosted ? 0.22 : 1;
        }
      });
  });

  applyLevelVisibility(scene, activeLevel);
}

function getFacadeHeight(level: BuildingLevel, nextLevel: BuildingLevel | null) {
  if (!nextLevel) {
    return level.wallHeight + SLAB_THICKNESS;
  }

  return Math.max(level.wallHeight + SLAB_THICKNESS, nextLevel.elevation - level.elevation);
}

function createBalconyRailing(
  scene: Scene,
  surface: BuildingPlacementSurface,
  railMaterial: StandardMaterial,
) {
  const railHeight = 0.82;
  const railDepth = 0.08;
  const railY = surface.elevation + railHeight / 2;
  const frontZ = surface.position.z - surface.depth / 2;
  const leftX = surface.position.x - surface.width / 2;
  const rightX = surface.position.x + surface.width / 2;

  const frontRail = MeshBuilder.CreateBox(
    `building-test-${surface.id}-front-rail`,
    { depth: railDepth, height: railHeight, width: surface.width },
    scene,
  );
  frontRail.position = new Vector3(surface.position.x, railY, frontZ);
  frontRail.material = railMaterial;
  frontRail.metadata = { levelId: surface.levelId, source: 'building-test-environment', surfaceId: surface.id };

  const leftRail = MeshBuilder.CreateBox(
    `building-test-${surface.id}-left-rail`,
    { depth: surface.depth, height: railHeight, width: railDepth },
    scene,
  );
  leftRail.position = new Vector3(leftX, railY, surface.position.z);
  leftRail.material = railMaterial;
  leftRail.metadata = { levelId: surface.levelId, source: 'building-test-environment', surfaceId: surface.id };

  const rightRail = MeshBuilder.CreateBox(
    `building-test-${surface.id}-right-rail`,
    { depth: surface.depth, height: railHeight, width: railDepth },
    scene,
  );
  rightRail.position = new Vector3(rightX, railY, surface.position.z);
  rightRail.material = railMaterial;
  rightRail.metadata = { levelId: surface.levelId, source: 'building-test-environment', surfaceId: surface.id };
}

function createLevelLayoutMeshes(
  scene: Scene,
  levelId: string,
  floorY: number,
  wallBaseY: number,
  facadeHeight: number,
  layout: RoomLayoutState,
  floorMaterial: StandardMaterial,
  wallMaterial: StandardMaterial,
  glassMaterial: StandardMaterial,
  doorMaterial: StandardMaterial,
  windowFrameMaterial: StandardMaterial,
) {
  const boundary = getClosedRoomBoundary(layout);

  if (boundary.length >= 3) {
    const bounds = getRoomBounds(boundary);
    const width = Math.max(bounds.maxX - bounds.minX, 1);
    const depth = Math.max(bounds.maxY - bounds.minY, 1);
    const floor = new Mesh(`building-test-${levelId}-layout-floor`, scene);
    const vertexData = new VertexData();

    vertexData.positions = boundary.flatMap((point) => [point.x, floorY + FLOOR_SURFACE_OFFSET, point.y]);
    vertexData.indices = triangulateFloorBoundary(boundary);
    vertexData.normals = boundary.flatMap(() => [0, 1, 0]);
    vertexData.uvs = boundary.flatMap((point) => [
      (point.x - bounds.minX) / width,
      (point.y - bounds.minY) / depth,
    ]);
    vertexData.applyToMesh(floor);
    floor.material = floorMaterial;
    floor.metadata = {
      elevation: floorY,
      kind: 'placement-surface',
      levelId,
      source: 'building-test-environment',
      surfaceId: `${levelId}-layout-floor`,
      surfaceLabel: `${levelId} Layout Floor`,
      surfaceType: 'FLOOR',
    };
  }

  layout.walls.forEach((wall) => {
    createLayoutWallWithOpenings(
      scene,
      levelId,
      floorY,
      wallBaseY,
      facadeHeight,
      layout,
      wall,
      wallMaterial,
      glassMaterial,
      doorMaterial,
      windowFrameMaterial,
    );
  });
}

function getSignedPolygonArea(points: Array<{ x: number; y: number }>) {
  return points.reduce((area, point, index) => {
    const nextPoint = points[(index + 1) % points.length];

    return area + point.x * nextPoint.y - nextPoint.x * point.y;
  }, 0) / 2;
}

function isPointInsideTriangle(
  point: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
) {
  const area = (first: { x: number; y: number }, second: { x: number; y: number }, third: { x: number; y: number }) =>
    (first.x * (second.y - third.y) + second.x * (third.y - first.y) + third.x * (first.y - second.y)) / 2;
  const triangleArea = Math.abs(area(a, b, c));
  const summedArea = Math.abs(area(point, b, c)) + Math.abs(area(a, point, c)) + Math.abs(area(a, b, point));

  return Math.abs(triangleArea - summedArea) < 0.0001;
}

function triangulateFloorBoundary(points: Array<{ x: number; y: number }>) {
  if (points.length < 3) {
    return [];
  }

  const fallbackFan = () => points.slice(1, -1).flatMap((_point, index) => [0, index + 1, index + 2]);
  const clockwise = getSignedPolygonArea(points) < 0;
  const remaining = points.map((_point, index) => index);
  const indices: number[] = [];
  let guard = 0;

  while (remaining.length > 3 && guard < points.length * points.length) {
    let clipped = false;

    for (let index = 0; index < remaining.length; index += 1) {
      const previousIndex = remaining[(index - 1 + remaining.length) % remaining.length];
      const currentIndex = remaining[index];
      const nextIndex = remaining[(index + 1) % remaining.length];
      const previous = points[previousIndex];
      const current = points[currentIndex];
      const next = points[nextIndex];
      const cross = (current.x - previous.x) * (next.y - current.y) - (current.y - previous.y) * (next.x - current.x);
      const isConvex = clockwise ? cross < 0 : cross > 0;

      if (!isConvex) {
        continue;
      }

      const containsPoint = remaining.some((candidateIndex) => {
        if (candidateIndex === previousIndex || candidateIndex === currentIndex || candidateIndex === nextIndex) {
          return false;
        }

        return isPointInsideTriangle(points[candidateIndex], previous, current, next);
      });

      if (containsPoint) {
        continue;
      }

      indices.push(previousIndex, currentIndex, nextIndex);
      remaining.splice(index, 1);
      clipped = true;
      break;
    }

    if (!clipped) {
      return fallbackFan();
    }

    guard += 1;
  }

  if (remaining.length === 3) {
    indices.push(remaining[0], remaining[1], remaining[2]);
  }

  return indices.length ? indices : fallbackFan();
}

function getWallOpenings(layout: RoomLayoutState, wall: BlueprintWall) {
  const wallLength = getWallLength(wall, layout.points);

  return [...layout.doors, ...layout.windows, ...layout.openings]
    .filter((opening) => opening.wallId === wall.id)
    .map((opening) => ({
      end: Math.min(opening.offset + opening.width / 2, wallLength),
      opening,
      start: Math.max(opening.offset - opening.width / 2, 0),
    }))
    .filter((cutout) => cutout.end - cutout.start > 0.1)
    .sort((first, second) => first.start - second.start);
}

function createLayoutWallSegment(
  scene: Scene,
  levelId: string,
  bottomY: number,
  layout: RoomLayoutState,
  wall: BlueprintWall,
  startOffset: number,
  endOffset: number,
  material: StandardMaterial,
  suffix: string,
  height: number,
) {
  const length = endOffset - startOffset;

  if (length <= 0.08 || height <= 0.05) {
    return;
  }

  const start = getPointById(layout.points, wall.startPointId);
  const direction = getWallDirection(wall, layout.points);
  const centerOffset = (startOffset + endOffset) / 2;
  const mesh = MeshBuilder.CreateBox(
    `building-test-${levelId}-${wall.id}-${suffix}`,
    { depth: wall.thickness, height, width: length },
    scene,
  );

  mesh.position = new Vector3(
    start.x + direction.x * centerOffset,
    bottomY + height / 2,
    start.y + direction.y * centerOffset,
  );
  mesh.rotation.y = -Math.atan2(direction.y, direction.x);
  mesh.material = material;
  mesh.metadata = {
    kind: 'wall-collision',
    levelId,
    source: 'building-test-environment',
    wallId: wall.id,
  };
}

function createLayoutWallWithOpenings(
  scene: Scene,
  levelId: string,
  floorY: number,
  wallBaseY: number,
  facadeHeight: number,
  layout: RoomLayoutState,
  wall: BlueprintWall,
  wallMaterial: StandardMaterial,
  glassMaterial: StandardMaterial,
  doorMaterial: StandardMaterial,
  windowFrameMaterial: StandardMaterial,
) {
  const wallLength = getWallLength(wall, layout.points);
  const cutouts = getWallOpenings(layout, wall);
  let cursor = 0;

  cutouts.forEach((cutout, index) => {
    createLayoutWallSegment(scene, levelId, wallBaseY, layout, wall, cursor, cutout.start, wallMaterial, `segment-${index}-before`, facadeHeight);

    const openingBottom = cutout.opening.type === 'WINDOW' ? cutout.opening.sillHeight : 0;
    const openingBottomY = floorY + openingBottom;
    const openingHeight = Math.min(cutout.opening.height, Math.max(wallBaseY + facadeHeight - openingBottomY, 0));
    const openingTopY = openingBottomY + openingHeight;
    const belowHeight = openingBottomY - wallBaseY;
    const aboveHeight = wallBaseY + facadeHeight - openingTopY;

    createLayoutWallSegment(scene, levelId, wallBaseY, layout, wall, cutout.start, cutout.end, wallMaterial, `segment-${index}-below`, belowHeight);
    createLayoutWallSegment(scene, levelId, openingTopY, layout, wall, cutout.start, cutout.end, wallMaterial, `segment-${index}-above`, aboveHeight);
    cursor = cutout.end;
  });

  createLayoutWallSegment(scene, levelId, wallBaseY, layout, wall, cursor, wallLength, wallMaterial, 'segment-end', facadeHeight);

  layout.doors
    .filter((door) => door.wallId === wall.id)
    .forEach((door) => createDoorPanel(scene, levelId, floorY, layout, door, doorMaterial));

  layout.windows
    .filter((windowOpening) => windowOpening.wallId === wall.id)
    .forEach((windowOpening) => createWindowAssembly(scene, levelId, floorY, layout, windowOpening, glassMaterial, windowFrameMaterial));
}

function createDoorMaterial(scene: Scene) {
  const material = new StandardMaterial('building-test-door-wood-material', scene);
  material.diffuseColor = Color3.FromHexString('#8B5A2B');
  material.specularColor = Color3.Black();

  const texture = new Texture(
    '/materials/flooring/woodfloor.jpg',
    scene,
    false,
    true,
    Texture.TRILINEAR_SAMPLINGMODE,
    undefined,
    () => {
      material.diffuseTexture = null;
    },
  );
  texture.uScale = 1;
  texture.vScale = 1;
  material.diffuseTexture = texture;

  return material;
}

function getEffectiveOpeningHeight(wall: BlueprintWall, opening: RoomOpeningItem) {
  const openingBottom = opening.type === 'WINDOW' ? opening.sillHeight : 0;

  return Number(Math.min(opening.height, Math.max(wall.height - openingBottom, 0)).toFixed(2));
}

function createDoorPanel(
  scene: Scene,
  levelId: string,
  floorY: number,
  layout: RoomLayoutState,
  door: DoorOpening,
  material: StandardMaterial,
) {
  const wall = layout.walls.find((candidate) => candidate.id === door.wallId);

  if (!wall) {
    return;
  }

  const startPoint = getPointById(layout.points, wall.startPointId);
  const direction = getWallDirection(wall, layout.points);
  const normal = getWallNormal(wall, layout.points);
  const hingeOffset = door.swingDirection === 'IN_LEFT'
    ? door.offset - door.width / 2
    : door.offset + door.width / 2;
  const hinge = {
    x: startPoint.x + direction.x * hingeOffset,
    y: startPoint.y + direction.y * hingeOffset,
  };
  const openAngle = Math.PI / 2.6;
  const panelHeight = getEffectiveOpeningHeight(wall, door);
  const panelDirection = door.swingDirection === 'IN_LEFT'
    ? {
        x: direction.x * Math.cos(openAngle) + normal.x * Math.sin(openAngle),
        y: direction.y * Math.cos(openAngle) + normal.y * Math.sin(openAngle),
      }
    : {
        x: -direction.x * Math.cos(openAngle) + normal.x * Math.sin(openAngle),
        y: -direction.y * Math.cos(openAngle) + normal.y * Math.sin(openAngle),
      };
  const panel = MeshBuilder.CreateBox(
    `building-test-${levelId}-${door.id}-panel`,
    {
      depth: 0.12,
      height: panelHeight,
      width: door.width,
    },
    scene,
  );

  panel.position = new Vector3(
    hinge.x + panelDirection.x * door.width / 2,
    floorY + panelHeight / 2,
    hinge.y + panelDirection.y * door.width / 2,
  );
  panel.rotation.y = -Math.atan2(panelDirection.y, panelDirection.x);
  panel.material = material;
  panel.metadata = {
    kind: 'door-panel',
    levelId,
    openingId: door.id,
    source: 'building-test-environment',
    wallId: wall.id,
  };
}

function createWindowAssembly(
  scene: Scene,
  levelId: string,
  floorY: number,
  layout: RoomLayoutState,
  windowOpening: WindowOpening,
  glassMaterial: StandardMaterial,
  frameMaterial: StandardMaterial,
) {
  const wall = layout.walls.find((candidate) => candidate.id === windowOpening.wallId);

  if (!wall) {
    return;
  }

  const wallPoint = getPointAtWallOffset(wall, layout.points, windowOpening.offset);
  const direction = getWallDirection(wall, layout.points);
  const normal = getWallNormal(wall, layout.points);
  const centerY = floorY + windowOpening.sillHeight + windowOpening.height / 2;
  const frameSize = Math.min(0.18, windowOpening.width / 4, windowOpening.height / 4);
  const rotationY = -Math.atan2(direction.y, direction.x);
  const metadata = {
    kind: 'window-assembly',
    levelId,
    openingId: windowOpening.id,
    source: 'building-test-environment',
    wallId: windowOpening.wallId,
  };

  const createPart = (
    suffix: string,
    width: number,
    height: number,
    offsetAlongWall: number,
    offsetY: number,
    material: StandardMaterial,
    depth: number,
    offsetThroughWall = 0,
  ) => {
    const part = MeshBuilder.CreateBox(
      `building-test-${levelId}-${windowOpening.id}-${suffix}`,
      { depth, height, width },
      scene,
    );

    part.position = new Vector3(
      wallPoint.x + direction.x * offsetAlongWall + normal.x * offsetThroughWall,
      centerY + offsetY,
      wallPoint.y + direction.y * offsetAlongWall + normal.y * offsetThroughWall,
    );
    part.rotation.y = rotationY;
    part.material = material;
    part.metadata = metadata;
  };

  const innerWidth = Math.max(windowOpening.width - frameSize * 2, 0.05);
  const innerHeight = Math.max(windowOpening.height - frameSize * 2, 0.05);
  const paneDepth = Math.min(0.035, wall.thickness / 6);
  const paneOffset = Math.max(wall.thickness * 0.28, paneDepth);

  createPart('glass-front', innerWidth, innerHeight, 0, 0, glassMaterial, paneDepth, paneOffset);
  createPart('glass-back', innerWidth, innerHeight, 0, 0, glassMaterial, paneDepth, -paneOffset);
  createPart('frame-left', frameSize, windowOpening.height, -windowOpening.width / 2 + frameSize / 2, 0, frameMaterial, wall.thickness + 0.02);
  createPart('frame-right', frameSize, windowOpening.height, windowOpening.width / 2 - frameSize / 2, 0, frameMaterial, wall.thickness + 0.02);
  createPart('frame-top', innerWidth, frameSize, 0, windowOpening.height / 2 - frameSize / 2, frameMaterial, wall.thickness + 0.02);
  createPart('frame-bottom', innerWidth, frameSize, 0, -windowOpening.height / 2 + frameSize / 2, frameMaterial, wall.thickness + 0.02);
}

export function clearBuildingEnvironment(scene: Scene) {
  scene.meshes
    .filter((mesh) => mesh.metadata?.source === 'building-test-environment')
    .forEach((mesh) => mesh.dispose(false, true));
}

export function applyLevelVisibility(scene: Scene, activeLevel: BuildingLevelVisibility) {
  scene.meshes
    .filter((mesh) => mesh.metadata?.source === 'building-test-environment')
    .forEach((mesh) => {
      const levelId = mesh.metadata?.levelId as BuildingLevelVisibility | undefined;

      if (!levelId || activeLevel === 'all') {
        mesh.isVisible = true;
        mesh.isPickable = mesh.metadata?.kind === 'placement-surface';
        return;
      }

      const isActive = levelId === activeLevel;
      mesh.isVisible = isActive || mesh.metadata?.surfaceType === 'YARD';
      mesh.isPickable = isActive && mesh.metadata?.kind === 'placement-surface';
    });
}

function createLevelWalls(
  scene: Scene,
  center: { x: number; z: number },
  levelId: string,
  floorY: number,
  wallBaseY: number,
  width: number,
  depth: number,
  facadeHeight: number,
  wallMaterial: StandardMaterial,
  glassMaterial: StandardMaterial,
) {
  const wallY = wallBaseY + facadeHeight / 2;
  const back = MeshBuilder.CreateBox(`building-test-${levelId}-back-wall`, { depth: WALL_THICKNESS, height: facadeHeight, width }, scene);
  back.position = new Vector3(center.x, wallY, center.z + depth / 2);
  back.material = wallMaterial;
  back.metadata = { kind: 'wall-collision', levelId, source: 'building-test-environment' };

  const left = MeshBuilder.CreateBox(`building-test-${levelId}-left-wall`, { depth, height: facadeHeight, width: WALL_THICKNESS }, scene);
  left.position = new Vector3(center.x - width / 2, wallY, center.z);
  left.material = wallMaterial;
  left.metadata = { kind: 'wall-collision', levelId, source: 'building-test-environment' };

  const right = MeshBuilder.CreateBox(`building-test-${levelId}-right-wall`, { depth, height: facadeHeight, width: WALL_THICKNESS }, scene);
  right.position = new Vector3(center.x + width / 2, wallY, center.z);
  right.material = wallMaterial;
  right.metadata = { kind: 'wall-collision', levelId, source: 'building-test-environment' };

  const frontGlassHeight = Math.max(Math.min(facadeHeight - SLAB_THICKNESS, facadeHeight * 0.72), 0.5);
  const frontGlass = MeshBuilder.CreateBox(`building-test-${levelId}-front-glass`, { depth: 0.05, height: frontGlassHeight, width: width * 0.68 }, scene);
  frontGlass.position = new Vector3(center.x, floorY + frontGlassHeight * 0.52, center.z - depth / 2 - 0.03);
  frontGlass.material = glassMaterial;
  frontGlass.metadata = { kind: 'wall-collision', levelId, source: 'building-test-environment' };
}

export function getSurfaceFromPickedMesh(mesh: Mesh | null | undefined, pickedY?: number): BuildingPlacementSurface | null {
  if (mesh?.metadata?.kind !== 'placement-surface') {
    return null;
  }

  mesh.computeWorldMatrix(true);
  const boundingBox = mesh.getBoundingInfo().boundingBox;
  const center = boundingBox.centerWorld;
  const min = boundingBox.minimumWorld;
  const max = boundingBox.maximumWorld;

  return {
    bounds: {
      maxX: max.x,
      maxZ: max.z,
      minX: min.x,
      minZ: min.z,
    },
    depth: boundingBox.extendSizeWorld.z * 2,
    elevation: Number(mesh.metadata.elevation ?? pickedY ?? mesh.position.y),
    id: String(mesh.metadata.surfaceId),
    label: String(mesh.metadata.surfaceLabel),
    levelId: mesh.metadata.levelId,
    position: { x: center.x, y: center.y, z: center.z },
    type: mesh.metadata.surfaceType,
    width: boundingBox.extendSizeWorld.x * 2,
  };
}
