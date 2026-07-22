import { type DragEvent, type FormEvent, useEffect, useState } from 'react';
import { IconArrowLeft, IconPackage, IconPhoto, IconRefresh, IconUpload, IconX } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

import { getBusinessTypeServiceResultMessage, getProductServiceResultMessage, normalizeBusinessTypeIds, normalizeOptionalText, normalizeRequiredText } from '@/services/api';
import {
  useBusinessTypeList,
  useCategoryList,
  useCreateProduct,
  useDeleteProductPreviewImage,
  useReorderProductPreviewImages,
  useUploadProductPreviewFile,
} from '@/services/queries';

import { AdminNavbar, AdminSidebar } from '../admincomponents';
import './Productmanagement.css';

const MAX_PREVIEW_IMAGES = 5;

type PreviewUploadStatus = 'pending' | 'uploading' | 'uploaded' | 'failed';

type PreviewUploadItem = {
  id: string;
  file: File;
  fileId?: string;
  progress: number;
  status: PreviewUploadStatus;
  errorMessage?: string;
};

export function CreateProductPage() {
  const navigate = useNavigate();
  const categoryListQuery = useCategoryList({ page: 1, limit: 100 });
  const businessTypeListQuery = useBusinessTypeList({ page: 1, limit: 100 });
  const createProductMutation = useCreateProduct();
  const uploadProductPreviewMutation = useUploadProductPreviewFile();
  const reorderProductPreviewMutation = useReorderProductPreviewImages();
  const deleteProductPreviewMutation = useDeleteProductPreviewImage();
  const [previewItems, setPreviewItems] = useState<PreviewUploadItem[]>([]);
  const [draggingFileIndex, setDraggingFileIndex] = useState<number | null>(null);
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);
  const [imageMessage, setImageMessage] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const categoryOptions = categoryListQuery.data?.items ?? [];
  const businessTypeOptions = businessTypeListQuery.data?.items.filter((businessType) => businessType.status) ?? [];
  const isSaving =
    createProductMutation.isPending ||
    uploadProductPreviewMutation.isPending ||
    reorderProductPreviewMutation.isPending ||
    deleteProductPreviewMutation.isPending;

  const syncPreviewOrderOnServer = async (productId: string, items: PreviewUploadItem[]) => {
    const fileIds = items.map((item) => item.fileId).filter((fileId): fileId is string => Boolean(fileId));

    if (fileIds.length === 0 || fileIds.length !== items.length) {
      return true;
    }

    try {
      await reorderProductPreviewMutation.mutateAsync({ productId, fileIds });
      return true;
    } catch (error) {
      setFormMessage(getProductServiceResultMessage(error));
      return false;
    }
  };

  const movePreviewFile = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= previewItems.length || toIndex >= previewItems.length) {
      return;
    }

    const nextItems = [...previewItems];
    const [movedFile] = nextItems.splice(fromIndex, 1);
    nextItems.splice(toIndex, 0, movedFile);
    setPreviewItems(nextItems);

    if (createdProductId) {
      await syncPreviewOrderOnServer(createdProductId, nextItems);
    }
  };

  const addPreviewFiles = (fileList: FileList | null) => {
    if (!fileList?.length) {
      return;
    }

    let nextMessage: string | null = null;

    setPreviewItems((currentItems) => {
      const incomingFiles = Array.from(fileList);
      const remainingSlots = MAX_PREVIEW_IMAGES - currentItems.length;

      if (remainingSlots <= 0) {
        nextMessage = `You can upload up to ${MAX_PREVIEW_IMAGES} images.`;
        return currentItems;
      }

      const acceptedFiles = incomingFiles.slice(0, remainingSlots);
      const nextItems = [
        ...currentItems,
        ...acceptedFiles.map((file) => ({
          id: getLocalPreviewId(file),
          file,
          progress: 0,
          status: 'pending' as PreviewUploadStatus,
        })),
      ];

      if (incomingFiles.length > remainingSlots) {
        nextMessage = `Only ${MAX_PREVIEW_IMAGES} images are allowed. Extra files were skipped.`;
      }

      return nextItems;
    });

    setImageMessage(nextMessage);
  };

  const removePreviewItem = async (itemId: string) => {
    const targetItem = previewItems.find((item) => item.id === itemId);

    if (createdProductId && targetItem?.fileId) {
      try {
        await deleteProductPreviewMutation.mutateAsync({
          productId: createdProductId,
          fileId: targetItem.fileId,
        });
      } catch (error) {
        setImageMessage(getProductServiceResultMessage(error));
        return;
      }
    }

    setPreviewItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
    setImageMessage(null);
  };

  const uploadSinglePreview = async (item: PreviewUploadItem, productId: string, displayOrder: number) => {
    setPreviewItems((currentItems) =>
      currentItems.map((currentItem) =>
        currentItem.id === item.id
          ? { ...currentItem, status: 'uploading', progress: 0, errorMessage: undefined }
          : currentItem,
      ),
    );

    try {
      const uploadedPreview = await uploadProductPreviewMutation.mutateAsync({
        productId,
        file: item.file,
        description: 'Product preview image',
        displayOrder,
        onUploadProgress: (progressPercent: number) => {
          setPreviewItems((currentItems) =>
            currentItems.map((currentItem) =>
              currentItem.id === item.id
                ? { ...currentItem, status: 'uploading', progress: progressPercent }
                : currentItem,
            ),
          );
        },
      });

      setPreviewItems((currentItems) =>
        currentItems.map((currentItem) =>
          currentItem.id === item.id
            ? {
                ...currentItem,
                fileId: uploadedPreview.fileId,
                status: 'uploaded',
                progress: 100,
                errorMessage: undefined,
              }
            : currentItem,
        ),
      );

      return uploadedPreview.fileId;
    } catch (error) {
      setPreviewItems((currentItems) =>
        currentItems.map((currentItem) =>
          currentItem.id === item.id
            ? {
                ...currentItem,
                status: 'failed',
                progress: 0,
                errorMessage: getProductServiceResultMessage(error),
              }
            : currentItem,
        ),
      );

      return null;
    }
  };

  const handleRetryUpload = async (itemId: string) => {
    if (!createdProductId) {
      setFormMessage('Please create product first before retrying uploads.');
      return;
    }

    const item = previewItems.find((candidate) => candidate.id === itemId);

    if (!item) {
      return;
    }

    const itemIndex = previewItems.findIndex((candidate) => candidate.id === itemId);

    setFormMessage(null);
    await uploadSinglePreview(item, createdProductId, itemIndex + 1);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormMessage(null);
    const formData = new FormData(event.currentTarget);

    const productName = normalizeRequiredText(formData.get('product_name'));
    const categoryId = normalizeRequiredText(formData.get('category_id'));

    if (!productName || !categoryId) {
      return;
    }

    try {
      const productId =
        createdProductId ??
        (
          await createProductMutation.mutateAsync({
            categoryId,
            businessTypeIds: normalizeBusinessTypeIds(formData.getAll('business_type_ids').map((value) => Number(value))),
            productCode: normalizeOptionalText(formData.get('product_code')),
            productName,
            description: normalizeOptionalText(formData.get('description')),
          })
        ).productId;

      setCreatedProductId(productId);

      if (previewItems.length > 0) {
        const uploadQueue = previewItems.filter((item) => item.status !== 'uploaded');
        const uploadedFileIds = new Map<string, string>(
          previewItems.filter((item) => item.fileId).map((item) => [item.id, item.fileId as string]),
        );
        let failedUploads = 0;

        for (const previewItem of uploadQueue) {
          const itemIndex = previewItems.findIndex((item) => item.id === previewItem.id);
          const uploadedFileId = await uploadSinglePreview(previewItem, productId, itemIndex + 1);

          if (!uploadedFileId) {
            failedUploads += 1;
          } else {
            uploadedFileIds.set(previewItem.id, uploadedFileId);
          }
        }

        if (failedUploads > 0) {
          setFormMessage(`Product created, but ${failedUploads} image(s) failed. Please retry failed images.`);
          return;
        }

        const orderedFileIds = previewItems
          .map((item) => uploadedFileIds.get(item.id))
          .filter((fileId): fileId is string => Boolean(fileId));

        if (orderedFileIds.length > 0) {
          try {
            await reorderProductPreviewMutation.mutateAsync({ productId, fileIds: orderedFileIds });
          } catch (error) {
            setFormMessage(getProductServiceResultMessage(error));
            return;
          }
        }
      }

      sessionStorage.setItem('admin.createdProductId', productId);
      navigate(`/admin/products/${productId}/versions/create`);
    } catch {
      // Error state is rendered from React Query mutation.
    }
  };

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <AdminSidebar activeLabel="Products" />

        <section className="admin-main">
          <AdminNavbar activeLabel="Products" />
          <div className="admin-content product-management-content">
            <div className="product-form-heading">
              <button className="product-version-back" type="button" onClick={() => navigate('/admin/products')}>
                <IconArrowLeft size={16} />
                Back to Products
              </button>
              <h2>Create New Product</h2>
              <p>Add a new product to the catalog</p>
            </div>

            <form className="product-form-shell" onSubmit={handleSubmit}>
              <input name="status" type="hidden" value="ACTIVE" />
              <section className="product-form-card">
                <div className="product-form-note">
                  <strong>Note:</strong> After creating the product, you will be prompted to create at least one product version.
                </div>

                <div className="product-form-layout">
                  <div className="product-form-main">
                    <div className="product-form-section">
                      <div className="product-form-section-title">
                        <IconPackage size={20} />
                        <h3>Basic Information</h3>
                      </div>

                      <label className="product-form-field product-form-field-full">
                        <span>Product Name *</span>
                        <input className="admin-form-input" name="product_name" placeholder="Enter product name" required type="text" />
                      </label>

                      <div className="product-form-grid">
                        <label className="product-form-field">
                          <span>Product Code</span>
                          <input className="admin-form-input" maxLength={50} name="product_code" placeholder="e.g., SOFA-LUX-001" type="text" />
                        </label>

                        <label className="product-form-field">
                          <span>Category *</span>
                          <select className="admin-form-input" name="category_id" defaultValue="" required disabled={categoryListQuery.isLoading}>
                            <option value="" disabled>
                              {categoryListQuery.isLoading ? 'Loading categories...' : 'Select category'}
                            </option>
                            {categoryOptions.map((category) => (
                              <option key={category.categoryId} value={category.categoryId}>
                                {category.categoryName}
                              </option>
                            ))}
                          </select>
                          {categoryListQuery.isError ? <em>{getProductServiceResultMessage(categoryListQuery.error)}</em> : null}
                        </label>
                      </div>

                      <label className="product-form-field product-form-field-full">
                        <span>Description</span>
                        <textarea className="admin-form-textarea" name="description" placeholder="Describe product purpose, use cases, and catalog notes" />
                      </label>

                      <div className="product-form-field product-form-field-full">
                        <span>Business Type</span>
                        <div className="product-business-type-checkboxes">
                          {businessTypeListQuery.isLoading ? <small>Loading business types...</small> : null}
                          {!businessTypeListQuery.isLoading && businessTypeOptions.length === 0 ? <small>No active business types yet.</small> : null}
                          {businessTypeOptions.map((businessType) => (
                            <label key={businessType.id}>
                              <input name="business_type_ids" type="checkbox" value={businessType.id} />
                              <span>{businessType.name}</span>
                            </label>
                          ))}
                        </div>
                        {businessTypeListQuery.isError ? <em>{getBusinessTypeServiceResultMessage(businessTypeListQuery.error)}</em> : null}
                        <p className="product-form-helper">Optional. Products without business types still appear when no Business Type filter is selected.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="product-form-section product-form-section-images">
                  <h3>Product Preview Image</h3>
                  <div className="product-image-workbench">
                    <label className="product-image-dropzone">
                      <input
                        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                        className="product-upload-input product-upload-input-overlay"
                        type="file"
                        multiple
                        onClick={(event) => {
                          event.currentTarget.value = '';
                        }}
                        onChange={(event) => {
                          addPreviewFiles(event.target.files);
                          setDraggingFileIndex(null);
                        }}
                      />
                      <div className="product-upload-main">
                        <IconUpload size={46} />
                        <strong>{previewItems.length > 0 ? `${previewItems.length} image(s) selected` : 'Click to select product images'}</strong>
                        <small>All files are uploaded as PRODUCT_PREVIEW and visible to customers</small>
                      </div>
                    </label>

                    <div className="product-image-cover-row">
                      <div className="product-image-cover-panel">
                        <div className="product-image-cover-head">
                          <span>Cover Image</span>
                          <small>Cover updates automatically from image at position 1</small>
                        </div>
                        {previewItems[0] ? (
                          <ProductImagePreviewTile
                            item={previewItems[0]}
                            isCover
                            draggable={false}
                            onRemove={() => removePreviewItem(previewItems[0].id)}
                            onRetry={() => handleRetryUpload(previewItems[0].id)}
                          />
                        ) : (
                          <div className="product-image-cover-empty">No image selected</div>
                        )}
                      </div>
                      <div className="product-image-cover-empty-slot" aria-hidden="true" />
                    </div>
                  </div>

                  {previewItems.length > 0 ? (
                    <div className="product-image-strip">
                      {previewItems.map((item, index) => (
                        <ProductImagePreviewTile
                          item={item}
                          key={item.id}
                          isCover={index === 0}
                          onRemove={() => removePreviewItem(item.id)}
                          onRetry={() => handleRetryUpload(item.id)}
                          onDragEnd={() => setDraggingFileIndex(null)}
                          onDragOver={(event) => event.preventDefault()}
                          onDragStart={() => setDraggingFileIndex(index)}
                          onDrop={(event) => {
                            event.preventDefault();
                            if (draggingFileIndex !== null) {
                              void movePreviewFile(draggingFileIndex, index);
                              setDraggingFileIndex(null);
                            }
                          }}
                        />
                      ))}
                    </div>
                  ) : null}

                  {imageMessage ? <p className="product-form-error">{imageMessage}</p> : null}
                  <p className="product-form-helper">Products currently accept only FileType.PRODUCT_PREVIEW. Reorder by drag and drop; image at position 1 is always the cover.</p>
                </div>

                {createProductMutation.isError ? (
                  <p className="product-form-error">{getProductServiceResultMessage(createProductMutation.error)}</p>
                ) : null}
                {formMessage ? <p className="product-form-error">{formMessage}</p> : null}
              </section>

              <div className="product-form-actions">
                <button className="product-form-button product-form-button-secondary" type="button" onClick={() => navigate('/admin/products')}>
                  Cancel
                </button>
                <button className="product-form-button product-form-button-secondary" type="button">
                  Save Draft
                </button>
                <button
                  className="product-form-button product-form-button-primary"
                  disabled={isSaving || categoryListQuery.isLoading || categoryOptions.length === 0}
                  type="submit"
                >
                  {isSaving ? 'Saving...' : 'Save & Create Version'}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

