const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

export type ScheduleDateRangePayload = {
  startIso: string;
  endIso: string | null;
};

export const SCHEDULE_TIME_INVALID_MESSAGE = 'Schedule start and end must be a valid time window with end after start.';
export const SCHEDULE_OUTSIDE_BUSINESS_HOURS_MESSAGE = 'Schedule time must be between 06:00 and 22:00 Vietnam time.';

export type FutureDateRangeValidationResult =
  | { ok: true; start: string | null; end: string | null }
  | { ok: false; message: string };

export type ScheduleDateTimeRangeValidationResult =
  | { ok: true; startIso: string; endIso: string | null }
  | { ok: false; message: string };

export function getLocalDateInputValue(value = new Date()) {
  return formatLocalDateParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
}

export function getMinimumEndDateInputValue(startValue: string, minimumGapDays = 1) {
  const match = DATE_ONLY_PATTERN.exec(startValue.trim());
  if (!match) return '';

  const [, year, month, day] = match;
  const start = new Date(Number(year), Number(month) - 1, Number(day));
  if (start.getFullYear() !== Number(year)
    || start.getMonth() !== Number(month) - 1
    || start.getDate() !== Number(day)) return '';

  start.setDate(start.getDate() + minimumGapDays);
  return getLocalDateInputValue(start);
}

export function getLocalDateTimeInputValue(value = new Date()) {
  return `${getLocalDateInputValue(value)}T${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

export function getDefaultPaymentExpiredAt(daysFromNow = 3, now = new Date()) {
  const deadline = new Date(now);
  deadline.setDate(deadline.getDate() + daysFromNow);

  return deadline.toISOString();
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
  if (start.value && end.value && end.value <= start.value) {
    return { ok: false, message: `${endLabel} must be after ${startLabel.toLowerCase()}.` };
  }
  return { ok: true, start: start.value, end: end.value };
}

export function getScheduleDateRangePayload(startValue: string, endValue: string): ScheduleDateRangePayload {
  const normalizedStart = startValue.trim();
  const normalizedEnd = endValue.trim();
  const start = parseLocalDateTime(normalizedStart);
  const end = normalizedEnd ? parseLocalDateTime(normalizedEnd) : null;

  return {
    startIso: start ? start.toISOString() : normalizedStart,
    endIso: normalizedEnd ? end?.toISOString() ?? normalizedEnd : null,
  };
}

export function validateScheduleDateTimeRange(
  startValue: string,
  endValue: string,
  options: { requireEnd?: boolean } = {},
): ScheduleDateTimeRangeValidationResult {
  const normalizedStart = startValue.trim();
  const normalizedEnd = endValue.trim();
  const start = parseLocalDateTime(normalizedStart);
  const end = normalizedEnd ? parseLocalDateTime(normalizedEnd) : null;

  if (!normalizedStart || !start || (normalizedEnd && !end)) {
    return { ok: false, message: SCHEDULE_TIME_INVALID_MESSAGE };
  }

  if (options.requireEnd && !end) {
    return { ok: false, message: SCHEDULE_TIME_INVALID_MESSAGE };
  }

  if (end && end.getTime() <= start.getTime()) {
    return { ok: false, message: SCHEDULE_TIME_INVALID_MESSAGE };
  }

  if (!isWithinVietnamScheduleHours(start) || (end && !isWithinVietnamScheduleHours(end))) {
    return { ok: false, message: SCHEDULE_OUTSIDE_BUSINESS_HOURS_MESSAGE };
  }

  return {
    ok: true,
    startIso: start.toISOString(),
    endIso: end ? end.toISOString() : null,
  };
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

function isWithinVietnamScheduleHours(value: Date) {
  const minutes = value.getHours() * 60 + value.getMinutes();

  return minutes >= 6 * 60 && minutes <= 22 * 60;
}

function formatLocalDateParts(year: number, month: number, day: number) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
