import type { CatalogFileDto, ProductDetailDto, ProductListItemDto, ProductVersionDto } from '@/services/api';

type FileLike = Partial<CatalogFileDto> & {
  displayOrder?: number | null;
  isCover?: boolean | null;
  publicUrl?: string | null;
  url?: string | null;
};

export function isPublicStandardVersion(version: ProductVersionDto | null | undefined): version is ProductVersionDto {
  return Boolean(
    version
      && version.isPublic
      && !version.isProjectSpecific
      && (version.versionType === 'STANDARD' || version.isDefault),
  );
}

export function getDisplayableVersions(product: ProductDetailDto | null | undefined) {
  return dedupeVersions([
    product?.defaultVersion,
    ...(product?.versions ?? []),
  ].filter(isPublicStandardVersion));
}

export function getAllProductVersions(product: ProductDetailDto | null | undefined) {
  return dedupeVersions([
    product?.defaultVersion,
    ...(product?.versions ?? []),
  ].filter(isProductVersion));
}

export function getPublicDefaultVersion(product: ProductDetailDto | ProductListItemDto | null | undefined) {
  if (isPublicStandardVersion(product?.defaultVersion)) {
    return product?.defaultVersion ?? null;
  }

  if ('versions' in (product ?? {})) {
    return getDisplayableVersions(product as ProductDetailDto).find((version) => version.isDefault) ?? getDisplayableVersions(product as ProductDetailDto)[0] ?? null;
  }

  return null;
}

export function getCatalogFileUrl(file: CatalogFileDto | null | undefined) {
  const fileLike = file as FileLike | null | undefined;

  return fileLike?.fileUrl ?? fileLike?.publicUrl ?? fileLike?.url ?? null;
}

export function getProductThumbnailImage(product: ProductDetailDto | ProductListItemDto | null | undefined) {
  return getCatalogFileUrl(product?.thumbnail)
    ?? getProductPreviewFiles(product).map(getCatalogFileUrl).find(Boolean)
    ?? getVersionPreviewImage(getPublicDefaultVersion(product));
}

export function getVersionPreviewImage(version: ProductVersionDto | null | undefined) {
  return getCatalogFileUrl(version?.thumbnail)
    ?? getPreferredPreviewFile(version?.files).map(getCatalogFileUrl).find(Boolean)
    ?? null;
}

export function getProductCoverImage(product: ProductDetailDto | ProductListItemDto | null | undefined, version?: ProductVersionDto | null) {
  return getProductThumbnailImage(product)
    ?? getVersionPreviewImage(version)
    ?? getVersionPreviewImage(getPublicDefaultVersion(product));
}

export function getProductPreviewFiles(product: ProductDetailDto | ProductListItemDto | null | undefined): CatalogFileDto[] {
  if (!product) {
    return [];
  }

  const productFiles = 'files' in product ? product.files : [];

  return getPreferredPreviewFile([
    product.thumbnail,
    ...productFiles,
    getPublicDefaultVersion(product)?.thumbnail,
    ...(getPublicDefaultVersion(product)?.files ?? []),
  ]);
}

export function getVersionModelFile(version: ProductVersionDto | null | undefined) {
  return version?.files.find((file) => file.fileType === 'MODEL_3D') ?? null;
}

export function formatCatalogPrice(value: number | null | undefined) {
  if (value == null) {
    return 'Contact for price';
  }

  return `${new Intl.NumberFormat('vi-VN').format(value)} VND`;
}

function getPreferredPreviewFile(files: Array<CatalogFileDto | null | undefined> | null | undefined) {
  const seenFileKeys = new Set<string>();

  return (files ?? [])
    .filter((file): file is CatalogFileDto => Boolean(file && isPreviewImageFile(file) && getCatalogFileUrl(file)))
    .filter((file) => {
      const fileKey = getCatalogFileKey(file);

      if (seenFileKeys.has(fileKey)) {
        return false;
      }

      seenFileKeys.add(fileKey);
      return true;
    })
    .sort(comparePreviewFiles);
}

function isPreviewImageFile(file: CatalogFileDto) {
  return file.fileType === 'PRODUCT_PREVIEW';
}

function isProductVersion(version: ProductVersionDto | null | undefined): version is ProductVersionDto {
  return Boolean(version);
}

function comparePreviewFiles(left: CatalogFileDto, right: CatalogFileDto) {
  const leftLike = left as FileLike;
  const rightLike = right as FileLike;

  if (Boolean(leftLike.isCover) !== Boolean(rightLike.isCover)) {
    return leftLike.isCover ? -1 : 1;
  }

  return (leftLike.displayOrder ?? Number.MAX_SAFE_INTEGER) - (rightLike.displayOrder ?? Number.MAX_SAFE_INTEGER);
}

function getCatalogFileKey(file: CatalogFileDto) {
  const fileLike = file as FileLike;

  return file.fileId || file.fileLinkId || getCatalogFileUrl(file) || fileLike.originalFileName || '';
}

function dedupeVersions(versions: ProductVersionDto[]) {
  const seenIds = new Set<string>();

  return versions.filter((version) => {
    if (seenIds.has(version.productVersionId)) {
      return false;
    }

    seenIds.add(version.productVersionId);
    return true;
  });
}
