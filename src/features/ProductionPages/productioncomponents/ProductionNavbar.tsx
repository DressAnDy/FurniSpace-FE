import { useState } from 'react';
import { IconChevronDown, IconLogout } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

import { ActorCommandSearch } from '@/shared/components/ActorCommandSearch';
import { NotificationBell } from '@/shared/components/NotificationBell';
import { useCurrentUser, useLogout } from '@/services/queries';

type ProductionNavbarProps = {
  searchPlaceholder?: string;
};

export function ProductionNavbar({ searchPlaceholder = 'Search production features...' }: ProductionNavbarProps) {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const logoutMutation = useLogout();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const displayName = user?.fullName?.trim() || user?.email || 'Production User';
  const roleLabel = formatRole(user?.role ?? 'PRODUCTION');
  const initials = getInitials(displayName);

  function handleLogout() {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        navigate('/login', { replace: true });
      },
    });
  }

  return (
    <header className="production-topbar">
      <ActorCommandSearch actor="production" className="production-topbar-search" placeholder={searchPlaceholder} />

      <div className="production-topbar-actions">
        <NotificationBell buttonClassName="production-icon-button" />
        <div className="production-user-menu-wrap">
          <button
            aria-expanded={isUserMenuOpen}
            aria-haspopup="menu"
            aria-label="Open user menu"
            className="production-user-trigger"
            type="button"
            onClick={() => setIsUserMenuOpen((isOpen) => !isOpen)}
          >
            <span className="production-avatar production-user-trigger-avatar">
              {user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials}
            </span>
            <IconChevronDown size={18} />
          </button>

          {isUserMenuOpen ? (
            <div className="production-user-menu" role="menu">
              <div className="production-user-menu-identity">
                <strong>{displayName}</strong>
                <span>{roleLabel}</span>
              </div>
              <button disabled={logoutMutation.isPending} role="menuitem" type="button" onClick={handleLogout}>
                <IconLogout size={16} />
                <span>{logoutMutation.isPending ? 'Logging out...' : 'Logout'}</span>
              </button>
            </div>
          ) : null}
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

  return initials || 'P';
}