export default CreateProductPage;

type ProductImagePreviewTileProps = {
  item: PreviewUploadItem;
  draggable?: boolean;
  isCover?: boolean;
  onRemove?: () => void;
  onRetry?: () => void;
  onDragEnd?: () => void;
  onDragOver?: (event: DragEvent<HTMLDivElement>) => void;
  onDragStart?: () => void;
  onDrop?: (event: DragEvent<HTMLDivElement>) => void;
};

function ProductImagePreviewTile({
  item,
  draggable = true,
  isCover = false,
  onRemove,
  onRetry,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
}: ProductImagePreviewTileProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const isImage = item.file.type.startsWith('image/');

  useEffect(() => {
    if (!isImage) {
      setPreviewUrl(null);
      return undefined;
    }

    const objectUrl = URL.createObjectURL(item.file);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [item.file, isImage]);

  return (
    <div
      className={`product-upload-tile product-upload-tile-preview product-upload-tile-status-${item.status}${isCover ? ' product-upload-tile-cover' : ''}`}
      draggable={draggable}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
      onDrop={onDrop}
    >
      <div className="product-upload-tile-actions">
        {item.status === 'failed' && onRetry ? (
          <button type="button" onClick={onRetry} aria-label={`Retry ${item.file.name}`}>
            <IconRefresh size={14} />
          </button>
        ) : null}
        {onRemove ? (
          <button type="button" onClick={onRemove} aria-label={`Remove ${item.file.name}`}>
            <IconX size={14} />
          </button>
        ) : null}
      </div>
      {isCover ? <span className="product-upload-cover-badge">Cover</span> : null}
      {previewUrl ? <img alt={item.file.name} src={previewUrl} /> : <IconPhoto size={28} />}
      <span title={item.file.name}>{item.file.name}</span>
      <div className="product-upload-progress">
        <span style={{ width: `${item.progress}%` }} />
      </div>
      <small className={`product-upload-status product-upload-status-${item.status}`}>
        {item.status === 'uploading' ? `Uploading ${item.progress}%` : item.status === 'uploaded' ? 'Uploaded' : item.status === 'failed' ? 'Failed' : 'Pending'}
      </small>
      {item.errorMessage ? <small className="product-upload-error">{item.errorMessage}</small> : null}
    </div>
  );
}

function getLocalPreviewId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
