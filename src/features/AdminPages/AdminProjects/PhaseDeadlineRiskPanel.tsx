import { useEffect, useMemo, useState } from 'react';
import { IconAlertTriangle, IconChevronDown, IconChevronRight } from '@tabler/icons-react';

import {
  getDashboardServiceResultMessage,
  type ProjectPhaseDeadlineRiskItemDto,
  type ProjectPhaseDeadlineRiskPhase,
  type ProjectPhaseDeadlineRiskStatus,
} from '@/services/api/dashboard';
import { useProjectPhaseDeadlineRisks } from '@/services/queries';
import { useLang } from '@/app/providers/useLang';

import { adminCopy } from '../admincomponents/adminI18n';
import { ProjectsPager } from './ProjectsPager';

type Props = {
  onOpenProject: (projectId: string) => void;
  phase: ProjectPhaseDeadlineRiskPhase | '';
  status: ProjectPhaseDeadlineRiskStatus | '';
  onPhaseChange: (value: ProjectPhaseDeadlineRiskPhase | '') => void;
  onStatusChange: (value: ProjectPhaseDeadlineRiskStatus | '') => void;
};

export function PhaseDeadlineRiskPanel({
  onOpenProject,
  phase,
  status,
  onPhaseChange,
  onStatusChange,
}: Props) {
  const { lang } = useLang();
  const t = adminCopy[lang];
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [phase, status]);

  const risksQuery = useProjectPhaseDeadlineRisks({
    page,
    limit: pageSize,
    phase: phase || undefined,
    status: status || undefined,
  });

  const items = risksQuery.data?.items ?? [];
  const limit = risksQuery.data?.limit ?? pageSize;
  const total = risksQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const groupChips = useMemo(() => {
    const counts = risksQuery.data?.countsByGroup ?? {};
    return Object.entries(counts).map(([key, count]) => ({ key, count }));
  }, [risksQuery.data?.countsByGroup]);

  function handlePageSizeChange(nextSize: number) {
    setPageSize(nextSize);
    setPage(1);
  }

  return (
    <section className="admin-projects-deadline-risk" aria-label="Phase deadline risks">
      {risksQuery.isLoading ? <p className="admin-projects-state">{t.projects.loadingDeadlines}</p> : null}
      {risksQuery.isError ? (
        <p className="admin-projects-state admin-projects-state-error">
          {getDashboardServiceResultMessage(risksQuery.error)}
        </p>
      ) : null}

      <div className="admin-table-wrap">
        <div className="admin-projects-filters is-deadlines" aria-label="Deadline risk filters">
          <div className="admin-projects-deadline-risk-meta">
            <h3>{t.projects.deadlineTitle}</h3>
            <p>{t.projects.deadlineSubtitle}</p>
            {groupChips.length > 0 ? (
              <ul className="admin-projects-deadline-risk-chips">
                {groupChips.map((chip) => (
                  <li key={chip.key}>
                    <strong>{chip.count}</strong>
                    <span>{chip.key}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <label className="admin-projects-filter">
            <span>{t.projects.phase}</span>
            <div>
              <select value={phase} onChange={(event) => onPhaseChange(event.target.value as ProjectPhaseDeadlineRiskPhase | '')}>
                <option value="">{t.projects.allPhases}</option>
                <option value="PROPOSAL">Proposal</option>
                <option value="PRODUCTION">Production</option>
              </select>
              <IconChevronDown size={16} />
            </div>
          </label>

          <label className="admin-projects-filter">
            <span>{t.common.status}</span>
            <div>
              <select value={status} onChange={(event) => onStatusChange(event.target.value as ProjectPhaseDeadlineRiskStatus | '')}>
                <option value="">{t.projects.allStatuses}</option>
                <option value="OVERDUE">Overdue</option>
                <option value="ON_TRACK">On track</option>
                <option value="COMPLETED_ON_TIME">Completed on time</option>
                <option value="COMPLETED_LATE">Completed late</option>
              </select>
              <IconChevronDown size={16} />
            </div>
          </label>
        </div>

        {!risksQuery.isLoading && !risksQuery.isError ? (
          items.length === 0 ? (
            <p className="admin-projects-state">{t.projects.noDeadlines}</p>
          ) : (
            <table className="admin-projects-table admin-projects-deadline-risk-table">
              <thead>
                <tr>
                  <th>{t.projects.colProject}</th>
                  <th>{t.projects.phase}</th>
                  <th>Due</th>
                  <th>{t.projects.colOwners}</th>
                  <th>{t.common.status}</th>
                  <th>Days</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <DeadlineRiskRow key={`${item.projectId}-${item.phase}`} item={item} onOpen={onOpenProject} openLabel={t.common.open} />
                ))}
              </tbody>
            </table>
          )
        ) : null}
      </div>

      {!risksQuery.isLoading && !risksQuery.isError ? (
        <ProjectsPager
          page={page}
          pageSize={pageSize}
          totalItems={total}
          totalPages={totalPages}
          disabled={risksQuery.isFetching}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
      ) : null}
    </section>
  );
}

function DeadlineRiskRow({
  item,
  onOpen,
  openLabel,
}: {
  item: ProjectPhaseDeadlineRiskItemDto;
  onOpen: (projectId: string) => void;
  openLabel: string;
}) {
  const tone = getRiskTone(item.status as ProjectPhaseDeadlineRiskStatus, item.group);

  return (
    <tr>
      <td>
        <strong>{item.projectCode}</strong>
        <span>{item.projectName}</span>
      </td>
      <td>
        <span className="admin-projects-type">{formatLabel(String(item.phase))}</span>
        <span className="admin-projects-deadline-risk-group">{item.group}</span>
      </td>
      <td>{formatDateOnly(item.dueDate)}</td>
      <td>
        <strong>{item.assignedSalesName ?? 'Sales —'}</strong>
        <span>{item.assignedDesignerName ?? item.assignedProductionName ?? 'Owner —'}</span>
      </td>
      <td>
        <span className={`admin-projects-deadline-risk-status is-${tone}`}>
          {item.status === 'OVERDUE' ? <IconAlertTriangle size={12} /> : null}
          {formatLabel(String(item.status))}
        </span>
      </td>
      <td className={tone === 'bad' ? 'is-bad' : undefined}>{formatDays(item.days, item.status as ProjectPhaseDeadlineRiskStatus)}</td>
      <td>
        <button className="admin-projects-view-button" type="button" onClick={() => onOpen(item.projectId)}>
          {openLabel}
          <IconChevronRight size={14} />
        </button>
      </td>
    </tr>
  );
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDateOnly(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDays(days: number, status: ProjectPhaseDeadlineRiskStatus) {
  if (status === 'COMPLETED_ON_TIME' || status === 'COMPLETED_LATE') {
    return `${Math.abs(days)}d`;
  }
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  return `${days}d`;
}

function getRiskTone(status: ProjectPhaseDeadlineRiskStatus, group: string): 'bad' | 'warn' | 'good' | 'neutral' {
  if (status === 'OVERDUE' || group.toLowerCase().includes('overdue')) return 'bad';
  if (status === 'COMPLETED_LATE' || group.toLowerCase().includes('late') || group.toLowerCase().includes('soon')) {
    return 'warn';
  }
  if (status === 'COMPLETED_ON_TIME' || status === 'ON_TRACK') return 'good';
  return 'neutral';
}
