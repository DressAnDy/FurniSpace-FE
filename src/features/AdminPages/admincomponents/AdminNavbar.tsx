import { IconChevronDown } from '@tabler/icons-react';

import { ActorCommandSearch } from '@/shared/components/ActorCommandSearch';
import { NotificationBell } from '@/shared/components/NotificationBell';

type AdminNavbarProps = {
  activeLabel: string;
};

export function AdminNavbar({ activeLabel }: AdminNavbarProps) {
  return (
    <header className="admin-topbar">
      <ActorCommandSearch
        actor="admin"
        className="admin-search admin-topbar-command-search"
        placeholder="Search admin features, e.g. create product"
      />
      <div className="admin-topbar-context">
        <span>{activeLabel}</span>
      </div>
      <NotificationBell buttonClassName="admin-notification" />
      <div className="admin-user">
        <div className="admin-avatar">AD</div>
        <div>
          <p>Admin</p>
          <span>Workspace</span>
        </div>
        <IconChevronDown size={16} />
      </div>
    </header>
  );
}
