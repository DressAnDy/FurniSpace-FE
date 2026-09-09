import type { Lang } from '@/app/providers/useLang';
import type { PaymentStatus, PaymentType, ProjectStatus } from '../types';
import { customerCopy } from '../customercomponents/customerI18n';

export const journeyStepKeys = [
  'requestSubmitted',
  'consultation',
  'designerAssignment',
  'spaceVerification',
  'proposalConsulting',
  'quotation',
  'orderConfirmed',
  'production',
  'delivery',
  'completed',
] as const;

export type CustomerJourneyStepKey = (typeof journeyStepKeys)[number];

export const projectStatusStepKeys: Record<ProjectStatus, CustomerJourneyStepKey> = {
  SUBMITTED: 'requestSubmitted',
  IN_CONSULTATION: 'consultation',
  NEED_BASIC_INFORMATION: 'consultation',
  WAITING_FOR_DESIGNER_ASSIGNMENT: 'designerAssignment',
  MEASUREMENT_REQUIRED: 'spaceVerification',
  SPACE_VERIFIED: 'spaceVerification',
  PROPOSAL_CONSULTING: 'proposalConsulting',
  PROPOSAL_SELECTED: 'proposalConsulting',
  QUOTATION_SENT: 'quotation',
  QUOTATION_REVISION_REQUESTED: 'quotation',
  ORDER_CONFIRMED: 'orderConfirmed',
  IN_PRODUCTION: 'production',
  READY_FOR_DELIVERY: 'delivery',
  DELIVERING: 'delivery',
  AWAITING_CUSTOMER_CONFIRMATION: 'delivery',
  DELIVERED: 'delivery',
  COMPLETED: 'completed',
  REJECTED: 'completed',
};

/** @deprecated Prefer getJourneySteps(lang) for localized labels. */
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
  READY_FOR_DELIVERY: 'Delivery',
  DELIVERING: 'Delivery',
  AWAITING_CUSTOMER_CONFIRMATION: 'Delivery',
  DELIVERED: 'Delivery',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
};

/** @deprecated Prefer getJourneySteps(lang) for localized labels. */
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

/** @deprecated Prefer getPaymentTypeLabel(type, lang). */
export const paymentTypeLabels: Record<PaymentType, string> = {
  PROJECT_START_FEE: 'Project Start Fee',
  DEPOSIT: 'Deposit',
  REMAINING_PAYMENT: 'Remaining Payment',
};

/** @deprecated Prefer getPaymentStatusLabel(status, lang). */
export const paymentStatusLabels: Record<PaymentStatus, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  PAID: 'Paid',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
  REFUNDED: 'Refunded',
};

export function getJourneySteps(lang: Lang = 'en') {
  const journey = customerCopy[lang].journey;
  return journeyStepKeys.map((key) => journey[key]);
}

export function getProjectStatusStepLabel(status: ProjectStatus, lang: Lang = 'en') {
  return customerCopy[lang].journey[projectStatusStepKeys[status]];
}

export function getPaymentTypeLabel(type: PaymentType, lang: Lang = 'en') {
  return customerCopy[lang].paymentType[type];
}

export function getPaymentStatusLabel(status: PaymentStatus, lang: Lang = 'en') {
  return customerCopy[lang].paymentStatus[status];
}

export function getCustomerProjectStatusLabel(status: string, lang: Lang = 'en') {
  const known = customerCopy[lang].status[status as keyof typeof customerCopy.en.status];
  if (known) return known;
  return getProjectStatusLabel(status);
}

export function getCustomerStatusTone(status: string) {
  if (['PAID', 'SUCCESS', 'COMPLETED', 'DELIVERED', 'READY_FOR_DELIVERY'].includes(status)) return 'success';
  if (['AWAITING_CUSTOMER_CONFIRMATION', 'PHYSICALLY_DELIVERED'].includes(status)) return 'warning';
  if (['PENDING', 'PROCESSING', 'QUOTATION_SENT', 'PROPOSAL_CONSULTING'].includes(status)) return 'warning';
  if (['FAILED', 'CANCELLED', 'EXPIRED', 'REJECTED'].includes(status)) return 'danger';

  return 'neutral';
}

export function getProjectStatusLabel(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
