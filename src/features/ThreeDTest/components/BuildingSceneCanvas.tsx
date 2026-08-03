import { useCallback, useEffect, useRef } from 'react';
import {
  AbstractMesh,
  ArcRotateCamera,
  AssetContainer,
  Color3,
  Engine,
  Mesh,
  PointerEventTypes,
  Scene,
  SceneLoader,
  TransformNode,
  Vector3,
} from 'babylonjs';
import 'babylonjs-loaders';

import { BabylonCanvas } from '@/features/ThreeD/components/BabylonCanvas';
import type {
  BuildingLevelVisibility,
  BuildingProductModel,
  BuildingTestScene,
  PlacedBuildingProduct,
  Vector3State,
} from '@/features/ThreeDTest/schemas/buildingScene.types';
import {
  applyLevelVisibility,
  buildBuildingEnvironment,
  createBuildingTestCamera,
  createBuildingTestLighting,
  getSurfaceFromPickedMesh,
} from '@/features/ThreeDTest/utils/buildingTestSceneFactory';
import {
  getLastValidBuildingProductPosition,
  isValidBuildingProductPosition,
} from '@/features/ThreeDTest/utils/buildingProductPlacementRules';
import { getModelLoadErrorMessage } from '@/features/ThreeD/utils/modelUrl';

const PRODUCT_DRAG_TYPE = 'application/x-furnispace-building-product-id';
const modelContainerCache = new WeakMap<Scene, Map<string, Promise<AssetContainer>>>();

export type BuildingSceneCanvasProps = {
  activeLevel: BuildingLevelVisibility;
  modelsById: Map<string, BuildingProductModel>;
  onProductDrop: (model: BuildingProductModel, position: Vector3State, surfaceId: string, levelId: BuildingLevelVisibility) => void;
  onProductLoadError?: (productId: string, message: string) => void;
  onProductMove: (sceneObjectId: string, position: Vector3State, surfaceId: string, levelId: BuildingLevelVisibility) => void;
  onProductSelect: (sceneObjectId: string | null) => void;
  placedProducts: PlacedBuildingProduct[];
  sceneData: BuildingTestScene;
  selectedProductId: string | null;
};

type DragState = {
  hasMoved: boolean;
  lastValidPosition: Vector3State;
  levelId: BuildingLevelVisibility;
  sceneObjectId: string;
  surfaceId: string;
};

function getSceneCache(scene: Scene) {
  let cache = modelContainerCache.get(scene);

  if (!cache) {
    cache = new Map<string, Promise<AssetContainer>>();
    modelContainerCache.set(scene, cache);
  }

  return cache;
}

function splitModelUrl(url: string) {
  const lastSlash = url.lastIndexOf('/') + 1;

  return {
    fileName: url.substring(lastSlash),
    rootUrl: url.substring(0, lastSlash),
  };
}

function loadModelContainer(scene: Scene, modelUrl: string) {
  const cache = getSceneCache(scene);
  const cached = cache.get(modelUrl);

  if (cached) {
    return cached;
  }

  const { fileName, rootUrl } = splitModelUrl(modelUrl);
  const promise = SceneLoader.LoadAssetContainerAsync(rootUrl, fileName, scene).catch((error) => {
    cache.delete(modelUrl);
    throw error;
  });

  cache.set(modelUrl, promise);

  return promise;
}

function getProductRoot(scene: Scene, sceneObjectId: string) {
  return scene.transformNodes.find((node) => node.metadata?.sceneObjectId === sceneObjectId) as TransformNode | undefined;
}

function getProductRoots(scene: Scene, sceneObjectId: string) {
  return scene.transformNodes.filter((node) => node.metadata?.source === 'building-test-product' && node.metadata?.sceneObjectId === sceneObjectId) as TransformNode[];
}

