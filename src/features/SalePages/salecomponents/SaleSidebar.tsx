import {
  IconBriefcase,
  IconCalendarEvent,
  IconClipboardList,
  IconFileDollar,
  IconHome,
  IconLogout,
  type Icon,
} from '@tabler/icons-react';
import { NavLink, useNavigate } from 'react-router-dom';

import logoImage from '@/assets/Logo/Logo.png';
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
  { label: 'Orders', icon: IconFileDollar },
  { label: 'Production Tracking', icon: IconClipboardList },
];

type SaleSidebarProps = {
  activeLabel: string;
};

export function SaleSidebar({ activeLabel }: SaleSidebarProps) {
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
    <aside className="sale-sidebar flex min-h-screen w-[256px] shrink-0 flex-col bg-[#2d2d2d] text-white">
      <div className="sale-sidebar-brand mb-8 flex items-center gap-3 px-2">
        <img className="sale-sidebar-brand-logo" src={logoImage} alt="FurniSpace" />
        <div>
          <h1 className="text-lg font-semibold leading-6">FurniSpace</h1>
          <p className="text-sm text-zinc-400">Interior Solutions</p>
        </div>
      </div>

      <nav className="sale-sidebar-nav flex flex-1 flex-col gap-1">
        {saleSidebarItems.map(({ label, icon: ItemIcon, path }) => {
          const staticItemClass =
            label === activeLabel
              ? 'sale-sidebar-item-active bg-[#c9a24d] text-[#171717] shadow-sm'
              : 'text-zinc-300 hover:bg-white/10 hover:text-white';

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
                className={`sale-sidebar-item flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium transition ${staticItemClass}`}
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
                    ? 'sale-sidebar-item-active bg-[#c9a24d] text-[#171717] shadow-sm'
                    : 'text-zinc-300 hover:bg-white/10 hover:text-white';

                return `sale-sidebar-item flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium no-underline transition ${itemClass}`;
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
  );
}
