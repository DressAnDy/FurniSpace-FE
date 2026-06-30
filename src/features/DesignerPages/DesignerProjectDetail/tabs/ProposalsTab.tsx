const proposals = [
  { code: 'PRP-2024-0142', name: 'Industrial Concept A', version: 'v1.0', status: 'Draft', scenes: '3 scenes', items: '24 items', feedback: 'None', updated: '2024-07-22' },
  { code: 'PRP-2024-0143', name: 'Warm Modern Concept B', version: 'v1.0', status: 'Draft', scenes: '2 scenes', items: '18 items', feedback: 'None', updated: '2024-07-21' },
];

export function ProposalsTab() {
  return (
    <section className="designer-card designer-project-table-card">
      <div className="designer-project-section-toolbar">
        <div>
          <h3>Proposals</h3><p>2 proposals for this project.</p>
        </div>
        <button className="designer-project-detail-button designer-project-detail-button-primary" type="button">Create Proposal</button>
      </div>
      <div className="designer-project-table-scroll">
        <table className="designer-project-table">
          <thead>
            <tr>
              {['Code / Name', 'Version', 'Status', 'Scenes', 'Items', 'Feedback', 'Updated', 'Action'].map((head) => (
                <th key={head}>{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {proposals.map((proposal) => (
              <tr key={proposal.code}>
                <td>
                  <strong>{proposal.name}</strong>
                  <span>{proposal.code}</span>
                </td>
                <td>{proposal.version}</td>
                <td><span className="designer-project-status designer-project-status-draft">{proposal.status}</span></td>
                <td>{proposal.scenes}</td>
                <td>{proposal.items}</td>
                <td>{proposal.feedback}</td>
                <td>{proposal.updated}</td>
                <td>
                  <div className="designer-project-table-actions">
                    <button className="designer-project-table-open" type="button">Open</button>
                    <button type="button">Edit</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
