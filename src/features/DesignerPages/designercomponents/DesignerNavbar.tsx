import { useState } from 'react';
import { IconChevronDown, IconGlobe, IconLogout } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

import { useLang } from '@/app/providers/useLang';
import { ActorCommandSearch } from '@/shared/components/ActorCommandSearch';
import { NotificationBell } from '@/shared/components/NotificationBell';
import { useCurrentUser, useLogout } from '@/services/queries';

import { designerCopy } from './designerI18n';

type DesignerNavbarProps = {
  searchPlaceholder?: string;
};

export function DesignerNavbar({ searchPlaceholder }: DesignerNavbarProps) {
  const navigate = useNavigate();
  const { lang, setLang } = useLang();
  const t = designerCopy[lang];
  const { data: user } = useCurrentUser();
  const logoutMutation = useLogout();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const displayName = user?.fullName?.trim() || user?.email || t.navbar.designerUser;
  const roleLabel = formatRole(user?.role ?? 'DESIGNER');
  const initials = getInitials(displayName);
  const nextLang = lang === 'vi' ? 'en' : 'vi';

  function handleLogout() {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        navigate('/login', { replace: true });
      },
    });
  }

  return (
    <header className="designer-topbar">
      <ActorCommandSearch
        actor="designer"
        className="designer-topbar-search"
        placeholder={searchPlaceholder ?? t.navbar.searchPlaceholder}
      />

      <div className="designer-topbar-account">
        <button
          aria-label={t.navbar.switchLang}
          className="designer-language"
          title={t.navbar.switchLang}
          type="button"
          onClick={() => setLang(nextLang)}
        >
          <IconGlobe size={16} />
          <span>{lang.toUpperCase()}</span>
        </button>
        <NotificationBell buttonClassName="designer-topbar-notification" />
        <div className="designer-user-menu-wrap">
          <button
            aria-expanded={isUserMenuOpen}
            aria-haspopup="menu"
            aria-label={t.navbar.openUserMenu}
            className="designer-user-trigger"
            type="button"
            onClick={() => setIsUserMenuOpen((isOpen) => !isOpen)}
          >
            <span className="designer-topbar-avatar designer-user-trigger-avatar">
              {user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials}
            </span>
            <IconChevronDown size={18} />
          </button>

          {isUserMenuOpen && (
            <div className="designer-user-menu" role="menu">
              <div className="designer-user-menu-identity">
                <strong>{displayName}</strong>
                <span>{roleLabel}</span>
              </div>
              <button disabled={logoutMutation.isPending} role="menuitem" type="button" onClick={handleLogout}>
                <IconLogout size={16} />
                <span>{logoutMutation.isPending ? t.navbar.loggingOut : t.navbar.logout}</span>
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

  return initials || 'D';
}
