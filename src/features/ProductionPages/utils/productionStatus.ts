export const getCustomizationStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    SUBMITTED: 'Submitted',
    REVIEWING: 'Reviewing',
    REVIEWING_PENDING: 'Pending Production Review',
    REVIEWING_FEASIBLE: 'Feasible - Waiting Customer',
    PRODUCTION_REJECTED_NOT_FEASIBLE: 'Production Rejected',
    DRAFT_PENDING: 'Draft',
    ACCEPTED: 'Accepted',
    WITHDRAWN: 'Withdrawn',
    CANCELLED: 'Cancelled',
  };

  return labels[status] ?? status;
};

export const getProductionRequestStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    PENDING: 'Pending',
    IN_PRODUCTION: 'In Production',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };

  return labels[status] ?? status;
};

export const getProductionItemStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    PENDING: 'Pending',
    IN_PRODUCTION: 'In Production',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };

  return labels[status] ?? status;
};

export const getProductionStatusTone = (status: string) => {
  if (status === 'COMPLETED' || status === 'ACCEPTED' || status === 'FEASIBLE') {
    return 'success';
  }

  if (status === 'CANCELLED' || status === 'NOT_FEASIBLE' || status === 'UNAVAILABLE' || status === 'PRODUCTION_REJECTED') {
    return 'danger';
  }

  if (
    status === 'PENDING' ||
    status === 'UNKNOWN'
  ) {
    return 'warning';
  }

  return 'neutral';
};

export const productionRequestAllowedActions: Record<string, string[]> = {
  PENDING: ['Start Production', 'Cancel'],
  IN_PRODUCTION: ['Complete'],
  COMPLETED: [],
  CANCELLED: [],
};
