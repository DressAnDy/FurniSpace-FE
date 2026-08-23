import type {
  DeliveryBatchItemDto,
  DeliveryTrackingItemDto,
  DeliveryTrackingItemStatus,
  OrderItemDto,
  OrderItemStatus,
} from '@/services/api/orders';

export type OrderItemDeliveryGroup = {
  groupId: string;
  productName: string;
  orderedQuantity: number;
  deliveredQuantity: number;
  remainingQuantity: number;
  status?: OrderItemStatus | null;
  sourceItems: OrderItemDto[];
};

export type DeliveryTrackingItemGroup = DeliveryTrackingItemDto & {
  orderItemIds: string[];
};

export type DeliveryBatchItemGroup = {
  groupId: string;
  productName: string;
  quantity: number;
};

export function groupOrderItemsForDelivery(items: OrderItemDto[]) {
  const groups = new Map<string, OrderItemDeliveryGroup>();

  items.forEach((item) => {
    const groupId = getOrderItemGroupKey(item);
    const current = groups.get(groupId);
    const orderedQuantity = item.quantity ?? 0;
    const deliveredQuantity = getDeliveredQuantity(item);
    const remainingQuantity = getRemainingQuantity(item);

    if (!current) {
      groups.set(groupId, {
        deliveredQuantity,
        groupId,
        orderedQuantity,
        productName: getOrderItemName(item),
        remainingQuantity,
        sourceItems: [item],
        status: item.status,
      });
      return;
    }

    current.orderedQuantity += orderedQuantity;
    current.deliveredQuantity += deliveredQuantity;
    current.remainingQuantity += remainingQuantity;
    current.sourceItems.push(item);
    current.status = mergeOrderItemStatus(current.status, item.status, current.deliveredQuantity, current.remainingQuantity);
  });

  return Array.from(groups.values());
}

export function splitDeliveryQuantityAcrossOrderItems(group: OrderItemDeliveryGroup, quantity: number) {
  let remainingDraft = quantity;
  const items: { orderItemId: string; quantity: number }[] = [];

  for (const item of group.sourceItems) {
    if (remainingDraft <= 0) break;

    const itemRemaining = getRemainingQuantity(item);
    const itemQuantity = Math.min(itemRemaining, remainingDraft);

    if (itemQuantity > 0) {
      items.push({ orderItemId: item.orderItemId, quantity: itemQuantity });
      remainingDraft -= itemQuantity;
    }
  }

  return items;
}

export function groupDeliveryTrackingItems(items: DeliveryTrackingItemDto[]) {
  const groups = new Map<string, DeliveryTrackingItemGroup>();

  items.forEach((item) => {
    const groupId = getDeliveryTrackingItemGroupKey(item);
    const current = groups.get(groupId);

    if (!current) {
      groups.set(groupId, { ...item, orderItemIds: [item.orderItemId] });
      return;
    }

    current.orderedQuantity += item.orderedQuantity;
    current.deliveredQuantity += item.deliveredQuantity;
    current.remainingQuantity += item.remainingQuantity;
    current.orderItemIds.push(item.orderItemId);
    current.status = mergeDeliveryTrackingStatus(current.status, item.status, current.deliveredQuantity, current.remainingQuantity);
  });

  return Array.from(groups.values());
}

export function groupDeliveryBatchItems(items: DeliveryBatchItemDto[] = []) {
  const groups = new Map<string, DeliveryBatchItemGroup>();

  items.forEach((item) => {
    const productName = getDeliveryBatchItemName(item);
    const groupId = normalizeGroupKey(productName) || item.orderItemId;
    const quantity = item.deliveredQuantity ?? item.quantity ?? 0;
    const current = groups.get(groupId);

    if (!current) {
      groups.set(groupId, { groupId, productName, quantity });
      return;
    }

    current.quantity += quantity;
  });

  return Array.from(groups.values());
}

export function getOrderItemName(item: Pick<OrderItemDto, 'itemName' | 'productNameSnapshot' | 'productVersionNameSnapshot'>) {
  return item.itemName ?? item.productVersionNameSnapshot ?? item.productNameSnapshot ?? '-';
}

export function getDeliveredQuantity(item: OrderItemDto) {
  if (typeof item.deliveredQuantity === 'number') return item.deliveredQuantity;
  return item.status === 'DELIVERED' ? item.quantity ?? 0 : 0;
}

export function getRemainingQuantity(item: OrderItemDto) {
  if (typeof item.remainingDeliveryQuantity === 'number') return Math.max(item.remainingDeliveryQuantity, 0);
  return Math.max((item.quantity ?? 0) - getDeliveredQuantity(item), 0);
}

function getOrderItemGroupKey(item: OrderItemDto) {
  return (
    item.productVersionId ||
    item.productVersionCodeSnapshot ||
    normalizeGroupKey(`${item.productNameSnapshot ?? ''} ${item.productVersionNameSnapshot ?? ''} ${item.itemName ?? ''}`) ||
    item.orderItemId
  );
}

function getDeliveryTrackingItemGroupKey(item: DeliveryTrackingItemDto) {
  return normalizeGroupKey(item.productName) || item.orderItemId;
}

function getDeliveryBatchItemName(item: DeliveryBatchItemDto) {
  return item.productName ?? item.productNameSnapshot ?? item.itemName ?? 'Item';
}

function normalizeGroupKey(value?: string | null) {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function mergeOrderItemStatus(
  currentStatus: OrderItemStatus | null | undefined,
  nextStatus: OrderItemStatus | null | undefined,
  deliveredQuantity: number,
  remainingQuantity: number,
) {
  if (remainingQuantity <= 0) return 'DELIVERED';
  if (deliveredQuantity > 0) return 'PARTIALLY_DELIVERED';
  if (currentStatus === 'UNAVAILABLE' || nextStatus === 'UNAVAILABLE') return 'UNAVAILABLE';
  if (currentStatus === 'CANCELLED' || nextStatus === 'CANCELLED') return 'CANCELLED';
  return currentStatus ?? nextStatus ?? 'READY';
}

function mergeDeliveryTrackingStatus(
  currentStatus: DeliveryTrackingItemStatus | null | undefined,
  nextStatus: DeliveryTrackingItemStatus | null | undefined,
  deliveredQuantity: number,
  remainingQuantity: number,
) {
  if (remainingQuantity <= 0) return 'DELIVERED';
  if (deliveredQuantity > 0) return 'PARTIALLY_DELIVERED';
  if (currentStatus === 'UNAVAILABLE' || nextStatus === 'UNAVAILABLE') return 'UNAVAILABLE';
  if (currentStatus === 'CANCELLED' || nextStatus === 'CANCELLED') return 'CANCELLED';
  return currentStatus ?? nextStatus ?? 'READY';
}