function getSceneProductLoadLocks(scene: Scene) {
  if (!scene.metadata?.buildingProductLoadLocks) {
    scene.metadata = {
      ...(scene.metadata ?? {}),
      buildingProductLoadLocks: new Set<string>(),
    };
  }

  return scene.metadata.buildingProductLoadLocks as Set<string>;
}

function setRootPosition(root: TransformNode, position: Vector3State) {
  const groundOffset = Number(root.metadata?.groundOffsetY ?? 0);
  root.position = new Vector3(position.x, position.y + groundOffset, position.z);
}

function getAnchorPosition(root: TransformNode): Vector3State {
  const groundOffset = Number(root.metadata?.groundOffsetY ?? 0);

  return {
    x: Number(root.position.x.toFixed(2)),
    y: Number((root.position.y - groundOffset).toFixed(2)),
    z: Number(root.position.z.toFixed(2)),
  };
}

function getProductMeshes(scene: Scene, sceneObjectId: string) {
  return scene.meshes.filter((mesh) => mesh.metadata?.source === 'building-test-product' && mesh.metadata?.sceneObjectId === sceneObjectId);
}

function calculateGroundOffset(scene: Scene, root: TransformNode, sceneObjectId: string) {
  const meshes = getProductMeshes(scene, sceneObjectId).filter((mesh) => mesh.getTotalVertices() > 0);

  if (!meshes.length) {
    return 0;
  }

  meshes.forEach((mesh) => mesh.computeWorldMatrix(true));
  const minY = Math.min(...meshes.map((mesh) => mesh.getBoundingInfo().boundingBox.minimumWorld.y));

  return root.position.y - minY;
}

function arePositionsEqual(first: Vector3State, second: Vector3State) {
  return first.x === second.x && first.y === second.y && first.z === second.z;
}

async function loadProduct(scene: Scene, product: PlacedBuildingProduct) {
  const existingRoot = getProductRoot(scene, product.sceneObjectId);

  if (existingRoot) {
    existingRoot.rotation = new Vector3(product.rotation.x, product.rotation.y, product.rotation.z);
    existingRoot.scaling = new Vector3(product.scale?.x ?? 1, product.scale?.y ?? 1, product.scale?.z ?? 1);
    existingRoot.metadata = {
      ...(existingRoot.metadata ?? {}),
      levelId: product.levelId,
      surfaceId: product.surfaceId,
    };
    setRootPosition(existingRoot, product.position);
    return;
  }

  const container = await loadModelContainer(scene, product.modelUrl);
  const result = container.instantiateModelsToScene((sourceName) => `building-product-${product.sceneObjectId}-${sourceName}`, false);
  const root = new TransformNode(`building-product-root-${product.sceneObjectId}`, scene);
  root.metadata = {
    levelId: product.levelId,
    sceneObjectId: product.sceneObjectId,
    source: 'building-test-product',
    surfaceId: product.surfaceId,
  };
  root.position = new Vector3(product.position.x, product.position.y, product.position.z);
  root.rotation = new Vector3(product.rotation.x, product.rotation.y, product.rotation.z);
  root.scaling = new Vector3(product.scale?.x ?? 1, product.scale?.y ?? 1, product.scale?.z ?? 1);

  result.rootNodes.forEach((node) => {
    if (!node.parent) {
      node.parent = root;
    }
  });

  root.getChildMeshes(false).forEach((mesh) => {
    mesh.metadata = {
      ...(mesh.metadata ?? {}),
      levelId: product.levelId,
      sceneObjectId: product.sceneObjectId,
      source: 'building-test-product',
      surfaceId: product.surfaceId,
    };
  });

  root.metadata = {
    ...root.metadata,
    groundOffsetY: calculateGroundOffset(scene, root, product.sceneObjectId),
  };
  setRootPosition(root, product.position);
}

function removeMissingProducts(scene: Scene, products: PlacedBuildingProduct[]) {
  const nextIds = new Set(products.map((product) => product.sceneObjectId));

  scene.transformNodes
    .filter((node) => node.metadata?.source === 'building-test-product' && !nextIds.has(node.metadata.sceneObjectId))
    .forEach((node) => node.dispose(false, true));
}

