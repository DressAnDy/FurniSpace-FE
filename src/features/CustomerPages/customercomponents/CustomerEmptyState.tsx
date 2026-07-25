import { IconInbox } from '@tabler/icons-react';

import './CustomerWorkspace.css';

export function CustomerEmptyState({ message }: { message: string }) {
  return (
    <div className="customer-workspace-empty">
      <IconInbox size={26} />
      <p>{message}</p>
    </div>
  );
}
