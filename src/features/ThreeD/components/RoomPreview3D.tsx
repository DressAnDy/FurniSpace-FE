import { useCallback, useEffect, useRef } from 'react';
import {
  ArcRotateCamera,
  Color3,
  Engine,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  PointerEventTypes,
  Scene,
  SceneLoader,
  StandardMaterial,
  Texture,
  Tools,
  TransformNode,
  Vector3,
  VertexData,
} from 'babylonjs';
import 'babylonjs-loaders';

import { BabylonCanvas } from '@/features/ThreeD/components/BabylonCanvas';
import type {
  BlueprintWall,
  DoorOpening,
  RoomLayoutState,
  RoomMaterialSelection,
  RoomOpeningItem,
  WindowOpening,
} from '@/features/ThreeD/types/roomLayout.types';
import {
  getClosedRoomBoundary,
  getPointById,
  getPointAtWallOffset,
  getRoomBounds,
  getWallDirection,
  getWallLength,
  getWallNormal,
} from '@/features/ThreeD/utils/roomGeometry';
import { getModelLoadErrorMessage } from '@/features/ThreeD/utils/modelUrl';

export type RoomPreview3DProps = {
  comparisonProductId?: string | null;
  floorMaterial: RoomMaterialSelection;
  layout: RoomLayoutState | null;
  onMeasurementsChange?: (measurements: ProductMeasurements | null) => void;
  onProductDrop?: (productModelId: string, position: PlacedProduct3D['position']) => void;
  onProductMove?: (
    productId: string,
    position: PlacedProduct3D['position'],
    placementUpdate?: ProductPlacementUpdate,
  ) => void;
  onProductLoadError?: (productId: string, message: string) => void;
  onProductSelect?: (productId: string | null, additive: boolean) => void;
  placedProducts?: PlacedProduct3D[];
  readOnly?: boolean;
  selectedProductId?: string | null;
  wallMaterial: RoomMaterialSelection;
};

export type ProductMeasurements = {
  comparedObject: {
    distance: number;
    productId: string;
  } | null;
  nearestWall: {
    distance: number;
    wallId: string;
  } | null;
};

export type ProductPlacementMode = 'FLOOR' | 'ON_OBJECT' | 'WALL_MOUNTED' | 'CUSTOM_HEIGHT';

export type Vector3State = {
  x: number;
  y: number;
  z: number;
};

export type PlacedProduct3D = {
  dimensionsSnapshot?: {
    depth: number | null;
    height: number | null;
    unit: string;
    width: number | null;
  };
  fileId?: string;
  heightOffset?: number;
  id: string;
  mountedWallId?: string | null;
  modelName: string;
  modelUrl: string;
  placementMode?: ProductPlacementMode;
  position: Vector3State;
  productId?: string;
  productVersionId?: string;
  proposalItemId?: string | null;
  rotation?: Vector3State;
  scale?: Vector3State;
  source?: 'api' | 'local' | 'uploaded';
  supportObjectId?: string | null;
  thumbnailUrl?: string | null;
  visualSnapshot?: {
    color: string | null;
    finish: string | null;
    material: string | null;
  };
};

export type ProductPlacementUpdate = {
  mountedWallId?: string | null;
  supportObjectId?: string | null;
};

type DragProductState = {
  hasMoved: boolean;
  placementMode: ProductPlacementMode;
  placementUpdate?: ProductPlacementUpdate;
  pointerStartY: number;
  productId: string;
  position: PlacedProduct3D['position'];
  startPosition: PlacedProduct3D['position'];
};

type ProductFootprint = {
  centerOffsetX: number;
  centerOffsetY: number;
  centerOffsetZ: number;
  halfX: number;
  halfY: number;
  halfZ: number;
};

type WallCutout = {
  end: number;
  opening: RoomOpeningItem;
  start: number;
};

const sceneProductLoadLocks = new WeakMap<Scene, Set<string>>();
const PRODUCT_DRAG_DATA_TYPE = 'application/x-furnispace-product-id';

function getSceneProductLoadLocks(scene: Scene) {
  let loadLocks = sceneProductLoadLocks.get(scene);

  if (!loadLocks) {
    loadLocks = new Set<string>();
    sceneProductLoadLocks.set(scene, loadLocks);
  }

  return loadLocks;
}

function getProductRootGroundOffsetY(root: TransformNode) {
  const localGroundOffsetY = Number(root.metadata?.localGroundOffsetY ?? 0);

  return localGroundOffsetY * root.scaling.y;
}

function setProductRootPosition(root: TransformNode, position: Vector3State) {
  root.position = new Vector3(
    position.x,
    position.y + getProductRootGroundOffsetY(root),
    position.z,
  );
}

function getProductAnchorPosition(root: TransformNode): Vector3State {
  return {
    x: root.position.x,
    y: root.position.y - getProductRootGroundOffsetY(root),
    z: root.position.z,
  };
}

function getProductMeshBounds(scene: Scene, productId: string) {
  const modelMeshes = scene.meshes.filter(
    (mesh) =>
      mesh.metadata?.source === 'product-preview' &&
      mesh.metadata?.productId === productId &&
      !mesh.metadata?.interactionProxy &&
      mesh.getTotalVertices() > 0,
  );

  if (!modelMeshes.length) {
    return null;
  }

  modelMeshes.forEach((mesh) => {
    mesh.computeWorldMatrix(true);
  });

  return modelMeshes.reduce(
    (currentBounds, mesh) => {
      const boundingBox = mesh.getBoundingInfo().boundingBox;

      return {
        max: Vector3.Maximize(currentBounds.max, boundingBox.maximumWorld),
        min: Vector3.Minimize(currentBounds.min, boundingBox.minimumWorld),
      };
    },
    {
      max: modelMeshes[0].getBoundingInfo().boundingBox.maximumWorld.clone(),
      min: modelMeshes[0].getBoundingInfo().boundingBox.minimumWorld.clone(),
    },
  );
}

function createMaterial(
  scene: Scene,
  name: string,
  materialSelection: RoomMaterialSelection,
) {
  const material = new StandardMaterial(name, scene);
  material.backFaceCulling = false;
  material.diffuseColor = Color3.FromHexString(materialSelection.fallbackColor);
  material.specularColor = Color3.Black();

  if (materialSelection.textureUrl) {
    const texture = new Texture(
      materialSelection.textureUrl,
      scene,
      false,
      true,
      Texture.TRILINEAR_SAMPLINGMODE,
      undefined,
      () => {
        material.diffuseTexture = null;
      },
    );
    texture.uScale = 2;
    texture.vScale = 2;
    material.diffuseTexture = texture;
  }

  return material;
}

