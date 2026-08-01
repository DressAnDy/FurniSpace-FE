import { useMemo, useState } from 'react';
import { IconBuilding, IconRotateClockwise } from '@tabler/icons-react';
import { Link as RouterLink } from 'react-router-dom';

import { BlueprintCanvas } from '@/features/ThreeD/components/BlueprintCanvas';
import type { BlueprintTool, RoomLayoutState, SelectedRoomItem } from '@/features/ThreeD/types/roomLayout.types';
import { createDefaultRoomLayout, getRoomBounds } from '@/features/ThreeD/utils/roomGeometry';
import { useBuildingTestSceneState } from '@/features/ThreeDTest/hooks';
import type {
  BuildingLevel,
  BuildingLevelVisibility,
  BuildingPlacementSurface,
  BuildingTestScene,
} from '@/features/ThreeDTest/schemas/buildingScene.types';
import { getLevelCenter } from '@/features/ThreeDTest/utils/buildingTestSceneFactory';

import '@/features/ThreeD/pages/ThreeDTestPage.css';
import './BuildingBlueprintTestPage.css';

const levelTabs: Array<{ label: string; value: BuildingLevelVisibility }> = [
  { label: 'Yard', value: 'site' },
  { label: 'Floor 1', value: 'ground' },
  { label: 'Floor 2', value: 'level-2' },
];
const blueprintTools: Array<{ label: string; value: BlueprintTool }> = [
  { label: 'Select', value: 'select' },
  { label: 'Draw Wall', value: 'draw' },
  { label: 'Door', value: 'door' },
  { label: 'Window', value: 'window' },
  { label: 'Opening', value: 'opening' },
];

type NumberFieldProps = {
  label: string;
  max?: number;
  min?: number;
  onChange: (value: number) => void;
  step?: number;
  value: number;
};

function clamp(value: number, min: number, max = Number.POSITIVE_INFINITY) {
  return Math.min(Math.max(value, min), max);
}

function roundMetric(value: number) {
  return Number(value.toFixed(2));
}

function updateSurface(
  scene: BuildingTestScene,
  surfaceId: string,
  update: (surface: BuildingPlacementSurface) => BuildingPlacementSurface,
) {
  return {
    ...scene,
    surfaces: scene.surfaces.map((surface) => (surface.id === surfaceId ? update(surface) : surface)),
  };
}

function removeSurface(scene: BuildingTestScene, surfaceId: string) {
  return {
    ...scene,
    surfaces: scene.surfaces.filter((surface) => surface.id !== surfaceId),
  };
}

function addFrontYard(scene: BuildingTestScene) {
  if (scene.surfaces.some((surface) => surface.id === 'front-yard')) {
    return scene;
  }

  const frontYard: BuildingPlacementSurface = {
    depth: 5.5,
    elevation: 0.03,
    id: 'front-yard',
    label: 'Front Yard',
    levelId: 'site',
    position: {
      x: scene.building.position.x,
      y: 0.03,
      z: scene.building.position.z - scene.building.depth / 2 - 2.95,
    },
    type: 'YARD',
    width: Math.max(scene.building.width + 2, 4),
  };

  return {
    ...scene,
    surfaces: [...scene.surfaces, frontYard],
  };
}

function addSecondFloorBalcony(scene: BuildingTestScene) {
  if (scene.surfaces.some((surface) => surface.id === 'level-2-balcony')) {
    return scene;
  }

  const secondLevel = scene.building.levels.find((level) => level.id === 'level-2');

  if (!secondLevel) {
    return scene;
  }

  const secondCenter = getLevelCenter(scene, secondLevel);
  const balcony: BuildingPlacementSurface = {
    depth: 1.8,
    elevation: secondLevel.elevation,
    id: 'level-2-balcony',
    label: 'Floor 2 Balcony',
    levelId: 'level-2',
    position: {
      x: secondCenter.x,
      y: secondLevel.elevation,
      z: secondCenter.z - secondLevel.depth / 2 - 1.05,
    },
    type: 'BALCONY',
    width: Math.min(Math.max(secondLevel.width * 0.54, 2.4), secondLevel.width),
  };

  return {
    ...scene,
    surfaces: [...scene.surfaces, balcony],
  };
}

