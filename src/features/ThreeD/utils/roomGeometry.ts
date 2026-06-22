import type {
  BlueprintPoint,
  BlueprintWall,
  DoorOpening,
  DoorSwingDirection,
  RoomLayoutState,
  RoomOpeningItem,
  WallOpening,
  WindowOpening,
} from '@/features/ThreeD/types/roomLayout.types';

export function createDefaultRoomLayout(): RoomLayoutState {
  const points: BlueprintPoint[] = [
    { id: 'p1', x: 0, y: 0 },
    { id: 'p2', x: 12, y: 0 },
    { id: 'p3', x: 12, y: 12 },
    { id: 'p4', x: 0, y: 12 },
  ];

  return {
    doors: [],
    floorMaterialId: 'wood-floor',
    openings: [],
    points,
    unit: 'ft',
    wallHeight: 9,
    wallThickness: 0.3,
    wallMaterialId: 'wall-base',
    windows: [],
    walls: createWalls(points, 9, 0.3),
  };
}

export function createWalls(
  points: BlueprintPoint[],
  height: number,
  thickness: number,
): BlueprintWall[] {
  return [
    { endPointId: points[1].id, height, id: 'w1', startPointId: points[0].id, thickness, type: 'WALL' },
    { endPointId: points[2].id, height, id: 'w2', startPointId: points[1].id, thickness, type: 'WALL' },
    { endPointId: points[3].id, height, id: 'w3', startPointId: points[2].id, thickness, type: 'WALL' },
    { endPointId: points[0].id, height, id: 'w4', startPointId: points[3].id, thickness, type: 'WALL' },
  ];
}

