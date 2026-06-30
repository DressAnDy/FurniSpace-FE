const dimensions = [
  ['W', '200 cm'],
  ['H', '100 cm'],
  ['D', '70 cm'],
];

export function CustomizationTab() {
  return (
    <section className="designer-card designer-project-section-card">
      <div className="designer-project-section-toolbar">
        <div>
          <h3>Customization</h3><p>Custom product requests and feasibility notes.</p>
        </div>
        <div className="designer-project-filter-list">
          {['All', 'Feasible', 'Needs Review', 'Not Feasible'].map((filter, index) => (
            <button className={`designer-project-filter ${index === 0 ? 'designer-project-filter-active' : ''}`} key={filter} type="button">{filter}</button>
          ))}
        </div>
      </div>

      <article className="designer-project-custom-card">
        <div className="designer-project-custom-main">
          <div className="designer-project-custom-title">
            <h4>Modular Counter Unit</h4>
            <span className="designer-project-status designer-project-status-reviewed">Feasible</span>
          </div>
          <p className="designer-project-custom-subtitle">Ver. Oak Natural - Requested by Rina Kusuma (Sales)</p>

          <div className="designer-project-custom-specs">
            <div className="designer-project-custom-spec">
              <span>Material</span><p>Solid Teak</p>
            </div>
            <div className="designer-project-custom-spec">
              <span>Color</span><p>Dark Walnut</p>
            </div>
            <div className="designer-project-custom-spec designer-project-custom-price">
              <span>Price Impact</span><p>+Rp 2.8 jt</p>
            </div>
          </div>

          <div className="designer-project-dimensions">
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
