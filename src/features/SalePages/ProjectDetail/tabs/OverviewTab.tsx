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
    </div>
  );
}

function formatArea(value: number | null) {
  return typeof value === 'number' ? `${value} sqm` : null;
}

function formatNumber(value: number | null) {
  return typeof value === 'number' ? String(value) : null;
}

function formatDateOnly(value: string | null) {
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
