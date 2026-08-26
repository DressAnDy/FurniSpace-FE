import { type ReactNode, useState } from 'react';
import { IconChevronDown, IconGlobe, IconLogout } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

import { useLang } from '@/app/providers/useLang';
import { ActorCommandSearch } from '@/shared/components/ActorCommandSearch';
import { NotificationBell } from '@/shared/components/NotificationBell';
import { useCurrentUser, useLogout } from '@/services/queries';

type AdminNavbarProps = {
  activeLabel: ReactNode;
};

const navbarText = {
  vi: {
    searchPlaceholder: 'Tìm tính năng admin, ví dụ: tạo sản phẩm',
    openUserMenu: 'Mở menu tài khoản',
    logout: 'Đăng xuất',
    loggingOut: 'Đang đăng xuất...',
    switchLang: 'Switch to English',
  },
  en: {
    searchPlaceholder: 'Search admin features, e.g. create product',
    openUserMenu: 'Open user menu',
    logout: 'Logout',
    loggingOut: 'Logging out...',
    switchLang: 'Chuyển sang Tiếng Việt',
  },
};

export function AdminNavbar({ activeLabel }: AdminNavbarProps) {
  const navigate = useNavigate();
  const { lang, setLang } = useLang();
  const t = navbarText[lang];
  const { data: user } = useCurrentUser();
  const logoutMutation = useLogout();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const displayName = user?.fullName?.trim() || user?.email || 'Admin';
  const roleLabel = formatRole(user?.role ?? 'ADMIN');
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
    <header className="admin-topbar">
      <div className="admin-topbar-context">
        {typeof activeLabel === 'string' ? <span>{activeLabel}</span> : activeLabel}
      </div>
      <ActorCommandSearch
        actor="admin"
        className="admin-search admin-topbar-command-search"
        placeholder={t.searchPlaceholder}
      />
      <div className="admin-topbar-actions">
        <button
          aria-label={t.switchLang}
          className="admin-language"
          title={t.switchLang}
          type="button"
          onClick={() => setLang(nextLang)}
        >
          <IconGlobe size={16} />
          <span>{lang.toUpperCase()}</span>
        </button>
        <NotificationBell buttonClassName="admin-notification" />
        <div className="admin-user-menu-wrap">
          <button
            aria-expanded={isUserMenuOpen}
            aria-haspopup="menu"
            aria-label={t.openUserMenu}
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
                <span>{logoutMutation.isPending ? t.loggingOut : t.logout}</span>
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
