import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AbstractMesh,
  ArcRotateCamera,
  Engine,
  Scene,
  SceneLoader,
} from 'babylonjs';
import 'babylonjs-loaders';

import { BabylonCanvas } from '@/features/ThreeD/components/BabylonCanvas';
import {
  createDefaultCamera,
  createDefaultLighting,
  createRoomGrid,
} from '@/features/ThreeD/utils/babylonSceneFactory';
import { fitCameraToMeshes } from '@/features/ThreeD/utils/fitCameraToModel';
import { getModelLoadErrorMessage, isSupportedModelUrl, splitModelUrl } from '@/features/ThreeD/utils/modelUrl';

export type ModelViewerProps = {
  autoRotate?: boolean;
  fallbackImageUrl?: string;
  height?: number | string;
  modelUrl?: string;
  onStatusChange?: (status: ModelViewerStatus, error: string | null) => void;
  showGrid?: boolean;
};

export type ModelViewerStatus = 'idle' | 'loading' | 'ready' | 'error';

export function ModelViewer({
  autoRotate = false,
  fallbackImageUrl,
  height = 420,
  modelUrl,
  onStatusChange,
  showGrid = true,
}: ModelViewerProps) {
  const cameraRef = useRef<ArcRotateCamera | null>(null);
  const importedMeshesRef = useRef<AbstractMesh[]>([]);
  const sceneRef = useRef<Scene | null>(null);
  const [status, setStatus] = useState<ModelViewerStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const disposeImportedMeshes = useCallback(() => {
    importedMeshesRef.current.forEach((mesh) => {
      mesh.dispose(false, true);
    });
    importedMeshesRef.current = [];
  }, []);

  const loadModel = useCallback(
    async (scene: Scene, url: string) => {
      if (!isSupportedModelUrl(url)) {
        setStatus('error');
        setError('Only GLB/glTF model URLs are supported in this preview.');
        return;
      }

      setStatus('loading');
      setError(null);
      disposeImportedMeshes();

      try {
        const { fileName, rootUrl } = splitModelUrl(url);
        const result = await SceneLoader.ImportMeshAsync('', rootUrl, fileName, scene);
        importedMeshesRef.current = result.meshes;

        if (cameraRef.current) {
          fitCameraToMeshes(cameraRef.current, result.meshes);
        }

        setStatus('ready');
      } catch (cause) {
        const nextError = getModelLoadErrorMessage(cause, url);
        setStatus('error');
        setError(nextError);
      }
    },
    [disposeImportedMeshes],
  );

  const handleSceneReady = useCallback(
    (scene: Scene, _engine: Engine, canvas: HTMLCanvasElement) => {
      sceneRef.current = scene;
      cameraRef.current = createDefaultCamera(scene, canvas);
      createDefaultLighting(scene);

      if (showGrid) {
        createRoomGrid(scene);
      }

      if (modelUrl) {
        void loadModel(scene, modelUrl);
      } else {
        setStatus('idle');
      }
    },
    [loadModel, modelUrl, showGrid],
  );

  useEffect(() => {
    onStatusChange?.(status, error);
  }, [error, onStatusChange, status]);

  useEffect(() => {
    if (!sceneRef.current) {
      return;
    }

    if (!modelUrl) {
      disposeImportedMeshes();
      setStatus('idle');
      setError(null);
      return;
    }

    void loadModel(sceneRef.current, modelUrl);
  }, [disposeImportedMeshes, loadModel, modelUrl]);

  const handleRender = useCallback(() => {
    if (autoRotate && status === 'ready' && cameraRef.current) {
      cameraRef.current.alpha += 0.002;
    }
  }, [autoRotate, status]);

  return (
    <div className="three-d-viewer" style={{ height }}>
      <BabylonCanvas
        className="three-d-canvas"
        onRender={handleRender}
        onSceneReady={handleSceneReady}
      />
      {status !== 'ready' && (
        <div className="three-d-overlay">
          {(status === 'idle' || status === 'error') && fallbackImageUrl && (
            <img alt="Product preview fallback" src={fallbackImageUrl} />
          )}
          {status === 'loading' && <span>Loading 3D model...</span>}
          {status === 'idle' && <span>No MODEL_3D file is available.</span>}
          {status === 'error' && <span>{error ?? '3D model failed to load.'}</span>}
        </div>
      )}
    </div>
  );
}
