import { describe, expect, it } from 'vitest';

import {
  getLocalDateInputValue,
  getLocalDateTimeInputValue,
  getScheduleDateRangePayload,
  isValidDateOnly,
  validateOptionalFutureDate,
  validateOptionalFutureDateRange,
  validateRequiredFutureDate,
} from './dateValidation';

const now = new Date(2026, 7, 12, 10, 0, 0);

describe('dateValidation', () => {
  it('strictly validates calendar dates', () => {
    expect(isValidDateOnly('2026-02-28')).toBe(true);
    expect(isValidDateOnly('2026-02-29')).toBe(false);
    expect(isValidDateOnly('2024-02-29')).toBe(true);
    expect(isValidDateOnly('2026-13-01')).toBe(false);
    expect(isValidDateOnly('12/08/2026')).toBe(false);
  });

  it('uses the local calendar date rather than UTC', () => {
    expect(getLocalDateInputValue(now)).toBe('2026-08-12');
    expect(getLocalDateTimeInputValue(now)).toBe('2026-08-12T10:00');
  });

  it('validates optional future date-only ranges', () => {
    expect(validateOptionalFutureDateRange('', '', { now })).toEqual({ ok: true, start: null, end: null });
    expect(validateOptionalFutureDateRange('2026-08-13', '2026-08-12', { now }).ok).toBe(false);
    expect(validateOptionalFutureDateRange('2026-08-13', '2026-08-13', { now }).ok).toBe(false);
    expect(validateOptionalFutureDateRange('2026-08-13', '2026-08-14', { now })).toEqual({ ok: true, start: '2026-08-13', end: '2026-08-14' });
  });

  it('accepts an empty optional date and rejects past or impossible dates', () => {
    expect(validateOptionalFutureDate('', 'Target completion date', now)).toEqual({ ok: true, value: null });
    expect(validateOptionalFutureDate('2026-08-11', 'Target completion date', now).ok).toBe(false);
    expect(validateOptionalFutureDate('2026-02-29', 'Target completion date', now).ok).toBe(false);
    expect(validateOptionalFutureDate('2026-08-12', 'Target completion date', now)).toEqual({ ok: true, value: '2026-08-12' });
  });

  it('requires a due date', () => {
    expect(validateRequiredFutureDate('', 'Payment due date', now).ok).toBe(false);
  });

  it('converts schedule datetime-local values without enforcing schedule business rules', () => {
    const result = getScheduleDateRangePayload('2026-08-12T11:00', '2026-08-12T12:00');

    expect(new Date(result.startIso).getTime()).toBe(new Date(2026, 7, 12, 11, 0).getTime());
    expect(new Date(result.endIso ?? '').getTime()).toBe(new Date(2026, 7, 12, 12, 0).getTime());
    expect(getScheduleDateRangePayload('', 'bad-end')).toEqual({ startIso: '', endIso: 'bad-end' });
  });
});
