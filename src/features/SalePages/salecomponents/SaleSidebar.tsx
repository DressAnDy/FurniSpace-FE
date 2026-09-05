import {
  IconBriefcase,
  IconFileDollar,
  IconHome,
  IconMenu2,
  IconMessageCircle,
  IconChevronLeft,
  IconTruckDelivery,
  type Icon,
} from '@tabler/icons-react';
import { NavLink } from 'react-router-dom';

import { useLang } from '@/app/providers/useLang';
import logoImage from '@/assets/Logo/Logo.png';
import { useActorSidebarCollapse } from '@/shared/hooks/useActorSidebarCollapse';

import { saleCopy, type SaleNavKey } from './saleI18n';

type SaleSidebarItem = {
  key: SaleNavKey;
  icon: Icon;
  path: string;
};

const saleSidebarItems: SaleSidebarItem[] = [
  { key: 'dashboard', icon: IconHome, path: '/sales/dashbroad' },
  { key: 'projectRequestQueue', icon: IconHome, path: '/sales/project-requests' },
  { key: 'assignedProjects', icon: IconBriefcase, path: '/sales/assigned-projects' },
  { key: 'projectChat', icon: IconMessageCircle, path: '/sales/chat' },
  { key: 'quotations', icon: IconFileDollar, path: '/sales/quotations' },
  { key: 'orders', icon: IconFileDollar, path: '/sales/orders' },
  { key: 'tracking', icon: IconTruckDelivery, path: '/sales/tracking' },
];

type SaleSidebarProps = {
  activeKey: SaleNavKey;
};

export function SaleSidebar({ activeKey }: SaleSidebarProps) {
  const { lang } = useLang();
  const t = saleCopy[lang];
  const { collapse, expand, isCollapsed } = useActorSidebarCollapse('sale');

  return (
    <>
      <button
        aria-label={t.openSidebar}
        className="actor-sidebar-open-button sale-sidebar-open-button"
        hidden={!isCollapsed}
        type="button"
        onClick={expand}
      >
        <IconMenu2 size={22} />
      </button>

      <aside className={`sale-sidebar ${isCollapsed ? 'is-collapsed' : 'is-expanded'}`}>
        <div className="sale-sidebar-brand">
          <img className="sale-sidebar-brand-logo" src={logoImage} alt="FurniSpace" />
          <div>
            <h1>FurniSpace</h1>
            <p>{t.workspace}</p>
          </div>
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

        <nav className="sale-sidebar-nav">
          {saleSidebarItems.map(({ key, icon: ItemIcon, path }) => {
            const label = t.nav[key];
            const isActive = key === activeKey;

            return (
              <NavLink
                key={key}
                to={path}
                title={label}
                className={`sale-sidebar-item${isActive ? ' sale-sidebar-item-active' : ''}`}
              >
                <ItemIcon size={18} />
                <span>{label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
