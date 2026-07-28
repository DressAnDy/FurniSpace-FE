import {
  ArcRotateCamera,
  Color3,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Tools,
  Vector3,
  VertexData,
} from 'babylonjs';

import type { BlueprintWall, RoomLayoutState, RoomOpeningItem } from '@/features/ThreeD/types/roomLayout.types';
import {
  getClosedRoomBoundary,
  getPointAtWallOffset,
  getPointById,
  getRoomBounds,
  getWallDirection,
  getWallLength,
} from '@/features/ThreeD/utils/roomGeometry';
import type {
  BuildingLevel,
  BuildingLevelVisibility,
  BuildingPlacementSurface,
  BuildingTestScene,
} from '@/features/ThreeDTest/schemas/buildingScene.types';

const WALL_THICKNESS = 0.16;
const SLAB_THICKNESS = 0.28;
const FLOOR_SURFACE_OFFSET = 0.018;

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
  const buildingPosition = { x: 0, y: 0, z: 2.1 };
  const buildingWidth = 11;
  const buildingDepth = 8;
  const levelHeight = 3.1;
  const groundLayout = createRectLevelLayout('ground', buildingWidth, buildingDepth, buildingPosition.x, buildingPosition.z, 2.85);
  const secondLayout = createRectLevelLayout('level-2', buildingWidth, buildingDepth, buildingPosition.x, buildingPosition.z, 2.65);

  return {
    building: {
      depth: buildingDepth,
      levels: [
        {
          depth: buildingDepth,
          elevation: 0.16,
          footprintOffset: { x: 0, z: 0 },
          height: levelHeight,
          id: 'ground',
          label: 'Floor 1',
          layout: groundLayout,
          wallHeight: 2.85,
          width: buildingWidth,
        },
        {
          depth: buildingDepth,
          elevation: levelHeight + 0.3,
          footprintOffset: { x: 0, z: 0 },
          height: levelHeight,
          id: 'level-2',
          label: 'Floor 2',
          layout: secondLayout,
          wallHeight: 2.65,
          width: buildingWidth,
        },
      ],
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
    surfaces: [
      {
        depth: buildingDepth - 0.7,
        elevation: 0.18,
        id: 'ground-floor-surface',
        label: 'Floor 1 Surface',
        levelId: 'ground',
        position: { x: buildingPosition.x, y: 0.18, z: buildingPosition.z },
        type: 'FLOOR',
        width: buildingWidth - 0.7,
      },
      {
        depth: buildingDepth - 0.7,
        elevation: levelHeight + 0.34,
        id: 'level-2-floor-surface',
        label: 'Floor 2 Surface',
        levelId: 'level-2',
        position: { x: buildingPosition.x, y: levelHeight + 0.34, z: buildingPosition.z },
        type: 'FLOOR',
        width: buildingWidth - 0.7,
      },
    ],
  };
}

export function createBuildingTestCamera(scene: Scene, canvas: HTMLCanvasElement, sceneData: BuildingTestScene) {
  const camera = new ArcRotateCamera(
    'building-test-camera',
    Tools.ToRadians(-52),
    Tools.ToRadians(58),
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
  const railMaterial = material(scene, 'building-test-rail-material', '#51656b');
  const pathMaterial = material(scene, 'building-test-path-material', '#9ea7a2');

  const site = MeshBuilder.CreateGround(
    'building-test-site',
    { height: sceneData.site.depth, subdivisions: 1, width: sceneData.site.width },
    scene,
  );
  site.material = siteMaterial;
  site.metadata = { source: 'building-test-environment', kind: 'site' };

  const path = MeshBuilder.CreateGround('building-test-walkway', { height: 7.2, width: 2.1 }, scene);
  path.position = new Vector3(0, 0.018, -3.4);
  path.material = pathMaterial;
  path.metadata = { source: 'building-test-environment', kind: 'site-detail' };

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
    slab.metadata = { levelId: level.id, source: 'building-test-environment' };

    if (levelLayout) {
      createLevelLayoutMeshes(scene, level.id, y, facadeBaseY, facadeHeight, levelLayout, floorMaterial, wallMaterial, glassMaterial);
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

  createStairs(scene, sceneData, slabMaterial);
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
) {
  const boundary = getClosedRoomBoundary(layout);

  if (boundary.length >= 3) {
    const bounds = getRoomBounds(boundary);
    const width = Math.max(bounds.maxX - bounds.minX, 1);
    const depth = Math.max(bounds.maxY - bounds.minY, 1);
    const floor = new Mesh(`building-test-${levelId}-layout-floor`, scene);
    const vertexData = new VertexData();

    vertexData.positions = boundary.flatMap((point) => [point.x, floorY + FLOOR_SURFACE_OFFSET, point.y]);
    vertexData.indices = boundary.slice(1, -1).flatMap((_point, index) => [0, index + 1, index + 2]);
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
    );
  });
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
  mesh.metadata = { levelId, source: 'building-test-environment', wallId: wall.id };
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
    createOpeningMarker(scene, levelId, floorY, layout, wall, cutout.opening, glassMaterial);
    cursor = cutout.end;
  });

  createLayoutWallSegment(scene, levelId, wallBaseY, layout, wall, cursor, wallLength, wallMaterial, 'segment-end', facadeHeight);
}

