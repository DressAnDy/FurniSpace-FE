import type { PointerEvent, WheelEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';

import type {
  BlueprintPoint,
  BlueprintTool,
  RoomLayoutState,
  SelectedRoomItem,
} from '@/features/ThreeD/types/roomLayout.types';
import {
  addDoorToWall,
  addOpeningToWall,
  addWallSegment,
  addWindowToWall,
  deleteOpeningItem,
  deleteWall,
  formatMeters,
  getClosedRoomBoundary,
  getPointById,
  getPointAtWallOffset,
  getRoomBounds,
  getWallDirection,
  getWallLength,
  getWallNormal,
  getPointOffsetOnWall,
  insertNodeOnWall,
  movePoint,
  moveWallAlongNormal,
  resizeWallLength,
  updateOpeningItem,
  updateDoorSwingDirection,
  updateWindowSillHeight,
  updateWall,
} from '@/features/ThreeD/utils/roomGeometry';

export type BlueprintCanvasProps = {
  activeTool: BlueprintTool;
  floorFillColor: string;
  floorOpenings?: Array<{
    depth: number;
    id: string;
    label: string;
    position: {
      x: number;
      z: number;
    };
    width: number;
  }>;
  hideLabels: boolean;
  layout: RoomLayoutState | null;
  onLayoutChange: (layout: RoomLayoutState) => void;
  onFloorOpeningAdd?: (position: { x: number; z: number }) => void;
  onFloorOpeningDelete?: (openingId: string) => void;
  onFloorOpeningUpdate?: (
    openingId: string,
    update: Partial<{ depth: number; position: { x: number; z: number }; width: number }>,
  ) => void;
  onMessage?: (message: string) => void;
  onSelectItem: (item: SelectedRoomItem | null) => void;
  readOnly?: boolean;
  selectedItem: SelectedRoomItem | null;
  underlay?: {
    label: string;
    layout: RoomLayoutState | null;
  } | null;
  wallFillColor: string;
};

const VIEWBOX_WIDTH = 920;
const VIEWBOX_HEIGHT = 680;
const BLUEPRINT_PADDING = 120;
const MAX_ZOOM = 3.2;
const MIN_ZOOM = 0.35;
const MAX_LAYOUT_COORDINATE = 10000;
const MIN_LAYOUT_COORDINATE = -10000;

type CanvasTransform = {
  maxX: number;
  maxY: number;
  minX: number;
  minY: number;
  scale: number;
};

type ViewOffset = {
  x: number;
  y: number;
};

type DragPointState = {
  pointId: string;
  transform: CanvasTransform;
  viewOffset: ViewOffset;
};

type DragWallState = {
  originalPoints: BlueprintPoint[];
  start: Pick<BlueprintPoint, 'x' | 'y'>;
  transform: CanvasTransform;
  viewOffset: ViewOffset;
  wallId: string;
};

type DragOpeningState = {
  itemId: string;
  itemType: 'door' | 'window' | 'opening';
  transform: CanvasTransform;
  viewOffset: ViewOffset;
  wallId: string;
};

type DragFloorOpeningState = {
  openingId: string;
  transform: CanvasTransform;
  viewOffset: ViewOffset;
};

type ItemEditorMenuState = {
  itemId: string;
  itemType: 'wall' | 'door' | 'window' | 'opening' | 'floor-hole';
  x: number;
  y: number;
};

type OpeningItemType = 'door' | 'window' | 'opening';
type EditorMenuPlacement = Pick<ItemEditorMenuState, 'x' | 'y'>;

type MetricStepperInputProps = {
  ariaLabel: string;
  min?: number;
  onChange: (value: number) => void;
  step?: number;
  value: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatMetricInput(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function sanitizeDecimalInput(value: string) {
  let hasDecimalPoint = false;
  let nextValue = '';

  for (const character of value.replace(',', '.')) {
    if (character >= '0' && character <= '9') {
      nextValue += character;
      continue;
    }

    if (character === '.' && !hasDecimalPoint) {
      hasDecimalPoint = true;
      nextValue += character;
    }
  }

  return nextValue;
}

function MetricStepperInput({
  ariaLabel,
  min = 0,
  onChange,
  step = 0.25,
  value,
}: MetricStepperInputProps) {
  const [draftValue, setDraftValue] = useState(formatMetricInput(value));

  useEffect(() => {
    setDraftValue(formatMetricInput(value));
  }, [value]);

  function commitDraft(nextDraftValue: string) {
    if (!nextDraftValue || nextDraftValue === '.') {
      return;
    }

    const parsedValue = Number(nextDraftValue);

    if (Number.isFinite(parsedValue)) {
      onChange(Number(Math.max(min, parsedValue).toFixed(2)));
    }
  }

  return (
    <input
      aria-label={ariaLabel}
      inputMode="decimal"
      min={min}
      type="text"
      value={draftValue}
      onBlur={() => setDraftValue(formatMetricInput(value))}
      onChange={(event) => {
        const sanitizedValue = sanitizeDecimalInput(event.target.value);

        setDraftValue(sanitizedValue);
        commitDraft(sanitizedValue);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur();
        }

        if (event.key === 'ArrowDown') {
          event.preventDefault();
          onChange(Number(Math.max(min, value - step).toFixed(2)));
        }

        if (event.key === 'ArrowUp') {
          event.preventDefault();
          onChange(Number(Math.max(min, value + step).toFixed(2)));
        }
      }}
    />
  );
}

function isBlueprintSurface(target: EventTarget | null) {
  return target instanceof Element && (
    target.classList.contains('blueprint-click-surface') ||
    target.classList.contains('blueprint-room-fill')
  );
}

function getDistanceToSegment(
  point: Pick<BlueprintPoint, 'x' | 'y'>,
  start: Pick<BlueprintPoint, 'x' | 'y'>,
  end: Pick<BlueprintPoint, 'x' | 'y'>,
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (!lengthSquared) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
  const projection = {
    x: start.x + t * dx,
    y: start.y + t * dy,
  };

  return Math.hypot(point.x - projection.x, point.y - projection.y);
}

export function BlueprintCanvas({
  activeTool,
  floorFillColor,
  floorOpenings = [],
  hideLabels,
  layout,
  onLayoutChange,
  onFloorOpeningAdd,
  onFloorOpeningDelete,
  onFloorOpeningUpdate,
  onMessage,
  onSelectItem,
  readOnly = false,
  selectedItem,
  underlay,
  wallFillColor,
}: BlueprintCanvasProps) {
  const [dragPoint, setDragPoint] = useState<DragPointState | null>(null);
  const [dragWall, setDragWall] = useState<DragWallState | null>(null);
  const [dragOpening, setDragOpening] = useState<DragOpeningState | null>(null);
  const [dragFloorOpening, setDragFloorOpening] = useState<DragFloorOpeningState | null>(null);
  const [itemEditorMenu, setItemEditorMenu] = useState<ItemEditorMenuState | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [pendingWallStart, setPendingWallStart] = useState<Pick<BlueprintPoint, 'x' | 'y'> | null>(null);
  const [panStart, setPanStart] = useState<{ pointerX: number; pointerY: number; x: number; y: number } | null>(null);
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const autoTransform = useMemo(() => {
    if (!layout) {
      return {
        maxX: 12,
        maxY: 12,
        minX: 0,
        minY: 0,
        scale: 36 * zoom,
      };
    }

    const bounds = getRoomBounds(layout.points);
    const width = Math.max(bounds.maxX - bounds.minX, 1);
    const height = Math.max(bounds.maxY - bounds.minY, 1);
    const scale = Math.min(
      (VIEWBOX_WIDTH - BLUEPRINT_PADDING * 2) / width,
      (VIEWBOX_HEIGHT - BLUEPRINT_PADDING * 2) / height,
      42,
    );

    return {
      ...bounds,
      scale: scale * zoom,
    };
  }, [layout, zoom]);

  const activeTransform = dragPoint?.transform ?? dragWall?.transform ?? dragOpening?.transform ?? dragFloorOpening?.transform ?? autoTransform;
  const activeViewOffset = dragPoint?.viewOffset ?? dragWall?.viewOffset ?? dragOpening?.viewOffset ?? dragFloorOpening?.viewOffset ?? viewOffset;

  function toSvgPoint(point: Pick<BlueprintPoint, 'x' | 'y'>) {
    return {
      x: BLUEPRINT_PADDING + activeViewOffset.x + (point.x - activeTransform.minX) * activeTransform.scale,
      y: BLUEPRINT_PADDING + activeViewOffset.y + (point.y - activeTransform.minY) * activeTransform.scale,
    };
  }

  function fromPointer(
    event: PointerEvent<SVGElement>,
    transformSnapshot = activeTransform,
    viewOffsetSnapshot = activeViewOffset,
  ) {
    const svg = event.currentTarget instanceof SVGSVGElement
      ? event.currentTarget
      : event.currentTarget.ownerSVGElement;

    if (!svg) {
      return {
        x: 0,
        y: 0,
      };
    }

    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const transformed = point.matrixTransform(svg.getScreenCTM()?.inverse());

    return {
      x: (transformed.x - BLUEPRINT_PADDING - viewOffsetSnapshot.x) / transformSnapshot.scale + transformSnapshot.minX,
      y: (transformed.y - BLUEPRINT_PADDING - viewOffsetSnapshot.y) / transformSnapshot.scale + transformSnapshot.minY,
    };
  }

  function getDragSnapshot() {
    return {
      transform: { ...activeTransform },
      viewOffset: { ...activeViewOffset },
    };
  }

  function getEditorMenuPlacement(event: PointerEvent<SVGElement>): EditorMenuPlacement | null {
    const svg = event.currentTarget instanceof SVGSVGElement
      ? event.currentTarget
      : event.currentTarget.ownerSVGElement;
    const bounds = svg?.getBoundingClientRect();

    if (!bounds) {
      return null;
    }

    return {
      x: clamp(event.clientX - bounds.left + 12, 12, Math.max(bounds.width - 250, 12)),
      y: clamp(event.clientY - bounds.top + 12, 12, Math.max(bounds.height - 270, 12)),
    };
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (isPanning && panStart && !dragPoint && !dragWall && !dragOpening && !dragFloorOpening) {
      setViewOffset({
        x: panStart.x + event.clientX - panStart.pointerX,
        y: panStart.y + event.clientY - panStart.pointerY,
      });
      return;
    }

    if (!layout) {
      return;
    }

    const activeDrag = dragPoint ?? dragWall ?? dragOpening ?? dragFloorOpening;
    const nextPoint = activeDrag
      ? fromPointer(event, activeDrag.transform, activeDrag.viewOffset)
      : fromPointer(event);

    if (dragPoint) {
      onLayoutChange(
        movePoint(layout, dragPoint.pointId, {
          x: Number(clamp(nextPoint.x, MIN_LAYOUT_COORDINATE, MAX_LAYOUT_COORDINATE).toFixed(2)),
          y: Number(clamp(nextPoint.y, MIN_LAYOUT_COORDINATE, MAX_LAYOUT_COORDINATE).toFixed(2)),
        }),
      );
      return;
    }

    if (dragOpening) {
      const wall = layout.walls.find((candidate) => candidate.id === dragOpening.wallId);

      if (!wall) {
        return;
      }

      onLayoutChange(updateOpeningItem(
        layout,
        dragOpening.itemType,
        dragOpening.itemId,
        { offset: getPointOffsetOnWall(wall, layout.points, nextPoint) },
      ));
      return;
    }

    if (dragFloorOpening) {
      onFloorOpeningUpdate?.(dragFloorOpening.openingId, {
        position: {
          x: Number(clamp(nextPoint.x, MIN_LAYOUT_COORDINATE, MAX_LAYOUT_COORDINATE).toFixed(2)),
          z: Number(clamp(nextPoint.y, MIN_LAYOUT_COORDINATE, MAX_LAYOUT_COORDINATE).toFixed(2)),
        },
      });
      return;
    }

    if (dragWall) {
      onLayoutChange(
        moveWallAlongNormal(
          layout,
          dragWall.wallId,
          dragWall.start,
          {
            x: Number(clamp(nextPoint.x, MIN_LAYOUT_COORDINATE, MAX_LAYOUT_COORDINATE).toFixed(2)),
            y: Number(clamp(nextPoint.y, MIN_LAYOUT_COORDINATE, MAX_LAYOUT_COORDINATE).toFixed(2)),
          },
          dragWall.originalPoints,
        ),
      );
    }
  }

  function getOrthogonalEndPoint(
    startPoint: Pick<BlueprintPoint, 'x' | 'y'>,
    endPoint: Pick<BlueprintPoint, 'x' | 'y'>,
  ) {
    const dx = Math.abs(endPoint.x - startPoint.x);
    const dy = Math.abs(endPoint.y - startPoint.y);

    return dx >= dy
      ? {
          x: endPoint.x,
          y: startPoint.y,
        }
      : {
          x: startPoint.x,
          y: endPoint.y,
        };
  }

  function addOpeningItemToWall(
    itemType: OpeningItemType,
    wallId: string,
    offset: number,
    menuPlacement?: EditorMenuPlacement | null,
  ) {
    if (!layout) {
      return;
    }

    const beforeItems = itemType === 'door'
      ? layout.doors
      : itemType === 'window'
        ? layout.windows
        : layout.openings;
    const beforeIds = new Set(beforeItems.map((item) => item.id));
    const nextLayout = itemType === 'door'
      ? addDoorToWall(layout, wallId, offset)
      : itemType === 'window'
        ? addWindowToWall(layout, wallId, offset)
        : addOpeningToWall(layout, wallId, offset);
    const afterItems = itemType === 'door'
      ? nextLayout.doors
      : itemType === 'window'
        ? nextLayout.windows
        : nextLayout.openings;
    const createdItem = afterItems.find((item) => !beforeIds.has(item.id));

    if (!createdItem) {
      onMessage?.('Not enough clear wall space for this item.');
      return;
    }

    onLayoutChange(nextLayout);
    onSelectItem({ id: createdItem.id, type: itemType });
    setItemEditorMenu(menuPlacement ? {
      itemId: createdItem.id,
      itemType,
      ...menuPlacement,
    } : null);

    if (itemType === 'door') {
      onMessage?.('Door added to wall.');
      return;
    }

    if (itemType === 'window') {
      onMessage?.('Window added to wall.');
      return;
    }

    onMessage?.('Opening added to wall.');
  }

  function handleBlueprintSurfacePointerDown(event: PointerEvent<SVGSVGElement>) {
    setItemEditorMenu(null);
    if (!isBlueprintSurface(event.target)) {
      return;
    }

    if (!layout) {
      return;
    }

    if (activeTool === 'draw') {
      const clickedPoint = fromPointer(event);

      if (!pendingWallStart) {
        setPendingWallStart(clickedPoint);
        onMessage?.('Click another point to finish the wall.');
        return;
      }

      const endPoint = getOrthogonalEndPoint(pendingWallStart, clickedPoint);
      const length = Math.hypot(endPoint.x - pendingWallStart.x, endPoint.y - pendingWallStart.y);

      if (length < 1) {
        onMessage?.('Wall is too short.');
        return;
      }

      onLayoutChange(addWallSegment(layout, pendingWallStart, endPoint));
      setPendingWallStart(null);
      onMessage?.('Wall added.');
      return;
    }

    if (activeTool === 'floor-hole') {
      const clickedPoint = fromPointer(event);

      onFloorOpeningAdd?.({
        x: Number(clamp(clickedPoint.x, MIN_LAYOUT_COORDINATE, MAX_LAYOUT_COORDINATE).toFixed(2)),
        z: Number(clamp(clickedPoint.y, MIN_LAYOUT_COORDINATE, MAX_LAYOUT_COORDINATE).toFixed(2)),
      });
      onMessage?.('Floor hole added. Adjust its size and position in Floor Stack.');
      return;
    }

    if (activeTool === 'door' || activeTool === 'window' || activeTool === 'opening' || activeTool === 'node') {
      const clickedPoint = fromPointer(event);
      const maxDistance = Math.max(0.28, 24 / activeTransform.scale);
      const nearestWall = layout.walls
        .map((wall) => {
          const start = getPointById(layout.points, wall.startPointId);
          const end = getPointById(layout.points, wall.endPointId);

          return {
            distance: getDistanceToSegment(clickedPoint, start, end),
            wall,
          };
        })
        .sort((left, right) => left.distance - right.distance)[0];

      if (!nearestWall || nearestWall.distance > maxDistance) {
        onMessage?.(activeTool === 'node' ? 'Click closer to a wall edge to add a node.' : 'Click closer to a wall to add this item.');
        return;
      }

      if (activeTool === 'node') {
        onLayoutChange(insertNodeOnWall(layout, nearestWall.wall.id, clickedPoint));
        onMessage?.('Node added. Drag the new point to adjust the wall angle.');
        return;
      }

      const offset = getPointOffsetOnWall(nearestWall.wall, layout.points, clickedPoint);
      const menuPlacement = getEditorMenuPlacement(event);

      if (activeTool === 'door') {
        addOpeningItemToWall('door', nearestWall.wall.id, offset, menuPlacement);
        return;
      }

      if (activeTool === 'window') {
        addOpeningItemToWall('window', nearestWall.wall.id, offset, menuPlacement);
        return;
      }

      addOpeningItemToWall('opening', nearestWall.wall.id, offset, menuPlacement);
      return;
    }

    onSelectItem(null);
  }

  function handleWallPointerDown(
    event: PointerEvent<SVGLineElement>,
    wallId: string,
  ) {
    if (!layout) {
      return;
    }

    event.stopPropagation();

    const wall = layout.walls.find((candidate) => candidate.id === wallId);

    if (!wall) {
      return;
    }

    const offset = getPointOffsetOnWall(wall, layout.points, fromPointer(event));

    if (event.button === 0 && activeTool === 'door') {
      addOpeningItemToWall('door', wall.id, offset, getEditorMenuPlacement(event));
      return;
    }

    if (event.button === 0 && activeTool === 'window') {
      addOpeningItemToWall('window', wall.id, offset, getEditorMenuPlacement(event));
      return;
    }

    if (event.button === 0 && activeTool === 'opening') {
      addOpeningItemToWall('opening', wall.id, offset, getEditorMenuPlacement(event));
      return;
    }

    if (event.button === 0 && activeTool === 'node') {
      onLayoutChange(insertNodeOnWall(layout, wall.id, fromPointer(event)));
      onMessage?.('Node added. Drag the new point to adjust the wall angle.');
      return;
    }

    onSelectItem({ id: wall.id, type: 'wall' });

    if (activeTool !== 'select' || readOnly) {
      return;
    }

    if (event.button === 0) {
      const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();

      if (bounds) {
        setItemEditorMenu({
          itemId: wall.id,
          itemType: 'wall',
          x: clamp(event.clientX - bounds.left, 12, Math.max(bounds.width - 310, 12)),
          y: clamp(event.clientY - bounds.top, 12, Math.max(bounds.height - 360, 12)),
        });
      }

      return;
    }

    if (event.button !== 2) {
      return;
    }

    const snapshot = getDragSnapshot();
    event.currentTarget.setPointerCapture(event.pointerId);
    setItemEditorMenu(null);
    setDragWall({
      originalPoints: layout.points.map((point) => ({ ...point })),
      start: fromPointer(event, snapshot.transform, snapshot.viewOffset),
      transform: snapshot.transform,
      viewOffset: snapshot.viewOffset,
      wallId: wall.id,
    });
  }

  function handleWheel(event: WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    const direction = event.deltaY > 0 ? -1 : 1;
    setZoom((currentZoom) => Number(clamp(currentZoom + direction * 0.12, MIN_ZOOM, MAX_ZOOM).toFixed(2)));
  }

  function finishPointerInteraction() {
    setDragPoint(null);
    setDragWall(null);
    setDragOpening(null);
    setDragFloorOpening(null);
    setIsPanning(false);
    setPanStart(null);
  }

  const closedBoundary = layout ? getClosedRoomBoundary(layout) : [];
  const underlayBoundary = underlay?.layout ? getClosedRoomBoundary(underlay.layout) : [];
  const polygonPoints = closedBoundary.length
    ? closedBoundary
        .map((point) => {
          const svgPoint = toSvgPoint(point);
          return `${svgPoint.x},${svgPoint.y}`;
        })
        .join(' ')
    : '';
  const underlayPolygonPoints = underlayBoundary.length
    ? underlayBoundary
        .map((point) => {
          const svgPoint = toSvgPoint(point);
          return `${svgPoint.x},${svgPoint.y}`;
        })
        .join(' ')
    : '';
  const canvasClassName = [
    'blueprint-canvas',
    `is-tool-${activeTool}`,
    dragWall || dragOpening || dragFloorOpening ? 'is-moving-item' : '',
    pendingWallStart ? 'is-drawing-wall' : '',
  ].filter(Boolean).join(' ');
  const contextOpening = itemEditorMenu && itemEditorMenu.itemType !== 'wall' && itemEditorMenu.itemType !== 'floor-hole' && layout
    ? [...layout.doors, ...layout.windows, ...layout.openings]
        .find((item) => item.id === itemEditorMenu.itemId) ?? null
    : null;
  const contextWall = itemEditorMenu?.itemType === 'wall' && layout
    ? layout.walls.find((wall) => wall.id === itemEditorMenu.itemId) ?? null
    : null;
  const contextFloorOpening = itemEditorMenu?.itemType === 'floor-hole'
    ? floorOpenings.find((opening) => opening.id === itemEditorMenu.itemId) ?? null
    : null;

  function adjustOpeningDimension(dimension: 'height' | 'width', delta: number) {
    if (!layout || !itemEditorMenu || itemEditorMenu.itemType === 'wall' || itemEditorMenu.itemType === 'floor-hole' || !contextOpening) {
      return;
    }

    onLayoutChange(updateOpeningItem(
      layout,
      itemEditorMenu.itemType,
      contextOpening.id,
      { [dimension]: contextOpening[dimension] + delta },
    ));
  }

  return (
    <div className="blueprint-canvas-shell">
      <div className="blueprint-view-controls">
        <button
          type="button"
          onClick={() => setZoom((currentZoom) => Number(clamp(currentZoom - 0.2, MIN_ZOOM, MAX_ZOOM).toFixed(2)))}
        >
          -
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          onClick={() => setZoom((currentZoom) => Number(clamp(currentZoom + 0.2, MIN_ZOOM, MAX_ZOOM).toFixed(2)))}
        >
          +
        </button>
        <button
          type="button"
          onClick={() => {
            setZoom(1);
            setViewOffset({ x: 0, y: 0 });
          }}
        >
          Reset view
        </button>
      </div>
      <svg
        className={canvasClassName}
        role="img"
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        onContextMenu={(event) => event.preventDefault()}
        onPointerMove={handlePointerMove}
        onPointerDown={(event) => {
          if (activeTool !== 'select') {
            handleBlueprintSurfacePointerDown(event);
            return;
          }

          if (event.button !== 0 || dragPoint || dragWall || dragOpening || activeTool !== 'select') {
            return;
          }

          setIsPanning(true);
          setPanStart({
            pointerX: event.clientX,
            pointerY: event.clientY,
            x: viewOffset.x,
            y: viewOffset.y,
          });
        }}
        onPointerUp={finishPointerInteraction}
        onPointerLeave={finishPointerInteraction}
        onWheel={handleWheel}
      >
        <defs>
          <pattern id="smallGrid" height="16" patternUnits="userSpaceOnUse" width="16">
            <path d="M 16 0 L 0 0 0 16" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
          </pattern>
          <pattern id="majorGrid" height="80" patternUnits="userSpaceOnUse" width="80">
            <rect fill="url(#smallGrid)" height="80" width="80" />
            <path d="M 80 0 L 0 0 0 80" fill="none" stroke="rgba(255,255,255,0.26)" strokeWidth="1.5" />
          </pattern>
        </defs>
        <rect className="blueprint-click-surface" fill="#0f3d63" height="100%" width="100%" />
        <rect className="blueprint-click-surface" fill="url(#majorGrid)" height="100%" width="100%" />

        {!layout && (
          <text className="blueprint-empty-text" textAnchor="middle" x={VIEWBOX_WIDTH / 2} y={VIEWBOX_HEIGHT / 2}>
            Use Add Box to create a 4 m x 4 m room.
          </text>
        )}

        {layout && (
          <>
            {underlay?.layout && underlayBoundary.length >= 3 && (
              <g className="blueprint-underlay-layer">
                <polygon className="blueprint-underlay-fill" points={underlayPolygonPoints} />
                {underlay.layout.walls.map((wall) => {
                  const start = toSvgPoint(getPointById(underlay.layout?.points ?? [], wall.startPointId));
                  const end = toSvgPoint(getPointById(underlay.layout?.points ?? [], wall.endPointId));

                  return (
                    <line
                      className="blueprint-underlay-wall"
                      key={wall.id}
                      strokeWidth={Math.max(wall.thickness * activeTransform.scale, 6)}
                      x1={start.x}
                      x2={end.x}
                      y1={start.y}
                      y2={end.y}
                    />
                  );
                })}
                <text className="blueprint-underlay-layer-label" x={VIEWBOX_WIDTH - 150} y="42">
                  {underlay.label}
                </text>
              </g>
            )}
            {closedBoundary.length >= 3 && (
              <polygon className="blueprint-room-fill blueprint-click-surface" fill={floorFillColor} points={polygonPoints} />
            )}
            {floorOpenings.map((opening) => {
              const center = toSvgPoint({ x: opening.position.x, y: opening.position.z });
              const openingWidth = opening.width * activeTransform.scale;
              const openingDepth = opening.depth * activeTransform.scale;
              const isSelected = selectedItem?.type === 'floor-hole' && selectedItem.id === opening.id;

              return (
                <g
                  className={isSelected ? 'blueprint-floor-opening is-selected' : 'blueprint-floor-opening'}
                  key={opening.id}
                  onPointerDown={(event) => {
                    const menuPlacement = getEditorMenuPlacement(event);
                    const snapshot = getDragSnapshot();

                    event.stopPropagation();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    onSelectItem({ id: opening.id, type: 'floor-hole' });
                    setItemEditorMenu(menuPlacement ? {
                      itemId: opening.id,
                      itemType: 'floor-hole',
                      ...menuPlacement,
                    } : null);
                    setDragFloorOpening({
                      openingId: opening.id,
                      transform: snapshot.transform,
                      viewOffset: snapshot.viewOffset,
                    });
                  }}
                >
                  <rect
                    height={openingDepth}
                    rx={2}
                    width={openingWidth}
                    x={center.x - openingWidth / 2}
                    y={center.y - openingDepth / 2}
                  />
                  <text x={center.x} y={center.y}>{opening.label}</text>
                </g>
              );
            })}
            {layout.walls.map((wall) => {
              const start = toSvgPoint(getPointById(layout.points, wall.startPointId));
              const end = toSvgPoint(getPointById(layout.points, wall.endPointId));
              const midX = (start.x + end.x) / 2;
              const midY = (start.y + end.y) / 2;
              const isSelected = selectedItem?.type === 'wall' && wall.id === selectedItem.id;

              return (
                <g key={wall.id}>
                  <line
                    className={isSelected ? 'blueprint-wall is-selected' : 'blueprint-wall'}
                    stroke={isSelected ? '#35d6ff' : wallFillColor}
                    strokeWidth={Math.max(wall.thickness * activeTransform.scale, 8)}
                    x1={start.x}
                    x2={end.x}
                    y1={start.y}
                    y2={end.y}
                    onContextMenu={(event) => event.preventDefault()}
                    onPointerDown={(event) => handleWallPointerDown(event, wall.id)}
                  />
                  {!hideLabels && (
                    <text className="blueprint-wall-label" textAnchor="middle" x={midX} y={midY - 12}>
                      {formatMeters(getWallLength(wall, layout.points))}
                    </text>
                  )}
                </g>
              );
            })}

            {[...layout.doors, ...layout.windows, ...layout.openings].map((openingItem) => {
              const wall = layout.walls.find((candidate) => candidate.id === openingItem.wallId);

              if (!wall) {
                return null;
              }

              const center = getPointAtWallOffset(wall, layout.points, openingItem.offset);
              const direction = getWallDirection(wall, layout.points);
              const normal = getWallNormal(wall, layout.points);
              const halfWidth = openingItem.width / 2;
              const start = toSvgPoint({
                x: center.x - direction.x * halfWidth,
                y: center.y - direction.y * halfWidth,
              });
              const end = toSvgPoint({
                x: center.x + direction.x * halfWidth,
                y: center.y + direction.y * halfWidth,
              });
              const symbolCenter = toSvgPoint({
                x: center.x + normal.x * wall.thickness * 1.8,
                y: center.y + normal.y * wall.thickness * 1.8,
              });
              const doorSwingSide = openingItem.type === 'DOOR' && openingItem.swingDirection === 'IN_RIGHT' ? -1 : 1;
              const doorLeafEnd = openingItem.type === 'DOOR'
                ? toSvgPoint({
                    x: center.x - direction.x * halfWidth + normal.x * openingItem.width * doorSwingSide,
                    y: center.y - direction.y * halfWidth + normal.y * openingItem.width * doorSwingSide,
                  })
                : null;
              const doorArcControl = openingItem.type === 'DOOR'
                ? toSvgPoint({
                    x: center.x + direction.x * halfWidth + normal.x * openingItem.width * doorSwingSide,
                    y: center.y + direction.y * halfWidth + normal.y * openingItem.width * doorSwingSide,
                  })
                : null;
              const itemType = openingItem.type.toLowerCase() as 'door' | 'window' | 'opening';
              const isSelected = selectedItem?.type === itemType && selectedItem.id === openingItem.id;

              return (
                <g
                  className={isSelected ? 'blueprint-opening is-selected' : 'blueprint-opening'}
                  key={openingItem.id}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    onSelectItem({ id: openingItem.id, type: itemType });

                    if (activeTool !== 'select' || readOnly) {
                      return;
                    }

                    if (event.button === 0) {
                      const snapshot = getDragSnapshot();
                      const menuPlacement = getEditorMenuPlacement(event);
                      event.currentTarget.setPointerCapture(event.pointerId);
                      setItemEditorMenu(menuPlacement ? {
                        itemId: openingItem.id,
                        itemType,
                        ...menuPlacement,
                      } : null);
                      setDragOpening({
                        itemId: openingItem.id,
                        itemType,
                        transform: snapshot.transform,
                        viewOffset: snapshot.viewOffset,
                        wallId: openingItem.wallId,
                      });
                      return;
                    }

                    if (event.button !== 2) {
                      return;
                    }

                    const snapshot = getDragSnapshot();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setItemEditorMenu(null);
                    setDragOpening({
                      itemId: openingItem.id,
                      itemType,
                      transform: snapshot.transform,
                      viewOffset: snapshot.viewOffset,
                      wallId: openingItem.wallId,
                    });
                  }}
                >
                  <line
                    className={`blueprint-opening-line is-${itemType}`}
                    x1={start.x}
                    x2={end.x}
                    y1={start.y}
                    y2={end.y}
                  />
                  {openingItem.type === 'DOOR' && (
                    <>
                      <line
                        className="blueprint-door-leaf"
                        x1={start.x}
                        x2={doorLeafEnd?.x ?? start.x}
                        y1={start.y}
                        y2={doorLeafEnd?.y ?? start.y}
                      />
                      <path
                        className="blueprint-door-arc"
                        d={`M ${end.x} ${end.y} Q ${doorArcControl?.x ?? symbolCenter.x} ${doorArcControl?.y ?? symbolCenter.y} ${doorLeafEnd?.x ?? start.x} ${doorLeafEnd?.y ?? start.y}`}
                      />
                    </>
                  )}
                  {openingItem.type === 'WINDOW' && (
                    <rect
                      className="blueprint-window-symbol"
                      height="8"
                      width="18"
                      x={symbolCenter.x - 9}
                      y={symbolCenter.y - 4}
                    />
                  )}
                  {openingItem.type === 'OPENING' && (
                    <circle className="blueprint-opening-symbol" cx={symbolCenter.x} cy={symbolCenter.y} r="5" />
                  )}
                  {!hideLabels && (
                    <text className="blueprint-opening-label" textAnchor="middle" x={symbolCenter.x} y={symbolCenter.y - 12}>
                      {formatMeters(openingItem.width)}
                    </text>
                  )}
                </g>
              );
            })}

            {layout.points.map((point) => {
              const svgPoint = toSvgPoint(point);

              return (
                <circle
                  className="blueprint-node"
                  cx={svgPoint.x}
                  cy={svgPoint.y}
                  key={point.id}
                  r="9"
                  onPointerDown={(event) => {
                    if (activeTool !== 'select' || readOnly) {
                      return;
                    }

                    const snapshot = getDragSnapshot();

                    event.stopPropagation();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    onSelectItem(null);
                    setDragPoint({
                      pointId: point.id,
                      transform: snapshot.transform,
                      viewOffset: snapshot.viewOffset,
                    });
                  }}
                />
              );
            })}
          </>
        )}
      </svg>
      {itemEditorMenu?.itemType === 'wall' && contextWall && layout && (
        <div
          className="blueprint-opening-menu"
          role="dialog"
          aria-label="Edit wall"
          style={{ left: itemEditorMenu.x, top: itemEditorMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="blueprint-opening-menu-header">
            <strong>Edit Wall</strong>
            <button aria-label="Close editor" type="button" onClick={() => setItemEditorMenu(null)}>x</button>
          </div>
          <div className="blueprint-opening-stepper">
            <div>
              <button
                aria-label="Decrease wall length"
                type="button"
                onClick={() => onLayoutChange(resizeWallLength(
                  layout,
                  contextWall.id,
                  Math.max(0.2, getWallLength(contextWall, layout.points) - 0.25),
                ))}
              >
                &lsaquo;
              </button>
              <MetricStepperInput
                ariaLabel="Wall length"
                min={0.2}
                step={0.05}
                value={getWallLength(contextWall, layout.points)}
                onChange={(value) => onLayoutChange(resizeWallLength(layout, contextWall.id, value))}
              />
              <button
                aria-label="Increase wall length"
                type="button"
                onClick={() => onLayoutChange(resizeWallLength(
                  layout,
                  contextWall.id,
                  getWallLength(contextWall, layout.points) + 0.25,
                ))}
              >
                &rsaquo;
              </button>
            </div>
            <label>Length</label>
          </div>
          <div className="blueprint-opening-stepper">
            <div>
              <button
                aria-label="Decrease wall height"
                type="button"
                onClick={() => onLayoutChange(updateWall(layout, contextWall.id, {
                  height: Math.max(0, contextWall.height - 0.25),
                }))}
              >
                &lsaquo;
              </button>
              <MetricStepperInput
                ariaLabel="Wall height"
                min={0}
                value={contextWall.height}
                onChange={(value) => onLayoutChange(updateWall(layout, contextWall.id, { height: value }))}
              />
              <button
                aria-label="Increase wall height"
                type="button"
                onClick={() => onLayoutChange(updateWall(layout, contextWall.id, {
                  height: contextWall.height + 0.25,
                }))}
              >
                &rsaquo;
              </button>
            </div>
            <label>Height</label>
          </div>
          <div className="blueprint-opening-stepper">
            <div>
              <button
                aria-label="Decrease wall thickness"
                type="button"
                onClick={() => onLayoutChange(updateWall(layout, contextWall.id, {
                  thickness: Math.max(0.1, contextWall.thickness - 0.05),
                }))}
              >
                &lsaquo;
              </button>
              <MetricStepperInput
                ariaLabel="Wall thickness"
                min={0.1}
                step={0.05}
                value={contextWall.thickness}
                onChange={(value) => onLayoutChange(updateWall(layout, contextWall.id, { thickness: value }))}
              />
              <button
                aria-label="Increase wall thickness"
                type="button"
                onClick={() => onLayoutChange(updateWall(layout, contextWall.id, {
                  thickness: contextWall.thickness + 0.05,
                }))}
              >
                &rsaquo;
              </button>
            </div>
            <label>Thickness</label>
          </div>
          <button
            className="blueprint-opening-menu-action is-danger"
            type="button"
            onClick={() => {
              onLayoutChange(deleteWall(layout, contextWall.id));
              onSelectItem(null);
              setItemEditorMenu(null);
            }}
          >
            Delete Wall
          </button>
        </div>
      )}
      {itemEditorMenu?.itemType === 'floor-hole' && contextFloorOpening && (
        <div
          className="blueprint-opening-menu"
          role="dialog"
          aria-label="Edit floor hole"
          style={{ left: itemEditorMenu.x, top: itemEditorMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="blueprint-opening-menu-header">
            <strong>Edit Floor Hole</strong>
            <button aria-label="Close editor" type="button" onClick={() => setItemEditorMenu(null)}>x</button>
          </div>
          {(['width', 'depth'] as const).map((dimension) => (
            <div className="blueprint-opening-stepper" key={dimension}>
              <div>
                <button
                  aria-label={`Decrease ${dimension}`}
                  type="button"
                  onClick={() => onFloorOpeningUpdate?.(contextFloorOpening.id, {
                    [dimension]: Math.max(0.5, contextFloorOpening[dimension] - 0.25),
                  })}
                >
                  &lsaquo;
                </button>
                <MetricStepperInput
                  ariaLabel={`Floor hole ${dimension}`}
                  min={0.5}
                  value={contextFloorOpening[dimension]}
                  onChange={(value) => onFloorOpeningUpdate?.(contextFloorOpening.id, { [dimension]: value })}
                />
                <button
                  aria-label={`Increase ${dimension}`}
                  type="button"
                  onClick={() => onFloorOpeningUpdate?.(contextFloorOpening.id, {
                    [dimension]: contextFloorOpening[dimension] + 0.25,
                  })}
                >
                  &rsaquo;
                </button>
              </div>
              <label>{dimension.charAt(0).toUpperCase() + dimension.slice(1)}</label>
            </div>
          ))}
          <button
            className="blueprint-opening-menu-action is-danger"
            type="button"
            onClick={() => {
              onFloorOpeningDelete?.(contextFloorOpening.id);
              onSelectItem(null);
              setItemEditorMenu(null);
            }}
          >
            Delete
          </button>
        </div>
      )}
      {itemEditorMenu && itemEditorMenu.itemType !== 'wall' && contextOpening && layout && (
        <div
          className="blueprint-opening-menu"
          role="dialog"
          aria-label={`Edit ${itemEditorMenu.itemType}`}
          style={{ left: itemEditorMenu.x, top: itemEditorMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="blueprint-opening-menu-header">
            <strong>{`Edit ${contextOpening.type.charAt(0)}${contextOpening.type.slice(1).toLowerCase()}`}</strong>
            <button aria-label="Close editor" type="button" onClick={() => setItemEditorMenu(null)}>x</button>
          </div>
          {(['height', 'width'] as const).map((dimension) => (
            <div className="blueprint-opening-stepper" key={dimension}>
              <div>
                <button
                  aria-label={`Decrease ${dimension}`}
                  type="button"
                  onClick={() => adjustOpeningDimension(dimension, -0.25)}
                >
                  &lsaquo;
                </button>
                <MetricStepperInput
                  ariaLabel={`${dimension} value`}
                  min={0.5}
                  value={contextOpening[dimension]}
                  onChange={(value) => onLayoutChange(updateOpeningItem(
                    layout,
                    contextOpening.type.toLowerCase() as 'door' | 'window' | 'opening',
                    contextOpening.id,
                    { [dimension]: value },
                  ))}
                />
                <button
                  aria-label={`Increase ${dimension}`}
                  type="button"
                  onClick={() => adjustOpeningDimension(dimension, 0.25)}
                >
                  &rsaquo;
                </button>
              </div>
              <label>{dimension.charAt(0).toUpperCase() + dimension.slice(1)}</label>
            </div>
          ))}
          {contextOpening.type === 'WINDOW' && (
            <div className="blueprint-opening-stepper">
              <div>
                <button
                  aria-label="Decrease floor offset"
                  type="button"
                  onClick={() => onLayoutChange(updateWindowSillHeight(
                    layout,
                    contextOpening.id,
                    contextOpening.sillHeight - 0.25,
                  ))}
                >
                  &lsaquo;
                </button>
                <MetricStepperInput
                  ariaLabel="Window floor offset"
                  min={0}
                  value={contextOpening.sillHeight}
                  onChange={(value) => onLayoutChange(updateWindowSillHeight(
                    layout,
                    contextOpening.id,
                    value,
                  ))}
                />
                <button
                  aria-label="Increase floor offset"
                  type="button"
                  onClick={() => onLayoutChange(updateWindowSillHeight(
                    layout,
                    contextOpening.id,
                    contextOpening.sillHeight + 0.25,
                  ))}
                >
                  &rsaquo;
                </button>
              </div>
              <label>Floor Offset</label>
            </div>
          )}
          {contextOpening.type === 'DOOR' && (
            <button
              className="blueprint-opening-menu-action"
              type="button"
              onClick={() => onLayoutChange(updateDoorSwingDirection(
                layout,
                contextOpening.id,
                contextOpening.swingDirection === 'IN_LEFT' ? 'IN_RIGHT' : 'IN_LEFT',
              ))}
            >
              Flip In/Out
            </button>
          )}
          <button
            className="blueprint-opening-menu-action is-danger"
            type="button"
            onClick={() => {
              onLayoutChange(deleteOpeningItem(
                layout,
                contextOpening.type.toLowerCase() as 'door' | 'window' | 'opening',
                contextOpening.id,
              ));
              onSelectItem(null);
              setItemEditorMenu(null);
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
