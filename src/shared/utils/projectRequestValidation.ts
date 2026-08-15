export const PROJECT_BUDGET_MIN = 100_000;
export const PROJECT_BUDGET_MAX = 1_000_000_000;

export type OptionalNumberValidationResult =
  | { ok: true; value: number | null }
  | { ok: false; message: string };

export type ProjectRequestFieldName =
  | 'totalAreaSqm'
  | 'numberOfFloors'
  | 'budgetMin'
  | 'budgetMax'
  | 'targetCompletionDate';

export type ProjectRequestFieldErrors = Partial<Record<ProjectRequestFieldName, string>>;

export type ProjectSpaceAndBudgetValidationResult =
  | {
      ok: true;
      totalAreaSqm: number | null;
      numberOfFloors: number | null;
      budgetMin: number | null;
      budgetMax: number | null;
    }
  | { ok: false; message: string; fieldErrors: ProjectRequestFieldErrors };

export function validateOptionalNonNegativeNumber(
  value: number | null,
  label: string,
): OptionalNumberValidationResult {
  if (value == null) return { ok: true, value: null };
  if (!Number.isFinite(value)) {
    return { ok: false, message: `${label} must be a valid number.` };
  }
  if (value < 0) {
    return { ok: false, message: `${label} cannot be negative.` };
  }

  return { ok: true, value };
}

export function validateOptionalPositiveNumber(
  value: number | null,
  label: string,
): OptionalNumberValidationResult {
  if (value == null) return { ok: true, value: null };
  if (!Number.isFinite(value)) {
    return { ok: false, message: `${label} must be a valid number.` };
  }
  if (value <= 0) {
    return { ok: false, message: `${label} must be greater than 0.` };
  }

  return { ok: true, value };
}

export function validateOptionalNonNegativeInteger(
  value: number | null,
  label: string,
): OptionalNumberValidationResult {
  if (value == null) return { ok: true, value: null };
  if (!Number.isFinite(value)) {
    return { ok: false, message: `${label} must be a valid number.` };
  }
  if (!Number.isInteger(value) || value < 0) {
    return { ok: false, message: `${label} must be an integer of 0 or greater.` };
  }

  return { ok: true, value };
}

export function validateOptionalPositiveInteger(
  value: number | null,
  label: string,
): OptionalNumberValidationResult {
  if (value == null) return { ok: true, value: null };
  if (!Number.isFinite(value)) {
    return { ok: false, message: `${label} must be a valid number.` };
  }
  if (!Number.isInteger(value) || value <= 0) {
    return { ok: false, message: `${label} must be an integer greater than 0.` };
  }

  return { ok: true, value };
}

export function validateOptionalBudgetMin(
  value: number | null,
  label = 'Minimum Budget',
): OptionalNumberValidationResult {
  if (value == null) return { ok: true, value: null };
  if (!Number.isFinite(value)) {
    return { ok: false, message: `${label} must be a valid number.` };
  }
  if (value < PROJECT_BUDGET_MIN) {
    return {
      ok: false,
      message: `${label} must be at least ${PROJECT_BUDGET_MIN.toLocaleString('en-US')}.`,
    };
  }
  if (value > PROJECT_BUDGET_MAX) {
    return {
      ok: false,
      message: `${label} cannot exceed ${PROJECT_BUDGET_MAX.toLocaleString('en-US')}.`,
    };
  }

  return { ok: true, value };
}

export function validateOptionalBudgetMax(
  value: number | null,
  label = 'Maximum Budget',
): OptionalNumberValidationResult {
  if (value == null) return { ok: true, value: null };
  if (!Number.isFinite(value)) {
    return { ok: false, message: `${label} must be a valid number.` };
  }
  if (value < PROJECT_BUDGET_MIN) {
    return {
      ok: false,
      message: `${label} must be at least ${PROJECT_BUDGET_MIN.toLocaleString('en-US')}.`,
    };
  }
  if (value > PROJECT_BUDGET_MAX) {
    return {
      ok: false,
      message: `${label} cannot exceed ${PROJECT_BUDGET_MAX.toLocaleString('en-US')}.`,
    };
  }

  return { ok: true, value };
}

export function getProjectSpaceAndBudgetFieldErrors(input: {
  totalAreaSqm: number | null;
  numberOfFloors: number | null;
  budgetMin: number | null;
  budgetMax: number | null;
}): ProjectRequestFieldErrors {
  const fieldErrors: ProjectRequestFieldErrors = {};

  const totalAreaSqm = validateOptionalNonNegativeNumber(input.totalAreaSqm, 'Total Area (sqm)');
  if (!totalAreaSqm.ok) fieldErrors.totalAreaSqm = totalAreaSqm.message;

  const numberOfFloors = validateOptionalPositiveInteger(input.numberOfFloors, 'Number of Floors');
  if (!numberOfFloors.ok) fieldErrors.numberOfFloors = numberOfFloors.message;

  const budgetMin = validateOptionalBudgetMin(input.budgetMin);
  if (!budgetMin.ok) fieldErrors.budgetMin = budgetMin.message;

  const budgetMax = validateOptionalBudgetMax(input.budgetMax);
  if (!budgetMax.ok) fieldErrors.budgetMax = budgetMax.message;

  if (
    budgetMin.ok
    && budgetMax.ok
    && budgetMin.value != null
    && budgetMax.value != null
    && budgetMin.value > budgetMax.value
  ) {
    const rangeMessage = 'Minimum Budget cannot be greater than Maximum Budget.';
    fieldErrors.budgetMin = rangeMessage;
    fieldErrors.budgetMax = rangeMessage;
  }

  return fieldErrors;
}

export function validateProjectSpaceAndBudget(input: {
  totalAreaSqm: number | null;
  numberOfFloors: number | null;
  budgetMin: number | null;
  budgetMax: number | null;
}): ProjectSpaceAndBudgetValidationResult {
  const fieldErrors = getProjectSpaceAndBudgetFieldErrors(input);
  const firstMessage = Object.values(fieldErrors)[0];

  if (firstMessage) {
    return { ok: false, message: firstMessage, fieldErrors };
  }

  return {
    ok: true,
    totalAreaSqm: input.totalAreaSqm,
    numberOfFloors: input.numberOfFloors,
    budgetMin: input.budgetMin,
    budgetMax: input.budgetMax,
  };
}
