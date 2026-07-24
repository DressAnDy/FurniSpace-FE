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

import logoImage from '@/assets/Logo/Logo.png';
import { useActorSidebarCollapse } from '@/shared/hooks/useActorSidebarCollapse';

type SidebarItem = {
  label: string;
  icon: Icon;
  path?: string;
};

const sidebarItems: SidebarItem[] = [
  { label: 'Admin Dashboard', icon: IconHome, path: '/admin/dashbroad' },
  { label: 'User & Role Management', icon: IconUsers, path: '/admin/users' },
  { label: 'Product Categories', icon: IconTags, path: '/admin/categories' },
  { label: 'Products', icon: IconPackage, path: '/admin/products' },
  { label: '3D Model & File Library', icon: IconCube, path: '/admin/catalog/models' },
  { label: '3D Lab', icon: IconCube, path: '/admin/3d-lab' },
  { label: 'Projects', icon: IconFolder, path: '/admin/projects' },
  { label: 'Reports', icon: IconChartBar, path: '/admin/reports' },
];

type AdminSidebarProps = {
  activeLabel: string;
};

export function AdminSidebar({ activeLabel }: AdminSidebarProps) {
  const { collapse, expand, isCollapsed } = useActorSidebarCollapse('admin');

  return (
    <>
      <button
        aria-label="Open admin sidebar"
        className="actor-sidebar-open-button admin-sidebar-open-button"
        type="button"
        onClick={expand}
      >
        <IconMenu2 size={22} />
      </button>

      <aside className="admin-sidebar" aria-hidden={isCollapsed}>
        <div className="admin-brand">
          <img className="admin-brand-logo" src={logoImage} alt="FurniSpace" />
          <div>
            <h1>FurniSpace</h1>
            <p>Admin Workspace</p>
          </div>
          <button aria-label="Collapse admin sidebar" className="actor-sidebar-collapse-button" type="button" onClick={collapse}>
            <IconChevronLeft size={18} />
          </button>
        </div>

        <nav className="admin-nav">
          {sidebarItems.map(({ label, icon: ItemIcon, path }) => {
            const content = (
              <>
                <ItemIcon size={16} />
                <span>{label}</span>
              </>
            );

            if (!path) {
              return (
                <button key={label} type="button" className={`admin-nav-item${label === activeLabel ? ' admin-nav-item-active' : ''}`} disabled>
                  {content}
                </button>
              );
            }

            return (
              <NavLink key={label} to={path} className={`admin-nav-item${label === activeLabel ? ' admin-nav-item-active' : ''}`}>
                {content}
              </NavLink>
            );
          })}
        </nav>

      </aside>
    </>
  );
}