function syncBuildingShell(scene: BuildingTestScene, update: Partial<BuildingTestScene['building']>) {
  const nextBuilding = {
    ...scene.building,
    ...update,
  };
  const groundLevel = nextBuilding.levels.find((level) => level.id === 'ground');
  const secondLevel = nextBuilding.levels.find((level) => level.id === 'level-2');
  const groundCenter = groundLevel ? getLevelCenter({ ...scene, building: nextBuilding }, groundLevel) : nextBuilding.position;
  const secondCenter = secondLevel ? getLevelCenter({ ...scene, building: nextBuilding }, secondLevel) : nextBuilding.position;

  return {
    ...scene,
    building: nextBuilding,
    camera: {
      target: {
        x: nextBuilding.position.x,
        y: ((secondLevel?.elevation ?? 3.4) + (secondLevel?.wallHeight ?? 2.6)) / 2,
        z: nextBuilding.position.z,
      },
    },
    surfaces: scene.surfaces.map((surface) => {
      if (surface.id === 'ground-floor-surface') {
        return {
          ...surface,
          depth: Math.max(nextBuilding.depth - 0.7, 1),
          elevation: groundLevel?.elevation ?? surface.elevation,
          position: {
            x: groundCenter.x,
            y: groundLevel?.elevation ?? surface.elevation,
            z: groundCenter.z,
          },
          width: Math.max(nextBuilding.width - 0.7, 1),
        };
      }

      if (surface.id === 'level-2-floor-surface') {
        return {
          ...surface,
          depth: Math.max(nextBuilding.depth - 0.7, 1),
          elevation: secondLevel?.elevation ?? surface.elevation,
          position: {
            x: secondCenter.x,
            y: secondLevel?.elevation ?? surface.elevation,
            z: secondCenter.z,
          },
          width: Math.max(nextBuilding.width - 0.7, 1),
        };
      }

      if (surface.id === 'level-2-balcony') {
        return {
          ...surface,
          elevation: secondLevel?.elevation ?? surface.elevation,
          position: {
            ...surface.position,
            x: secondCenter.x,
            y: secondLevel?.elevation ?? surface.elevation,
            z: secondCenter.z - (secondLevel?.depth ?? nextBuilding.depth) / 2 - surface.depth / 2 - 0.15,
          },
        };
      }

      return surface;
    }),
  };
}

function updateLevel(
  scene: BuildingTestScene,
  levelId: BuildingLevel['id'],
  update: (level: BuildingLevel) => BuildingLevel,
) {
  const nextLevels = scene.building.levels.map((level) => (level.id === levelId ? update(level) : level));

  return syncBuildingShell(scene, {
    levels: nextLevels,
  });
}

function getLayoutSize(layout: RoomLayoutState) {
  const bounds = getRoomBounds(layout.points);

  return {
    centerX: (bounds.minX + bounds.maxX) / 2,
    centerZ: (bounds.minY + bounds.maxY) / 2,
    depth: Math.max(bounds.maxY - bounds.minY, 1),
    width: Math.max(bounds.maxX - bounds.minX, 1),
  };
}

function updateLevelLayout(scene: BuildingTestScene, levelId: BuildingLevel['id'], layout: RoomLayoutState) {
  const size = getLayoutSize(layout);

  return updateLevel(scene, levelId, (level) => ({
    ...level,
    depth: roundMetric(size.depth),
    footprintOffset: {
      x: roundMetric(size.centerX - scene.building.position.x),
      z: roundMetric(size.centerZ - scene.building.position.z),
    },
    layout,
    wallHeight: layout.wallHeight,
    width: roundMetric(size.width),
  }));
}

