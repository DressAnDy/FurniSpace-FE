import { useLang } from '@/app/providers/useLang';
import { ProjectPhaseTimelineCard } from '@/features/projectPhaseDeadlines/ProjectPhaseTimelineCard';
import { designerCopy } from '@/features/DesignerPages/designercomponents';
import type { ProjectDto } from '@/services/api/projects';

type OverviewTabProps = {
  project: ProjectDto;
};

export function OverviewTab({ project }: OverviewTabProps) {
  const { lang } = useLang();
  const t = designerCopy[lang].overviewTab;

  const projectInformation = [
    [t.projectCode, project.projectCode],
    [t.businessType, project.businessType],
    [t.address, project.projectAddress],
    [t.floors, formatNumber(project.numberOfFloors)],
    [t.totalArea, formatArea(project.totalAreaSqm, t.sqm)],
    [t.budget, formatBudgetRange(project.budgetMin, project.budgetMax)],
    [t.targetDate, formatDateOnly(project.targetCompletionDate)],
    [t.status, formatEnumLabel(project.status)],
  ].filter(([, value]) => Boolean(value));
  const requirements = [
    [t.furnitureRequirement, project.furnitureRequirement],
    [t.businessPurpose, project.businessPurpose],
    [t.description, project.description],
  ].filter(([, value]) => Boolean(value));

  return (
    <div className="designer-project-detail-panel">
      <section className="designer-card designer-project-section-card">
        <header className="designer-project-section-header">
          <h3>{t.projectInformation}</h3>
        </header>
        <div className="designer-project-info-grid">
          {projectInformation.map(([label, value]) => (
            <div className="designer-project-detail-info" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>

      <ProjectPhaseTimelineCard
        projectId={project.projectId}
        phases={['DESIGN', 'PROPOSAL']}
        title={t.designTimeline}
        emptyText={t.noDeadline}
      />

      <section className="designer-card designer-project-section-card">
        <header className="designer-project-section-header">
          <h3>{t.customerRequirements}</h3>
        </header>
        {requirements.length > 0 ? (
          <div className="designer-project-requirements-list">
            {requirements.map(([label, value]) => (
              <div className="designer-project-detail-text-block" key={label}>
                <span>{label}</span>
                <p>{value}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="designer-project-empty-text">{t.emptyRequirements}</p>
        )}
      </section>
    </div>
  );
}

function formatArea(value: number | null, sqm: (v: number) => string) {
  return typeof value === 'number' ? sqm(value) : null;
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
