import { useMemo, useState, type FormEvent } from 'react';
import { IconCube, IconPhoto, IconPlus, IconRefresh, IconSearch, IconStar, IconTrash, IconUpload } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

import { AdminNavbar, AdminSidebar } from '@/features/AdminPages/admincomponents';
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
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<LayoutAssetType | ''>('');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [isCreateAssetModalOpen, setIsCreateAssetModalOpen] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const assetsQuery = useLayoutAssets({ keyword: query, layoutAssetType: typeFilter || null, page: 1, pageSize: 100 });
  const createAssetMutation = useCreateLayoutAsset();
  const updateStatusMutation = useUpdateLayoutAssetStatus();
  const uploadFileMutation = useUploadLayoutAssetFile();
  const assets = assetsQuery.data?.items ?? [];
  const selectedAsset = assets.find((asset) => asset.layoutAssetId === selectedAssetId) ?? assets[0] ?? null;
  const selectedAssetFilesQuery = useLayoutAssetFiles(selectedAsset?.layoutAssetId);
  const setPrimaryFileMutation = useSetLayoutAssetPrimaryFile();
  const deleteFileMutation = useDeleteLayoutAssetFile();
  const stats = useMemo(() => {
    const active = assets.filter((asset) => asset.status === 'ACTIVE').length;
    const decorative = assets.filter((asset) => getAssetType(asset).startsWith('DECORATIVE')).length;

    return [
      { label: 'Layout Assets', value: assets.length, helper: 'Materials and decor library', icon: IconCube, tone: 'dark' },
      { label: 'Active', value: active, helper: 'Visible in Room Planner', icon: IconRefresh, tone: 'green' },
      { label: 'Decorative', value: decorative, helper: 'Decorate tab candidates', icon: IconPhoto, tone: 'gold' },
    ];
  }, [assets]);
  const groupedAssets = useMemo(() => groupAssetsByType(assets), [assets]);
  const selectedAssetFiles = selectedAssetFilesQuery.data?.items ?? [];

  async function createAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name') ?? '').trim();

    if (!name) {
      setMessage({ tone: 'error', text: 'Asset name is required.' });
      return;
    }

    try {
      const asset = await createAssetMutation.mutateAsync({
        assetCode: String(formData.get('code') ?? ''),
        assetName: name,
        assetType: String(formData.get('layoutAssetType') ?? 'OTHER') as LayoutAssetType,
        description: String(formData.get('description') ?? ''),
        layoutAssetType: String(formData.get('layoutAssetType') ?? 'OTHER') as LayoutAssetType,
        name,
        status: String(formData.get('status') ?? 'ACTIVE') as LayoutAssetStatus,
      });
      event.currentTarget.reset();
      setSelectedAssetId(asset.layoutAssetId);
      setIsCreateAssetModalOpen(false);
      setMessage({ tone: 'success', text: 'Layout asset created.' });
    } catch (error) {
      setMessage({ tone: 'error', text: getLayoutAssetServiceResultMessage(error) });
    }
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
        <AdminSidebar activeLabel="Layout Assets" />
        <section className="admin-main">
          <AdminNavbar activeLabel="Layout Assets" />
          <div className="admin-content catalog-model-content">
            <header className="product-management-heading catalog-model-heading">
              <div>
                <h2>Layout Assets</h2>
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
                      <option value="">All</option>
                      {layoutAssetTypes.map((type) => <option key={type} value={type}>{formatEnumLabel(type)}</option>)}
                    </select>
                  </label>
                </div>

                {assetsQuery.isLoading ? <div className="catalog-layout-asset-state">Loading layout assets...</div> : null}
                {!assetsQuery.isLoading && assets.length === 0 ? <div className="catalog-layout-asset-state">No layout assets found.</div> : null}

                <div className="catalog-layout-asset-groups">
                  {groupedAssets.map((group) => (
                    <section className="catalog-layout-asset-group" key={group.type}>
                      <header>
                        <h3>{formatEnumLabel(group.type)}</h3>
                        <span>{group.assets.length} asset(s)</span>
                      </header>
                      <div className="catalog-layout-asset-list">
                        {group.assets.map((asset) => {
                          const previewUrl = getAssetPreviewUrl(asset);
                          const isSelected = selectedAsset?.layoutAssetId === asset.layoutAssetId;

                          return (
                            <article className={isSelected ? 'catalog-layout-asset-item is-selected' : 'catalog-layout-asset-item'} key={asset.layoutAssetId}>
                              <button className="catalog-layout-asset-pick" type="button" onClick={() => setSelectedAssetId(asset.layoutAssetId)}>
                                <span className="catalog-layout-asset-preview">
                                  {previewUrl ? <img alt="" src={previewUrl} /> : <IconCube size={24} />}
                                </span>
                                <span className="catalog-layout-asset-copy">
                                  <strong>{asset.name}</strong>
                                  <small>{asset.code ?? asset.assetCode ?? asset.layoutAssetId}</small>
                                  {asset.description ? <em>{asset.description}</em> : null}
                                </span>
                              </button>
                              <div className="catalog-layout-asset-meta">
                                <span className={`catalog-layout-asset-status is-${(asset.status ?? 'UNKNOWN').toLowerCase()}`}>
                                  {formatEnumLabel(asset.status ?? 'UNKNOWN')}
                                </span>
                                <span>{getAssetFileCount(asset)} file(s)</span>
                              </div>
                              <div className="catalog-layout-asset-actions">
                                <button className="admin-button admin-button-secondary" disabled={asset.status === 'ACTIVE'} type="button" onClick={() => void updateStatus(asset, 'ACTIVE')}>Active</button>
                                <button className="admin-button admin-button-secondary" disabled={asset.status === 'INACTIVE'} type="button" onClick={() => void updateStatus(asset, 'INACTIVE')}>Inactive</button>
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
                <section className="catalog-layout-asset-selected">
                  <div className="catalog-layout-asset-selected-media">
                    {selectedAsset && getAssetPreviewUrl(selectedAsset) ? <img alt="" src={getAssetPreviewUrl(selectedAsset) ?? ''} /> : <IconPhoto size={30} />}
                  </div>
                  <div>
                    <span>Selected Asset</span>
                    <strong>{selectedAsset?.name ?? 'No asset selected'}</strong>
                    <p>{selectedAsset ? `${formatEnumLabel(getAssetType(selectedAsset))} - ${formatEnumLabel(selectedAsset.status ?? 'UNKNOWN')}` : 'Choose an asset to manage files.'}</p>
                  </div>
                </section>

                <form className="catalog-model-form" onSubmit={(event) => void uploadFile(event)}>
                  <h3><IconUpload size={18} /> Upload Asset File</h3>
                  <p className="catalog-model-muted">{selectedAsset ? selectedAsset.name : 'Select an asset first.'}</p>
                  <label>
                    <span>File Type</span>
                    <select name="fileType">
                      {fileTypes.map((type) => <option key={type} value={type}>{formatEnumLabel(type)}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>File</span>
                    <input name="file" type="file" />
                  </label>
                  <button className="admin-button admin-button-primary" disabled={!selectedAsset || uploadFileMutation.isPending} type="submit">
                    {uploadFileMutation.isPending ? 'Uploading...' : 'Upload File'}
                  </button>
                </form>

                <div className="catalog-model-form">
                  <h3><IconPhoto size={18} /> Asset Files</h3>
                  <p className="catalog-model-muted">{selectedAsset ? selectedAsset.name : 'Select an asset first.'}</p>
                  {selectedAssetFilesQuery.isLoading ? <p className="catalog-model-muted">Loading files...</p> : null}
                  {selectedAssetFiles.length === 0 ? <p className="catalog-model-muted">No files uploaded yet.</p> : null}
                  <div className="catalog-model-file-list">
                    {selectedAssetFiles.map((file) => (
                      <div className="catalog-model-file-row" key={file.fileId}>
                        <span className="catalog-model-file-thumb">
                          {getAssetFileUrl(file) && (file.mimeType?.startsWith('image/') || file.fileType === 'PREVIEW')
                            ? <img alt="" src={getAssetFileUrl(file) ?? ''} />
                            : <IconCube size={18} />}
                        </span>
                        <div>
                          <strong>{file.fileName ?? file.originalFileName ?? file.fileId}</strong>
                          <small>{formatEnumLabel(file.fileType ?? 'OTHER')} {file.isPrimary ? '- Primary' : ''}</small>
                        </div>
                        <div className="product-management-row-actions">
                          <button
                            className="admin-button admin-button-secondary"
                            disabled={Boolean(file.isPrimary) || setPrimaryFileMutation.isPending}
                            type="button"
                            onClick={() => void setPrimaryFile(file.fileId)}
                          >
                            <IconStar size={15} /> Primary
                          </button>
                          <button
                            className="admin-button admin-button-secondary"
                            disabled={deleteFileMutation.isPending}
                            type="button"
                            onClick={() => void deleteFile(file.fileId)}
                          >
                            <IconTrash size={15} /> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </section>
          </div>
        </section>
      </div>

      {isCreateAssetModalOpen ? (
        <div className="catalog-model-modal-backdrop" role="presentation">
          <form className="catalog-model-create-modal" onSubmit={(event) => void createAsset(event)}>
            <header>
              <div>
                <h3>New Layout Asset</h3>
                <p>Create a material, structural object, or decorative model for Room Planner.</p>
              </div>
              <button aria-label="Close create layout asset modal" type="button" onClick={() => setIsCreateAssetModalOpen(false)}>x</button>
            </header>

            <div className="catalog-model-form">
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
                <select name="layoutAssetType" defaultValue="DECORATIVE_OBJECT">
                  {layoutAssetTypes.map((type) => <option key={type} value={type}>{formatEnumLabel(type)}</option>)}
                </select>
              </label>
              <label>
                <span>Status</span>
                <select name="status" defaultValue="ACTIVE">
                  {(['ACTIVE', 'INACTIVE', 'ARCHIVED'] as const).map((status) => <option key={status} value={status}>{formatEnumLabel(status)}</option>)}
                </select>
              </label>
              <label>
                <span>Description</span>
                <textarea name="description" placeholder="Usage note for designer" />
              </label>
            </div>

            <footer>
              <button className="admin-button admin-button-secondary" disabled={createAssetMutation.isPending} type="button" onClick={() => setIsCreateAssetModalOpen(false)}>
                Cancel
              </button>
              <button className="admin-button admin-button-primary" disabled={createAssetMutation.isPending} type="submit">
                {createAssetMutation.isPending ? 'Creating...' : 'Create Asset'}
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </main>
  );
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
