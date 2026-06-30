import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AbstractMesh,
  ArcRotateCamera,
  Engine,
  Scene,
  SceneLoader,
  Vector3,
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

function getMeshBounds(meshes: AbstractMesh[]) {
  const renderMeshes = meshes.filter((mesh) => mesh.getTotalVertices() > 0);

  if (renderMeshes.length === 0) {
    return null;
  }

  const min = new Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  const max = new Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);

  renderMeshes.forEach((mesh) => {
    mesh.computeWorldMatrix(true);
    const { boundingBox } = mesh.getBoundingInfo();
    min.x = Math.min(min.x, boundingBox.minimumWorld.x);
    min.y = Math.min(min.y, boundingBox.minimumWorld.y);
    min.z = Math.min(min.z, boundingBox.minimumWorld.z);
    max.x = Math.max(max.x, boundingBox.maximumWorld.x);
    max.y = Math.max(max.y, boundingBox.maximumWorld.y);
    max.z = Math.max(max.z, boundingBox.maximumWorld.z);
  });

  return { min, max };
}

function placeMeshesOnGround(meshes: AbstractMesh[]) {
  const bounds = getMeshBounds(meshes);

  if (!bounds) {
    return;
  }

  const groundOffsetY = -bounds.min.y;

  if (Math.abs(groundOffsetY) < 0.0001) {
    return;
  }

  const topLevelMeshes = meshes.filter((mesh) => !mesh.parent);
  const moveTargets = topLevelMeshes.length > 0 ? topLevelMeshes : meshes.filter((mesh) => mesh.getTotalVertices() > 0);

  moveTargets.forEach((mesh) => {
    mesh.position.y += groundOffsetY;
    mesh.computeWorldMatrix(true);
  });
}

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
        placeMeshesOnGround(result.meshes);

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
