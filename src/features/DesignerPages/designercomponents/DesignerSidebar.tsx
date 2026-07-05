import {
  IconCalendarEvent,
  IconChevronLeft,
  IconHome,
  IconLogout,
  IconPackage,
  IconSettings,
  IconTable,
  type Icon,
} from '@tabler/icons-react';
import { NavLink, useNavigate } from 'react-router-dom';

import logoImage from '@/assets/Logo/Logo.png';
import { useLogout } from '@/services/queries';

type DesignerSidebarItem = {
  label: string;
  icon: Icon;
  path?: string;
};

const designerSidebarItems: DesignerSidebarItem[] = [
  { label: 'Dashboard', icon: IconHome, path: '/designer/dashbroad' },
  { label: 'Assigned Projects', icon: IconTable, path: '/designer/assigned-projects' },
  { label: 'Product Library', icon: IconPackage, path: '/designer/product-library' },
  { label: 'My Schedule', icon: IconCalendarEvent, path: '/designer/schedules' },
  { label: 'Settings', icon: IconSettings },
];

type DesignerSidebarProps = {
  activeLabel: string;
};

export function DesignerSidebar({ activeLabel }: DesignerSidebarProps) {
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
    <aside className="designer-sidebar">
      <div className="designer-sidebar-brand">
        <img src={logoImage} alt="" />
        <div>
          <h1>FurniSpace</h1>
          <p>Designer</p>
        </div>
      </div>

      <nav className="designer-sidebar-nav">
        {designerSidebarItems.map(({ label, icon: ItemIcon, path }) => {
          const activeClass = label === activeLabel ? 'designer-sidebar-item-active' : '';
          const content = (
            <>
              <ItemIcon size={18} stroke={1.9} />
              <span>{label}</span>
            </>
          );

          if (!path) {
            return (
              <button
                className={`designer-sidebar-item ${activeClass}`}
                disabled
                key={label}
                type="button"
              >
                {content}
              </button>
            );
          }

          return (
            <NavLink
              className={({ isActive }) =>
                `designer-sidebar-item ${isActive || label === activeLabel ? 'designer-sidebar-item-active' : ''}`
              }
              key={label}
              to={path}
            >
              {content}
            </NavLink>
          );
        })}
      </nav>

      <div className="designer-sidebar-actions">
        <button className="designer-sidebar-item" type="button">
          <IconChevronLeft size={18} stroke={1.9} />
          <span>Collapse</span>
        </button>
        <button
          className="designer-sidebar-item designer-sidebar-logout"
          disabled={logoutMutation.isPending}
          onClick={handleLogout}
          type="button"
        >
          <IconLogout size={18} stroke={1.9} />
          <span>{logoutMutation.isPending ? 'Logging out...' : 'Logout'}</span>
        </button>
      </div>
    </aside>
  );
}
