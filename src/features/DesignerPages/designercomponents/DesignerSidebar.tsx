import {
  IconBell,
  IconCalendarEvent,
  IconChevronLeft,
  IconHome,
  IconLogout,
  IconPackage,
  IconSettings,
  IconTable,
  type Icon,
} from '@tabler/icons-react';
import { NavLink, useNavigate } from 'react-router-dom';

import logoImage from '@/assets/Logo/Logo.png';
import { useLogout } from '@/services/queries';

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
  { label: 'Notifications', icon: IconBell },
  { label: 'Settings', icon: IconSettings },
];

type DesignerSidebarProps = {
  activeLabel: string;
};

export function DesignerSidebar({ activeLabel }: DesignerSidebarProps) {
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
    <aside className="designer-sidebar flex min-h-screen w-[244px] shrink-0 flex-col bg-[#2f2f2f] px-5 py-6 text-white">
      <div className="mb-10 flex items-center gap-3">
        <img className="h-11 w-11 rounded-xl object-contain" src={logoImage} alt="" />
        <div>
          <h1 className="text-[15px] font-semibold leading-5">FurniSpace</h1>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-400">Designer</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1.5">
        {designerSidebarItems.map(({ label, icon: ItemIcon, path }) => {
          const activeClass = label === activeLabel ? 'bg-[#c7a15f] text-[#171717] shadow-sm' : 'text-zinc-300 hover:bg-white/10 hover:text-white';
          const content = (
            <>
              <ItemIcon size={18} stroke={1.9} />
              <span>{label}</span>
            </>
          );

          if (!path) {
            return (
              <button
                className={`flex h-10 items-center gap-3 rounded-xl px-3 text-left text-[13px] font-medium transition ${activeClass}`}
                disabled
                key={label}
                type="button"
              >
                {content}
              </button>
            );
          }

          return (
            <NavLink
              className={({ isActive }) =>
                `flex h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-medium no-underline transition ${
                  isActive || label === activeLabel ? 'bg-[#c7a15f] text-[#171717] shadow-sm' : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                }`
              }
              key={label}
              to={path}
            >
              {content}
            </NavLink>
          );
        })}
      </nav>

      <div className="space-y-3">
        <button className="flex h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-medium text-zinc-300 transition hover:bg-white/10" type="button">
          <IconChevronLeft size={18} stroke={1.9} />
          <span>Collapse</span>
        </button>
        <button
          className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] font-medium text-zinc-300 transition hover:bg-white/10 disabled:opacity-60"
          disabled={logoutMutation.isPending}
          onClick={handleLogout}
          type="button"
        >
          <IconLogout size={18} stroke={1.9} />
          <span>{logoutMutation.isPending ? 'Logging out...' : 'Logout'}</span>
        </button>
      </div>
    </aside>
  );
}