function createLevelBox(scene: BuildingTestScene, levelId: BuildingLevel['id']) {
  const level = scene.building.levels.find((candidate) => candidate.id === levelId);

  if (!level) {
    return scene;
  }

  const center = getLevelCenter(scene, level);
  const layout = createDefaultRoomLayout();
  const defaultSize = getLayoutSize(layout);
  const dx = center.x - defaultSize.centerX;
  const dz = center.z - defaultSize.centerZ;
  const shiftedLayout = {
    ...layout,
    wallHeight: level.wallHeight,
    wallThickness: 0.16,
    points: layout.points.map((point) => ({
      ...point,
      x: roundMetric(point.x + dx),
      y: roundMetric(point.y + dz),
    })),
    walls: layout.walls.map((wall) => ({
      ...wall,
      height: level.wallHeight,
      thickness: 0.16,
    })),
  };

  return updateLevelLayout(scene, levelId, shiftedLayout);
}

function alignSecondFloorToGround(scene: BuildingTestScene) {
  return updateLevel(scene, 'level-2', (level) => ({
    ...level,
    depth: scene.building.levels.find((candidate) => candidate.id === 'ground')?.depth ?? level.depth,
    footprintOffset: { x: 0, z: 0 },
    width: scene.building.levels.find((candidate) => candidate.id === 'ground')?.width ?? level.width,
  }));
}

function NumberField({ label, max, min = 0, onChange, step = 0.1, value }: NumberFieldProps) {
  return (
    <label className="blueprint-number-field">
      <span>{label}</span>
      <input
        max={max}
        min={min}
        step={step}
        type="number"
        value={value}
        onChange={(event) => {
          const nextValue = Number(event.target.value);

          if (!Number.isFinite(nextValue)) {
            return;
          }

          onChange(roundMetric(clamp(nextValue, min, max ?? Number.POSITIVE_INFINITY)));
        }}
      />
    </label>
  );
}

