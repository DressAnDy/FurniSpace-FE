import {
  IconCalendarEvent,
  IconChevronLeft,
  IconHome,
  IconMenu2,
  IconPackage,
  IconTable,
  type Icon,
} from '@tabler/icons-react';
import { NavLink } from 'react-router-dom';

import logoImage from '@/assets/Logo/Logo.png';
import { useActorSidebarCollapse } from '@/shared/hooks/useActorSidebarCollapse';

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
];

type DesignerSidebarProps = {
  activeLabel: string;
};

export function DesignerSidebar({ activeLabel }: DesignerSidebarProps) {
  const { collapse, expand, isCollapsed } = useActorSidebarCollapse('designer');

  return (
    <>
    <button
      aria-label="Open designer sidebar"
      className="actor-sidebar-open-button designer-sidebar-open-button"
      hidden={!isCollapsed}
      type="button"
      onClick={expand}
    >
      <IconMenu2 size={22} />
    </button>

    <aside className={`designer-sidebar ${isCollapsed ? 'is-collapsed' : 'is-expanded'}`}>
      <div className="designer-sidebar-brand">
        <img src={logoImage} alt="" />
        <div>
          <h1>FurniSpace</h1>
          <p>Designer</p>
        </div>
        <button aria-label="Collapse designer sidebar" className="actor-sidebar-collapse-button" hidden={isCollapsed} type="button" onClick={collapse}>
          <IconChevronLeft size={18} />
        </button>
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
                title={label}
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
              title={label}
            >
              {content}
            </NavLink>
          );
        })}
      </nav>

    </aside>
    </>
  );
}
