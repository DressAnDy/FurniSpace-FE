import { useCallback, useMemo, useState } from 'react';

import { SceneViewer } from '@/features/ThreeD/components/SceneViewer';
import type { ProposalSceneData, SceneObjectData } from '@/features/ThreeD/types/scene.types';

export type SceneEditorCanvasProps = {
  proposalSceneId: string;
  sceneData: ProposalSceneData;
  editable: boolean;
  onSceneChange?: (sceneData: ProposalSceneData) => void;
  onObjectSelect?: (object: SceneObjectData) => void;
};

export function SceneEditorCanvas({
  editable,
  onObjectSelect,
  proposalSceneId,
  sceneData,
}: SceneEditorCanvasProps) {
  const [selectedObject, setSelectedObject] = useState<SceneObjectData | null>(null);

  const saveStateLabel = useMemo(() => {
    if (!editable) {
      return 'Read-only';
    }

    return selectedObject ? 'Object selected' : 'Ready';
  }, [editable, selectedObject]);

  const handleObjectSelect = useCallback(
    (object: SceneObjectData) => {
      setSelectedObject(object);
      onObjectSelect?.(object);
    },
    [onObjectSelect],
  );

  return (
    <div className="three-d-editor-shell">
      <div className="three-d-editor-toolbar">
        <span>Scene {proposalSceneId}</span>
        <strong>{saveStateLabel}</strong>
      </div>
      <SceneViewer sceneData={sceneData} onObjectSelect={handleObjectSelect} />
    </div>
  );
}
