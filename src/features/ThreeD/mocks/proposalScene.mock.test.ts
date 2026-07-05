import { describe, expect, it } from 'vitest';

import {
  MOCK_PLACED_PRODUCTS,
  MOCK_PROPOSAL_ITEMS,
  MOCK_PROPOSAL_SCENES,
  MOCK_ROOM_LAYOUT,
} from './proposalScene.mock';

describe('proposal 3D flow mock', () => {
  it('provides a closed room and published scene for customer review', () => {
    expect(MOCK_ROOM_LAYOUT.walls).toHaveLength(4);
    expect(MOCK_PROPOSAL_SCENES.some((scene) => scene.status === 'PUBLISHED')).toBe(true);
  });

  it('keeps scene objects linked to proposal Product Versions', () => {
    const itemVersionIds = new Set(MOCK_PROPOSAL_ITEMS.map((item) => item.productVersionId));

    expect(MOCK_PLACED_PRODUCTS.every((object) => Boolean(object.productId))).toBe(true);
    expect(MOCK_PLACED_PRODUCTS.some((object) => itemVersionIds.has(object.productId ?? ''))).toBe(true);
  });
});