function removeDuplicateProductRoots(scene: Scene, sceneObjectId: string) {
  const roots = getProductRoots(scene, sceneObjectId);
  const primaryRoot = roots[0];

  roots.slice(1).forEach((duplicateRoot) => duplicateRoot.dispose(false, true));

  return primaryRoot;
}

function syncProducts(
  scene: Scene,
  products: PlacedBuildingProduct[],
  onProductLoadError?: (productId: string, message: string) => void,
) {
  removeMissingProducts(scene, products);

  products.forEach((product) => {
    const existingRoot = removeDuplicateProductRoots(scene, product.sceneObjectId);

    if (existingRoot) {
      void loadProduct(scene, product).catch((error) => {
        onProductLoadError?.(product.sceneObjectId, getModelLoadErrorMessage(error, product.modelUrl));
      });
      return;
    }

    const loadLocks = getSceneProductLoadLocks(scene);

    if (loadLocks.has(product.sceneObjectId)) {
      return;
    }

    loadLocks.add(product.sceneObjectId);

    void loadProduct(scene, product).catch((error) => {
      onProductLoadError?.(product.sceneObjectId, getModelLoadErrorMessage(error, product.modelUrl));
    }).finally(() => {
      loadLocks.delete(product.sceneObjectId);
      removeDuplicateProductRoots(scene, product.sceneObjectId);
    });
  });
}

function setProductHighlight(scene: Scene, selectedProductId: string | null) {
  scene.meshes
    .filter((mesh) => mesh.metadata?.source === 'building-test-product')
    .forEach((mesh) => {
      mesh.renderOverlay = false;
      mesh.overlayColor = Color3.FromHexString('#35d6ff');
      mesh.overlayAlpha = 0;
      mesh.showBoundingBox = mesh.metadata?.sceneObjectId === selectedProductId;
    });
}

function applyProductVisibility(scene: Scene, activeLevel: BuildingLevelVisibility) {
  scene.transformNodes
    .filter((node) => node.metadata?.source === 'building-test-product')
    .forEach((node) => {
      const levelId = node.metadata?.levelId as BuildingLevelVisibility;
      const product = placedProductFromSceneNode(scene, node.metadata?.sceneObjectId as string | undefined);
      const isVisible = product?.visible ?? true;

      node.setEnabled(isVisible && (activeLevel === 'all' || levelId === activeLevel || levelId === 'site'));
    });
}

function placedProductFromSceneNode(scene: Scene, sceneObjectId?: string) {
  return (scene.metadata?.placedProducts ?? []).find(
    (product: PlacedBuildingProduct) => product.sceneObjectId === sceneObjectId,
  ) as PlacedBuildingProduct | undefined;
}

function pickPlacementSurface(scene: Scene, x: number, y: number) {
  const pick = scene.pick(
    x,
    y,
    (mesh: AbstractMesh) => mesh.metadata?.kind === 'placement-surface' && mesh.isVisible && mesh.isPickable,
  );

  if (!pick?.pickedPoint) {
    return null;
  }

  const surface = getSurfaceFromPickedMesh(pick.pickedMesh as Mesh | null | undefined, pick.pickedPoint.y);

  if (!surface) {
    return null;
  }

  return {
    point: pick.pickedPoint,
    surface,
  };
}

