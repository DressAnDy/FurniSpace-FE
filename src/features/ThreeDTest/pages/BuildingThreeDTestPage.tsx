import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import {
  IconArrowLeft,
  IconBox,
  IconBuilding,
  IconCategory,
  IconChevronLeft,
  IconChevronRight,
  IconDeviceFloppy,
  IconLock,
  IconPalette,
  IconRefresh,
  IconRulerMeasure,
  IconSearch,
  IconX,
} from '@tabler/icons-react';
import { Link as RouterLink, useLocation, useParams } from 'react-router-dom';

import { BuildingSceneCanvas, PRODUCT_DRAG_TYPE } from '@/features/ThreeDTest/components';
import { useBuildingPlacedProductsDraft, useBuildingTestSceneState } from '@/features/ThreeDTest/hooks';
import type { ProductPlacementMode } from '@/features/ThreeD/components/RoomPreview3D';
import {
  createBuildingRoomPlannerPayload,
  hydrateBuildingRoomPlannerPayload,
} from '@/features/ThreeDTest/utils/buildingRoomPlannerPayloadMapper';
import type {
  BuildingLevelVisibility,
  BuildingProductModel,
  PlacedBuildingProduct,
  Vector3State,
} from '@/features/ThreeDTest/schemas/buildingScene.types';
import { createBuildingTestSceneFromProjectFloorAreas, type BuildingProjectFloorAreaSource } from '@/features/ThreeDTest/utils/buildingTestSceneFactory';
import {
  getProductById,
  getProjectCatalogProductVersion,
  getProductServiceResultMessage,
  type CatalogFileDto,
  type ProductDetailDto,
  type ProductListItemDto,
  type ProductVersionDto,
  type ProjectCatalogProductItemDto,
  type ProjectCatalogProductVersionDetailDto,
  type ProjectCatalogVersionSummaryDto,
} from '@/services/api';
import {
  getCustomizationRequestServiceResultMessage,
  type CustomizationProductVersionDto,
  type CustomizationRequestDto,
  type CustomizationRequestVersionDto,
} from '@/services/api/customizationRequests';
import { getProposalServiceResultMessage, type ProposalItemDto } from '@/services/api/proposals';
import {
  productQueryKeys,
  useCategoryList,
  useProductList,
  useProductVersionDetail,
  useProjectCustomizationRequests,
  useProjectCatalogProducts,
  useProposalDetail,
  useRoomPlannerScene,
  useSaveRoomPlannerScene,
  useSyncProposalItemsFromScene,
} from '@/services/queries';

import './BuildingThreeDTestPage.css';

const EMPTY_THUMBNAIL = '';
const API_PRODUCT_DEFAULT_SCALE = 2.6;
const DETAIL_BATCH_SIZE = 8;
const ROOM_PLANNER_SAVE_STATUSES = ['DRAFT', 'REVISION_REQUESTED'] as const;
type BuildingRoomPlannerRouteState = {
  areas?: BuildingProjectFloorAreaSource[];
  mode?: 'create-proposal';
  projectAreaIds?: string[];
  projectId?: string;
  proposalId?: string;
  returnTo?: string;
  transientPlacedProducts?: PlacedBuildingProduct[];
  transientSelectedProductId?: string | null;
};
type BuildingDesignPanel = 'products' | 'materials';
type BuildingProductSourceTab = 'catalog' | 'custom';
type BuildingMaterialOption = {
  fallbackColor: string;
  id: string;
  label: string;
  textureUrl?: string;
  type: 'floor' | 'wall' | 'wallpaper';
};
const placementModes: Array<{ label: string; value: ProductPlacementMode }> = [
  { label: 'Floor', value: 'FLOOR' },
  { label: 'On Object', value: 'ON_OBJECT' },
  { label: 'Wall Mounted', value: 'WALL_MOUNTED' },
  { label: 'Custom Height', value: 'CUSTOM_HEIGHT' },
];

const FLOOR_MATERIALS: BuildingMaterialOption[] = [
  { fallbackColor: '#8B5A2B', id: 'wood-floor', label: 'Wood Floor', textureUrl: '/materials/flooring/woodfloor.jpg', type: 'floor' },
  { fallbackColor: '#C8B79A', id: 'oak-floor', label: 'Natural Oak', textureUrl: '/materials/flooring/woodfloor.jpg', type: 'floor' },
  { fallbackColor: '#6E4A32', id: 'walnut-floor', label: 'Walnut', textureUrl: '/materials/flooring/woodfloor.jpg', type: 'floor' },
  { fallbackColor: '#A8ADA8', id: 'gray-tile', label: 'Soft Gray Tile', type: 'floor' },
];

const WALL_MATERIALS: BuildingMaterialOption[] = [
  { fallbackColor: '#F3EFE7', id: 'wall-base', label: 'Gallery White Paint', textureUrl: '/materials/wall-paint/wallbase.jpg', type: 'wall' },
  { fallbackColor: '#BFAE8A', id: 'wallpaper', label: 'Wallpaper', textureUrl: '/materials/wallpaper/wallpaper.jpg', type: 'wallpaper' },
  { fallbackColor: '#EFE9DD', id: 'warm-white', label: 'Warm White', type: 'wall' },
  { fallbackColor: '#B8B8B0', id: 'soft-gray', label: 'Soft Gray', type: 'wall' },
  { fallbackColor: '#C8D6D4', id: 'mist-blue', label: 'Mist Blue', type: 'wall' },
  { fallbackColor: '#596A5C', id: 'garden-green', label: 'Garden Green', type: 'wall' },
  { fallbackColor: '#EEE2CF', id: 'linen', label: 'Linen', type: 'wall' },
  { fallbackColor: '#8E8F88', id: 'stone-gray', label: 'Stone Gray', type: 'wall' },
];

