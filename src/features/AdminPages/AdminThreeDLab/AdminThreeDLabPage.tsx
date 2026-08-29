import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  IconChevronLeft,
  IconChevronRight,
  IconCube,
  IconFileText,
  IconFolder,
  IconSearch,
  IconX,
} from '@tabler/icons-react';
import { useQueries } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';

import { AdminNavbar, AdminSidebar } from '@/features/AdminPages/admincomponents';
import { useLang, type Lang } from '@/app/providers/useLang';
import { adminCopy } from '@/features/AdminPages/admincomponents/adminI18n';
import { getProjectServiceResultMessage, type ProjectListItemDto } from '@/services/api/projects';
import {
  type ProposalDto,
  type ProposalSceneDto,
  getProposalServiceResultMessage,
  getRoomPlannerScene,
  type RoomPlannerSceneData,
} from '@/services/api/proposals';
import { RoomPreview3D } from '@/features/ThreeD/components';
import type { RoomMaterialSelection } from '@/features/ThreeD/types/roomLayout.types';
import { hydrateRoomPlannerScenePayload } from '@/features/ThreeD/utils/roomPlannerSceneMapper';
import { BuildingSceneCanvas } from '@/features/ThreeDTest/components/BuildingSceneCanvas';
import {
  createProjectCatalogBuildingModelVersionMap,
  resolvePlacedBuildingProducts,
} from '@/features/ThreeDTest/utils/buildingProductCatalogMapper';
import { hydrateBuildingRoomPlannerPayload } from '@/features/ThreeDTest/utils/buildingRoomPlannerPayloadMapper';
import { getProjectCatalogProductVersion } from '@/services/api/products';
import { productQueryKeys, proposalQueryKeys, useProjectCatalogProducts, useProjectDetail, useProjectList, useProjectProposals, useProposalScenes, useRoomPlannerScene } from '@/services/queries';

import '@/features/AdminPages/AdminDashbroad/AdminDashbroad.css';
import './AdminThreeDLabPage.css';

const PROJECTS_PER_PAGE = 6;
const PREVIEW_PRODUCT_CATALOG_LIMIT = 100;

