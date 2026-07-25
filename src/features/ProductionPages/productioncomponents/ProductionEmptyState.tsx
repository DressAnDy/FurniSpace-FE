import { IconInbox } from '@tabler/icons-react';

import './ProductionWorkspace.css';

export function ProductionEmptyState({ message }: { message: string }) {
  return (
    <div className="production-workspace-empty">
      <IconInbox size={28} />
      <p>{message}</p>
    </div>
  );
}
