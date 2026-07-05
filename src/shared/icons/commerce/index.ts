import { createIcon } from '../renderers';
import {
  invoiceIconDefinition,
  orderIconDefinition,
  packageIconDefinition,
  paymentIconDefinition,
  quotationIconDefinition,
  tagIconDefinition,
  truckIconDefinition,
  walletIconDefinition,
} from './definitions';

export const QuotationIcon = createIcon(quotationIconDefinition);
export const OrderIcon = createIcon(orderIconDefinition);
export const InvoiceIcon = createIcon(invoiceIconDefinition);
export const PaymentIcon = createIcon(paymentIconDefinition);
export const WalletIcon = createIcon(walletIconDefinition);
export const TagIcon = createIcon(tagIconDefinition);
export const PackageIcon = createIcon(packageIconDefinition);
export const TruckIcon = createIcon(truckIconDefinition);

export {
  invoiceIconDefinition,
  orderIconDefinition,
  packageIconDefinition,
  paymentIconDefinition,
  quotationIconDefinition,
  tagIconDefinition,
  truckIconDefinition,
  walletIconDefinition,
};
