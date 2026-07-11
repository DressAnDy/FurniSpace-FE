import {
  IconBox,
  IconCalendarEvent,
  IconFileDollar,
  IconFileText,
  IconHome,
  IconMessageCircle,
  IconReceipt,
  IconPlus,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import { CustomerUserSummary } from '@/shared/components/CustomerUserSummary';

import './CustomerNavbar.css';

type CustomerNavbarItem = {
  label: string;
  path: string;
  icon: ReactNode;
};

const customerNavbarItems: CustomerNavbarItem[] = [
  { icon: <IconHome size={15} stroke={1.8} />, label: 'Home', path: '/customer/dashboard' },
  { icon: <IconFileText size={15} stroke={1.8} />, label: 'My Projects', path: '/customer/projects' },
  { icon: <IconFileDollar size={15} stroke={1.8} />, label: 'Quotations', path: '/customer/quotations' },
  { icon: <IconReceipt size={15} stroke={1.8} />, label: 'Orders', path: '/customer/orders' },
  { icon: <IconCalendarEvent size={15} stroke={1.8} />, label: 'Schedules', path: '/customer/schedules' },
  { icon: <IconMessageCircle size={15} stroke={1.8} />, label: 'Project Chat', path: '/customer/chat' },
  { icon: <IconBox size={15} stroke={1.8} />, label: 'Handover', path: '/customer/projects' },
];

type CustomerNavbarProps = {
  activeLabel: string;
  classPrefix: string;
};

export function CustomerNavbar({ activeLabel, classPrefix }: CustomerNavbarProps) {
  const navigate = useNavigate();

  return (
    <>
      <aside className="customer-shell-sidebar">
        <NavLink className="customer-shell-logo" to="/customer/dashboard">
          <span>
            <IconBox size={19} stroke={1.8} />
          </span>
          <strong>FurniSpace</strong>
        </NavLink>

        <nav className="customer-shell-nav" aria-label="Customer navigation">
          {customerNavbarItems.map((item) => (
            <NavLink
              className={item.label === activeLabel ? 'customer-shell-nav-active' : undefined}
              key={item.label}
              to={item.path}
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
