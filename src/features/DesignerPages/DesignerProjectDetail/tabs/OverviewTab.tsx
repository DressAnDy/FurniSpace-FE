import type { ProjectDto } from '@/services/api/projects';

type OverviewTabProps = {
  project: ProjectDto;
};

export function OverviewTab({ project }: OverviewTabProps) {
  const projectInformation = [
    ['Project Code', project.projectCode],
    ['Business Type', project.businessType],
    ['Address', project.projectAddress],
    ['Floors', formatNumber(project.numberOfFloors)],
    ['Total Area', formatArea(project.totalAreaSqm)],
    ['Budget', formatBudgetRange(project.budgetMin, project.budgetMax)],
    ['Target Date', formatDateOnly(project.targetCompletionDate)],
    ['Status', formatEnumLabel(project.status)],
  ].filter(([, value]) => Boolean(value));
  const requirements = [
    ['Furniture Requirement', project.furnitureRequirement],
    ['Business Purpose', project.businessPurpose],
    ['Description', project.description],
  ].filter(([, value]) => Boolean(value));

  return (
    <div className="designer-project-detail-panel">
      <section className="designer-card p-6">
        <header className="mb-6">
          <h3 className="text-lg font-semibold text-zinc-950">Project Information</h3>
          <p className="mt-1 text-sm text-zinc-500">Core project brief shared by sales and customer.</p>
        </header>
        <div className="grid gap-x-10 gap-y-5 md:grid-cols-2 xl:grid-cols-4">
          {projectInformation.map(([label, value]) => (
            <div className="designer-project-detail-info" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="designer-card p-6">
        <header className="mb-6">
          <h3 className="text-lg font-semibold text-zinc-950">Customer Requirements</h3>
        </header>
        {requirements.length > 0 ? (
          <div className="space-y-5">
            {requirements.map(([label, value]) => (
              <div className="designer-project-detail-text-block" key={label}>
                <span>{label}</span>
                <p>{value}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="m-0 text-sm text-zinc-500">No additional customer requirements have been provided yet.</p>
        )}
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

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
