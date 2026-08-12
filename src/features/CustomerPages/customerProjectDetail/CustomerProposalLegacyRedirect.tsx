import { Navigate, useParams, useSearchParams } from 'react-router-dom';

export function CustomerProposalLegacyRedirect() {
  const { proposalId } = useParams();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');

  if (projectId) {
    const query = proposalId ? `?proposalId=${encodeURIComponent(proposalId)}` : '';

    return <Navigate to={`/customer/projects/${projectId}${query}`} replace />;
  }

  return <Navigate to="/customer/projects" replace />;
}
