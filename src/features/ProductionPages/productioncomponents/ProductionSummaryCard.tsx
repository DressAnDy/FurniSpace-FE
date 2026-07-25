import type { Icon } from '@tabler/icons-react';

import './ProductionWorkspace.css';

type ProductionSummaryCardProps = {
  icon: Icon;
  label: string;
  value: string | number;
  helper?: string;
};

export function ProductionSummaryCard({ helper, icon: IconComponent, label, value }: ProductionSummaryCardProps) {
  return (
    <article className="production-workspace-summary-card">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {helper ? <small>{helper}</small> : null}
      </div>
      <IconComponent size={24} />
    </article>
  );
}
