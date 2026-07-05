import { IconUser } from '@tabler/icons-react';

import { NotificationBell } from '@/shared/components/NotificationBell';

export function AdminNavbar() {
  return (
    <header className="admin-topbar">
      <div className="admin-topbar-actions">
        <NotificationBell buttonClassName="admin-notification" />
        <div className="admin-user-copy">
          <p>Admin User</p>
          <span>Admin</span>
        </div>
        <div className="admin-avatar">
          <IconUser size={18} />
        </div>
      </div>
    </header>
  );
}