function getNextNumericId<T extends { id: string }>(items: T[], prefix: string) {
  const nextNumber = items.reduce((largestNumber, item) => {
    const numericPart = Number(item.id.replace(prefix, ''));

    return Number.isFinite(numericPart) ? Math.max(largestNumber, numericPart) : largestNumber;
  }, 0) + 1;

  return `${prefix}${nextNumber}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getDefaultWallOpeningHeight(wallHeight: number) {
  return Number(Math.max(wallHeight / 2, 0).toFixed(2));
}

function getDefaultWallOpeningWidth(wallLength: number, openingHeight: number) {
  const preferredWidth = openingHeight * 0.45;
  const maxByWall = Math.max(wallLength * 0.45, 0.5);

  return Number(clamp(preferredWidth, 1, Math.min(4, maxByWall)).toFixed(2));
}

function getOpeningOffset(wallLength: number, width: number, offset: number) {
  return Number(clamp(offset, width / 2, Math.max(wallLength - width / 2, width / 2)).toFixed(2));
}

const MIN_OPENING_SIZE = 0.5;
const MIN_OPENING_GAP = 0.05;
const MIN_WALL_ABOVE_OPENING = 0.25;

type OpeningItemType = 'door' | 'window' | 'opening';

function getOpeningItems(layout: RoomLayoutState) {
  return [...layout.doors, ...layout.windows, ...layout.openings];
}

function intervalsOverlap(
  left: { end: number; start: number },
  right: { end: number; start: number },
) {
  return left.start < right.end + MIN_OPENING_GAP && left.end > right.start - MIN_OPENING_GAP;
}

function findValidOpeningOffset(
  layout: RoomLayoutState,
  wallId: string,
  width: number,
  desiredOffset: number,
  excludedItemId?: string,
) {
  const wall = layout.walls.find((candidate) => candidate.id === wallId);

  if (!wall) {
    return null;
  }

  const wallLength = getWallLength(wall, layout.points);
  const safeWidth = clamp(width, MIN_OPENING_SIZE, wallLength);
  const halfWidth = safeWidth / 2;
  const minOffset = halfWidth;
  const maxOffset = Math.max(wallLength - halfWidth, halfWidth);
  const otherIntervals = getOpeningItems(layout)
    .filter((item) => item.wallId === wallId && item.id !== excludedItemId)
    .map((item) => ({
      end: item.offset + item.width / 2,
      start: item.offset - item.width / 2,
    }));
  const candidates = [
    clamp(desiredOffset, minOffset, maxOffset),
    minOffset,
    maxOffset,
    ...otherIntervals.flatMap((interval) => [
      interval.start - MIN_OPENING_GAP - halfWidth,
      interval.end + MIN_OPENING_GAP + halfWidth,
    ]),
  ]
    .map((candidate) => clamp(candidate, minOffset, maxOffset))
    .sort((left, right) => Math.abs(left - desiredOffset) - Math.abs(right - desiredOffset));

  const validOffset = candidates.find((candidate) => {
    const candidateInterval = {
      end: candidate + halfWidth,
      start: candidate - halfWidth,
    };

    return otherIntervals.every((interval) => !intervalsOverlap(candidateInterval, interval));
  });

  return validOffset === undefined ? null : Number(validOffset.toFixed(2));
}

export function normalizeDoorAndOpeningDimensions(
  layout: RoomLayoutState,
  wallIds = new Set(layout.walls.map((wall) => wall.id)),
) {
  return {
    ...layout,
    doors: layout.doors.map((door) => {
      const wall = layout.walls.find((candidate) => candidate.id === door.wallId);

      if (!wall || !wallIds.has(wall.id)) {
        return door;
      }

      const wallLength = getWallLength(wall, layout.points);
      const width = Number(clamp(door.width, MIN_OPENING_SIZE, wallLength).toFixed(2));

      return {
        ...door,
        height: Number(clamp(door.height, MIN_OPENING_SIZE, Math.max(wall.height - MIN_WALL_ABOVE_OPENING, MIN_OPENING_SIZE)).toFixed(2)),
        offset: getOpeningOffset(wallLength, width, door.offset),
        width,
      };
    }),
    openings: layout.openings.map((opening) => {
      const wall = layout.walls.find((candidate) => candidate.id === opening.wallId);

      if (!wall || !wallIds.has(wall.id)) {
        return opening;
      }

      const wallLength = getWallLength(wall, layout.points);
      const width = Number(clamp(opening.width, MIN_OPENING_SIZE, wallLength).toFixed(2));

      return {
        ...opening,
        height: Number(clamp(opening.height, MIN_OPENING_SIZE, Math.max(wall.height - MIN_WALL_ABOVE_OPENING, MIN_OPENING_SIZE)).toFixed(2)),
        offset: getOpeningOffset(wallLength, width, opening.offset),
        width,
      };
    }),
    windows: layout.windows.map((windowOpening) => {
      const wall = layout.walls.find((candidate) => candidate.id === windowOpening.wallId);

      if (!wall || !wallIds.has(wall.id)) {
        return windowOpening;
      }

      const wallLength = getWallLength(wall, layout.points);
      const width = Number(clamp(windowOpening.width, MIN_OPENING_SIZE, wallLength).toFixed(2));
      const maxHeight = Math.max(wall.height - windowOpening.sillHeight - MIN_WALL_ABOVE_OPENING, MIN_OPENING_SIZE);

      return {
        ...windowOpening,
        height: Number(clamp(windowOpening.height, MIN_OPENING_SIZE, maxHeight).toFixed(2)),
        offset: getOpeningOffset(wallLength, width, windowOpening.offset),
        width,
      };
    }),
  };
}

export function addWallSegment(
  layout: RoomLayoutState,
  startPoint: Pick<BlueprintPoint, 'x' | 'y'>,
  endPoint: Pick<BlueprintPoint, 'x' | 'y'>,
) {
  const pointIdA = getNextNumericId(layout.points, 'p');
  const pointIdB = `p${Number(pointIdA.replace('p', '')) + 1}`;
  const wallId = getNextNumericId(layout.walls, 'w');
  const nextPoints = [
    ...layout.points,
    { id: pointIdA, x: Number(startPoint.x.toFixed(2)), y: Number(startPoint.y.toFixed(2)) },
    { id: pointIdB, x: Number(endPoint.x.toFixed(2)), y: Number(endPoint.y.toFixed(2)) },
  ];

  return {
    ...layout,
    points: nextPoints,
    walls: [
      ...layout.walls,
      {
        endPointId: pointIdB,
        height: layout.wallHeight,
        id: wallId,
        startPointId: pointIdA,
        thickness: layout.wallThickness,
        type: 'WALL' as const,
      },
    ],
  };
}

export function getPointById(points: BlueprintPoint[], pointId: string) {
  const point = points.find((candidate) => candidate.id === pointId);

  if (!point) {
    throw new Error(`Missing room point ${pointId}.`);
  }

  return point;
}

export function getWallLength(wall: BlueprintWall, points: BlueprintPoint[]) {
  const start = getPointById(points, wall.startPointId);
  const end = getPointById(points, wall.endPointId);

  return Math.hypot(end.x - start.x, end.y - start.y);
}

export function getPointOffsetOnWall(
  wall: BlueprintWall,
  points: BlueprintPoint[],
  point: Pick<BlueprintPoint, 'x' | 'y'>,
) {
  const start = getPointById(points, wall.startPointId);
  const end = getPointById(points, wall.endPointId);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);

  if (!length) {
    return 0;
  }

  const offset = ((point.x - start.x) * dx + (point.y - start.y) * dy) / length;

  return Number(clamp(offset, 0, length).toFixed(2));
}

export function getPointAtWallOffset(
  wall: BlueprintWall,
  points: BlueprintPoint[],
  offset: number,
) {
  const start = getPointById(points, wall.startPointId);
  const end = getPointById(points, wall.endPointId);
  const length = getWallLength(wall, points);
  const ratio = length ? clamp(offset / length, 0, 1) : 0;

  return {
    x: start.x + (end.x - start.x) * ratio,
    y: start.y + (end.y - start.y) * ratio,
  };
}

export function getWallDirection(wall: BlueprintWall, points: BlueprintPoint[]) {
  const start = getPointById(points, wall.startPointId);
  const end = getPointById(points, wall.endPointId);
  const length = getWallLength(wall, points);

  if (!length) {
    return {
      x: 1,
      y: 0,
    };
  }

  return {
    x: (end.x - start.x) / length,
    y: (end.y - start.y) / length,
  };
}

export function getWallNormal(wall: BlueprintWall, points: BlueprintPoint[]) {
  const direction = getWallDirection(wall, points);

  return {
    x: -direction.y,
    y: direction.x,
  };
}

export function addDoorToWall(layout: RoomLayoutState, wallId: string, offset: number) {
  const wall = layout.walls.find((candidate) => candidate.id === wallId);

  if (!wall) {
    return layout;
  }

  const wallLength = getWallLength(wall, layout.points);
  const height = getDefaultWallOpeningHeight(wall.height);
  const width = getDefaultWallOpeningWidth(wallLength, height);
  const validOffset = findValidOpeningOffset(layout, wallId, width, offset);

  if (validOffset === null) {
    return layout;
  }

  const door: DoorOpening = {
    height,
    id: getNextNumericId(layout.doors, 'door-'),
    offset: validOffset,
    swingDirection: 'IN_LEFT',
    type: 'DOOR',
    wallId,
    width,
  };

  return {
    ...layout,
    doors: [...layout.doors, door],
  };
}

export function addWindowToWall(layout: RoomLayoutState, wallId: string, offset: number) {
  const wall = layout.walls.find((candidate) => candidate.id === wallId);

  if (!wall) {
    return layout;
  }

  const wallLength = getWallLength(wall, layout.points);
  const width = Math.min(4, Math.max(wallLength * 0.5, 1));
  const validOffset = findValidOpeningOffset(layout, wallId, width, offset);

  if (validOffset === null) {
    return layout;
  }

  const windowOpening: WindowOpening = {
    height: 4,
    id: getNextNumericId(layout.windows, 'window-'),
    offset: validOffset,
    sillHeight: 3,
    type: 'WINDOW',
    wallId,
    width,
  };

  return {
    ...layout,
    windows: [...layout.windows, windowOpening],
  };
}

export function addOpeningToWall(layout: RoomLayoutState, wallId: string, offset: number) {
  const wall = layout.walls.find((candidate) => candidate.id === wallId);

  if (!wall) {
    return layout;
  }

  const wallLength = getWallLength(wall, layout.points);
  const height = getDefaultWallOpeningHeight(wall.height);
  const width = getDefaultWallOpeningWidth(wallLength, height);
  const validOffset = findValidOpeningOffset(layout, wallId, width, offset);

  if (validOffset === null) {
    return layout;
  }

  const opening: WallOpening = {
    height,
    id: getNextNumericId(layout.openings, 'opening-'),
    offset: validOffset,
    type: 'OPENING',
    wallId,
    width,
  };

  return {
    ...layout,
    openings: [...layout.openings, opening],
  };
}

export function formatFeetInches(value: number) {
  const feet = Math.floor(value);
  const inches = Math.round((value - feet) * 12);
  const normalizedFeet = inches === 12 ? feet + 1 : feet;
  const normalizedInches = inches === 12 ? 0 : inches;

  return `${normalizedFeet}' ${String(normalizedInches).padStart(2, '0')}"`;
}