export function AdminThreeDLabPage() {
  const { lang } = useLang();
  const t = adminCopy[lang];
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PROJECTS_PER_PAGE);
  const [pageDraft, setPageDraft] = useState(String(1));
  const [sizeDraft, setSizeDraft] = useState(String(PROJECTS_PER_PAGE));
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [previewScene, setPreviewScene] = useState<{
    projectId: string;
    proposalId: string;
    scene: ProposalSceneDto;
  } | null>(null);
  const projectsQuery = useProjectList({
    limit: pageSize,
    page,
    search,
  });
  const projects = useMemo(() => projectsQuery.data?.items ?? [], [projectsQuery.data?.items]);
  const totalProjects = projectsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalProjects / pageSize));
  const currentPage = Math.min(page, totalPages);
  const selectedProject = projects.find((project) => project.projectId === selectedProjectId) ?? projects[0] ?? null;
  const projectDetailQuery = useProjectDetail(selectedProject?.projectId);
  const proposalsQuery = useProjectProposals(
    selectedProject
      ? {
          projectId: selectedProject.projectId,
          page: 1,
          limit: 100,
        }
      : undefined,
  );
  const proposals = useMemo(() => proposalsQuery.data?.items ?? [], [proposalsQuery.data?.items]);
  const selectedProposal = proposals.find((proposal) => proposal.proposalId === selectedProposalId) ?? getDefaultProposal(proposals);
  const scenesQuery = useProposalScenes(
    selectedProposal
      ? {
          proposalId: selectedProposal.proposalId,
          isActive: true,
          page: 1,
          limit: 100,
        }
      : undefined,
  );
  const scenes = useMemo(
    () => (scenesQuery.data?.items ?? []).filter(isRoomPlannerPreviewScene),
    [scenesQuery.data?.items],
  );
  const labStats = useMemo(
    () => [
      {
        label: lang === 'vi' ? 'Dự án' : 'Projects',
        value: totalProjects,
        helper: lang === 'vi' ? 'Tổng project đang lọc' : 'Total projects in filter',
        icon: IconFolder,
        tone: 'dark' as const,
      },
      {
        label: lang === 'vi' ? 'Proposal' : 'Proposals',
        value: proposals.length,
        helper: lang === 'vi' ? 'Trong project đang chọn' : 'In selected project',
        icon: IconFileText,
        tone: 'gold' as const,
      },
      {
        label: lang === 'vi' ? 'Scene 3D' : '3D Scenes',
        value: scenes.length,
        helper: lang === 'vi' ? 'Trong proposal đang chọn' : 'In selected proposal',
        icon: IconCube,
        tone: 'green' as const,
      },
    ],
    [lang, proposals.length, scenes.length, totalProjects],
  );

  useEffect(() => {
    setPageDraft(String(currentPage));
  }, [currentPage]);

  useEffect(() => {
    setSizeDraft(String(pageSize));
  }, [pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (!projects.length) {
      setSelectedProjectId(null);
      return;
    }

    if (!selectedProjectId || !projects.some((project) => project.projectId === selectedProjectId)) {
      setSelectedProjectId(projects[0].projectId);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    setSelectedProposalId(null);
  }, [selectedProject?.projectId]);

  useEffect(() => {
    if (!proposals.length) {
      setSelectedProposalId(null);
      return;
    }

    if (!selectedProposalId || !proposals.some((proposal) => proposal.proposalId === selectedProposalId)) {
      setSelectedProposalId(getDefaultProposal(proposals)?.proposalId ?? null);
    }
  }, [proposals, selectedProposalId]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchDraft.trim());
  }

  function commitPage() {
    const parsed = Number.parseInt(pageDraft, 10);
    const next = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), totalPages) : currentPage;
    setPageDraft(String(next));
    if (next !== page) setPage(next);
  }

  function commitPageSize() {
    const parsed = Number.parseInt(sizeDraft, 10);
    const next = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 100) : pageSize;
    setSizeDraft(String(next));
    if (next !== pageSize) {
      setPageSize(next);
      setPage(1);
    }
  }

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <AdminSidebar activeKey="threeDLab" />

        <section className="admin-main admin-three-d-lab-main">
          <AdminNavbar activeLabel={t.nav.threeDLab} />
          <div className="admin-three-d-lab-content">
            <header className="admin-three-d-lab-header">
              <div>
                <span>Admin 3D Lab</span>
                <h1>{t.threeDLab.title}</h1>
                <p>{t.threeDLab.subtitle}</p>
              </div>
              <form className="admin-three-d-lab-search" onSubmit={submitSearch}>
                <IconSearch size={18} />
                <input
                  aria-label="Search projects"
                  placeholder={lang === 'vi' ? 'Tìm tên hoặc mã dự án' : 'Search project name or code'}
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                />
                <button type="submit">{lang === 'vi' ? 'Tìm' : 'Search'}</button>
              </form>
            </header>

            <section className="admin-three-d-lab-stats" aria-label="3D lab summary">
              {labStats.map(({ label, value, helper, icon: Icon, tone }) => (
                <article className="admin-three-d-stat-card" key={label}>
                  <div>
                    <span>{label}</span>
                    <strong>{value}</strong>
                    <p>{helper}</p>
                  </div>
                  <div className={`admin-three-d-stat-icon is-${tone}`}>
                    <Icon size={22} />
                  </div>
                </article>
              ))}
            </section>

            {projectsQuery.isError && (
              <div className="admin-three-d-lab-alert">{getProjectServiceResultMessage(projectsQuery.error)}</div>
            )}

            {projectsQuery.isLoading ? (
              <div className="admin-three-d-lab-empty">
                <span className="admin-three-d-empty-icon"><IconCube size={26} /></span>
                <strong>{lang === 'vi' ? 'Đang tải dự án...' : 'Loading projects...'}</strong>
                <p>{lang === 'vi' ? 'Đang lấy danh sách project từ backend.' : 'Fetching projects from backend.'}</p>
              </div>
            ) : projects.length ? (
              <div className="admin-three-d-lab-workspace">
                <div className="admin-three-d-project-column">
                  <aside className="admin-three-d-project-list" aria-label="Projects">
                    <div className="admin-three-d-list-heading">
                      <div>
                        <span>{lang === 'vi' ? 'Danh sách' : 'Browse'}</span>
                        <strong>{lang === 'vi' ? 'Projects' : 'Projects'}</strong>
                      </div>
                      <em>{projects.length}</em>
                    </div>
                    <div className="admin-three-d-project-scroll">
                      {projects.map((project) => (
                        <ProjectPickerItem
                          isSelected={project.projectId === selectedProject?.projectId}
                          key={project.projectId}
                          project={project}
                          onSelect={() => setSelectedProjectId(project.projectId)}
                        />
                      ))}
                    </div>
                  </aside>

                  <footer className="admin-three-d-lab-pagination">
                    <div className="admin-three-d-lab-pagination-meta">
                      <label className="admin-three-d-lab-pagination-field">
                        <span>{t.common.rows}</span>
                        <input
                          aria-label={t.common.rows}
                          disabled={projectsQuery.isFetching}
                          max={100}
                          min={1}
                          type="number"
                          value={sizeDraft}
                          onBlur={commitPageSize}
                          onChange={(event) => setSizeDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') event.currentTarget.blur();
                          }}
                        />
                      </label>
                      <label className="admin-three-d-lab-pagination-field">
                        <span>{t.common.page}</span>
                        <input
                          aria-label={t.common.page}
                          disabled={projectsQuery.isFetching}
                          max={totalPages}
                          min={1}
                          type="number"
                          value={pageDraft}
                          onBlur={commitPage}
                          onChange={(event) => setPageDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') event.currentTarget.blur();
                          }}
                        />
                        <span className="admin-three-d-lab-pagination-of">/ {totalPages}</span>
                      </label>
                      <span className="admin-three-d-lab-pagination-total">
                        {totalProjects} {lang === 'vi' ? 'dự án' : 'projects'}
                      </span>
                    </div>
                    <div className="admin-three-d-lab-pagination-nav">
                      <button
                        disabled={currentPage <= 1 || projectsQuery.isFetching}
                        type="button"
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                      >
                        <IconChevronLeft size={16} /> {t.common.previous}
                      </button>
                      <button
                        disabled={currentPage >= totalPages || projectsQuery.isFetching}
                        type="button"
                        onClick={() => setPage((current) => current + 1)}
                      >
                        {t.common.next} <IconChevronRight size={16} />
                      </button>
                    </div>
                  </footer>
                </div>

                <section className="admin-three-d-detail-stack" aria-label="Selected project and proposal">
                  {selectedProject ? (
                    <ProjectInformationPanel
                      isLoading={projectDetailQuery.isLoading}
                      project={projectDetailQuery.data ?? selectedProject}
                    />
                  ) : null}

                  <SelectedProposalPanel
                    emptyLabel={t.threeDLab.noProposal}
                    isLoadingProposals={proposalsQuery.isLoading}
                    isLoadingScenes={scenesQuery.isLoading}
                    lang={lang}
                    projectId={selectedProject?.projectId ?? ''}
                    proposal={selectedProposal}
                    proposals={proposals}
                    scenes={scenes}
                    scenesError={scenesQuery.isError ? getProposalServiceResultMessage(scenesQuery.error) : null}
                    onOpenScenePreview={setPreviewScene}
                    onSelectProposal={setSelectedProposalId}
                  />

                  {proposalsQuery.isError ? (
                    <div className="admin-three-d-card-alert">{getProposalServiceResultMessage(proposalsQuery.error)}</div>
                  ) : null}
                </section>
              </div>
            ) : (
              <div className="admin-three-d-lab-empty">
                <span className="admin-three-d-empty-icon"><IconFolder size={26} /></span>
                <strong>{lang === 'vi' ? 'Không tìm thấy dự án' : 'No projects found'}</strong>
                <p>
                  {lang === 'vi'
                    ? 'Thử đổi từ khóa tìm kiếm hoặc kiểm tra bộ lọc hiện tại.'
                    : 'Try a different search keyword or check the current filters.'}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
      {previewScene ? (
        <ScenePreviewModal
          preview={previewScene}
          onClose={() => setPreviewScene(null)}
        />
      ) : null}
    </main>
  );
}

