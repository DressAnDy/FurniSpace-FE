import type {
  MaterialSwatch,
  RoomLayoutState,
  RoomMaterialSelection,
} from '@/features/ThreeD/types/roomLayout.types';

export type MaterialPanelProps = {
  floorMaterials: RoomMaterialSelection[];
  layout: RoomLayoutState | null;
  onMaterialChange: (changes: Partial<Pick<RoomLayoutState, 'floorMaterialId' | 'wallMaterialId'>>) => void;
  wallMaterials: RoomMaterialSelection[];
  wallPaintSwatches: MaterialSwatch[];
};

export function MaterialPanel({
  floorMaterials,
  layout,
  onMaterialChange,
  wallMaterials,
  wallPaintSwatches,
}: MaterialPanelProps) {
  return (
    <section className="room-panel">
      <div className="room-panel-heading">Materials</div>
      <div className="material-group">
        <h3>Flooring</h3>
        {floorMaterials.map((material) => (
          <button
            className={layout?.floorMaterialId === material.id ? 'material-option is-selected' : 'material-option'}
            key={material.id}
            type="button"
            onClick={() => onMaterialChange({ floorMaterialId: material.id })}
          >
            <span style={{ backgroundColor: material.fallbackColor }} />
            {material.label}
          </button>
        ))}
      </div>
      <div className="material-group">
        <h3>Wall Paint / Wallpaper</h3>
        {wallMaterials.map((material) => (
          <button
            className={layout?.wallMaterialId === material.id ? 'material-option is-selected' : 'material-option'}
            key={material.id}
            type="button"
            onClick={() => onMaterialChange({ wallMaterialId: material.id })}
          >
            <span style={{ backgroundColor: material.fallbackColor }} />
            {material.label}
          </button>
        ))}
        {wallPaintSwatches.map((swatch) => (
          <button
            className={layout?.wallMaterialId === swatch.id ? 'material-option is-selected' : 'material-option'}
            key={swatch.id}
            type="button"
            onClick={() => onMaterialChange({ wallMaterialId: swatch.id })}
          >
            <span style={{ backgroundColor: swatch.color }} />
            {swatch.name}
          </button>
        ))}
      </div>
    </section>
  );
}
