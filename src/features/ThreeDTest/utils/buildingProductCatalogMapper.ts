import type { BuildingProductModel, PlacedBuildingProduct } from '@/features/ThreeDTest/schemas/buildingScene.types';
import type { CatalogFileDto, ProductDetailDto, ProductListItemDto, ProductVersionDto } from '@/services/api/products';

const API_PRODUCT_DEFAULT_SCALE = 2.6;
const EMPTY_THUMBNAIL = '';

function getCatalogModelFile(files: CatalogFileDto[] | undefined) {
  return files?.find((file) => file.fileType === 'MODEL_3D') ?? null;
}

function getVersionThumbnail(product: ProductListItemDto, version: ProductVersionDto) {
  return version.thumbnail?.fileUrl ??
    product.thumbnail?.fileUrl ??
    version.files?.find((file) => file.fileType === 'PRODUCT_PREVIEW')?.fileUrl ??
    EMPTY_THUMBNAIL;
}

function mapVersionToBuildingModel(product: ProductListItemDto, version: ProductVersionDto): BuildingProductModel | null {
  const modelFile = getCatalogModelFile(version.files);

  if (!modelFile?.fileUrl) {
    return null;
  }

  return {
    categoryId: product.categoryId,
    categoryName: product.categoryName,
    color: version.color,
    depth: version.depth,
    fileId: modelFile.fileId,
    height: version.height,
    id: `building-test-${version.productVersionId}`,
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

export function mapProductToBuildingModels(product: ProductDetailDto | ProductListItemDto) {
  const versions = 'versions' in product ? product.versions : product.defaultVersion ? [product.defaultVersion] : [];

  return versions
    .map((version) => mapVersionToBuildingModel(product, version))
    .filter((model): model is BuildingProductModel => Boolean(model));
}

export function createBuildingModelVersionMap(products: Array<ProductDetailDto | ProductListItemDto | null | undefined>) {
  const modelsByVersionId = new Map<string, BuildingProductModel>();

  products.forEach((product) => {
    if (!product) {
      return;
    }

    mapProductToBuildingModels(product).forEach((model) => {
      if (model.productVersionId) {
        modelsByVersionId.set(model.productVersionId, model);
      }
    });
  });

  return modelsByVersionId;
}

export function resolvePlacedBuildingProducts(
  products: PlacedBuildingProduct[],
  modelsByVersionId: Map<string, BuildingProductModel>,
) {
  return products
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
              format: catalogModel.modelUrl.split('?')[0].split('.').pop()?.toUpperCase() ?? null,
              modelFileId: catalogModel.fileId ?? null,
              modelUrlSnapshot: catalogModel.modelUrl,
            }
          : undefined),
        modelUrl: product.modelUrl || catalogModel?.modelUrl || '',
        name: product.name ?? catalogModel?.name ?? 'Furniture',
        productId: product.productId ?? catalogModel?.productId,
        thumbnailUrl: product.thumbnailUrl ?? catalogModel?.thumbnailUrl,
      } as PlacedBuildingProduct;
    })
    .filter((product): product is PlacedBuildingProduct => Boolean(product?.modelUrl));
}
