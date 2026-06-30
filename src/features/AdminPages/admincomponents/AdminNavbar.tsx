import { IconPlus, IconSearch, IconUpload, IconUser } from '@tabler/icons-react';

import { NotificationBell } from '@/shared/components/NotificationBell';

export function AdminNavbar() {
  return (
    <header className="admin-topbar">
      <label className="admin-search">
        <IconSearch size={18} />
        <input placeholder="Search products, projects, users..." type="search" />
      </label>

      <div className="admin-topbar-actions">
        <button className="admin-button admin-button-primary" type="button">
          <IconPlus size={16} />
          Add Product
        </button>
        <button className="admin-button admin-button-secondary" type="button">
          <IconUpload size={16} />
          Upload File
        </button>
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
