import { IconChevronDown, IconGlobe, IconLayoutDashboard, IconLogout, IconUser } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import logoImage from '@/assets/Logo/Logo.png';
import { useCurrentUser, useLogout } from '@/services/queries';

import './MainNavbar.css';

type MainNavbarProps = {
  brandLabel?: string;
  brandMarkLabel?: string;
  activePath?: string;
  activeClassName?: string;
  brandNameClassName?: string;
  classPrefix: string;
  linkClassName?: string;
};

const mainNavItems = [
  { label: 'TRANG CHỦ', path: '/' },
  { label: 'DỰ ÁN', path: '/projects' },
  { label: 'SẢN PHẨM', path: '/products' },
  { label: 'DỊCH VỤ', path: '/#services' },
];

function cx(...classNames: Array<string | undefined | false | null>) {
  return classNames.filter(Boolean).join(' ');
}

export function MainNavbar({
  activeClassName,
  activePath,
  brandLabel = 'FurniSpace',
  brandNameClassName,
  classPrefix,
  linkClassName,
}: MainNavbarProps) {
  const navigate = useNavigate();
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const { data: user } = useCurrentUser();
  const logoutMutation = useLogout();
  const resolvedBrandLabel = brandLabel.toLowerCase() === 'furnispace' ? 'FurniSpace' : brandLabel;
  const displayName = user?.fullName?.trim() || user?.email || 'Kh\u00e1ch h\u00e0ng';
  const initials = getInitials(displayName);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    function handleDocumentPointerDown(event: MouseEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleDocumentPointerDown);

    return () => {
      document.removeEventListener('mousedown', handleDocumentPointerDown);
    };
  }, []);

  function handleLogout() {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        setIsAccountMenuOpen(false);
        navigate('/login');
      },
    });
  }

  return (
    <header className={cx(`${classPrefix}-header`, 'main-navbar', isScrolled && 'main-navbar-scrolled')}>
      <NavLink className={cx(`${classPrefix}-brand`, 'main-navbar-brand')} to="/">
        <span className={cx(`${classPrefix}-brand-mark`, 'main-navbar-logo-wrap')} aria-hidden="true">
          <img className="main-navbar-logo-image" src={logoImage} alt="" />
        </span>
        <span className={cx(brandNameClassName, 'main-navbar-brand-name')}>{resolvedBrandLabel}</span>
      </NavLink>

      <nav className={cx(`${classPrefix}-nav`, 'main-navbar-nav')} aria-label="Main navigation">
        {mainNavItems.map((item) => {
          const isActive = activePath ? item.path === activePath : undefined;
          const resolvedActiveClassName = activeClassName ?? `${classPrefix}-nav-active`;

          return (
            <NavLink
              className={({ isActive: routeIsActive }) => {
                const shouldActivate = isActive ?? routeIsActive;
                return (
                  cx('main-navbar-link', linkClassName, shouldActivate ? resolvedActiveClassName : null, shouldActivate ? 'main-navbar-link-active' : null) ||
                  undefined
                );
              }}
              end={item.path === '/'}
              key={item.label}
              to={item.path}
            >
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="main-navbar-actions" aria-label="Account actions">
        {user ? (
          <div className="main-navbar-account" ref={accountMenuRef}>
            <button
              className="main-navbar-user-button"
              type="button"
              aria-expanded={isAccountMenuOpen}
              aria-haspopup="menu"
              onClick={() => setIsAccountMenuOpen((current) => !current)}
            >
              <span className="main-navbar-user-name">{displayName}</span>
              {user.avatarUrl ? <img className="main-navbar-avatar" src={user.avatarUrl} alt="" /> : <span className="main-navbar-avatar">{initials}</span>}
              <IconChevronDown className="main-navbar-user-chevron" size={16} stroke={2} />
            </button>

            {isAccountMenuOpen ? (
              <div className="main-navbar-account-menu" role="menu">
                <NavLink className="main-navbar-account-menu-item" role="menuitem" to="/customer/dashboard" onClick={() => setIsAccountMenuOpen(false)}>
                  <IconLayoutDashboard size={18} stroke={1.8} />
                  <span>Trung tâm quản lý</span>
                </NavLink>
                <NavLink className="main-navbar-account-menu-item" role="menuitem" to="/user-profile" onClick={() => setIsAccountMenuOpen(false)}>
                  <IconUser size={18} stroke={1.8} />
                  <span>Thông tin người dùng</span>
                </NavLink>
                <button className="main-navbar-account-menu-item" role="menuitem" type="button" onClick={handleLogout} disabled={logoutMutation.isPending}>
                  <IconLogout size={18} stroke={1.8} />
                  <span>{logoutMutation.isPending ? 'Đang đăng xuất...' : 'Đăng xuất'}</span>
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <NavLink className="main-navbar-action" to="/register">
              {'ĐĂNG KÝ'}
            </NavLink>
            <NavLink className="main-navbar-action main-navbar-action-login" to="/login">
              {'ĐĂNG NHẬP'}
            </NavLink>
          </>
        )}

        <button className="main-navbar-language" type="button" aria-label="Chuyển đổi ngôn ngữ">
          <IconGlobe size={18} stroke={1.8} />
          <span>VI</span>
        </button>
      </div>
    </header>
  );
}

function getInitials(value: string) {
  const initials = value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || 'U';
}
