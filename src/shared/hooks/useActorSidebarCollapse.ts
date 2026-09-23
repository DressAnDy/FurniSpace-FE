import { useLayoutEffect, useState } from 'react';

type ActorKey = 'admin' | 'customer' | 'designer' | 'production' | 'sale';

const bodyClassByActor: Record<ActorKey, string> = {
  admin: 'admin-sidebar-collapsed',
  customer: 'customer-sidebar-collapsed',
  designer: 'designer-sidebar-collapsed',
  production: 'production-sidebar-collapsed',
  sale: 'sale-sidebar-collapsed',
};

const storageKeyByActor: Record<ActorKey, string> = {
  admin: 'furnispace.admin.sidebarCollapsed',
  customer: 'furnispace.customer.sidebarCollapsed',
  designer: 'furnispace.designer.sidebarCollapsed',
  production: 'furnispace.production.sidebarCollapsed',
  sale: 'furnispace.sale.sidebarCollapsed',
};

const inMemorySidebarState: Partial<Record<ActorKey, boolean>> = {};

export function useActorSidebarCollapse(actor: ActorKey) {
  const [isCollapsed, setIsCollapsed] = useState(() => getInitialSidebarState(actor));

  useLayoutEffect(() => {
    const bodyClass = bodyClassByActor[actor];
    Object.entries(bodyClassByActor).forEach(([entryActor, entryBodyClass]) => {
      if (entryActor !== actor) {
        document.body.classList.remove(entryBodyClass);
      }
    });
    document.body.classList.toggle(bodyClass, isCollapsed);
    inMemorySidebarState[actor] = isCollapsed;
    storeSidebarState(actor, isCollapsed);
  }, [actor, isCollapsed]);

  return {
    isCollapsed,
    collapse: () => setIsCollapsed(true),
    expand: () => setIsCollapsed(false),
  };
}

function getInitialSidebarState(actor: ActorKey) {
  const memoryValue = inMemorySidebarState[actor];

  if (typeof memoryValue === 'boolean') {
    return memoryValue;
  }

  if (actor === 'customer') {
    return true;
  }

  return getStoredSidebarState(actor);
}

function getStoredSidebarState(actor: ActorKey) {
  try {
    const storedValue = window.localStorage.getItem(storageKeyByActor[actor]);

    if (storedValue === 'expanded') return false;
    if (storedValue === 'collapsed') return true;
  } catch {
    return true;
  }

  return true;
}

function storeSidebarState(actor: ActorKey, isCollapsed: boolean) {
  try {
    window.localStorage.setItem(storageKeyByActor[actor], isCollapsed ? 'collapsed' : 'expanded');
  } catch {
    // Ignore storage errors; the in-memory state still works for the current page.
  }
}
