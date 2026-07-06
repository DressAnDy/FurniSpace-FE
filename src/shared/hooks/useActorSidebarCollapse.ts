import { useEffect, useState } from 'react';

type ActorKey = 'admin' | 'designer' | 'sale';

const storageKeyByActor: Record<ActorKey, string> = {
  admin: 'furnispace:admin-sidebar-collapsed',
  designer: 'furnispace:designer-sidebar-collapsed',
  sale: 'furnispace:sale-sidebar-collapsed',
};

const bodyClassByActor: Record<ActorKey, string> = {
  admin: 'admin-sidebar-collapsed',
  designer: 'designer-sidebar-collapsed',
  sale: 'sale-sidebar-collapsed',
};

export function useActorSidebarCollapse(actor: ActorKey) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(storageKeyByActor[actor]) === 'true';
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
