import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  IconArrowLeft,
  IconBox,
  IconChevronLeft,
  IconChevronRight,
  IconCube,
  IconPackage,
  IconPencil,
  IconRulerMeasure,
  IconTools,
  IconX,
} from '@tabler/icons-react';
import { Link, useSearchParams } from 'react-router-dom';

import { ModelViewer, type ModelViewerStatus } from '@/features/ThreeD/components';
import { MainNavbar } from '@/features/MainPages/maincomponents';
import {
  formatCatalogPrice,
  getAllProductVersions,
  getCatalogFileUrl,
  getProductCoverImage,
  getPublicDefaultVersion,
  getVersionModelFile,
} from '@/features/MainPages/productCatalog/productCatalogUtils';
import { getProductServiceResultMessage, type CatalogFileDto, type ProductDetailDto, type ProductVersionDto } from '@/services/api';
import { useProductDetail } from '@/services/queries';
import { SiteFooter, useTileTransitionRouteReady } from '@/shared/components';

import './ProductDetailPage.css';

export function ProductDetailPage() {
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('productId') ?? undefined;
  const productQuery = useProductDetail(productId);
  const product = productQuery.data;
  const versions = useMemo(() => getAllProductVersions(product), [product]);
  const defaultVersion = useMemo(() => getPublicDefaultVersion(product), [product]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [versionNavigationToken, setVersionNavigationToken] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [viewerStatus, setViewerStatus] = useState<ModelViewerStatus>('idle');
  const [viewerError, setViewerError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedVersionId && defaultVersion) {
      setSelectedVersionId(defaultVersion.productVersionId);
    }
  }, [defaultVersion, selectedVersionId]);

  const selectedVersion = versions.find((version) => version.productVersionId === selectedVersionId)
    ?? defaultVersion
    ?? versions[0]
    ?? null;
  const primaryImageUrl = getProductCoverImage(product, selectedVersion);
  const modelFile = getVersionModelFile(selectedVersion);
  const isRouteReady = !productId ||
    productQuery.isError ||
    Boolean(product && (selectedVersion || (!productQuery.isLoading && versions.length === 0)));

  useTileTransitionRouteReady(isRouteReady);

  return (
    <main className="product-detail-page">
      <MainNavbar activePath="/products" classPrefix="product-detail" />

      {!productId ? (
        <section className="product-detail-state">
          <IconPackage size={42} />
          <h1>Select a product first</h1>
          <p>Open a product from the catalog list to view version details.</p>
          <Link to="/products">Back to Products</Link>
        </section>
      ) : null}

      {productId && productQuery.isLoading ? <section className="product-detail-state">Loading product detail...</section> : null}

      {productId && productQuery.isError ? (
        <section className="product-detail-state is-error">{getProductServiceResultMessage(productQuery.error)}</section>
      ) : null}

      {product && selectedVersion ? (
        <section className="product-detail-shell">
          <aside className="product-detail-panel product-detail-left-panel" aria-label="Product information">
            <Link className="product-detail-back-link" to="/products">
              <IconArrowLeft size={16} stroke={1.8} />
              Back to Products
            </Link>

            <div className="product-detail-left-card">
              <span className="product-detail-category-chip">{product.categoryName}</span>
              <div className="product-detail-left-copy">
                <h2>{product.productName}</h2>
                <p>{product.description ?? 'FurniSpace catalog furniture piece with production-ready version metadata.'}</p>
              </div>

              <section className="product-detail-version-meta" aria-label="Selected version metadata">
                <div>
                  <span>Version Code</span>
                  <strong>{selectedVersion.versionCode}</strong>
                </div>
                <div>
                  <span>Version Name</span>
                  <strong>{selectedVersion.versionName}</strong>
                </div>
                <div>
                  <span>Type</span>
                  <strong>{formatEnumLabel(selectedVersion.versionType)}</strong>
                </div>
              </section>

              <div className="product-detail-spec-grid">
                <ProductOption
                  icon={<IconRulerMeasure size={21} stroke={1.6} />}
                  label="Size"
                  value={formatVersionSize(selectedVersion)}
                />
                <ProductOption
                  icon={<IconTools size={23} stroke={1.6} />}
                  label="Material"
                  value={selectedVersion.material ?? 'Not set'}
                />
                <ProductOption
                  icon={<IconPencil size={21} stroke={1.6} />}
                  label="Color"
                  value={selectedVersion.color ?? 'Not set'}
                />
              </div>
            </div>
          </aside>

          <StickyProductGallery
            fallbackImageUrl={primaryImageUrl}
            product={product}
            selectedVersion={selectedVersion}
            versionNavigationToken={versionNavigationToken}
            versions={versions}
            onVersionSelect={setSelectedVersionId}
          />

          <aside className="product-detail-panel product-detail-right-panel" aria-label="Product information and options">
            <div className="product-detail-right-card">
              <div className="product-detail-title">
                <span className="product-detail-kicker">Catalog Piece</span>
                <h1>{product.productName}</h1>
                <p>{product.description ?? product.categoryName}</p>
              </div>

              <section className="product-detail-options" aria-label="Choose your design">
                <div className="product-detail-section-heading">
                  <h2>Choose your version</h2>
                  <span>{versions.length} option{versions.length === 1 ? '' : 's'}</span>
                </div>
                <div className="product-detail-version-list">
                  {versions.map((version) => (
                    <button
                      className={version.productVersionId === selectedVersion.productVersionId ? 'is-active' : ''}
                      key={version.productVersionId}
                      type="button"
                      onClick={() => {
                        setSelectedVersionId(version.productVersionId);
                        setVersionNavigationToken((token) => token + 1);
                        setPreviewOpen(false);
                      }}
                    >
                      <strong>{version.versionName}</strong>
                      <small>{version.versionCode}</small>
                    </button>
                  ))}
                </div>
              </section>

              <section className="product-detail-price">
                <p>Recommended retail price</p>
                <strong>{formatCatalogPrice(selectedVersion.estimatedPrice)}</strong>
                <span>Price shown for the selected version only.</span>
              </section>

              <button
                className="product-detail-model-button"
                disabled={!modelFile}
                type="button"
                onClick={() => {
                  setPreviewOpen(true);
                  setViewerStatus('idle');
                  setViewerError(null);
                }}
              >
                <IconCube size={17} stroke={1.7} />
                View 3D Asset
              </button>
            </div>
          </aside>
        </section>
      ) : null}

      {product && !productQuery.isLoading && versions.length === 0 ? (
        <section className="product-detail-state">This product has no versions yet.</section>
      ) : null}

      {previewOpen && selectedVersion ? (
        <div className="product-detail-model-overlay">
          <section className="product-detail-model-modal" aria-label={`${selectedVersion.versionName} 3D model preview`}>
            <div className="product-detail-model-heading">
              <div>
                <strong>{selectedVersion.versionName}</strong>
                <p>{viewerStatus === 'error' ? viewerError : modelFile ? 'Drag to rotate, scroll to zoom.' : 'No MODEL_3D file is attached to this version.'}</p>
              </div>
              <button aria-label="Close 3D model preview" type="button" onClick={() => setPreviewOpen(false)}>
                <IconX size={18} />
              </button>
            </div>
            <div className="product-detail-model-canvas">
              <ModelViewer
                fallbackImageUrl={primaryImageUrl ?? undefined}
                height="100%"
                modelUrl={modelFile?.fileUrl}
                showGrid={false}
                onStatusChange={(status, error) => {
                  setViewerStatus(status);
                  setViewerError(error);
                }}
              />
            </div>
          </section>
        </div>
      ) : null}

      <SiteFooter />
    </main>
  );
}

