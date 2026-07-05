import { circle, defineIcon, line, path, rect } from '../types';

export const quotationIconDefinition = defineIcon('QuotationIcon', [
  rect(5, 3, 14, 18, 2),
  line(8, 8, 16, 8),
  line(8, 12, 16, 12),
  line(8, 16, 13, 16),
]);

export const orderIconDefinition = defineIcon('OrderIcon', [
  rect(5, 4, 14, 16, 2),
  path('M9 4a3 3 0 0 1 6 0'),
  line(9, 10, 15, 10),
  line(9, 14, 15, 14),
]);

export const invoiceIconDefinition = defineIcon('InvoiceIcon', [
  path('M6 3h12v18l-3-2-3 2-3-2-3 2V3Z'),
  line(9, 8, 15, 8),
  line(9, 12, 15, 12),
  line(9, 16, 13, 16),
]);

export const paymentIconDefinition = defineIcon('PaymentIcon', [
  rect(3, 6, 18, 12, 2),
  line(3, 10, 21, 10),
  line(7, 15, 11, 15),
]);

export const walletIconDefinition = defineIcon('WalletIcon', [
  path('M4 7h14a2 2 0 0 1 2 2v9H5a2 2 0 0 1-2-2V8a3 3 0 0 1 3-3h11'),
  path('M16 12h5v4h-5a2 2 0 0 1 0-4Z'),
  circle(17.5, 14, 0.5),
]);

export const tagIconDefinition = defineIcon('TagIcon', [
  path('M4 11V5h6l10 10-5 5L4 11Z'),
  circle(8, 8, 1),
]);

export const packageIconDefinition = defineIcon('PackageIcon', [
  path('M4 8 12 4l8 4-8 4-8-4Z'),
  path('M4 8v8l8 4 8-4V8'),
  line(12, 12, 12, 20),
]);

export const truckIconDefinition = defineIcon('TruckIcon', [
  rect(3, 7, 11, 8, 1.5),
  path('M14 10h4l3 3v2h-7'),
  circle(7, 18, 2),
  circle(18, 18, 2),
  line(9, 18, 16, 18),
]);
