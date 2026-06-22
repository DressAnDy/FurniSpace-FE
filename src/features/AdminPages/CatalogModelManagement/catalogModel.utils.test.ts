import { describe, expect, it } from 'vitest';

import type { ProductVersionDto } from '@/services/api/products';

import { getPlannerReadiness } from './catalogModel.utils';

const readyVersion: ProductVersionDto = {
  color: 'Black',
  depth: 2,
  estimatedPrice: 1500000,
  files: [
    {
      fileId: 'model-file',
      fileLinkId: 'model-link',
      fileSizeBytes: 1024,
      fileType: 'MODEL_3D',
      fileUrl: '/model.glb',
      mimeType: 'model/gltf-binary',
      originalFileName: 'model.glb',
    },
  ],
  height: 3,
  isDefault: true,
  isProjectSpecific: false,
  isPublic: true,
  material: 'Metal',
  productId: 'product-1',
  productVersionId: 'version-1',
  status: 'ACTIVE',
  thumbnail: {
    fileId: 'preview-file',
    fileLinkId: 'preview-link',
    fileSizeBytes: 512,
    fileType: 'PRODUCT_PREVIEW',
    fileUrl: '/preview.png',
    mimeType: 'image/png',
    originalFileName: 'preview.png',
  },
  versionCode: 'CHAIR-V1',
  versionName: 'Chair Black',
  versionType: 'STANDARD',
  width: 2,
};

describe('catalog model readiness', () => {
  it('marks a complete active Product Version as ready', () => {
    expect(getPlannerReadiness('ACTIVE', readyVersion)).toEqual({ isReady: true, issues: [] });
  });

  it('reports metadata and asset gaps', () => {
    const readiness = getPlannerReadiness('INACTIVE', {
      ...readyVersion,
      estimatedPrice: null,
      files: [],
      thumbnail: null,
      width: null,
    });

    expect(readiness.isReady).toBe(false);
    expect(readiness.issues).toEqual(expect.arrayContaining([
      'Product is not active',
      'Missing MODEL_3D',
      'Missing preview image',
      'Missing dimensions',
      'Missing estimated price',
    ]));
  });
});