function clearGeneratedRoom(scene: Scene) {
  scene.meshes
    .filter((mesh) => mesh.metadata?.source === 'room-preview')
    .forEach((mesh) => mesh.dispose(false, true));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getWallCutouts(layout: RoomLayoutState, wall: BlueprintWall) {
  const wallLength = getWallLength(wall, layout.points);

  return [...layout.doors, ...layout.windows, ...layout.openings]
    .filter((openingItem) => openingItem.wallId === wall.id)
    .map((openingItem) => {
      const halfWidth = openingItem.width / 2;

      return {
        end: clamp(openingItem.offset + halfWidth, 0, wallLength),
        opening: openingItem,
        start: clamp(openingItem.offset - halfWidth, 0, wallLength),
      };
    })
    .filter((cutout) => cutout.end - cutout.start > 0.1)
    .sort((first, second) => first.start - second.start);
}

function createWallSegmentMesh(
  scene: Scene,
  layout: RoomLayoutState,
  wall: BlueprintWall,
  segmentStart: number,
  segmentEnd: number,
  material: StandardMaterial,
  suffix: string,
  segmentHeight = wall.height,
  centerY = wall.height / 2,
) {
  const segmentLength = segmentEnd - segmentStart;

  if (segmentLength <= 0.1 || segmentHeight <= 0.05) {
    return;
  }

  const startPoint = getPointById(layout.points, wall.startPointId);
  const direction = getWallDirection(wall, layout.points);
  const centerOffset = (segmentStart + segmentEnd) / 2;
  const mesh = MeshBuilder.CreateBox(
    `room-preview-${wall.id}-${suffix}`,
    {
      depth: wall.thickness,
      height: segmentHeight,
      width: segmentLength,
    },
    scene,
  );

  mesh.position = new Vector3(
    startPoint.x + direction.x * centerOffset,
    centerY,
    startPoint.y + direction.y * centerOffset,
  );
  mesh.rotation.y = -Math.atan2(direction.y, direction.x);
  mesh.material = material;
  mesh.metadata = {
    source: 'room-preview',
    wallId: wall.id,
  };
}

function getEffectiveOpeningHeight(wall: BlueprintWall, opening: RoomOpeningItem) {
  const openingBottom = opening.type === 'WINDOW' ? opening.sillHeight : 0;

  return Number(clamp(opening.height, 0, Math.max(wall.height - openingBottom, 0)).toFixed(2));
}

function createDoorMaterial(scene: Scene) {
  const material = new StandardMaterial('room-preview-door-wood-material', scene);
  material.diffuseColor = Color3.FromHexString('#8B5A2B');
  material.specularColor = Color3.Black();

  const texture = new Texture(
    '/materials/flooring/woodfloor.jpg',
    scene,
    false,
    true,
    Texture.TRILINEAR_SAMPLINGMODE,
    undefined,
    () => {
      material.diffuseTexture = null;
    },
  );
  texture.uScale = 1;
  texture.vScale = 1;
  material.diffuseTexture = texture;

  return material;
}

function createDoorPanel(
  scene: Scene,
  layout: RoomLayoutState,
  door: DoorOpening,
  material: StandardMaterial,
) {
  const wall = layout.walls.find((candidate) => candidate.id === door.wallId);

  if (!wall) {
    return;
  }

  const startPoint = getPointById(layout.points, wall.startPointId);
  const direction = getWallDirection(wall, layout.points);
  const normal = getWallNormal(wall, layout.points);
  const hingeOffset = door.swingDirection === 'IN_LEFT'
    ? door.offset - door.width / 2
    : door.offset + door.width / 2;
  const hinge = {
    x: startPoint.x + direction.x * hingeOffset,
    y: startPoint.y + direction.y * hingeOffset,
  };
  const openAngle = Math.PI / 2.6;
  const panelHeight = getEffectiveOpeningHeight(wall, door);
  const panelDirection = door.swingDirection === 'IN_LEFT'
    ? {
        x: direction.x * Math.cos(openAngle) + normal.x * Math.sin(openAngle),
        y: direction.y * Math.cos(openAngle) + normal.y * Math.sin(openAngle),
      }
    : {
        x: -direction.x * Math.cos(openAngle) + normal.x * Math.sin(openAngle),
        y: -direction.y * Math.cos(openAngle) + normal.y * Math.sin(openAngle),
      };
  const panel = MeshBuilder.CreateBox(
    `room-preview-${door.id}-panel`,
    {
      depth: 0.12,
      height: panelHeight,
      width: door.width,
    },
    scene,
  );

  panel.position = new Vector3(
    hinge.x + panelDirection.x * door.width / 2,
    panelHeight / 2,
    hinge.y + panelDirection.y * door.width / 2,
  );
  panel.rotation.y = -Math.atan2(panelDirection.y, panelDirection.x);
  panel.material = material;
  panel.metadata = {
    openingId: door.id,
    source: 'room-preview',
    type: 'DOOR',
    wallId: door.wallId,
  };
}

function createWindowAssembly(
  scene: Scene,
  layout: RoomLayoutState,
  windowOpening: WindowOpening,
  glassMaterial: StandardMaterial,
  frameMaterial: StandardMaterial,
) {
  const wall = layout.walls.find((candidate) => candidate.id === windowOpening.wallId);

  if (!wall) {
    return;
  }

  const wallPoint = getPointAtWallOffset(wall, layout.points, windowOpening.offset);
  const direction = getWallDirection(wall, layout.points);
  const normal = getWallNormal(wall, layout.points);
  const centerY = windowOpening.sillHeight + windowOpening.height / 2;
  const frameSize = Math.min(0.18, windowOpening.width / 4, windowOpening.height / 4);
  const rotationY = -Math.atan2(direction.y, direction.x);
  const metadata = {
    openingId: windowOpening.id,
    source: 'room-preview',
    type: 'WINDOW',
    wallId: windowOpening.wallId,
  };

  const createPart = (
    suffix: string,
    width: number,
    height: number,
    offsetAlongWall: number,
    offsetY: number,
    material: StandardMaterial,
    depth: number,
    offsetThroughWall = 0,
  ) => {
    const part = MeshBuilder.CreateBox(
      `room-preview-${windowOpening.id}-${suffix}`,
      { depth, height, width },
      scene,
    );
    part.position = new Vector3(
      wallPoint.x + direction.x * offsetAlongWall + normal.x * offsetThroughWall,
      centerY + offsetY,
      wallPoint.y + direction.y * offsetAlongWall + normal.y * offsetThroughWall,
    );
    part.rotation.y = rotationY;
    part.material = material;
    part.metadata = metadata;
  };

  const innerWidth = Math.max(windowOpening.width - frameSize * 2, 0.05);
  const innerHeight = Math.max(windowOpening.height - frameSize * 2, 0.05);

  const paneDepth = Math.min(0.035, wall.thickness / 6);
  const paneOffset = Math.max(wall.thickness * 0.28, paneDepth);

  createPart('glass-front', innerWidth, innerHeight, 0, 0, glassMaterial, paneDepth, paneOffset);
  createPart('glass-back', innerWidth, innerHeight, 0, 0, glassMaterial, paneDepth, -paneOffset);
  createPart('frame-left', frameSize, windowOpening.height, -windowOpening.width / 2 + frameSize / 2, 0, frameMaterial, wall.thickness + 0.02);
  createPart('frame-right', frameSize, windowOpening.height, windowOpening.width / 2 - frameSize / 2, 0, frameMaterial, wall.thickness + 0.02);
  createPart('frame-top', innerWidth, frameSize, 0, windowOpening.height / 2 - frameSize / 2, frameMaterial, wall.thickness + 0.02);
  createPart('frame-bottom', innerWidth, frameSize, 0, -windowOpening.height / 2 + frameSize / 2, frameMaterial, wall.thickness + 0.02);
}

function buildRoomPreview(
  scene: Scene,
  layout: RoomLayoutState,
  floorMaterial: RoomMaterialSelection,
  wallMaterial: RoomMaterialSelection,
) {
  clearGeneratedRoom(scene);

  const floorBoundary = getClosedRoomBoundary(layout);

  if (floorBoundary.length >= 3) {
    const bounds = getRoomBounds(floorBoundary);
    const width = Math.max(bounds.maxX - bounds.minX, 1);
    const depth = Math.max(bounds.maxY - bounds.minY, 1);
    const floor = new Mesh('room-preview-floor', scene);
    const vertexData = new VertexData();
    vertexData.positions = floorBoundary.flatMap((point) => [point.x, 0, point.y]);
    vertexData.indices = floorBoundary.slice(1, -1).flatMap((_point, index) => [0, index + 1, index + 2]);
    vertexData.normals = floorBoundary.flatMap(() => [0, 1, 0]);
    vertexData.uvs = floorBoundary.flatMap((point) => [
      (point.x - bounds.minX) / width,
      (point.y - bounds.minY) / depth,
    ]);
    vertexData.applyToMesh(floor);
    floor.material = createMaterial(scene, 'room-preview-floor-material', floorMaterial);
    floor.metadata = {
      kind: 'floor',
      source: 'room-preview',
    };
  }

  layout.walls.forEach((wall) => {
    const wallLength = getWallLength(wall, layout.points);
    const wallMeshMaterial = createMaterial(scene, `room-preview-${wall.id}-material`, wallMaterial);
    const cutouts = getWallCutouts(layout, wall);
    let cursor = 0;

    cutouts.forEach((cutout, index) => {
      createWallSegmentMesh(scene, layout, wall, cursor, cutout.start, wallMeshMaterial, `segment-${index}-before`);
      const openingHeight = getEffectiveOpeningHeight(wall, cutout.opening);
      const openingBottom = cutout.opening.type === 'WINDOW' ? cutout.opening.sillHeight : 0;
      const openingTop = openingBottom + openingHeight;
      const topHeight = wall.height - openingTop;

      createWallSegmentMesh(
        scene,
        layout,
        wall,
        cutout.start,
        cutout.end,
        wallMeshMaterial,
        `segment-${index}-below-opening`,
        openingBottom,
        openingBottom / 2,
      );
      createWallSegmentMesh(
        scene,
        layout,
        wall,
        cutout.start,
        cutout.end,
        wallMeshMaterial,
        `segment-${index}-above-opening`,
        topHeight,
        openingTop + topHeight / 2,
      );
      cursor = Math.max(cursor, cutout.end);
    });
    createWallSegmentMesh(scene, layout, wall, cursor, wallLength, wallMeshMaterial, 'segment-end');
  });

  const doorMaterial = createDoorMaterial(scene);

  const windowMaterial = new StandardMaterial('room-preview-window-placeholder-material', scene);
  windowMaterial.diffuseColor = Color3.FromHexString('#7fc7df');
  windowMaterial.alpha = 0.42;
  windowMaterial.backFaceCulling = false;
  windowMaterial.needDepthPrePass = true;
  windowMaterial.specularColor = Color3.FromHexString('#dff7ff');

  const windowFrameMaterial = new StandardMaterial('room-preview-window-frame-material', scene);
  windowFrameMaterial.diffuseColor = Color3.FromHexString('#d8e1e4');
  windowFrameMaterial.specularColor = Color3.FromHexString('#5f747c');

  layout.doors.forEach((door) => {
    createDoorPanel(scene, layout, door, doorMaterial);
  });

  layout.windows.forEach((windowOpening) => {
    createWindowAssembly(scene, layout, windowOpening, windowMaterial, windowFrameMaterial);
  });
}

function splitModelUrl(url: string) {
  const lastSlash = url.lastIndexOf('/') + 1;

  return {
    fileName: url.substring(lastSlash),
    rootUrl: url.substring(0, lastSlash),
  };
}

async function loadProductPreview(scene: Scene, product: PlacedProduct3D) {
  const currentRoot = getProductRoot(scene, product.id);

  if (currentRoot) {
    setProductRootPosition(currentRoot, product.position);
    return currentRoot;
  }

  const { fileName, rootUrl } = splitModelUrl(product.modelUrl);
  const result = await SceneLoader.ImportMeshAsync('', rootUrl, fileName, scene);
  const root = new TransformNode(`product-preview-${product.id}`, scene);
  root.metadata = {
    productId: product.id,
    source: 'product-preview',
  };
  root.position = new Vector3(product.position.x, product.position.y, product.position.z);
  root.rotation = new Vector3(
    product.rotation?.x ?? 0,
    product.rotation?.y ?? 0,
    product.rotation?.z ?? 0,
  );
  root.scaling = new Vector3(
    product.scale?.x ?? 1,
    product.scale?.y ?? 1,
    product.scale?.z ?? 1,
  );

  result.meshes.forEach((mesh) => {
    if (!mesh.parent) {
      mesh.parent = root;
    }

    mesh.metadata = {
      ...(mesh.metadata ?? {}),
      productId: product.id,
      source: 'product-preview',
    };
  });
  const bounds = getProductMeshBounds(scene, product.id);

  if (bounds) {
    const scaleY = root.scaling.y || 1;
    root.metadata = {
      ...(root.metadata ?? {}),
      localGroundOffsetY: (root.position.y - bounds.min.y) / scaleY,
    };
  }

  setProductRootPosition(root, product.position);
  createProductInteractionProxy(scene, root, product.id, product.modelName);

  return root;
}

function createProductInteractionProxy(
  scene: Scene,
  root: TransformNode,
  productId: string,
  productName: string,
) {
  const bounds = getProductMeshBounds(scene, productId);

  if (!bounds) {
    return;
  }

  const size = bounds.max.subtract(bounds.min);
  const center = bounds.min.add(size.scale(0.5));
  const rootWorldMatrix = root.getWorldMatrix();
  const rootWorldMatrixInverted = rootWorldMatrix.clone().invert();
  const centerLocal = Vector3.TransformCoordinates(center, rootWorldMatrixInverted);
  const localSize = new Vector3(
    size.x / Math.max(Math.abs(root.scaling.x), 0.0001),
    size.y / Math.max(Math.abs(root.scaling.y), 0.0001),
    size.z / Math.max(Math.abs(root.scaling.z), 0.0001),
  );
  const proxy = MeshBuilder.CreateBox(
    `product-preview-${productId}-interaction-proxy`,
    {
      depth: Math.max(localSize.z, 0.04),
      height: Math.max(localSize.y, 0.04),
      width: Math.max(localSize.x, 0.04),
    },
    scene,
  );
  const materialName = 'product-preview-interaction-proxy-material';
  const proxyMaterial = scene.getMaterialByName(materialName) as StandardMaterial | null ??
    new StandardMaterial(materialName, scene);

  proxyMaterial.alpha = 0.01;
  proxyMaterial.diffuseColor = Color3.FromHexString('#35d6ff');
  proxyMaterial.disableLighting = true;
  proxy.material = proxyMaterial;
  proxy.parent = root;
  proxy.position = centerLocal;
  proxy.isPickable = true;
  proxy.metadata = {
    interactionProxy: true,
    productId,
    productName,
    source: 'product-preview',
  };
  root.metadata = {
    ...(root.metadata ?? {}),
    footprint: {
      centerOffsetX: centerLocal.x,
      centerOffsetY: centerLocal.y,
      centerOffsetZ: centerLocal.z,
      halfX: Math.max(localSize.x / 2, 0.02),
      halfY: Math.max(localSize.y / 2, 0.02),
      halfZ: Math.max(localSize.z / 2, 0.02),
    } satisfies ProductFootprint,
  };
}

function isPointInsidePolygon(point: { x: number; y: number }, polygon: Array<{ x: number; y: number }>) {
  let isInside = false;

  for (let index = 0, previousIndex = polygon.length - 1; index < polygon.length; previousIndex = index, index += 1) {
    const current = polygon[index];
    const previous = polygon[previousIndex];
    const intersects = current.y > point.y !== previous.y > point.y &&
      point.x < ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y) + current.x;

    if (intersects) {
      isInside = !isInside;
    }
  }

  return isInside;
}

