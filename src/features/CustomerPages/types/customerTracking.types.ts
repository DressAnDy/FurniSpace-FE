export type ProjectStatus =
  | 'SUBMITTED'
  | 'IN_CONSULTATION'
  | 'NEED_BASIC_INFORMATION'
  | 'WAITING_FOR_DESIGNER_ASSIGNMENT'
  | 'MEASUREMENT_REQUIRED'
  | 'SPACE_VERIFIED'
  | 'PROPOSAL_CONSULTING'
  | 'PROPOSAL_SELECTED'
  | 'QUOTATION_SENT'
  | 'QUOTATION_REVISION_REQUESTED'
  | 'ORDER_CONFIRMED'
  | 'IN_PRODUCTION'
  | 'READY_FOR_DELIVERY'
  | 'DELIVERING'
  | 'AWAITING_CUSTOMER_CONFIRMATION'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'REJECTED';

export type PaymentType = 'PROJECT_START_FEE' | 'DEPOSIT' | 'REMAINING_PAYMENT';
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED';
export type PaymentTransactionType = 'CHARGE' | 'REFUND' | 'ADJUSTMENT';
export type PaymentTransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

export interface CustomerTrackingProject {
  projectId: string;
  projectCode: string;
  projectName: string;
  businessType: string;
  projectAddress?: string;
  budgetMin?: number;
  budgetMax?: number;
  targetCompletionDate?: string;
  status: ProjectStatus;
  currentStep: string;
  nextActionTitle?: string;
  nextActionDescription?: string;
  nextActionLabel?: string;
}

export interface CustomerPayment {
  paymentId: string;
  projectId: string;
  projectName: string;
  orderId?: string;
  orderCode?: string;
  quotationId?: string;
  quotationCode?: string;
  paymentCode: string;
  paymentType: PaymentType;
  amount: number;
  currency: string;
  status: PaymentStatus;
  expiredAt?: string;
  paidAt?: string;
  cancelledAt?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  transactions: CustomerPaymentTransaction[];
}

export interface CustomerPaymentTransaction {
  paymentTransactionId: string;
  paymentId: string;
  transactionCode: string;
  transactionType: PaymentTransactionType;
  amount: number;
  currency: string;
  paymentProvider?: 'PAYOS' | 'SEPAY' | 'CASH' | 'MANUAL_BANK_TRANSFER' | 'OTHER';
  paymentMethod?: 'PAYMENT_LINK' | 'QR_CODE' | 'BANK_TRANSFER' | 'CASH' | 'OTHER';
  providerTransactionId?: string;
  providerReferenceCode?: string;
  status: PaymentTransactionStatus;
  paymentUrl?: string;
  qrContent?: string;
  transactionTime?: string;
  failureReason?: string;
  createdAt: string;
}

export interface CustomerProjectReview {
  reviewId: string;
  projectId: string;
  orderId?: string;
  customerId: string;
  rating: number;
  designQualityRating: number;
  serviceQualityRating: number;
  deliveryRating: number;
  comment?: string;
  createdAt: string;
  updatedAt?: string;
}

export type CustomerProductionItemStatus = 'PENDING' | 'IN_PRODUCTION' | 'COMPLETED' | 'CANCELLED';

export interface CustomerProductionTrackingItem {
  productionItemId: string;
  productNameSnapshot: string;
  productVersionNameSnapshot?: string;
  quantity: number;
  status: CustomerProductionItemStatus;
  materialNote?: string;
  productionNote?: string;
  cancellationReason?: string;
  completedAt?: string;
}

export interface CustomerProductionTrackingRequest {
  productionRequestId: string;
  productionCode: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  orderId: string;
  orderCode: string;
  status: ProjectStatus;
  productionDeadline?: string;
  actualCompletionDate?: string;
  deliveryScheduleDate?: string;
  note?: string;
  items: CustomerProductionTrackingItem[];
}
