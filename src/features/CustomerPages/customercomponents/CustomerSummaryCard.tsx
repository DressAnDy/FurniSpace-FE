import type { Icon } from '@tabler/icons-react';

import './CustomerWorkspace.css';

export function CustomerSummaryCard({ icon: IconComponent, label, value }: { icon: Icon; label: string; value: string | number }) {
  return (
    <article className="customer-workspace-summary-card">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <IconComponent size={23} />
    </article>
  );
}
