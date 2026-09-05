import {
  IconChartBar,
  IconChevronLeft,
  IconCube,
  IconFolder,
  IconHome,
  IconMenu2,
  IconPackage,
  IconTags,
  IconUsers,
  type Icon,
} from '@tabler/icons-react';
import { NavLink } from 'react-router-dom';

import { useLang } from '@/app/providers/useLang';
import logoImage from '@/assets/Logo/Logo.png';
import { useActorSidebarCollapse } from '@/shared/hooks/useActorSidebarCollapse';

import { adminCopy, type AdminNavKey } from './adminI18n';

type SidebarItem = {
  key: AdminNavKey;
  icon: Icon;
  path: string;
};

const sidebarItems: SidebarItem[] = [
  { key: 'dashboard', icon: IconHome, path: '/admin/dashbroad' },
  { key: 'users', icon: IconUsers, path: '/admin/users' },
  { key: 'categories', icon: IconTags, path: '/admin/categories' },
  { key: 'products', icon: IconPackage, path: '/admin/products' },
  { key: 'catalogModels', icon: IconCube, path: '/admin/catalog/models' },
  { key: 'layoutAssets', icon: IconCube, path: '/admin/catalog/layout-assets' },
  { key: 'threeDLab', icon: IconCube, path: '/admin/3d-lab' },
  { key: 'projects', icon: IconFolder, path: '/admin/projects' },
  { key: 'reports', icon: IconChartBar, path: '/admin/reports' },
];

type AdminSidebarProps = {
  activeKey: AdminNavKey;
};

export function AdminSidebar({ activeKey }: AdminSidebarProps) {
  const { lang } = useLang();
  const t = adminCopy[lang];
  const { collapse, expand, isCollapsed } = useActorSidebarCollapse('admin');

  return (
    <>
      <button
        aria-label={t.openSidebar}
        className="actor-sidebar-open-button admin-sidebar-open-button"
        hidden={!isCollapsed}
        type="button"
        onClick={expand}
      >
        <IconMenu2 size={22} />
      </button>

      <aside className={`admin-sidebar ${isCollapsed ? 'is-collapsed' : 'is-expanded'}`}>
        <div className="admin-brand">
          <img className="admin-brand-logo" src={logoImage} alt="FurniSpace" />
          <div>
            <h1>FurniSpace</h1>
            <p>{t.workspace}</p>
          </div>
          <button aria-label={t.collapseSidebar} className="actor-sidebar-collapse-button" hidden={isCollapsed} type="button" onClick={collapse}>
            <IconChevronLeft size={18} />
          </button>
        </div>

        <nav className="admin-nav">
          {sidebarItems.map(({ key, icon: ItemIcon, path }) => (
            <NavLink
              key={key}
              to={path}
              className={`admin-nav-item${key === activeKey ? ' admin-nav-item-active' : ''}`}
              title={t.nav[key]}
            >
              <ItemIcon size={16} />
              <span>{t.nav[key]}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
