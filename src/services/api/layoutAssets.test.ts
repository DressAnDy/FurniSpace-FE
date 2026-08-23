import { describe, expect, it } from 'vitest';

import { normalizeLayoutAsset, type LayoutAssetDto } from './layoutAssets';

describe('normalizeLayoutAsset', () => {
  it('normalizes the canonical assetType contract for customer scene resolution', () => {
    const asset = normalizeLayoutAsset({
      layoutAssetId: 'wall-asset-id',
      assetCode: 'WALL-001',
      assetName: 'Dark wood wall',
      assetType: 'WALL_MATERIAL',
      files: [
        {
          fileId: 'preview-file-id',
          fileType: 'PREVIEW',
          isPrimary: true,
          url: 'https://cdn.example.com/wall-preview.jpg',
        },
      ],
      primaryTexture: {
        fileId: 'texture-file-id',
        url: 'https://cdn.example.com/wall-texture.jpg',
      },
      status: 'ACTIVE',
    } as LayoutAssetDto);

    expect(asset).toMatchObject({
      layoutAssetId: 'wall-asset-id',
      layoutAssetType: 'WALL_MATERIAL',
      name: 'Dark wood wall',
      previewUrl: 'https://cdn.example.com/wall-preview.jpg',
      primaryTexture: {
        url: 'https://cdn.example.com/wall-texture.jpg',
      },
    });
  });
});
