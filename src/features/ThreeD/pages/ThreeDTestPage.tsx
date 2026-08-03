import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { IconMenu2, IconSearch, IconX } from '@tabler/icons-react';
import { Link as RouterLink, useLocation, useParams } from 'react-router-dom';

import { BlueprintCanvas } from '@/features/ThreeD/components/BlueprintCanvas';
import { ModelViewer } from '@/features/ThreeD/components/ModelViewer';
import { RoomPreview3D } from '@/features/ThreeD/components/RoomPreview3D';
import type {
  PlacedProduct3D,
  ProductPlacementUpdate,
  ProductPlacementMode,
  ProductMeasurements,
  Vector3State,
} from '@/features/ThreeD/components/RoomPreview3D';
import type {
  BlueprintTool,
  MaterialSwatch,
  RoomLayoutState,
  RoomMaterialSelection,
  RoomMaterialSwatches,
  SelectedRoomItem,
} from '@/features/ThreeD/types/roomLayout.types';
import {
  createDefaultRoomLayout,
  getRoomArea,
  getRoomBounds,
  getRoomSize,
  normalizeDoorAndOpeningDimensions,
  updateWallDefaults,
} from '@/features/ThreeD/utils/roomGeometry';
import { createRoomPlannerScenePayload, hydrateRoomPlannerScenePayload } from '@/features/ThreeD/utils/roomPlannerSceneMapper';
import type { RoomPlannerObject } from '@/features/ThreeD/types/roomPlannerScene.types';
import {
  getCategoryServiceResultMessage,
  getProductById,
  getProducts,
  getProductServiceResultMessage,
  type CatalogFileDto,
  type ProductDetailDto,
  type ProductVersionDto,
} from '@/services/api';
import {
  useCategoryList,
  useProposalDetail,
  useRoomPlannerScene,
  useSaveRoomPlannerScene,
  useSyncProposalItemsFromScene,
  useUploadProductVersionFile,
} from '@/services/queries';
import { getProposalServiceResultMessage, type ProposalItemDto } from '@/services/api/proposals';

import './ThreeDTestPage.css';

type ViewMode = '2d' | '3d';
type DesignPanel = 'products' | 'floor' | 'wall' | null;
type RoomPlannerRouteState = {
  mode?: 'create-proposal';
  proposalId?: string;
  projectId?: string;
  returnTo?: string;
};

type ProductModel = {
  color?: string | null;
  depth?: number | null;
  height?: number | null;
  fileId?: string;
  id: string;
  material?: string | null;
  missingReferences?: string[];
  modelUrl: string;
  name: string;
  categoryId?: string | null;
  categoryName?: string | null;
  productId?: string;
  productVersionId?: string;
  source?: 'api' | 'uploaded';
  thumbnailUrl: string;
  width?: number | null;
};

const PLACEMENT_MODES: Array<{
  label: string;
  value: ProductPlacementMode;
}> = [
  { label: 'Floor', value: 'FLOOR' },
  { label: 'On Object', value: 'ON_OBJECT' },
  { label: 'Wall Mounted', value: 'WALL_MOUNTED' },
  { label: 'Custom Height', value: 'CUSTOM_HEIGHT' },
];
const API_PRODUCT_DEFAULT_SCALE = 3;
const EMPTY_MODEL_THUMBNAIL = '';

function getDefaultVector3(value: Partial<Vector3State> | undefined, fallback: Vector3State): Vector3State {
  return {
    x: value?.x ?? fallback.x,
    y: value?.y ?? fallback.y,
    z: value?.z ?? fallback.z,
  };
}

function getProductRotation(product: PlacedProduct3D) {
  return getDefaultVector3(product.rotation, { x: 0, y: 0, z: 0 });
}

function getProductScale(product: PlacedProduct3D) {
  return getDefaultVector3(product.scale, { x: 1, y: 1, z: 1 });
}

function getInitialProductScale(product: ProductModel): Vector3State {
  const scale = product.source === 'api' || product.source === 'uploaded'
    ? API_PRODUCT_DEFAULT_SCALE
    : 1;

  return { x: scale, y: scale, z: scale };
}

