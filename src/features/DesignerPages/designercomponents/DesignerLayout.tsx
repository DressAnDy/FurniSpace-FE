import type { ReactNode } from 'react';

import { DesignerNavbar } from './DesignerNavbar';
import { DesignerSidebar } from './DesignerSidebar';
import type { DesignerNavKey } from './designerI18n';

import './DesignerLayout.css';

type DesignerLayoutProps = {
  activeKey: DesignerNavKey;
  children: ReactNode;
  searchPlaceholder?: string;
};

export function DesignerLayout({ activeKey, children, searchPlaceholder }: DesignerLayoutProps) {
  return (
    <div className="designer-layout">
      <DesignerSidebar activeKey={activeKey} />
      <div className="designer-layout-content">
        <DesignerNavbar searchPlaceholder={searchPlaceholder} />
        <main className="designer-layout-main">{children}</main>
      </div>
    </div>
  );
}
