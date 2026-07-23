import { createContext, useContext, useEffect } from 'react';

export type TileTransitionContextValue = {
  isTransitioning: boolean;
  markRouteReady: () => void;
  transitionTo: (input: TileTransitionInput) => Promise<void>;
};

export type TileTransitionInput = {
  originElement: HTMLElement;
  to: string;
};

export const TileTransitionContext = createContext<TileTransitionContextValue | null>(null);

export function useTileTransition() {
  const context = useContext(TileTransitionContext);

  if (!context) {
    throw new Error('useTileTransition must be used within TileTransitionProvider.');
  }

  return context;
}

export function useTileTransitionRouteReady(isReady: boolean) {
  const context = useContext(TileTransitionContext);

  useEffect(() => {
    if (isReady) {
      context?.markRouteReady();
    }
  }, [context, isReady]);
}
