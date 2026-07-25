export function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatMoney(value?: number | null) {
  if (typeof value !== 'number') return '-';

  return `${new Intl.NumberFormat('vi-VN').format(value)} VND`;
}

export function formatDimensions(width?: number | null, height?: number | null, depth?: number | null) {
  const values = [
    width ? `W ${width}` : null,
    height ? `H ${height}` : null,
    depth ? `D ${depth}` : null,
  ].filter(Boolean);

  return values.length > 0 ? `${values.join(' x ')} cm` : '-';
}
