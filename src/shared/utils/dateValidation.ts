const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

export type ScheduleDateValidationOptions = {
  allowPastStart?: boolean;
  now?: Date;
  requireEnd?: boolean;
};

export type ScheduleDateValidationResult =
  | { ok: true; startIso: string; endIso: string | null }
  | { ok: false; message: string };

export type FutureDateRangeValidationResult =
  | { ok: true; start: string | null; end: string | null }
  | { ok: false; message: string };

export function getLocalDateInputValue(value = new Date()) {
  return formatLocalDateParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
}

export function getLocalDateTimeInputValue(value = new Date()) {
  return `${getLocalDateInputValue(value)}T${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

export function getMinimumEndDateTimeInputValue(startValue: string, minimumGapMinutes = 1) {
  const start = parseLocalDateTime(startValue);
  if (!start) return '';

  return getLocalDateTimeInputValue(new Date(start.getTime() + minimumGapMinutes * 60_000));
}

export function isValidDateOnly(value: string) {
  const match = DATE_ONLY_PATTERN.exec(value.trim());
  if (!match) return false;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  return date.getFullYear() === Number(year)
    && date.getMonth() === Number(month) - 1
    && date.getDate() === Number(day);
}

export function validateOptionalFutureDate(
  value: string | null | undefined,
  label: string,
  now = new Date(),
) {
  const normalized = value?.trim() ?? '';
  if (!normalized) return { ok: true as const, value: null };
  if (!isValidDateOnly(normalized)) {
    return { ok: false as const, message: `${label} is not a valid calendar date.` };
  }
  if (normalized < getLocalDateInputValue(now)) {
    return { ok: false as const, message: `${label} cannot be in the past.` };
  }

  return { ok: true as const, value: normalized };
}

export function validateRequiredFutureDate(
  value: string | null | undefined,
  label: string,
  now = new Date(),
): { ok: true; value: string } | { ok: false; message: string } {
  const normalized = value?.trim() ?? '';
  if (!normalized) return { ok: false as const, message: `${label} is required.` };

  const result = validateOptionalFutureDate(normalized, label, now);
  if (!result.ok) return result;

  return { ok: true, value: normalized };
}

export function validateOptionalFutureDateRange(
  startValue: string | null | undefined,
  endValue: string | null | undefined,
  options: { startLabel?: string; endLabel?: string; now?: Date } = {},
): FutureDateRangeValidationResult {
  const startLabel = options.startLabel ?? 'Start date';
  const endLabel = options.endLabel ?? 'End date';
  const start = validateOptionalFutureDate(startValue, startLabel, options.now);
  if (!start.ok) return start;
  const end = validateOptionalFutureDate(endValue, endLabel, options.now);
  if (!end.ok) return end;
  if (start.value && end.value && end.value < start.value) {
    return { ok: false, message: `${endLabel} cannot be before ${startLabel.toLowerCase()}.` };
  }
  return { ok: true, start: start.value, end: end.value };
}

export function validateScheduleDateRange(
  startValue: string,
  endValue: string,
  options: ScheduleDateValidationOptions = {},
): ScheduleDateValidationResult {
  const start = parseLocalDateTime(startValue);
  const end = endValue.trim() ? parseLocalDateTime(endValue) : null;
  const now = options.now ?? new Date();

  if (!startValue.trim()) return { ok: false, message: 'Please choose a schedule start time.' };
  if (!start) return { ok: false, message: 'Schedule start time is invalid.' };
  if (options.requireEnd && !endValue.trim()) return { ok: false, message: 'Please choose a schedule end time.' };
  if (endValue.trim() && !end) return { ok: false, message: 'Schedule end time is invalid.' };
  if (!options.allowPastStart && start.getTime() <= now.getTime()) {
    return { ok: false, message: 'Schedule start time must be in the future.' };
  }
  if (end && end.getTime() <= start.getTime()) {
    return { ok: false, message: 'Schedule end time must be after the start time.' };
  }

  return { ok: true, startIso: start.toISOString(), endIso: end?.toISOString() ?? null };
}

function parseLocalDateTime(value: string) {
  const match = LOCAL_DATE_TIME_PATTERN.exec(value.trim());
  if (!match) return null;

  const [, year, month, day, hour, minute, second = '0'] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));

  if (date.getFullYear() !== Number(year)
    || date.getMonth() !== Number(month) - 1
    || date.getDate() !== Number(day)
    || date.getHours() !== Number(hour)
    || date.getMinutes() !== Number(minute)
    || date.getSeconds() !== Number(second)) return null;

  return date;
}

function formatLocalDateParts(year: number, month: number, day: number) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
