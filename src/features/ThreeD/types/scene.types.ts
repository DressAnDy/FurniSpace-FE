export type Vector3Like = {
  x: number;
  y: number;
  z: number;
};

export type ProductVersionModel = {
  fileId: string;
  productVersionId: string;
  fileName: string;
  fileUrl: string;
  fileType: 'MODEL_3D';
  mimeType?: string;
  fileSize?: number;
  isDefault?: boolean;
  createdAt?: string;
};

export type SceneObjectData = {
  sceneObjectId: string;
  proposalItemId: string;
  productVersionId: string;
  modelFileId?: string;
  modelUrl: string;
  name: string;
  position: Vector3Like;
  rotation: Vector3Like;
  scale: Vector3Like;
  customDimensions?: {
    width?: number;
    height?: number;
    depth?: number;
  };
  materialOverride?: string;
  colorOverride?: string;
  locked?: boolean;
};

export type ProposalSceneData = {
  sceneId: string;
  proposalSceneId: string;
  proposalId: string;
  projectId: string;
  unit: 'mm' | 'cm' | 'm';
  room: {
    width: number;
    depth: number;
    height: number;
  };
  camera?: Record<string, unknown>;
  lighting?: Record<string, unknown>;
  objects: SceneObjectData[];
};
