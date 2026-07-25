import { getCustomerStatusTone } from '../utils';

import './CustomerWorkspace.css';

export function CustomerStatusBadge({ label, status }: { label: string; status: string }) {
  return <span className={`customer-workspace-status customer-workspace-status-${getCustomerStatusTone(status)}`}>{label}</span>;
}
