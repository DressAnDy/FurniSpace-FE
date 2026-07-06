import { IconChevronDown } from '@tabler/icons-react';

import { ActorCommandSearch } from '@/shared/components/ActorCommandSearch';
import { NotificationBell } from '@/shared/components/NotificationBell';

type DesignerNavbarProps = {
  activeLabel: string;
  searchPlaceholder?: string;
};

export function DesignerNavbar({ activeLabel, searchPlaceholder = 'Search designer features...' }: DesignerNavbarProps) {
  return (
    <header className="designer-topbar">
      <div className="designer-topbar-breadcrumb">
        <p>FurniSpace</p>
        <span>{activeLabel}</span>
      </div>

      <ActorCommandSearch actor="designer" className="designer-topbar-search" placeholder={searchPlaceholder} />

      <div className="designer-topbar-account">
        <NotificationBell buttonClassName="designer-topbar-notification" />
        <div className="designer-topbar-avatar">DS</div>
        <div className="designer-topbar-profile">
          <p>David Smith</p>
          <span>Designer</span>
        </div>
        <IconChevronDown className="designer-topbar-chevron" size={16} />
      </div>
    </header>
  );
}
