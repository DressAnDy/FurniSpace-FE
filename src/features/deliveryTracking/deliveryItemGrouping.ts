import type { OrderItemDto } from '@/services/api/orders';

export function getOrderItemName(item: Pick<OrderItemDto, 'itemName' | 'productNameSnapshot' | 'productVersionNameSnapshot'>) {
  return item.itemName ?? item.productVersionNameSnapshot ?? item.productNameSnapshot ?? '-';
}

export function getDeliveredQuantity(item: OrderItemDto) {
  if (typeof item.deliveredQuantity === 'number') return item.deliveredQuantity;
  return item.status === 'DELIVERED' || item.status === 'PHYSICALLY_DELIVERED' ? item.quantity ?? 0 : 0;
}

export function getRemainingQuantity(item: OrderItemDto) {
  if (typeof item.remainingDeliveryQuantity === 'number') return Math.max(item.remainingDeliveryQuantity, 0);
  return Math.max((item.quantity ?? 0) - getDeliveredQuantity(item), 0);
}