function getPointToSegmentDistance(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (!segmentLengthSquared) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const projection = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) / segmentLengthSquared,
    ),
  );
  const closestPoint = {
    x: start.x + projection * segmentX,
    y: start.y + projection * segmentY,
  };

  return Math.hypot(point.x - closestPoint.x, point.y - closestPoint.y);
}

function getProductFootprint(root: TransformNode | undefined) {
  const footprint = root?.metadata?.footprint as ProductFootprint | undefined;

  if (!root || !footprint) {
    return undefined;
  }

  return {
    centerOffsetX: footprint.centerOffsetX * root.scaling.x,
    centerOffsetY: getProductRootGroundOffsetY(root) + footprint.centerOffsetY * root.scaling.y,
    centerOffsetZ: footprint.centerOffsetZ * root.scaling.z,
    halfX: footprint.halfX * Math.abs(root.scaling.x),
    halfY: footprint.halfY * Math.abs(root.scaling.y),
    halfZ: footprint.halfZ * Math.abs(root.scaling.z),
  };
}

function getProductProxyBounds(root: TransformNode | undefined) {
  const proxy = root?.getChildMeshes(false, (mesh) => Boolean(mesh.metadata?.interactionProxy))[0];

  if (!proxy) {
    return null;
  }

  proxy.computeWorldMatrix(true);

  return proxy.getBoundingInfo().boundingBox;
}

