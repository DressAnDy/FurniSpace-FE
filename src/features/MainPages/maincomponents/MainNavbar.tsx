import { NavLink } from 'react-router-dom';

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
  { label: 'Về chúng tôi', path: '/#about' },
  { label: 'Dự án', path: '/projects' },
  { label: 'Dịch vụ', path: '/products' },
  { label: 'Thiết kế 3D', path: '/viewer3d' },
];

export function MainNavbar({
  activeClassName,
  activePath,
  brandLabel = 'FurniSpace',
  brandMarkLabel = 'F',
  brandNameClassName,
  classPrefix,
  linkClassName,
}: MainNavbarProps) {
  return (
    <header className={`${classPrefix}-header`}>
      <NavLink className={`${classPrefix}-brand`} to="/">
        <span className={`${classPrefix}-brand-mark`}>{brandMarkLabel}</span>
        <span className={`${classPrefix}-brand-divider`} />
        <span className={brandNameClassName}>{brandLabel}</span>
      </NavLink>

      <nav className={`${classPrefix}-nav`} aria-label="Main navigation">
        {mainNavItems.map((item) => {
          const isActive = activePath ? item.path === activePath : undefined;
          const resolvedActiveClassName = activeClassName ?? `${classPrefix}-nav-active`;

          return (
            <NavLink
              className={({ isActive: routeIsActive }) => {
                const shouldActivate = isActive ?? routeIsActive;
                return [linkClassName, shouldActivate ? resolvedActiveClassName : null].filter(Boolean).join(' ') || undefined;
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
    </header>
  );
}
