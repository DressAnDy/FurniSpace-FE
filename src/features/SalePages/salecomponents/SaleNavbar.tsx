import { useState } from 'react';
import { IconChevronDown, IconLogout } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

import { ActorCommandSearch } from '@/shared/components/ActorCommandSearch';
import { NotificationBell } from '@/shared/components/NotificationBell';
import { useCurrentUser, useLogout } from '@/services/queries';

export function SaleNavbar() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const logoutMutation = useLogout();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const displayName = user?.fullName?.trim() || user?.email || 'Sales User';
  const roleLabel = formatRole(user?.role ?? 'SALE');
  const initials = getInitials(displayName);

  function handleLogout() {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        navigate('/login', { replace: true });
      },
    });
  }

  return (
    <header className="sale-topbar flex min-h-16 items-center justify-between gap-4 border-b border-zinc-200 bg-white px-6">
      <ActorCommandSearch
        actor="sale"
        className="sale-topbar-search flex h-11 min-w-[320px] max-w-xl flex-1 items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 text-zinc-500"
        placeholder="Search sale features, e.g. project requests"
      />

      <div className="sale-topbar-actions flex items-center gap-3">
        <NotificationBell buttonClassName="sale-icon-button relative flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600" />
        <div className="sale-user-menu-wrap">
          <button
            aria-expanded={isUserMenuOpen}
            aria-haspopup="menu"
            aria-label="Open user menu"
            className="sale-user-trigger"
            type="button"
            onClick={() => setIsUserMenuOpen((isOpen) => !isOpen)}
          >
            <span className="sale-avatar sale-user-trigger-avatar">
              {user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials}
            </span>
            <IconChevronDown size={18} />
          </button>

          {isUserMenuOpen && (
            <div className="sale-user-menu" role="menu">
              <div className="sale-user-menu-identity">
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

  return initials || 'S';
}
