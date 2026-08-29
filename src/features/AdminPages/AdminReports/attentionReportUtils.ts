import type { AdminFinancialExceptionRowDto } from '@/services/api/adminFinancial';

export function moneyExceptionKey(item: AdminFinancialExceptionRowDto, index: number) {
  return `${item.exceptionType}-${item.targetResourceId ?? item.paymentId ?? item.orderId ?? item.projectId ?? index}`;
}
