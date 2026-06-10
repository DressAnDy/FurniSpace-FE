import { IconBell, IconChevronDown, IconPlus, IconSearch } from '@tabler/icons-react';

export function SaleNavbar() {
  return (
    <header className="sale-topbar flex min-h-16 items-center justify-between gap-4 border-b border-zinc-200 bg-white px-6">
      <label className="sale-topbar-search flex h-11 min-w-[320px] max-w-xl flex-1 items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 text-zinc-500">
        <IconSearch size={18} />
        <input
          className="w-full bg-transparent text-sm text-zinc-800 outline-none placeholder:text-zinc-400"
          placeholder="Search projects, customers..."
          type="search"
        />
      </label>

      <div className="sale-topbar-actions flex items-center gap-3">
        <button
          className="sale-button sale-button-primary flex h-11 items-center gap-2 rounded-lg bg-[#c9a24d] px-4 text-sm font-semibold text-[#171717] transition hover:bg-[#b8923f]"
          type="button"
        >
          <IconPlus size={16} />
          Quick Action
          <IconChevronDown size={14} />
        </button>
        <button className="sale-icon-button relative flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600" type="button" aria-label="Notifications">
          <IconBell size={20} />
          <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-red-500" />
        </button>
        <div className="sale-user-copy text-right">
          <p className="text-sm font-semibold text-zinc-900">Sarah Johnson</p>
          <span className="text-xs text-zinc-500">Sales Consultant</span>
        </div>
        <div className="sale-avatar flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white">
          SJ
        </div>
      </div>
    </header>
  );
}
