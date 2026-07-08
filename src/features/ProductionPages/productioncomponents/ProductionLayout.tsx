import type { ReactNode } from 'react';

import { ProductionNavbar } from './ProductionNavbar';
import { ProductionSidebar } from './ProductionSidebar';

import './ProductionLayout.css';

type ProductionLayoutProps = {
  activeLabel: string;
  children: ReactNode;
  searchPlaceholder?: string;
};

export function ProductionLayout({ activeLabel, children, searchPlaceholder }: ProductionLayoutProps) {
  return (
    <div className="production-layout">
      <ProductionSidebar activeLabel={activeLabel} />
      <div className="production-layout-content">
        <ProductionNavbar searchPlaceholder={searchPlaceholder} />
        <main className="production-layout-main">{children}</main>
      </div>
    </div>
  );
}
