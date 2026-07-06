import type { ReactNode } from 'react';
import { IconChevronDown } from '@tabler/icons-react';

import { ActorCommandSearch } from '@/shared/components/ActorCommandSearch';
import { NotificationBell } from '@/shared/components/NotificationBell';

type AdminNavbarProps = {
  activeLabel: ReactNode;
};

export function AdminNavbar({ activeLabel }: AdminNavbarProps) {
  return (
    <header className="admin-topbar">
      <div className="admin-topbar-context">
        {typeof activeLabel === 'string' ? <span>{activeLabel}</span> : activeLabel}
      </div>
      <ActorCommandSearch
        actor="admin"
        className="admin-search admin-topbar-command-search"
        placeholder="Search admin features, e.g. create product"
      />
      <div className="admin-topbar-actions">
        <NotificationBell buttonClassName="admin-notification" />
        <div className="admin-user">
          <div className="admin-avatar">AD</div>
          <div>
            <p>Admin</p>
            <span>Workspace</span>
          </div>
          <IconChevronDown size={16} />
        </div>
      </div>
    </header>
  );
}
