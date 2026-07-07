import { type FormEvent, useMemo, useState } from 'react';
import {
  IconChevronLeft,
  IconChevronRight,
  IconCube,
  IconFileText,
  IconFolder,
  IconSearch,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

import { AdminNavbar, AdminSidebar } from '@/features/AdminPages/admincomponents';
import { getProjectServiceResultMessage, type ProjectListItemDto } from '@/services/api/projects';
import { type ProposalDto, type ProposalSceneDto, getProposalServiceResultMessage } from '@/services/api/proposals';
import { useProjectList, useProjectProposals, useProposalScenes } from '@/services/queries';

import '@/features/AdminPages/AdminDashbroad/AdminDashbroad.css';
import './AdminThreeDLabPage.css';

const PROJECTS_PER_PAGE = 6;

export function AdminThreeDLabPage() {
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const projectsQuery = useProjectList({
    limit: PROJECTS_PER_PAGE,
    page,
    search,
  });
  const projects = projectsQuery.data?.items ?? [];
  const totalProjects = projectsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalProjects / PROJECTS_PER_PAGE));

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchDraft.trim());
  }

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <AdminSidebar activeLabel="3D Lab" />

        <section className="admin-main admin-three-d-lab-main">
          <AdminNavbar activeLabel="3D Lab" />
          <div className="admin-three-d-lab-content">
            <header className="admin-three-d-lab-header">
              <div>
                <span>Admin 3D Lab</span>
                <h1>3D proposal projects</h1>
                <p>Browse projects, inspect their proposal versions, and open each saved 3D design scene.</p>
              </div>
              <form className="admin-three-d-lab-search" onSubmit={submitSearch}>
                <IconSearch size={18} />
                <input
                  aria-label="Search projects"
                  placeholder="Search project name or code"
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                />
                <button type="submit">Search</button>
              </form>
            </header>

            {projectsQuery.isError && (
              <div className="admin-three-d-lab-alert">{getProjectServiceResultMessage(projectsQuery.error)}</div>
            )}

            {projectsQuery.isLoading ? (
              <div className="admin-three-d-lab-empty">Loading projects from backend...</div>
            ) : projects.length ? (
              <div className="admin-three-d-lab-grid">
                {projects.map((project) => (
                  <ProjectProposalCard key={project.projectId} project={project} />
                ))}
              </div>
            ) : (
              <div className="admin-three-d-lab-empty">No projects found for the current filters.</div>
            )}

            <footer className="admin-three-d-lab-pagination">
              <span>
                Page {page} of {totalPages} · {totalProjects} projects
              </span>
              <div>
                <button disabled={page <= 1 || projectsQuery.isFetching} type="button" onClick={() => setPage((current) => Math.max(1, current - 1))}>
                  <IconChevronLeft size={17} /> Previous
                </button>
                <button disabled={page >= totalPages || projectsQuery.isFetching} type="button" onClick={() => setPage((current) => current + 1)}>
                  Next <IconChevronRight size={17} />
                </button>
              </div>
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
}

function ProjectProposalCard({ project }: { project: ProjectListItemDto }) {
  const proposalsQuery = useProjectProposals({
    projectId: project.projectId,
    page: 1,
    limit: 100,
  });
  const proposals = useMemo(() => proposalsQuery.data?.items ?? [], [proposalsQuery.data?.items]);

  return (
    <article className="admin-three-d-project-card">
      <header>
        <div className="admin-three-d-project-icon"><IconFolder size={20} /></div>
        <div>
          <span>{project.projectCode}</span>
          <h2>{project.projectName}</h2>
          <p>{formatEnumLabel(project.status)} · {project.businessType}</p>
        </div>
      </header>

      {proposalsQuery.isError && (
        <div className="admin-three-d-card-alert">{getProposalServiceResultMessage(proposalsQuery.error)}</div>
      )}

      <div className="admin-three-d-version-list">
        {proposalsQuery.isLoading ? <div className="admin-three-d-muted">Loading proposal versions...</div> : null}
        {!proposalsQuery.isLoading && proposals.length === 0 ? <div className="admin-three-d-muted">No 3D proposal has been created for this project.</div> : null}
        {proposals.map((proposal) => (
          <ProposalVersionRow key={proposal.proposalId} proposal={proposal} projectId={project.projectId} />
        ))}
      </div>
    </article>
  );
}

function ProposalVersionRow({ projectId, proposal }: { projectId: string; proposal: ProposalDto }) {
  const scenesQuery = useProposalScenes({
    proposalId: proposal.proposalId,
    sceneType: 'THREE_D',
    isActive: true,
    page: 1,
    limit: 100,
  });
  const scenes = scenesQuery.data?.items ?? [];

  return (
    <section className="admin-three-d-version-row">
      <div className="admin-three-d-version-heading">
        <div>
          <IconFileText size={17} />
          <strong>{proposal.proposalName}</strong>
        </div>
        <span>v{proposal.versionNo} · {proposal.status}</span>
      </div>

      {scenesQuery.isError && <div className="admin-three-d-card-alert">{getProposalServiceResultMessage(scenesQuery.error)}</div>}
      {scenesQuery.isLoading ? <div className="admin-three-d-muted">Loading 3D scenes...</div> : null}
      {!scenesQuery.isLoading && scenes.length === 0 ? <div className="admin-three-d-muted">No active 3D scene in this proposal.</div> : null}
      {scenes.map((scene) => (
        <SceneLink key={scene.sceneId} projectId={projectId} proposalId={proposal.proposalId} scene={scene} />
      ))}
    </section>
  );
}

function SceneLink({ projectId, proposalId, scene }: { projectId: string; proposalId: string; scene: ProposalSceneDto }) {
  const navigate = useNavigate();

  return (
    <button
      className="admin-three-d-scene-link"
      type="button"
      onClick={() =>
        navigate(`/proposal-scenes/${scene.sceneId}/room-planner`, {
          state: {
            mode: 'admin-review',
            projectId,
            proposalId,
            returnTo: '/admin/3d-lab',
          },
        })
      }
    >
      <IconCube size={17} />
      <span>
        <strong>{scene.sceneName}</strong>
        <small>Scene v{scene.versionNo} · {scene.mongoSceneId ? 'Saved Room Planner scene' : 'No Room Planner save yet'}</small>
      </span>
      <IconChevronRight size={17} />
    </button>
  );
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
