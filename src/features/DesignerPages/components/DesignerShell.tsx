import type { ReactNode } from 'react';

import { DesignerLayout } from '@/features/DesignerPages/designercomponents';

type DesignerShellProps = {
  activeLabel: string;
  children: ReactNode;
};

export function DesignerShell({ activeLabel, children }: DesignerShellProps) {
  return <DesignerLayout activeLabel={activeLabel}>{children}</DesignerLayout>;
}