function getOnObjectPosition(
  scene: Scene,
  productId: string,
  supportObjectId: string,
  pickedPoint: Vector3,
) {
  const productRoot = getProductRoot(scene, productId);
  const supportRoot = getProductRoot(scene, supportObjectId);
  const footprint = getProductFootprint(productRoot);
  const supportBounds = getProductProxyBounds(supportRoot);

  if (!productRoot || !footprint || !supportBounds) {
    return null;
  }

  return {
    x: Number((pickedPoint.x - footprint.centerOffsetX).toFixed(2)),
    y: Number((supportBounds.maximumWorld.y - (footprint.centerOffsetY - footprint.halfY)).toFixed(2)),
    z: Number((pickedPoint.z - footprint.centerOffsetZ).toFixed(2)),
  };
}

function getWallMountedPosition(
  scene: Scene,
  layout: RoomLayoutState,
  productId: string,
  wallId: string,
  pickedPoint: Vector3,
) {
  const wall = layout.walls.find((candidate) => candidate.id === wallId);
  const footprint = getProductFootprint(getProductRoot(scene, productId));

  if (!wall || !footprint) {
    return null;
  }

  const normal = getWallNormal(wall, layout.points);
  const distanceFromCenter = wall.thickness / 2 + Math.max(footprint.halfX, footprint.halfZ);
  const candidates = [1, -1].map((direction) => ({
    x: pickedPoint.x + normal.x * distanceFromCenter * direction,
    z: pickedPoint.z + normal.y * distanceFromCenter * direction,
  }));
  const insideCandidate = candidates.find((candidate) =>
    isPointInsidePolygon({ x: candidate.x, y: candidate.z }, layout.points),
  ) ?? candidates[0];
  const minRootY = footprint.halfY - footprint.centerOffsetY;
  const maxRootY = Math.max(wall.height - footprint.halfY - footprint.centerOffsetY, minRootY);

  return {
    x: Number((insideCandidate.x - footprint.centerOffsetX).toFixed(2)),
    y: Number(clamp(pickedPoint.y - footprint.centerOffsetY, minRootY, maxRootY).toFixed(2)),
    z: Number((insideCandidate.z - footprint.centerOffsetZ).toFixed(2)),
  };
}

