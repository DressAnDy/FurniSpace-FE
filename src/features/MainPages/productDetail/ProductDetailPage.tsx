import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  IconBox,
  IconChevronRight,
  IconCube,
  IconHelpCircle,
  IconPackage,
  IconPencil,
  IconRulerMeasure,
  IconShoppingBag,
  IconTools,
  IconX,
} from '@tabler/icons-react';
import { Link, useSearchParams } from 'react-router-dom';

import { ModelViewer, type ModelViewerStatus } from '@/features/ThreeD/components';
import { MainNavbar } from '@/features/MainPages/maincomponents';
import {
  formatCatalogPrice,
  getCatalogFileUrl,
  getDisplayableVersions,
  getProductCoverImage,
  getProductPreviewFiles,
  getProductThumbnailImage,
  getPublicDefaultVersion,
  getVersionModelFile,
} from '@/features/MainPages/productCatalog/productCatalogUtils';
import { getProductServiceResultMessage, type ProductVersionDto } from '@/services/api';
import { useProductDetail } from '@/services/queries';
import { SiteFooter } from '@/shared/components';

import './ProductDetailPage.css';

const accordions = [
  { icon: <IconHelpCircle size={21} stroke={1.6} />, title: 'Product details' },
  { icon: <IconPencil size={21} stroke={1.6} />, title: 'Measurements' },
  { icon: <IconHelpCircle size={21} stroke={1.6} />, title: 'Need help? Ask a question' },
];

export function ProductDetailPage() {
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('productId') ?? undefined;
  const productQuery = useProductDetail(productId);
  const product = productQuery.data;
  const versions = useMemo(() => getDisplayableVersions(product), [product]);
  const defaultVersion = useMemo(() => getPublicDefaultVersion(product), [product]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
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
  const galleryFiles = getProductPreviewFiles(product);
  const productThumbnailUrl = getProductThumbnailImage(product);
  const primaryImageUrl = getProductCoverImage(product, selectedVersion);
  const displayImageUrl = selectedImageUrl ?? primaryImageUrl;
  const modelFile = getVersionModelFile(selectedVersion);

  useEffect(() => {
    setSelectedImageUrl(null);
  }, [selectedVersion?.productVersionId]);

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
          <div className="product-detail-gallery">
            <figure className="product-detail-hero-image">
              {displayImageUrl ? (
                <ProductDetailImage src={displayImageUrl} fallbackSrc={productThumbnailUrl} alt={selectedVersion.versionName} />
              ) : (
                <div className="product-detail-image-placeholder">
                  <IconBox size={58} stroke={1.4} />
                  <span>No product image</span>
                </div>
              )}
            </figure>

            {galleryFiles.length > 0 ? (
              <div className="product-detail-thumbnail-list" aria-label="Product images">
                {galleryFiles.map((file) => (
                  <button
                    className={getCatalogFileUrl(file) === displayImageUrl ? 'is-active' : ''}
                    key={file.fileId}
                    onClick={() => setSelectedImageUrl(getCatalogFileUrl(file))}
                    type="button"
                  >
                    <ProductDetailImage src={getCatalogFileUrl(file)} alt={file.originalFileName} compact />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <aside className="product-detail-panel" aria-label="Product purchase options">
            <div className="product-detail-title">
              <h1>{product.productName}</h1>
              <p>{product.description ?? product.categoryName}</p>
            </div>

            <section className="product-detail-options" aria-label="Choose your design">
              <h2>Choose your version</h2>
              <div className="product-detail-version-list">
                {versions.map((version) => (
                  <button
                    className={version.productVersionId === selectedVersion.productVersionId ? 'is-active' : ''}
                    key={version.productVersionId}
                    type="button"
                    onClick={() => {
                      setSelectedVersionId(version.productVersionId);
                      setPreviewOpen(false);
                    }}
                  >
                    <span>{version.versionName}</span>
                    <strong>{formatCatalogPrice(version.estimatedPrice)}</strong>
                  </button>
                ))}
              </div>

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
            </section>

            <section className="product-detail-version-meta">
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
                <strong>{selectedVersion.versionType}</strong>
              </div>
            </section>

            <section className="product-detail-price">
              <p>Rec. retail price</p>
              <strong>{formatCatalogPrice(selectedVersion.estimatedPrice)}</strong>
            </section>

            <button className="product-detail-cart-button" type="button">
              <IconShoppingBag size={16} stroke={1.7} />
              Add to cart
            </button>

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

            <div className="product-detail-accordion-list">
              {accordions.map((item) => (
                <button className="product-detail-accordion" key={item.title} type="button">
                  <span>{item.icon}</span>
                  <strong>{item.title}</strong>
                  <IconChevronRight size={16} stroke={1.8} />
                </button>
              ))}
            </div>
          </aside>
        </section>
      ) : null}

      {product && !productQuery.isLoading && versions.length === 0 ? (
        <section className="product-detail-state">This product has no public standard version yet.</section>
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
