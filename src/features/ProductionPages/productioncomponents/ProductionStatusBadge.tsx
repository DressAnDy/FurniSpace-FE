import { getProductionStatusTone } from '../utils';

import './ProductionWorkspace.css';

type ProductionStatusBadgeProps = {
  label: string;
  status: string;
};

export function ProductionStatusBadge({ label, status }: ProductionStatusBadgeProps) {
  return <span className={`production-workspace-status production-workspace-status-${getProductionStatusTone(status)}`}>{label}</span>;
}