function getFootprintPoints(
  position: PlacedProduct3D['position'],
  footprint?: ProductFootprint,
) {
  if (!footprint) {
    return [
      {
        x: position.x,
        y: position.z,
      },
    ];
  }

  const center = {
    x: position.x + footprint.centerOffsetX,
    y: position.z + footprint.centerOffsetZ,
  };

  return [
    { x: center.x - footprint.halfX, y: center.y - footprint.halfZ },
    { x: center.x + footprint.halfX, y: center.y - footprint.halfZ },
    { x: center.x + footprint.halfX, y: center.y + footprint.halfZ },
    { x: center.x - footprint.halfX, y: center.y + footprint.halfZ },
  ];
}

function getFootprintBounds(root: TransformNode) {
  const proxy = root.getChildMeshes(false, (mesh) => Boolean(mesh.metadata?.interactionProxy))[0];

  if (proxy) {
    proxy.computeWorldMatrix(true);
    const boundingBox = proxy.getBoundingInfo().boundingBox;
    const min = boundingBox.minimumWorld;
    const max = boundingBox.maximumWorld;

    return {
      maxX: max.x,
      maxY: max.z,
      minX: min.x,
      minY: min.z,
      points: [
        { x: min.x, y: min.z },
        { x: max.x, y: min.z },
        { x: max.x, y: max.z },
        { x: min.x, y: max.z },
      ],
    };
  }

  const points = getFootprintPoints(
    { x: root.position.x, y: root.position.y, z: root.position.z },
    getProductFootprint(root),
  );
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  return {
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    points,
  };
}

function getBoundsDistance(
  first: ReturnType<typeof getFootprintBounds>,
  second: ReturnType<typeof getFootprintBounds>,
) {
  const deltaX = Math.max(0, first.minX - second.maxX, second.minX - first.maxX);
  const deltaY = Math.max(0, first.minY - second.maxY, second.minY - first.maxY);

  return Math.hypot(deltaX, deltaY);
}

function calculateProductMeasurements(
  scene: Scene,
  layout: RoomLayoutState,
  selectedProductId: string | null,
  comparisonProductId: string | null,
): ProductMeasurements | null {
  if (!selectedProductId) {
    return null;
  }

  const selectedRoot = getProductRoot(scene, selectedProductId);

  if (!selectedRoot) {
    return null;
  }

  const selectedBounds = getFootprintBounds(selectedRoot);
  const nearestWall = layout.walls.reduce<ProductMeasurements['nearestWall']>((nearest, wall) => {
    const start = getPointById(layout.points, wall.startPointId);
    const end = getPointById(layout.points, wall.endPointId);
    const distance = Math.max(
      0,
      Math.min(...selectedBounds.points.map((point) => getPointToSegmentDistance(point, start, end))) - wall.thickness / 2,
    );

    return !nearest || distance < nearest.distance
      ? { distance, wallId: wall.id }
      : nearest;
  }, null);
  const comparisonRoot = comparisonProductId ? getProductRoot(scene, comparisonProductId) : undefined;
  const comparedObject = comparisonRoot
    ? {
        distance: getBoundsDistance(selectedBounds, getFootprintBounds(comparisonRoot)),
        productId: comparisonProductId as string,
      }
    : null;

  return {
    comparedObject: comparedObject
      ? { ...comparedObject, distance: Number(comparedObject.distance.toFixed(2)) }
      : null,
    nearestWall: nearestWall
      ? { ...nearestWall, distance: Number(nearestWall.distance.toFixed(2)) }
      : null,
  };
}

function isProductPlacementInsideRoom(
  scene: Scene,
  productId: string,
  position: PlacedProduct3D['position'],
  layout: RoomLayoutState,
) {
  const footprint = getProductFootprint(getProductRoot(scene, productId));
  const footprintPoints = getFootprintPoints(position, footprint);
  const wallPadding = Math.max(layout.wallThickness / 2, 0);

  return footprintPoints.every((point) => {
    if (!isPointInsidePolygon(point, layout.points)) {
      return false;
    }

    return layout.walls.every((wall) => {
      const start = getPointById(layout.points, wall.startPointId);
      const end = getPointById(layout.points, wall.endPointId);

      return getPointToSegmentDistance(point, start, end) >= wallPadding;
    });
  });
}

function getNearestValidProductPosition(
  scene: Scene,
  productId: string,
  desiredPosition: PlacedProduct3D['position'],
  layout: RoomLayoutState,
) {
  if (isProductPlacementInsideRoom(scene, productId, desiredPosition, layout)) {
    return desiredPosition;
  }

  const bounds = getRoomBounds(layout.points);
  const roomWidth = Math.max(bounds.maxX - bounds.minX, 1);
  const roomDepth = Math.max(bounds.maxY - bounds.minY, 1);
  const maxRadius = Math.hypot(roomWidth, roomDepth);
  const step = Math.max(layout.wallThickness, Math.min(roomWidth, roomDepth) / 40, 0.25);
  const directions = 24;

  for (let radius = step; radius <= maxRadius; radius += step) {
    for (let index = 0; index < directions; index += 1) {
      const angle = (Math.PI * 2 * index) / directions;
      const candidate = {
        x: Number((desiredPosition.x + Math.cos(angle) * radius).toFixed(2)),
        y: desiredPosition.y,
        z: Number((desiredPosition.z + Math.sin(angle) * radius).toFixed(2)),
      };

      if (isProductPlacementInsideRoom(scene, productId, candidate, layout)) {
        return candidate;
      }
    }
  }

  return null;
}

function arePositionsEqual(
  firstPosition: PlacedProduct3D['position'],
  secondPosition: PlacedProduct3D['position'],
) {
  return firstPosition.x === secondPosition.x &&
    firstPosition.y === secondPosition.y &&
    firstPosition.z === secondPosition.z;
}

function getProductRoot(scene: Scene, productId: string) {
  return scene.transformNodes.find((node) => node.metadata?.source === 'product-preview' && node.metadata?.productId === productId);
}

function getProductRoots(scene: Scene, productId: string) {
  return scene.transformNodes.filter((node) => node.metadata?.source === 'product-preview' && node.metadata?.productId === productId);
}

