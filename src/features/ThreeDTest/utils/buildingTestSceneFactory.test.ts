import { NullEngine, Scene } from 'babylonjs';
import { describe, expect, it } from 'vitest';

import {
  buildBuildingEnvironment,
  createDefaultBuildingTestScene,
} from '@/features/ThreeDTest/utils/buildingTestSceneFactory';
import type { RoomLayoutState } from '@/features/ThreeD/types/roomLayout.types';

function createLShapeLayout(): RoomLayoutState {
  const points = [
    { id: 'p1', x: 0, y: 0 },
    { id: 'p2', x: 6, y: 0 },
    { id: 'p3', x: 6, y: 4 },
    { id: 'p4', x: 4, y: 4 },
    { id: 'p5', x: 4, y: 2 },
    { id: 'p6', x: 0, y: 2 },
  ];

  return {
    doors: [],
    floorMaterialId: '',
    openings: [],
    points,
    unit: 'm',
    wallHeight: 2.8,
    wallMaterialId: '',
    wallThickness: 0.16,
    walls: points.map((point, index) => ({
      endPointId: points[(index + 1) % points.length].id,
      height: 2.8,
      id: `w${index + 1}`,
      startPointId: point.id,
      thickness: 0.16,
      type: 'WALL' as const,
    })),
    windows: [],
  };
}

function isPointOnSegment(
  point: { x: number; z: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  const cross = (point.z - start.y) * (end.x - start.x) - (point.x - start.x) * (end.y - start.y);

  if (Math.abs(cross) > 0.0001) {
    return false;
  }

  return point.x >= Math.min(start.x, end.x) - 0.0001 &&
    point.x <= Math.max(start.x, end.x) + 0.0001 &&
    point.z >= Math.min(start.y, end.y) - 0.0001 &&
    point.z <= Math.max(start.y, end.y) + 0.0001;
}

function isPointInsideOrOnPolygon(point: { x: number; z: number }, polygon: Array<{ x: number; y: number }>) {
  if (polygon.some((start, index) => isPointOnSegment(point, start, polygon[(index + 1) % polygon.length]))) {
    return true;
  }

  let inside = false;

  for (let index = 0, previousIndex = polygon.length - 1; index < polygon.length; previousIndex = index, index += 1) {
    const current = polygon[index];
    const previous = polygon[previousIndex];
    const intersects = current.y > point.z !== previous.y > point.z &&
      point.x < ((previous.x - current.x) * (point.z - current.y)) / (previous.y - current.y) + current.x;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

describe('buildingTestSceneFactory', () => {
  it('clips floor and slab meshes to the outer wall boundary when floor holes are present', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const buildingScene = createDefaultBuildingTestScene();
    const layout = createLShapeLayout();
    const level = {
      ...buildingScene.building.levels[0],
      depth: 4,
      floorOpenings: [
        {
          depth: 0.5,
          id: 'hole-1',
          label: 'Floor hole',
          position: { x: 1, z: 1 },
          type: 'STAIR' as const,
          width: 0.5,
        },
      ],
      layout,
      width: 6,
    };
    const sceneData = {
      ...buildingScene,
      building: {
        ...buildingScene.building,
        depth: 4,
        levels: [level],
        width: 6,
      },
      surfaces: [],
    };

    buildBuildingEnvironment(scene, sceneData, 'all');

    const checkedMeshes = scene.meshes.filter((mesh) =>
      mesh.metadata?.levelId === level.id &&
      (mesh.metadata?.kind === 'level-slab' || mesh.metadata?.kind === 'placement-surface'),
    );

    expect(checkedMeshes.length).toBeGreaterThan(0);

    checkedMeshes.forEach((mesh) => {
      const positions = mesh.getVerticesData('position') ?? [];

      for (let index = 0; index < positions.length; index += 3) {
        expect(isPointInsideOrOnPolygon({ x: positions[index], z: positions[index + 2] }, layout.points)).toBe(true);
      }
    });

    scene.dispose();
    engine.dispose();
  });
});
