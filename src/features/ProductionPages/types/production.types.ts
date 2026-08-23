export type CustomizationStatus =
  | 'SUBMITTED'
  | 'REVIEWING'
  | 'ACCEPTED'
  | 'CANCELLED';

export type MaterialAvailability = 'AVAILABLE' | 'UNAVAILABLE' | 'UNKNOWN';

export type ProductionRequestStatus =
  | 'PENDING'
  | 'IN_PRODUCTION'
  | 'COMPLETED'
  | 'CANCELLED';

export type ProductionItemStatus =
  | 'PENDING'
  | 'IN_PRODUCTION'
  | 'COMPLETED'
  | 'CANCELLED';

export type Priority = 'LOW' | 'MEDIUM' | 'NORMAL' | 'HIGH' | 'URGENT';

export type ProductionRelatedProjectStatus =
  | 'IN_PRODUCTION'
  | 'READY_FOR_DELIVERY'
  | 'DELIVERING'
  | 'DELIVERED'
  | 'COMPLETED';

export interface ProductionCustomizationRequest {
  customizationRequestId: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  proposalId: string;
  proposalName: string;
  proposalItemId: string;
  itemName: string;
  requestedByCustomerName: string;
  requestTitle: string;
  requestDescription: string;
  requestedWidth?: number;
  requestedHeight?: number;
  requestedDepth?: number;
  requestedMaterial?: string;
  requestedColor?: string;
  requestedChangeNote?: string;
  designerId?: string;
  designerName?: string;
  designerSpecNote?: string;
  productionReviewBy?: string;
  feasibilityNote?: string;
  estimatedProductionDays?: number;
  estimatedAdditionalCost?: number;
  additionalCostReason?: string;
  materialAvailable?: boolean;
  materialAvailability: MaterialAvailability;
  productionRiskNote?: string;
  approvedProductVersionId?: string;
  status: CustomizationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionRequest {
  productionRequestId: string;
  productionCode: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  orderId: string;
  orderCode: string;
  assignedTo?: string;
  assignedToName?: string;
  status: ProductionRequestStatus;
  priority: Priority;
  estimatedStartDate?: string;
  estimatedCompletionDate?: string;
  actualStartDate?: string;
  actualCompletionDate?: string;
  cancellationReason?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  items: ProductionItem[];
}

export interface ProductionItem {
  productionItemId: string;
  productionRequestId: string;
  orderItemId: string;
  productVersionId?: string;
  productNameSnapshot: string;
  productVersionNameSnapshot?: string;
  quantity: number;
  startAt?: string;
  startedAt?: string;
  status: ProductionItemStatus;
  materialNote?: string;
  productionNote?: string;
  cancellationReason?: string;
  estimatedCompletionDate?: string;
  completedAt?: string;
}