function createOpeningMarker(
  scene: Scene,
  levelId: string,
  floorY: number,
  layout: RoomLayoutState,
  wall: BlueprintWall,
  opening: RoomOpeningItem,
  material: StandardMaterial,
) {
  if (opening.type === 'OPENING') {
    return;
  }

  const center = getPointAtWallOffset(wall, layout.points, opening.offset);
  const direction = getWallDirection(wall, layout.points);
  const bottom = opening.type === 'WINDOW' ? opening.sillHeight : 0;
  const marker = MeshBuilder.CreateBox(
    `building-test-${levelId}-${opening.id}-marker`,
    { depth: Math.max(wall.thickness + 0.03, 0.08), height: opening.height, width: opening.width },
    scene,
  );

  marker.position = new Vector3(center.x, floorY + bottom + opening.height / 2, center.y);
  marker.rotation.y = -Math.atan2(direction.y, direction.x);
  marker.material = material;
  marker.metadata = { levelId, openingId: opening.id, source: 'building-test-environment', wallId: wall.id };
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
  back.metadata = { levelId, source: 'building-test-environment' };

  const left = MeshBuilder.CreateBox(`building-test-${levelId}-left-wall`, { depth, height: facadeHeight, width: WALL_THICKNESS }, scene);
  left.position = new Vector3(center.x - width / 2, wallY, center.z);
  left.material = wallMaterial;
  left.metadata = { levelId, source: 'building-test-environment' };

  const right = MeshBuilder.CreateBox(`building-test-${levelId}-right-wall`, { depth, height: facadeHeight, width: WALL_THICKNESS }, scene);
  right.position = new Vector3(center.x + width / 2, wallY, center.z);
  right.material = wallMaterial;
  right.metadata = { levelId, source: 'building-test-environment' };

  const frontGlassHeight = Math.max(Math.min(facadeHeight - SLAB_THICKNESS, facadeHeight * 0.72), 0.5);
  const frontGlass = MeshBuilder.CreateBox(`building-test-${levelId}-front-glass`, { depth: 0.05, height: frontGlassHeight, width: width * 0.68 }, scene);
  frontGlass.position = new Vector3(center.x, floorY + frontGlassHeight * 0.52, center.z - depth / 2 - 0.03);
  frontGlass.material = glassMaterial;
  frontGlass.metadata = { levelId, source: 'building-test-environment' };
}

function createLevelRail(
  scene: Scene,
  center: { x: number; z: number },
  levelId: string,
  floorY: number,
  width: number,
  depth: number,
  railMaterial: StandardMaterial,
) {
  const railY = floorY + 0.58;
  const frontRail = MeshBuilder.CreateBox(`building-test-${levelId}-front-rail`, { depth: 0.08, height: 0.18, width }, scene);
  frontRail.position = new Vector3(center.x, railY, center.z - depth / 2);
  frontRail.material = railMaterial;
  frontRail.metadata = { levelId, source: 'building-test-environment' };
}

function createStairs(scene: Scene, sceneData: BuildingTestScene, stairMaterial: StandardMaterial) {
  const groundLevel = sceneData.building.levels.find((level) => level.id === 'ground') ?? sceneData.building.levels[0];
  const groundCenter = getLevelCenter(sceneData, groundLevel);
  const startX = groundCenter.x - groundLevel.width / 2 + 1.8;
  const startZ = groundCenter.z - groundLevel.depth / 2 + 1.1;

  Array.from({ length: 12 }, (_, index) => {
    const step = MeshBuilder.CreateBox(
      `building-test-stair-${index}`,
      { depth: 0.42, height: 0.12, width: 1.35 },
      scene,
    );
    step.position = new Vector3(startX + index * 0.21, 0.26 + index * 0.25, startZ + index * 0.25);
    step.rotation.y = Tools.ToRadians(-28);
    step.material = stairMaterial;
    step.metadata = { source: 'building-test-environment', levelId: 'ground' };
    step.isPickable = false;
  });
}

export function getSurfaceFromPickedMesh(mesh: Mesh | null | undefined, pickedY?: number): BuildingPlacementSurface | null {
  if (mesh?.metadata?.kind !== 'placement-surface') {
    return null;
  }

  return {
    depth: mesh.getBoundingInfo().boundingBox.extendSizeWorld.z * 2,
    elevation: Number(mesh.metadata.elevation ?? pickedY ?? mesh.position.y),
    id: String(mesh.metadata.surfaceId),
    label: String(mesh.metadata.surfaceLabel),
    levelId: mesh.metadata.levelId,
    position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
    type: mesh.metadata.surfaceType,
    width: mesh.getBoundingInfo().boundingBox.extendSizeWorld.x * 2,
  };
}
