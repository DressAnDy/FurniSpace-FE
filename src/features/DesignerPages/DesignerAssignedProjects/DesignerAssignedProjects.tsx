import { IconArrowRight, IconCube, IconMapPin, IconRulerMeasure } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

import projectImage from '@/assets/project-list/terra-salon.png';
import { MOCK_PROJECT, MOCK_PROPOSAL, MOCK_PROPOSAL_SCENES } from '@/features/ThreeD/mocks/proposalScene.mock';
import { DesignerShell } from '@/features/DesignerPages/components/DesignerShell';

import './DesignerAssignedProjects.css';

export function DesignerAssignedProjects() {
  const navigate = useNavigate();

  return (
    <DesignerShell activeLabel="Assigned Projects">
      <header className="designer-page-heading"><div><h1>Assigned Projects</h1><p>Projects requiring proposal and Room Planner work.</p></div><span>1 active assignment</span></header>

      <section className="designer-work-queue">
        <div className="designer-project-image"><img alt="Retail interior project" src={projectImage} /></div>
        <div className="designer-project-copy">
          <div><span className="designer-project-code">{MOCK_PROJECT.projectCode}</span><span className="designer-project-status">Proposal drafting</span></div>
          <h2>{MOCK_PROJECT.name}</h2>
          <p><IconMapPin size={15} /> {MOCK_PROJECT.address}</p>
          <dl>
            <div><dt>Customer</dt><dd>{MOCK_PROJECT.customerName}</dd></div>
            <div><dt>Business</dt><dd>{MOCK_PROJECT.businessType}</dd></div>
            <div><dt>Proposal</dt><dd>{MOCK_PROPOSAL.name}</dd></div>
            <div><dt>Scenes</dt><dd>{MOCK_PROPOSAL_SCENES.length}</dd></div>
          </dl>
        </div>
        <aside className="designer-next-action">
          <IconRulerMeasure size={24} />
          <span>Next action</span>
          <strong>Continue proposal scene</strong>
          <button type="button" onClick={() => navigate(`/designer/projects/${MOCK_PROJECT.projectId}/proposals/${MOCK_PROPOSAL.proposalId}`)}>
            Open Proposal <IconArrowRight size={17} />
          </button>
          <button type="button" onClick={() => navigate('/proposal-scenes/mock-scene-main/room-planner')}>
            <IconCube size={17} /> Open Room Planner
          </button>
        </aside>
      </section>
    </DesignerShell>
  );
}
