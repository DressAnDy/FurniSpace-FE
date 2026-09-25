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

import { useLang } from '@/app/providers/useLang';
import logoImage from '@/assets/Logo/Logo.png';
import { useActorSidebarCollapse } from '@/shared/hooks/useActorSidebarCollapse';

import { designerCopy, type DesignerNavKey } from './designerI18n';

type DesignerSidebarItem = {
  key: DesignerNavKey;
  icon: Icon;
  path: string;
};

const designerSidebarItems: DesignerSidebarItem[] = [
  { key: 'dashboard', icon: IconHome, path: '/designer/dashbroad' },
  { key: 'assignedProjects', icon: IconTable, path: '/designer/assigned-projects' },
  { key: 'productLibrary', icon: IconPackage, path: '/designer/product-library' },
  { key: 'schedules', icon: IconCalendarEvent, path: '/designer/schedules' },
];

type DesignerSidebarProps = {
  activeKey: DesignerNavKey;
};

export function DesignerSidebar({ activeKey }: DesignerSidebarProps) {
  const { lang } = useLang();
  const t = designerCopy[lang];
  const { collapse, expand, isCollapsed } = useActorSidebarCollapse('designer');

  return (
    <>
      <button
        aria-label={t.openSidebar}
        className="actor-sidebar-open-button designer-sidebar-open-button"
        hidden={!isCollapsed}
        type="button"
        onClick={expand}
      >
        <IconMenu2 size={22} />
      </button>

      <aside className={`designer-sidebar ${isCollapsed ? 'is-collapsed' : 'is-expanded'}`}>
        <div className="designer-sidebar-brand">
          <NavLink className="designer-sidebar-brand-link" to="/">
            <img src={logoImage} alt="FurniSpace" />
            <div>
              <h1>FurniSpace</h1>
              <p>{t.workspace}</p>
            </div>
          </NavLink>
          <button
            aria-label={t.collapseSidebar}
            className="actor-sidebar-collapse-button"
            hidden={isCollapsed}
            type="button"
            onClick={collapse}
          >
            <IconChevronLeft size={18} />
          </button>
        </div>

        <nav className="designer-sidebar-nav">
          {designerSidebarItems.map(({ key, icon: ItemIcon, path }) => {
            const label = t.nav[key];

            return (
              <NavLink
                className={({ isActive }) =>
                  `designer-sidebar-item ${isActive || key === activeKey ? 'designer-sidebar-item-active' : ''}`
                }
                key={key}
                to={path}
                title={label}
              >
                <ItemIcon size={18} stroke={1.9} />
                <span>{label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
