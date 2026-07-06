import {
  IconBriefcase,
  IconCalendarEvent,
  IconClipboardList,
  IconFileDollar,
  IconHome,
  IconLogout,
  IconMenu2,
  IconChevronLeft,
  type Icon,
} from '@tabler/icons-react';
import { NavLink, useNavigate } from 'react-router-dom';

import logoImage from '@/assets/Logo/Logo.png';
import { useActorSidebarCollapse } from '@/shared/hooks/useActorSidebarCollapse';
import { useLogout } from '@/services/queries';

type SaleSidebarItem = {
  label: string;
  icon: Icon;
  path?: string;
};

const saleSidebarItems: SaleSidebarItem[] = [
  { label: 'Dashboard', icon: IconHome, path: '/sales/dashbroad' },
  { label: 'Project Request Queue', icon: IconHome, path: '/sales/project-requests' },
  { label: 'Assigned Projects', icon: IconBriefcase, path: '/sales/assigned-projects' },
  { label: 'Schedules', icon: IconCalendarEvent, path: '/sales/schedules' },
  { label: 'Quotations', icon: IconFileDollar, path: '/sales/quotations' },
  { label: 'Orders', icon: IconFileDollar },
  { label: 'Production Tracking', icon: IconClipboardList },
];

type SaleSidebarProps = {
  activeLabel: string;
};

export function SaleSidebar({ activeLabel }: SaleSidebarProps) {
  const navigate = useNavigate();
  const logoutMutation = useLogout();
  const { collapse, expand, isCollapsed } = useActorSidebarCollapse('sale');

  function handleLogout() {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        navigate('/login', { replace: true });
      },
    });
  }

  return (
    <>
    <button
      aria-label="Open sale sidebar"
      className="actor-sidebar-open-button sale-sidebar-open-button"
      type="button"
      onClick={expand}
    >
      <IconMenu2 size={22} />
    </button>

    <aside className="sale-sidebar" aria-hidden={isCollapsed}>
      <div className="sale-sidebar-brand">
        <img className="sale-sidebar-brand-logo" src={logoImage} alt="FurniSpace" />
        <div>
          <h1>FurniSpace</h1>
          <p>Interior Solutions</p>
        </div>
        <button aria-label="Collapse sale sidebar" className="actor-sidebar-collapse-button" type="button" onClick={collapse}>
          <IconChevronLeft size={18} />
        </button>
      </div>

      <nav className="sale-sidebar-nav">
        {saleSidebarItems.map(({ label, icon: ItemIcon, path }) => {
          const staticItemClass = label === activeLabel ? 'sale-sidebar-item-active' : '';

          const content = (
            <>
              <ItemIcon size={18} />
              <span>{label}</span>
            </>
          );

          if (!path) {
            return (
              <button
                key={label}
                type="button"
                className={`sale-sidebar-item ${staticItemClass}`}
                disabled
              >
                {content}
              </button>
            );
          }

          return (
            <NavLink
              key={label}
              to={path}
              className={({ isActive }) => {
                const itemClass =
                  isActive || label === activeLabel
                    ? 'sale-sidebar-item-active'
                    : '';

                return `sale-sidebar-item ${itemClass}`;
              }}
            >
              {content}
            </NavLink>
          );
        })}
      </nav>

      <div className="sale-sidebar-footer">
        <button className="sale-sidebar-logout" type="button" onClick={handleLogout} disabled={logoutMutation.isPending}>
          <IconLogout size={18} />
          <span>{logoutMutation.isPending ? 'Logging out...' : 'Logout'}</span>
        </button>
      </div>
    </aside>
    </>
  );
}
