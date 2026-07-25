import './ProductionWorkspace.css';

type ProductionFilterBarProps<T extends string> = {
  activeValue: T;
  filters: Array<{ label: string; value: T }>;
  onChange: (value: T) => void;
};

export function ProductionFilterBar<T extends string>({ activeValue, filters, onChange }: ProductionFilterBarProps<T>) {
  return (
    <div className="production-workspace-filter-bar">
      {filters.map((filter) => (
        <button className={activeValue === filter.value ? 'is-active' : ''} key={filter.value} type="button" onClick={() => onChange(filter.value)}>
          {filter.label}
        </button>
      ))}
    </div>
  );
}
