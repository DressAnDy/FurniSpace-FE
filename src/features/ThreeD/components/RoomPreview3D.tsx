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
  WallOpening,
} from '@/features/ThreeD/types/roomLayout.types';
import {
  getPointById,
  getPointAtWallOffset,
  getRoomBounds,
  getWallDirection,
  getWallLength,
  getWallNormal,
} from '@/features/ThreeD/utils/roomGeometry';

export type RoomPreview3DProps = {
  floorMaterial: RoomMaterialSelection;
  layout: RoomLayoutState | null;
  onProductDrop?: (productModelId: string, position: PlacedProduct3D['position']) => void;
  onProductMove?: (productId: string, position: PlacedProduct3D['position']) => void;
  onProductSelect?: (productId: string | null) => void;
  placedProducts?: PlacedProduct3D[];
  selectedProductId?: string | null;
  wallMaterial: RoomMaterialSelection;
};

export type ProductPlacementMode = 'FLOOR' | 'ON_OBJECT' | 'WALL_MOUNTED' | 'CUSTOM_HEIGHT';

export type Vector3State = {
  x: number;
  y: number;
  z: number;
};

export type PlacedProduct3D = {
  heightOffset?: number;
  id: string;
  mountedWallId?: string | null;
  modelName: string;
  modelUrl: string;
  placementMode?: ProductPlacementMode;
  position: Vector3State;
  productId?: string;
  rotation?: Vector3State;
  scale?: Vector3State;
  supportObjectId?: string | null;
};

type DragProductState = {
  hasMoved: boolean;
  productId: string;
  position: PlacedProduct3D['position'];
};

type ProductFootprint = {
  centerOffsetX: number;
  centerOffsetZ: number;
  halfX: number;
  halfZ: number;
};

type WallCutout = {
  end: number;
  opening: DoorOpening | WallOpening;
  start: number;
};

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

  return [...layout.doors, ...layout.openings]
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