function ProjectPickerItem({
  isSelected,
  onSelect,
  project,
}: {
  isSelected: boolean;
  onSelect: () => void;
  project: ProjectListItemDto;
}) {
  return (
    <button
      className={isSelected ? 'admin-three-d-project-item is-selected' : 'admin-three-d-project-item'}
      type="button"
      onClick={onSelect}
    >
      <span className="admin-three-d-project-item-main">
        <span className="admin-three-d-project-icon"><IconFolder size={20} /></span>
        <span>
          <span>{project.projectCode}</span>
          <strong>{project.projectName}</strong>
          <small className="admin-three-d-project-item-meta">{formatEnumLabel(project.status)} - {project.businessType}</small>
        </span>
      </span>
      <IconChevronRight size={17} />
    </button>
  );
}

function ProjectInformationPanel({
  isLoading,
  project,
}: {
  isLoading: boolean;
  project: ProjectListItemDto & {
    budgetMax?: number | null;
    budgetMin?: number | null;
    description?: string | null;
    furnitureRequirement?: string;
    projectAddress?: string | null;
    targetCompletionDate?: string | null;
    totalAreaSqm?: number | null;
  };
}) {
  return (
    <article className="admin-three-d-info-panel">
      <header className="admin-three-d-panel-heading">
        <div>
          <span>Project information</span>
          <h2>{project.projectName}</h2>
        </div>
        <strong>{formatEnumLabel(project.status)}</strong>
      </header>

      {isLoading ? <div className="admin-three-d-muted">Loading project detail...</div> : null}

      <dl className="admin-three-d-project-facts">
        <InfoItem label="Project code" value={project.projectCode} />
        <InfoItem label="Business type" value={project.businessType} />
        <InfoItem label="Address" value={project.projectAddress ?? 'Not provided'} />
        <InfoItem label="Area" value={project.totalAreaSqm ? `${project.totalAreaSqm} sqm` : 'Not provided'} />
        <InfoItem label="Budget" value={formatBudget(project.budgetMin, project.budgetMax)} />
        <InfoItem label="Target date" value={formatDate(project.targetCompletionDate)} />
      </dl>

      <p className="admin-three-d-project-description">
        {project.description ?? project.furnitureRequirement ?? 'No project description has been provided yet.'}
      </p>
    </article>
  );
}

