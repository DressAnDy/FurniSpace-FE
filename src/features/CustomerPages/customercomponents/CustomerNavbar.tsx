import {
  IconBox,
  IconFileText,
  IconHome,
  IconMessageCircle,
  IconPlus,
  IconReceipt,
  IconSparkles,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import { CustomerUserSummary } from '@/shared/components/CustomerUserSummary';

type CustomerNavbarItem = {
  label: string;
  path: string;
  icon: ReactNode;
};

const customerNavbarItems: CustomerNavbarItem[] = [
  { icon: <IconHome size={15} stroke={1.8} />, label: 'Home', path: '/customer/dashboard' },
  { icon: <IconFileText size={15} stroke={1.8} />, label: 'My Projects', path: '/customer/projects' },
  { icon: <IconFileText size={15} stroke={1.8} />, label: 'Design Proposals', path: '/customer/proposals' },
  { icon: <IconSparkles size={15} stroke={1.8} />, label: '2D/3D Review', path: '/customer/3d-preview' },
  { icon: <IconReceipt size={15} stroke={1.8} />, label: 'Quotations', path: '/customer/proposals' },
  { icon: <IconMessageCircle size={15} stroke={1.8} />, label: 'Project Chat', path: '/customer/projects' },
  { icon: <IconBox size={15} stroke={1.8} />, label: 'Handover', path: '/customer/projects' },
];

type CustomerNavbarProps = {
  activeLabel: string;
  classPrefix: string;
};

export function CustomerNavbar({ activeLabel, classPrefix }: CustomerNavbarProps) {
  const navigate = useNavigate();

  return (
    <header className={`${classPrefix}-topnav`}>
      <NavLink className={`${classPrefix}-logo`} to="/customer/dashboard">
        <span>
          <IconBox size={19} stroke={1.8} />
        </span>
        <strong>FurniSpace</strong>
      </NavLink>

      <nav aria-label="Customer navigation">
        {customerNavbarItems.map((item) => (
          <NavLink
            className={item.label === activeLabel ? `${classPrefix}-nav-active` : undefined}
            key={item.label}
            to={item.path}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={`${classPrefix}-userbar`}>
        <button className={`${classPrefix}-create`} type="button" onClick={() => navigate('/customer/project-request')}>
          <IconPlus size={15} stroke={2} />
          Create Project Request
        </button>
        <CustomerUserSummary classPrefix={classPrefix} />
      </div>
    </header>
  );
}
