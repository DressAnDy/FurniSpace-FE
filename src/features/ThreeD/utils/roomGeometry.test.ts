import { describe, expect, it } from 'vitest';

import {
  addDoorToWall,
  addWindowToWall,
  createDefaultRoomLayout,
  deleteWall,
  getRoomArea,
  updateOpeningItem,
  updateWindowSillHeight,
} from '@/features/ThreeD/utils/roomGeometry';

describe('roomGeometry', () => {
  it('calculates area only for a closed room boundary', () => {
    const layout = createDefaultRoomLayout();

    expect(getRoomArea(layout)).toBe(144);
    expect(getRoomArea(deleteWall(layout, 'w1'))).toBe(0);
  });

  it('removes openings linked to a deleted wall', () => {
    const layout = addDoorToWall(createDefaultRoomLayout(), 'w1', 4);
    const nextLayout = deleteWall(layout, 'w1');

    expect(nextLayout.doors).toHaveLength(0);
    expect(nextLayout.walls.some((wall) => wall.id === 'w1')).toBe(false);
  });

  it('keeps openings on the same wall from overlapping', () => {
    const withDoor = addDoorToWall(createDefaultRoomLayout(), 'w1', 3);
    const withWindow = addWindowToWall(withDoor, 'w1', 9);
    const windowOpening = withWindow.windows[0];
    const nextLayout = updateOpeningItem(withWindow, 'window', windowOpening.id, { offset: 3 });
    const door = nextLayout.doors[0];
    const windowAfterMove = nextLayout.windows[0];
    const doorEnd = door.offset + door.width / 2;
    const windowStart = windowAfterMove.offset - windowAfterMove.width / 2;
    const windowEnd = windowAfterMove.offset + windowAfterMove.width / 2;
    const doorStart = door.offset - door.width / 2;

    expect(windowStart >= doorEnd || doorStart >= windowEnd).toBe(true);
  });

  it('clamps opening dimensions to the linked wall', () => {
    const layout = addDoorToWall(createDefaultRoomLayout(), 'w1', 6);
    const door = layout.doors[0];
    const nextLayout = updateOpeningItem(layout, 'door', door.id, { height: 20, width: 20 });

    expect(nextLayout.doors[0].width).toBe(12);
    expect(nextLayout.doors[0].height).toBe(8.75);
  });

  it('keeps a window floor offset inside the linked wall', () => {
    const layout = addWindowToWall(createDefaultRoomLayout(), 'w1', 6);
    const windowOpening = layout.windows[0];
    const nextLayout = updateWindowSillHeight(layout, windowOpening.id, 20);

    expect(nextLayout.windows[0].sillHeight).toBe(
      9 - windowOpening.height - 0.25,
    );
  });
});