function disposeProductPreview(scene: Scene, productId: string) {
  scene.meshes
    .filter((mesh) => mesh.metadata?.source === 'product-preview' && mesh.metadata?.productId === productId)
    .forEach((mesh) => mesh.dispose(false, false));

  scene.transformNodes
    .filter((node) => node.metadata?.source === 'product-preview' && node.metadata?.productId === productId)
    .forEach((node) => node.dispose());
}

function syncProductPreviews(
  scene: Scene,
  products: PlacedProduct3D[],
  layout: RoomLayoutState | null,
  onProductMove?: RoomPreview3DProps['onProductMove'],
  onProductReady?: () => void,
  onProductLoadError?: RoomPreview3DProps['onProductLoadError'],
) {
  const nextProductIds = new Set(products.map((product) => product.id));

  scene.transformNodes
    .filter((node) => node.metadata?.source === 'product-preview' && !nextProductIds.has(node.metadata?.productId))
    .forEach((node) => {
      disposeProductPreview(scene, node.metadata.productId);
    });

  products.forEach((product) => {
    const roots = getProductRoots(scene, product.id);
    const root = roots[0];

    roots.slice(1).forEach((duplicateRoot) => {
      duplicateRoot.dispose(false, true);
    });

    if (root) {
      root.rotation = new Vector3(
        product.rotation?.x ?? 0,
        product.rotation?.y ?? 0,
        product.rotation?.z ?? 0,
      );
      root.scaling = new Vector3(
        product.scale?.x ?? 1,
        product.scale?.y ?? 1,
        product.scale?.z ?? 1,
      );
      const nextPosition = layout && product.placementMode !== 'WALL_MOUNTED'
        ? getNearestValidProductPosition(scene, product.id, product.position, layout) ?? product.position
        : product.position;
      setProductRootPosition(root, nextPosition);

      if (layout && !arePositionsEqual(nextPosition, product.position)) {
        onProductMove?.(product.id, nextPosition);
      }

      onProductReady?.();

      return;
    }

    const loadLocks = getSceneProductLoadLocks(scene);

    if (loadLocks.has(product.id)) {
      return;
    }

    loadLocks.add(product.id);

    void loadProductPreview(scene, product).then(() => {
      if (!layout) {
        return;
      }

      const nextPosition = product.placementMode === 'WALL_MOUNTED'
        ? product.position
        : getNearestValidProductPosition(scene, product.id, product.position, layout);
      const loadedRoot = getProductRoot(scene, product.id);

      if (!nextPosition || !loadedRoot) {
        return;
      }

      setProductRootPosition(loadedRoot, nextPosition);

      if (!arePositionsEqual(nextPosition, product.position)) {
        onProductMove?.(product.id, nextPosition);
      }

      onProductReady?.();
    }).catch((cause) => {
      onProductLoadError?.(product.id, getModelLoadErrorMessage(cause, product.modelUrl));
    }).finally(() => {
      loadLocks.delete(product.id);
    });
  });
}

function setProductHighlight(
  scene: Scene,
  productId: string | null,
  comparisonProductId: string | null = null,
) {
  scene.meshes
    .filter((mesh) => mesh.metadata?.source === 'product-preview')
    .forEach((mesh) => {
      const isSelected = mesh.metadata?.productId === productId;
      const isComparison = mesh.metadata?.productId === comparisonProductId;

      if (mesh.metadata?.interactionProxy) {
        mesh.renderOverlay = false;
        mesh.showBoundingBox = isSelected || isComparison;
        return;
      }

      mesh.renderOverlay = isSelected || isComparison;
      mesh.overlayColor = Color3.FromHexString(isComparison ? '#f0a43c' : '#35d6ff');
      mesh.overlayAlpha = 0.35;
      mesh.showBoundingBox = false;
    });
}

function frameRoom(camera: ArcRotateCamera, layout: RoomLayoutState) {
  const bounds = getRoomBounds(layout.points);
  const width = Math.max(bounds.maxX - bounds.minX, 1);
  const depth = Math.max(bounds.maxY - bounds.minY, 1);
  const roomMax = Math.max(width, depth, layout.wallHeight, 8);
  camera.setTarget(new Vector3((bounds.minX + bounds.maxX) / 2, layout.wallHeight / 2, (bounds.minY + bounds.maxY) / 2));
  camera.upperRadiusLimit = Math.max(roomMax * 4, 120);
  camera.radius = roomMax * 1.55;
  camera.maxZ = Math.max(roomMax * 8, 1000);
  camera.minZ = 0.05;
}

function updateExteriorWallVisibility(
  scene: Scene,
  camera: ArcRotateCamera,
  layout: RoomLayoutState,
) {
  const bounds = getRoomBounds(layout.points);
  const roomCenter = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };
  const hiddenWallIds = new Set<string>();

  layout.walls.forEach((wall) => {
    const start = getPointById(layout.points, wall.startPointId);
    const end = getPointById(layout.points, wall.endPointId);
    const sideOfWall = (point: { x: number; y: number }) =>
      (end.x - start.x) * (point.y - start.y) -
      (end.y - start.y) * (point.x - start.x);
    const centerSide = sideOfWall(roomCenter);
    const cameraSide = sideOfWall({ x: camera.position.x, y: camera.position.z });

    if (centerSide * cameraSide < -0.001) {
      hiddenWallIds.add(wall.id);
    }
  });

  scene.meshes
    .filter((mesh) => mesh.metadata?.source === 'room-preview' && mesh.metadata?.wallId)
    .forEach((mesh) => {
      const isVisible = !hiddenWallIds.has(mesh.metadata.wallId);
      mesh.isVisible = isVisible;
      mesh.isPickable = isVisible;
    });
}

