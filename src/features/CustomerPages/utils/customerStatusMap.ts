import type { PaymentStatus, PaymentType, ProjectStatus } from '../types';

export const projectStatusStepMap: Record<ProjectStatus, string> = {
  SUBMITTED: 'Request Submitted',
  IN_CONSULTATION: 'Consultation',
  NEED_BASIC_INFORMATION: 'Consultation',
  WAITING_FOR_DESIGNER_ASSIGNMENT: 'Designer Assignment',
  MEASUREMENT_REQUIRED: 'Space Verification',
  SPACE_VERIFIED: 'Space Verification',
  PROPOSAL_CONSULTING: 'Proposal Consulting',
  PROPOSAL_SELECTED: 'Proposal Consulting',
  QUOTATION_SENT: 'Quotation',
  QUOTATION_REVISION_REQUESTED: 'Quotation',
  ORDER_CONFIRMED: 'Order Confirmed',
  IN_PRODUCTION: 'Production',
  PRODUCTION_BLOCKED: 'Production',
  READY_FOR_DELIVERY: 'Delivery',
  DELIVERING: 'Delivery',
  DELIVERED: 'Delivery',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
};

export const journeySteps = [
  'Request Submitted',
  'Consultation',
  'Designer Assignment',
  'Space Verification',
  'Proposal Consulting',
  'Quotation',
  'Order Confirmed',
  'Production',
  'Delivery',
  'Completed',
];

export const paymentTypeLabels: Record<PaymentType, string> = {
  PROJECT_START_FEE: 'Project Start Fee',
  DEPOSIT: 'Deposit',
  REMAINING_PAYMENT: 'Remaining Payment',
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  PAID: 'Paid',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
  REFUNDED: 'Refunded',
};

export function getCustomerStatusTone(status: string) {
  if (['PAID', 'SUCCESS', 'COMPLETED', 'DELIVERED', 'READY_FOR_DELIVERY'].includes(status)) return 'success';
  if (['PENDING', 'PROCESSING', 'QUOTATION_SENT', 'PROPOSAL_CONSULTING'].includes(status)) return 'warning';
  if (['FAILED', 'CANCELLED', 'EXPIRED', 'REJECTED', 'PRODUCTION_BLOCKED'].includes(status)) return 'danger';

  return 'neutral';
}

export function getProjectStatusLabel(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
