import {
  IconBox,
  IconCalendarEvent,
  IconChevronLeft,
  IconFileDollar,
  IconFileText,
  IconHome,
  IconMenu2,
  IconMessageCircle,
  IconReceipt,
  IconPlus,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import { CustomerUserSummary } from '@/shared/components/CustomerUserSummary';
import { useActorSidebarCollapse } from '@/shared/hooks/useActorSidebarCollapse';

import './CustomerNavbar.css';

type CustomerNavbarItem = {
  label: string;
  path: string;
  icon: ReactNode;
};

const customerNavbarItems: CustomerNavbarItem[] = [
  { icon: <IconHome size={15} stroke={1.8} />, label: 'Home', path: '/customer/dashboard' },
  { icon: <IconFileText size={15} stroke={1.8} />, label: 'My Projects', path: '/customer/projects' },
  { icon: <IconBox size={15} stroke={1.8} />, label: 'Tracking', path: '/customer/tracking' },
  { icon: <IconFileDollar size={15} stroke={1.8} />, label: 'Quotations', path: '/customer/quotations' },
  { icon: <IconReceipt size={15} stroke={1.8} />, label: 'Orders', path: '/customer/orders' },
  { icon: <IconCalendarEvent size={15} stroke={1.8} />, label: 'Schedules', path: '/customer/schedules' },
  { icon: <IconMessageCircle size={15} stroke={1.8} />, label: 'Project Chat', path: '/customer/chat' },
];

type CustomerNavbarProps = {
  activeLabel: string;
  classPrefix: string;
};

export function CustomerNavbar({ activeLabel, classPrefix }: CustomerNavbarProps) {
  const navigate = useNavigate();
  const { collapse, expand, isCollapsed } = useActorSidebarCollapse('customer');

  return (
    <>
      <button
        aria-label="Open customer sidebar"
        className="actor-sidebar-open-button customer-sidebar-open-button"
        hidden={!isCollapsed}
        type="button"
        onClick={expand}
      >
        <IconMenu2 size={22} />
      </button>

      <aside className={`customer-shell-sidebar ${isCollapsed ? 'is-collapsed' : 'is-expanded'}`}>
        <div className="customer-shell-brand">
        <NavLink className="customer-shell-logo" to="/customer/dashboard">
          <span>
            <IconBox size={19} stroke={1.8} />
          </span>
          <strong>FurniSpace</strong>
        </NavLink>
          <button aria-label="Collapse customer sidebar" className="actor-sidebar-collapse-button" hidden={isCollapsed} type="button" onClick={collapse}>
            <IconChevronLeft size={18} />
          </button>
        </div>

        <nav className="customer-shell-nav" aria-label="Customer navigation">
          {customerNavbarItems.map((item) => (
            <NavLink
              className={({ isActive }) => (isActive || item.label === activeLabel ? 'customer-shell-nav-active' : undefined)}
              key={item.label}
              to={item.path}
              title={item.label}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <header className="customer-shell-actionbar">
        <button className="customer-shell-create" type="button" onClick={() => navigate('/customer/project-request')}>
          <IconPlus size={15} stroke={2} />
          Create Project Request
        </button>
        <CustomerUserSummary classPrefix={classPrefix} />
      </header>
    </>
  );
}
