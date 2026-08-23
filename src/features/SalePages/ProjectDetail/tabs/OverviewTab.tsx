import type { ProjectDetailProject } from '../ProjectDetail';

type OverviewTabProps = {
  project: ProjectDetailProject;
};

export function OverviewTab({ project }: OverviewTabProps) {
  const projectInfo = [
    ['Business Type', project.businessType],
    ['Total Area', formatArea(project.totalAreaSqm)],
    ['Number of Floors', formatNumber(project.numberOfFloors)],
    ['Target Completion', formatDateOnly(project.targetCompletionDate)],
    ['Budget Range', formatBudgetRange(project.budgetMin, project.budgetMax)],
  ].filter(([, value]) => Boolean(value));

  const textBlocks = [
    ['Project Address', project.projectAddress],
    ['Business Purpose', project.businessPurpose],
    ['Furniture Requirements', project.furnitureRequirement],
    ['Description', project.description],
  ].filter(([, value]) => Boolean(value));

  return (
    <div className="project-detail-overview project-detail-tab-panel">
      <section className="project-detail-card project-detail-information-card">
        <header>
          <h3>Project Information</h3>
        </header>

        {projectInfo.length > 0 ? (
          <div className="project-detail-info-grid">
            {projectInfo.map(([label, value]) => (
              <div key={label} className="project-detail-info-item">
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        ) : null}

        {textBlocks.length > 0 ? <div className="project-detail-section-divider" /> : null}

        {textBlocks.map(([label, value]) => (
          <div key={label} className="project-detail-text-block">
            <span>{label}</span>
            <p>{value}</p>
          </div>
        ))}
      </section>

      {project.phaseDeadlines?.length ? (
        <section className="project-detail-card project-detail-information-card">
          <header>
            <h3>Phase Timeline</h3>
          </header>
          <div className="project-detail-info-grid">
            {project.phaseDeadlines.map((deadline) => (
              <div className="project-detail-info-item" key={deadline.phase}>
                <span>{formatEnumLabel(deadline.phase)}</span>
                <strong>{formatEnumLabel(deadline.status)}</strong>
                <small>
                  Start {formatDateOnly(deadline.startedAt) ?? '-'} · Due {formatDateOnly(deadline.deadlineAt ?? deadline.dueDate) ?? '-'} · Done {formatDateOnly(deadline.completedAt) ?? '-'}
                </small>
                {deadline.overdueDays ? <small>{deadline.overdueDays} day(s) overdue</small> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {project.deliverySummary ? (
        <section className="project-detail-card project-detail-information-card">
          <header>
            <h3>Delivery Summary</h3>
          </header>
          <div className="project-detail-info-grid">
            <div className="project-detail-info-item">
              <span>Status</span>
              <strong>{formatEnumLabel(project.deliverySummary.status ?? project.status)}</strong>
            </div>
            <div className="project-detail-info-item">
              <span>Delivered</span>
              <strong>{project.deliverySummary.deliveredQuantity} / {project.deliverySummary.totalQuantity}</strong>
            </div>
            <div className="project-detail-info-item">
              <span>Remaining</span>
              <strong>{project.deliverySummary.remainingQuantity}</strong>
            </div>
            <div className="project-detail-info-item">
              <span>Next Delivery</span>
              <strong>{formatDateOnly(project.deliverySummary.nextDeliveryAt) ?? '-'}</strong>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function formatArea(value: number | null) {
  return typeof value === 'number' ? `${value} sqm` : null;
}

function formatNumber(value: number | null) {
  return typeof value === 'number' ? String(value) : null;
}

function formatDateOnly(value?: string | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatBudgetRange(min: number | null, max: number | null) {
  if (typeof min !== 'number' && typeof max !== 'number') {
    return null;
  }

  const formatter = new Intl.NumberFormat('en');
  const minText = typeof min === 'number' ? formatter.format(min) : null;
  const maxText = typeof max === 'number' ? formatter.format(max) : null;

  if (minText && maxText) return `${minText} - ${maxText}`;
  return minText ?? maxText;
}

function formatEnumLabel(value?: string | null) {
  if (!value) return '-';

  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
