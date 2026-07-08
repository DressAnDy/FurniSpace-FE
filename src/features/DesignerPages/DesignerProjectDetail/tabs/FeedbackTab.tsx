import { getCustomizationRequestServiceResultMessage, type CustomizationRequestDto } from '@/services/api/customizationRequests';
import { getProposalServiceResultMessage, type ProposalDto } from '@/services/api/proposals';
import type { ProjectDto } from '@/services/api/projects';
import { useProjectCustomizationRequests, useProjectProposals } from '@/services/queries';

type FeedbackTabProps = {
  project: ProjectDto;
};

export function FeedbackTab({ project }: FeedbackTabProps) {
  const proposalsQuery = useProjectProposals({ projectId: project.projectId, limit: 50 });
  const customizationQuery = useProjectCustomizationRequests({ projectId: project.projectId });
  const proposals = proposalsQuery.data?.items ?? [];
  const requests = customizationQuery.data?.items ?? [];
  const revisionProposals = proposals.filter((proposal) => proposal.status === 'REVISION_REQUESTED');
  const customerDecisionRequests = requests.filter((request) =>
    ['WAITING_FOR_CUSTOMER_FINAL_APPROVAL', 'ACCEPTED', 'REJECTED_BY_CUSTOMER'].includes(request.status ?? ''),
  );
  const productionReviewRequests = requests.filter((request) => request.status === 'PRODUCTION_REVIEWING');

  return (
    <section className="designer-card designer-project-section-card">
      <div className="designer-project-section-toolbar">
        <div>
          <h3>Feedback</h3>
          <p>Customer review signals from proposals and item-level customization requests.</p>
        </div>
      </div>

      {proposalsQuery.isError ? (
        <p className="designer-project-file-message designer-project-file-error">{getProposalServiceResultMessage(proposalsQuery.error)}</p>
      ) : null}
      {customizationQuery.isError ? (
        <p className="designer-project-file-message designer-project-file-error">
          {getCustomizationRequestServiceResultMessage(customizationQuery.error)}
        </p>
      ) : null}

      <div className="designer-project-feedback-summary">
        <FeedbackMetric label="Published" value={countByStatus(proposals, 'PUBLISHED') + countByStatus(proposals, 'VIEWED')} />
        <FeedbackMetric label="Revision Requests" value={revisionProposals.length} />
        <FeedbackMetric label="Production Review" value={productionReviewRequests.length} />
        <FeedbackMetric label="Customer Decisions" value={customerDecisionRequests.length} />
      </div>

      {proposalsQuery.isLoading || customizationQuery.isLoading ? (
        <p className="designer-project-empty-text">Loading feedback signals...</p>
      ) : null}

      <div className="designer-project-feedback-grid">
        <section className="designer-project-feedback-panel">
          <div className="designer-project-feedback-panel-heading">
            <h4>Proposal Review</h4>
            <p>Statuses are loaded from proposal API.</p>
          </div>
          {proposals.length === 0 ? <p className="designer-project-empty-text">No proposals found for this project.</p> : null}
          {proposals.map((proposal) => (
            <article className="designer-project-feedback-row" key={proposal.proposalId}>
              <div>
                <strong>{proposal.proposalName}</strong>
                <span>
                  Version {proposal.versionNo} - Updated {formatDate(proposal.updatedAt)}
                </span>
              </div>
              <span className={`designer-project-status designer-project-status-${getProposalStatusTone(proposal.status)}`}>
                {formatEnumLabel(proposal.status)}
              </span>
            </article>
          ))}
        </section>

        <section className="designer-project-feedback-panel">
          <div className="designer-project-feedback-panel-heading">
            <h4>Customization Signals</h4>
            <p>Requests stay tied to proposal items.</p>
          </div>
          {requests.length === 0 ? <p className="designer-project-empty-text">No customization feedback yet.</p> : null}
          {requests.map((request) => (
            <article className="designer-project-feedback-row" key={request.customizationRequestId}>
              <div>
                <strong>{request.requestTitle}</strong>
                <span>Proposal item {request.proposalItemId}</span>
              </div>
              <span className={`designer-project-status designer-project-status-${getCustomizationStatusTone(request.status)}`}>
                {formatEnumLabel(request.status ?? 'UNKNOWN')}
              </span>
            </article>
          ))}
        </section>
      </div>

      <div className="designer-project-feedback-callout">
        <strong>Next action</strong>
        <p>Detailed review and handoff actions are handled in the Customization tab.</p>
      </div>
    </section>
  );
}

function FeedbackMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="designer-project-feedback-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function countByStatus(proposals: ProposalDto[], status: ProposalDto['status']) {
  return proposals.filter((proposal) => proposal.status === status).length;
}

function getProposalStatusTone(status: ProposalDto['status']) {
  if (status === 'SELECTED') return 'feasible';
  if (status === 'PUBLISHED' || status === 'VIEWED') return 'reviewed';
  if (status === 'REVISION_REQUESTED') return 'pending';
  if (status === 'REJECTED' || status === 'ARCHIVED') return 'missing';

  return 'draft';
}

function getCustomizationStatusTone(status?: CustomizationRequestDto['status']) {
  if (status === 'ACCEPTED' || status === 'WAITING_FOR_CUSTOMER_FINAL_APPROVAL') return 'feasible';
  if (status === 'SUBMITTED' || status === 'DESIGN_REVIEWING' || status === 'PRODUCTION_REVIEWING') return 'pending';
  if (status === 'NOT_FEASIBLE' || status === 'REJECTED_BY_CUSTOMER' || status === 'CANCELLED') return 'missing';

  return 'new';
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDate(value?: string | null) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}
