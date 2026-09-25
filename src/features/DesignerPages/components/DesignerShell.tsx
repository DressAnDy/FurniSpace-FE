import type { ReactNode } from 'react';

import { DesignerLayout, type DesignerNavKey } from '@/features/DesignerPages/designercomponents';

type DesignerShellProps = {
  activeKey: DesignerNavKey;
  children: ReactNode;
};

export function DesignerShell({ activeKey, children }: DesignerShellProps) {
  return <DesignerLayout activeKey={activeKey}>{children}</DesignerLayout>;
}
