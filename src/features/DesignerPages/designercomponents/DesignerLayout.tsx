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
    <div className="designer-layout">
      <DesignerSidebar activeLabel={activeLabel} />
      <div className="designer-layout-content">
        <DesignerNavbar activeLabel={activeLabel} searchPlaceholder={searchPlaceholder} />
        <main className="designer-layout-main">{children}</main>
      </div>
    </div>
  );
}