type ProductGalleryImage = {
  alt: string;
  id: string;
  ownerLabel: string;
  source: 'product' | 'version';
  src: string;
  versionId: string | null;
};

type StickyProductGalleryProps = {
  fallbackImageUrl: string | null;
  onVersionSelect: (versionId: string) => void;
  product: ProductDetailDto;
  selectedVersion: ProductVersionDto;
  versionNavigationToken: number;
  versions: ProductVersionDto[];
};

function StickyProductGallery({ fallbackImageUrl, onVersionSelect, product, selectedVersion, versionNavigationToken, versions }: StickyProductGalleryProps) {
  const galleryImages = useMemo(
    () => getGalleryImages(product, versions, fallbackImageUrl),
    [fallbackImageUrl, product, versions],
  );
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [product.productId]);

  useEffect(() => {
    const targetIndex = galleryImages.findIndex((image) => image.versionId === selectedVersion.productVersionId);

    if (targetIndex >= 0) {
      setActiveIndex(targetIndex);
    }
  }, [galleryImages, selectedVersion.productVersionId, versionNavigationToken]);

  function selectImage(index: number) {
    setActiveIndex(index);

    const image = galleryImages[index];

    if (image?.versionId) {
      onVersionSelect(image.versionId);
    }
  }

  function showPreviousImage() {
    selectImage(activeIndex <= 0 ? galleryImages.length - 1 : activeIndex - 1);
  }

  function showNextImage() {
    selectImage(activeIndex >= galleryImages.length - 1 ? 0 : activeIndex + 1);
  }

  if (galleryImages.length === 0) {
    return (
      <div className="product-detail-gallery product-detail-gallery-static">
        <div className="product-detail-gallery-frame">
          <div className="product-detail-image-placeholder">
            <IconBox size={58} stroke={1.4} />
            <span>No product image</span>
          </div>
        </div>
      </div>
    );
  }

  const activeImage = galleryImages[activeIndex] ?? galleryImages[0];

  return (
    <div className="product-detail-gallery product-detail-gallery-static">
      <div className="product-detail-gallery-frame">
        <div className="product-detail-gallery-stage" aria-live="polite">
          {galleryImages.length === 1 ? (
            <ProductDetailImage alt={activeImage.alt} src={activeImage.src} />
          ) : (
            galleryImages.map((image, index) => (
              <img
                alt={image.alt}
                className={[
                  'product-detail-gallery-image',
                  index === activeIndex ? 'is-active' : '',
                ].filter(Boolean).join(' ')}
                decoding="async"
                key={image.id}
                loading={index <= activeIndex + 1 ? 'eager' : 'lazy'}
                src={image.src}
              />
            ))
          )}
        </div>

        {galleryImages.length > 1 ? (
          <>
            <div className="product-detail-gallery-nav">
              <button aria-label="Previous image" type="button" onClick={showPreviousImage}>
                <IconChevronLeft size={18} />
              </button>
              <button aria-label="Next image" type="button" onClick={showNextImage}>
                <IconChevronRight size={18} />
              </button>
            </div>

            <div className="product-detail-gallery-counter" aria-hidden="true">
              {String(activeIndex + 1).padStart(2, '0')}
              <span>/</span>
              {String(galleryImages.length).padStart(2, '0')}
            </div>
          </>
        ) : null}
      </div>

      {galleryImages.length > 1 ? (
        <div className="product-detail-gallery-thumbnail-list" aria-label="Product images">
          {galleryImages.map((image, index) => (
            <button
              className={index === activeIndex ? 'is-active' : ''}
              key={image.id}
              type="button"
              title={image.ownerLabel}
              onClick={() => selectImage(index)}
            >
              <img alt="" decoding="async" loading="lazy" src={image.src} />
              <span>{image.ownerLabel}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type ProductOptionProps = {
  icon: ReactNode;
  label: string;
  value: string;
};

function ProductOption({ icon, label, value }: ProductOptionProps) {
  return (
    <div className="product-detail-option">
      <span className="product-detail-option-icon">{icon}</span>
      <span className="product-detail-option-copy">
        <span>{label}</span>
        <strong>{value}</strong>
      </span>
    </div>
  );
}

type ProductDetailImageProps = {
  alt: string;
  compact?: boolean;
  fallbackSrc?: string | null;
  src: string | null;
};

function ProductDetailImage({ alt, compact = false, fallbackSrc, src }: ProductDetailImageProps) {
  const [failedUrls, setFailedUrls] = useState<string[]>([]);
  const displaySrc = src && !failedUrls.includes(src)
    ? src
    : fallbackSrc && !failedUrls.includes(fallbackSrc)
      ? fallbackSrc
      : null;

  if (!displaySrc) {
    return compact ? (
      <div className="product-detail-thumbnail-placeholder">
        <IconBox size={24} stroke={1.4} />
      </div>
    ) : (
      <div className="product-detail-image-placeholder">
        <IconBox size={58} stroke={1.4} />
        <span>No product image</span>
      </div>
    );
  }

  return (
    <img
      src={displaySrc}
      alt={alt}
      onError={() => setFailedUrls((urls) => (urls.includes(displaySrc) ? urls : [...urls, displaySrc]))}
    />
  );
}

function formatVersionSize(version: ProductVersionDto) {
  const width = version.width ?? '-';
  const height = version.height ?? '-';
  const depth = version.depth ?? '-';

  return `${width} x ${height} x ${depth}`;
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getGalleryImages(product: ProductDetailDto, versions: ProductVersionDto[], fallbackImageUrl: string | null): ProductGalleryImage[] {
  const images: ProductGalleryImage[] = [];
  const seenImageIds = new Set<string>();
  const seenImageUrls = new Set<string>();
  const addImage = (image: ProductGalleryImage | null) => {
    if (!image || seenImageIds.has(image.id) || seenImageUrls.has(image.src)) {
      return;
    }

    seenImageIds.add(image.id);
    seenImageUrls.add(image.src);
    images.push(image);
  };
  const productMainImage = product.thumbnail;

  if (productMainImage) {
    addImage(getGalleryImageFromFile(productMainImage, product.productName, {
      ownerLabel: 'Product preview',
      source: 'product',
      versionId: null,
    }));
  }

  versions.forEach((version) => {
    const versionFiles = [
      version.thumbnail,
      ...version.files.filter((file) => file.fileType === 'PRODUCT_PREVIEW'),
    ];

    versionFiles.forEach((file) => {
      addImage(getGalleryImageFromFile(file, `${product.productName} ${version.versionName}`, {
        ownerLabel: version.versionName,
        source: 'version',
        versionId: version.productVersionId,
      }));
    });
  });

  if (images.length === 0 && fallbackImageUrl) {
    images.push({
      alt: product.productName,
      id: 'fallback-image',
      ownerLabel: 'Product preview',
      source: 'product',
      src: fallbackImageUrl,
      versionId: null,
    });
  }

  return images;
}

function getGalleryImageFromFile(
  file: CatalogFileDto | null | undefined,
  productName: string,
  owner: Pick<ProductGalleryImage, 'ownerLabel' | 'source' | 'versionId'>,
): ProductGalleryImage | null {
  const src = getCatalogFileUrl(file);

  if (!file || !src) {
    return null;
  }

  return {
    alt: file.originalFileName || productName,
    id: `${owner.source}-${owner.versionId ?? 'product'}-${file.fileId || file.fileLinkId || src}`,
    ownerLabel: owner.ownerLabel,
    source: owner.source,
    src,
    versionId: owner.versionId,
  };
}
