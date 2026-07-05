import {
  IconChartBar,
  IconCube,
  IconFolder,
  IconHome,
  IconLogout,
  IconPackage,
  IconTags,
  IconUsers,
  type Icon,
} from '@tabler/icons-react';
import { NavLink, useNavigate } from 'react-router-dom';

import logoImage from '@/assets/Logo/Logo.png';
import { useLogout } from '@/services/queries';

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
  { label: 'Projects', icon: IconFolder },
  { label: 'Reports', icon: IconChartBar },
];

type AdminSidebarProps = {
  activeLabel: string;
};

export function AdminSidebar({ activeLabel }: AdminSidebarProps) {
  const navigate = useNavigate();
  const logoutMutation = useLogout();

  function handleLogout() {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        navigate('/login', { replace: true });
      },
    });
  }

  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">
        <img className="admin-brand-logo" src={logoImage} alt="FurniSpace" />
        <div>
          <h1>FurniSpace</h1>
          <p>Admin Workspace</p>
        </div>
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

      <div className="admin-sidebar-footer">
        <button className="admin-logout-button" type="button" onClick={handleLogout} disabled={logoutMutation.isPending}>
          <IconLogout size={16} />
          <span>{logoutMutation.isPending ? 'Logging out...' : 'Logout'}</span>
        </button>
      </div>
    </aside>
  );
}
