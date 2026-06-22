import type { PlacedProduct3D } from '@/features/ThreeD/components/RoomPreview3D';
import type { RoomLayoutState } from '@/features/ThreeD/types/roomLayout.types';
import { createDefaultRoomLayout } from '@/features/ThreeD/utils/roomGeometry';

export type MockProposalScene = {
  description: string;
  name: string;
  proposalId: string;
  projectId: string;
  sceneId: string;
  status: 'DRAFT' | 'PUBLISHED';
  updatedAt: string;
  version: number;
};

export type MockProposalItem = {
  estimatedPrice: number;
  material: string;
  name: string;
  productVersionId: string;
  quantity: number;
  type: string;
};

export const MOCK_PROJECT = {
  address: '42 Nguyen Hue, District 1, Ho Chi Minh City',
  businessType: 'Cafe',
  customerName: 'Linh Nguyen',
  designerName: 'Michael Torres',
  name: 'Harbor Coffee Flagship',
  projectCode: 'FS-PRJ-2026-018',
  projectId: 'mock-project-cafe',
  status: 'PROPOSAL_DRAFTING',
};

export const MOCK_PROPOSAL = {
  description: 'Industrial modern concept with warm wood surfaces and graphite metal furniture.',
  name: 'Industrial Modern Concept',
  proposalId: 'mock-proposal-industrial',
  publishedAt: '2026-06-18T09:30:00.000Z',
  status: 'PUBLISHED',
  version: 1,
};

export const MOCK_PROPOSAL_SCENES: MockProposalScene[] = [
  {
    description: 'Primary customer-facing room arrangement.',
    name: 'Main Cafe Layout',
    proposalId: MOCK_PROPOSAL.proposalId,
    projectId: MOCK_PROJECT.projectId,
    sceneId: 'mock-scene-main',
    status: 'PUBLISHED',
    updatedAt: '2026-06-18T09:25:00.000Z',
    version: 3,
  },
  {
    description: 'Alternative furniture density for designer review.',
    name: 'Compact Seating Variant',
    proposalId: MOCK_PROPOSAL.proposalId,
    projectId: MOCK_PROJECT.projectId,
    sceneId: 'mock-scene-compact',
    status: 'DRAFT',
    updatedAt: '2026-06-19T04:10:00.000Z',
    version: 1,
  },
];

export const MOCK_ROOM_LAYOUT: RoomLayoutState = {
  ...createDefaultRoomLayout(),
  doors: [
    {
      height: 7,
      id: 'door-main',
      offset: 3,
      swingDirection: 'IN_LEFT',
      type: 'DOOR',
      wallId: 'w4',
      width: 3,
    },
  ],
  windows: [
    {
      height: 3,
      id: 'window-front',
      offset: 7.5,
      sillHeight: 3,
      type: 'WINDOW',
      wallId: 'w2',
      width: 4,
    },
  ],
};

export const MOCK_PLACED_PRODUCTS: PlacedProduct3D[] = [
  {
    heightOffset: 0,
    id: 'scene-object-table-001',
    modelName: 'Side Table - Natural Oak',
    modelUrl: '/models/3d-test/table01/side_table_01_4k.gltf',
    placementMode: 'FLOOR',
    position: { x: 6.8, y: 0, z: 6.2 },
    productId: 'mock-version-table-oak',
    rotation: { x: 0, y: 0.35, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  },
  {
    heightOffset: 0,
    id: 'scene-object-stool-001',
    modelName: 'Metal Stool - Black',
    modelUrl: '/models/3d-test/chair01/metal_stool_02_4k.gltf',
    placementMode: 'FLOOR',
    position: { x: 4.3, y: 0, z: 5.1 },
    productId: 'mock-version-stool-black',
    rotation: { x: 0, y: 0.2, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  },
  {
    heightOffset: 0,
    id: 'scene-object-stool-002',
    modelName: 'Metal Stool - Silver',
    modelUrl: '/models/3d-test/chair01/metal_stool_02_4k.gltf',
    placementMode: 'FLOOR',
    position: { x: 8.4, y: 0, z: 6.4 },
    productId: 'mock-version-stool-silver',
    rotation: { x: 0, y: 3.1, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  },
];

export const MOCK_PROPOSAL_ITEMS: MockProposalItem[] = [
  {
    estimatedPrice: 2850000,
    material: 'Oak Wood',
    name: 'Side Table - Natural Oak',
    productVersionId: 'mock-version-table-oak',
    quantity: 1,
    type: 'TABLE',
  },
  {
    estimatedPrice: 1450000,
    material: 'Powder-coated Metal',
    name: 'Metal Stool - Black',
    productVersionId: 'mock-version-stool-black',
    quantity: 2,
    type: 'CHAIR',
  },
];

export const MOCK_FLOOR_MATERIAL = {
  fallbackColor: '#8B5A2B',
  id: 'wood-floor',
  label: 'Wood Floor',
  textureUrl: '/materials/flooring/woodfloor.jpg',
  type: 'floor' as const,
};

export const MOCK_WALL_MATERIAL = {
  fallbackColor: '#EFE9DD',
  id: 'warm-white',
  label: 'Warm White',
  textureUrl: '/materials/wall-paint/wallbase.jpg',
  type: 'wall' as const,
};
