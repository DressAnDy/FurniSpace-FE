import type { ProjectStatus } from '@/services/api/projects';

type ProjectStatusBadgeProps = {
  status: string;
};

export type ProjectStatusPhaseKey = 'consult' | 'design' | 'quotation' | 'production' | 'complete';

type ProjectStatusPhase = {
  key: ProjectStatusPhaseKey;
  label: string;
  statuses: ProjectStatus[];
  className: string;
};

export const projectStatusPhases: ProjectStatusPhase[] = [
  {
    key: 'consult',
    label: 'Consult',
    statuses: ['SUBMITTED', 'IN_CONSULTATION', 'NEED_BASIC_INFORMATION'],
    className: 'bg-blue-50 text-blue-700 ring-blue-100',
  },
  {
    key: 'design',
    label: 'Design',
    statuses: ['WAITING_FOR_DESIGNER_ASSIGNMENT', 'MEASUREMENT_REQUIRED', 'SPACE_VERIFIED', 'PROPOSAL_CONSULTING'],
    className: 'bg-amber-50 text-amber-700 ring-amber-100',
  },
  {
    key: 'quotation',
    label: 'Quotation',
    statuses: ['PROPOSAL_SELECTED', 'QUOTATION_SENT', 'QUOTATION_REVISION_REQUESTED', 'ORDER_CONFIRMED'],
    className: 'bg-purple-50 text-purple-700 ring-purple-100',
  },
  {
    key: 'production',
    label: 'Production',
    statuses: ['IN_PRODUCTION', 'READY_FOR_DELIVERY', 'DELIVERING'],
    className: 'bg-orange-50 text-orange-700 ring-orange-100',
  },
  {
    key: 'complete',
    label: 'Complete',
    statuses: ['AWAITING_CUSTOMER_CONFIRMATION', 'DELIVERED', 'COMPLETED'],
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  },
];

const phaseByStatus = new Map<string, ProjectStatusPhase>(
  projectStatusPhases.flatMap((phase) => phase.statuses.map((status) => [status, phase] as const)),
);

const statusClasses: Record<string, string> = {
  REJECTED: 'bg-red-50 text-red-700 ring-red-100',
};

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  const badgeClass = getProjectStatusPhase(status)?.className ?? statusClasses[status] ?? 'bg-zinc-100 text-zinc-700 ring-zinc-200';

  return <span className={`project-status-badge inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${badgeClass}`}>{formatProjectStatusLabel(status)}</span>;
}

export function getProjectStatusPhase(status: string) {
  return phaseByStatus.get(status);
}

export function formatProjectStatusLabel(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
