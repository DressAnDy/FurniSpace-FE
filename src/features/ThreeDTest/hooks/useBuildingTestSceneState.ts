import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SetStateAction } from 'react';

import type { BuildingTestScene } from '@/features/ThreeDTest/schemas/buildingScene.types';
import {
  createDefaultBuildingTestScene,
  createLevelFloorSurface,
  createRectLevelLayout,
  getLevelCenter,
} from '@/features/ThreeDTest/utils/buildingTestSceneFactory';

const BUILDING_TEST_SCENE_STORAGE_KEY = 'furnispace-building-test-scene-v1';
const BUILDING_TEST_SCENE_STORAGE_PREFIX = `${BUILDING_TEST_SCENE_STORAGE_KEY}:`;
const LEVEL_STACK_VERTICAL_GAP = 0.14;
const LEVEL_STACK_ELEVATION_EPSILON = 0.12;

type BuildingTestSceneDraft = {
  sceneData: BuildingTestScene;
  updatedAt: string | null;
};

const sceneSessionDrafts = new Map<string, BuildingTestSceneDraft>();

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

function getSceneStorageKey(sceneId?: string) {
  return `${BUILDING_TEST_SCENE_STORAGE_PREFIX}${sceneId ?? 'local-test'}`;
}

function isDraftLike(value: unknown): value is BuildingTestSceneDraft {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const draft = value as Partial<BuildingTestSceneDraft>;

  return isSceneLike(draft.sceneData);
}

function readStoredSceneDraft(storageKey: string, allowLegacyFallback: boolean): BuildingTestSceneDraft {
  if (typeof window === 'undefined') {
    return {
      sceneData: createDefaultBuildingTestScene(),
      updatedAt: null,
    };
  }

  try {
    const rawScene = window.localStorage.getItem(storageKey) ??
      (allowLegacyFallback ? window.localStorage.getItem(BUILDING_TEST_SCENE_STORAGE_KEY) : null);

    if (!rawScene) {
      return {
        sceneData: createDefaultBuildingTestScene(),
        updatedAt: null,
      };
    }

    const parsedScene = JSON.parse(rawScene) as unknown;

    if (isDraftLike(parsedScene)) {
      return {
        sceneData: normalizeScene(parsedScene.sceneData),
        updatedAt: typeof parsedScene.updatedAt === 'string' ? parsedScene.updatedAt : null,
      };
    }

    return isSceneLike(parsedScene)
      ? {
          sceneData: normalizeScene(parsedScene),
          updatedAt: new Date(0).toISOString(),
        }
      : {
          sceneData: createDefaultBuildingTestScene(),
          updatedAt: null,
        };
  } catch {
    return {
      sceneData: createDefaultBuildingTestScene(),
      updatedAt: null,
    };
  }
}

function isDraftNewerThanRemote(draftUpdatedAt: string | null, remoteSavedAt?: string | null) {
  if (!draftUpdatedAt) {
    return false;
  }

  if (!remoteSavedAt) {
    return true;
  }

  return new Date(draftUpdatedAt).getTime() > new Date(remoteSavedAt).getTime();
}

function getNextStackElevation(previousLevel: BuildingTestScene['building']['levels'][number]) {
  return previousLevel.elevation + Math.max(previousLevel.height, previousLevel.wallHeight, 2.6) + LEVEL_STACK_VERTICAL_GAP;
}

function normalizeLevelStack(levels: BuildingTestScene['building']['levels']) {
  return levels.reduce<BuildingTestScene['building']['levels']>((stackedLevels, level, index) => {
    const previousLevel = stackedLevels[index - 1];
    const rawElevation = Number.isFinite(level.elevation)
      ? level.elevation
      : (index === 0 ? 0.16 : getNextStackElevation(previousLevel));

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

function normalizeScene(scene: BuildingTestScene): BuildingTestScene {
  const defaultScene = createDefaultBuildingTestScene();
  const normalizedLayoutLevels = scene.building.levels.map((level) => {
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
  const levels = normalizeLevelStack(normalizedLayoutLevels);
  const surfaces = scene.surfaces.map((surface) => {
    if (surface.type !== 'FLOOR') {
      return surface;
    }

    const level = levels.find((candidate) => candidate.id === surface.levelId);

    if (!level) {
      return surface;
    }

    const refreshedSurface = createLevelFloorSurface(level, scene.building.position);

    return {
      ...surface,
      depth: refreshedSurface.depth,
      elevation: refreshedSurface.elevation,
      position: refreshedSurface.position,
      width: refreshedSurface.width,
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
    surfaces,
  };
}

export function useBuildingTestSceneState(sceneId?: string) {
  const storageKey = useMemo(() => getSceneStorageKey(sceneId), [sceneId]);
  const isRemoteScene = Boolean(sceneId);
  const allowLegacyFallback = !sceneId;
  const [draft, setDraft] = useState<BuildingTestSceneDraft>(() =>
    sceneSessionDrafts.get(storageKey) ??
    (isRemoteScene
      ? {
          sceneData: createDefaultBuildingTestScene(),
          updatedAt: null,
        }
      : readStoredSceneDraft(storageKey, allowLegacyFallback)),
  );

  useEffect(() => {
    setDraft(
      sceneSessionDrafts.get(storageKey) ??
      (isRemoteScene
        ? {
            sceneData: createDefaultBuildingTestScene(),
            updatedAt: null,
          }
        : readStoredSceneDraft(storageKey, allowLegacyFallback)),
    );
  }, [allowLegacyFallback, isRemoteScene, storageKey]);

  useEffect(() => {
    if (isRemoteScene) {
      return;
    }

    sceneSessionDrafts.set(storageKey, draft);
    window.localStorage.setItem(storageKey, JSON.stringify(draft));
  }, [draft, isRemoteScene, storageKey]);

  const setSceneData = useCallback((value: SetStateAction<BuildingTestScene>) => {
    setDraft((currentDraft) => {
      const nextDraft = {
        sceneData: typeof value === 'function'
          ? (value as (currentScene: BuildingTestScene) => BuildingTestScene)(currentDraft.sceneData)
          : value,
        updatedAt: new Date().toISOString(),
      };

      sceneSessionDrafts.set(storageKey, nextDraft);

      return nextDraft;
    });
  }, [storageKey]);

  const setRemoteSceneData = useCallback((sceneData: BuildingTestScene, remoteSavedAt?: string | null) => {
    const nextDraft = {
      sceneData,
      updatedAt: remoteSavedAt ?? null,
    };

    sceneSessionDrafts.set(storageKey, nextDraft);
    setDraft(nextDraft);
  }, [storageKey]);

  function resetSceneData() {
    const defaultScene = createDefaultBuildingTestScene();
    setSceneData(defaultScene);
  }

  const shouldKeepSceneDraft = useCallback((remoteSavedAt?: string | null) => {
    return isDraftNewerThanRemote(draft.updatedAt, remoteSavedAt);
  }, [draft.updatedAt]);

  return {
    resetSceneData,
    sceneData: draft.sceneData,
    sceneUpdatedAt: draft.updatedAt,
    setRemoteSceneData,
    setSceneData,
    shouldKeepSceneDraft,
  };
}
