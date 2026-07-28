import { useEffect, useState } from 'react';

import type { BuildingTestScene } from '@/features/ThreeDTest/schemas/buildingScene.types';
import { createDefaultBuildingTestScene, createRectLevelLayout, getLevelCenter } from '@/features/ThreeDTest/utils/buildingTestSceneFactory';

const BUILDING_TEST_SCENE_STORAGE_KEY = 'furnispace-building-test-scene-v1';

function isSceneLike(value: unknown): value is BuildingTestScene {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const scene = value as Partial<BuildingTestScene>;

  return Boolean(
    scene.site &&
    scene.building &&
    Array.isArray(scene.building.levels) &&
    Array.isArray(scene.surfaces),
  );
}

function readStoredScene() {
  if (typeof window === 'undefined') {
    return createDefaultBuildingTestScene();
  }

  try {
    const rawScene = window.localStorage.getItem(BUILDING_TEST_SCENE_STORAGE_KEY);

    if (!rawScene) {
      return createDefaultBuildingTestScene();
    }

    const parsedScene = JSON.parse(rawScene) as unknown;

    return isSceneLike(parsedScene) ? normalizeScene(parsedScene) : createDefaultBuildingTestScene();
  } catch {
    return createDefaultBuildingTestScene();
  }
}

function normalizeScene(scene: BuildingTestScene): BuildingTestScene {
  const defaultScene = createDefaultBuildingTestScene();
  const levels = scene.building.levels.map((level) => {
    const defaultLevel = defaultScene.building.levels.find((candidate) => candidate.id === level.id);
    const normalizedLevel = {
      ...defaultLevel,
      ...level,
      footprintOffset: level.footprintOffset ?? defaultLevel?.footprintOffset ?? { x: 0, z: 0 },
    };
    const center = getLevelCenter(
      {
        ...scene,
        building: {
          ...scene.building,
          levels: [normalizedLevel],
        },
      },
      normalizedLevel,
    );

    return {
      ...normalizedLevel,
      layout: normalizedLevel.layout ?? createRectLevelLayout(
        normalizedLevel.id,
        normalizedLevel.width,
        normalizedLevel.depth,
        center.x,
        center.z,
        normalizedLevel.wallHeight,
      ),
    };
  });

  return {
    ...defaultScene,
    ...scene,
    building: {
      ...defaultScene.building,
      ...scene.building,
      levels,
    },
  };
}

export function useBuildingTestSceneState() {
  const [sceneData, setSceneData] = useState<BuildingTestScene>(() => readStoredScene());

  useEffect(() => {
    window.localStorage.setItem(BUILDING_TEST_SCENE_STORAGE_KEY, JSON.stringify(sceneData));
  }, [sceneData]);

  function resetSceneData() {
    const defaultScene = createDefaultBuildingTestScene();
    setSceneData(defaultScene);
  }

  return {
    resetSceneData,
    sceneData,
    setSceneData,
  };
}
