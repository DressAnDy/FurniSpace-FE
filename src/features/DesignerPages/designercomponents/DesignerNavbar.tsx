import { IconBell, IconChevronDown, IconSearch } from '@tabler/icons-react';

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
        <button className="designer-topbar-notification" type="button" aria-label="Notifications">
          <IconBell size={19} stroke={1.8} />
          <span />
        </button>
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
