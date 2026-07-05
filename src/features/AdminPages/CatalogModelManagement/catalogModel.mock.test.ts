import { describe, expect, it } from 'vitest';

import {
  getMockCatalogProduct,
  getMockVersionFiles,
  MOCK_CATALOG_LIST_ITEMS,
} from './catalogModel.mock';

describe('catalog model mock data', () => {
  it('provides list items and linked Product Versions', () => {
    expect(MOCK_CATALOG_LIST_ITEMS.length).toBeGreaterThanOrEqual(4);
    expect(getMockCatalogProduct('mock-product-stool')?.versions).toHaveLength(2);
  });

  it('maps local model assets to file list data', () => {
    const files = getMockVersionFiles('mock-version-stool-black');

    expect(files.some((file) => file.fileType === 'MODEL_3D')).toBe(true);
    expect(files.find((file) => file.fileType === 'MODEL_3D')?.publicUrl).toContain('/models/3d-test/');
  });
});
