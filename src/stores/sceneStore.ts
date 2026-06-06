import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type { CameraMode } from '@/features/viewer3d/engine/SceneManager';

export type LoadedModel = {
  id: string;
  loadedAt: string;
  meshIds: string[];
  name: string;
  url: string;
};

type SceneState = {
  cameraMode: CameraMode;
  loadedModels: LoadedModel[];
  sceneReady: boolean;
  selectedMeshId: string | null;
  addModel: (model: LoadedModel) => void;
  selectMesh: (meshId: string | null) => void;
  setCameraMode: (cameraMode: CameraMode) => void;
  setSceneReady: (sceneReady: boolean) => void;
};

export const useSceneStore = create<SceneState>()(
  devtools(
    immer((set) => ({
      cameraMode: 'orbit',
      loadedModels: [],
      sceneReady: false,
      selectedMeshId: null,
      addModel: (model) =>
        set((state) => {
          state.loadedModels.push(model);
        }),
      selectMesh: (meshId) =>
        set((state) => {
          state.selectedMeshId = meshId;
        }),
      setCameraMode: (cameraMode) =>
        set((state) => {
          state.cameraMode = cameraMode;
        }),
      setSceneReady: (sceneReady) =>
        set((state) => {
          state.sceneReady = sceneReady;
        }),
    })),
    { name: 'scene-store' },
  ),
);
