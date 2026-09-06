import { useLayoutEffect, useState } from 'react';

type ActorKey = 'admin' | 'customer' | 'designer' | 'production' | 'sale';

const bodyClassByActor: Record<ActorKey, string> = {
  admin: 'admin-sidebar-collapsed',
  customer: 'customer-sidebar-collapsed',
  designer: 'designer-sidebar-collapsed',
  production: 'production-sidebar-collapsed',
  sale: 'sale-sidebar-collapsed',
};

export function useActorSidebarCollapse(actor: ActorKey) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  useLayoutEffect(() => {
    const bodyClass = bodyClassByActor[actor];
    document.body.classList.toggle(bodyClass, isCollapsed);

    return () => {
      document.body.classList.remove(bodyClass);
    };
  }, [actor, isCollapsed]);

  return {
    isCollapsed,
    collapse: () => setIsCollapsed(true),
    expand: () => setIsCollapsed(false),
  };
}
