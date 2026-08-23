import { useMemo } from 'react';

import { getProjectServiceResultMessage, type ProjectPhaseDeadlineItemDto } from '@/services/api/projects';
import { useProjectPhaseDeadlines } from '@/services/queries';

import './ProjectPhaseTimelineCard.css';

type ProjectPhaseTimelineCardProps = {
  description?: string;
  emptyText?: string;
  phases?: string[];
  projectId?: string | null;
  title?: string;
};

export function ProjectPhaseTimelineCard({
  description = 'Timeline status is calculated by backend and is read-only.',
  emptyText = 'No phase deadline has been planned yet.',
  phases,
  projectId,
  title = 'Project Timeline',
}: ProjectPhaseTimelineCardProps) {
  const deadlinesQuery = useProjectPhaseDeadlines(projectId ?? undefined, { enabled: Boolean(projectId) });
  const phaseSet = useMemo(() => new Set((phases ?? []).map((phase) => phase.toUpperCase())), [phases]);
  const deadlines = useMemo(() => {
    const items = deadlinesQuery.data?.deadlines ?? [];

    if (!phaseSet.size) {
      return items;
    }

    return items.filter((deadline) => phaseSet.has(deadline.phase.toUpperCase()));
  }, [deadlinesQuery.data?.deadlines, phaseSet]);

  return (
    <section className="project-phase-timeline-card">
      <header>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        {deadlinesQuery.data?.targetCompletionDate ? (
          <span>Target {formatDateOnly(deadlinesQuery.data.targetCompletionDate)}</span>
        ) : null}
      </header>

      {deadlinesQuery.isLoading ? <p className="project-phase-timeline-state">Loading phase deadlines...</p> : null}
      {deadlinesQuery.isError ? (
        <p className="project-phase-timeline-state is-error">{getProjectServiceResultMessage(deadlinesQuery.error)}</p>
      ) : null}
      {!deadlinesQuery.isLoading && !deadlinesQuery.isError && deadlines.length === 0 ? (
        <p className="project-phase-timeline-state">{emptyText}</p>
      ) : null}

      {deadlines.length > 0 ? (
        <div className="project-phase-timeline-list">
          {deadlines.map((deadline) => (
            <article className="project-phase-timeline-item" key={deadline.phase}>
              <div>
                <span className={`project-phase-timeline-status project-phase-timeline-status-${getStatusTone(deadline.status)}`}>
                  {formatEnumLabel(deadline.status)}
                </span>
                <strong>{formatEnumLabel(deadline.phase)}</strong>
              </div>
              <p>{formatDeadlineDates(deadline)}</p>
              {deadline.overdueDays ? <small>{deadline.overdueDays} day(s) overdue</small> : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function formatDeadlineDates(deadline: ProjectPhaseDeadlineItemDto) {
  return [
    `Start ${formatDateOnly(deadline.startedAt) ?? '-'}`,
    `Due ${formatDateOnly(deadline.deadlineAt ?? deadline.dueDate) ?? '-'}`,
    `Done ${formatDateOnly(deadline.completedAt) ?? '-'}`,
  ].join(' | ');
}

function formatDateOnly(value?: string | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatEnumLabel(value?: string | null) {
  if (!value) return '-';

  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getStatusTone(status?: string | null) {
  if (status === 'OVERDUE' || status === 'COMPLETED_LATE') return 'danger';
  if (status === 'COMPLETED_ON_TIME') return 'success';
  if (status === 'ON_TRACK') return 'active';

  return 'planned';
}
