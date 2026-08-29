import { describe, expect, it } from 'vitest';

import {
  PROJECT_BUDGET_MAX,
  PROJECT_BUDGET_MIN,
  formatProjectRequestMoneyInput,
  getProjectSpaceAndBudgetFieldErrors,
  parseOptionalProjectRequestMoney,
  parseOptionalProjectRequestNumber,
  sanitizeProjectRequestDecimalInput,
  sanitizeProjectRequestIntegerInput,
  validateOptionalBudgetMax,
  validateOptionalBudgetMin,
  validateOptionalNonNegativeInteger,
  validateOptionalNonNegativeNumber,
  validateOptionalPositiveInteger,
  validateOptionalPositiveNumber,
  validateProjectSpaceAndBudget,
} from './projectRequestValidation';

describe('projectRequestValidation', () => {
  it('parses optional project request numbers strictly', () => {
    expect(parseOptionalProjectRequestNumber('')).toBeNull();
    expect(parseOptionalProjectRequestNumber('  ')).toBeNull();
    expect(parseOptionalProjectRequestNumber('120.5')).toBe(120.5);
    expect(parseOptionalProjectRequestNumber('120,5')).toBe(120.5);
    expect(Number.isNaN(parseOptionalProjectRequestNumber('abc'))).toBe(true);
    expect(Number.isNaN(parseOptionalProjectRequestNumber('12abc'))).toBe(true);
  });

  it('formats and parses project request money with dot grouping', () => {
    expect(formatProjectRequestMoneyInput(100000)).toBe('100.000');
    expect(formatProjectRequestMoneyInput('1000000')).toBe('1.000.000');
    expect(formatProjectRequestMoneyInput('1.000.000')).toBe('1.000.000');
    expect(parseOptionalProjectRequestMoney('')).toBeNull();
    expect(parseOptionalProjectRequestMoney('1.000.000')).toBe(1_000_000);
    expect(parseOptionalProjectRequestMoney('100.000')).toBe(100_000);
    expect(Number.isNaN(parseOptionalProjectRequestMoney('100,000'))).toBe(true);
    expect(Number.isNaN(parseOptionalProjectRequestMoney('1..000'))).toBe(true);
  });

  it('sanitizes numeric project request inputs while typing', () => {
    expect(sanitizeProjectRequestIntegerInput('1a2-3!')).toBe('123');
    expect(sanitizeProjectRequestIntegerInput('floor 05')).toBe('05');
    expect(sanitizeProjectRequestDecimalInput('12abc.5 sqm')).toBe('12.5');
    expect(sanitizeProjectRequestDecimalInput('12,5')).toBe('12.5');
    expect(sanitizeProjectRequestDecimalInput('12.3.4')).toBe('12.34');
  });

  it('rejects negative total area and zero/negative floors', () => {
    expect(validateOptionalNonNegativeNumber(-1, 'Total Area (sqm)').ok).toBe(false);
    expect(validateOptionalNonNegativeNumber(0, 'Total Area (sqm)')).toEqual({ ok: true, value: 0 });
    expect(validateOptionalPositiveInteger(0, 'Number of Floors').ok).toBe(false);
    expect(validateOptionalPositiveInteger(-2, 'Number of Floors').ok).toBe(false);
    expect(validateOptionalPositiveInteger(1.5, 'Number of Floors').ok).toBe(false);
    expect(validateOptionalPositiveInteger(2, 'Number of Floors')).toEqual({ ok: true, value: 2 });
  });

  it('rejects total area above feasible limit', () => {
    const result = validateProjectSpaceAndBudget({
      totalAreaSqm: 10_000.1,
      numberOfFloors: 1,
      budgetMin: 100_000,
      budgetMax: 200_000,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.totalAreaSqm).toContain('not feasible');
    }
  });

  it('allows zero for optional non-negative integers like Floor', () => {
    expect(validateOptionalNonNegativeInteger(0, 'Floor')).toEqual({ ok: true, value: 0 });
    expect(validateOptionalNonNegativeInteger(2, 'Floor')).toEqual({ ok: true, value: 2 });
    expect(validateOptionalNonNegativeInteger(-1, 'Floor').ok).toBe(false);
    expect(validateOptionalNonNegativeInteger(1.5, 'Floor').ok).toBe(false);
    expect(validateOptionalNonNegativeInteger(null, 'Floor')).toEqual({ ok: true, value: null });
  });

  it('rejects zero and negative optional positive decimals', () => {
    expect(validateOptionalPositiveNumber(0, 'Width (m)').ok).toBe(false);
    expect(validateOptionalPositiveNumber(-1.2, 'Width (m)').ok).toBe(false);
    expect(validateOptionalPositiveNumber(1.5, 'Width (m)')).toEqual({ ok: true, value: 1.5 });
    expect(validateOptionalPositiveNumber(null, 'Width (m)')).toEqual({ ok: true, value: null });
  });

  it('enforces budget min/max bounds', () => {
    expect(validateOptionalBudgetMin(PROJECT_BUDGET_MIN - 1).ok).toBe(false);
    expect(validateOptionalBudgetMin(PROJECT_BUDGET_MIN)).toEqual({ ok: true, value: PROJECT_BUDGET_MIN });
    expect(validateOptionalBudgetMax(PROJECT_BUDGET_MAX + 1).ok).toBe(false);
    expect(validateOptionalBudgetMax(PROJECT_BUDGET_MAX)).toEqual({ ok: true, value: PROJECT_BUDGET_MAX });
  });

  it('rejects inverted budget range', () => {
    const result = validateProjectSpaceAndBudget({
      totalAreaSqm: 120,
      numberOfFloors: 1,
      budgetMin: 500_000,
      budgetMax: 200_000,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.budgetMin).toBeTruthy();
      expect(result.fieldErrors.budgetMax).toBeTruthy();
    }
  });

  it('collects every invalid field at once', () => {
    expect(
      getProjectSpaceAndBudgetFieldErrors({
        totalAreaSqm: Number.NaN,
        numberOfFloors: 0,
        budgetMin: 10,
        budgetMax: PROJECT_BUDGET_MAX + 1,
      }),
    ).toEqual({
      totalAreaSqm: 'Total Area (sqm) must be a valid number.',
      numberOfFloors: 'Number of Floors must be an integer greater than 0.',
      budgetMin: 'Minimum Budget must be at least 100,000.',
      budgetMax: 'Maximum Budget cannot exceed 1,000,000,000.',
    });
  });

  it('accepts valid optional space and budget values', () => {
    expect(
      validateProjectSpaceAndBudget({
        totalAreaSqm: null,
        numberOfFloors: null,
        budgetMin: null,
        budgetMax: null,
      }),
    ).toEqual({
      ok: true,
      totalAreaSqm: null,
      numberOfFloors: null,
      budgetMin: null,
      budgetMax: null,
    });

    expect(
      validateProjectSpaceAndBudget({
        totalAreaSqm: 120,
        numberOfFloors: 2,
        budgetMin: 100_000,
        budgetMax: 1_000_000_000,
      }),
    ).toEqual({
      ok: true,
      totalAreaSqm: 120,
      numberOfFloors: 2,
      budgetMin: 100_000,
      budgetMax: 1_000_000_000,
    });
  });
});
