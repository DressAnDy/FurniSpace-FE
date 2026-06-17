import { useCallback, useRef, useState } from 'react';
import {
  AbstractMesh,
  ArcRotateCamera,
  Engine,
  Mesh,
  Scene,
  SceneLoader,
  Vector3,
} from 'babylonjs';
import 'babylonjs-loaders';

import { BabylonCanvas } from '@/features/ThreeD/components/BabylonCanvas';
import type { ProposalSceneData, SceneObjectData } from '@/features/ThreeD/types/scene.types';
import {
  createDefaultCamera,
  createDefaultLighting,
  createRoomGrid,
} from '@/features/ThreeD/utils/babylonSceneFactory';
import { fitCameraToMeshes } from '@/features/ThreeD/utils/fitCameraToModel';
import { splitModelUrl } from '@/features/ThreeD/utils/modelUrl';

export type SceneViewerProps = {
  sceneData: ProposalSceneData;
  onObjectSelect?: (object: SceneObjectData) => void;
};

export function SceneViewer({ onObjectSelect, sceneData }: SceneViewerProps) {
  const cameraRef = useRef<ArcRotateCamera | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const loadSceneObjects = useCallback(
    async (scene: Scene) => {
      setStatus('loading');

      try {
        const allMeshes: AbstractMesh[] = [];

        await Promise.all(
          sceneData.objects.map(async (objectData) => {
            const { fileName, rootUrl } = splitModelUrl(objectData.modelUrl);
            const result = await SceneLoader.ImportMeshAsync('', rootUrl, fileName, scene);

            result.meshes.forEach((mesh) => {
              mesh.position = new Vector3(
                objectData.position.x,
                objectData.position.y,
                objectData.position.z,
              );
              mesh.rotation = new Vector3(
                objectData.rotation.x,
                objectData.rotation.y,
                objectData.rotation.z,
              );
              mesh.scaling = new Vector3(
                objectData.scale.x,
                objectData.scale.y,
                objectData.scale.z,
              );
              mesh.metadata = {
                ...(mesh.metadata ?? {}),
                proposalItemId: objectData.proposalItemId,
                sceneObjectId: objectData.sceneObjectId,
              };

              if (mesh instanceof Mesh) {
                mesh.actionManager = null;
              }
            });

            allMeshes.push(...result.meshes);
          }),
        );

        if (cameraRef.current) {
          fitCameraToMeshes(cameraRef.current, allMeshes);
        }

        setStatus('ready');
      } catch {
        setStatus('error');
      }
    },
    [sceneData.objects],
  );

  const handleSceneReady = useCallback(
    (scene: Scene, _engine: Engine, canvas: HTMLCanvasElement) => {
      cameraRef.current = createDefaultCamera(scene, canvas);
      createDefaultLighting(scene);
      createRoomGrid(scene, sceneData.room.width, sceneData.room.depth);

      scene.onPointerPick = (_event, pickInfo) => {
        const sceneObjectId = pickInfo.pickedMesh?.metadata?.sceneObjectId as string | undefined;
        const selectedObject = sceneData.objects.find((object) => object.sceneObjectId === sceneObjectId);

        if (selectedObject) {
          onObjectSelect?.(selectedObject);
        }
      };

      void loadSceneObjects(scene);
    },
    [loadSceneObjects, onObjectSelect, sceneData.objects, sceneData.room.depth, sceneData.room.width],
  );

  return (
    <div className="three-d-viewer">
      <BabylonCanvas className="three-d-canvas" onSceneReady={handleSceneReady} />
      {status !== 'ready' && (
        <div className="three-d-overlay">
          <span>{status === 'loading' ? 'Loading proposal scene...' : 'Proposal scene failed to load.'}</span>
        </div>
      )}
    </div>
  );
}