function SelectedProposalPanel({
  emptyLabel,
  isLoadingProposals,
  isLoadingScenes,
  lang,
  onOpenScenePreview,
  onSelectProposal,
  projectId,
  proposal,
  proposals,
  scenes,
  scenesError,
}: {
  emptyLabel: string;
  isLoadingProposals: boolean;
  isLoadingScenes: boolean;
  lang: Lang;
  onOpenScenePreview: (preview: { projectId: string; proposalId: string; scene: ProposalSceneDto }) => void;
  onSelectProposal: (proposalId: string) => void;
  projectId: string;
  proposal: ProposalDto | null;
  proposals: ProposalDto[];
  scenes: ProposalSceneDto[];
  scenesError: string | null;
}) {
  return (
    <article className="admin-three-d-info-panel admin-three-d-proposal-panel">
      <header className="admin-three-d-panel-heading">
        <div>
          <span>{lang === 'vi' ? 'Proposal đang chọn' : 'Selected proposal'}</span>
          <h2>{proposal?.proposalName ?? emptyLabel}</h2>
        </div>
        {proposal ? <strong>v{proposal.versionNo} · {proposal.status}</strong> : null}
      </header>

      {isLoadingProposals ? <div className="admin-three-d-muted">{lang === 'vi' ? 'Đang tải proposal...' : 'Loading proposal versions...'}</div> : null}
      {!isLoadingProposals && proposals.length === 0 ? (
        <div className="admin-three-d-muted">
          {lang === 'vi' ? 'Project này chưa có proposal.' : 'No proposal has been created for this project.'}
        </div>
      ) : null}

      {proposals.length > 0 ? (
        <div className="admin-three-d-proposal-selector" aria-label="Proposal versions">
          {proposals.map((candidate) => (
            <button
              className={candidate.proposalId === proposal?.proposalId ? 'is-selected' : ''}
              key={candidate.proposalId}
              type="button"
              onClick={() => onSelectProposal(candidate.proposalId)}
            >
              <IconFileText size={16} />
              <span>
                <strong>{candidate.proposalName}</strong>
                <small>v{candidate.versionNo} · {candidate.status}</small>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {proposal ? (
        <section className="admin-three-d-scene-panel" aria-label="Scenes in selected proposal">
          <div className="admin-three-d-scene-panel-heading">
            <span>{lang === 'vi' ? 'Scene trong proposal' : 'Scenes inside this proposal'}</span>
            <strong>{scenes.length}</strong>
          </div>
          {scenesError ? <div className="admin-three-d-card-alert">{scenesError}</div> : null}
          {isLoadingScenes ? <div className="admin-three-d-muted">{lang === 'vi' ? 'Đang tải scene 3D...' : 'Loading 3D scenes...'}</div> : null}
          {!isLoadingScenes && scenes.length === 0 ? (
            <div className="admin-three-d-muted">
              {lang === 'vi' ? 'Proposal này chưa có scene 3D active.' : 'No active 3D scene in this proposal.'}
            </div>
          ) : null}
          {scenes.map((scene) => (
            <SceneLink
              key={scene.sceneId}
              lang={lang}
              projectId={projectId}
              proposalId={proposal.proposalId}
              scene={scene}
              onOpen={onOpenScenePreview}
            />
          ))}
        </section>
      ) : null}
    </article>
  );
}

function SceneLink({
  lang,
  onOpen,
  projectId,
  proposalId,
  scene,
}: {
  lang: Lang;
  onOpen: (preview: { projectId: string; proposalId: string; scene: ProposalSceneDto }) => void;
  projectId: string;
  proposalId: string;
  scene: ProposalSceneDto;
}) {
  const queryClient = useQueryClient();

  function warmScenePreview() {
    void queryClient.prefetchQuery({
      queryKey: proposalQueryKeys.roomPlanner(scene.sceneId),
      queryFn: () => getRoomPlannerScene(scene.sceneId),
      staleTime: 60_000,
    });
  }

  return (
    <button
      className="admin-three-d-scene-link"
      type="button"
      onClick={() => onOpen({ projectId, proposalId, scene })}
      onFocus={warmScenePreview}
      onMouseEnter={warmScenePreview}
    >
      <span className="admin-three-d-scene-link-icon"><IconCube size={17} /></span>
      <span>
        <strong>{scene.sceneName}</strong>
        <small>
          Scene v{scene.versionNo} ·{' '}
          {scene.mongoSceneId
            ? (lang === 'vi' ? 'Đã lưu Room Planner' : 'Saved Room Planner scene')
            : (lang === 'vi' ? 'Chưa có bản lưu' : 'No Room Planner save yet')}
        </small>
      </span>
      <span className="admin-three-d-open-chip">{lang === 'vi' ? 'Mở' : 'Open'}</span>
    </button>
  );
}

function ScenePreviewModal({
  onClose,
  preview,
}: {
  onClose: () => void;
  preview: { projectId: string; proposalId: string; scene: ProposalSceneDto };
}) {
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const roomPlannerSceneQuery = useRoomPlannerScene(preview.scene.sceneId);
  const hydratedScene = useMemo(
    () => hydrateRoomPlannerScenePayload(roomPlannerSceneQuery.data),
    [roomPlannerSceneQuery.data],
  );
  const hydratedBuildingScene = useMemo(
    () => hydrateBuildingRoomPlannerPayload(roomPlannerSceneQuery.data),
    [roomPlannerSceneQuery.data],
  );
  const shouldResolveBuildingProducts = Boolean(hydratedBuildingScene.sceneData);
  const projectCatalogQuery = useProjectCatalogProducts(
    preview.projectId,
    { page: 1, pageSize: PREVIEW_PRODUCT_CATALOG_LIMIT },
    shouldResolveBuildingProducts,
  );
  const projectCatalogVersions = useMemo(
    () => (projectCatalogQuery.data?.items ?? []).flatMap((product) => product.eligibleVersions.map((version) => ({ product, version }))),
    [projectCatalogQuery.data?.items],
  );
  const projectCatalogVersionDetailQueries = useQueries({
    queries: projectCatalogVersions.map(({ product, version }) => ({
      enabled: shouldResolveBuildingProducts && Boolean(version.productVersionId),
      queryFn: async () => {
        const response = await getProjectCatalogProductVersion({
          productVersionId: version.productVersionId,
          projectId: preview.projectId,
        });

        return { product, version: response };
      },
      queryKey: productQueryKeys.projectCatalogVersion(preview.projectId, version.productVersionId),
      staleTime: 5 * 60 * 1000,
    })),
  });
  const buildingModelsByVersionId = useMemo(
    () => createProjectCatalogBuildingModelVersionMap(projectCatalogVersionDetailQueries.map((query) => query.data)),
    [projectCatalogVersionDetailQueries],
  );
  const resolvedBuildingProducts = useMemo(
    () => resolvePlacedBuildingProducts(hydratedBuildingScene.placedProducts, buildingModelsByVersionId),
    [buildingModelsByVersionId, hydratedBuildingScene.placedProducts],
  );
  const floorMaterial = useMemo(
    () => getSceneFloorMaterial(roomPlannerSceneQuery.data),
    [roomPlannerSceneQuery.data],
  );
  const wallMaterial = useMemo(
    () => getSceneWallMaterial(roomPlannerSceneQuery.data),
    [roomPlannerSceneQuery.data],
  );

  return (
    <div className="admin-three-d-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-label={`${preview.scene.sceneName} read-only preview`}
        aria-modal="true"
        className="admin-three-d-scene-modal"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="admin-three-d-scene-modal-header">
          <div>
            <span>Read-only scene preview</span>
            <h2>{preview.scene.sceneName}</h2>
            <p>Scene v{preview.scene.versionNo} - {preview.scene.mongoSceneId ? 'Saved Room Planner scene' : 'No Room Planner save yet'}</p>
          </div>
          <button aria-label="Close scene preview" type="button" onClick={onClose}>
            <IconX size={20} />
          </button>
        </header>

        <div className="admin-three-d-scene-modal-body">
          {roomPlannerSceneQuery.isLoading ? (
            <SceneModalState message="Loading saved Room Planner scene..." />
          ) : roomPlannerSceneQuery.isError ? (
            <SceneModalState message={getProposalServiceResultMessage(roomPlannerSceneQuery.error)} />
          ) : !hydratedScene.layout && !hydratedBuildingScene.sceneData ? (
            <SceneModalState message="This scene has no saved room layout yet." />
          ) : hydratedBuildingScene.sceneData ? (
            <BuildingSceneCanvas
              activeLevel="all"
              modelsById={new Map()}
              placedProducts={resolvedBuildingProducts}
              sceneData={hydratedBuildingScene.sceneData}
              selectedProductId={selectedObjectId}
              onProductDrop={() => undefined}
              onProductLoadError={() => undefined}
              onProductMove={() => undefined}
              onProductSelect={(productId) => setSelectedObjectId(productId)}
            />
          ) : hydratedScene.layout ? (
            <RoomPreview3D
              floorMaterial={floorMaterial}
              layout={hydratedScene.layout}
              placedProducts={hydratedScene.placedProducts}
              readOnly
              selectedProductId={selectedObjectId}
              wallMaterial={wallMaterial}
              onProductSelect={(productId) => setSelectedObjectId(productId)}
            />
          ) : (
            <SceneModalState message="This scene has no supported room layout yet." />
          )}
        </div>
      </section>
    </div>
  );
}

function SceneModalState({ message }: { message: string }) {
  return (
    <div className="admin-three-d-scene-modal-state">
      <span><IconCube size={24} /></span>
      {message}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function formatBudget(min?: number | null, max?: number | null) {
  if (min == null && max == null) return 'Not provided';

  const formatter = new Intl.NumberFormat('vi-VN');

  if (min != null && max != null) return `${formatter.format(min)} - ${formatter.format(max)} VND`;
  if (min != null) return `From ${formatter.format(min)} VND`;
  return `Up to ${formatter.format(max ?? 0)} VND`;
}

function formatDate(value?: string | null) {
  if (!value) return 'Not provided';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function getSceneFloorMaterial(scene: RoomPlannerSceneData | null | undefined): RoomMaterialSelection {
  const layout = scene?.layout as {
    floor?: {
      color?: string | null;
      materialId?: string | null;
    };
    floorMaterialId?: string | null;
  } | undefined;

  return {
    fallbackColor: layout?.floor?.color ?? '#8B5A2B',
    id: layout?.floor?.materialId ?? layout?.floorMaterialId ?? 'scene-floor',
    label: layout?.floor?.materialId ?? layout?.floorMaterialId ?? 'Scene Floor',
    textureUrl: undefined,
    type: 'floor',
  };
}

function getSceneWallMaterial(scene: RoomPlannerSceneData | null | undefined): RoomMaterialSelection {
  const layout = scene?.layout as {
    wallMaterialId?: string | null;
    walls?: Array<{
      style?: {
        color?: string | null;
        materialId?: string | null;
      };
    }>;
  } | undefined;
  const wallStyle = layout?.walls?.find((wall) => wall.style)?.style;

  return {
    fallbackColor: wallStyle?.color ?? '#D8D2C5',
    id: wallStyle?.materialId ?? layout?.wallMaterialId ?? 'scene-wall',
    label: wallStyle?.materialId ?? layout?.wallMaterialId ?? 'Scene Wall',
    textureUrl: undefined,
    type: 'wall',
  };
}

function getDefaultProposal(proposals: ProposalDto[]) {
  return proposals.find((proposal) => proposal.status === 'SELECTED') ?? proposals[0] ?? null;
}

function isRoomPlannerPreviewScene(scene: { sceneType?: string | null }) {
  return scene.sceneType === 'ROOM_PLANNER' || scene.sceneType === 'THREE_D';
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
