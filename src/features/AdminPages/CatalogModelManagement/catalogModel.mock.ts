import type {
  CatalogFileDto,
  FileListItemDto,
  ProductBusinessTypeDto,
  ProductDetailDto,
  ProductListItemDto,
  ProductVersionDto,
} from '@/services/api/products';

export const CATALOG_MOCK_ENABLED = import.meta.env.VITE_CATALOG_USE_MOCK_DATA !== 'false';

const PLACEHOLDER_IMAGE = '/models/3d-test/thumbnails/placeholder-product.svg';

const cafeBusinessType: ProductBusinessTypeDto = {
  code: 'CAFE',
  id: 1,
  name: 'Cafe',
  status: true,
};

const showroomBusinessType: ProductBusinessTypeDto = {
  code: 'SHOWROOM',
  id: 2,
  name: 'Showroom',
  status: true,
};

const retailBusinessType: ProductBusinessTypeDto = {
  code: 'RETAIL',
  id: 3,
  name: 'Retail',
  status: true,
};

function createCatalogFile(
  id: string,
  fileType: 'MODEL_3D' | 'PRODUCT_PREVIEW',
  originalFileName: string,
  fileUrl: string,
  fileSizeBytes: number,
): CatalogFileDto {
  return {
    fileId: id,
    fileLinkId: `${id}-link`,
    fileSizeBytes,
    fileType,
    fileUrl,
    mimeType: fileType === 'MODEL_3D' ? 'model/gltf+json' : 'image/svg+xml',
    originalFileName,
  };
}

function createVersion(
  input: Partial<ProductVersionDto> & Pick<ProductVersionDto, 'productId' | 'productVersionId' | 'versionCode' | 'versionName'>,
): ProductVersionDto {
  return {
    color: null,
    depth: null,
    estimatedPrice: null,
    files: [],
    height: null,
    isDefault: true,
    isProjectSpecific: false,
    isPublic: true,
    material: null,
    status: 'ACTIVE',
    thumbnail: null,
    versionType: 'STANDARD',
    width: null,
    ...input,
  };
}

const stoolPreview = createCatalogFile(
  'mock-stool-preview',
  'PRODUCT_PREVIEW',
  'metal-stool-preview.svg',
  PLACEHOLDER_IMAGE,
  18400,
);
const stoolModel = createCatalogFile(
  'mock-stool-model',
  'MODEL_3D',
  'metal_stool_02_4k.gltf',
  '/models/3d-test/chair01/metal_stool_02_4k.gltf',
  1680000,
);
const tablePreview = createCatalogFile(
  'mock-table-preview',
  'PRODUCT_PREVIEW',
  'side-table-preview.svg',
  PLACEHOLDER_IMAGE,
  17200,
);
const tableModel = createCatalogFile(
  'mock-table-model',
  'MODEL_3D',
  'side_table_01_4k.gltf',
  '/models/3d-test/table01/side_table_01_4k.gltf',
  1940000,
);

const stoolVersion = createVersion({
  color: 'Graphite Black',
  depth: 1.55,
  estimatedPrice: 1450000,
  files: [stoolPreview, stoolModel],
  height: 2.45,
  material: 'Powder-coated Metal',
  productId: 'mock-product-stool',
  productVersionId: 'mock-version-stool-black',
  thumbnail: stoolPreview,
  versionCode: 'STOOL-02-BLK',
  versionName: 'Metal Stool - Black',
  width: 1.55,
});
const stoolSilverVersion = createVersion({
  color: 'Silver',
  depth: 1.55,
  estimatedPrice: 1520000,
  files: [stoolPreview, stoolModel],
  height: 2.45,
  isDefault: false,
  material: 'Brushed Metal',
  productId: 'mock-product-stool',
  productVersionId: 'mock-version-stool-silver',
  thumbnail: stoolPreview,
  versionCode: 'STOOL-02-SLV',
  versionName: 'Metal Stool - Silver',
  width: 1.55,
});
const tableVersion = createVersion({
  color: 'Natural Oak',
  depth: 1.9,
  estimatedPrice: 2850000,
  files: [tablePreview, tableModel],
  height: 2.1,
  material: 'Oak Wood',
  productId: 'mock-product-table',
  productVersionId: 'mock-version-table-oak',
  thumbnail: tablePreview,
  versionCode: 'TABLE-01-OAK',
  versionName: 'Side Table - Natural Oak',
  width: 2.2,
});
const loungeVersion = createVersion({
  color: 'Warm Gray',
  depth: 2.8,
  estimatedPrice: 4600000,
  files: [],
  height: 2.9,
  material: 'Fabric',
  productId: 'mock-product-lounge',
  productVersionId: 'mock-version-lounge-gray',
  thumbnail: createCatalogFile('mock-lounge-preview', 'PRODUCT_PREVIEW', 'lounge-preview.svg', PLACEHOLDER_IMAGE, 16500),
  versionCode: 'LOUNGE-01-GRY',
  versionName: 'Lounge Chair - Warm Gray',
  width: 2.7,
});
const cabinetVersion = createVersion({
  color: 'Walnut',
  files: [],
  isPublic: false,
  material: 'Wood Veneer',
  productId: 'mock-product-cabinet',
  productVersionId: 'mock-version-cabinet-custom',
  status: 'INACTIVE',
  versionCode: 'CAB-CUSTOM-01',
  versionName: 'Media Cabinet - Custom',
  versionType: 'CUSTOM',
});