function getCatalogModelFile(files: CatalogFileDto[] | undefined) {
  return files?.find((file) => file.fileType === 'MODEL_3D') ?? null;
}

function getCustomProductVersionFiles(productVersion: CustomizationProductVersionDto | null | undefined) {
  return [
    ...(productVersion?.files ?? []),
    ...(productVersion?.previewFiles ?? []),
    productVersion?.thumbnail,
  ].filter((file): file is NonNullable<typeof file> => Boolean(file));
}

function getCustomProductVersionFileType(file: ReturnType<typeof getCustomProductVersionFiles>[number]) {
  return file.fileType?.toUpperCase() ?? '';
}

function getCustomProductVersionFileUrl(file: ReturnType<typeof getCustomProductVersionFiles>[number] | null | undefined) {
  return file?.fileUrl ?? file?.publicUrl ?? file?.url ?? null;
}

function getCustomProductVersionModelFile(productVersion: CustomizationProductVersionDto | null | undefined) {
  return getCustomProductVersionFiles(productVersion).find((file) => getCustomProductVersionFileType(file) === 'MODEL_3D') ?? null;
}

function getCustomProductVersionThumbnail(productVersion: CustomizationProductVersionDto | null | undefined) {
  const previewFile = getCustomProductVersionFiles(productVersion).find((file) => getCustomProductVersionFileType(file) === 'PRODUCT_PREVIEW')
    ?? getCustomProductVersionFiles(productVersion).find((file) => {
      const url = getCustomProductVersionFileUrl(file);

      return Boolean(url && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url));
    });

  return getCustomProductVersionFileUrl(previewFile) ?? EMPTY_THUMBNAIL;
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

function mapProjectCatalogVersionToModel(
  product: ProjectCatalogProductItemDto,
  version: ProjectCatalogProductVersionDetailDto | ProjectCatalogVersionSummaryDto,
): BuildingProductModel | null {
  const files = 'files' in version ? version.files : [];
  const modelFile = getCatalogModelFile(files);

  if (!modelFile?.fileUrl) {
    return null;
  }

  const thumbnailFile = files.find((file) => file.fileType === 'PRODUCT_PREVIEW');

  return {
    categoryId: product.categoryId ?? '',
    categoryName: product.categoryName ?? '',
    color: version.color ?? null,
    depth: version.depth ?? null,
    fileId: modelFile.fileId,
    height: version.height ?? null,
    id: `building-test-${version.productVersionId}`,
    material: version.material ?? null,
    modelUrl: modelFile.fileUrl,
    name: `${product.productName} - ${version.versionName}`,
    productId: product.productId,
    productVersionId: version.productVersionId,
    scale: { x: API_PRODUCT_DEFAULT_SCALE, y: API_PRODUCT_DEFAULT_SCALE, z: API_PRODUCT_DEFAULT_SCALE },
    thumbnailUrl: thumbnailFile?.fileUrl ?? product.thumbnail?.fileUrl ?? EMPTY_THUMBNAIL,
    width: version.width ?? null,
  };
}