export function BuildingSceneCanvas({
  activeLevel,
  modelsById,
  onProductDrop,
  onProductLoadError,
  onProductMove,
  onProductSelect,
  placedProducts,
  sceneData,
  selectedProductId,
}: BuildingSceneCanvasProps) {
  const cameraRef = useRef<ArcRotateCamera | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const activeLevelRef = useRef(activeLevel);
  const modelsByIdRef = useRef(modelsById);
  const placedProductsRef = useRef(placedProducts);

  useEffect(() => {
    activeLevelRef.current = activeLevel;
    const scene = sceneRef.current;

    if (scene) {
      applyLevelVisibility(scene, activeLevel);
      applyProductVisibility(scene, activeLevel);
    }
  }, [activeLevel]);

  useEffect(() => {
    modelsByIdRef.current = modelsById;
  }, [modelsById]);

  useEffect(() => {
    placedProductsRef.current = placedProducts;
    const scene = sceneRef.current;

    if (!scene) {
      return;
    }

    syncProducts(scene, placedProducts, onProductLoadError);
    scene.metadata = {
      ...(scene.metadata ?? {}),
      placedProducts,
    };
    applyProductVisibility(scene, activeLevelRef.current);
  }, [onProductLoadError, placedProducts]);

  useEffect(() => {
    const scene = sceneRef.current;

    if (scene) {
      setProductHighlight(scene, selectedProductId);
    }
  }, [selectedProductId]);

  const rebuildEnvironment = useCallback((scene: Scene) => {
    buildBuildingEnvironment(scene, sceneData, activeLevelRef.current);
    applyProductVisibility(scene, activeLevelRef.current);
  }, [sceneData]);

  useEffect(() => {
    const scene = sceneRef.current;

    if (!scene) {
      return;
    }

    rebuildEnvironment(scene);
  }, [rebuildEnvironment]);

  return (
    <div className="building-test-canvas-shell">
      <BabylonCanvas
        className="building-test-canvas"
        onSceneReady={(scene: Scene, _engine: Engine, canvas: HTMLCanvasElement) => {
          sceneRef.current = scene;
          scene.clearColor.set(0.84, 0.88, 0.9, 1);
          cameraRef.current = createBuildingTestCamera(scene, canvas, sceneData);
          createBuildingTestLighting(scene);
          rebuildEnvironment(scene);
          scene.metadata = {
            ...(scene.metadata ?? {}),
            placedProducts: placedProductsRef.current,
          };
          syncProducts(scene, placedProductsRef.current, onProductLoadError);

          const handleDragOver = (event: DragEvent) => {
            if (!Array.from(event.dataTransfer?.types ?? []).includes(PRODUCT_DRAG_TYPE)) {
              return;
            }

            event.preventDefault();
            canvas.style.cursor = 'copy';
          };
          const handleDrop = (event: DragEvent) => {
            if (!Array.from(event.dataTransfer?.types ?? []).includes(PRODUCT_DRAG_TYPE)) {
              return;
            }

            event.preventDefault();
            const modelId = event.dataTransfer?.getData(PRODUCT_DRAG_TYPE);
            const model = modelId ? modelsByIdRef.current.get(modelId) : null;

            if (!model) {
              return;
            }

            const bounds = canvas.getBoundingClientRect();
            const surfacePick = pickPlacementSurface(scene, event.clientX - bounds.left, event.clientY - bounds.top);

            if (!surfacePick) {
              return;
            }

            onProductDrop(
              model,
              {
                x: Number(surfacePick.point.x.toFixed(2)),
                y: Number(surfacePick.surface.elevation.toFixed(2)),
                z: Number(surfacePick.point.z.toFixed(2)),
              },
              surfacePick.surface.id,
              surfacePick.surface.levelId,
            );
            canvas.style.cursor = '';
          };

          canvas.addEventListener('dragover', handleDragOver);
          canvas.addEventListener('drop', handleDrop);
          canvas.addEventListener('dragleave', () => {
            canvas.style.cursor = '';
          });

          scene.onDisposeObservable.addOnce(() => {
            canvas.removeEventListener('dragover', handleDragOver);
            canvas.removeEventListener('drop', handleDrop);
          });

          scene.onPointerObservable.add((pointerInfo) => {
            if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
              const sceneObjectId = pointerInfo.pickInfo?.pickedMesh?.metadata?.sceneObjectId as string | undefined;

              if (!sceneObjectId) {
                onProductSelect(null);
                return;
              }

              const root = getProductRoot(scene, sceneObjectId);
              const product = placedProductsRef.current.find((candidate) => candidate.sceneObjectId === sceneObjectId);
              const levelId = root?.metadata?.levelId as BuildingLevelVisibility | undefined;
              const surfaceId = root?.metadata?.surfaceId as string | undefined;

              onProductSelect(sceneObjectId);

              if (!root || !levelId || !surfaceId || pointerInfo.event.button !== 0 || product?.locked) {
                return;
              }

              dragRef.current = {
                hasMoved: false,
                lastValidPosition: getAnchorPosition(root),
                levelId,
                sceneObjectId,
                surfaceId,
              };
              cameraRef.current?.detachControl();
              canvas.style.cursor = 'grabbing';
              pointerInfo.event.preventDefault();
            }

            if (pointerInfo.type === PointerEventTypes.POINTERMOVE && dragRef.current) {
              const surfacePick = pickPlacementSurface(scene, scene.pointerX, scene.pointerY);
              const drag = dragRef.current;

              if (!surfacePick || surfacePick.surface.levelId !== drag.levelId) {
                return;
              }

              const root = getProductRoot(scene, drag.sceneObjectId);
              const product = placedProductsRef.current.find((candidate) => candidate.sceneObjectId === drag.sceneObjectId);

              if (!root) {
                return;
              }

              const desiredPosition = {
                x: Number(surfacePick.point.x.toFixed(2)),
                y: Number(surfacePick.surface.elevation.toFixed(2)),
                z: Number(surfacePick.point.z.toFixed(2)),
              };
              const rules = product?.placementRules ?? {
                boundaryEnabled: true,
                collisionEnabled: true,
                snapToSurface: true,
              };
              const shouldUseRules = rules.boundaryEnabled || rules.collisionEnabled;
              const nextPosition = shouldUseRules && !isValidBuildingProductPosition({
                boundaryEnabled: rules.boundaryEnabled,
                collisionEnabled: rules.collisionEnabled,
                position: desiredPosition,
                productId: drag.sceneObjectId,
                productRoot: root,
                scene,
                surface: surfacePick.surface,
              })
                ? getLastValidBuildingProductPosition({
                    boundaryEnabled: rules.boundaryEnabled,
                    collisionEnabled: rules.collisionEnabled,
                    position: desiredPosition,
                    previousPosition: drag.lastValidPosition,
                    productId: drag.sceneObjectId,
                    productRoot: root,
                    scene,
                    surface: surfacePick.surface,
                  })
                : desiredPosition;

              setRootPosition(root, nextPosition);
              dragRef.current = {
                ...drag,
                hasMoved: drag.hasMoved || !arePositionsEqual(nextPosition, drag.lastValidPosition),
                lastValidPosition: nextPosition,
                surfaceId: surfacePick.surface.id,
              };
            }

            if (pointerInfo.type === PointerEventTypes.POINTERMOVE && !dragRef.current) {
              const productId = scene.pick(
                scene.pointerX,
                scene.pointerY,
                (mesh) => mesh.metadata?.source === 'building-test-product',
              )?.pickedMesh?.metadata?.sceneObjectId;

              canvas.style.cursor = productId ? 'grab' : '';
            }

            if (pointerInfo.type === PointerEventTypes.POINTERUP && dragRef.current) {
              const drag = dragRef.current;
              const root = getProductRoot(scene, drag.sceneObjectId);

              if (root && drag.hasMoved) {
                const position = getAnchorPosition(root);
                onProductMove(drag.sceneObjectId, position, drag.surfaceId, drag.levelId);
              }

              dragRef.current = null;
              cameraRef.current?.attachControl(canvas, true);
              canvas.style.cursor = 'grab';
            }
          });
        }}
      />
    </div>
  );
}

export { PRODUCT_DRAG_TYPE };
