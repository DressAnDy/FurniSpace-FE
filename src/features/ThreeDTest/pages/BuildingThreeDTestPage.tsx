import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { IconBox, IconBuilding, IconCategory, IconPalette, IconRotateClockwise, IconSearch, IconTrash, IconX } from '@tabler/icons-react';
import { Link as RouterLink } from 'react-router-dom';

import { BuildingSceneCanvas, PRODUCT_DRAG_TYPE } from '@/features/ThreeDTest/components';
import { useBuildingTestSceneState } from '@/features/ThreeDTest/hooks';
import type { ProductPlacementMode } from '@/features/ThreeD/components/RoomPreview3D';
import type {
  BuildingLevel,
  BuildingLevelVisibility,
  BuildingProductModel,
  PlacedBuildingProduct,
  Vector3State,
} from '@/features/ThreeDTest/schemas/buildingScene.types';
import { getLevelCenter } from '@/features/ThreeDTest/utils/buildingTestSceneFactory';
import { getProductById, getProductServiceResultMessage, type CatalogFileDto, type ProductDetailDto, type ProductListItemDto, type ProductVersionDto } from '@/services/api';
import { productQueryKeys, useCategoryList, useProductList } from '@/services/queries';

import './BuildingThreeDTestPage.css';

const EMPTY_THUMBNAIL = '';
const API_PRODUCT_DEFAULT_SCALE = 2.6;
const DETAIL_BATCH_SIZE = 12;
type BuildingDesignPanel = 'products' | 'materials' | 'selection';
const levelOptions: Array<{ label: string; value: BuildingLevelVisibility }> = [
  { label: 'All', value: 'all' },
  { label: 'Yard', value: 'site' },
  { label: 'Floor 1', value: 'ground' },
  { label: 'Floor 2', value: 'level-2' },
];
const placementModes: Array<{ label: string; value: ProductPlacementMode }> = [
  { label: 'Floor', value: 'FLOOR' },
  { label: 'On Object', value: 'ON_OBJECT' },
  { label: 'Wall Mounted', value: 'WALL_MOUNTED' },
  { label: 'Custom Height', value: 'CUSTOM_HEIGHT' },
];

function getCatalogModelFile(files: CatalogFileDto[] | undefined) {
  return files?.find((file) => file.fileType === 'MODEL_3D') ?? null;
}

function getVersionThumbnail(product: ProductListItemDto, version: ProductVersionDto) {
  return version.thumbnail?.fileUrl ??
    product.thumbnail?.fileUrl ??
    version.files?.find((file) => file.fileType === 'PRODUCT_PREVIEW')?.fileUrl ??
    EMPTY_THUMBNAIL;
}

function mapVersionToModel(product: ProductListItemDto, version: ProductVersionDto): BuildingProductModel | null {
  const modelFile = getCatalogModelFile(version.files);

  if (!modelFile?.fileUrl) {
    return null;
  }

  return {
    categoryName: product.categoryName,
    color: version.color,
    depth: version.depth,
    fileId: modelFile.fileId,
    height: version.height,
    id: `building-test-${version.productVersionId}`,
    categoryId: product.categoryId,
    material: version.material,
    modelUrl: modelFile.fileUrl,
    name: `${product.productName} - ${version.versionName}`,
    productId: product.productId,
    productVersionId: version.productVersionId,
    scale: { x: API_PRODUCT_DEFAULT_SCALE, y: API_PRODUCT_DEFAULT_SCALE, z: API_PRODUCT_DEFAULT_SCALE },
    thumbnailUrl: getVersionThumbnail(product, version),
    width: version.width,
  };
}

function mapProductToModels(product: ProductDetailDto | ProductListItemDto) {
  const versions = 'versions' in product ? product.versions : product.defaultVersion ? [product.defaultVersion] : [];

  return versions
    .map((version) => mapVersionToModel(product, version))
    .filter((model): model is BuildingProductModel => Boolean(model));
}

function createSceneObjectId(products: PlacedBuildingProduct[]) {
  const existingIds = new Set(products.map((product) => product.sceneObjectId));
  let id = `building-object-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`;

  while (existingIds.has(id)) {
    id = `building-object-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`;
  }

  return id;
}

function rotateVectorY(rotation: Vector3State, radians: number) {
  return {
    ...rotation,
    y: Number((rotation.y + radians).toFixed(4)),
  };
}

