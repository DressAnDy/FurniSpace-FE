import { describe, expect, it } from 'vitest';

import { resolvePlacedBuildingProducts } from './buildingProductCatalogMapper';

describe('resolvePlacedBuildingProducts', () => {
  it('prefers the freshly resolved catalog URL over a stale scene snapshot', () => {
    const products = resolvePlacedBuildingProducts(
      [{
        id: 'version-id',
        modelUrl: 'https://cdn.example.com/product-versions%2Fstale.glb',
        productVersionId: 'version-id',
        sceneObjectId: 'scene-object-id',
      }] as never,
      new Map([
        ['version-id', {
          id: 'catalog-model-id',
          modelUrl: 'https://cdn.example.com/models/current.glb',
          name: 'Current model',
          productVersionId: 'version-id',
        } as never],
      ]),
    );

    expect(products[0]?.modelUrl).toBe('https://cdn.example.com/models/current.glb');
  });
});
