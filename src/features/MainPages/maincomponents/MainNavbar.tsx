import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';

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
  { label: 'Trang chủ', path: '/' },
  { label: 'Dự án', path: '/projects' },
  { label: 'Sản phẩm', path: '/products' },
  { label: 'Dịch vụ', path: '/#services' },
];

function cx(...classNames: Array<string | undefined | false | null>) {
  return classNames.filter(Boolean).join(' ');
}

export function MainNavbar({
  activeClassName,
  activePath,
  brandLabel = 'FurniSpace',
  brandMarkLabel = 'F',
  brandNameClassName,
  classPrefix,
  linkClassName,
}: MainNavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const resolvedBrandLabel = brandLabel.toLowerCase() === 'furnispace' ? 'FurniSpace' : brandLabel;

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

  return (
    <header className={cx(`${classPrefix}-header`, 'main-navbar', isScrolled && 'main-navbar-scrolled')}>
      <NavLink className={cx(`${classPrefix}-brand`, 'main-navbar-brand')} to="/">
        <span className={cx(`${classPrefix}-brand-mark`, 'main-navbar-logo-wrap')}>
          <span className="main-navbar-logo-glyph" aria-hidden="true">
            {brandMarkLabel || 'FS'}
          </span>
          <span className="main-navbar-logo-caption" aria-hidden="true">
            Design
          </span>
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
        <NavLink className="main-navbar-action" to="/register">
          ĐĂNG KÝ
        </NavLink>
        <NavLink className="main-navbar-action main-navbar-action-login" to="/login">
          ĐĂNG NHẬP
        </NavLink>
      </div>
    </header>
  );
}