export const MOCK_CATALOG_PRODUCTS: ProductDetailDto[] = [
  {
    businessTypeIds: [cafeBusinessType.id, retailBusinessType.id],
    businessTypes: [cafeBusinessType, retailBusinessType],
    categoryId: 'mock-category-seating',
    categoryName: 'Seating',
    defaultVersion: stoolVersion,
    description: 'Compact metal stool for cafe and retail counter layouts.',
    files: [],
    productCode: 'FS-STOOL-02',
    productId: 'mock-product-stool',
    productName: 'Metal Stool 02',
    status: 'ACTIVE',
    thumbnail: stoolPreview,
    versions: [stoolVersion, stoolSilverVersion],
  },
  {
    businessTypeIds: [cafeBusinessType.id, showroomBusinessType.id],
    businessTypes: [cafeBusinessType, showroomBusinessType],
    categoryId: 'mock-category-tables',
    categoryName: 'Tables',
    defaultVersion: tableVersion,
    description: 'Small oak side table suitable for lounge and display areas.',
    files: [],
    productCode: 'FS-TABLE-01',
    productId: 'mock-product-table',
    productName: 'Side Table 01',
    status: 'ACTIVE',
    thumbnail: tablePreview,
    versions: [tableVersion],
  },
  {
    businessTypeIds: [showroomBusinessType.id],
    businessTypes: [showroomBusinessType],
    categoryId: 'mock-category-seating',
    categoryName: 'Seating',
    defaultVersion: loungeVersion,
    description: 'Demo item with preview and metadata but no model file.',
    files: [],
    productCode: 'FS-LOUNGE-01',
    productId: 'mock-product-lounge',
    productName: 'Lounge Chair 01',
    status: 'ACTIVE',
    thumbnail: loungeVersion.thumbnail,
    versions: [loungeVersion],
  },
  {
    businessTypeIds: null,
    businessTypes: [],
    categoryId: 'mock-category-storage',
    categoryName: 'Storage',
    defaultVersion: cabinetVersion,
    description: 'Incomplete custom version for demonstrating readiness warnings.',
    files: [],
    productCode: 'FS-CAB-CUSTOM',
    productId: 'mock-product-cabinet',
    productName: 'Media Cabinet Custom',
    status: 'INACTIVE',
    thumbnail: null,
    versions: [cabinetVersion],
  },
];

export const MOCK_CATALOG_LIST_ITEMS: ProductListItemDto[] = MOCK_CATALOG_PRODUCTS.map((product) => ({
  businessTypeIds: product.businessTypeIds,
  businessTypes: product.businessTypes,
  categoryId: product.categoryId,
  categoryName: product.categoryName,
  defaultVersion: product.defaultVersion,
  description: product.description,
  productCode: product.productCode,
  productId: product.productId,
  productName: product.productName,
  status: product.status,
  thumbnail: product.thumbnail,
}));

export function getMockCatalogProduct(productId?: string) {
  return MOCK_CATALOG_PRODUCTS.find((product) => product.productId === productId);
}

export function getMockVersionFiles(productVersionId?: string): FileListItemDto[] {
  const version = MOCK_CATALOG_PRODUCTS
    .flatMap((product) => product.versions)
    .find((candidate) => candidate.productVersionId === productVersionId);

  return (version?.files ?? []).map((file, index) => ({
    fileId: file.fileId,
    fileLinkId: file.fileLinkId,
    fileSize: file.fileSizeBytes,
    fileType: file.fileType,
    mimeType: file.mimeType,
    originalFileName: file.originalFileName,
    publicUrl: file.fileUrl,
    uploadedAt: new Date(Date.UTC(2026, 5, 12 + index, 8, 30)).toISOString(),
    uploadedBy: 'Demo Admin',
    visibility: 'STAFF_ONLY',
  }));
}
