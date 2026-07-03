import { describe, expect, it } from 'vitest';

import { hydrateRoomPlannerScenePayload } from '@/features/ThreeD/utils/roomPlannerSceneMapper';

describe('roomPlannerSceneMapper', () => {
  it('hydrates openings from Mongo numeric values without moving them to the wall origin', () => {
    const hydrated = hydrateRoomPlannerScenePayload({
      schemaVersion: 2,
      editorVersion: 'ROOM_PLANNER_BABYLON_V1',
      unit: 'ft',
      layout: {
        type: 'BLUEPRINT_WALL_GRAPH',
        isClosed: true,
        areaSqFt: { $numberDecimal: '144' },
        areaSqm: { $numberDecimal: '13.38' },
        wallHeight: { $numberDecimal: '9' },
        wallThickness: { $numberDecimal: '0.3' },
        floorMaterialId: 'wood-floor',
        wallMaterialId: 'wall-base',
        points: [
          { pointId: 'p1', x: { $numberDecimal: '0' }, y: { $numberDecimal: '0' } },
          { pointId: 'p2', x: { $numberDecimal: '12' }, y: { $numberDecimal: '0' } },
          { pointId: 'p3', x: { $numberDecimal: '12' }, y: { $numberDecimal: '12' } },
          { pointId: 'p4', x: { $numberDecimal: '0' }, y: { $numberDecimal: '12' } },
        ],
        walls: [
          {
            wallId: 'w1',
            startPointId: 'p1',
            endPointId: 'p2',
            height: { $numberDecimal: '9' },
            thickness: { $numberDecimal: '0.3' },
            visible: true,
            locked: false,
            style: {},
          },
          {
            wallId: 'w2',
            startPointId: 'p2',
            endPointId: 'p3',
            height: '9',
            thickness: '0.3',
            visible: true,
            locked: false,
            style: {},
          },
        ],
        doors: [
          {
            openingId: 'door-1',
            type: 'DOOR',
            wallId: 'w1',
            offset: { $numberDecimal: '4.5' },
            width: { $numberDecimal: '2.5' },
            height: { $numberDecimal: '7' },
            swingDirection: 'IN_RIGHT',
            locked: false,
          },
        ],
        windows: [
          {
            openingId: 'window-1',
            type: 'WINDOW',
            wallId: 'w2',
            offset: '8.25',
            width: '3.5',
            height: '4',
            sillHeight: { value: '3' },
            locked: false,
          },
        ],
        openings: [
          {
            openingId: 'opening-1',
            type: 'OPENING',
            wallId: 'w2',
            offset: { Value: '5.25' },
            width: { $numberDouble: '2' },
            height: { $numberInt: '7' },
            locked: false,
          },
        ],
        floor: {
          materialId: 'wood-floor',
          color: '#8B5A2B',
          textureFileId: null,
          textureUrlSnapshot: null,
          rotation: 0,
          scale: 1,
        },
      },
      objects: [],
      layers: [],
      stylePreset: null,
      camera: {
        mode: 'ORBIT',
        position: { x: 12, y: 14, z: 12 },
        target: { x: 6, y: 0, z: 6 },
        zoom: 1,
      },
      lighting: {
        preset: 'DEFAULT',
        environment: 'default',
        ambientIntensity: 0.8,
        directionalIntensity: 1,
        customLights: [],
      },
      validation: {
        status: 'NOT_VALIDATED',
        warnings: [],
        errors: [],
        lastValidatedAt: null,
      },
      editorState: null,
    } as never);

    expect(hydrated.layout?.doors[0]).toMatchObject({
      height: 7,
      offset: 4.5,
      wallId: 'w1',
      width: 2.5,
    });
    expect(hydrated.layout?.windows[0]).toMatchObject({
      height: 4,
      offset: 8.25,
      sillHeight: 3,
      wallId: 'w2',
      width: 3.5,
    });
    expect(hydrated.layout?.openings[0]).toMatchObject({
      height: 7,
      offset: 5.25,
      wallId: 'w2',
      width: 2,
    });
  });

  it('drops openings that no longer reference a valid hydrated wall', () => {
    const hydrated = hydrateRoomPlannerScenePayload({
      schemaVersion: 2,
      editorVersion: 'ROOM_PLANNER_BABYLON_V1',
      unit: 'ft',
      layout: {
        type: 'BLUEPRINT_WALL_GRAPH',
        isClosed: false,
        areaSqFt: 0,
        areaSqm: 0,
        wallHeight: 9,
        wallThickness: 0.3,
        floorMaterialId: 'wood-floor',
        wallMaterialId: 'wall-base',
        points: [
          { pointId: 'p1', x: 0, y: 0 },
          { pointId: 'p2', x: 12, y: 0 },
          { pointId: 'p3', x: 12, y: 12 },
        ],
        walls: [
          {
            wallId: 'w1',
            startPointId: 'p1',
            endPointId: 'p2',
            height: 9,
            thickness: 0.3,
            visible: true,
            locked: false,
            style: {
              materialId: 'wall-base',
              color: '#D8D2C5',
              textureFileId: null,
              textureUrlSnapshot: null,
            },
          },
        ],
        doors: [
          {
            openingId: 'door-1',
            type: 'DOOR',
            wallId: 'missing-wall',
            offset: 4,
            width: 3,
            height: 7,
            locked: false,
          },
        ],
        windows: [],
        openings: [],
        floor: {
          materialId: 'wood-floor',
          color: '#8B5A2B',
          textureFileId: null,
          textureUrlSnapshot: null,
          rotation: 0,
          scale: 1,
        },
      },
      objects: [],
      layers: [],
      stylePreset: null,
      camera: {
        mode: 'ORBIT',
        position: { x: 12, y: 14, z: 12 },
        target: { x: 6, y: 0, z: 6 },
        zoom: 1,
      },
      lighting: {
        preset: 'DEFAULT',
        environment: 'default',
        ambientIntensity: 0.8,
        directionalIntensity: 1,
        customLights: [],
      },
      validation: {
        status: 'NOT_VALIDATED',
        warnings: [],
        errors: [],
        lastValidatedAt: null,
      },
      editorState: null,
    });

    expect(hydrated.layout?.doors).toHaveLength(0);
  });
});