export function RoomPreview3D({
  comparisonProductId = null,
  floorMaterial,
  layout,
  onMeasurementsChange,
  onProductDrop,
  onProductLoadError,
  onProductMove,
  onProductSelect,
  placedProducts = [],
  readOnly = false,
  selectedProductId = null,
  wallMaterial,
}: RoomPreview3DProps) {
  const cameraRef = useRef<ArcRotateCamera | null>(null);
  const comparisonProductIdRef = useRef(comparisonProductId);
  const dragProductRef = useRef<DragProductState | null>(null);
  const layoutRef = useRef(layout);
  const onProductDropRef = useRef(onProductDrop);
  const onProductLoadErrorRef = useRef(onProductLoadError);
  const onProductMoveRef = useRef(onProductMove);
  const onProductSelectRef = useRef(onProductSelect);
  const onMeasurementsChangeRef = useRef(onMeasurementsChange);
  const placedProductsRef = useRef(placedProducts);
  const sceneRef = useRef<Scene | null>(null);
  const selectedProductIdRef = useRef(selectedProductId);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    onProductDropRef.current = onProductDrop;
  }, [onProductDrop]);

  useEffect(() => {
    onProductLoadErrorRef.current = onProductLoadError;
  }, [onProductLoadError]);

  useEffect(() => {
    onProductMoveRef.current = onProductMove;
  }, [onProductMove]);

  useEffect(() => {
    onProductSelectRef.current = onProductSelect;
  }, [onProductSelect]);

  useEffect(() => {
    comparisonProductIdRef.current = comparisonProductId;
  }, [comparisonProductId]);

  useEffect(() => {
    selectedProductIdRef.current = selectedProductId;
  }, [selectedProductId]);

  useEffect(() => {
    onMeasurementsChangeRef.current = onMeasurementsChange;
  }, [onMeasurementsChange]);

  useEffect(() => {
    placedProductsRef.current = placedProducts;
  }, [placedProducts]);

  const refreshMeasurements = useCallback(() => {
    const scene = sceneRef.current;
    const currentLayout = layoutRef.current;

    if (!scene || !currentLayout) {
      onMeasurementsChangeRef.current?.(null);
      return;
    }

    onMeasurementsChangeRef.current?.(calculateProductMeasurements(
      scene,
      currentLayout,
      selectedProductIdRef.current,
      comparisonProductIdRef.current,
    ));
  }, []);

  const rebuild = useCallback(() => {
    const scene = sceneRef.current;

    if (!scene || !layout) {
      return;
    }

    buildRoomPreview(scene, layout, floorMaterial, wallMaterial);

    if (cameraRef.current) {
      frameRoom(cameraRef.current, layout);
    }
  }, [floorMaterial, layout, wallMaterial]);

  useEffect(() => {
    rebuild();
    refreshMeasurements();
  }, [rebuild, refreshMeasurements]);

  useEffect(() => {
    const scene = sceneRef.current;

    if (!scene) {
      return;
    }

    syncProductPreviews(
      scene,
      placedProducts,
      layoutRef.current,
      onProductMoveRef.current,
      refreshMeasurements,
      onProductLoadErrorRef.current,
    );
    refreshMeasurements();
  }, [placedProducts, refreshMeasurements]);

  useEffect(() => {
    const scene = sceneRef.current;

    if (!scene) {
      return;
    }

    setProductHighlight(scene, selectedProductId, comparisonProductId);
    refreshMeasurements();
  }, [comparisonProductId, refreshMeasurements, selectedProductId]);

  return (
    <div className="room-preview-3d">
      <BabylonCanvas
        className="three-d-canvas"
        onRender={() => {
          const camera = cameraRef.current;
          const currentLayout = layoutRef.current;

          if (camera && currentLayout) {
            updateExteriorWallVisibility(sceneRef.current ?? camera.getScene(), camera, currentLayout);
          }
        }}
        onSceneReady={(scene: Scene, _engine: Engine, canvas: HTMLCanvasElement) => {
          sceneRef.current = scene;
          scene.clearColor.set(0.86, 0.89, 0.9, 1);

          const camera = new ArcRotateCamera(
            'room-preview-camera',
            -Math.PI / 2,
            Tools.ToRadians(60),
            18,
            Vector3.Zero(),
            scene,
          );
          camera.attachControl(canvas, true);
          camera.lowerRadiusLimit = 4;
          camera.upperRadiusLimit = 1000;
          camera.wheelDeltaPercentage = 0.01;
          camera.maxZ = 2000;
          cameraRef.current = camera;

          const light = new HemisphericLight('room-preview-light', new Vector3(0.2, 1, 0.35), scene);
          light.intensity = 0.92;

          const handleDragOver = (event: DragEvent) => {
            if (readOnly) {
              return;
            }

            if (!Array.from(event.dataTransfer?.types ?? []).includes(PRODUCT_DRAG_DATA_TYPE)) {
              return;
            }

            event.preventDefault();
            canvas.style.cursor = 'copy';
          };
          const handleDrop = (event: DragEvent) => {
            if (readOnly) {
              return;
            }

            if (!Array.from(event.dataTransfer?.types ?? []).includes(PRODUCT_DRAG_DATA_TYPE)) {
              return;
            }

            event.preventDefault();

            const currentLayout = layoutRef.current;
            const productModelId = event.dataTransfer?.getData(PRODUCT_DRAG_DATA_TYPE);

            if (!currentLayout || !productModelId) {
              return;
            }

            const canvasBounds = canvas.getBoundingClientRect();
            const floorPick = scene.pick(
              event.clientX - canvasBounds.left,
              event.clientY - canvasBounds.top,
              (mesh) => mesh.metadata?.kind === 'floor',
            );
            const point = floorPick?.pickedPoint;

            if (!point) {
              return;
            }

            const next2dPoint = {
              x: point.x,
              y: point.z,
            };

            if (!isPointInsidePolygon(next2dPoint, currentLayout.points)) {
              return;
            }

            onProductDropRef.current?.(productModelId, {
              x: Number(point.x.toFixed(2)),
              y: 0,
              z: Number(point.z.toFixed(2)),
            });
            canvas.style.cursor = '';
          };
          const handleDragLeave = () => {
            canvas.style.cursor = '';
          };
          const handleContextMenu = (event: MouseEvent) => {
            event.preventDefault();

            const canvasBounds = canvas.getBoundingClientRect();
            const productPick = scene.pick(
              event.clientX - canvasBounds.left,
              event.clientY - canvasBounds.top,
              (mesh) => mesh.metadata?.source === 'product-preview',
            );
            const productId = productPick?.pickedMesh?.metadata?.productId as string | undefined;

            if (!productId) {
              return;
            }

            dragProductRef.current = null;
            camera.attachControl(canvas, true);
            setProductHighlight(scene, productId, null);
            onProductSelectRef.current?.(productId, false);
            canvas.style.cursor = 'pointer';
          };

          canvas.addEventListener('dragover', handleDragOver);
          canvas.addEventListener('drop', handleDrop);
          canvas.addEventListener('dragleave', handleDragLeave);
          canvas.addEventListener('contextmenu', handleContextMenu);
          scene.onDisposeObservable.addOnce(() => {
            canvas.removeEventListener('dragover', handleDragOver);
            canvas.removeEventListener('drop', handleDrop);
            canvas.removeEventListener('dragleave', handleDragLeave);
            canvas.removeEventListener('contextmenu', handleContextMenu);
          });

          scene.onPointerObservable.add((pointerInfo) => {
            const currentLayout = layoutRef.current;

            if (!currentLayout) {
              return;
            }

            if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
              const productId = pointerInfo.pickInfo?.pickedMesh?.metadata?.productId as string | undefined;
              const pointerButton = pointerInfo.event.button;

              if (!productId) {
                setProductHighlight(scene, null, null);
                onProductSelectRef.current?.(null, false);
                return;
              }

              const productRoot = getProductRoot(scene, productId);
              const product = placedProductsRef.current.find((candidate) => candidate.id === productId);
              const placementMode = product?.placementMode ?? 'FLOOR';
              const additive = pointerInfo.event.shiftKey;
              setProductHighlight(
                scene,
                additive ? selectedProductIdRef.current : productId,
                additive ? productId : null,
              );
              onProductSelectRef.current?.(productId, additive);

              if (readOnly) {
                canvas.style.cursor = 'pointer';
                return;
              }

              if (pointerButton === 2) {
                dragProductRef.current = null;
                camera.attachControl(canvas, true);
                canvas.style.cursor = 'pointer';
                pointerInfo.event.preventDefault();
                return;
              }

              if (pointerButton !== 0) {
                return;
              }

              dragProductRef.current = {
                hasMoved: false,
                placementMode,
                pointerStartY: pointerInfo.event.clientY,
                productId,
                position: productRoot ? getProductAnchorPosition(productRoot) : { x: 0, y: 0, z: 0 },
                startPosition: productRoot ? getProductAnchorPosition(productRoot) : { x: 0, y: 0, z: 0 },
              };
              camera.detachControl();
              canvas.style.cursor = 'grabbing';
              pointerInfo.event.preventDefault();
            }

            if (pointerInfo.type === PointerEventTypes.POINTERMOVE && dragProductRef.current) {
              const dragState = dragProductRef.current;
              let nextPosition: PlacedProduct3D['position'] | null = null;
              let placementUpdate = dragState.placementUpdate;

              if (dragState.placementMode === 'CUSTOM_HEIGHT' && pointerInfo.event.shiftKey) {
                const verticalDelta = (dragState.pointerStartY - pointerInfo.event.clientY) * 0.02;

                nextPosition = {
                  ...dragState.position,
                  y: Number(Math.max(0, dragState.startPosition.y + verticalDelta).toFixed(2)),
                };
              } else if (dragState.placementMode === 'WALL_MOUNTED') {
                const wallPick = scene.pick(
                  scene.pointerX,
                  scene.pointerY,
                  (mesh) => mesh.metadata?.source === 'room-preview' &&
                    Boolean(mesh.metadata?.wallId) &&
                    !mesh.metadata?.openingId,
                );
                const wallId = wallPick?.pickedMesh?.metadata?.wallId as string | undefined;

                if (wallId && wallPick?.pickedPoint) {
                  nextPosition = getWallMountedPosition(
                    scene,
                    currentLayout,
                    dragState.productId,
                    wallId,
                    wallPick.pickedPoint,
                  );
                  placementUpdate = { mountedWallId: wallId, supportObjectId: null };
                }
              } else if (dragState.placementMode === 'ON_OBJECT') {
                const supportPick = scene.pick(
                  scene.pointerX,
                  scene.pointerY,
                  (mesh) => Boolean(mesh.metadata?.interactionProxy) &&
                    mesh.metadata?.productId !== dragState.productId,
                );
                const supportObjectId = supportPick?.pickedMesh?.metadata?.productId as string | undefined;

                if (supportObjectId && supportPick?.pickedPoint) {
                  nextPosition = getOnObjectPosition(
                    scene,
                    dragState.productId,
                    supportObjectId,
                    supportPick.pickedPoint,
                  );
                  placementUpdate = { mountedWallId: null, supportObjectId };
                }
              }

              if (!nextPosition && dragState.placementMode !== 'WALL_MOUNTED') {
                const floorPick = scene.pick(
                  scene.pointerX,
                  scene.pointerY,
                  (mesh) => mesh.metadata?.kind === 'floor',
                );
                const point = floorPick?.pickedPoint;

                if (!point) {
                  return;
                }

                nextPosition = {
                  x: Number(point.x.toFixed(2)),
                  y: dragState.placementMode === 'CUSTOM_HEIGHT' ? dragState.position.y : 0,
                  z: Number(point.z.toFixed(2)),
                };

                if (dragState.placementMode === 'ON_OBJECT') {
                  placementUpdate = { mountedWallId: null, supportObjectId: null };
                }
              }

              if (!nextPosition) {
                return;
              }

              const root = getProductRoot(scene, dragState.productId);

              if (
                dragState.placementMode !== 'WALL_MOUNTED' &&
                !isProductPlacementInsideRoom(scene, dragState.productId, nextPosition, currentLayout)
              ) {
                return;
              }

              if (root) {
                setProductRootPosition(root, nextPosition);
              }

              dragProductRef.current = {
                ...dragState,
                hasMoved: dragState.hasMoved || !arePositionsEqual(nextPosition, dragState.position),
                placementUpdate,
                position: nextPosition,
              };
              canvas.style.cursor = 'grabbing';
              refreshMeasurements();
              return;
            }

            if (pointerInfo.type === PointerEventTypes.POINTERMOVE && !dragProductRef.current) {
              const productPick = scene.pick(
                scene.pointerX,
                scene.pointerY,
                (mesh) => mesh.metadata?.source === 'product-preview',
              );
              canvas.style.cursor = productPick?.pickedMesh?.metadata?.productId ? (readOnly ? 'pointer' : 'grab') : '';
            }

            if (pointerInfo.type === PointerEventTypes.POINTERUP && dragProductRef.current) {
              if (dragProductRef.current.hasMoved) {
                onProductMoveRef.current?.(
                  dragProductRef.current.productId,
                  dragProductRef.current.position,
                  dragProductRef.current.placementUpdate,
                );
              }
              dragProductRef.current = null;
              camera.attachControl(canvas, true);
              canvas.style.cursor = 'grab';
              refreshMeasurements();
            }
          });

          if (layout) {
            buildRoomPreview(scene, layout, floorMaterial, wallMaterial);
            syncProductPreviews(
              scene,
              placedProducts,
              layout,
              onProductMoveRef.current,
              refreshMeasurements,
              onProductLoadErrorRef.current,
            );
            frameRoom(camera, layout);
          }
        }}
      />
      {!layout && (
        <div className="room-preview-empty">
          Add a box in 2D first. The 3D room preview is generated from that blueprint data.
        </div>
      )}
    </div>
  );
}
