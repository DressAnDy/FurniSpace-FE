type ProjectStatusBadgeProps = {
  status: string;
};

const statusClasses: Record<string, string> = {
  SUBMITTED: 'bg-blue-50 text-blue-700 ring-blue-100',
  IN_CONSULTATION: 'bg-amber-50 text-amber-700 ring-amber-100',
  NEED_BASIC_INFORMATION: 'bg-rose-50 text-rose-700 ring-rose-100',
  WAITING_FOR_DESIGNER_ASSIGNMENT: 'bg-purple-50 text-purple-700 ring-purple-100',
  MEASUREMENT_REQUIRED: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
  SPACE_VERIFIED: 'bg-teal-50 text-teal-700 ring-teal-100',
  PROPOSAL_CONSULTING: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
  PROPOSAL_SELECTED: 'bg-lime-50 text-lime-700 ring-lime-100',
  QUOTATION_SENT: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  ORDER_CONFIRMED: 'bg-green-50 text-green-700 ring-green-100',
  IN_PRODUCTION: 'bg-sky-50 text-sky-700 ring-sky-100',
  READY_FOR_DELIVERY: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  DELIVERING: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  DELIVERED: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  COMPLETED: 'bg-zinc-100 text-zinc-700 ring-zinc-200',
  REJECTED: 'bg-red-50 text-red-700 ring-red-100',
  Submitted: 'bg-blue-50 text-blue-700 ring-blue-100',
  'In Consultation': 'bg-amber-50 text-amber-700 ring-amber-100',
  'Waiting For Designer Assignment': 'bg-purple-50 text-purple-700 ring-purple-100',
  'Measurement Required': 'bg-cyan-50 text-cyan-700 ring-cyan-100',
  'Proposal Consulting': 'bg-indigo-50 text-indigo-700 ring-indigo-100',
  'Quotation Sent': 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  'Order Confirmed': 'bg-green-50 text-green-700 ring-green-100',
  Completed: 'bg-zinc-100 text-zinc-700 ring-zinc-200',
};

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  const badgeClass = statusClasses[status] ?? 'bg-zinc-100 text-zinc-700 ring-zinc-200';
  const label = status
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${badgeClass}`}>{label}</span>;
}
