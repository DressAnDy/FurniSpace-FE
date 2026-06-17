import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  AbstractMesh,
  ArcRotateCamera,
  Color3,
  Engine,
  PointerEventTypes,
  Scene,
  SceneLoader,
  StandardMaterial,
  Tools,
  TransformNode,
  Vector3,
} from 'babylonjs';
import 'babylonjs-loaders';

import { BabylonCanvas } from '@/features/ThreeD/components/BabylonCanvas';
import {
  createDefaultCamera,
  createDefaultLighting,
  createRoomGrid,
} from '@/features/ThreeD/utils/babylonSceneFactory';
import { splitModelUrl } from '@/features/ThreeD/utils/modelUrl';

import './ThreeDTestPage.css';

type ViewMode = '2d' | '3d';

type Vector3State = {
  x: number;
  y: number;
  z: number;
};

type SceneObjectState = {
  sceneObjectId: string;
  modelName: string;
  modelUrl: string;
  position: Vector3State;
  rotation: Vector3State;
  scale: Vector3State;
};

type ProductModel = {
  category: string;
  id: string;
  missingReferences?: string[];
  modelUrl: string;
  name: string;
  path?: string;
  sourceFolder?: string;
  thumbnailUrl: string;
};

type LoadedSceneObject = {
  meshes: AbstractMesh[];
  root: TransformNode;
};

type DragState = {
  objectId: string;
  y: number;
};

type MaterialSwatch = {
  color: string;
  id: string;
  name: string;
};

type RoomMaterialSwatches = {
  flooring: MaterialSwatch[];
  wallPaint: MaterialSwatch[];
};

const FALLBACK_PRODUCT_MODELS: ProductModel[] = [
  {
    category: 'Chair01',
    id: 'fallback-metal-stool',
    modelUrl: '/models/3d-test/chair01/metal_stool_02_4k.gltf',
    name: 'Metal Stool',
    sourceFolder: '/models/3d-test/chair01',
    thumbnailUrl: '/models/3d-test/thumbnails/placeholder-product.svg',
  },
];

const FALLBACK_ROOM_SWATCHES: RoomMaterialSwatches = {
  flooring: [
    { color: '#8B5A2B', id: 'oak-floor', name: 'Oak Floor' },
    { color: '#5C3A21', id: 'walnut-floor', name: 'Walnut Floor' },
    { color: '#A8A8A0', id: 'gray-tile', name: 'Gray Tile' },
  ],
  wallPaint: [
    { color: '#BFAE8A', id: 'balanced-tan', name: 'Balanced Tan' },
    { color: '#EFE9DD', id: 'warm-white', name: 'Warm White' },
    { color: '#B8B8B0', id: 'soft-gray', name: 'Soft Gray' },
  ],
};

function createSceneObjectId(index: number) {
  return `object-${String(index + 1).padStart(3, '0')}`;
}

function toVector3(value: Vector3State) {
  return new Vector3(value.x, value.y, value.z);
}

function applySceneClearColor(scene: Scene, color: string) {
  const nextColor = Color3.FromHexString(color);
  scene.clearColor.set(nextColor.r, nextColor.g, nextColor.b, 1);
}

