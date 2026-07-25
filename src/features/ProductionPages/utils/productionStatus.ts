export const getCustomizationStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    SUBMITTED: 'Submitted',
    DESIGN_REVIEWING: 'Design Reviewing',
    PRODUCTION_REVIEWING: 'Production Reviewing',
    WAITING_FOR_CUSTOMER_FINAL_APPROVAL: 'Waiting Customer Approval',
    NOT_FEASIBLE: 'Not Feasible',
    ACCEPTED: 'Accepted',
    REJECTED_BY_CUSTOMER: 'Rejected by Customer',
    CANCELLED: 'Cancelled',
  };

  return labels[status] ?? status;
};

export const getProductionRequestStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    PENDING_REVIEW: 'Pending Review',
    FEASIBLE: 'Feasible',
    IN_PRODUCTION: 'In Production',
    COMPLETED: 'Completed',
    BLOCKED: 'Blocked',
    CANCELLED: 'Cancelled',
  };

  return labels[status] ?? status;
};

export const getProductionItemStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    PENDING: 'Pending',
    IN_PRODUCTION: 'In Production',
    COMPLETED: 'Completed',
    BLOCKED: 'Blocked',
    CANCELLED: 'Cancelled',
  };

  return labels[status] ?? status;
};

export const getProductionStatusTone = (status: string) => {
  if (status === 'COMPLETED' || status === 'ACCEPTED' || status === 'FEASIBLE') {
    return 'success';
  }

  if (status === 'BLOCKED' || status === 'CANCELLED' || status === 'NOT_FEASIBLE' || status === 'UNAVAILABLE') {
    return 'danger';
  }

  if (
    status === 'WAITING_FOR_CUSTOMER_FINAL_APPROVAL' ||
    status === 'PENDING_REVIEW' ||
    status === 'PENDING' ||
    status === 'UNKNOWN'
  ) {
    return 'warning';
  }

  return 'neutral';
};

export const productionRequestAllowedActions: Record<string, string[]> = {
  PENDING_REVIEW: ['Mark Feasible', 'Mark Blocked', 'Cancel'],
  FEASIBLE: ['Start Production', 'Mark Blocked'],
  IN_PRODUCTION: ['Complete', 'Mark Blocked'],
  BLOCKED: ['Resolve Blocked', 'Cancel'],
  COMPLETED: [],
  CANCELLED: [],
};
