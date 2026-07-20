import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import './TileTransitionProvider.css';

type TileTransitionContextValue = {
  isTransitioning: boolean;
  markRouteReady: () => void;
  transitionTo: (input: TileTransitionInput) => Promise<void>;
};

type TileTransitionInput = {
  originElement: HTMLElement;
  to: string;
};

type TileTransitionState = {
  cols: number;
  maxDelayMs: number;
  originX: number;
  originY: number;
  phase: 'cover' | 'reveal';
  rows: number;
};

const TILE_ANIMATION_DURATION_MS = 360;
const TILE_MAX_DELAY_MS = 460;
const TILE_ROUTE_READY_TIMEOUT_MS = 4500;
const REDUCED_MOTION_DURATION_MS = 180;
const TRANSITION_BUFFER_MS = 80;

const TileTransitionContext = createContext<TileTransitionContextValue | null>(null);

export function TileTransitionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [transitionState, setTransitionState] = useState<TileTransitionState | null>(null);
  const transitionLockRef = useRef(false);
  const routeReadyResolverRef = useRef<(() => void) | null>(null);

  const markRouteReady = useCallback(() => {
    routeReadyResolverRef.current?.();
    routeReadyResolverRef.current = null;
  }, []);

  const waitForRouteReady = useCallback(() => {
    return new Promise<void>((resolve) => {
      let timeoutId: number | undefined;

      const complete = () => {
        window.clearTimeout(timeoutId);
        routeReadyResolverRef.current = null;
        resolve();
      };

      routeReadyResolverRef.current = complete;
      timeoutId = window.setTimeout(complete, TILE_ROUTE_READY_TIMEOUT_MS);
    });
  }, []);

  const transitionTo = useCallback(async ({ originElement, to }: TileTransitionInput) => {
    if (transitionLockRef.current) {
      return;
    }

    transitionLockRef.current = true;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const origin = getElementViewportOrigin(originElement);
    const tileGrid = getTileGrid();
    const maxDelayMs = reducedMotion ? 0 : TILE_MAX_DELAY_MS;
    const phaseDurationMs = reducedMotion
      ? REDUCED_MOTION_DURATION_MS
      : TILE_ANIMATION_DURATION_MS + maxDelayMs + TRANSITION_BUFFER_MS;

    try {
      setTransitionState({
        ...tileGrid,
        ...origin,
        maxDelayMs,
        phase: 'cover',
      });

      await wait(phaseDurationMs);
      routeReadyResolverRef.current = null;
      navigate(to);
      await waitForRouteReady();

      setTransitionState((current) => current ? { ...current, phase: 'reveal' } : current);
      await wait(phaseDurationMs);
      focusRouteHeading();
    } finally {
      setTransitionState(null);
      transitionLockRef.current = false;
    }
  }, [navigate, waitForRouteReady]);

  const contextValue = useMemo<TileTransitionContextValue>(() => ({
    isTransitioning: Boolean(transitionState),
    markRouteReady,
    transitionTo,
  }), [markRouteReady, transitionState, transitionTo]);

  return (
    <TileTransitionContext.Provider value={contextValue}>
      {children}
      <TileTransitionOverlay state={transitionState} />
    </TileTransitionContext.Provider>
  );
}

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

function TileTransitionOverlay({ state }: { state: TileTransitionState | null }) {
  if (!state) {
    return null;
  }

  const tiles = createTiles(state);

  return (
    <div className={`tile-transition-overlay tile-transition-overlay-${state.phase}`} aria-hidden="true">
      <div
        className="tile-transition-grid"
        style={{
          '--tile-transition-cols': state.cols,
          '--tile-transition-rows': state.rows,
        } as CSSProperties}
      >
        {tiles.map((tile) => (
          <span
            className="tile-transition-tile"
            key={`${tile.column}-${tile.row}`}
            style={{ '--tile-transition-delay': `${tile.delayMs}ms` } as CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}

function createTiles(state: TileTransitionState) {
  const tiles: Array<{ column: number; delayMs: number; row: number }> = [];
  let maxDistance = 0;

  for (let row = 0; row < state.rows; row += 1) {
    for (let column = 0; column < state.cols; column += 1) {
      const tileX = (column + 0.5) / state.cols;
      const tileY = (row + 0.5) / state.rows;
      const distance = Math.hypot(tileX - state.originX, tileY - state.originY);

      maxDistance = Math.max(maxDistance, distance);
      tiles.push({ column, row, delayMs: distance });
    }
  }

  return tiles.map((tile) => ({
    ...tile,
    delayMs: maxDistance > 0 ? Math.round((tile.delayMs / maxDistance) * state.maxDelayMs) : 0,
  }));
}

function getElementViewportOrigin(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  return {
    originX: clamp(centerX / window.innerWidth, 0, 1),
    originY: clamp(centerY / window.innerHeight, 0, 1),
  };
}

function getTileGrid() {
  const width = window.innerWidth;

  if (width <= 560) {
    return { cols: 6, rows: 9 };
  }

  if (width <= 900) {
    return { cols: 8, rows: 8 };
  }

  return { cols: 12, rows: 8 };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function focusRouteHeading() {
  const heading = document.querySelector<HTMLElement>('main h1, [data-route-focus]');

  if (!heading) {
    return;
  }

  heading.setAttribute('tabindex', '-1');
  heading.focus({ preventScroll: true });
}
