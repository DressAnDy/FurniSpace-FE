const dimensions = [
  ['W', '200 cm'],
  ['H', '100 cm'],
  ['D', '70 cm'],
];

export function CustomizationTab() {
  return (
    <section className="designer-card p-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-950">Customization</h3>
          <p className="mt-1 text-sm text-zinc-500">Custom product requests and feasibility notes.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['All', 'Feasible', 'Needs Review', 'Not Feasible'].map((filter, index) => (
            <button className={`designer-project-filter ${index === 0 ? 'designer-project-filter-active' : ''}`} key={filter} type="button">{filter}</button>
          ))}
        </div>
      </div>

      <article className="designer-project-custom-card">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h4 className="m-0 text-xl font-semibold text-zinc-950">Modular Counter Unit</h4>
            <span className="designer-project-status designer-project-status-reviewed">Feasible</span>
          </div>
          <p className="mt-2 text-sm font-medium text-zinc-500">Ver. Oak Natural - Requested by Rina Kusuma (Sales)</p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-zinc-50 p-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Material</span>
              <p className="mt-2 text-sm font-semibold text-zinc-900">Solid Teak</p>
            </div>
            <div className="rounded-2xl bg-zinc-50 p-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Color</span>
              <p className="mt-2 text-sm font-semibold text-zinc-900">Dark Walnut</p>
            </div>
            <div className="rounded-2xl bg-zinc-50 p-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Price Impact</span>
              <p className="mt-2 text-sm font-semibold text-[#9a713b]">+Rp 2.8 jt</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {dimensions.map(([label, value]) => (
              <span className="designer-project-dimension" key={label}>{label} {value}</span>
            ))}
          </div>
        </div>

        <aside className="designer-project-note">
          <span>Designer Note</span>
          <p>3-week lead time. Price confirmed. Keep counter edges softened for customer circulation.</p>
          <button className="designer-project-detail-button" type="button">Edit</button>
        </aside>
      </article>
    </section>
  );
}
