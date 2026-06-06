import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { SceneManager } from '@/features/viewer3d/engine/SceneManager';
import type {
  CameraMode,
  SceneManagerEvent,
} from '@/features/viewer3d/engine/SceneManager';
import { useSceneStore } from '@/stores';

type UseSceneOptions = {
  onError?: (error: Error) => void;
  onReady?: () => void;
};

function createModelId() {
  return `model-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useScene(
  canvasRef: RefObject<HTMLCanvasElement>,
  options: UseSceneOptions = {},
) {
  const manager = useMemo(() => SceneManager.getInstance(), []);
  const optionsRef = useRef(options);
  const [sceneReady, setSceneReadyState] = useState(false);
  const addModel = useSceneStore((state) => state.addModel);
  const setSceneCameraMode = useSceneStore((state) => state.setCameraMode);
  const setSceneReady = useSceneStore((state) => state.setSceneReady);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const observer = manager.events.add((event: SceneManagerEvent) => {
      if (event.type === 'ready') {
        setSceneReadyState(true);
        setSceneReady(true);
        optionsRef.current.onReady?.();
      }

      if (event.type === 'model-loaded') {
        addModel({
          id: createModelId(),
          loadedAt: new Date().toISOString(),
          meshIds: event.meshes.map((mesh) => mesh.id),
          name: event.url.split('/').pop() ?? event.url,
          url: event.url,
        });
      }

      if (event.type === 'error') {
        optionsRef.current.onError?.(event.error);
      }
    });

    manager.init(canvas);

    return () => {
      manager.events.remove(observer);
      manager.dispose();
      setSceneReadyState(false);
      setSceneReady(false);
    };
  }, [addModel, canvasRef, manager, setSceneReady]);

  const loadModel = useCallback(
    async (url: string) => {
      return manager.loadModel(url);
    },
    [manager],
  );

  const setCameraMode = useCallback(
    (mode: CameraMode) => {
      manager.setCameraMode(mode);
      setSceneCameraMode(mode);
    },
    [manager, setSceneCameraMode],
  );

  return {
    loadModel,
    sceneReady,
    setCameraMode,
  };
}
