export type AmountValue = number | string | null | undefined;

function trimTrailingZeros(value: number) {
  return value
    .toFixed(2)
    .replace(/\.00$/, '')
    .replace(/(\.\d)0$/, '$1');
}

function parseNumericAmount(value: AmountValue) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const alreadyCompact = /[a-zA-Z万亿]/.test(trimmed);
  if (alreadyCompact && !/^-?\d[\d,]*(\.\d+)?$/.test(trimmed)) {
    return null;
  }

  const parsed = Number(trimmed.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatAmount(value: AmountValue) {
  const parsed = parseNumericAmount(value);

  if (parsed === null) {
    return typeof value === 'string' && value.trim() ? value.trim() : '0';
  }

  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(parsed);
}

export function formatCompactAmount(value: AmountValue) {
  const parsed = parseNumericAmount(value);

  if (parsed === null) {
    return typeof value === 'string' && value.trim() ? value.trim() : '0';
  }

  const absolute = Math.abs(parsed);

  if (absolute >= 100000000) {
    return `${trimTrailingZeros(parsed / 100000000)}亿`;
  }

  if (absolute >= 10000) {
    return `${trimTrailingZeros(parsed / 10000)}万`;
  }

  return formatAmount(parsed);
}