function toDegrees(radians: number) {
  return Math.round((radians * 180) / Math.PI);
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function normalizeDegrees(degrees: number) {
  return ((degrees % 360) + 360) % 360;
}

const FLOOR_MATERIALS: RoomMaterialSelection[] = [
  {
    fallbackColor: '#8B5A2B',
    id: 'wood-floor',
    label: 'Wood Floor',
    textureUrl: '/materials/flooring/woodfloor.jpg',
    type: 'floor',
  },
  {
    fallbackColor: '#C8B79A',
    id: 'oak-floor',
    label: 'Natural Oak',
    textureUrl: '/materials/flooring/woodfloor.jpg',
    type: 'floor',
  },
  {
    fallbackColor: '#6E4A32',
    id: 'walnut-floor',
    label: 'Walnut',
    textureUrl: '/materials/flooring/woodfloor.jpg',
    type: 'floor',
  },
  {
    fallbackColor: '#A8ADA8',
    id: 'gray-tile',
    label: 'Soft Gray Tile',
    type: 'floor',
  },
];

const WALL_TEXTURE_MATERIALS: RoomMaterialSelection[] = [
  {
    fallbackColor: '#F3EFE7',
    id: 'wall-base',
    label: 'Gallery White Paint',
    textureUrl: '/materials/wall-paint/wallbase.jpg',
    type: 'wall',
  },
  {
    fallbackColor: '#BFAE8A',
    id: 'wallpaper',
    label: 'Wallpaper',
    textureUrl: '/materials/wallpaper/wallpaper.jpg',
    type: 'wallpaper',
  },
];

const FALLBACK_SWATCHES: MaterialSwatch[] = [
  { color: '#BFAE8A', id: 'balanced-tan', name: 'Balanced Tan' },
  { color: '#EFE9DD', id: 'warm-white', name: 'Warm White' },
  { color: '#B8B8B0', id: 'soft-gray', name: 'Soft Gray' },
  { color: '#C8D6D4', id: 'mist-blue', name: 'Mist Blue' },
  { color: '#DCC8B2', id: 'soft-clay', name: 'Soft Clay' },
  { color: '#596A5C', id: 'garden-green', name: 'Garden Green' },
  { color: '#EEE2CF', id: 'linen', name: 'Linen' },
  { color: '#8E8F88', id: 'stone-gray', name: 'Stone Gray' },
];

function getCatalogModelFile(files: CatalogFileDto[] | undefined) {
  return files?.find((file) => file.fileType === 'MODEL_3D') ?? null;
}

function getVersionThumbnail(product: ProductDetailDto, version: ProductVersionDto) {
  return version.thumbnail?.fileUrl ??
    product.thumbnail?.fileUrl ??
    version.files?.find((file) => file.fileType === 'PRODUCT_PREVIEW')?.fileUrl ??
    EMPTY_MODEL_THUMBNAIL;
}

function getProductThumbnail(product: ProductDetailDto) {
  return product.thumbnail?.fileUrl ??
    product.files?.find((file) => file.fileType === 'PRODUCT_PREVIEW')?.fileUrl ??
    product.defaultVersion?.thumbnail?.fileUrl ??
    product.defaultVersion?.files?.find((file) => file.fileType === 'PRODUCT_PREVIEW')?.fileUrl ??
    EMPTY_MODEL_THUMBNAIL;
}

function mapCatalogVersionToModel(product: ProductDetailDto, version: ProductVersionDto): ProductModel | null {
  const modelFile = getCatalogModelFile(version.files);

  if (!modelFile?.fileUrl) {
    return null;
  }

  return {
    fileId: modelFile.fileId,
    id: `api-${version.productVersionId}`,
    color: version.color,
    depth: version.depth,
    height: version.height,
    material: version.material,
    modelUrl: modelFile.fileUrl,
    name: `${product.productName} - ${version.versionName}`,
    categoryId: product.categoryId,
    categoryName: product.categoryName,
    productId: product.productId,
    productVersionId: version.productVersionId,
    source: 'api',
    thumbnailUrl: getVersionThumbnail(product, version),
    width: version.width,
  };
}

function mergeProductModels(...groups: ProductModel[][]) {
  const models = new Map<string, ProductModel>();

  groups.flat().forEach((model) => {
    const key = model.productVersionId ? `version-${model.productVersionId}` : model.id;
    models.set(key, model);
  });

  return [...models.values()];
}

function createSceneObjectId(existingIds: Set<string>) {
  let candidate = `scene-object-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`;

  while (existingIds.has(candidate)) {
    candidate = `scene-object-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`;
  }

  return candidate;
}

function getNextSceneObjectId(products: PlacedProduct3D[]) {
  return createSceneObjectId(new Set(products.map((product) => product.id)));
}

function ensureUniquePlacedProductIds(products: PlacedProduct3D[]) {
  const seenIds = new Set<string>();
  let changed = false;

  const nextProducts = products.map((product) => {
    if (product.id && !seenIds.has(product.id)) {
      seenIds.add(product.id);
      return product;
    }

    changed = true;
    const nextId = createSceneObjectId(seenIds);
    seenIds.add(nextId);

    return {
      ...product,
      id: nextId,
      proposalItemId: null,
    };
  });

  return {
    changed,
    products: nextProducts,
  };
}

function getSyncableProposalItems(products: PlacedProduct3D[]) {
  return products
    .filter((product) => Boolean(product.productVersionId))
    .map((product) => ({
      customizationNote: null,
      productVersionId: product.productVersionId as string,
      quantity: 1,
      sceneObjectId: product.id,
    }));
}

function applyProposalItemIds(products: PlacedProduct3D[], items: ProposalItemDto[]) {
  const proposalItemIdsByObjectId = new Map(
    items
      .filter((item) => item.sceneObjectId)
      .map((item) => [item.sceneObjectId as string, item.proposalItemId]),
  );

  return products.map((product) => ({
    ...product,
    proposalItemId: proposalItemIdsByObjectId.get(product.id) ?? product.proposalItemId ?? null,
  }));
}

const TOOL_ITEMS: Array<{
  id: BlueprintTool;
  label: string;
  placeholder?: boolean;
}> = [
  { id: 'home', label: 'Home', placeholder: true },
  { id: 'select', label: 'Select' },
  { id: 'draw', label: 'Draw' },
  { id: 'add-box', label: 'Add Box' },
  { id: 'l-shape', label: 'Add L-Shape', placeholder: true },
  { id: 'door', label: 'Add Door' },
  { id: 'window', label: 'Add Window' },
  { id: 'opening', label: 'Add Opening' },
  { id: 'ceiling', label: 'Ceiling Options', placeholder: true },
  { id: 'hide-labels', label: 'Hide Labels' },
  { id: 'save', label: 'Save' },
];

const ROOM_PLANNER_SAVE_STATUSES = ['DRAFT', 'PUBLISHED', 'REVISION_REQUESTED'] as const;

function materialFromSwatch(swatch: MaterialSwatch): RoomMaterialSelection {
  return {
    fallbackColor: swatch.color,
    id: swatch.id,
    label: swatch.name,
    type: 'wall',
  };
}

function parseNumberInput(value: string, fallback: number) {
  const normalizedValue = value.trim().replace(',', '.');

  if (!normalizedValue || normalizedValue === '-' || normalizedValue === '.' || normalizedValue === '-.') {
    return fallback;
  }

  const parsed = Number(normalizedValue);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatNumberInput(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
}

function getCatalogSourceLabel(product: ProductModel) {
  if (product.source === 'uploaded') {
    return 'Uploaded';
  }

  return 'Catalog';
}

function getPolygonCenter(layout: RoomLayoutState) {
  const total = layout.points.reduce(
    (currentTotal, point) => ({
      x: currentTotal.x + point.x,
      y: currentTotal.y + point.y,
    }),
    { x: 0, y: 0 },
  );

  return {
    x: total.x / layout.points.length,
    y: total.y / layout.points.length,
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

function getProductPositionInsideRoom(layout: RoomLayoutState, index: number) {
  const bounds = getRoomBounds(layout.points);
  const width = Math.max(bounds.maxX - bounds.minX, 1);
  const depth = Math.max(bounds.maxY - bounds.minY, 1);
  const margin = Math.min(Math.max(Math.min(width, depth) * 0.08, 0.8), 4);
  const columns = 4;
  const usableWidth = Math.max(width - margin * 2, 1);
  const usableDepth = Math.max(depth - margin * 2, 1);
  const x = bounds.minX + margin + (usableWidth * (index % columns)) / Math.max(columns - 1, 1);
  const y = bounds.minY + margin + (usableDepth * Math.floor(index / columns)) / Math.max(columns - 1, 1);
  const candidate = { x, y };
  const point = isPointInsidePolygon(candidate, layout.points) ? candidate : getPolygonCenter(layout);

  return {
    x: Number(point.x.toFixed(2)),
    y: 0,
    z: Number(point.y.toFixed(2)),
  };
}

type CommitNumberInputProps = {
  fallback: number;
  min?: number;
  onCommit: (value: number) => void;
  step?: number;
  value: number;
};

function CommitNumberInput({ fallback, min, onCommit, step, value }: CommitNumberInputProps) {
  const [draftValue, setDraftValue] = useState(formatNumberInput(value));

  useEffect(() => {
    setDraftValue(formatNumberInput(value));
  }, [value]);

  function commitDraft() {
    const nextValue = parseNumberInput(draftValue, fallback);
    const clampedValue = min !== undefined ? Math.max(nextValue, min) : nextValue;

    setDraftValue(formatNumberInput(clampedValue));

    if (clampedValue !== value) {
      onCommit(clampedValue);
    }
  }

  return (
    <input
      inputMode="decimal"
      min={min}
      step={step}
      type="text"
      value={draftValue}
      onChange={(event) => setDraftValue(event.target.value)}
      onBlur={commitDraft}
      onKeyDown={(event) => {
        if (event.key !== 'Enter') {
          return;
        }

        event.currentTarget.blur();
      }}
    />
  );
}

export function ThreeDTestPage() {
  const { sceneId } = useParams();
  const location = useLocation();
  const routeState = location.state as RoomPlannerRouteState | null;
  const isProposalScene = Boolean(sceneId);
  const isCreateProposal = routeState?.mode === 'create-proposal';
  const isAdminLab = location.pathname.startsWith('/admin/3d-lab');
  const uploadModelMutation = useUploadProductVersionFile();
  const categoriesQuery = useCategoryList({ page: 1, limit: 100 });
  const roomPlannerSceneQuery = useRoomPlannerScene(sceneId, { enabled: isProposalScene });
  const saveRoomPlannerSceneMutation = useSaveRoomPlannerScene();
  const syncProposalItemsMutation = useSyncProposalItemsFromScene();
  const currentProposalId = routeState?.proposalId ?? roomPlannerSceneQuery.data?.proposalId ?? null;
  const proposalDetailQuery = useProposalDetail(currentProposalId ?? undefined, { enabled: Boolean(currentProposalId) && isProposalScene });
  const currentProjectId = routeState?.projectId ?? roomPlannerSceneQuery.data?.projectId ?? null;
  const backLinkTarget = routeState?.returnTo ?? (currentProjectId ? `/designer/assigned-projects/${currentProjectId}` : isAdminLab ? '/admin/dashbroad' : '/designer/assigned-projects');
  const [activeTool, setActiveTool] = useState<BlueprintTool>('select');
  const [hideLabels, setHideLabels] = useState(false);
  const [layout, setLayout] = useState<RoomLayoutState | null>(null);
  const [placedProducts, setPlacedProducts] = useState<PlacedProduct3D[]>([]);
  const [designPanel, setDesignPanel] = useState<DesignPanel>('products');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [panelSearch, setPanelSearch] = useState('');
  const [selectedCatalogCategoryId, setSelectedCatalogCategoryId] = useState<string | null>(null);
  const [selectedCatalogProductId, setSelectedCatalogProductId] = useState<string | null>(null);
  const [apiCatalogProducts, setApiCatalogProducts] = useState<ProductDetailDto[]>([]);
  const [apiProductModels, setApiProductModels] = useState<ProductModel[]>([]);
  const [uploadedProductModels, setUploadedProductModels] = useState<ProductModel[]>([]);
  const [modelUploadProductVersionId, setModelUploadProductVersionId] = useState('');
  const [modelUploadMessage, setModelUploadMessage] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [selectedItem, setSelectedItem] = useState<SelectedRoomItem | null>(null);
  const [comparisonProductId, setComparisonProductId] = useState<string | null>(null);
  const [productMeasurements, setProductMeasurements] = useState<ProductMeasurements | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [showProductInfo, setShowProductInfo] = useState(false);
  const [freeRotateProductId, setFreeRotateProductId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => (isProposalScene ? '3d' : '2d'));
  const [wallPaintSwatches, setWallPaintSwatches] = useState<MaterialSwatch[]>(FALLBACK_SWATCHES);

  const wallMaterials = useMemo(
    () => [
      ...WALL_TEXTURE_MATERIALS,
      ...wallPaintSwatches.map(materialFromSwatch),
    ],
    [wallPaintSwatches],
  );

  const floorMaterial = useMemo(
    () =>
      FLOOR_MATERIALS.find((material) => material.id === layout?.floorMaterialId) ??
      FLOOR_MATERIALS[0],
    [layout?.floorMaterialId],
  );

  const wallMaterial = useMemo(
    () =>
      wallMaterials.find((material) => material.id === layout?.wallMaterialId) ??
      WALL_TEXTURE_MATERIALS[0],
    [layout?.wallMaterialId, wallMaterials],
  );

  const roomSize = useMemo(
    () => (layout ? getRoomSize(layout.points) : null),
    [layout],
  );
  const roomArea = useMemo(() => (layout ? getRoomArea(layout) : 0), [layout]);
  const isSavingRoomPlanner = saveRoomPlannerSceneMutation.isPending || syncProposalItemsMutation.isPending;
  const canSaveRoomPlannerStatus =
    !proposalDetailQuery.data?.status ||
    ROOM_PLANNER_SAVE_STATUSES.includes(proposalDetailQuery.data.status as (typeof ROOM_PLANNER_SAVE_STATUSES)[number]);
  const selectedProduct = useMemo(
    () => placedProducts.find((product) => product.id === selectedProductId) ?? null,
    [placedProducts, selectedProductId],
  );
  const availableProductModels = useMemo(
    () => mergeProductModels(
      uploadedProductModels,
      apiProductModels,
    ),
    [apiProductModels, uploadedProductModels],
  );
  const filteredProductModels = useMemo(() => {
    const normalizedSearch = panelSearch.trim().toLowerCase();

    return normalizedSearch
      ? availableProductModels.filter((product) => product.name.toLowerCase().includes(normalizedSearch))
      : availableProductModels;
  }, [availableProductModels, panelSearch]);
  const normalizedCatalogSearch = panelSearch.trim().toLowerCase();
  const productModelCountByProductId = useMemo(() => {
    const counts = new Map<string, number>();

    apiProductModels.forEach((model) => {
      if (!model.productId) {
        return;
      }

      counts.set(model.productId, (counts.get(model.productId) ?? 0) + 1);
    });

    return counts;
  }, [apiProductModels]);
  const catalogCategoryCards = useMemo(() => {
    const categories = categoriesQuery.data?.items ?? [];
    const productCountsByCategoryId = new Map<string, number>();

    apiCatalogProducts.forEach((product) => {
      if (!productModelCountByProductId.has(product.productId)) {
        return;
      }

      productCountsByCategoryId.set(
        product.categoryId,
        (productCountsByCategoryId.get(product.categoryId) ?? 0) + 1,
      );
    });

    return categories
      .map((category) => ({
        category,
        productCount: productCountsByCategoryId.get(category.categoryId) ?? 0,
      }))
      .filter((item) => item.productCount > 0)
      .filter((item) =>
        normalizedCatalogSearch
          ? item.category.categoryName.toLowerCase().includes(normalizedCatalogSearch)
          : true,
      );
  }, [apiCatalogProducts, categoriesQuery.data?.items, normalizedCatalogSearch, productModelCountByProductId]);
  const selectedCatalogCategory = useMemo(
    () => categoriesQuery.data?.items.find((category) => category.categoryId === selectedCatalogCategoryId) ?? null,
    [categoriesQuery.data?.items, selectedCatalogCategoryId],
  );
  const selectedCategoryProducts = useMemo(
    () =>
      apiCatalogProducts
        .filter((product) => product.categoryId === selectedCatalogCategoryId)
        .filter((product) => productModelCountByProductId.has(product.productId))
        .filter((product) =>
          normalizedCatalogSearch
            ? product.productName.toLowerCase().includes(normalizedCatalogSearch)
            : true,
        ),
    [apiCatalogProducts, normalizedCatalogSearch, productModelCountByProductId, selectedCatalogCategoryId],
  );
  const selectedCatalogProduct = useMemo(
    () => apiCatalogProducts.find((product) => product.productId === selectedCatalogProductId) ?? null,
    [apiCatalogProducts, selectedCatalogProductId],
  );
  const selectedProductModels = useMemo(
    () =>
      filteredProductModels.filter((model) =>
        selectedCatalogProductId
          ? model.productId === selectedCatalogProductId
          : false,
      ),
    [filteredProductModels, selectedCatalogProductId],
  );

  const openDesignPanel = useCallback((panel: Exclude<DesignPanel, null>) => {
    setDesignPanel(panel);
    setIsSidebarCollapsed(false);
    setPanelSearch('');

    if (panel === 'products') {
      setSelectedCatalogCategoryId(null);
      setSelectedCatalogProductId(null);
    }
  }, []);

  const addUploadedProductModel = useCallback((model: ProductModel) => {
    setUploadedProductModels((currentModels) => mergeProductModels([model], currentModels));
  }, []);

  const resolveSceneObjectModelUrl = useCallback((object: Partial<RoomPlannerObject>) => {
    const modelFileId = object.modelSnapshot?.modelFileId;
    const productVersionId = object.productVersionId;
    const catalogModel = apiProductModels.find((model) =>
      Boolean(productVersionId && model.productVersionId === productVersionId) ||
      Boolean(modelFileId && model.fileId === modelFileId),
    );

    return catalogModel?.modelUrl ?? null;
  }, [apiProductModels]);

  useEffect(() => {
    if (!isProposalScene || !roomPlannerSceneQuery.data) {
      return;
    }

    const hydratedScene = hydrateRoomPlannerScenePayload(roomPlannerSceneQuery.data, {
      resolveModelUrl: resolveSceneObjectModelUrl,
    });
    const normalizedHydratedProducts = ensureUniquePlacedProductIds(hydratedScene.placedProducts).products;

    setLayout(hydratedScene.layout);
    setPlacedProducts(normalizedHydratedProducts);
    setActiveTool(hydratedScene.activeTool);
    setHideLabels(hydratedScene.hideLabels);
    setIsSidebarCollapsed(hydratedScene.isSidebarCollapsed);
    setSelectedProductId(
      hydratedScene.selectedProductId &&
        normalizedHydratedProducts.some((product) => product.id === hydratedScene.selectedProductId)
        ? hydratedScene.selectedProductId
        : null,
    );
    setViewMode(hydratedScene.viewMode);
    setComparisonProductId(null);
    setProductMeasurements(null);
    setSelectedItem(null);
    setSaveMessage(
      hydratedScene.layout
        ? `Scene ready${roomPlannerSceneQuery.data.lastSavedAt ? `, last saved ${new Date(roomPlannerSceneQuery.data.lastSavedAt).toLocaleString()}` : ''}.`
        : 'No room layout is saved yet. Create a room in 2D, place catalog products, then save the scene.',
    );
  }, [isProposalScene, resolveSceneObjectModelUrl, roomPlannerSceneQuery.data]);

  useEffect(() => {
    if (isProposalScene && roomPlannerSceneQuery.isError) {
      setSaveMessage(getProposalServiceResultMessage(roomPlannerSceneQuery.error));
    }
  }, [isProposalScene, roomPlannerSceneQuery.error, roomPlannerSceneQuery.isError]);

  const uploadModelFile = useCallback(async (file: File) => {
    const productVersionId = modelUploadProductVersionId.trim();

    if (!productVersionId) {
      setModelUploadMessage('Enter a Product Version ID before uploading a MODEL_3D file.');
      return;
    }

    setModelUploadMessage('Uploading MODEL_3D file...');

    try {
      const uploadedFile = await uploadModelMutation.mutateAsync({
        description: '3D Lab uploaded MODEL_3D',
        file,
        fileType: 'MODEL_3D',
        productVersionId,
        skipAuthRedirect: true,
      });
      const uploadedModel: ProductModel = {
        fileId: uploadedFile.fileId,
        id: `uploaded-${uploadedFile.referenceId}-${uploadedFile.fileId}`,
        modelUrl: uploadedFile.fileUrl,
        name: uploadedFile.originalFileName.replace(/\.(glb|gltf)$/i, '') || 'Uploaded 3D Model',
        productVersionId: uploadedFile.referenceId,
        source: 'uploaded',
        thumbnailUrl: EMPTY_MODEL_THUMBNAIL,
      };

      addUploadedProductModel(uploadedModel);
      setModelUploadMessage('MODEL_3D uploaded and added to Shop by Category.');
    } catch (error) {
      setModelUploadMessage(getProductServiceResultMessage(error));
    }
  }, [addUploadedProductModel, modelUploadProductVersionId, uploadModelMutation]);

  const handleModelUploadChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      await uploadModelFile(file);
    }

    event.target.value = '';
  }, [uploadModelFile]);

  useEffect(() => {
    let isMounted = true;

    async function loadCatalogModels() {
      if (categoriesQuery.isLoading || categoriesQuery.isError) {
        return;
      }

      try {
        const limit = 100;
        let page = 1;
        let total = 0;
        let fetchedCount = 0;
        const productIds: string[] = [];
        const categoryIds = new Set((categoriesQuery.data?.items ?? []).map((category) => category.categoryId));

        do {
          const productList = await getProducts({ page, limit });
          total = productList.total;
          fetchedCount += productList.items.length;
          productIds.push(
            ...productList.items
              .filter((product) => categoryIds.size === 0 || categoryIds.has(product.categoryId))
              .map((product) => product.productId),
          );
          page += 1;
        } while (fetchedCount < total);

        const productDetails = await Promise.all(
          productIds.map((productId) => getProductById(productId)),
        );
        const models = productDetails.flatMap((product) =>
          product.versions
            .map((version) => mapCatalogVersionToModel(product, version))
            .filter((model): model is ProductModel => Boolean(model)),
        );

        if (isMounted) {
          setApiCatalogProducts(productDetails);
          setApiProductModels(models);
        }
      } catch {
        if (isMounted) {
          setApiCatalogProducts([]);
          setApiProductModels([]);
        }
      }
    }

    void loadCatalogModels();

    return () => {
      isMounted = false;
    };
  }, [categoriesQuery.data?.items, categoriesQuery.isError, categoriesQuery.isLoading]);

  useEffect(() => {
    let isMounted = true;

    async function loadSwatches() {
      try {
        const response = await fetch('/materials/wall-paint/swatches.json', {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`Swatches request failed with ${response.status}.`);
        }

        const swatches = await response.json() as RoomMaterialSwatches;

        if (isMounted) {
          setWallPaintSwatches(swatches.wallPaint?.length ? swatches.wallPaint : FALLBACK_SWATCHES);
        }
      } catch {
        if (isMounted) {
          setWallPaintSwatches(FALLBACK_SWATCHES);
        }
      }
    }

    void loadSwatches();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAddBox = useCallback(() => {
    setLayout(createDefaultRoomLayout());
    setPlacedProducts([]);
    setComparisonProductId(null);
    setProductMeasurements(null);
    setSelectedItem(null);
    setActiveTool('select');
    setSaveMessage('');
    setViewMode('2d');
  }, []);

  const handleSave = useCallback(async () => {
    if (!canSaveRoomPlannerStatus) {
      setSaveMessage(`Room Planner can be saved only when proposal is ${ROOM_PLANNER_SAVE_STATUSES.join(', ')}.`);
      return;
    }

    if (!layout) {
      setSaveMessage('Add a room before saving.');
      return;
    }

    const buildRoomPlannerPayload = (products: PlacedProduct3D[]) => createRoomPlannerScenePayload({
      activeTool,
      floorMaterial,
      hideLabels,
      isSidebarCollapsed,
      layout,
      placedProducts: products,
      selectedProductId,
      selectedRoomItem: selectedItem,
      viewMode,
      wallMaterial,
    });
    const normalizedPlacedProducts = ensureUniquePlacedProductIds(placedProducts);
    const productsToSave = normalizedPlacedProducts.products;
    const roomPlannerPayload = buildRoomPlannerPayload(productsToSave);

    if (normalizedPlacedProducts.changed) {
      setPlacedProducts(productsToSave);
      setSelectedProductId((currentSelectedProductId) => (
        currentSelectedProductId && productsToSave.some((product) => product.id === currentSelectedProductId)
          ? currentSelectedProductId
          : null
      ));
    }

    if (isProposalScene && sceneId) {
      setSaveMessage('Saving Room Planner scene to MongoDB...');

      try {
        const saveResult = await saveRoomPlannerSceneMutation.mutateAsync({
          sceneId,
          payload: roomPlannerPayload,
        });
        const syncItems = getSyncableProposalItems(productsToSave);

        if (currentProposalId && syncItems.length) {
          setSaveMessage('Room Planner scene saved. Syncing proposal items from scene...');

          const syncResult = await syncProposalItemsMutation.mutateAsync({
            proposalId: currentProposalId,
            sceneId,
            items: syncItems,
          });
          const productsWithProposalItems = applyProposalItemIds(productsToSave, syncResult.items);

          setPlacedProducts(productsWithProposalItems);

          await saveRoomPlannerSceneMutation.mutateAsync({
            sceneId,
            payload: buildRoomPlannerPayload(productsWithProposalItems),
          });

          setSaveMessage(`Saved and synced ${syncResult.items.length} proposal item(s) at ${new Date(saveResult.lastSavedAt).toLocaleString()}.`);
          return;
        }

        setSaveMessage(
          currentProposalId
            ? `Saved at ${new Date(saveResult.lastSavedAt).toLocaleString()}. No catalog products to sync.`
            : `Saved at ${new Date(saveResult.lastSavedAt).toLocaleString()}. Open from a proposal to sync proposal items.`,
        );
      } catch (error) {
        setSaveMessage(getProposalServiceResultMessage(error));
      }

      return;
    }

    console.log('FurniSpace room planner payload', roomPlannerPayload);
    localStorage.setItem('furnispace-3d-lab-room-layout', JSON.stringify(roomPlannerPayload));
    setSaveMessage('Room layout saved locally and logged to console.');
  }, [
    activeTool,
    canSaveRoomPlannerStatus,
    currentProposalId,
    floorMaterial,
    hideLabels,
    isProposalScene,
    isSidebarCollapsed,
    layout,
    placedProducts,
    saveRoomPlannerSceneMutation,
    sceneId,
    selectedProductId,
    selectedItem,
    syncProposalItemsMutation,
    viewMode,
    wallMaterial,
  ]);

  const handleToolClick = useCallback(
    (tool: BlueprintTool) => {
      if (tool === 'add-box') {
        handleAddBox();
        return;
      }

      if (tool === 'hide-labels') {
        setHideLabels((currentValue) => !currentValue);
        setIsSidebarCollapsed(true);
        setActiveTool(tool);
        return;
      }

      if (tool === 'save') {
        void handleSave();
        setActiveTool(tool);
        return;
      }

      setActiveTool(tool);
    },
    [handleAddBox, handleSave],
  );

  const handleMaterialChange = useCallback(
    (changes: Partial<Pick<RoomLayoutState, 'floorMaterialId' | 'wallMaterialId'>>) => {
      setLayout((currentLayout) => (
        currentLayout
          ? {
              ...currentLayout,
              ...changes,
            }
          : currentLayout
      ));
      setSaveMessage('');
    },
    [],
  );

  const handleLayoutChange = useCallback((nextLayout: RoomLayoutState) => {
    setLayout(normalizeDoorAndOpeningDimensions(nextLayout));
    setSaveMessage('');
  }, []);

  const handleGlobalWallUpdate = useCallback(
    (changes: Partial<Pick<RoomLayoutState, 'wallHeight' | 'wallThickness'>>) => {
      setLayout((currentLayout) => (
        currentLayout ? updateWallDefaults(currentLayout, changes) : currentLayout
      ));
      setSaveMessage('');
    },
    [],
  );

  const handleAddProduct = useCallback((product: ProductModel, position?: PlacedProduct3D['position']) => {
    if (!layout) {
      setSaveMessage('Create a room layout before adding products.');
      return;
    }

    if (product.missingReferences?.length) {
      return;
    }

    setPlacedProducts((currentProducts) => {
      const nextIndex = currentProducts.length;
      const nextProductId = getNextSceneObjectId(currentProducts);
      const initialScale = getInitialProductScale(product);
      setSelectedProductId(nextProductId);

      return [
        ...currentProducts,
        {
          fileId: product.fileId,
          heightOffset: position?.y ?? 0,
          id: nextProductId,
          mountedWallId: null,
          modelName: product.name,
          modelUrl: product.modelUrl,
          placementMode: 'FLOOR',
          position: position ?? getProductPositionInsideRoom(layout, nextIndex),
          productId: product.productId ?? product.id,
          productVersionId: product.productVersionId,
          dimensionsSnapshot: {
            depth: product.depth ?? null,
            height: product.height ?? null,
            unit: 'cm',
            width: product.width ?? null,
          },
          rotation: { x: 0, y: 0, z: 0 },
          scale: initialScale,
          source: product.source,
          supportObjectId: null,
          thumbnailUrl: product.thumbnailUrl,
          visualSnapshot: {
            color: product.color ?? null,
            finish: null,
            material: product.material ?? null,
          },
        },
      ];
    });
    setViewMode('3d');
    setComparisonProductId(null);
    setSaveMessage('');
  }, [layout]);

  const handleProductDrop = useCallback((productModelId: string, position: PlacedProduct3D['position']) => {
    const product = availableProductModels.find((model) => model.id === productModelId);

    if (!product) {
      return;
    }

    handleAddProduct(product, position);
  }, [availableProductModels, handleAddProduct]);

  const handleProductMove = useCallback((
    productId: string,
    position: PlacedProduct3D['position'],
    placementUpdate?: ProductPlacementUpdate,
  ) => {
    setPlacedProducts((currentProducts) => currentProducts.map((product) => {
      if (product.id !== productId) {
        return product;
      }

      if (
        product.position.x === position.x &&
        product.position.y === position.y &&
        product.position.z === position.z
      ) {
        return product;
      }

      return {
        ...product,
        heightOffset: product.placementMode === 'FLOOR' ? 0 : position.y,
        ...placementUpdate,
        position,
      };
    }));
    setSaveMessage('');
  }, []);

  const updateProduct = useCallback((productId: string, updater: (product: PlacedProduct3D) => PlacedProduct3D) => {
    setPlacedProducts((currentProducts) => currentProducts.map((product) => (
      product.id === productId ? updater(product) : product
    )));
    setSaveMessage('');
  }, []);

  const handleDuplicateProduct = useCallback((product: PlacedProduct3D) => {
    const duplicateId = getNextSceneObjectId(placedProducts);
    const duplicate: PlacedProduct3D = {
      ...product,
      id: duplicateId,
      position: {
        ...product.position,
        x: Number((product.position.x + 0.6).toFixed(2)),
        z: Number((product.position.z + 0.6).toFixed(2)),
      },
      proposalItemId: null,
    };

    setPlacedProducts((currentProducts) => [...currentProducts, duplicate]);
    setComparisonProductId(null);
    setSelectedProductId(duplicateId);
    setShowProductInfo(false);
    setFreeRotateProductId(null);
    setSaveMessage('');
  }, [placedProducts]);

  const handleDeleteProduct = useCallback((productId: string) => {
    setPlacedProducts((currentProducts) => currentProducts.filter((product) => product.id !== productId));
    setComparisonProductId(null);
    setProductMeasurements(null);
    setSelectedProductId(null);
    setShowProductInfo(false);
    setFreeRotateProductId(null);
    setSaveMessage('');
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditingText = target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        Boolean(target?.isContentEditable);

      if (isEditingText || viewMode !== '3d' || !selectedProductId) {
        return;
      }

      if (event.key !== 'Delete' && event.key !== 'Backspace') {
        return;
      }

      event.preventDefault();
      handleDeleteProduct(selectedProductId);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleDeleteProduct, selectedProductId, viewMode]);

  const handleRotateProduct45 = useCallback((productId: string) => {
    updateProduct(productId, (product) => {
      const rotation = getProductRotation(product);
      const nextDegrees = normalizeDegrees(toDegrees(rotation.y) + 45);

      return {
        ...product,
        rotation: {
          ...rotation,
          y: toRadians(nextDegrees),
        },
      };
    });
  }, [updateProduct]);

  const handlePlacementModeChange = useCallback((productId: string, placementMode: ProductPlacementMode) => {
    updateProduct(productId, (product) => {
      const nextY = placementMode === 'FLOOR' ? 0 : product.position.y;

      return {
        ...product,
        heightOffset: nextY,
        mountedWallId: placementMode === 'WALL_MOUNTED' ? product.mountedWallId ?? null : null,
        placementMode,
        position: {
          ...product.position,
          y: nextY,
        },
        supportObjectId: placementMode === 'ON_OBJECT' ? product.supportObjectId ?? null : null,
      };
    });
  }, [updateProduct]);

  const handleHeightStep = useCallback((productId: string, step: number) => {
    updateProduct(productId, (product) => {
      const nextY = Math.max(0, Number((product.position.y + step).toFixed(2)));

      return {
        ...product,
        heightOffset: nextY,
        placementMode: product.placementMode === 'FLOOR' && nextY > 0 ? 'CUSTOM_HEIGHT' : product.placementMode ?? 'CUSTOM_HEIGHT',
        position: {
          ...product.position,
          y: nextY,
        },
      };
    });
  }, [updateProduct]);

  const handleResetProductToFloor = useCallback((productId: string) => {
    updateProduct(productId, (product) => ({
      ...product,
      heightOffset: 0,
      mountedWallId: null,
      placementMode: 'FLOOR',
      position: {
        ...product.position,
        y: 0,
      },
      supportObjectId: null,
    }));
  }, [updateProduct]);

  const handleFreeRotateChange = useCallback((productId: string, degrees: number) => {
    updateProduct(productId, (product) => {
      const rotation = getProductRotation(product);

      return {
        ...product,
        rotation: {
          ...rotation,
          y: toRadians(degrees),
        },
      };
    });
  }, [updateProduct]);

  const handleScaleStep = useCallback((
    productId: string,
    axis: keyof Vector3State,
    step: number,
  ) => {
    updateProduct(productId, (product) => {
      const scale = getProductScale(product);

      return {
        ...product,
        scale: {
          ...scale,
          [axis]: Number(Math.min(5, Math.max(0.1, scale[axis] + step)).toFixed(2)),
        },
      };
    });
  }, [updateProduct]);

  return (
    <main className="room-layout-page">
      <header className="room-layout-header">
        <div>
          <h1>{isCreateProposal ? 'Create Proposal 3D Scene' : isProposalScene ? `Room Planner Scene ${sceneId}` : 'FurniSpace Room Layout Editor'}</h1>
        </div>
        <div className="room-layout-header-actions">
          <button type="button" onClick={() => setViewMode(viewMode === '2d' ? '3d' : '2d')}>
            {viewMode === '2d' ? 'Switch to 3D' : 'Back to 2D'}
          </button>
          <RouterLink to={backLinkTarget}>
            {isProposalScene ? 'Back to Project' : isAdminLab ? 'Back to Admin' : 'Back home'}
          </RouterLink>
        </div>
      </header>

      <section className={[
        'room-layout-shell',
        `is-${viewMode}`,
        isSidebarCollapsed ? 'is-sidebar-collapsed' : '',
        viewMode === '3d' && !designPanel ? 'is-design-panel-closed' : '',
      ].filter(Boolean).join(' ')}>
        {viewMode === '2d' ? (
          <aside className={isSidebarCollapsed ? 'room-tool-menu room-sidebar-rail' : 'room-tool-menu room-build-sidebar'} aria-label="Blueprint tools">
            {isSidebarCollapsed ? (
              <button aria-label="Show blueprint menu" title="Show menu" type="button" onClick={() => setIsSidebarCollapsed(false)}>
                <IconMenu2 size={22} />
              </button>
            ) : (
              <>
            <div className="room-tool-list">
              {TOOL_ITEMS.map((tool) => (
                <button
                  className={activeTool === tool.id ? 'is-active' : ''}
                  disabled={tool.placeholder}
                  key={tool.id}
                  type="button"
                  onClick={() => handleToolClick(tool.id)}
                >
                  <span>{tool.label}</span>
                </button>
              ))}
            </div>

            <section className="room-panel">
              <div className="room-panel-heading">Room Defaults</div>
              <div className="wall-edit-grid">
                <label>
                  <span>Wall Height</span>
                  <CommitNumberInput
                    fallback={layout?.wallHeight ?? 2.8}
                    min={0}
                    onCommit={(value) => handleGlobalWallUpdate({ wallHeight: value })}
                    step={0.1}
                    value={layout?.wallHeight ?? 2.8}
                  />
                </label>
                <label>
                  <span>Wall Thickness</span>
                  <CommitNumberInput
                    fallback={layout?.wallThickness ?? 0.12}
                    min={0.05}
                    onCommit={(value) => handleGlobalWallUpdate({ wallThickness: value })}
                    step={0.01}
                    value={layout?.wallThickness ?? 0.12}
                  />
                </label>
              </div>
            </section>
              </>
            )}
          </aside>
        ) : (
          <aside className={isSidebarCollapsed ? 'room-design-sidebar room-sidebar-rail' : 'room-design-sidebar'} aria-label="3D design tools">
            {isSidebarCollapsed ? (
              <button aria-label="Show design menu" title="Show menu" type="button" onClick={() => setIsSidebarCollapsed(false)}>
                <IconMenu2 size={22} />
              </button>
            ) : (
              <>
            <div className="design-sidebar-menu">
              <div className="design-sidebar-primary">
                <button
                  className={designPanel === 'products' ? 'is-active' : ''}
                  type="button"
                  onClick={() => openDesignPanel('products')}
                >
                  Shop by Category
                </button>
                <button
                  className={designPanel === 'wall' ? 'is-active' : ''}
                  type="button"
                  onClick={() => openDesignPanel('wall')}
                >
                  Wall Paint
                </button>
                <button
                  className={designPanel === 'wall' ? 'is-active-secondary' : ''}
                  type="button"
                  onClick={() => openDesignPanel('wall')}
                >
                  Wallcoverings
                </button>
                <button
                  className={designPanel === 'floor' ? 'is-active' : ''}
                  type="button"
                  onClick={() => openDesignPanel('floor')}
                >
                  Flooring
                </button>
              </div>
              <div className="design-sidebar-footer">
                <button type="button" onClick={() => {
                  setHideLabels((isHidden) => !isHidden);
                  setIsSidebarCollapsed(true);
                }}>
                  {hideLabels ? 'Show Labels' : 'Hide Labels'}
                </button>
                <button disabled={isSavingRoomPlanner || !canSaveRoomPlannerStatus} type="button" onClick={() => void handleSave()}>
                  {isSavingRoomPlanner ? 'Saving...' : 'Save Project'}
                </button>
              </div>
            </div>

            {designPanel && (
              <div className="design-panel-content">
              <div className="design-panel-toolbar">
                <IconSearch size={18} />
                <input
                  aria-label="Search design content"
                  placeholder="Search"
                  type="search"
                  value={panelSearch}
                  onChange={(event) => setPanelSearch(event.target.value)}
                />
                <button aria-label="Close content panel" title="Close panel" type="button" onClick={() => setDesignPanel(null)}>
                  <IconX size={19} />
                </button>
              </div>

            {designPanel === 'products' && (
              <section className="design-panel-section">
                <div className="room-product-sidebar-heading">
                  <strong>Catalog</strong>
                  <span>{filteredProductModels.length} ready model(s)</span>
                </div>
                {categoriesQuery.isLoading && (
                  <div className="catalog-status">Loading categories...</div>
                )}
                {categoriesQuery.isError && (
                  <div className="catalog-status is-error">{getCategoryServiceResultMessage(categoriesQuery.error)}</div>
                )}
                {isAdminLab && (
                  <div className="model-upload-card">
                    <div>
                      <strong>Upload MODEL_3D</strong>
                      <span>Attach a GLB/glTF file to a Product Version, then use it like a catalog product.</span>
                    </div>
                    <label>
                      <span>Product Version ID</span>
                      <input
                        placeholder="Paste productVersionId"
                        type="text"
                        value={modelUploadProductVersionId}
                        onChange={(event) => setModelUploadProductVersionId(event.target.value)}
                      />
                    </label>
                    <div className="model-upload-actions">
                      <label className={uploadModelMutation.isPending ? 'is-disabled' : ''}>
                        Upload GLB/glTF
                        <input
                          accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
                          disabled={uploadModelMutation.isPending}
                          type="file"
                          onChange={(event) => void handleModelUploadChange(event)}
                        />
                      </label>
                    </div>
                    {modelUploadMessage && <small>{modelUploadMessage}</small>}
                  </div>
                )}
                {!selectedCatalogCategoryId && (
                  <div className="catalog-page">
                    {catalogCategoryCards.length === 0 && (
                      <div className="catalog-status">
                        {panelSearch.trim() ? 'No categories match your search.' : 'No categories with ready 3D models yet.'}
                      </div>
                    )}
                    <div className="catalog-tile-list">
                      {catalogCategoryCards.map(({ category, productCount }) => (
                        <button
                          className="catalog-category-tile"
                          key={category.categoryId}
                          type="button"
                          onClick={() => {
                            setSelectedCatalogCategoryId(category.categoryId);
                            setSelectedCatalogProductId(null);
                            setPanelSearch('');
                          }}
                        >
                          <strong>{category.categoryName}</strong>
                          <span>{productCount} product(s)</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCatalogCategoryId && !selectedCatalogProductId && (
                  <div className="catalog-page">
                    <div className="catalog-page-heading">
                      <button type="button" onClick={() => {
                        setSelectedCatalogCategoryId(null);
                        setPanelSearch('');
                      }}>
                        Back
                      </button>
                      <div>
                        <strong>{selectedCatalogCategory?.categoryName ?? 'Category'}</strong>
                        <span>{selectedCategoryProducts.length} product(s)</span>
                      </div>
                    </div>
                    {selectedCategoryProducts.length === 0 && (
                      <div className="catalog-status">
                        {panelSearch.trim() ? 'No products match your search.' : 'No products with ready 3D models in this category.'}
                      </div>
                    )}
                    <div className="product-catalog-list">
                      {selectedCategoryProducts.map((product) => (
                        <button
                          className="product-catalog-card product-browser-card"
                          key={product.productId}
                          type="button"
                          onClick={() => {
                            setSelectedCatalogProductId(product.productId);
                            setPanelSearch('');
                          }}
                        >
                          <div className="product-catalog-media">
                            <img alt="" src={getProductThumbnail(product)} />
                          </div>
                          <div className="product-catalog-info">
                            <strong>{product.productName}</strong>
                            <span>{productModelCountByProductId.get(product.productId) ?? 0} 3D model(s)</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCatalogProductId && (
                  <div className="catalog-page">
                    <div className="catalog-page-heading">
                      <button type="button" onClick={() => {
                        setSelectedCatalogProductId(null);
                        setPanelSearch('');
                      }}>
                        Back
                      </button>
                      <div>
                        <strong>{selectedCatalogProduct?.productName ?? 'Product'}</strong>
                        <span>{selectedProductModels.length} version model(s)</span>
                      </div>
                    </div>
                    {selectedProductModels.length === 0 && (
                      <div className="catalog-status">
                        {panelSearch.trim() ? 'No product versions match your search.' : 'No 3D model versions are ready for this product.'}
                      </div>
                    )}
                    <div className="product-catalog-list">
                      {selectedProductModels.map((product) => {
                        const disabled = Boolean(product.missingReferences?.length) || !layout;

                        return (
                          <article
                            aria-label={product.name}
                            className={disabled ? 'product-catalog-card is-disabled' : 'product-catalog-card'}
                            draggable={!disabled}
                            key={product.id}
                            title={product.missingReferences?.length ? `${product.name} - missing files` : `Drag ${product.name} into the room`}
                            onDragStart={(event) => {
                              if (disabled) {
                                event.preventDefault();
                                return;
                              }

                              event.dataTransfer.effectAllowed = 'copy';
                              event.dataTransfer.setData('application/x-furnispace-product-id', product.id);
                            }}
                          >
                            <div className="product-catalog-media">
                              <div className="product-live-thumbnail">
                                <ModelViewer
                                  autoRotate
                                  fallbackImageUrl={product.thumbnailUrl}
                                  height="100%"
                                  modelUrl={product.modelUrl}
                                  showGrid={false}
                                />
                              </div>
                            </div>
                            <div className="product-catalog-info">
                              <strong>{product.name}</strong>
                              <span>{getCatalogSourceLabel(product)}{product.material ? ` / ${product.material}` : ''}{product.color ? ` / ${product.color}` : ''}</span>
                              <button disabled={disabled} type="button" onClick={() => handleAddProduct(product)}>
                                Add to scene
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            )}

            {designPanel === 'floor' && (
              <section className="design-panel-section">
                <div className="room-panel-heading">Flooring</div>
                <div className="material-group">
                  {FLOOR_MATERIALS.filter((material) =>
                    material.label.toLowerCase().includes(panelSearch.trim().toLowerCase()),
                  ).map((material) => (
                    <button
                      className={layout?.floorMaterialId === material.id ? 'material-option is-selected' : 'material-option'}
                      key={material.id}
                      type="button"
                      onClick={() => handleMaterialChange({ floorMaterialId: material.id })}
                    >
                      <span style={{ backgroundColor: material.fallbackColor }} />
                      {material.label}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {designPanel === 'wall' && (
              <section className="design-panel-section">
                <div className="room-panel-heading">Wall Paint / Wallpaper</div>
                <div className="material-group">
                  {WALL_TEXTURE_MATERIALS.filter((material) =>
                    material.label.toLowerCase().includes(panelSearch.trim().toLowerCase()),
                  ).map((material) => (
                    <button
                      className={layout?.wallMaterialId === material.id ? 'material-option is-selected' : 'material-option'}
                      key={material.id}
                      type="button"
                      onClick={() => handleMaterialChange({ wallMaterialId: material.id })}
                    >
                      <span style={{ backgroundColor: material.fallbackColor }} />
                      {material.label}
                    </button>
                  ))}
                  {wallPaintSwatches.filter((swatch) =>
                    swatch.name.toLowerCase().includes(panelSearch.trim().toLowerCase()),
                  ).map((swatch) => (
                    <button
                      className={layout?.wallMaterialId === swatch.id ? 'material-option is-selected' : 'material-option'}
                      key={swatch.id}
                      type="button"
                      onClick={() => handleMaterialChange({ wallMaterialId: swatch.id })}
                    >
                      <span style={{ backgroundColor: swatch.color }} />
                      {swatch.name}
                    </button>
                  ))}
                </div>
              </section>
            )}
              </div>
            )}
              </>
            )}
          </aside>
        )}

        <section className="room-workspace">
          <div className="room-workspace-toolbar">
            <div>
              <strong>{viewMode === '2d' ? '2D Blueprint Floor Plan' : '3D Room Preview'}</strong>
              <span>
                {layout && roomSize
                  ? `${roomSize.width.toFixed(1)} m x ${roomSize.depth.toFixed(1)} m | ${roomArea.toFixed(1)} m² | wall ${layout.wallHeight.toFixed(1)} m`
                  : 'No room yet'}
              </span>
            </div>
            <div className="room-workspace-actions">
              <button type="button" onClick={() => setViewMode(viewMode === '2d' ? '3d' : '2d')}>
                Toggle 2D/3D
              </button>
            </div>
          </div>

          {viewMode === '2d' ? (
            <BlueprintCanvas
              activeTool={activeTool}
              floorFillColor={floorMaterial.fallbackColor}
              hideLabels={hideLabels}
              layout={layout}
              selectedItem={selectedItem}
              wallFillColor={wallMaterial.fallbackColor}
              onLayoutChange={handleLayoutChange}
              onMessage={setSaveMessage}
              onSelectItem={setSelectedItem}
            />
          ) : (
            <RoomPreview3D
              comparisonProductId={comparisonProductId}
              floorMaterial={floorMaterial}
              layout={layout}
              onMeasurementsChange={setProductMeasurements}
              onProductDrop={handleProductDrop}
              onProductLoadError={(productId, message) => {
                const productName = placedProducts.find((product) => product.id === productId)?.modelName ?? productId;
                setSaveMessage(`${productName}: ${message}`);
              }}
              onProductMove={handleProductMove}
              onProductSelect={(productId, additive) => {
                if (additive && selectedProductId && productId && productId !== selectedProductId) {
                  setComparisonProductId(productId);
                  return;
                }

                setSelectedProductId(productId);
                setComparisonProductId(null);
                setShowProductInfo(false);
                setFreeRotateProductId(null);
              }}
              placedProducts={placedProducts}
              selectedProductId={selectedProductId}
              wallMaterial={wallMaterial}
            />
          )}

          {viewMode === '3d' && selectedProduct && (
            <div className="product-floating-menu">
              <div className="product-floating-header">
                <strong>{selectedProduct.modelName}</strong>
                <button aria-label="Close object menu" title="Close" type="button" onClick={() => setSelectedProductId(null)}>
                  <IconX size={17} />
                </button>
              </div>
              <div className="product-floating-actions">
                <button type="button" onClick={() => handleRotateProduct45(selectedProduct.id)}>Rotate 45</button>
                <button type="button" onClick={() => setFreeRotateProductId(selectedProduct.id)}>Free Rotate</button>
                <button type="button" onClick={() => setShowProductInfo((isOpen) => !isOpen)}>Info</button>
                <button type="button" onClick={() => handleDuplicateProduct(selectedProduct)}>Duplicate</button>
                <button type="button" disabled>Replace</button>
                <button type="button" disabled>Zoom To</button>
                <button type="button" className="is-danger" onClick={() => handleDeleteProduct(selectedProduct.id)}>Delete</button>
                <button type="button" disabled>Lock</button>
              </div>

              {showProductInfo && (
                <div className="object-info-box">
                  <dl>
                    <div><dt>Product name</dt><dd>{selectedProduct.modelName}</dd></div>
                    <div><dt>Product ID</dt><dd>{selectedProduct.productId ?? selectedProduct.productVersionId ?? selectedProduct.id}</dd></div>
                    <div><dt>Model URL</dt><dd>{selectedProduct.modelUrl}</dd></div>
                    <div><dt>Position</dt><dd>{selectedProduct.position.x}, {selectedProduct.position.y}, {selectedProduct.position.z}</dd></div>
                    <div><dt>Rotation Y</dt><dd>{normalizeDegrees(toDegrees(getProductRotation(selectedProduct).y))} deg</dd></div>
                    <div><dt>Placement</dt><dd>{selectedProduct.placementMode ?? 'FLOOR'}</dd></div>
                  </dl>
                </div>
              )}

              {freeRotateProductId === selectedProduct.id && (
                <div className="object-rotate-box">
                  <label>
                    <span>Rotation Y: {normalizeDegrees(toDegrees(getProductRotation(selectedProduct).y))} deg</span>
                    <input
                      max="360"
                      min="0"
                      type="range"
                      value={normalizeDegrees(toDegrees(getProductRotation(selectedProduct).y))}
                      onChange={(event) => handleFreeRotateChange(selectedProduct.id, Number(event.target.value))}
                    />
                  </label>
                  <button type="button" onClick={() => setFreeRotateProductId(null)}>Done</button>
                </div>
              )}

              <div className="product-floating-placement">
                <select
                  value={selectedProduct.placementMode ?? 'FLOOR'}
                  onChange={(event) => handlePlacementModeChange(selectedProduct.id, event.target.value as ProductPlacementMode)}
                >
                  {PLACEMENT_MODES.map((mode) => (
                    <option key={mode.value} value={mode.value}>{mode.label}</option>
                  ))}
                </select>
                <button type="button" onClick={() => handleHeightStep(selectedProduct.id, 0.1)}>Height +</button>
                <button type="button" onClick={() => handleHeightStep(selectedProduct.id, -0.1)}>Height -</button>
                <button type="button" onClick={() => handleResetProductToFloor(selectedProduct.id)}>To Floor</button>
              </div>

              <div className="product-scale-controls">
                {(['x', 'y', 'z'] as const).map((axis) => (
                  <div key={axis}>
                    <span>{axis.toUpperCase()}</span>
                    <button aria-label={`Decrease scale ${axis}`} type="button" onClick={() => handleScaleStep(selectedProduct.id, axis, -0.1)}>-</button>
                    <output>{getProductScale(selectedProduct)[axis].toFixed(2)}</output>
                    <button aria-label={`Increase scale ${axis}`} type="button" onClick={() => handleScaleStep(selectedProduct.id, axis, 0.1)}>+</button>
                  </div>
                ))}
              </div>

              <div className="product-measurements">
                <strong>Measurements</strong>
                <span>
                  Nearest wall: {productMeasurements?.nearestWall
                    ? `${productMeasurements.nearestWall.distance.toFixed(2)} m (${productMeasurements.nearestWall.wallId})`
                    : 'Unavailable'}
                </span>
                <span>
                  Object distance: {productMeasurements?.comparedObject
                    ? `${productMeasurements.comparedObject.distance.toFixed(2)} m (${productMeasurements.comparedObject.productId})`
                    : 'Shift + click another object'}
                </span>
              </div>
            </div>
          )}

          {saveMessage && <div className="room-save-message">{saveMessage}</div>}
        </section>
      </section>
    </main>
  );
}
