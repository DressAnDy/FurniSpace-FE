import {
  IconAdjustments,
  IconAlertTriangle,
  IconChevronLeft,
  IconClipboardList,
  IconHome,
  IconMenu2,
  IconTruckDelivery,
  type Icon,
} from '@tabler/icons-react';
import { NavLink } from 'react-router-dom';

import logoImage from '@/assets/Logo/Logo.png';
import { useActorSidebarCollapse } from '@/shared/hooks/useActorSidebarCollapse';

type ProductionSidebarItem = {
  label: string;
  icon: Icon;
  path: string;
};

const productionSidebarItems: ProductionSidebarItem[] = [
  { label: 'Dashboard', icon: IconHome, path: '/production/dashbroad' },
  { label: 'Customization Reviews', icon: IconAdjustments, path: '/production/customization-reviews' },
  { label: 'Production Requests', icon: IconClipboardList, path: '/production/requests' },
  { label: 'Unavailable Items', icon: IconAlertTriangle, path: '/production/blocked-issues' },
  { label: 'Ready for Delivery', icon: IconTruckDelivery, path: '/production/ready-for-delivery' },
];

type ProductionSidebarProps = {
  activeLabel: string;
};

export function ProductionSidebar({ activeLabel }: ProductionSidebarProps) {
  const { collapse, expand, isCollapsed } = useActorSidebarCollapse('production');

  return (
    <>
      <button
        aria-label="Open production sidebar"
        className="actor-sidebar-open-button production-sidebar-open-button"
        type="button"
        onClick={expand}
      >
        <IconMenu2 size={22} />
      </button>

      <aside className="production-sidebar" aria-hidden={isCollapsed}>
        <div className="production-sidebar-brand">
          <img className="production-sidebar-brand-logo" src={logoImage} alt="FurniSpace" />
          <div>
            <h1>FurniSpace</h1>
            <p>Production</p>
          </div>
          <button aria-label="Collapse production sidebar" className="actor-sidebar-collapse-button" type="button" onClick={collapse}>
            <IconChevronLeft size={18} />
          </button>
        </div>

        <nav className="production-sidebar-nav">
          {productionSidebarItems.map(({ label, icon: ItemIcon, path }) => (
            <NavLink
              key={label}
              to={path}
              className={({ isActive }) =>
                `production-sidebar-item ${isActive || label === activeLabel ? 'production-sidebar-item-active' : ''}`
              }
            >
              <ItemIcon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
