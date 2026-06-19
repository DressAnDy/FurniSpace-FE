import { IconBell, IconChevronDown, IconSearch } from '@tabler/icons-react';

type DesignerNavbarProps = {
  activeLabel: string;
  searchPlaceholder?: string;
};

export function DesignerNavbar({ activeLabel, searchPlaceholder = 'Search projects, proposals...' }: DesignerNavbarProps) {
  return (
    <header className="designer-topbar flex min-h-16 items-center justify-between gap-4 border-b border-zinc-200 bg-white px-7">
      <div className="flex items-center gap-8">
        <p className="text-[11px] font-semibold text-zinc-600">FurniSpace</p>
        <span className="text-[13px] font-semibold text-zinc-900">{activeLabel}</span>
      </div>

      <label className="hidden h-10 min-w-[320px] max-w-lg flex-1 items-center gap-3 rounded-full bg-zinc-100 px-4 text-zinc-500 lg:flex">
        <IconSearch size={17} stroke={1.8} />
        <input className="w-full bg-transparent text-[13px] text-zinc-800 outline-none placeholder:text-zinc-400" placeholder={searchPlaceholder} type="search" />
      </label>

      <div className="flex items-center gap-4">
        <button className="relative flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 text-zinc-600" type="button" aria-label="Notifications">
          <IconBell size={19} stroke={1.8} />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-500" />
        </button>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1f1a17] text-[11px] font-bold text-white">DS</div>
        <div className="hidden leading-tight md:block">
          <p className="m-0 text-[12px] font-semibold text-zinc-900">David Smith</p>
          <span className="text-[10px] text-zinc-500">Designer</span>
        </div>
        <IconChevronDown className="text-zinc-400" size={16} />
      </div>
    </header>
  );
}
