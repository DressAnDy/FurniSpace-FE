import type { ProductStatus, ProductVersionDto } from '@/services/api/products';

export type PlannerReadiness = {
  isReady: boolean;
  issues: string[];
};

export function getVersionFile(version: ProductVersionDto | null | undefined, fileType: 'MODEL_3D' | 'PRODUCT_PREVIEW') {
  return version?.files?.find((file) => file.fileType === fileType) ?? null;
}

export function getPlannerReadiness(
  productStatus: ProductStatus,
  version: ProductVersionDto | null | undefined,
): PlannerReadiness {
  if (!version) {
    return {
      isReady: false,
      issues: ['No product version'],
    };
  }

  const issues: string[] = [];

  if (productStatus !== 'ACTIVE') issues.push('Product is not active');
  if (version.status !== 'ACTIVE') issues.push('Version is not active');
  if (!version.isPublic && !version.isProjectSpecific) issues.push('Version is not public');
  if (!getVersionFile(version, 'MODEL_3D')) issues.push('Missing MODEL_3D');
  if (!(version.thumbnail || getVersionFile(version, 'PRODUCT_PREVIEW'))) issues.push('Missing preview image');
  if (![version.width, version.height, version.depth].every((value) => value !== null && value > 0)) {
    issues.push('Missing dimensions');
  }
  if (version.estimatedPrice === null || version.estimatedPrice < 0) issues.push('Missing estimated price');

  return {
    isReady: issues.length === 0,
    issues,
  };
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