function getEffectiveOpeningHeight(wall: BlueprintWall, opening: DoorOpening | WallOpening) {
  return Number(clamp(opening.height, 0, Math.max(wall.height / 2, 0)).toFixed(2));
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

function buildRoomPreview(
  scene: Scene,
  layout: RoomLayoutState,
  floorMaterial: RoomMaterialSelection,
  wallMaterial: RoomMaterialSelection,
) {
  clearGeneratedRoom(scene);

  const bounds = getRoomBounds(layout.points);
  const width = Math.max(bounds.maxX - bounds.minX, 1);
  const depth = Math.max(bounds.maxY - bounds.minY, 1);
  const floor = new Mesh('room-preview-floor', scene);
  const vertexData = new VertexData();
  vertexData.positions = layout.points.flatMap((point) => [point.x, 0, point.y]);
  vertexData.indices = [0, 1, 2, 0, 2, 3];
  vertexData.normals = layout.points.flatMap(() => [0, 1, 0]);
  vertexData.uvs = layout.points.flatMap((point) => [
    (point.x - bounds.minX) / width,
    (point.y - bounds.minY) / depth,
  ]);
  vertexData.applyToMesh(floor);
  floor.material = createMaterial(scene, 'room-preview-floor-material', floorMaterial);
  floor.metadata = {
    kind: 'floor',
    source: 'room-preview',
  };

  layout.walls.forEach((wall) => {
    const wallLength = getWallLength(wall, layout.points);
    const wallMeshMaterial = createMaterial(scene, `room-preview-${wall.id}-material`, wallMaterial);
    const cutouts = getWallCutouts(layout, wall);
    let cursor = 0;

    cutouts.forEach((cutout, index) => {
      createWallSegmentMesh(scene, layout, wall, cursor, cutout.start, wallMeshMaterial, `segment-${index}-before`);
      const openingHeight = getEffectiveOpeningHeight(wall, cutout.opening);
      const topHeight = wall.height - openingHeight;
      createWallSegmentMesh(
        scene,
        layout,
        wall,
        cutout.start,
        cutout.end,
        wallMeshMaterial,
        `segment-${index}-above-opening`,
        topHeight,
        openingHeight + topHeight / 2,
      );
      cursor = Math.max(cursor, cutout.end);
    });
    createWallSegmentMesh(scene, layout, wall, cursor, wallLength, wallMeshMaterial, 'segment-end');
  });

  const doorMaterial = createDoorMaterial(scene);

  const windowMaterial = new StandardMaterial('room-preview-window-placeholder-material', scene);
  windowMaterial.diffuseColor = Color3.FromHexString('#7fc7df');
  windowMaterial.alpha = 0.58;
  windowMaterial.specularColor = Color3.Black();

  layout.doors.forEach((door) => {
    createDoorPanel(scene, layout, door, doorMaterial);
  });

  layout.windows.forEach((openingItem) => {
    const wall = layout.walls.find((candidate) => candidate.id === openingItem.wallId);

    if (!wall) {
      return;
    }

    const wallPoint = getPointAtWallOffset(wall, layout.points, openingItem.offset);
    const direction = getWallDirection(wall, layout.points);
    const normal = getWallNormal(wall, layout.points);
    const markerHeight = openingItem.height;
    const markerCenterY = openingItem.sillHeight + openingItem.height / 2;
    const marker = MeshBuilder.CreateBox(
      `room-preview-${openingItem.id}`,
      {
        depth: 0.05,
        height: markerHeight,
        width: openingItem.width,
      },
      scene,
    );

    marker.position = new Vector3(
      wallPoint.x + normal.x * (wall.thickness / 2 + 0.035),
      markerCenterY,
      wallPoint.y + normal.y * (wall.thickness / 2 + 0.035),
    );
    marker.rotation.y = -Math.atan2(direction.y, direction.x);
    marker.material = windowMaterial;
    marker.metadata = {
      openingId: openingItem.id,
      source: 'room-preview',
      type: 'WINDOW',
      wallId: openingItem.wallId,
    };
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
    currentRoot.position = new Vector3(product.position.x, product.position.y, product.position.z);
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
  createProductInteractionProxy(scene, root, product.id, product.modelName);

  return root;
}

function createProductInteractionProxy(
  scene: Scene,
  root: TransformNode,
  productId: string,
  productName: string,
) {
  const modelMeshes = scene.meshes.filter(
    (mesh) =>
      mesh.metadata?.source === 'product-preview' &&
      mesh.metadata?.productId === productId &&
      !mesh.metadata?.interactionProxy &&
      mesh.getTotalVertices() > 0,
  );

  if (!modelMeshes.length) {
    return;
  }

  modelMeshes.forEach((mesh) => {
    mesh.computeWorldMatrix(true);
  });

  const bounds = modelMeshes.reduce(
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
  const size = bounds.max.subtract(bounds.min);
  const center = bounds.min.add(size.scale(0.5));
  const rootWorldMatrix = root.getWorldMatrix();
  const rootWorldMatrixInverted = rootWorldMatrix.clone().invert();
  const centerLocal = Vector3.TransformCoordinates(center, rootWorldMatrixInverted);
  const proxy = MeshBuilder.CreateBox(
    `product-preview-${productId}-interaction-proxy`,
    {
      depth: Math.max(size.z, 0.04),
      height: Math.max(size.y, 0.04),
      width: Math.max(size.x, 0.04),
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
      centerOffsetZ: centerLocal.z,
      halfX: Math.max(size.x / 2, 0.02),
      halfZ: Math.max(size.z / 2, 0.02),
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
  return root?.metadata?.footprint as ProductFootprint | undefined;
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
  onProductMove?: (productId: string, position: PlacedProduct3D['position']) => void,
) {
  const nextProductIds = new Set(products.map((product) => product.id));

  scene.transformNodes
    .filter((node) => node.metadata?.source === 'product-preview' && !nextProductIds.has(node.metadata?.productId))
    .forEach((node) => {
      disposeProductPreview(scene, node.metadata.productId);
    });

  products.forEach((product) => {
    const root = getProductRoot(scene, product.id);

    if (root) {
      const nextPosition = layout
        ? getNearestValidProductPosition(scene, product.id, product.position, layout) ?? product.position
        : product.position;
      root.position = new Vector3(nextPosition.x, nextPosition.y, nextPosition.z);
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

      if (layout && !arePositionsEqual(nextPosition, product.position)) {
        onProductMove?.(product.id, nextPosition);
      }

      return;
    }

    void loadProductPreview(scene, product).then(() => {
      if (!layout) {
        return;
      }

      const nextPosition = getNearestValidProductPosition(scene, product.id, product.position, layout);
      const loadedRoot = getProductRoot(scene, product.id);

      if (!nextPosition || !loadedRoot) {
        return;
      }

      loadedRoot.position = new Vector3(nextPosition.x, nextPosition.y, nextPosition.z);

      if (!arePositionsEqual(nextPosition, product.position)) {
        onProductMove?.(product.id, nextPosition);
      }
    });
  });
}

function setProductHighlight(scene: Scene, productId: string | null) {
  scene.meshes
    .filter((mesh) => mesh.metadata?.source === 'product-preview')
    .forEach((mesh) => {
      const isSelected = mesh.metadata?.productId === productId;

      if (mesh.metadata?.interactionProxy) {
        mesh.renderOverlay = false;
        mesh.showBoundingBox = isSelected;
        return;
      }

      mesh.renderOverlay = isSelected;
      mesh.overlayColor = Color3.FromHexString('#35d6ff');
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

export function RoomPreview3D({
  floorMaterial,
  layout,
  onProductDrop,
  onProductMove,
  onProductSelect,
  placedProducts = [],
  selectedProductId = null,
  wallMaterial,
}: RoomPreview3DProps) {
  const cameraRef = useRef<ArcRotateCamera | null>(null);
  const dragProductRef = useRef<DragProductState | null>(null);
  const layoutRef = useRef(layout);
  const onProductDropRef = useRef(onProductDrop);
  const onProductMoveRef = useRef(onProductMove);
  const onProductSelectRef = useRef(onProductSelect);
  const sceneRef = useRef<Scene | null>(null);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    onProductDropRef.current = onProductDrop;
  }, [onProductDrop]);

  useEffect(() => {
    onProductMoveRef.current = onProductMove;
  }, [onProductMove]);

  useEffect(() => {
    onProductSelectRef.current = onProductSelect;
  }, [onProductSelect]);

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
  }, [rebuild]);

  useEffect(() => {
    const scene = sceneRef.current;

    if (!scene) {
      return;
    }

    syncProductPreviews(scene, placedProducts, layoutRef.current, onProductMoveRef.current);
  }, [placedProducts]);

  useEffect(() => {
    const scene = sceneRef.current;

    if (!scene) {
      return;
    }

    setProductHighlight(scene, selectedProductId);
  }, [selectedProductId]);

  return (
    <div className="room-preview-3d">
      <BabylonCanvas
        className="three-d-canvas"
        onSceneReady={(scene: Scene, _engine: Engine, canvas: HTMLCanvasElement) => {
          sceneRef.current = scene;
          scene.clearColor.set(0.86, 0.89, 0.9, 1);

          const camera = new ArcRotateCamera(
            'room-preview-camera',
            Tools.ToRadians(45),
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
            event.preventDefault();
            canvas.style.cursor = 'copy';
          };
          const handleDrop = (event: DragEvent) => {
            event.preventDefault();

            const currentLayout = layoutRef.current;
            const productModelId = event.dataTransfer?.getData('application/x-furnispace-product-id');

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
                setProductHighlight(scene, null);
                onProductSelectRef.current?.(null);
                return;
              }

              const productRoot = getProductRoot(scene, productId);
              setProductHighlight(scene, productId);
              onProductSelectRef.current?.(productId);

              if (pointerButton !== 0 && pointerButton !== 2) {
                pointerInfo.event.preventDefault();
                return;
              }

              dragProductRef.current = {
                hasMoved: false,
                productId,
                position: {
                  x: productRoot?.position.x ?? 0,
                  y: productRoot?.position.y ?? 0,
                  z: productRoot?.position.z ?? 0,
                },
              };
              camera.detachControl();
              canvas.style.cursor = 'grabbing';
              pointerInfo.event.preventDefault();
            }

            if (pointerInfo.type === PointerEventTypes.POINTERMOVE && dragProductRef.current) {
              const floorPick = scene.pick(
                scene.pointerX,
                scene.pointerY,
                (mesh) => mesh.metadata?.kind === 'floor',
              );
              const point = floorPick?.pickedPoint;

              if (!point) {
                return;
              }

              const nextPosition = {
                x: Number(point.x.toFixed(2)),
                y: dragProductRef.current.position.y,
                z: Number(point.z.toFixed(2)),
              };
              const root = getProductRoot(scene, dragProductRef.current.productId);

              if (!isProductPlacementInsideRoom(
                scene,
                dragProductRef.current.productId,
                nextPosition,
                currentLayout,
              )) {
                return;
              }

              if (root) {
                root.position = new Vector3(nextPosition.x, nextPosition.y, nextPosition.z);
              }

              dragProductRef.current = {
                ...dragProductRef.current,
                hasMoved: dragProductRef.current.hasMoved || !arePositionsEqual(nextPosition, dragProductRef.current.position),
                position: nextPosition,
              };
              canvas.style.cursor = 'grabbing';
              return;
            }

            if (pointerInfo.type === PointerEventTypes.POINTERMOVE && !dragProductRef.current) {
              const productPick = scene.pick(
                scene.pointerX,
                scene.pointerY,
                (mesh) => mesh.metadata?.source === 'product-preview',
              );
              canvas.style.cursor = productPick?.pickedMesh?.metadata?.productId ? 'grab' : '';
            }

            if (pointerInfo.type === PointerEventTypes.POINTERUP && dragProductRef.current) {
              if (dragProductRef.current.hasMoved) {
                onProductMoveRef.current?.(dragProductRef.current.productId, dragProductRef.current.position);
              }
              dragProductRef.current = null;
              camera.attachControl(canvas, true);
              canvas.style.cursor = 'grab';
            }
          });

          if (layout) {
            buildRoomPreview(scene, layout, floorMaterial, wallMaterial);
            syncProductPreviews(scene, placedProducts, layout, onProductMoveRef.current);
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