function getLevelFallbackSurface(sceneData: ReturnType<typeof useBuildingTestSceneState>['sceneData'], activeLevel: BuildingLevelVisibility) {
  const preferredLevelId = activeLevel === 'level-2' ? 'level-2' : 'ground';
  const level = sceneData.building.levels.find((candidate) => candidate.id === preferredLevelId) as BuildingLevel | undefined;

  if (!level) {
    return null;
  }

  const center = getLevelCenter(sceneData, level);

  return {
    elevation: level.elevation,
    id: `${level.id}-layout-floor`,
    levelId: level.id as BuildingLevelVisibility,
    position: {
      x: center.x,
      y: level.elevation,
      z: center.z,
    },
  };
}

export function BuildingThreeDTestPage() {
  const { resetSceneData, sceneData } = useBuildingTestSceneState();
  const categoriesQuery = useCategoryList({ page: 1, limit: 100 });
  const productListQuery = useProductList({ page: 1, limit: 48 });
  const [detailLimit, setDetailLimit] = useState(DETAIL_BATCH_SIZE);
  const detailProducts = useMemo(
    () => (productListQuery.data?.items ?? []).slice(0, detailLimit),
    [detailLimit, productListQuery.data?.items],
  );
  const productDetailQueries = useQueries({
    queries: detailProducts.map((product) => ({
      enabled: Boolean(product.productId),
      queryFn: () => getProductById(product.productId),
      queryKey: productQueryKeys.detail(product.productId),
      staleTime: 5 * 60 * 1000,
    })),
  });
  const [activeLevel, setActiveLevel] = useState<BuildingLevelVisibility>('all');
  const [designPanel, setDesignPanel] = useState<BuildingDesignPanel>('products');
  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [placedProducts, setPlacedProducts] = useState<PlacedBuildingProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const availableModels = useMemo(() => {
    const models = new Map<string, BuildingProductModel>();

    (productListQuery.data?.items ?? []).forEach((product) => {
      mapProductToModels(product).forEach((model) => {
        models.set(model.id, model);
      });
    });

    productDetailQueries.forEach((query) => {
      if (!query.data) {
        return;
      }

      mapProductToModels(query.data).forEach((model) => {
        models.set(model.id, model);
      });
    });

    return [...models.values()];
  }, [productDetailQueries, productListQuery.data?.items]);

  const modelsById = useMemo(
    () => new Map(availableModels.map((model) => [model.id, model])),
    [availableModels],
  );

  const filteredModels = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const categoryFilteredModels = selectedCategoryId
      ? availableModels.filter((model) => model.categoryId === selectedCategoryId)
      : availableModels;

    return normalizedSearch
      ? categoryFilteredModels.filter((model) =>
          [
            model.name,
            model.categoryName ?? '',
            model.material ?? '',
            model.color ?? '',
          ].some((value) => value.toLowerCase().includes(normalizedSearch)),
        )
      : categoryFilteredModels;
  }, [availableModels, search, selectedCategoryId]);

  const categoryCards = useMemo(() => {
    const counts = new Map<string, number>();

    availableModels.forEach((model) => {
      if (model.categoryId) {
        counts.set(model.categoryId, (counts.get(model.categoryId) ?? 0) + 1);
      }
    });

    return (categoriesQuery.data?.items ?? [])
      .map((category) => ({
        category,
        count: counts.get(category.categoryId) ?? 0,
      }))
      .filter((item) => item.count > 0);
  }, [availableModels, categoriesQuery.data?.items]);

  const selectedProduct = useMemo(
    () => placedProducts.find((product) => product.sceneObjectId === selectedProductId) ?? null,
    [placedProducts, selectedProductId],
  );

  function addProductToScene(
    model: BuildingProductModel,
    position: Vector3State,
    surfaceId: string,
    levelId: BuildingLevelVisibility,
  ) {
    const nextProduct: PlacedBuildingProduct = {
      ...model,
      dimensionsSnapshot: {
        depth: model.depth ?? null,
        height: model.height ?? null,
        unit: 'm',
        width: model.width ?? null,
      },
      heightOffset: position.y,
      levelId,
      modelSnapshot: {
        format: model.modelUrl.split('?')[0].split('.').pop()?.toUpperCase() ?? null,
        modelFileId: model.fileId ?? null,
        modelUrlSnapshot: model.modelUrl,
      },
      mountedWallId: null,
      placementMode: 'FLOOR',
      placementRules: {
        boundaryEnabled: true,
        collisionEnabled: true,
        snapToSurface: true,
      },
      position,
      rotation: { x: 0, y: 0, z: 0 },
      scale: model.scale ?? { x: API_PRODUCT_DEFAULT_SCALE, y: API_PRODUCT_DEFAULT_SCALE, z: API_PRODUCT_DEFAULT_SCALE },
      sceneObjectId: createSceneObjectId(placedProducts),
      surfaceId,
      surfaceType: levelId === 'site' ? 'YARD' : 'FLOOR',
      supportObjectId: null,
      visible: true,
      visualSnapshot: {
        color: model.color ?? null,
        finish: null,
        material: model.material ?? null,
      },
    };

    setPlacedProducts((currentProducts) => [...currentProducts, nextProduct]);
    setSelectedProductId(nextProduct.sceneObjectId);
    setMessage(`${model.name} added to ${levelOptions.find((level) => level.value === levelId)?.label ?? levelId}.`);
  }

  function quickAddProduct(model: BuildingProductModel) {
    const targetSurface = sceneData.surfaces.find((surface) => activeLevel !== 'all' && surface.levelId === activeLevel) ??
      sceneData.surfaces.find((surface) => surface.id === 'ground-floor-surface') ??
      getLevelFallbackSurface(sceneData, activeLevel);

    if (!targetSurface) {
      return;
    }

    addProductToScene(
      model,
      {
        x: targetSurface.position.x,
        y: targetSurface.elevation,
        z: targetSurface.position.z,
      },
      targetSurface.id,
      targetSurface.levelId,
    );
  }

  function moveProduct(
    sceneObjectId: string,
    position: Vector3State,
    surfaceId: string,
    levelId: BuildingLevelVisibility,
  ) {
    setPlacedProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.sceneObjectId === sceneObjectId
          ? {
              ...product,
              levelId,
              position,
              surfaceId,
            }
          : product,
      ),
    );
  }

  function updateSelectedProduct(changes: Partial<PlacedBuildingProduct>) {
    if (!selectedProductId) {
      return;
    }

    setPlacedProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.sceneObjectId === selectedProductId
          ? {
              ...product,
              ...changes,
              placementRules: {
                ...(product.placementRules ?? {
                  boundaryEnabled: true,
                  collisionEnabled: true,
                  snapToSurface: true,
                }),
                ...(changes.placementRules ?? {}),
              },
            }
          : product,
      ),
    );
  }

  function rotateSelectedProduct() {
    if (!selectedProductId) {
      return;
    }

    setPlacedProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.sceneObjectId === selectedProductId
          ? { ...product, rotation: rotateVectorY(product.rotation, Math.PI / 4) }
          : product,
      ),
    );
  }

  function deleteSelectedProduct() {
    if (!selectedProductId) {
      return;
    }

    setPlacedProducts((currentProducts) => currentProducts.filter((product) => product.sceneObjectId !== selectedProductId));
    setSelectedProductId(null);
  }

  function resetScene() {
    resetSceneData();
    setPlacedProducts([]);
    setSelectedProductId(null);
    setMessage('Prototype scene reset.');
  }

  return (
    <main className="building-test-page">
      <header className="building-test-header">
        <div>
          <span><IconBuilding size={16} /> Building 3D Test</span>
          <h1>Two-floor campus prototype</h1>
        </div>
        <nav>
          <RouterLink to="/3d-building-test/blueprint">2D Blueprint</RouterLink>
          <RouterLink to="/3d-lab">Room Planner</RouterLink>
          <button type="button" onClick={resetScene}>Reset</button>
        </nav>
      </header>

      <section className="building-test-shell">
        <aside className="building-test-sidebar">
          <section className="building-test-panel">
            <div className="building-test-panel-heading">
              <strong>Scene Levels</strong>
              <span>{placedProducts.length} object(s)</span>
            </div>
            <div className="building-level-tabs">
              {levelOptions.map((level) => (
                <button
                  className={activeLevel === level.value ? 'is-active' : ''}
                  key={level.value}
                  type="button"
                  onClick={() => setActiveLevel(level.value)}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </section>

          <section className="building-test-panel">
            <div className="building-test-panel-heading">
              <strong>Tools</strong>
              <span>{designPanel}</span>
            </div>
            <div className="building-level-tabs">
              <button className={designPanel === 'products' ? 'is-active' : ''} type="button" onClick={() => setDesignPanel('products')}>
                <IconCategory size={15} /> Products
              </button>
              <button className={designPanel === 'materials' ? 'is-active' : ''} type="button" onClick={() => setDesignPanel('materials')}>
                <IconPalette size={15} /> Materials
              </button>
              <button className={designPanel === 'selection' ? 'is-active' : ''} type="button" onClick={() => setDesignPanel('selection')}>
                <IconBox size={15} /> Selection
              </button>
            </div>
          </section>

          {designPanel === 'products' && (
          <section className="building-test-panel">
            <div className="building-test-panel-heading">
              <strong>Products</strong>
              <span>{filteredModels.length} ready model(s)</span>
            </div>
            <label className="building-product-search">
              <IconSearch size={16} />
              <input
                placeholder="Search 3D models"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && (
                <button aria-label="Clear search" type="button" onClick={() => setSearch('')}>
                  <IconX size={15} />
                </button>
              )}
            </label>

            <div className="building-category-list">
              <button
                className={!selectedCategoryId ? 'is-selected' : ''}
                type="button"
                onClick={() => setSelectedCategoryId(null)}
              >
                All Categories
              </button>
              {categoryCards.map((item) => (
                <button
                  className={selectedCategoryId === item.category.categoryId ? 'is-selected' : ''}
                  key={item.category.categoryId}
                  type="button"
                  onClick={() => setSelectedCategoryId(item.category.categoryId)}
                >
                  {item.category.categoryName}
                  <span>{item.count}</span>
                </button>
              ))}
            </div>

            {productListQuery.isLoading || productDetailQueries.some((query) => query.isLoading) ? (
              <div className="building-test-status">Loading product models...</div>
            ) : null}
            {productListQuery.isError ? (
              <div className="building-test-status is-error">{getProductServiceResultMessage(productListQuery.error)}</div>
            ) : null}
            {productDetailQueries.some((query) => query.isError) ? (
              <div className="building-test-status is-error">
                {getProductServiceResultMessage(productDetailQueries.find((query) => query.isError)?.error)}
              </div>
            ) : null}

            <div className="building-product-list">
              {filteredModels.map((model) => (
                <article
                  className="building-product-card"
                  draggable
                  key={model.id}
                  title={`Drag ${model.name} into a yard or floor surface`}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = 'copy';
                    event.dataTransfer.setData(PRODUCT_DRAG_TYPE, model.id);
                  }}
                >
                  <div className="building-product-media">
                    {model.thumbnailUrl ? <img alt="" src={model.thumbnailUrl} /> : <IconBox size={30} />}
                  </div>
                  <div className="building-product-info">
                    <strong>{model.name}</strong>
                    <span>{model.categoryName ?? 'Catalog'}{model.material ? ` / ${model.material}` : ''}</span>
                    <button type="button" onClick={() => quickAddProduct(model)}>Add</button>
                  </div>
                </article>
              ))}
              {!productListQuery.isLoading && filteredModels.length === 0 ? (
                <div className="building-test-status">No ready 3D product models found.</div>
              ) : null}
            </div>
            {productListQuery.data && detailLimit < productListQuery.data.items.length ? (
              <button
                className="building-load-more-button"
                type="button"
                onClick={() => setDetailLimit((currentLimit) => currentLimit + DETAIL_BATCH_SIZE)}
              >
                Load more models
              </button>
            ) : null}
          </section>
          )}

          {designPanel === 'materials' && (
            <section className="building-test-panel">
              <div className="building-test-panel-heading">
                <strong>Materials</strong>
                <span>Scene presets</span>
              </div>
              <div className="building-material-grid">
                <label>
                  <span>Floor</span>
                  <strong>Warm wood / concrete slabs</strong>
                </label>
                <label>
                  <span>Wall</span>
                  <strong>Gallery white facade</strong>
                </label>
                <label>
                  <span>Glass</span>
                  <strong>Soft blue transparent</strong>
                </label>
              </div>
            </section>
          )}

          {designPanel === 'selection' && (
            <section className="building-test-panel">
              <div className="building-test-panel-heading">
                <strong>Selection</strong>
                <span>{selectedProduct ? 'Object' : 'None'}</span>
              </div>
              {!selectedProduct ? (
                <div className="building-test-status">Select an object in the scene to edit placement rules.</div>
              ) : (
                <div className="building-selection-editor">
                  <label>
                    <span>Name</span>
                    <strong>{selectedProduct.name}</strong>
                  </label>
                  <label>
                    <span>Placement</span>
                    <select
                      value={selectedProduct.placementMode ?? 'FLOOR'}
                      onChange={(event) => updateSelectedProduct({ placementMode: event.target.value as ProductPlacementMode })}
                    >
                      {placementModes.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Scale</span>
                    <input
                      inputMode="decimal"
                      value={selectedProduct.scale.x}
                      onChange={(event) => {
                        const scale = Number(event.target.value.replace(',', '.'));

                        if (Number.isFinite(scale) && scale > 0) {
                          updateSelectedProduct({ scale: { x: scale, y: scale, z: scale } });
                        }
                      }}
                    />
                  </label>
                  <label className="building-rule-toggle">
                    <input
                      checked={selectedProduct.placementRules?.collisionEnabled ?? true}
                      type="checkbox"
                      onChange={(event) =>
                        updateSelectedProduct({
                          placementRules: {
                            ...(selectedProduct.placementRules ?? {
                              boundaryEnabled: true,
                              collisionEnabled: true,
                              snapToSurface: true,
                            }),
                            collisionEnabled: event.target.checked,
                          },
                        })
                      }
                    />
                    Collision
                  </label>
                  <label className="building-rule-toggle">
                    <input
                      checked={selectedProduct.placementRules?.boundaryEnabled ?? true}
                      type="checkbox"
                      onChange={(event) =>
                        updateSelectedProduct({
                          placementRules: {
                            ...(selectedProduct.placementRules ?? {
                              boundaryEnabled: true,
                              collisionEnabled: true,
                              snapToSurface: true,
                            }),
                            boundaryEnabled: event.target.checked,
                          },
                        })
                      }
                    />
                    Boundary
                  </label>
                  <label className="building-rule-toggle">
                    <input
                      checked={selectedProduct.visible ?? true}
                      type="checkbox"
                      onChange={(event) => updateSelectedProduct({ visible: event.target.checked })}
                    />
                    Visible
                  </label>
                  <label className="building-rule-toggle">
                    <input
                      checked={selectedProduct.locked ?? false}
                      type="checkbox"
                      onChange={(event) => updateSelectedProduct({ locked: event.target.checked })}
                    />
                    Locked
                  </label>
                </div>
              )}
            </section>
          )}
        </aside>

        <section className="building-test-workspace">
          <div className="building-test-toolbar">
            <div>
              <strong>{levelOptions.find((level) => level.value === activeLevel)?.label ?? 'All'} View</strong>
              <span>Drag models onto the yard, floor 1, balcony, or floor 2 surface.</span>
            </div>
            <div className="building-object-actions">
              <button disabled={!selectedProduct} type="button" onClick={rotateSelectedProduct}>
                <IconRotateClockwise size={16} />
                Rotate
              </button>
              <button disabled={!selectedProduct} type="button" onClick={deleteSelectedProduct}>
                <IconTrash size={16} />
                Delete
              </button>
            </div>
          </div>

          <BuildingSceneCanvas
            activeLevel={activeLevel}
            modelsById={modelsById}
            placedProducts={placedProducts}
            sceneData={sceneData}
            selectedProductId={selectedProductId}
            onProductDrop={addProductToScene}
            onProductLoadError={(productId, errorMessage) => setMessage(`${productId}: ${errorMessage}`)}
            onProductMove={moveProduct}
            onProductSelect={setSelectedProductId}
          />

          <aside className="building-object-panel">
            <div className="building-test-panel-heading">
              <strong>Scene Objects</strong>
              <span>{selectedProduct ? 'Selected' : 'None selected'}</span>
            </div>
            {placedProducts.length === 0 ? (
              <div className="building-test-status">Drop or add a product to start composing the building.</div>
            ) : (
              <div className="building-object-list">
                {placedProducts.map((product) => (
                  <button
                    className={product.sceneObjectId === selectedProductId ? 'is-selected' : ''}
                    key={product.sceneObjectId}
                    type="button"
                    onClick={() => setSelectedProductId(product.sceneObjectId)}
                  >
                    <IconBox size={15} />
                    <span>
                      <strong>{product.name}</strong>
                      <small>{levelOptions.find((level) => level.value === product.levelId)?.label ?? product.levelId} / {product.surfaceId}</small>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </aside>

          {message && <div className="building-test-message">{message}</div>}
        </section>
      </section>
    </main>
  );
}
