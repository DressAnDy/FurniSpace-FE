import {
  IconBox,
  IconCalendarEvent,
  IconChevronLeft,
  IconFileDollar,
  IconFileText,
  IconGlobe,
  IconHome,
  IconMenu2,
  IconMessageCircle,
  IconReceipt,
  IconPlus,
  type Icon,
} from '@tabler/icons-react';
import { NavLink, useNavigate } from 'react-router-dom';

import { useLang } from '@/app/providers/useLang';
import { CustomerUserSummary } from '@/shared/components/CustomerUserSummary';
import { useActorSidebarCollapse } from '@/shared/hooks/useActorSidebarCollapse';

import { customerCopy, type CustomerNavKey } from './customerI18n';
import './CustomerNavbar.css';

type CustomerNavbarItem = {
  key: CustomerNavKey;
  path: string;
  icon: Icon;
};

const customerNavbarItems: CustomerNavbarItem[] = [
  { key: 'home', icon: IconHome, path: '/customer/dashboard' },
  { key: 'myProjects', icon: IconFileText, path: '/customer/projects' },
  { key: 'tracking', icon: IconBox, path: '/customer/tracking' },
  { key: 'quotations', icon: IconFileDollar, path: '/customer/quotations' },
  { key: 'orders', icon: IconReceipt, path: '/customer/orders' },
  { key: 'schedules', icon: IconCalendarEvent, path: '/customer/schedules' },
  { key: 'projectChat', icon: IconMessageCircle, path: '/customer/chat' },
];

type CustomerNavbarProps = {
  activeKey: CustomerNavKey;
  classPrefix: string;
};

export function CustomerNavbar({ activeKey, classPrefix }: CustomerNavbarProps) {
  const navigate = useNavigate();
  const { lang, setLang } = useLang();
  const t = customerCopy[lang];
  const { collapse, expand, isCollapsed } = useActorSidebarCollapse('customer');
  const nextLang = lang === 'vi' ? 'en' : 'vi';

  return (
    <>
      <button
        aria-label={t.openSidebar}
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

        <nav className="customer-shell-nav" aria-label={t.navAria}>
          {customerNavbarItems.map((item) => {
            const label = t.nav[item.key];
            const ItemIcon = item.icon;

            return (
              <NavLink
                className={({ isActive }) => (isActive || item.key === activeKey ? 'customer-shell-nav-active' : undefined)}
                key={item.key}
                to={item.path}
                title={label}
              >
                <ItemIcon size={15} stroke={1.8} />
                <span>{label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <header className="customer-shell-actionbar">
        <button className="customer-shell-create" type="button" onClick={() => navigate('/customer/project-request')}>
          <IconPlus size={15} stroke={2} />
          {t.createProjectRequest}
        </button>
        <button
          aria-label={t.switchLang}
          className="customer-language"
          title={t.switchLang}
          type="button"
          onClick={() => setLang(nextLang)}
        >
          <IconGlobe size={16} />
          <span>{lang.toUpperCase()}</span>
        </button>
        <CustomerUserSummary classPrefix={classPrefix} />
      </header>
    </>
  );
}
