import { type ReactNode, useState } from 'react';
import { IconChevronDown, IconLogout } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

import { ActorCommandSearch } from '@/shared/components/ActorCommandSearch';
import { NotificationBell } from '@/shared/components/NotificationBell';
import { useCurrentUser, useLogout } from '@/services/queries';

type AdminNavbarProps = {
  activeLabel: ReactNode;
};

export function AdminNavbar({ activeLabel }: AdminNavbarProps) {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const logoutMutation = useLogout();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const displayName = user?.fullName?.trim() || user?.email || 'Admin';
  const roleLabel = formatRole(user?.role ?? 'ADMIN');
  const initials = getInitials(displayName);

  function handleLogout() {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        navigate('/login', { replace: true });
      },
    });
  }

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
        <div className="admin-user-menu-wrap">
          <button
            aria-expanded={isUserMenuOpen}
            aria-haspopup="menu"
            aria-label="Open user menu"
            className="admin-user-trigger"
            type="button"
            onClick={() => setIsUserMenuOpen((isOpen) => !isOpen)}
          >
            <span className="admin-avatar admin-user-trigger-avatar">
              {user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials}
            </span>
            <IconChevronDown size={18} />
          </button>

          {isUserMenuOpen && (
            <div className="admin-user-menu" role="menu">
              <div className="admin-user-menu-identity">
                <strong>{displayName}</strong>
                <span>{roleLabel}</span>
              </div>
              <button disabled={logoutMutation.isPending} role="menuitem" type="button" onClick={handleLogout}>
                <IconLogout size={16} />
                <span>{logoutMutation.isPending ? 'Logging out...' : 'Logout'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function formatRole(role: string) {
  return role
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getInitials(value: string) {
  const initials = value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || 'A';
}