function mapCustomVersionToBuildingModel(request: CustomizationRequestDto, version: CustomizationRequestVersionDto): BuildingProductModel | null {
  const productVersion = version.productVersion;

  if (!productVersion?.productVersionId || productVersion.versionType !== 'PROJECT_SPECIFIC') {
    return null;
  }

  const modelFile = getCustomProductVersionModelFile(productVersion);
  const modelUrl = getCustomProductVersionFileUrl(modelFile) ?? productVersion.modelFileUrl;

  if (!modelUrl) {
    return null;
  }

  return {
    categoryId: 'custom-products',
    categoryName: 'Custom',
    color: productVersion.color ?? null,
    depth: productVersion.depth ?? null,
    fileId: modelFile?.fileId ?? modelFile?.fileLinkId ?? undefined,
    height: productVersion.height ?? null,
    id: `building-custom-${productVersion.productVersionId}`,
    material: productVersion.material ?? null,
    modelUrl,
    name: [
      request.sourceProductVersion?.productName,
      productVersion.versionName ?? version.versionTitle ?? `Custom v${version.versionNo}`,
    ].filter(Boolean).join(' - ') || productVersion.versionName || `Custom v${version.versionNo}`,
    productId: productVersion.productId ?? request.sourceProductVersion?.productId ?? undefined,
    productVersionId: productVersion.productVersionId,
    scale: { x: API_PRODUCT_DEFAULT_SCALE, y: API_PRODUCT_DEFAULT_SCALE, z: API_PRODUCT_DEFAULT_SCALE },
    thumbnailUrl: getCustomProductVersionThumbnail(productVersion),
    width: productVersion.width ?? null,
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

function toDegrees(radians: number) {
  return radians * (180 / Math.PI);
}

function toRadians(degrees: number) {
  return degrees * (Math.PI / 180);
}

function normalizeDegrees(degrees: number) {
  return Math.round(((degrees % 360) + 360) % 360);
}

function isSameVector(first: Vector3State, second: Vector3State) {
  return first.x === second.x && first.y === second.y && first.z === second.z;
}

function applyProposalItemIds(products: PlacedBuildingProduct[], items: ProposalItemDto[]) {
  const proposalItemIdsByObjectId = new Map(
    items
      .filter((item) => item.sceneObjectId)
      .map((item) => [item.sceneObjectId as string, item.proposalItemId]),
  );

  return products.map((product) => ({
    ...product,
    proposalItemId: proposalItemIdsByObjectId.get(product.sceneObjectId) ?? product.proposalItemId ?? null,
  }));
}

export function BuildingThreeDTestPage() {
  const { sceneId } = useParams();
  const location = useLocation();
  const roomPlannerBasePath = sceneId
    ? `/proposal-scenes/${sceneId}/room-planner`
    : '/3d-building-test';
  const routeState = location.state as BuildingRoomPlannerRouteState | null;
  const { resetSceneData, sceneData, setRemoteSceneData, setSceneData, shouldKeepSceneDraft } = useBuildingTestSceneState(sceneId);
  const {
    clearDraft: clearPlacedProductsDraft,
    draft: placedProductsDraft,
    persistDraft: persistPlacedProductsDraft,
    shouldKeepDraft: shouldKeepPlacedProductsDraft,
  } = useBuildingPlacedProductsDraft(sceneId);
  const roomPlannerSceneQuery = useRoomPlannerScene(sceneId, { enabled: Boolean(sceneId) });
  const saveRoomPlannerSceneMutation = useSaveRoomPlannerScene();
  const syncProposalItemsMutation = useSyncProposalItemsFromScene();
  const currentProposalId = routeState?.proposalId ?? roomPlannerSceneQuery.data?.proposalId ?? null;
  const proposalDetailQuery = useProposalDetail(currentProposalId ?? undefined, { enabled: Boolean(currentProposalId) });
  const currentProjectId = routeState?.projectId ?? proposalDetailQuery.data?.projectId ?? null;
  const categoriesQuery = useCategoryList({ page: 1, limit: 100 });
  const customizationRequestsQuery = useProjectCustomizationRequests(
    currentProjectId ? { projectId: currentProjectId } : undefined,
    { enabled: Boolean(currentProjectId) },
  );
  const projectCatalogQuery = useProjectCatalogProducts(currentProjectId ?? undefined, { page: 1, pageSize: 48 }, Boolean(currentProjectId));
  const productListQuery = useProductList({ page: 1, limit: 48 }, !currentProjectId);
  const [detailLimit, setDetailLimit] = useState(DETAIL_BATCH_SIZE);
  const [search, setSearch] = useState('');
  const [productSourceTab, setProductSourceTab] = useState<BuildingProductSourceTab>('catalog');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const projectCatalogVersions = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return (projectCatalogQuery.data?.items ?? [])
      .filter((product) => !selectedCategoryId || product.categoryId === selectedCategoryId)
      .filter((product) => !keyword || product.productName.toLowerCase().includes(keyword))
      .flatMap((product) => product.eligibleVersions.map((version) => ({ product, version })))
      .slice(0, detailLimit);
  }, [detailLimit, projectCatalogQuery.data?.items, search, selectedCategoryId]);
  const detailProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return (productListQuery.data?.items ?? [])
      .filter((product) => !selectedCategoryId || product.categoryId === selectedCategoryId)
      .filter((product) => !keyword || product.productName.toLowerCase().includes(keyword))
      .filter((product) => mapProductToModels(product).length === 0)
      .slice(0, detailLimit);
  }, [detailLimit, productListQuery.data?.items, search, selectedCategoryId]);
  const projectCatalogVersionDetailQueries = useQueries({
    queries: projectCatalogVersions.map(({ product, version }) => ({
      enabled: Boolean(currentProjectId && version.productVersionId),
      queryFn: async () => {
        const response = await getProjectCatalogProductVersion({
          productVersionId: version.productVersionId,
          projectId: currentProjectId ?? '',
        });

        return { product, version: response };
      },
      queryKey: productQueryKeys.projectCatalogVersion(currentProjectId ?? '', version.productVersionId),
      staleTime: 10 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
    })),
  });
  const productDetailQueries = useQueries({
    queries: detailProducts.map((product) => ({
      enabled: Boolean(product.productId) && !currentProjectId,
      queryFn: () => getProductById(product.productId),
      queryKey: productQueryKeys.detail(product.productId),
      staleTime: 10 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
    })),
  });
  const [activeLevel, setActiveLevel] = useState<BuildingLevelVisibility>('all');
  const [designPanel, setDesignPanel] = useState<BuildingDesignPanel>('products');
  const [isCatalogPanelCollapsed, setIsCatalogPanelCollapsed] = useState(false);
  const [selectedFloorMaterialId, setSelectedFloorMaterialId] = useState('wood-floor');
  const [selectedWallMaterialId, setSelectedWallMaterialId] = useState('wall-base');
  const [placedProducts, setPlacedProducts] = useState<PlacedBuildingProduct[]>(() => placedProductsDraft?.placedProducts ?? []);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(() => placedProductsDraft?.selectedProductId ?? null);
  const [freeRotateProductId, setFreeRotateProductId] = useState<string | null>(null);
  const [showProductInfo, setShowProductInfo] = useState(false);
  const [message, setMessage] = useState('');
  const skipNextDraftPersistRef = useRef(false);
  const appliedRemoteProductsKeyRef = useRef<string | null>(null);
  const appliedRemoteSceneKeyRef = useRef<string | null>(null);

  const catalogModels = useMemo(() => {
    const models = new Map<string, BuildingProductModel>();

    if (currentProjectId) {
      projectCatalogVersionDetailQueries.forEach((query) => {
        if (!query.data) {
          return;
        }

        const model = mapProjectCatalogVersionToModel(query.data.product, query.data.version);

        if (model) {
          models.set(model.id, model);
        }
      });

      return [...models.values()];
    }

    (productListQuery.data?.items ?? []).forEach((product) => {
      if (selectedCategoryId && product.categoryId !== selectedCategoryId) {
        return;
      }

      if (search.trim() && !product.productName.toLowerCase().includes(search.trim().toLowerCase())) {
        return;
      }

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
  }, [
    currentProjectId,
    productDetailQueries,
    productListQuery.data?.items,
    projectCatalogVersionDetailQueries,
    search,
    selectedCategoryId,
  ]);

  const customModels = useMemo(
    () =>
      (customizationRequestsQuery.data?.items ?? []).flatMap((request) =>
        (request.versions ?? [])
          .map((version) => mapCustomVersionToBuildingModel(request, version))
          .filter((model): model is BuildingProductModel => Boolean(model)),
      ),
    [customizationRequestsQuery.data?.items],
  );

  const availableModels = useMemo(() => {
    const models = new Map<string, BuildingProductModel>();

    [...catalogModels, ...customModels].forEach((model) => {
      models.set(model.productVersionId ? `version-${model.productVersionId}` : model.id, model);
    });

    return [...models.values()];
  }, [catalogModels, customModels]);

  const modelsById = useMemo(
    () => new Map(availableModels.map((model) => [model.id, model])),
    [availableModels],
  );

  const modelsByVersionId = useMemo(
    () => new Map(availableModels.flatMap((model) => model.productVersionId ? [[model.productVersionId, model] as const] : [])),
    [availableModels],
  );
  const isCatalogLoading = currentProjectId
    ? projectCatalogQuery.isLoading || (projectCatalogVersionDetailQueries.some((query) => query.isLoading) && catalogModels.length === 0)
    : productListQuery.isLoading || (productDetailQueries.some((query) => query.isLoading) && catalogModels.length === 0);
  const catalogError = currentProjectId
    ? projectCatalogQuery.error ?? projectCatalogVersionDetailQueries.find((query) => query.isError)?.error
    : productListQuery.error ?? productDetailQueries.find((query) => query.isError)?.error;
  const hasMoreCatalogModels = currentProjectId
    ? detailLimit < (projectCatalogQuery.data?.items ?? []).flatMap((product) => product.eligibleVersions).length
    : detailLimit < (productListQuery.data?.items.length ?? 0);

  useEffect(() => {
    if (sceneId || !routeState?.areas?.length) {
      return;
    }

    setSceneData(createBuildingTestSceneFromProjectFloorAreas(routeState.areas));
  }, [routeState?.areas, sceneId, setSceneData]);

  useEffect(() => {
    if (!routeState?.transientPlacedProducts) {
      return;
    }

    appliedRemoteProductsKeyRef.current = `transient:${Date.now()}`;
    skipNextDraftPersistRef.current = true;
    setPlacedProducts(routeState.transientPlacedProducts);
    setSelectedProductId(routeState.transientSelectedProductId ?? null);
  }, [routeState?.transientPlacedProducts, routeState?.transientSelectedProductId]);

  useEffect(() => {
    if (!roomPlannerSceneQuery.data) {
      return;
    }

    const remoteKey = `${sceneId ?? 'local'}:${roomPlannerSceneQuery.data.mongoSceneId ?? 'template'}:${roomPlannerSceneQuery.data.lastSavedAt ?? 'unsaved'}`;
    const hydratedScene = hydrateBuildingRoomPlannerPayload(roomPlannerSceneQuery.data);

    if (!hydratedScene.sceneData) {
      return;
    }

    if (!shouldKeepSceneDraft(roomPlannerSceneQuery.data.lastSavedAt) && appliedRemoteSceneKeyRef.current !== remoteKey) {
      appliedRemoteSceneKeyRef.current = remoteKey;
      setRemoteSceneData(hydratedScene.sceneData, roomPlannerSceneQuery.data.lastSavedAt);
    }

    if (!shouldKeepPlacedProductsDraft(roomPlannerSceneQuery.data.lastSavedAt) && appliedRemoteProductsKeyRef.current !== remoteKey) {
      const hasUnresolvedCatalogModel = hydratedScene.placedProducts.some((product) =>
        !product.modelUrl && !modelsByVersionId.has(product.productVersionId ?? product.id),
      );

      if (!hasUnresolvedCatalogModel) {
        const resolvedProducts = hydratedScene.placedProducts
          .map((product) => {
            const catalogModel = modelsByVersionId.get(product.productVersionId ?? product.id);

            if (!catalogModel && !product.modelUrl) {
              return null;
            }

            return {
              ...(catalogModel ?? {}),
              ...product,
              fileId: product.fileId ?? catalogModel?.fileId,
              modelSnapshot: product.modelSnapshot ?? (catalogModel
                ? {
                    format: catalogModel?.modelUrl.split('?')[0].split('.').pop()?.toUpperCase() ?? null,
                    modelFileId: catalogModel?.fileId ?? null,
                    modelUrlSnapshot: catalogModel?.modelUrl ?? product.modelUrl,
                  }
                : undefined),
              modelUrl: product.modelUrl || catalogModel?.modelUrl || '',
              name: product.name ?? catalogModel?.name ?? 'Furniture',
              productId: product.productId ?? catalogModel?.productId,
              thumbnailUrl: product.thumbnailUrl ?? catalogModel?.thumbnailUrl,
            } as PlacedBuildingProduct;
          })
          .filter((product): product is PlacedBuildingProduct => Boolean(product?.modelUrl));

        appliedRemoteProductsKeyRef.current = remoteKey;
        skipNextDraftPersistRef.current = true;
        setPlacedProducts(resolvedProducts);
        setSelectedProductId(hydratedScene.selectedProductId ?? null);
      }
    }

    if (hydratedScene.activeLevel && hydratedScene.activeLevel !== 'site' && sceneData.building.levels.some((level) => level.id === hydratedScene.activeLevel)) {
      setActiveLevel(hydratedScene.activeLevel);
    }
  }, [modelsByVersionId, roomPlannerSceneQuery.data, sceneData.building.levels, sceneId, setRemoteSceneData, shouldKeepSceneDraft, shouldKeepPlacedProductsDraft]);

  useEffect(() => {
    if (!placedProductsDraft?.placedProducts.length) {
      return;
    }

    skipNextDraftPersistRef.current = true;
    setPlacedProducts(placedProductsDraft.placedProducts);
    setSelectedProductId(placedProductsDraft.selectedProductId);
  }, [placedProductsDraft?.placedProducts, placedProductsDraft?.selectedProductId, placedProductsDraft?.updatedAt]);

  useEffect(() => {
    if (skipNextDraftPersistRef.current) {
      skipNextDraftPersistRef.current = false;
      return;
    }

    persistPlacedProductsDraft(placedProducts, selectedProductId);
  }, [persistPlacedProductsDraft, placedProducts, selectedProductId]);

  const levelOptions = useMemo<Array<{ label: string; value: BuildingLevelVisibility }>>(
    () => [
      { label: 'All', value: 'all' },
      { label: 'Yard', value: 'site' },
      ...sceneData.building.levels.map((level) => ({
        label: level.label,
        value: level.id,
      })),
    ],
    [sceneData.building.levels],
  );

  useEffect(() => {
    setDetailLimit(DETAIL_BATCH_SIZE);
  }, [search, selectedCategoryId]);

  useEffect(() => {
    if (activeLevel === 'all' || activeLevel === 'site') {
      return;
    }

    if (!sceneData.building.levels.some((level) => level.id === activeLevel)) {
      setActiveLevel('all');
    }
  }, [activeLevel, sceneData.building.levels]);

  const filteredModels = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const sourceModels = productSourceTab === 'custom' ? customModels : catalogModels;
    const categoryFilteredModels = selectedCategoryId
      ? sourceModels.filter((model) => model.categoryId === selectedCategoryId)
      : sourceModels;

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
  }, [catalogModels, customModels, productSourceTab, search, selectedCategoryId]);

  const categoryCards = useMemo(() => {
    const counts = new Map<string, number>();

    catalogModels.forEach((model) => {
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
  }, [catalogModels, categoriesQuery.data?.items]);

  const selectedProduct = useMemo(
    () => placedProducts.find((product) => product.sceneObjectId === selectedProductId) ?? null,
    [placedProducts, selectedProductId],
  );
  const canSaveRoomPlannerStatus =
    !proposalDetailQuery.data?.status ||
    ROOM_PLANNER_SAVE_STATUSES.includes(proposalDetailQuery.data.status as (typeof ROOM_PLANNER_SAVE_STATUSES)[number]);
  const isSavingRoomPlanner = saveRoomPlannerSceneMutation.isPending || syncProposalItemsMutation.isPending;
  const returnProjectId = routeState?.projectId ?? roomPlannerSceneQuery.data?.projectId ?? proposalDetailQuery.data?.projectId;
  const returnProposalId = routeState?.proposalId ?? roomPlannerSceneQuery.data?.proposalId ?? currentProposalId;
  const proposalReturnPath = routeState?.returnTo ??
    (returnProjectId && returnProposalId
      ? `/designer/projects/${returnProjectId}/proposals/${returnProposalId}`
      : '/designer/projects');

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
        unit: 'cm',
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
      proposalItemId: null,
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

  function moveProduct(
    sceneObjectId: string,
    position: Vector3State,
    surfaceId: string,
    levelId: BuildingLevelVisibility,
  ) {
    setPlacedProducts((currentProducts) => {
      let changed = false;
      const nextProducts = currentProducts.map((product) => {
        if (product.sceneObjectId !== sceneObjectId) {
          return product;
        }

        if (product.levelId === levelId && product.surfaceId === surfaceId && isSameVector(product.position, position)) {
          return product;
        }

        changed = true;

        return {
          ...product,
          levelId,
          position,
          surfaceId,
        };
      });

      return changed ? nextProducts : currentProducts;
    });
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

  function changeSelectedProductPlacement(placementMode: ProductPlacementMode) {
    if (!selectedProduct) {
      return;
    }

    const surface = sceneData.surfaces.find((candidate) => candidate.id === selectedProduct.surfaceId);

    updateSelectedProduct({
      heightOffset: placementMode === 'FLOOR' ? surface?.elevation ?? 0 : selectedProduct?.position.y ?? 0,
      mountedWallId: placementMode === 'WALL_MOUNTED' ? selectedProduct?.mountedWallId ?? null : null,
      placementMode,
      position: {
        ...selectedProduct.position,
        y: placementMode === 'FLOOR' ? surface?.elevation ?? 0 : selectedProduct.position.y,
      },
      supportObjectId: placementMode === 'ON_OBJECT' ? selectedProduct?.supportObjectId ?? null : null,
    });
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

  function setSelectedProductRotationY(degrees: number) {
    updateSelectedProduct({
      rotation: {
        ...(selectedProduct?.rotation ?? { x: 0, y: 0, z: 0 }),
        y: Number(toRadians(degrees).toFixed(4)),
      },
    });
  }

  function stepSelectedProductHeight(step: number) {
    if (!selectedProduct) {
      return;
    }

    const nextY = Math.max(0, Number((selectedProduct.position.y + step).toFixed(2)));

    updateSelectedProduct({
      heightOffset: nextY,
      placementMode: selectedProduct.placementMode === 'FLOOR' && nextY > 0 ? 'CUSTOM_HEIGHT' : selectedProduct.placementMode ?? 'CUSTOM_HEIGHT',
      position: {
        ...selectedProduct.position,
        y: nextY,
      },
    });
  }

  function resetSelectedProductToSurface() {
    if (!selectedProduct) {
      return;
    }

    const surface = sceneData.surfaces.find((candidate) => candidate.id === selectedProduct.surfaceId);
    const nextY = surface?.elevation ?? 0;

    updateSelectedProduct({
      heightOffset: nextY,
      mountedWallId: null,
      placementMode: 'FLOOR',
      position: {
        ...selectedProduct.position,
        y: nextY,
      },
      supportObjectId: null,
    });
  }

  function stepSelectedProductScale(axis: keyof Vector3State, step: number) {
    if (!selectedProduct) {
      return;
    }

    const currentScale = selectedProduct.scale ?? { x: 1, y: 1, z: 1 };

    updateSelectedProduct({
      scale: {
        ...currentScale,
        [axis]: Number(Math.min(5, Math.max(0.1, currentScale[axis] + step)).toFixed(2)),
      },
    });
  }

  function duplicateSelectedProduct() {
    if (!selectedProduct) {
      return;
    }

    const duplicatedProduct: PlacedBuildingProduct = {
      ...selectedProduct,
      position: {
        ...selectedProduct.position,
        x: Number((selectedProduct.position.x + 0.45).toFixed(2)),
        z: Number((selectedProduct.position.z + 0.45).toFixed(2)),
      },
      sceneObjectId: createSceneObjectId(placedProducts),
    };

    setPlacedProducts((currentProducts) => [...currentProducts, duplicatedProduct]);
    setSelectedProductId(duplicatedProduct.sceneObjectId);
  }

  function deleteSelectedProduct() {
    if (!selectedProductId) {
      return;
    }

    setPlacedProducts((currentProducts) => currentProducts.filter((product) => product.sceneObjectId !== selectedProductId));
    setSelectedProductId(null);
    setFreeRotateProductId(null);
  }

  function resetScene() {
    resetSceneData();
    setPlacedProducts([]);
    setSelectedProductId(null);
    setMessage('Prototype scene reset.');
  }

  async function saveScene() {
    if (!sceneId) {
      setMessage('Open this planner from a proposal scene before saving to backend.');
      return;
    }

    if (!canSaveRoomPlannerStatus) {
      setMessage(`Room Planner can be saved only when proposal is ${ROOM_PLANNER_SAVE_STATUSES.join(', ')}.`);
      return;
    }

    setMessage('');

    try {
      const buildPayload = (products: PlacedBuildingProduct[]) => createBuildingRoomPlannerPayload({
        activeLevel,
        placedProducts: products,
        sceneData,
        sceneId,
        selectedProductId,
      });
      const payload = buildPayload(placedProducts);
      const result = await saveRoomPlannerSceneMutation.mutateAsync({
        payload,
        sceneId,
      });

      if (currentProposalId) {
        const syncResult = await syncProposalItemsMutation.mutateAsync({
          proposalId: currentProposalId,
          sceneId,
        });
        const productsWithProposalItems = applyProposalItemIds(placedProducts, syncResult.items);

        if (syncResult.items.length > 0) {
          setPlacedProducts(productsWithProposalItems);

          await saveRoomPlannerSceneMutation.mutateAsync({
            payload: buildPayload(productsWithProposalItems),
            sceneId,
          });
        }

        clearPlacedProductsDraft();
        setMessage(`Saved and synced ${syncResult.items.length} proposal item(s) at ${new Date(result.lastSavedAt).toLocaleString()}.`);
        return;
      }

      clearPlacedProductsDraft();
      setMessage(`Saved at ${new Date(result.lastSavedAt).toLocaleString()}. Open from a proposal to sync proposal items.`);
    } catch (error) {
      setMessage(getProposalServiceResultMessage(error));
    }
  }

  function selectProduct(sceneObjectId: string | null) {
    setSelectedProductId(sceneObjectId);
    setFreeRotateProductId(null);
    setShowProductInfo(false);
  }

  const selectedProductScale = selectedProduct?.scale ?? { x: 1, y: 1, z: 1 };
  const selectedProductRotationDegrees = selectedProduct ? normalizeDegrees(toDegrees(selectedProduct.rotation?.y ?? 0)) : 0;

  return (
    <main className="building-test-page">
      <header className="building-test-header">
        <div className="building-test-header-main">
          <RouterLink
            className="building-test-back-link"
            state={{
              ...routeState,
              transientPlacedProducts: placedProducts,
              transientSelectedProductId: selectedProductId,
            }}
            to={proposalReturnPath}
          >
            <IconArrowLeft size={17} /> Back
          </RouterLink>
          <div className="building-test-title">
            <span><IconBuilding size={16} /> FurniSpace Studio</span>
            <h1>3D Room Planner</h1>
          </div>
        </div>
        <nav>
          <RouterLink
            className="building-test-blueprint-link"
            state={{
              ...routeState,
              transientPlacedProducts: placedProducts,
              transientSelectedProductId: selectedProductId,
            }}
            to={sceneId ? `${roomPlannerBasePath}/blueprint` : '/3d-building-test/blueprint'}
          >
            <IconRulerMeasure size={17} />
            <span>2D Blueprint</span>
          </RouterLink>
          <button
            className="building-test-save-button"
            disabled={isSavingRoomPlanner}
            title={!sceneId ? 'Open this planner from a proposal scene to save to backend.' : undefined}
            type="button"
            onClick={() => void saveScene()}
          >
            <IconDeviceFloppy size={17} />
            <span>{isSavingRoomPlanner ? 'Saving...' : 'Save design'}</span>
          </button>
          <button className="building-test-reset-button" type="button" onClick={resetScene}>
            <IconRefresh size={17} />
            <span>Reset</span>
          </button>
        </nav>
      </header>

      <section className={isCatalogPanelCollapsed ? 'building-test-shell is-catalog-collapsed' : 'building-test-shell'}>
        <aside className={isCatalogPanelCollapsed ? 'building-test-sidebar is-catalog-collapsed' : 'building-test-sidebar'}>
          <div className="building-sidebar-rail">
            <section className="building-test-panel building-scene-levels-panel">
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
            {designPanel === 'products' && productSourceTab === 'catalog' ? (
              <section className="building-test-panel building-catalog-panel">
                <div className="building-test-panel-heading">
                  <strong>Catalog</strong>
                  <span>{categoryCards.length}</span>
                </div>
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
              </section>
            ) : null}
          </div>
          <button
            aria-expanded={!isCatalogPanelCollapsed}
            aria-label={isCatalogPanelCollapsed ? 'Show product panel' : 'Hide product panel'}
            className="building-catalog-collapse-button"
            title={isCatalogPanelCollapsed ? 'Show products' : 'Hide products'}
            type="button"
            onClick={() => setIsCatalogPanelCollapsed((isCollapsed) => !isCollapsed)}
          >
            {isCatalogPanelCollapsed ? <IconChevronRight size={18} /> : <IconChevronLeft size={18} />}
          </button>

          <div className="building-design-column">
            <div className="building-content-tabs">
              <button className={designPanel === 'products' ? 'is-active' : ''} type="button" onClick={() => setDesignPanel('products')}>
                <IconCategory size={15} /> Products
              </button>
              <button
                aria-disabled="true"
                className="is-locked"
                disabled
                title="Materials will be available when the API is ready."
                type="button"
              >
                <IconPalette size={15} /> Materials <IconLock className="building-content-tab-lock" size={13} />
              </button>
            </div>

            {designPanel === 'products' && (
            <section className="building-test-panel building-design-panel">
            <div className="building-test-panel-heading">
              <strong>{productSourceTab === 'custom' ? 'Custom Products' : 'Products'}</strong>
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

            <div className="building-product-source-tabs" role="tablist" aria-label="Product source">
              <button
                className={productSourceTab === 'catalog' ? 'is-active' : ''}
                role="tab"
                type="button"
                onClick={() => {
                  setProductSourceTab('catalog');
                  setSelectedCategoryId(null);
                  setSearch('');
                  setDetailLimit(DETAIL_BATCH_SIZE);
                }}
              >
                Catalog
              </button>
              <button
                className={productSourceTab === 'custom' ? 'is-active' : ''}
                role="tab"
                type="button"
                onClick={() => {
                  setProductSourceTab('custom');
                  setSelectedCategoryId(null);
                  setSearch('');
                }}
              >
                Custom
              </button>
            </div>

            {productSourceTab === 'catalog' && isCatalogLoading ? (
              <div className="building-test-status">Loading product models...</div>
            ) : null}
            {productSourceTab === 'catalog' && catalogError ? (
              <div className="building-test-status is-error">
                {getProductServiceResultMessage(catalogError)}
              </div>
            ) : null}
            {productSourceTab === 'custom' && customizationRequestsQuery.isLoading ? (
              <div className="building-test-status">Loading custom product versions...</div>
            ) : null}
            {productSourceTab === 'custom' && customizationRequestsQuery.isError ? (
              <div className="building-test-status is-error">
                {getCustomizationRequestServiceResultMessage(customizationRequestsQuery.error)}
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
                  </div>
                </article>
              ))}
              {productSourceTab === 'catalog' && !isCatalogLoading && filteredModels.length === 0 ? (
                <div className="building-test-status">No ready 3D product models found.</div>
              ) : null}
              {productSourceTab === 'custom' && !customizationRequestsQuery.isLoading && !customizationRequestsQuery.isError && filteredModels.length === 0 ? (
                <div className="building-test-status">
                  {search.trim() ? 'No custom versions match your search.' : 'No custom product versions with ready MODEL_3D files are available for this project.'}
                </div>
              ) : null}
            </div>
            {productSourceTab === 'catalog' && hasMoreCatalogModels ? (
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
              <section className="building-test-panel building-design-panel">
              <div className="building-test-panel-heading">
                <strong>Materials</strong>
                <span>Floor / wall presets</span>
              </div>
              <div className="building-material-grid">
                <div className="building-material-group">
                  <h3>Flooring</h3>
                  {FLOOR_MATERIALS.map((material) => (
                    <button
                      className={selectedFloorMaterialId === material.id ? 'building-material-option is-selected' : 'building-material-option'}
                      key={material.id}
                      type="button"
                      onClick={() => setSelectedFloorMaterialId(material.id)}
                    >
                      <span style={{ backgroundColor: material.fallbackColor }} />
                      <strong>{material.label}</strong>
                      {material.textureUrl ? <small>Texture asset</small> : <small>Color swatch</small>}
                    </button>
                  ))}
                </div>
                <div className="building-material-group">
                  <h3>Wall Paint / Wallpaper</h3>
                  {WALL_MATERIALS.map((material) => (
                    <button
                      className={selectedWallMaterialId === material.id ? 'building-material-option is-selected' : 'building-material-option'}
                      key={material.id}
                      type="button"
                      onClick={() => setSelectedWallMaterialId(material.id)}
                    >
                      <span style={{ backgroundColor: material.fallbackColor }} />
                      <strong>{material.label}</strong>
                      {material.textureUrl ? <small>Texture asset</small> : <small>Color swatch</small>}
                    </button>
                  ))}
                </div>
              </div>
              </section>
            )}
          </div>
        </aside>

        <section className="building-test-workspace">
          <div className="building-test-toolbar">
            <div>
              <strong>{levelOptions.find((level) => level.value === activeLevel)?.label ?? 'All'} View</strong>
              <span>Drag models onto the yard, floor 1, balcony, or floor 2 surface.</span>
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
            onProductSelect={selectProduct}
          />

          {selectedProduct ? (
            <div className="building-object-floating-menu">
              <div className="building-object-floating-header">
                <strong>{selectedProduct.name}</strong>
                <button aria-label="Close object menu" title="Close" type="button" onClick={() => selectProduct(null)}>
                  <IconX size={17} />
                </button>
              </div>

              <div className="building-floating-actions">
                <button type="button" onClick={rotateSelectedProduct}>Rotate 45</button>
                <button type="button" onClick={() => setFreeRotateProductId(selectedProduct.sceneObjectId)}>Free Rotate</button>
                <button type="button" onClick={() => setShowProductInfo((isOpen) => !isOpen)}>Info</button>
                <button type="button" onClick={duplicateSelectedProduct}>Duplicate</button>
                <button type="button" onClick={() => updateSelectedProduct({ locked: !(selectedProduct.locked ?? false) })}>
                  {selectedProduct.locked ? 'Unlock' : 'Lock'}
                </button>
                <button type="button" onClick={() => updateSelectedProduct({ visible: !(selectedProduct.visible ?? true) })}>
                  {selectedProduct.visible === false ? 'Show' : 'Hide'}
                </button>
                <button className="is-danger" type="button" onClick={deleteSelectedProduct}>Delete</button>
              </div>

              {showProductInfo ? (
                <SelectedProductInfoBox
                  levelLabel={levelOptions.find((level) => level.value === selectedProduct.levelId)?.label ?? selectedProduct.levelId}
                  product={selectedProduct}
                  rotationDegrees={selectedProductRotationDegrees}
                />
              ) : null}

              {freeRotateProductId === selectedProduct.sceneObjectId ? (
                <div className="building-object-rotate-box">
                  <label>
                    <span>Rotation Y: {selectedProductRotationDegrees} deg</span>
                    <input
                      max="360"
                      min="0"
                      type="range"
                      value={selectedProductRotationDegrees}
                      onChange={(event) => setSelectedProductRotationY(Number(event.target.value))}
                    />
                  </label>
                  <button type="button" onClick={() => setFreeRotateProductId(null)}>Done</button>
                </div>
              ) : null}

              <div className="building-floating-placement">
                <select
                  value={selectedProduct.placementMode ?? 'FLOOR'}
                  onChange={(event) => changeSelectedProductPlacement(event.target.value as ProductPlacementMode)}
                >
                  {placementModes.map((mode) => (
                    <option key={mode.value} value={mode.value}>{mode.label}</option>
                  ))}
                </select>
                <button type="button" onClick={() => stepSelectedProductHeight(0.1)}>Height +</button>
                <button type="button" onClick={() => stepSelectedProductHeight(-0.1)}>Height -</button>
                <button type="button" onClick={resetSelectedProductToSurface}>To Surface</button>
              </div>

              <div className="building-scale-controls">
                {(['x', 'y', 'z'] as const).map((axis) => (
                  <div key={axis}>
                    <span>{axis.toUpperCase()}</span>
                    <button aria-label={`Decrease scale ${axis}`} type="button" onClick={() => stepSelectedProductScale(axis, -0.1)}>-</button>
                    <output>{selectedProductScale[axis].toFixed(2)}</output>
                    <button aria-label={`Increase scale ${axis}`} type="button" onClick={() => stepSelectedProductScale(axis, 0.1)}>+</button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {message && <div className="building-test-message">{message}</div>}
        </section>
      </section>
    </main>
  );
}

function SelectedProductInfoBox({
  levelLabel,
  product,
  rotationDegrees,
}: Readonly<{
  levelLabel: string;
  product: PlacedBuildingProduct;
  rotationDegrees: number;
}>) {
  const productVersionId = product.productVersionId ?? null;
  const versionQuery = useProductVersionDetail(productVersionId ?? undefined);
  const version = versionQuery.data ?? null;

  return (
    <div className="building-object-info-box">
      {versionQuery.isLoading ? <p className="building-object-info-state">Loading product version...</p> : null}
      {versionQuery.isError ? (
        <p className="building-object-info-state is-error">{getProductServiceResultMessage(versionQuery.error)}</p>
      ) : null}

      <dl>
        <div><dt>Product name</dt><dd>{version?.productName ?? product.name}</dd></div>
        {version ? <div><dt>Version</dt><dd>{version.versionName}</dd></div> : null}
        {version ? <div><dt>Version code</dt><dd>{version.versionCode}</dd></div> : null}
        {version ? <div><dt>Version type</dt><dd>{version.versionType}</dd></div> : null}
        {version ? <div><dt>Material</dt><dd>{version.material || '-'}</dd></div> : null}
        {version ? <div><dt>Color</dt><dd>{version.color || '-'}</dd></div> : null}
        {version ? <div><dt>Size</dt><dd>{formatVersionDimensions(version)}</dd></div> : null}
        {version ? <div><dt>Estimated price</dt><dd>{formatVersionPrice(version.estimatedPrice)}</dd></div> : null}
        {version ? <div><dt>Status</dt><dd>{version.status}</dd></div> : null}
        <div><dt>Level</dt><dd>{levelLabel}</dd></div>
        <div><dt>Position</dt><dd>{product.position.x}, {product.position.y}, {product.position.z}</dd></div>
        <div><dt>Rotation Y</dt><dd>{rotationDegrees} deg</dd></div>
        <div><dt>Placement</dt><dd>{product.placementMode ?? 'FLOOR'}</dd></div>
      </dl>
    </div>
  );
}

function formatVersionDimensions(version: ProductVersionDto) {
  const unit = version.dimensionUnit || 'cm';
  const parts = [
    version.width ? `W ${version.width}` : null,
    version.depth ? `D ${version.depth}` : null,
    version.height ? `H ${version.height}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? `${parts.join(' x ')} ${unit}` : '-';
}

function formatVersionPrice(price: number | null) {
  if (price == null) {
    return '-';
  }

  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(price);
}