export function BuildingBlueprintTestPage() {
  const { resetSceneData, sceneData, setSceneData } = useBuildingTestSceneState();
  const [activeLayer, setActiveLayer] = useState<BuildingLevelVisibility>('ground');
  const [activeTool, setActiveTool] = useState<BlueprintTool>('select');
  const [selectedItem, setSelectedItem] = useState<SelectedRoomItem | null>(null);
  const [blueprintMessage, setBlueprintMessage] = useState('');
  const bounds = useMemo(() => {
    const padding = 28;
    const scale = Math.min(760 / sceneData.site.width, 560 / sceneData.site.depth);

    return {
      centerX: 420,
      centerY: 320,
      padding,
      scale,
      siteHeight: sceneData.site.depth * scale,
      siteWidth: sceneData.site.width * scale,
    };
  }, [sceneData.site.depth, sceneData.site.width]);
  const visibleSurfaces = sceneData.surfaces.filter((surface) => activeLayer === 'site' ? surface.levelId === 'site' : surface.levelId === activeLayer);
  const groundLevel = sceneData.building.levels.find((level) => level.id === 'ground') ?? sceneData.building.levels[0];
  const secondLevel = sceneData.building.levels.find((level) => level.id === 'level-2') ?? sceneData.building.levels[1];
  const activeLevel = activeLayer === 'ground' || activeLayer === 'level-2'
    ? sceneData.building.levels.find((level) => level.id === activeLayer)
    : null;
  const underlayLevel = activeLayer === 'level-2' ? groundLevel : null;
  const activeLevelCenter = activeLevel ? getLevelCenter(sceneData, activeLevel) : sceneData.building.position;
  const underlayCenter = underlayLevel ? getLevelCenter(sceneData, underlayLevel) : null;
  const frontYard = sceneData.surfaces.find((surface) => surface.id === 'front-yard');
  const balcony = sceneData.surfaces.find((surface) => surface.id === 'level-2-balcony');

  function worldXToSvg(x: number) {
    return bounds.centerX + x * bounds.scale;
  }

  function worldZToSvg(z: number) {
    return bounds.centerY + z * bounds.scale;
  }

  function rectProps(width: number, depth: number, x: number, z: number) {
    return {
      height: depth * bounds.scale,
      width: width * bounds.scale,
      x: worldXToSvg(x - width / 2),
      y: worldZToSvg(z - depth / 2),
    };
  }

  function getCurrentLevelId() {
    return activeLayer === 'ground' || activeLayer === 'level-2' ? activeLayer : null;
  }

  const currentLevelId = getCurrentLevelId();
  const currentLayout = currentLevelId
    ? sceneData.building.levels.find((level) => level.id === currentLevelId)?.layout ?? null
    : null;
  const underlayLayout = underlayLevel?.layout ?? null;

  return (
    <main className="building-blueprint-page">
      <header className="building-blueprint-header">
        <div>
          <span><IconBuilding size={16} /> Building 2D Blueprint</span>
          <h1>Layered campus layout</h1>
        </div>
        <nav>
          <RouterLink to="/3d-building-test">Open 3D</RouterLink>
          <button type="button" onClick={resetSceneData}>
            <IconRotateClockwise size={15} />
            Reset Blueprint
          </button>
        </nav>
      </header>

      <section className="building-blueprint-shell">
        <aside className="building-blueprint-controls">
          <section className="building-blueprint-panel">
            <div className="building-blueprint-panel-heading">
              <strong>Layers</strong>
              <span>{activeLayer}</span>
            </div>
            <div className="building-blueprint-tabs">
              {levelTabs.map((tab) => (
                <button
                  className={activeLayer === tab.value ? 'is-active' : ''}
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveLayer(tab.value)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </section>

          {currentLevelId ? (
            <section className="building-blueprint-panel">
              <div className="building-blueprint-panel-heading">
                <strong>Blueprint Tools</strong>
                <span>{activeTool}</span>
              </div>
              <div className="building-blueprint-tool-grid">
                {blueprintTools.map((tool) => (
                  <button
                    className={activeTool === tool.value ? 'is-active' : ''}
                    key={tool.value}
                    type="button"
                    onClick={() => setActiveTool(tool.value)}
                  >
                    {tool.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSceneData((scene) => createLevelBox(scene, currentLevelId))}
                >
                  Add Box
                </button>
              </div>
              {blueprintMessage ? <div className="building-blueprint-note">{blueprintMessage}</div> : null}
            </section>
          ) : null}

          <section className="building-blueprint-panel">
            <div className="building-blueprint-panel-heading">
              <strong>Site</strong>
              <span>meters</span>
            </div>
            <div className="blueprint-field-grid">
              <NumberField
                label="Site width"
                min={8}
                value={sceneData.site.width}
                onChange={(value) => setSceneData((scene) => ({ ...scene, site: { ...scene.site, width: value } }))}
              />
              <NumberField
                label="Site depth"
                min={8}
                value={sceneData.site.depth}
                onChange={(value) => setSceneData((scene) => ({ ...scene, site: { ...scene.site, depth: value } }))}
              />
              {frontYard ? (
                <>
                  <NumberField
                    label="Yard width"
                    min={2}
                    value={frontYard.width}
                    onChange={(value) => setSceneData((scene) => updateSurface(scene, 'front-yard', (surface) => ({ ...surface, width: value })))}
                  />
                  <NumberField
                    label="Yard depth"
                    min={2}
                    value={frontYard.depth}
                    onChange={(value) => setSceneData((scene) => updateSurface(scene, 'front-yard', (surface) => ({ ...surface, depth: value })))}
                  />
                  <button className="blueprint-remove-button" type="button" onClick={() => setSceneData((scene) => removeSurface(scene, 'front-yard'))}>
                    Remove Yard
                  </button>
                </>
              ) : (
                <button className="blueprint-add-button" type="button" onClick={() => setSceneData(addFrontYard)}>
                  Add Front Yard
                </button>
              )}
            </div>
          </section>

          <section className="building-blueprint-panel">
            <div className="building-blueprint-panel-heading">
              <strong>Building Footprint</strong>
              <span>{sceneData.building.width}m x {sceneData.building.depth}m</span>
            </div>
            <div className="blueprint-field-grid">
              <NumberField
                label="Building width"
                min={4}
                value={sceneData.building.width}
                onChange={(value) => setSceneData((scene) => syncBuildingShell(scene, { width: value }))}
              />
              <NumberField
                label="Building depth"
                min={4}
                value={sceneData.building.depth}
                onChange={(value) => setSceneData((scene) => syncBuildingShell(scene, { depth: value }))}
              />
              <NumberField
                label="Position X"
                min={-8}
                value={sceneData.building.position.x}
                onChange={(value) => setSceneData((scene) => syncBuildingShell(scene, { position: { ...scene.building.position, x: value } }))}
              />
              <NumberField
                label="Position Z"
                min={-8}
                value={sceneData.building.position.z}
                onChange={(value) => setSceneData((scene) => syncBuildingShell(scene, { position: { ...scene.building.position, z: value } }))}
              />
            </div>
          </section>

          <section className="building-blueprint-panel">
            <div className="building-blueprint-panel-heading">
              <strong>Floor Stack</strong>
              <span>elevation</span>
            </div>
            <div className="blueprint-field-grid">
              {groundLevel ? (
                <>
                  <NumberField
                    label="Floor 1 width"
                    min={4}
                    value={groundLevel.width}
                    onChange={(value) => setSceneData((scene) => updateLevel(scene, 'ground', (level) => ({ ...level, width: value })))}
                  />
                  <NumberField
                    label="Floor 1 depth"
                    min={4}
                    value={groundLevel.depth}
                    onChange={(value) => setSceneData((scene) => updateLevel(scene, 'ground', (level) => ({ ...level, depth: value })))}
                  />
                  <NumberField
                    label="Floor 1 elevation"
                    min={0}
                    value={groundLevel.elevation}
                    onChange={(value) => setSceneData((scene) => updateLevel(scene, 'ground', (level) => ({ ...level, elevation: value })))}
                  />
                  <NumberField
                    label="Floor 1 wall height"
                    min={1.8}
                    value={groundLevel.wallHeight}
                    onChange={(value) => setSceneData((scene) => updateLevel(scene, 'ground', (level) => ({ ...level, wallHeight: value })))}
                  />
                </>
              ) : null}
              {secondLevel ? (
                <>
                  <NumberField
                    label="Floor 2 width"
                    min={4}
                    value={secondLevel.width}
                    onChange={(value) => setSceneData((scene) => updateLevel(scene, 'level-2', (level) => ({ ...level, width: value })))}
                  />
                  <NumberField
                    label="Floor 2 depth"
                    min={4}
                    value={secondLevel.depth}
                    onChange={(value) => setSceneData((scene) => updateLevel(scene, 'level-2', (level) => ({ ...level, depth: value })))}
                  />
                  <NumberField
                    label="Floor 2 offset X"
                    min={-6}
                    value={secondLevel.footprintOffset.x}
                    onChange={(value) => setSceneData((scene) => updateLevel(scene, 'level-2', (level) => ({ ...level, footprintOffset: { ...level.footprintOffset, x: value } })))}
                  />
                  <NumberField
                    label="Floor 2 offset Z"
                    min={-6}
                    value={secondLevel.footprintOffset.z}
                    onChange={(value) => setSceneData((scene) => updateLevel(scene, 'level-2', (level) => ({ ...level, footprintOffset: { ...level.footprintOffset, z: value } })))}
                  />
                  <NumberField
                    label="Floor 2 elevation"
                    min={2.4}
                    value={secondLevel.elevation}
                    onChange={(value) => setSceneData((scene) => updateLevel(scene, 'level-2', (level) => ({ ...level, elevation: value })))}
                  />
                  <NumberField
                    label="Floor 2 wall height"
                    min={1.8}
                    value={secondLevel.wallHeight}
                    onChange={(value) => setSceneData((scene) => updateLevel(scene, 'level-2', (level) => ({ ...level, wallHeight: value })))}
                  />
                </>
              ) : null}
              {secondLevel ? (
                <button className="blueprint-align-button" type="button" onClick={() => setSceneData(alignSecondFloorToGround)}>
                  Align Floor 2 to Floor 1
                </button>
              ) : null}
              {balcony ? (
                <>
                  <NumberField
                    label="Balcony width"
                    min={1}
                    value={balcony.width}
                    onChange={(value) => setSceneData((scene) => updateSurface(scene, 'level-2-balcony', (surface) => ({ ...surface, width: value })))}
                  />
                  <NumberField
                    label="Balcony depth"
                    min={0.8}
                    value={balcony.depth}
                    onChange={(value) => setSceneData((scene) => syncBuildingShell(
                      updateSurface(scene, 'level-2-balcony', (surface) => ({ ...surface, depth: value })),
                      {},
                    ))}
                  />
                  <button className="blueprint-remove-button" type="button" onClick={() => setSceneData((scene) => removeSurface(scene, 'level-2-balcony'))}>
                    Remove Balcony
                  </button>
                </>
              ) : (
                <button className="blueprint-add-button" type="button" onClick={() => setSceneData(addSecondFloorBalcony)}>
                  Add Balcony
                </button>
              )}
            </div>
          </section>
        </aside>

        <section className={currentLevelId ? 'building-blueprint-workspace is-editor' : 'building-blueprint-workspace'}>
          <div className="building-blueprint-toolbar">
            <div>
              <strong>{levelTabs.find((tab) => tab.value === activeLayer)?.label} Plan</strong>
              <span>Parametric test blueprint shared with the 3D prototype.</span>
            </div>
          </div>

          {currentLevelId ? (
            <BlueprintCanvas
              activeTool={activeTool}
              floorFillColor="#d8c5a9"
              hideLabels={false}
              layout={currentLayout}
              selectedItem={selectedItem}
              underlay={underlayLayout ? { label: 'Floor 1 underlay', layout: underlayLayout } : null}
              wallFillColor="#f1eee7"
              onLayoutChange={(layout) => setSceneData((scene) => updateLevelLayout(scene, currentLevelId, layout))}
              onMessage={setBlueprintMessage}
              onSelectItem={setSelectedItem}
            />
          ) : (
          <svg className="building-blueprint-canvas" role="img" viewBox="0 0 840 640">
            <defs>
              <pattern height="24" id="blueprint-grid" patternUnits="userSpaceOnUse" width="24">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect fill="#123f56" height="640" width="840" />
            <rect fill="url(#blueprint-grid)" height="640" width="840" />
            <rect
              className="blueprint-site-rect"
              {...rectProps(sceneData.site.width, sceneData.site.depth, 0, 0)}
            />
            <rect
              className="blueprint-building-rect"
              {...rectProps(sceneData.building.width, sceneData.building.depth, sceneData.building.position.x, sceneData.building.position.z)}
            />
            {underlayLevel && underlayCenter ? (
              <g>
                <rect
                  className="blueprint-underlay-rect"
                  {...rectProps(underlayLevel.width, underlayLevel.depth, underlayCenter.x, underlayCenter.z)}
                />
                <text
                  className="blueprint-underlay-label"
                  x={worldXToSvg(underlayCenter.x)}
                  y={worldZToSvg(underlayCenter.z - underlayLevel.depth / 2) - 10}
                >
                  Floor 1 underlay
                </text>
              </g>
            ) : null}
            {activeLevel ? (
              <rect
                className="blueprint-active-level-rect"
                {...rectProps(activeLevel.width, activeLevel.depth, activeLevelCenter.x, activeLevelCenter.z)}
              />
            ) : null}
            {visibleSurfaces.map((surface) => (
              <g key={surface.id}>
                <rect
                  className={`blueprint-surface-rect is-${surface.type.toLowerCase()}`}
                  {...rectProps(surface.width, surface.depth, surface.position.x, surface.position.z)}
                />
                <text
                  className="blueprint-surface-label"
                  x={worldXToSvg(surface.position.x)}
                  y={worldZToSvg(surface.position.z)}
                >
                  {surface.label}
                </text>
              </g>
            ))}
            <text className="blueprint-scale-label" x="34" y="594">
              Site {sceneData.site.width}m x {sceneData.site.depth}m / Building {sceneData.building.width}m x {sceneData.building.depth}m
            </text>
          </svg>
          )}
        </section>
      </section>
    </main>
  );
}
