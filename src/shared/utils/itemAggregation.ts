type AggregatableItem = {
  colorSnapshot?: string | null;
  customizationAdditionalCost?: number | null;
  customizationNote?: string | null;
  depthSnapshot?: number | null;
  deliveredQuantity?: number | null;
  deliveryNote?: string | null;
  dimensionUnit?: string | null;
  discountAmount?: number | null;
  heightSnapshot?: number | null;
  itemName?: string | null;
  itemType?: string | null;
  materialSnapshot?: string | null;
  note?: string | null;
  productNameSnapshot?: string | null;
  productVersionCodeSnapshot?: string | null;
  productVersionId?: string | null;
  productVersionNameSnapshot?: string | null;
  quantity?: number | null;
  subtotalAmount?: number | null;
  unitPrice?: number | null;
  unitPriceSnapshot?: number | null;
  versionNameSnapshot?: string | null;
  widthSnapshot?: number | null;
};

export function aggregateDuplicateItems<T extends AggregatableItem>(items: T[]) {
  const itemsBySample = new Map<string, T>();

  for (const item of items) {
    const key = getItemAggregateKey(item);
    const existingItem = itemsBySample.get(key);

    if (!existingItem) {
      itemsBySample.set(key, { ...item });
      continue;
    }

    existingItem.quantity = sumOptionalNumbers(existingItem.quantity, item.quantity);
    existingItem.discountAmount = sumOptionalNumbers(existingItem.discountAmount, item.discountAmount);
    existingItem.deliveredQuantity = sumOptionalNumbers(existingItem.deliveredQuantity, item.deliveredQuantity);
    existingItem.subtotalAmount = sumOptionalNumbers(existingItem.subtotalAmount, item.subtotalAmount);
    existingItem.customizationNote = mergeTextValues(existingItem.customizationNote, item.customizationNote);
    existingItem.deliveryNote = mergeTextValues(existingItem.deliveryNote, item.deliveryNote);
    existingItem.note = mergeTextValues(existingItem.note, item.note);
  }

  return Array.from(itemsBySample.values());
}

function getItemAggregateKey(item: AggregatableItem) {
  const sampleKey =
    item.productVersionId ??
    item.productVersionCodeSnapshot ??
    item.productVersionNameSnapshot ??
    item.versionNameSnapshot ??
    item.productNameSnapshot ??
    item.itemName ??
    'UNKNOWN_ITEM';

  return [
    item.itemType ?? 'UNKNOWN_TYPE',
    sampleKey,
    item.materialSnapshot ?? 'NO_MATERIAL',
    item.colorSnapshot ?? 'NO_COLOR',
    item.widthSnapshot ?? 'NO_WIDTH',
    item.heightSnapshot ?? 'NO_HEIGHT',
    item.depthSnapshot ?? 'NO_DEPTH',
    item.dimensionUnit ?? 'NO_DIMENSION_UNIT',
    item.unitPrice ?? item.unitPriceSnapshot ?? 'NO_UNIT_PRICE',
    item.customizationAdditionalCost ?? 'NO_CUSTOMIZATION_COST',
    item.customizationNote ?? 'NO_CUSTOMIZATION_NOTE',
    item.note ?? 'NO_NOTE',
  ].join('|');
}

function sumOptionalNumbers(first?: number | null, second?: number | null) {
  if (typeof first !== 'number' && typeof second !== 'number') return null;

  return (first ?? 0) + (second ?? 0);
}

function mergeTextValues(first?: string | null, second?: string | null) {
  const values = [first, second].filter((value): value is string => Boolean(value?.trim()));
  const uniqueValues = Array.from(new Set(values));

  return uniqueValues.length > 0 ? uniqueValues.join('; ') : null;
}
