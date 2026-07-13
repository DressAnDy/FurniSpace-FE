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

export function getProductThumbnailImage(product: ProductDetailDto | ProductListItemDto | null | undefined) {
  void product;

  return null;
}

export function getVersionPreviewImage(version: ProductVersionDto | null | undefined) {
  void version;

  return null;
}

export function getProductCoverImage(product: ProductDetailDto | ProductListItemDto | null | undefined, version?: ProductVersionDto | null) {
  void product;
  void version;

  return null;
}

export function getProductPreviewFiles(product: ProductDetailDto | null | undefined): CatalogFileDto[] {
  void product;

  return [];
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
