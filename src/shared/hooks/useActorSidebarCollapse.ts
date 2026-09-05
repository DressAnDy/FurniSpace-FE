import { useEffect, useState } from 'react';

type ActorKey = 'admin' | 'customer' | 'designer' | 'production' | 'sale';

const storageKeyByActor: Record<ActorKey, string> = {
  admin: 'furnispace:admin-sidebar-collapsed',
  customer: 'furnispace:customer-sidebar-collapsed',
  designer: 'furnispace:designer-sidebar-collapsed',
  production: 'furnispace:production-sidebar-collapsed',
  sale: 'furnispace:sale-sidebar-collapsed',
};

const bodyClassByActor: Record<ActorKey, string> = {
  admin: 'admin-sidebar-collapsed',
  customer: 'customer-sidebar-collapsed',
  designer: 'designer-sidebar-collapsed',
  production: 'production-sidebar-collapsed',
  sale: 'sale-sidebar-collapsed',
};

export function useActorSidebarCollapse(actor: ActorKey) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return true;
    const savedValue = window.localStorage.getItem(storageKeyByActor[actor]);

    return savedValue === null ? true : savedValue === 'true';
  });

  useEffect(() => {
    const bodyClass = bodyClassByActor[actor];
    document.body.classList.toggle(bodyClass, isCollapsed);
    window.localStorage.setItem(storageKeyByActor[actor], String(isCollapsed));

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
