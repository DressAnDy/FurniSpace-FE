import { describe, expect, it } from 'vitest';

import {
  PROJECT_BUDGET_MAX,
  PROJECT_BUDGET_MIN,
  getProjectSpaceAndBudgetFieldErrors,
  validateOptionalBudgetMax,
  validateOptionalBudgetMin,
  validateOptionalNonNegativeInteger,
  validateOptionalNonNegativeNumber,
  validateOptionalPositiveInteger,
  validateOptionalPositiveNumber,
  validateProjectSpaceAndBudget,
} from './projectRequestValidation';

describe('projectRequestValidation', () => {
  it('rejects negative total area and zero/negative floors', () => {
    expect(validateOptionalNonNegativeNumber(-1, 'Total Area (sqm)').ok).toBe(false);
    expect(validateOptionalNonNegativeNumber(0, 'Total Area (sqm)')).toEqual({ ok: true, value: 0 });
    expect(validateOptionalPositiveInteger(0, 'Number of Floors').ok).toBe(false);
    expect(validateOptionalPositiveInteger(-2, 'Number of Floors').ok).toBe(false);
    expect(validateOptionalPositiveInteger(1.5, 'Number of Floors').ok).toBe(false);
    expect(validateOptionalPositiveInteger(2, 'Number of Floors')).toEqual({ ok: true, value: 2 });
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
        totalAreaSqm: -5,
        numberOfFloors: 0,
        budgetMin: 10,
        budgetMax: PROJECT_BUDGET_MAX + 1,
      }),
    ).toEqual({
      totalAreaSqm: 'Total Area (sqm) cannot be negative.',
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
