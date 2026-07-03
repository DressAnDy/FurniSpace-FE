import { useEffect, useState } from 'react';

import type {
  RoomLayoutState,
  RoomOpeningItem,
  SelectedRoomItem,
} from '@/features/ThreeD/types/roomLayout.types';
import {
  deleteOpeningItem,
  deleteWall,
  formatMeters,
  getWallLength,
  updateDoorSwingDirection,
  updateOpeningItem,
  updateWall,
} from '@/features/ThreeD/utils/roomGeometry';

export type WallEditPanelProps = {
  layout: RoomLayoutState | null;
  onLayoutChange: (layout: RoomLayoutState) => void;
  onSelectItem: (item: SelectedRoomItem | null) => void;
  selectedItem: SelectedRoomItem | null;
};

function parseNumberInput(value: string, fallback: number) {
  if (value.trim() === '') {
    return 0;
  }

  const parsed = Number(value.replace(',', '.'));

  return Number.isFinite(parsed) ? parsed : fallback;
}

type CommitNumberInputProps = {
  fallback: number;
  min?: number;
  onCommit: (value: number) => void;
  step?: number;
  value: number;
};

function CommitNumberInput({ fallback, min, onCommit, step, value }: CommitNumberInputProps) {
  const [draftValue, setDraftValue] = useState(String(value));

  useEffect(() => {
    setDraftValue(String(value));
  }, [value]);

  return (
    <input
      inputMode="decimal"
      min={min}
      step={step}
      type="text"
      value={draftValue}
      onChange={(event) => setDraftValue(event.target.value)}
      onKeyDown={(event) => {
        if (event.key !== 'Enter') {
          return;
        }

        const nextValue = parseNumberInput(draftValue, fallback);
        const shouldApplyMin = draftValue.trim() !== '' && min !== undefined;
        onCommit(shouldApplyMin ? Math.max(nextValue, min) : nextValue);
      }}
    />
  );
}

function getSelectedOpening(layout: RoomLayoutState, selectedItem: SelectedRoomItem | null): RoomOpeningItem | null {
  if (!selectedItem) {
    return null;
  }

  if (selectedItem.type === 'door') {
    return layout.doors.find((door) => door.id === selectedItem.id) ?? null;
  }

  if (selectedItem.type === 'window') {
    return layout.windows.find((windowOpening) => windowOpening.id === selectedItem.id) ?? null;
  }

  if (selectedItem.type === 'opening') {
    return layout.openings.find((opening) => opening.id === selectedItem.id) ?? null;
  }

  return null;
}

export function WallEditPanel({
  layout,
  onLayoutChange,
  onSelectItem,
  selectedItem,
}: WallEditPanelProps) {
  const selectedWall = layout && selectedItem?.type === 'wall'
    ? layout.walls.find((wall) => wall.id === selectedItem.id) ?? null
    : null;
  const selectedOpening = layout ? getSelectedOpening(layout, selectedItem) : null;

  if (!layout || (!selectedWall && !selectedOpening)) {
    return (
      <section className="room-panel">
        <div className="room-panel-heading">Edit Selection</div>
        <p className="room-panel-empty">Select a wall, door, window, or opening on the blueprint to inspect it.</p>
      </section>
    );
  }

  if (selectedOpening && selectedItem?.type !== 'wall') {
    const linkedWall = layout.walls.find((wall) => wall.id === selectedOpening.wallId);
    const itemType = selectedOpening.type.toLowerCase() as 'door' | 'window' | 'opening';
    const heading = selectedOpening.type === 'DOOR'
      ? 'Edit Door'
      : selectedOpening.type === 'WINDOW'
        ? 'Edit Window'
        : 'Edit Opening';

    return (
      <section className="room-panel">
        <div className="room-panel-heading">{heading}</div>
        <div className="wall-edit-grid">
          <label>
            <span>ID</span>
            <input readOnly value={selectedOpening.id} />
          </label>
          <label>
            <span>Linked Wall</span>
            <input readOnly value={selectedOpening.wallId} />
          </label>
          <label>
            <span>Wall Length</span>
            <input readOnly value={linkedWall ? formatMeters(getWallLength(linkedWall, layout.points)) : 'Missing wall'} />
          </label>
          <label>
            <span>Offset</span>
            <input readOnly value={formatMeters(selectedOpening.offset)} />
          </label>
          <label>
            <span>Width</span>
            <CommitNumberInput
              fallback={selectedOpening.width}
              min={0.5}
              onCommit={(value) => onLayoutChange(updateOpeningItem(
                layout,
                itemType,
                selectedOpening.id,
                { width: value },
              ))}
              step={0.1}
              value={selectedOpening.width}
            />
          </label>
          <label>
            <span>Height</span>
            <CommitNumberInput
              fallback={selectedOpening.height}
              min={0.5}
              onCommit={(value) => onLayoutChange(updateOpeningItem(
                layout,
                itemType,
                selectedOpening.id,
                { height: value },
              ))}
              step={0.1}
              value={selectedOpening.height}
            />
          </label>
          {selectedOpening.type === 'DOOR' && (
            <label>
              <span>Swing Direction</span>
              <select
                value={selectedOpening.swingDirection}
                onChange={(event) =>
                  onLayoutChange(updateDoorSwingDirection(
                    layout,
                    selectedOpening.id,
                    event.target.value as 'IN_LEFT' | 'IN_RIGHT',
                  ))
                }
              >
                <option value="IN_LEFT">Open In Left</option>
                <option value="IN_RIGHT">Open In Right</option>
              </select>
            </label>
          )}
          {selectedOpening.type === 'WINDOW' && (
            <label>
              <span>Sill Height</span>
              <input readOnly value={formatMeters(selectedOpening.sillHeight)} />
            </label>
          )}
        </div>
        <div className="wall-placeholder-actions">
          <button
            type="button"
            onClick={() => {
              onLayoutChange(deleteOpeningItem(layout, itemType, selectedOpening.id));
              onSelectItem(null);
            }}
          >
            Delete {selectedOpening.type.toLowerCase()}
          </button>
        </div>
      </section>
    );
  }

  if (!selectedWall) {
    return null;
  }

  return (
    <section className="room-panel">
      <div className="room-panel-heading">Edit Wall</div>
      <div className="wall-tabs">
        <button className="is-active" type="button">Wall</button>
        <button type="button">Opening</button>
      </div>
      <div className="wall-edit-grid">
        <label>
          <span>Wall ID</span>
          <input readOnly value={selectedWall.id} />
        </label>
        <label>
          <span>Length</span>
          <input readOnly value={formatMeters(getWallLength(selectedWall, layout.points))} />
        </label>
        <label>
          <span>Wall Height</span>
          <CommitNumberInput
            fallback={selectedWall.height}
            min={0}
            onCommit={(value) =>
              onLayoutChange(updateWall(layout, selectedWall.id, {
                height: value,
              }))
            }
            step={0.25}
            value={selectedWall.height}
          />
        </label>
        <label>
          <span>Wall Thickness</span>
          <CommitNumberInput
            fallback={selectedWall.thickness}
            min={0.1}
            onCommit={(value) =>
              onLayoutChange(updateWall(layout, selectedWall.id, {
                thickness: value,
              }))
            }
            step={0.05}
            value={selectedWall.thickness}
          />
        </label>
      </div>
      <div className="wall-placeholder-actions">
        <button
          type="button"
          onClick={() => {
            onLayoutChange(deleteWall(layout, selectedWall.id));
            onSelectItem(null);
          }}
        >
          Delete Wall
        </button>
        <button disabled type="button">Split Wall</button>
      </div>
    </section>
  );
}
