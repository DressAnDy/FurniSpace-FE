import type { CatalogFileDto, ProductDetailDto, ProductListItemDto, ProductVersionDto } from '@/services/api';

type FileLike = CatalogFileDto & {
  publicUrl?: string | null;
  url?: string | null;
};

export function isPublicStandardVersion(version: ProductVersionDto | null | undefined) {
  return Boolean(
    version
      && version.versionType === 'STANDARD'
      && version.isPublic
      && !version.isProjectSpecific,
  );
}

export function getDisplayableVersions(product: ProductDetailDto | null | undefined) {
  return (product?.versions ?? []).filter(isPublicStandardVersion);
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

function isProductPreviewFile(file: CatalogFileDto | null | undefined) {
  return Boolean(file && file.fileType === 'PRODUCT_PREVIEW');
}

export function getProductThumbnailImage(product: ProductDetailDto | ProductListItemDto | null | undefined) {
  return getCatalogFileUrl(product?.thumbnail) ?? null;
}

export function getVersionPreviewImage(version: ProductVersionDto | null | undefined) {
  if (isProductPreviewFile(version?.thumbnail)) {
    return getCatalogFileUrl(version?.thumbnail);
  }

  return getCatalogFileUrl(version?.files.find((file) => file.fileType === 'PRODUCT_PREVIEW'));
}

export function getProductCoverImage(product: ProductDetailDto | ProductListItemDto | null | undefined, version?: ProductVersionDto | null) {
  return getVersionPreviewImage(version)
    ?? getProductThumbnailImage(product)
    ?? ('files' in (product ?? {}) ? getCatalogFileUrl((product as ProductDetailDto).files.find((file) => file.fileType === 'PRODUCT_PREVIEW')) : undefined)
    ?? null;
}

export function getProductPreviewFiles(product: ProductDetailDto | null | undefined) {
  const productFiles = [
    isProductPreviewFile(product?.thumbnail) ? product?.thumbnail : null,
    ...(product?.files.filter((file) => file.fileType === 'PRODUCT_PREVIEW') ?? []),
  ];
  const versionFiles = getDisplayableVersions(product).flatMap((version) => [
    isProductPreviewFile(version.thumbnail) ? version.thumbnail : null,
    ...version.files.filter((file) => file.fileType === 'PRODUCT_PREVIEW'),
  ]);
  const uniqueFiles = new Map<string, CatalogFileDto>();

  [...productFiles, ...versionFiles].forEach((file) => {
    if (file?.fileId && getCatalogFileUrl(file)) {
      uniqueFiles.set(file.fileId, file);
    }
  });

  return [...uniqueFiles.values()];
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
