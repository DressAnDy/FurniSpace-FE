import type { ReactNode } from 'react';

import { DesignerNavbar } from './DesignerNavbar';
import { DesignerSidebar } from './DesignerSidebar';

import './DesignerLayout.css';

type DesignerLayoutProps = {
  activeLabel: string;
  children: ReactNode;
  searchPlaceholder?: string;
};

export function DesignerLayout({ activeLabel, children, searchPlaceholder }: DesignerLayoutProps) {
  return (
    <div className="designer-layout flex min-h-screen bg-[#f7f7f5] text-zinc-950">
      <DesignerSidebar activeLabel={activeLabel} />
      <div className="flex min-w-0 flex-1 flex-col">
        <DesignerNavbar activeLabel={activeLabel} searchPlaceholder={searchPlaceholder} />
        <main className="designer-layout-main min-w-0 flex-1 overflow-y-auto px-8 py-7">{children}</main>
      </div>
    </div>
  );
}
