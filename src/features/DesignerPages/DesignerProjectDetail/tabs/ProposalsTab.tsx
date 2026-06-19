const proposals = [
  { code: 'PRP-2024-0142', name: 'Industrial Concept A', version: 'v1.0', status: 'Draft', scenes: '3 scenes', items: '24 items', feedback: 'None', updated: '2024-07-22' },
  { code: 'PRP-2024-0143', name: 'Warm Modern Concept B', version: 'v1.0', status: 'Draft', scenes: '2 scenes', items: '18 items', feedback: 'None', updated: '2024-07-21' },
];

export function ProposalsTab() {
  return (
    <section className="designer-card overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-zinc-100 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-950">Proposals</h3>
          <p className="mt-1 text-sm text-zinc-500">2 proposals for this project.</p>
        </div>
        <button className="designer-project-detail-button designer-project-detail-button-primary" type="button">Create Proposal</button>
      </div>
      <div className="overflow-x-auto">
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
                  <div className="flex gap-3">
                    <button className="text-xs font-semibold text-[#9a713b]" type="button">Open</button>
                    <button className="text-xs font-semibold text-zinc-500" type="button">Edit</button>
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
