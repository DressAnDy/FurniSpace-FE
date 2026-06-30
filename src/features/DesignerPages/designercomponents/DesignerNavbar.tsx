import { IconChevronDown, IconSearch } from '@tabler/icons-react';

import { NotificationBell } from '@/shared/components/NotificationBell';

type DesignerNavbarProps = {
  activeLabel: string;
  searchPlaceholder?: string;
};

export function DesignerNavbar({ activeLabel, searchPlaceholder = 'Search projects, proposals...' }: DesignerNavbarProps) {
  return (
    <header className="designer-topbar">
      <div className="designer-topbar-breadcrumb">
        <p>FurniSpace</p>
        <span>{activeLabel}</span>
      </div>

      <label className="designer-topbar-search">
        <IconSearch size={17} stroke={1.8} />
        <input placeholder={searchPlaceholder} type="search" />
      </label>

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