export function getRoomBounds(points: BlueprintPoint[]) {
  if (!points.length) {
    return {
      maxX: 0,
      maxY: 0,
      minX: 0,
      minY: 0,
    };
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  return {
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
    minX: Math.min(...xs),
    minY: Math.min(...ys),
  };
}

export function getRoomSize(points: BlueprintPoint[]) {
  const bounds = getRoomBounds(points);

  return {
    depth: bounds.maxY - bounds.minY,
    width: bounds.maxX - bounds.minX,
  };
}

export function getClosedRoomBoundary(layout: RoomLayoutState) {
  const adjacency = new Map<string, string[]>();

  layout.walls.forEach((wall) => {
    adjacency.set(wall.startPointId, [...(adjacency.get(wall.startPointId) ?? []), wall.endPointId]);
    adjacency.set(wall.endPointId, [...(adjacency.get(wall.endPointId) ?? []), wall.startPointId]);
  });

  const visited = new Set<string>();
  const boundaries: BlueprintPoint[][] = [];

  adjacency.forEach((_neighbors, startPointId) => {
    if (visited.has(startPointId)) {
      return;
    }

    const componentIds: string[] = [];
    const pending = [startPointId];

    while (pending.length) {
      const pointId = pending.pop();

      if (!pointId || visited.has(pointId)) {
        continue;
      }

      visited.add(pointId);
      componentIds.push(pointId);
      (adjacency.get(pointId) ?? []).forEach((neighborId) => pending.push(neighborId));
    }

    if (componentIds.length < 3 || componentIds.some((pointId) => adjacency.get(pointId)?.length !== 2)) {
      return;
    }

    const orderedIds = [componentIds[0]];
    let previousId: string | null = null;
    let currentId = componentIds[0];

    while (orderedIds.length <= componentIds.length) {
      const nextId = (adjacency.get(currentId) ?? []).find((candidate) => candidate !== previousId);

      if (!nextId || nextId === orderedIds[0]) {
        break;
      }

      orderedIds.push(nextId);
      previousId = currentId;
      currentId = nextId;
    }

    if (orderedIds.length === componentIds.length) {
      boundaries.push(orderedIds.map((pointId) => getPointById(layout.points, pointId)));
    }
  });

  return boundaries.sort((left, right) => getPolygonArea(right) - getPolygonArea(left))[0] ?? [];
}

function getPolygonArea(points: BlueprintPoint[]) {
  if (points.length < 3) {
    return 0;
  }

  const doubledArea = points.reduce((total, point, index) => {
    const nextPoint = points[(index + 1) % points.length];
    return total + point.x * nextPoint.y - nextPoint.x * point.y;
  }, 0);

  return Math.abs(doubledArea) / 2;
}

export function getRoomArea(layout: RoomLayoutState) {
  return Number(getPolygonArea(getClosedRoomBoundary(layout)).toFixed(2));
}

export function isRoomBoundaryClosed(layout: RoomLayoutState) {
  return getClosedRoomBoundary(layout).length >= 3;
}

export function movePoint(
  layout: RoomLayoutState,
  pointId: string,
  nextPoint: Pick<BlueprintPoint, 'x' | 'y'>,
) {
  return {
    ...layout,
    points: layout.points.map((point) =>
      point.id === pointId
        ? {
            ...point,
            x: nextPoint.x,
            y: nextPoint.y,
          }
        : point,
    ),
  };
}

export function deleteOpeningItem(
  layout: RoomLayoutState,
  itemType: 'door' | 'window' | 'opening',
  itemId: string,
) {
  if (itemType === 'door') {
    return {
      ...layout,
      doors: layout.doors.filter((door) => door.id !== itemId),
    };
  }

  if (itemType === 'window') {
    return {
      ...layout,
      windows: layout.windows.filter((windowOpening) => windowOpening.id !== itemId),
    };
  }

  return {
    ...layout,
    openings: layout.openings.filter((opening) => opening.id !== itemId),
  };
}

export function deleteWall(layout: RoomLayoutState, wallId: string) {
  const walls = layout.walls.filter((wall) => wall.id !== wallId);
  const usedPointIds = new Set(walls.flatMap((wall) => [wall.startPointId, wall.endPointId]));

  return {
    ...layout,
    doors: layout.doors.filter((door) => door.wallId !== wallId),
    openings: layout.openings.filter((opening) => opening.wallId !== wallId),
    points: layout.points.filter((point) => usedPointIds.has(point.id)),
    walls,
    windows: layout.windows.filter((windowOpening) => windowOpening.wallId !== wallId),
  };
}

export function updateOpeningItem(
  layout: RoomLayoutState,
  itemType: OpeningItemType,
  itemId: string,
  changes: Partial<Pick<RoomOpeningItem, 'height' | 'offset' | 'width'>>,
) {
  const collection = itemType === 'door'
    ? layout.doors
    : itemType === 'window'
      ? layout.windows
      : layout.openings;
  const item = collection.find((candidate) => candidate.id === itemId);

  if (!item) {
    return layout;
  }

  const wall = layout.walls.find((candidate) => candidate.id === item.wallId);

  if (!wall) {
    return layout;
  }

  const wallLength = getWallLength(wall, layout.points);
  const width = Number(clamp(changes.width ?? item.width, MIN_OPENING_SIZE, wallLength).toFixed(2));
  const validOffset = findValidOpeningOffset(
    layout,
    wall.id,
    width,
    changes.offset ?? item.offset,
    item.id,
  );

  if (validOffset === null) {
    return layout;
  }

  const maxHeight = item.type === 'WINDOW'
    ? Math.max(wall.height - item.sillHeight - MIN_WALL_ABOVE_OPENING, MIN_OPENING_SIZE)
    : Math.max(wall.height - MIN_WALL_ABOVE_OPENING, MIN_OPENING_SIZE);
  const height = Number(clamp(changes.height ?? item.height, MIN_OPENING_SIZE, maxHeight).toFixed(2));
  const updateItem = <T extends RoomOpeningItem>(candidate: T): T => (
    candidate.id === item.id
      ? {
          ...candidate,
          height,
          offset: validOffset,
          width,
        }
      : candidate
  );

  return {
    ...layout,
    doors: layout.doors.map(updateItem),
    openings: layout.openings.map(updateItem),
    windows: layout.windows.map(updateItem),
  };
}

export function updateDoorSwingDirection(
  layout: RoomLayoutState,
  doorId: string,
  swingDirection: DoorSwingDirection,
) {
  return {
    ...layout,
    doors: layout.doors.map((door) =>
      door.id === doorId
        ? {
            ...door,
            swingDirection,
          }
        : door,
    ),
  };
}

export function updateWindowSillHeight(
  layout: RoomLayoutState,
  windowId: string,
  sillHeight: number,
) {
  const windowOpening = layout.windows.find((candidate) => candidate.id === windowId);

  if (!windowOpening) {
    return layout;
  }

  const wall = layout.walls.find((candidate) => candidate.id === windowOpening.wallId);

  if (!wall) {
    return layout;
  }

  const maxSillHeight = Math.max(
    wall.height - windowOpening.height - MIN_WALL_ABOVE_OPENING,
    0,
  );
  const nextSillHeight = Number(clamp(sillHeight, 0, maxSillHeight).toFixed(2));

  return {
    ...layout,
    windows: layout.windows.map((candidate) =>
      candidate.id === windowId
        ? { ...candidate, sillHeight: nextSillHeight }
        : candidate,
    ),
  };
}

export function moveWallAlongNormal(
  layout: RoomLayoutState,
  wallId: string,
  dragStart: Pick<BlueprintPoint, 'x' | 'y'>,
  dragCurrent: Pick<BlueprintPoint, 'x' | 'y'>,
  originalPoints: BlueprintPoint[],
) {
  const wall = layout.walls.find((candidate) => candidate.id === wallId);

  if (!wall) {
    return layout;
  }

  const start = getPointById(originalPoints, wall.startPointId);
  const end = getPointById(originalPoints, wall.endPointId);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);

  if (!length) {
    return layout;
  }

  const normal = {
    x: -dy / length,
    y: dx / length,
  };
  const pointerDelta = {
    x: dragCurrent.x - dragStart.x,
    y: dragCurrent.y - dragStart.y,
  };
  const normalOffset = pointerDelta.x * normal.x + pointerDelta.y * normal.y;
  const movedPointIds = new Set([wall.startPointId, wall.endPointId]);

  return {
    ...layout,
    points: originalPoints.map((point) =>
      movedPointIds.has(point.id)
        ? {
            ...point,
            x: Number((point.x + normal.x * normalOffset).toFixed(2)),
            y: Number((point.y + normal.y * normalOffset).toFixed(2)),
          }
        : point,
    ),
  };
}

export function updateWallDefaults(
  layout: RoomLayoutState,
  changes: Partial<Pick<RoomLayoutState, 'wallHeight' | 'wallThickness'>>,
) {
  const wallHeight = changes.wallHeight ?? layout.wallHeight;
  const wallThickness = changes.wallThickness ?? layout.wallThickness;

  const nextLayout = {
    ...layout,
    wallHeight,
    wallThickness,
    walls: layout.walls.map((wall) => ({
      ...wall,
      height: wallHeight,
      thickness: wallThickness,
    })),
  };

  return normalizeDoorAndOpeningDimensions(nextLayout);
}

export function updateWall(
  layout: RoomLayoutState,
  wallId: string,
  changes: Partial<Pick<BlueprintWall, 'height' | 'thickness'>>,
) {
  const nextLayout = {
    ...layout,
    walls: layout.walls.map((wall) =>
      wall.id === wallId
        ? {
            ...wall,
            ...changes,
          }
        : wall,
    ),
  };

  return normalizeDoorAndOpeningDimensions(nextLayout, new Set([wallId]));
}
