import { useMemo, useState, type FormEvent } from 'react';
import {
  IconCube,
  IconPhoto,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconStar,
  IconTrash,
  IconUpload,
  IconX,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

import { AdminNavbar, AdminSidebar } from '@/features/AdminPages/admincomponents';
import { useLang } from '@/app/providers/useLang';
import { adminCopy } from '@/features/AdminPages/admincomponents/adminI18n';
import {
  getLayoutAssetServiceResultMessage,
  type LayoutAssetDto,
  type LayoutAssetFileDto,
  type LayoutAssetFileType,
  type LayoutAssetStatus,
  type LayoutAssetType,
} from '@/services/api/layoutAssets';
import {
  useCreateLayoutAsset,
  useDeleteLayoutAssetFile,
  useLayoutAssets,
  useLayoutAssetFiles,
  useSetLayoutAssetPrimaryFile,
  useUpdateLayoutAssetStatus,
  useUploadLayoutAssetFile,
} from '@/services/queries';

import './CatalogModelManagement.css';

const layoutAssetTypes: LayoutAssetType[] = [
  'WALL_MATERIAL',
  'FLOOR_MATERIAL',
  'STAIR',
  'DOOR',
  'WINDOW',
  'COLUMN',
  'BEAM',
  'DECORATIVE_WALL',
  'DECORATIVE_FLOOR',
  'DECORATIVE_OBJECT',
  'OTHER',
];

const fileTypes: LayoutAssetFileType[] = ['PREVIEW', 'MODEL_3D', 'TEXTURE'];

export function LayoutAssetManagementPage() {
  const { lang } = useLang();
  const t = adminCopy[lang];
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<LayoutAssetType | ''>('');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [isCreateAssetModalOpen, setIsCreateAssetModalOpen] = useState(false);
  const [createAssetType, setCreateAssetType] = useState<LayoutAssetType>('DECORATIVE_OBJECT');
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const assetsQuery = useLayoutAssets({ keyword: query, layoutAssetType: null, page: 1, pageSize: 100 });
  const createAssetMutation = useCreateLayoutAsset();
  const updateStatusMutation = useUpdateLayoutAssetStatus();
  const uploadFileMutation = useUploadLayoutAssetFile();
  const assets = useMemo(() => {
    const items = assetsQuery.data?.items ?? [];
    if (!typeFilter) return items;
    return items.filter((asset) => getAssetType(asset) === typeFilter);
  }, [assetsQuery.data?.items, typeFilter]);
  const allAssets = useMemo(() => assetsQuery.data?.items ?? [], [assetsQuery.data?.items]);
  const selectedAsset = assets.find((asset) => asset.layoutAssetId === selectedAssetId)
    ?? allAssets.find((asset) => asset.layoutAssetId === selectedAssetId)
    ?? assets[0]
    ?? null;
  const selectedAssetFilesQuery = useLayoutAssetFiles(selectedAsset?.layoutAssetId);
  const setPrimaryFileMutation = useSetLayoutAssetPrimaryFile();
  const deleteFileMutation = useDeleteLayoutAssetFile();
  const stats = useMemo(() => {
    const active = allAssets.filter((asset) => asset.status === 'ACTIVE').length;
    const decorative = allAssets.filter((asset) => getAssetType(asset).startsWith('DECORATIVE')).length;

    return [
      { label: 'Layout Assets', value: allAssets.length, helper: 'Materials and decor library', icon: IconCube, tone: 'dark' },
      { label: 'Active', value: active, helper: 'Visible in Room Planner', icon: IconRefresh, tone: 'green' },
      { label: 'Decorative', value: decorative, helper: 'Decorate tab candidates', icon: IconPhoto, tone: 'gold' },
    ];
  }, [allAssets]);
  const groupedAssets = useMemo(() => groupAssetsByType(assets), [assets]);
  const selectedAssetFiles = selectedAssetFilesQuery.data?.items ?? [];
  const createAssetFileFields = useMemo(() => getCreateAssetFileFields(createAssetType), [createAssetType]);
  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    allAssets.forEach((asset) => {
      const type = getAssetType(asset);
      counts.set(type, (counts.get(type) ?? 0) + 1);
    });
    return counts;
  }, [allAssets]);

  async function createAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name') ?? '').trim();
    const layoutAssetType = String(formData.get('layoutAssetType') ?? createAssetType) as LayoutAssetType;

    if (!name) {
      setMessage({ tone: 'error', text: 'Asset name is required.' });
      return;
    }

    try {
      const asset = await createAssetMutation.mutateAsync({
        assetCode: String(formData.get('code') ?? ''),
        assetName: name,
        assetType: layoutAssetType,
        description: String(formData.get('description') ?? ''),
        layoutAssetType,
        name,
        status: String(formData.get('status') ?? 'ACTIVE') as LayoutAssetStatus,
      });
      const uploadErrors: string[] = [];
      let uploadedCount = 0;

      for (const field of getCreateAssetFileFields(layoutAssetType)) {
        const file = formData.get(field.inputName);

        if (!(file instanceof File) || file.size === 0) {
          continue;
        }

        try {
          await uploadFileMutation.mutateAsync({
            file,
            fileType: field.fileType,
            layoutAssetId: asset.layoutAssetId,
          });
          uploadedCount += 1;
        } catch (uploadError) {
          uploadErrors.push(`${field.label}: ${getLayoutAssetServiceResultMessage(uploadError)}`);
        }
      }

      event.currentTarget.reset();
      setSelectedAssetId(asset.layoutAssetId);
      setIsCreateAssetModalOpen(false);
      setCreateAssetType('DECORATIVE_OBJECT');
      setMessage(uploadErrors.length > 0
        ? { tone: 'error', text: `Layout asset created, but file upload failed: ${uploadErrors.join(' ')}` }
        : { tone: 'success', text: uploadedCount > 0 ? `Layout asset created with ${uploadedCount} file(s).` : 'Layout asset created.' });
    } catch (error) {
      setMessage({ tone: 'error', text: getLayoutAssetServiceResultMessage(error) });
    }
  }

  function closeCreateAssetModal() {
    setIsCreateAssetModalOpen(false);
    setCreateAssetType('DECORATIVE_OBJECT');
  }

  async function updateStatus(asset: LayoutAssetDto, status: LayoutAssetStatus) {
    try {
      await updateStatusMutation.mutateAsync({ layoutAssetId: asset.layoutAssetId, status });
      setMessage({ tone: 'success', text: `${asset.name} updated to ${formatEnumLabel(status)}.` });
    } catch (error) {
      setMessage({ tone: 'error', text: getLayoutAssetServiceResultMessage(error) });
    }
  }

  async function uploadFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedAsset) return;

    const formData = new FormData(event.currentTarget);
    const file = formData.get('file');

    if (!(file instanceof File) || file.size === 0) {
      setMessage({ tone: 'error', text: 'Please select a file.' });
      return;
    }

    try {
      await uploadFileMutation.mutateAsync({
        file,
        fileType: String(formData.get('fileType') ?? 'PREVIEW') as LayoutAssetFileType,
        layoutAssetId: selectedAsset.layoutAssetId,
      });
      event.currentTarget.reset();
      setMessage({ tone: 'success', text: 'Asset file uploaded.' });
    } catch (error) {
      setMessage({ tone: 'error', text: getLayoutAssetServiceResultMessage(error) });
    }
  }

  async function setPrimaryFile(fileId: string) {
    if (!selectedAsset) return;

    try {
      await setPrimaryFileMutation.mutateAsync({ fileId, layoutAssetId: selectedAsset.layoutAssetId });
      setMessage({ tone: 'success', text: 'Primary file updated.' });
    } catch (error) {
      setMessage({ tone: 'error', text: getLayoutAssetServiceResultMessage(error) });
    }
  }

  async function deleteFile(fileId: string) {
    if (!selectedAsset) return;

    try {
      await deleteFileMutation.mutateAsync({ fileId, layoutAssetId: selectedAsset.layoutAssetId });
      setMessage({ tone: 'success', text: 'Asset file removed.' });
    } catch (error) {
      setMessage({ tone: 'error', text: getLayoutAssetServiceResultMessage(error) });
    }
  }

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <AdminSidebar activeKey="layoutAssets" />
        <section className="admin-main">
          <AdminNavbar activeLabel={t.nav.layoutAssets} />
          <div className="admin-content catalog-model-content catalog-layout-page">
            <header className="product-management-heading catalog-model-heading">
              <div>
                <h2>{t.layoutAssets.title}</h2>
                <p>Manage Room Planner materials, structural assets, and decorative models separately from product models.</p>
              </div>
              <button className="admin-button admin-button-primary" type="button" onClick={() => setIsCreateAssetModalOpen(true)}>
                <IconPlus size={16} />
                New Layout Asset
              </button>
            </header>

            {message ? <p className={`catalog-model-message catalog-model-message-${message.tone}`}>{message.text}</p> : null}
            {assetsQuery.isError ? <p className="catalog-model-message catalog-model-message-error">{getLayoutAssetServiceResultMessage(assetsQuery.error)}</p> : null}

            <nav className="catalog-model-tabs" aria-label="Catalog model sections">
              <button type="button" onClick={() => navigate('/admin/catalog/models')}>
                Product Models
              </button>
              <button className="is-active" type="button">
                Layout Assets
              </button>
            </nav>

            <section className="product-stat-grid" aria-label="Layout asset summary">
              {stats.map(({ label, value, helper, icon: Icon, tone }) => (
                <article className="product-stat-card" key={label}>
                  <div className="product-stat-copy">
                    <span>{label}</span>
                    <strong>{value}</strong>
                    <p>{helper}</p>
                  </div>
                  <div className={`product-stat-icon product-stat-icon-${tone}`}>
                    <Icon size={22} />
                  </div>
                </article>
              ))}
            </section>

            <section className="catalog-layout-asset-workspace">
              <div className="catalog-layout-asset-main">
                <div className="catalog-layout-asset-toolbar">
                  <label className="admin-search product-management-search catalog-model-search">
                    <IconSearch size={18} />
                    <input placeholder="Search layout assets" type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
                  </label>
                  <label className="product-management-filter">
                    <span>Type</span>
                    <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as LayoutAssetType | '')}>
                      <option value="">All types</option>
                      {layoutAssetTypes.map((type) => <option key={type} value={type}>{formatEnumLabel(type)}</option>)}
                    </select>
                  </label>
                </div>

                <div className="catalog-layout-type-chips" role="tablist" aria-label="Filter by asset type">
                  <button
                    className={typeFilter === '' ? 'is-active' : ''}
                    type="button"
                    onClick={() => setTypeFilter('')}
                  >
                    All
                    <span>{allAssets.length}</span>
                  </button>
                  {layoutAssetTypes
                    .filter((type) => (typeCounts.get(type) ?? 0) > 0 || typeFilter === type)
                    .map((type) => (
                      <button
                        key={type}
                        className={typeFilter === type ? 'is-active' : ''}
                        type="button"
                        onClick={() => setTypeFilter(type)}
                      >
                        {formatEnumLabel(type)}
                        <span>{typeCounts.get(type) ?? 0}</span>
                      </button>
                    ))}
                </div>

                {assetsQuery.isLoading ? (
                  <div className="catalog-layout-asset-state catalog-layout-asset-state-card">
                    <IconRefresh size={22} className="catalog-layout-spin" />
                    Loading layout assets...
                  </div>
                ) : null}

                {!assetsQuery.isLoading && assets.length === 0 ? (
                  <div className="catalog-layout-asset-state catalog-layout-asset-state-card catalog-layout-asset-empty">
                    <span className="catalog-layout-empty-icon">
                      <IconCube size={28} />
                    </span>
                    <strong>No layout assets found</strong>
                    <p>Create a material, door, window, or decorative object for Room Planner.</p>
                    <button className="admin-button admin-button-primary" type="button" onClick={() => setIsCreateAssetModalOpen(true)}>
                      <IconPlus size={16} />
                      New Layout Asset
                    </button>
                  </div>
                ) : null}

                <div className="catalog-layout-asset-groups">
                  {groupedAssets.map((group) => (
                    <section className="catalog-layout-asset-group" key={group.type}>
                      <header>
                        <div>
                          <h3>{formatEnumLabel(group.type)}</h3>
                          <p>Assets available for Room Planner placement</p>
                        </div>
                        <span className="catalog-layout-group-count">{group.assets.length}</span>
                      </header>
                      <div className="catalog-layout-asset-list">
                        {group.assets.map((asset) => {
                          const previewUrl = getAssetPreviewUrl(asset);
                          const isSelected = selectedAsset?.layoutAssetId === asset.layoutAssetId;
                          const fileCount = getAssetFileCount(asset);

                          return (
                            <article
                              className={isSelected ? 'catalog-layout-asset-item is-selected' : 'catalog-layout-asset-item'}
                              key={asset.layoutAssetId}
                            >
                              <button
                                className="catalog-layout-asset-pick"
                                type="button"
                                onClick={() => setSelectedAssetId(asset.layoutAssetId)}
                              >
                                <span className="catalog-layout-asset-preview">
                                  {previewUrl ? <img alt="" src={previewUrl} /> : <IconCube size={28} />}
                                  <span className={`catalog-layout-asset-status is-${(asset.status ?? 'UNKNOWN').toLowerCase()}`}>
                                    {formatEnumLabel(asset.status ?? 'UNKNOWN')}
                                  </span>
                                </span>
                                <span className="catalog-layout-asset-copy">
                                  <strong>{asset.name}</strong>
                                  <small>{asset.code ?? asset.assetCode ?? 'No code'}</small>
                                  {asset.description ? <em>{asset.description}</em> : null}
                                </span>
                              </button>
                              <div className="catalog-layout-asset-meta">
                                <span>{fileCount} file{fileCount === 1 ? '' : 's'}</span>
                              </div>
                              <div className="catalog-layout-asset-actions">
                                <button
                                  className="catalog-layout-action-btn"
                                  disabled={asset.status === 'ACTIVE' || updateStatusMutation.isPending}
                                  type="button"
                                  onClick={() => void updateStatus(asset, 'ACTIVE')}
                                >
                                  Active
                                </button>
                                <button
                                  className="catalog-layout-action-btn"
                                  disabled={asset.status === 'INACTIVE' || updateStatusMutation.isPending}
                                  type="button"
                                  onClick={() => void updateStatus(asset, 'INACTIVE')}
                                >
                                  Inactive
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              </div>

              <aside className="catalog-layout-asset-inspector">
                <section className="catalog-layout-inspector-card catalog-layout-asset-selected">
                  <div className="catalog-layout-asset-selected-media">
                    {selectedAsset && getAssetPreviewUrl(selectedAsset)
                      ? <img alt="" src={getAssetPreviewUrl(selectedAsset) ?? ''} />
                      : <IconPhoto size={28} />}
                  </div>
                  <div className="catalog-layout-asset-selected-copy">
                    <span>Selected Asset</span>
                    <strong>{selectedAsset?.name ?? 'No asset selected'}</strong>
                    <p>
                      {selectedAsset
                        ? `${formatEnumLabel(getAssetType(selectedAsset))} · ${formatEnumLabel(selectedAsset.status ?? 'UNKNOWN')}`
                        : 'Choose an asset to manage files.'}
                    </p>
                  </div>
                </section>

                <form className="catalog-layout-inspector-card catalog-layout-upload-card" onSubmit={(event) => void uploadFile(event)}>
                  <div className="catalog-layout-inspector-heading">
                    <h3><IconUpload size={18} /> Upload Asset File</h3>
                    <p>{selectedAsset ? selectedAsset.name : 'Select an asset first.'}</p>
                  </div>
                  <label className="catalog-layout-field">
                    <span>File Type</span>
                    <select name="fileType" disabled={!selectedAsset}>
                      {fileTypes.map((type) => <option key={type} value={type}>{formatEnumLabel(type)}</option>)}
                    </select>
                  </label>
                  <label className="catalog-layout-field">
                    <span>File</span>
                    <input name="file" type="file" disabled={!selectedAsset} />
                  </label>
                  <button
                    className="catalog-layout-upload-submit"
                    disabled={!selectedAsset || uploadFileMutation.isPending}
                    type="submit"
                  >
                    {uploadFileMutation.isPending ? 'Uploading...' : 'Upload File'}
                  </button>
                </form>

                <section className="catalog-layout-inspector-card catalog-layout-files-card">
                  <div className="catalog-layout-inspector-heading">
                    <h3><IconPhoto size={18} /> Asset Files</h3>
                    <p>{selectedAsset ? selectedAsset.name : 'Select an asset first.'}</p>
                  </div>
                  {selectedAssetFilesQuery.isLoading ? <p className="catalog-layout-files-hint">Loading files...</p> : null}
                  {selectedAsset && !selectedAssetFilesQuery.isLoading && selectedAssetFiles.length === 0 ? (
                    <div className="catalog-layout-files-empty">
                      <IconUpload size={20} />
                      <p>No files uploaded yet.</p>
                    </div>
                  ) : null}
                  <div className="catalog-layout-file-list">
                    {selectedAssetFiles.map((file) => (
                      <div className="catalog-layout-file-row" key={file.fileId}>
                        <span className="catalog-layout-file-thumb">
                          {getAssetFileUrl(file) && (file.mimeType?.startsWith('image/') || file.fileType === 'PREVIEW')
                            ? <img alt="" src={getAssetFileUrl(file) ?? ''} />
                            : <IconCube size={18} />}
                        </span>
                        <div className="catalog-layout-file-copy">
                          <strong>{file.fileName ?? file.originalFileName ?? file.fileId}</strong>
                          <small>{formatEnumLabel(file.fileType ?? 'OTHER')}{file.isPrimary ? ' · Primary' : ''}</small>
                        </div>
                        <div className="catalog-layout-file-actions">
                          <button
                            className="catalog-layout-icon-btn"
                            disabled={Boolean(file.isPrimary) || setPrimaryFileMutation.isPending}
                            title="Set as primary"
                            type="button"
                            onClick={() => void setPrimaryFile(file.fileId)}
                          >
                            <IconStar size={15} />
                          </button>
                          <button
                            className="catalog-layout-icon-btn is-danger"
                            disabled={deleteFileMutation.isPending}
                            title="Delete file"
                            type="button"
                            onClick={() => void deleteFile(file.fileId)}
                          >
                            <IconTrash size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </aside>
            </section>
          </div>
        </section>
      </div>

      {isCreateAssetModalOpen ? (
        <div className="catalog-model-modal-backdrop" role="presentation" onClick={closeCreateAssetModal}>
          <form
            className="catalog-model-create-modal"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => void createAsset(event)}
          >
            <header>
              <div>
                <h3>New Layout Asset</h3>
                <p>Create a material, structural object, or decorative model for Room Planner.</p>
              </div>
              <button aria-label="Close create layout asset modal" type="button" onClick={closeCreateAssetModal}>
                <IconX size={18} />
              </button>
            </header>

            <div className="catalog-model-form">
              <div className="catalog-layout-create-grid">
                <label>
                  <span>Name</span>
                  <input name="name" placeholder="Decorative column, wall panel, wood floor..." />
                </label>
                <label>
                  <span>Code</span>
                  <input name="code" placeholder="Optional" />
                </label>
                <label>
                  <span>Type</span>
                  <select name="layoutAssetType" value={createAssetType} onChange={(event) => setCreateAssetType(event.target.value as LayoutAssetType)}>
                    {layoutAssetTypes.map((type) => <option key={type} value={type}>{formatEnumLabel(type)}</option>)}
                  </select>
                </label>
                <label>
                  <span>Status</span>
                  <select name="status" defaultValue="ACTIVE">
                    {(['ACTIVE', 'INACTIVE', 'ARCHIVED'] as const).map((status) => <option key={status} value={status}>{formatEnumLabel(status)}</option>)}
                  </select>
                </label>
              </div>
              <label>
                <span>Description</span>
                <textarea name="description" placeholder="Usage note for designer" />
              </label>
              <section className="catalog-layout-create-files">
                <div>
                  <h4>Reference files</h4>
                  <p>{isMaterialAssetType(createAssetType) ? 'Floor and wall materials use preview image plus texture.' : 'Decorative and structural assets use preview image plus 3D model.'}</p>
                </div>
                <div className="catalog-layout-create-file-grid">
                  {createAssetFileFields.map((field) => (
                    <label className="catalog-layout-create-file-card" key={field.fileType}>
                      <span>{field.label}</span>
                      <input accept={field.accept} name={field.inputName} type="file" />
                      <small>{field.helpText}</small>
                    </label>
                  ))}
                </div>
              </section>
            </div>

            <footer>
              <button className="admin-button admin-button-secondary" disabled={createAssetMutation.isPending || uploadFileMutation.isPending} type="button" onClick={closeCreateAssetModal}>
                Cancel
              </button>
              <button className="admin-button admin-button-primary" disabled={createAssetMutation.isPending || uploadFileMutation.isPending} type="submit">
                {createAssetMutation.isPending || uploadFileMutation.isPending ? 'Saving...' : 'Create Asset'}
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </main>
  );
}

function isMaterialAssetType(type: LayoutAssetType) {
  return type === 'FLOOR_MATERIAL' || type === 'WALL_MATERIAL';
}

function getCreateAssetFileFields(type: LayoutAssetType): Array<{
  accept: string;
  fileType: LayoutAssetFileType;
  helpText: string;
  inputName: string;
  label: string;
}> {
  if (isMaterialAssetType(type)) {
    return [
      {
        accept: 'image/*',
        fileType: 'PREVIEW',
        helpText: 'Thumbnail shown in admin and Room Planner asset picker.',
        inputName: 'previewFile',
        label: 'Preview',
      },
      {
        accept: 'image/*',
        fileType: 'TEXTURE',
        helpText: 'Texture applied to floor or wall surfaces in 3D.',
        inputName: 'textureFile',
        label: 'Texture',
      },
    ];
  }

  return [
    {
      accept: 'image/*',
      fileType: 'PREVIEW',
      helpText: 'Thumbnail shown in the decorate or asset picker.',
      inputName: 'previewFile',
      label: 'Preview',
    },
    {
      accept: '.glb,.gltf,.obj,.fbx,.usdz,model/*,application/octet-stream',
      fileType: 'MODEL_3D',
      helpText: '3D model used by Room Planner placement.',
      inputName: 'modelFile',
      label: 'Model 3D',
    },
  ];
}

function getAssetType(asset: LayoutAssetDto) {
  return asset.layoutAssetType ?? asset.assetType ?? 'OTHER';
}

function getAssetFileUrl(file: LayoutAssetFileDto) {
  return file.url ?? file.publicUrl ?? file.fileUrl ?? null;
}

function getAssetPreviewUrl(asset: LayoutAssetDto) {
  return asset.previewUrl
    ?? asset.primaryPreview?.url
    ?? asset.files?.find((file) => file.isPrimary && file.fileType === 'PREVIEW')?.url
    ?? asset.files?.find((file) => file.fileType === 'PREVIEW')?.url
    ?? null;
}

function getAssetFileCount(asset: LayoutAssetDto) {
  return asset.files?.length ?? [
    asset.primaryModel,
    asset.primaryPreview,
    asset.primaryTexture,
  ].filter(Boolean).length;
}

function groupAssetsByType(assets: LayoutAssetDto[]) {
  const groups = new Map<string, LayoutAssetDto[]>();

  assets.forEach((asset) => {
    const type = getAssetType(asset);
    groups.set(type, [...(groups.get(type) ?? []), asset]);
  });

  return [...groups.entries()]
    .sort(([left], [right]) => layoutAssetTypes.indexOf(left as LayoutAssetType) - layoutAssetTypes.indexOf(right as LayoutAssetType))
    .map(([type, groupAssets]) => ({ assets: groupAssets, type }));
}

function formatEnumLabel(value?: string | null) {
  if (!value) return '-';

  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
