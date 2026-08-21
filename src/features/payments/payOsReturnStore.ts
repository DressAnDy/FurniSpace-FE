const PAYOS_RETURN_STORE_KEY = 'furnispace:payos-return-links';
const MAX_STORED_PAYOS_LINKS = 30;

export type StoredPayOsReturnLink = {
  orderCode: string;
  paymentId: string;
  paymentCode: string;
  createdAt: string;
};

export type PayOsReturnLookup = {
  orderCode?: string | null;
  paymentId?: string | null;
  paymentCode?: string | null;
};

export function rememberPayOsReturnLink(input: {
  orderCode: number | string;
  paymentId: string;
  paymentCode: string;
}) {
  const orderCode = String(input.orderCode || '').trim();
  const paymentId = input.paymentId.trim();
  const paymentCode = input.paymentCode.trim();

  if (!orderCode || !paymentId || !paymentCode) {
    return;
  }

  const currentLinks = readPayOsReturnLinks().filter(
    (link) => link.orderCode !== orderCode && link.paymentId !== paymentId && link.paymentCode !== paymentCode,
  );

  writePayOsReturnLinks([
    {
      orderCode,
      paymentId,
      paymentCode,
      createdAt: new Date().toISOString(),
    },
    ...currentLinks,
  ].slice(0, MAX_STORED_PAYOS_LINKS));
}

export function resolvePayOsReturnLink(input: PayOsReturnLookup) {
  const orderCode = input.orderCode?.trim();
  const paymentId = input.paymentId?.trim();
  const paymentCode = input.paymentCode?.trim();

  if (!orderCode && !paymentId && !paymentCode) {
    return null;
  }

  return (
    readPayOsReturnLinks().find(
      (link) =>
        (orderCode && link.orderCode === orderCode) ||
        (paymentId && link.paymentId === paymentId) ||
        (paymentCode && link.paymentCode === paymentCode),
    ) ?? null
  );
}

function readPayOsReturnLinks(): StoredPayOsReturnLink[] {
  if (!canUseLocalStorage()) {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(PAYOS_RETURN_STORE_KEY) || '[]');

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isStoredPayOsReturnLink);
  } catch {
    return [];
  }
}

function writePayOsReturnLinks(links: StoredPayOsReturnLink[]) {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(PAYOS_RETURN_STORE_KEY, JSON.stringify(links));
  } catch {
    // Ignore storage quota/private-mode failures; redirect pages can still read query params.
  }
}

function isStoredPayOsReturnLink(value: unknown): value is StoredPayOsReturnLink {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<StoredPayOsReturnLink>;

  return (
    typeof candidate.orderCode === 'string' &&
    typeof candidate.paymentId === 'string' &&
    typeof candidate.paymentCode === 'string' &&
    typeof candidate.createdAt === 'string'
  );
}

function canUseLocalStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}
