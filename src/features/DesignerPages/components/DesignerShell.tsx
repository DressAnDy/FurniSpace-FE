import type { ReactNode } from 'react';
import {
  IconBell,
  IconBriefcase,
  IconCube,
  IconFileText,
  IconHome,
  IconLogout,
  IconRulerMeasure,
  IconUser,
} from '@tabler/icons-react';
import { NavLink } from 'react-router-dom';

import './DesignerShell.css';

type DesignerShellProps = {
  activeLabel: string;
  children: ReactNode;
};

const navItems = [
  { icon: IconHome, label: 'Dashboard', path: '/designer/assigned-projects' },
  { icon: IconBriefcase, label: 'Assigned Projects', path: '/designer/assigned-projects' },
  { icon: IconFileText, label: 'Proposals', path: '/designer/projects/mock-project-cafe/proposals/mock-proposal-industrial' },
  { icon: IconCube, label: 'Room Planner', path: '/proposal-scenes/mock-scene-main/room-planner' },
  { icon: IconRulerMeasure, label: 'Measurements' },
];

export function DesignerShell({ activeLabel, children }: DesignerShellProps) {
  return (
    <main className="designer-shell">
      <aside className="designer-sidebar">
        <div className="designer-brand"><IconCube size={22} /><div><strong>FurniSpace</strong><span>Designer Workspace</span></div></div>
        <nav>
          {navItems.map(({ icon: ItemIcon, label, path }) => path ? (
            <NavLink className={label === activeLabel ? 'is-active' : ''} key={label} to={path}>
              <ItemIcon size={17} /><span>{label}</span>
            </NavLink>
          ) : (
            <button disabled key={label} type="button"><ItemIcon size={17} /><span>{label}</span></button>
          ))}
        </nav>
        <button className="designer-logout" type="button"><IconLogout size={17} /> Logout</button>
      </aside>

      <section className="designer-main">
        <header className="designer-topbar">
          <div><strong>Design Operations</strong><span>Proposal and Room Planner workflow</span></div>
          <div className="designer-user"><button aria-label="Notifications" type="button"><IconBell size={19} /></button><span><IconUser size={17} /></span><div><strong>Michael Torres</strong><small>Designer</small></div></div>
        </header>
        <div className="designer-content">{children}</div>
      </section>
    </main>
  );
}