export function ThreeDTestPage() {
  const cameraRef = useRef<ArcRotateCamera | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const loadedObjectsRef = useRef<Map<string, LoadedSceneObject>>(new Map());
  const sceneRef = useRef<Scene | null>(null);
  const [objects, setObjects] = useState<SceneObjectState[]>([]);
  const [productModels, setProductModels] = useState<ProductModel[]>(FALLBACK_PRODUCT_MODELS);
  const [productModelsStatus, setProductModelsStatus] = useState('Loading local model library...');
  const [roomSwatches, setRoomSwatches] = useState<RoomMaterialSwatches>(FALLBACK_ROOM_SWATCHES);
  const [selectedFlooringId, setSelectedFlooringId] = useState('oak-floor');
  const [selectedWallPaintId, setSelectedWallPaintId] = useState('warm-white');
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('3d');

  const selectedObject = useMemo(
    () => objects.find((object) => object.sceneObjectId === selectedObjectId) ?? null,
    [objects, selectedObjectId],
  );

  const groupedProductModels = useMemo(
    () =>
      productModels.reduce<Record<string, ProductModel[]>>((groups, model) => {
        const category = model.category || 'Uncategorized';

        return {
          ...groups,
          [category]: [...(groups[category] ?? []), model],
        };
      }, {}),
    [productModels],
  );

  const selectedFlooring = useMemo(
    () =>
      roomSwatches.flooring.find((swatch) => swatch.id === selectedFlooringId) ??
      roomSwatches.flooring[0],
    [roomSwatches.flooring, selectedFlooringId],
  );

  const selectedWallPaint = useMemo(
    () =>
      roomSwatches.wallPaint.find((swatch) => swatch.id === selectedWallPaintId) ??
      roomSwatches.wallPaint[0],
    [roomSwatches.wallPaint, selectedWallPaintId],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadProductManifest() {
      try {
        const response = await fetch('/models/3d-test/models.json', {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`Model manifest request failed with ${response.status}.`);
        }

        const manifest = await response.json() as {
          models?: ProductModel[];
        };
        const nextModels = manifest.models?.filter((model) => model.modelUrl || model.path) ?? [];

        if (!isMounted) {
          return;
        }

        if (!nextModels.length) {
          setProductModels(FALLBACK_PRODUCT_MODELS);
          setProductModelsStatus('No models found in manifest. Showing fallback model.');
          return;
        }

        setProductModels(nextModels);
        setProductModelsStatus(`${nextModels.length} local model${nextModels.length === 1 ? '' : 's'} found.`);
      } catch {
        if (!isMounted) {
          return;
        }

        setProductModels(FALLBACK_PRODUCT_MODELS);
        setProductModelsStatus('Model manifest not available. Showing fallback model.');
      }
    }

    void loadProductManifest();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadRoomSwatches() {
      try {
        const response = await fetch('/materials/wall-paint/swatches.json', {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`Material swatches request failed with ${response.status}.`);
        }

        const nextSwatches = await response.json() as RoomMaterialSwatches;

        if (!isMounted) {
          return;
        }

        setRoomSwatches({
          flooring: nextSwatches.flooring?.length ? nextSwatches.flooring : FALLBACK_ROOM_SWATCHES.flooring,
          wallPaint: nextSwatches.wallPaint?.length ? nextSwatches.wallPaint : FALLBACK_ROOM_SWATCHES.wallPaint,
        });
      } catch {
        if (isMounted) {
          setRoomSwatches(FALLBACK_ROOM_SWATCHES);
        }
      }
    }

    void loadRoomSwatches();

    return () => {
      isMounted = false;
    };
  }, []);

  const applyViewMode = useCallback((mode: ViewMode) => {
    const camera = cameraRef.current;

    if (!camera) {
      return;
    }

    if (mode === '2d') {
      camera.alpha = Tools.ToRadians(90);
      camera.beta = Tools.ToRadians(2);
      camera.radius = 8;
      camera.setTarget(Vector3.Zero());
      return;
    }

    camera.alpha = Tools.ToRadians(45);
    camera.beta = Tools.ToRadians(62);
    camera.radius = 7;
    camera.setTarget(Vector3.Zero());
  }, []);

  const setObjectHighlight = useCallback((sceneObjectId: string | null) => {
    loadedObjectsRef.current.forEach((loadedObject, objectId) => {
      const isSelected = objectId === sceneObjectId;

      loadedObject.meshes.forEach((mesh) => {
        mesh.renderOverlay = isSelected;
        mesh.overlayColor = Color3.FromHexString('#f2a541');
        mesh.overlayAlpha = 0.35;
        mesh.showBoundingBox = isSelected;
      });
    });
  }, []);

  const selectObject = useCallback(
    (sceneObjectId: string | null) => {
      setSelectedObjectId(sceneObjectId);
      setObjectHighlight(sceneObjectId);
    },
    [setObjectHighlight],
  );

  const applyRoomMaterials = useCallback(() => {
    const scene = sceneRef.current;

    if (!scene) {
      return;
    }

    const ground = scene.getMeshByName('furnispace-room-ground');
    const groundMaterial = ground?.material;

    if (groundMaterial instanceof StandardMaterial && selectedFlooring) {
      groundMaterial.diffuseColor = Color3.FromHexString(selectedFlooring.color);
    }

    if (selectedWallPaint) {
      applySceneClearColor(scene, selectedWallPaint.color);
    }
  }, [selectedFlooring, selectedWallPaint]);

  useEffect(() => {
    applyRoomMaterials();
  }, [applyRoomMaterials]);

  const applyObjectTransform = useCallback((object: SceneObjectState) => {
    const loadedObject = loadedObjectsRef.current.get(object.sceneObjectId);

    if (!loadedObject) {
      return;
    }

    loadedObject.root.position = toVector3(object.position);
    loadedObject.root.rotation = toVector3(object.rotation);
    loadedObject.root.scaling = toVector3(object.scale);
  }, []);

  const loadSceneObject = useCallback(
    async (scene: Scene, object: SceneObjectState) => {
      if (loadedObjectsRef.current.has(object.sceneObjectId)) {
        applyObjectTransform(object);
        return;
      }

      const { fileName, rootUrl } = splitModelUrl(object.modelUrl);
      const result = await SceneLoader.ImportMeshAsync('', rootUrl, fileName, scene);
      const root = new TransformNode(`${object.sceneObjectId}-root`, scene);

      result.meshes.forEach((mesh) => {
        if (!mesh.parent) {
          mesh.parent = root;
        }

        mesh.metadata = {
          ...(mesh.metadata ?? {}),
          modelName: object.modelName,
          sceneObjectId: object.sceneObjectId,
        };
      });

      loadedObjectsRef.current.set(object.sceneObjectId, {
        meshes: result.meshes,
        root,
      });
      applyObjectTransform(object);
      setObjectHighlight(selectedObjectId);
    },
    [applyObjectTransform, selectedObjectId, setObjectHighlight],
  );

  const handleSceneReady = useCallback(
    (scene: Scene, _engine: Engine, canvas: HTMLCanvasElement) => {
      sceneRef.current = scene;
      canvasRef.current = canvas;
      cameraRef.current = createDefaultCamera(scene, canvas);
      createDefaultLighting(scene);
      createRoomGrid(scene, 9, 9, {
        floorColor: selectedFlooring?.color,
      });
      applySceneClearColor(scene, selectedWallPaint?.color ?? '#EFE9DD');
      applyViewMode(viewMode);

      scene.onPointerObservable.add((pointerInfo) => {
        if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
          const sceneObjectId = pointerInfo.pickInfo?.pickedMesh?.metadata?.sceneObjectId as string | undefined;

          if (sceneObjectId) {
            const object = objects.find((currentObject) => currentObject.sceneObjectId === sceneObjectId);

            selectObject(sceneObjectId);
            dragStateRef.current = {
              objectId: sceneObjectId,
              y: object?.position.y ?? 0,
            };
            cameraRef.current?.detachControl();
            pointerInfo.event.preventDefault();
            return;
          }

          selectObject(null);
        }

        if (pointerInfo.type === PointerEventTypes.POINTERMOVE && dragStateRef.current) {
          const floorPick = scene.pick(
            scene.pointerX,
            scene.pointerY,
            (mesh) => mesh.metadata?.kind === 'floor',
          );
          const pickedPoint = floorPick?.pickedPoint;

          if (!pickedPoint) {
            return;
          }

          const { objectId, y } = dragStateRef.current;
          const nextPosition = {
            x: Number(pickedPoint.x.toFixed(3)),
            y,
            z: Number(pickedPoint.z.toFixed(3)),
          };
          const loadedObject = loadedObjectsRef.current.get(objectId);

          if (loadedObject) {
            loadedObject.root.position = toVector3(nextPosition);
          }

          setObjects((currentObjects) =>
            currentObjects.map((object) =>
              object.sceneObjectId === objectId
                ? {
                    ...object,
                    position: nextPosition,
                  }
                : object,
            ),
          );
          setSaveMessage('');
        }

        if (pointerInfo.type === PointerEventTypes.POINTERUP && dragStateRef.current) {
          dragStateRef.current = null;
          cameraRef.current?.attachControl(canvasRef.current, true);
        }
      });
    },
    [applyViewMode, objects, selectObject, selectedFlooring?.color, selectedWallPaint?.color, viewMode],
  );

  const handleAddModel = useCallback(
    (model: ProductModel) => {
      const nextIndex = objects.length;
      const sceneObject: SceneObjectState = {
        sceneObjectId: createSceneObjectId(nextIndex),
        modelName: model.name,
        modelUrl: model.modelUrl || model.path || '',
        position: {
          x: ((nextIndex % 3) - 1) * 0.9,
          y: 0,
          z: Math.floor(nextIndex / 3) * 0.9,
        },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      };

      setObjects((currentObjects) => [...currentObjects, sceneObject]);
      selectObject(sceneObject.sceneObjectId);
      setSaveMessage('');

      if (sceneRef.current) {
        void loadSceneObject(sceneRef.current, sceneObject).then(() => {
          setObjectHighlight(sceneObject.sceneObjectId);
        });
      }
    },
    [loadSceneObject, objects.length, selectObject, setObjectHighlight],
  );

  const handlePreviewModel = useCallback((model: ProductModel) => {
    window.open(model.modelUrl || model.path, '_blank', 'noopener,noreferrer');
  }, []);

  const handleResetScene = useCallback(() => {
    loadedObjectsRef.current.forEach((loadedObject) => {
      loadedObject.meshes.forEach((mesh) => mesh.dispose(false, true));
      loadedObject.root.dispose();
    });
    loadedObjectsRef.current.clear();
    setObjects([]);
    selectObject(null);
    setSaveMessage('');
  }, [selectObject]);

  const handleSaveScene = useCallback(() => {
    const sceneJson = {
      roomMaterials: {
        flooring: selectedFlooring,
        wallPaint: selectedWallPaint,
      },
      savedAt: new Date().toISOString(),
      objects,
    };

    console.log('FurniSpace 3D Lab scene JSON', sceneJson);
    setSaveMessage('Scene saved locally and logged to console.');
  }, [objects, selectedFlooring, selectedWallPaint]);

  const handleToggleViewMode = useCallback(() => {
    const nextMode: ViewMode = viewMode === '3d' ? '2d' : '3d';

    setViewMode(nextMode);
    applyViewMode(nextMode);
  }, [applyViewMode, viewMode]);

  return (
    <main className="three-d-lab-page">
      <header className="three-d-lab-header">
        <div>
          <h1>FurniSpace 3D Scene Editor</h1>
          <p>Prototype workspace for adding product models, selecting objects, switching views, and saving scene JSON.</p>
        </div>
        <RouterLink className="three-d-lab-link" to="/">
          Back home
        </RouterLink>
      </header>

      <section className="three-d-lab-shell">
        <aside className="three-d-library-panel">
          <div className="three-d-panel-heading">
            <span>Product Model Library</span>
            <strong>{productModels.length}</strong>
          </div>
          <p className="three-d-library-status">{productModelsStatus}</p>

          <div className="three-d-model-list">
            {Object.entries(groupedProductModels).map(([category, models]) => (
              <section className="three-d-model-group" key={category}>
                <h2>{category}</h2>
                {models.map((model) => {
                  const hasMissingReferences = Boolean(model.missingReferences?.length);

                  return (
                    <article className="three-d-model-card" key={model.id || model.modelUrl}>
                      <div className="three-d-model-thumb">
                        <img alt={model.name} src={model.thumbnailUrl} />
                      </div>
                      <div className="three-d-model-card-header">
                        <h3>{model.name}</h3>
                        <span className={hasMissingReferences ? 'is-warning' : 'is-ready'}>
                          {hasMissingReferences ? 'Missing files' : 'Ready'}
                        </span>
                      </div>
                      {hasMissingReferences && (
                        <ul className="three-d-missing-list">
                          {model.missingReferences?.map((reference) => (
                            <li key={reference}>{reference}</li>
                          ))}
                        </ul>
                      )}
                      <div className="three-d-model-actions">
                        <button
                          disabled={hasMissingReferences}
                          type="button"
                          onClick={() => handleAddModel(model)}
                        >
                          Add to Scene
                        </button>
                        <button type="button" onClick={() => handlePreviewModel(model)}>
                          Preview
                        </button>
                      </div>
                    </article>
                  );
                })}
              </section>
            ))}
          </div>
        </aside>

        <section className="three-d-workspace">
          <div className="three-d-toolbar">
            <div>
              <strong>{viewMode === '3d' ? '3D perspective' : '2D top view'}</strong>
              <span>{objects.length} object{objects.length === 1 ? '' : 's'} in scene</span>
            </div>
            <div className="three-d-toolbar-actions">
              <button type="button" onClick={handleSaveScene}>
                Save Scene
              </button>
              <button type="button" onClick={handleResetScene}>
                Reset Scene
              </button>
              <button type="button" onClick={handleToggleViewMode}>
                Toggle {viewMode === '3d' ? '2D' : '3D'}
              </button>
            </div>
          </div>

          <div className="three-d-scene-stage">
            <BabylonCanvas className="three-d-canvas" onSceneReady={handleSceneReady} />
            {!objects.length && (
              <div className="three-d-empty-state">
                Add a product model to start building the scene.
              </div>
            )}
          </div>

          {saveMessage && <div className="three-d-save-message">{saveMessage}</div>}
        </section>

        <aside className="three-d-properties-panel">
          <div className="three-d-panel-heading">
            <span>Room Materials</span>
          </div>

          <div className="three-d-material-section">
            <h2>Flooring</h2>
            <div className="three-d-swatch-grid">
              {roomSwatches.flooring.map((swatch) => (
                <button
                  className={swatch.id === selectedFlooringId ? 'is-selected' : ''}
                  key={swatch.id}
                  title={swatch.name}
                  type="button"
                  onClick={() => setSelectedFlooringId(swatch.id)}
                >
                  <span style={{ backgroundColor: swatch.color }} />
                  {swatch.name}
                </button>
              ))}
            </div>

            <h2>Wall Paint</h2>
            <div className="three-d-swatch-grid">
              {roomSwatches.wallPaint.map((swatch) => (
                <button
                  className={swatch.id === selectedWallPaintId ? 'is-selected' : ''}
                  key={swatch.id}
                  title={swatch.name}
                  type="button"
                  onClick={() => setSelectedWallPaintId(swatch.id)}
                >
                  <span style={{ backgroundColor: swatch.color }} />
                  {swatch.name}
                </button>
              ))}
            </div>
          </div>

          <div className="three-d-panel-heading">
            <span>Selected Object</span>
          </div>

          {selectedObject ? (
            <div className="three-d-property-content">
              <h2>{selectedObject.modelName}</h2>
              <div className="three-d-status-pill">Selected</div>
              <dl className="three-d-object-info">
                <div>
                  <dt>Object ID</dt>
                  <dd>{selectedObject.sceneObjectId}</dd>
                </div>
                <div>
                  <dt>Position</dt>
                  <dd>
                    X {selectedObject.position.x.toFixed(2)} / Y {selectedObject.position.y.toFixed(2)} / Z{' '}
                    {selectedObject.position.z.toFixed(2)}
                  </dd>
                </div>
              </dl>
              <p>Drag the selected object across the grid floor to reposition it.</p>
            </div>
          ) : (
            <p className="three-d-panel-empty">Click an object in the scene to inspect it.</p>
          )}
        </aside>
      </section>
    </main>
  );
}
