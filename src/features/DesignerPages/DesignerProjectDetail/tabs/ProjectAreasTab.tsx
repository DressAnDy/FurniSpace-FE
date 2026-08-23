import { IconEdit, IconPlus, IconRulerMeasure, IconX } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';

import { getProjectAreaServiceResultMessage, type ProjectAreaDto, type ProjectAreaStatus, type ProjectAreaWriteInput } from '@/services/api/projectAreas';
import type { ProjectDto } from '@/services/api/projects';
import { useCreateProjectArea, useProjectAreaMeasurementImages, useProjectAreas, useUpdateProjectArea } from '@/services/queries';
import { validateOptionalPositiveNumber } from '@/shared/utils/projectRequestValidation';

type ProjectAreasTabProps = {
  project: ProjectDto;
};

type AreaDraft = {
  areaName: string;
  areaSqm: string;
  currentCondition: string;
  description: string;
  floorNumber: string;
  height: string;
  isSpecialLayout: boolean;
  length: string;
  requirementNote: string;
  status: ProjectAreaStatus;
  width: string;
};

type NumericAreaField = 'areaSqm' | 'width' | 'length' | 'height';

type AreaFieldErrors = Partial<Record<'areaName' | 'floorNumber' | NumericAreaField, string>>;

const LOCKED_AREA_STATUS: ProjectAreaStatus = 'VERIFIED';

const DEFAULT_AREA_DRAFT: AreaDraft = {
  areaName: '',
  areaSqm: '',
  currentCondition: '',
  description: '',
  floorNumber: '',
  height: '',
  isSpecialLayout: false,
  length: '',
  requirementNote: '',
  status: LOCKED_AREA_STATUS,
  width: '',
};

const NUMERIC_FIELD_LABELS: Record<NumericAreaField, string> = {
  areaSqm: 'Area (m2)',
  width: 'Width (m)',
  length: 'Length (m)',
  height: 'Height (m)',
};

export function ProjectAreasTab({ project }: Readonly<ProjectAreasTabProps>) {
  const [areaDraft, setAreaDraft] = useState<AreaDraft>(DEFAULT_AREA_DRAFT);
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AreaFieldErrors>({});
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'error' | 'success'>('success');
  const areasQuery = useProjectAreas({
    projectId: project.projectId,
    includeCancelled: false,
  });
  const createAreaMutation = useCreateProjectArea();
  const updateAreaMutation = useUpdateProjectArea();
  const areas = useMemo(() => getAreasOldestFirst(areasQuery.data ?? []), [areasQuery.data]);
  const isEditingArea = Boolean(editingAreaId);
  const isSavingArea = createAreaMutation.isPending || updateAreaMutation.isPending;
  const calculatedAreaSqm = getDraftAreaSqm(areaDraft);
  const assignedFloorNumber = getAssignedFloorNumber(areaDraft, areas, editingAreaId, project);
  const floorAssignmentError = assignedFloorNumber === null ? getFloorAssignmentError(areas, editingAreaId, project) ?? 'No available floor for this project.' : null;
  const areaLimitError = useMemo(
    () => getAreaLimitError(areaDraft, areas, editingAreaId, project),
    [areaDraft, areas, editingAreaId, project],
  );

  useEffect(() => {
    setFieldErrors((current) => {
      const next = { ...current };

      if (isAreaLimitErrorMessage(next.width)) delete next.width;
      if (isAreaLimitErrorMessage(next.length)) delete next.length;

      if (areaLimitError) {
        next.width = areaLimitError;
        next.length = areaLimitError;
      }

      return next;
    });
  }, [areaLimitError]);

  function updateDraft<K extends keyof AreaDraft>(field: K, value: AreaDraft[K]) {
    setAreaDraft((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!(field in current)) return current;

      const next = { ...current };
      delete next[field as keyof AreaFieldErrors];
      return next;
    });
  }

  function updateNumericDraft(field: NumericAreaField, rawValue: string) {
    updateDraft(field, sanitizeDecimalInput(rawValue));
  }

  async function saveArea() {
    const areaName = areaDraft.areaName.trim();
    const nextFieldErrors = getAreaFieldErrors(areaDraft, areas, editingAreaId, project, assignedFloorNumber);

    setFieldErrors(nextFieldErrors);
    setMessage('');
    setMessageTone('error');

    if (!areaName) {
      setMessage('Area name is required.');
      return;
    }

    const firstNumericError = Object.values(nextFieldErrors).find(Boolean);
    if (firstNumericError) {
      setMessage(firstNumericError);
      return;
    }

    try {
      const wasEditing = Boolean(editingAreaId);
      const input: ProjectAreaWriteInput = {
        projectId: project.projectId,
        areaName,
        areaType: 'FLOOR',
        areaSqm: areaDraft.isSpecialLayout ? parseOptionalNumber(areaDraft.areaSqm) : calculatedAreaSqm,
        currentCondition: areaDraft.currentCondition,
        description: areaDraft.description,
        floorNumber: assignedFloorNumber,
        height: parseOptionalNumber(areaDraft.height),
        isSpecialLayout: areaDraft.isSpecialLayout,
        length: parseOptionalNumber(areaDraft.length),
        requirementNote: areaDraft.requirementNote,
        status: LOCKED_AREA_STATUS,
        width: parseOptionalNumber(areaDraft.width),
      };
      const area = editingAreaId
        ? await updateAreaMutation.mutateAsync({ ...input, projectAreaId: editingAreaId })
        : await createAreaMutation.mutateAsync(input);

      resetAreaForm();
      setMessageTone('success');
      setMessage(`${area.areaName} has been ${wasEditing ? 'updated' : 'created'} for this project.`);
    } catch (error) {
      setMessageTone('error');
      setMessage(getProjectAreaServiceResultMessage(error));
    }
  }

  function startUpdateArea(area: ProjectAreaDto) {
    setEditingAreaId(area.projectAreaId);
    setAreaDraft(getAreaDraft(area));
    setFieldErrors({});
    setMessage('');
  }

  function resetAreaForm() {
    setEditingAreaId(null);
    setAreaDraft(DEFAULT_AREA_DRAFT);
    setFieldErrors({});
  }

  return (
    <section className="designer-card designer-project-section-card">
      <div className="designer-project-section-toolbar">
        <div>
          <h3>Project Areas</h3>
          <p>Project areas are reusable project-level spaces. Create them before building proposal scenes.</p>
        </div>
      </div>

      {message ? (
        <p className={`designer-project-file-message ${messageTone === 'success' ? 'designer-project-message-success' : 'designer-project-file-error'}`}>
          {message}
        </p>
      ) : null}
      {areasQuery.isError ? <p className="designer-project-file-message designer-project-file-error">{getProjectAreaServiceResultMessage(areasQuery.error)}</p> : null}

      <div className="designer-project-area-layout">
        <section className="designer-project-area-form-card">
          {fieldErrors.floorNumber || floorAssignmentError ? (
            <p className="designer-project-area-assignment-error">{fieldErrors.floorNumber ?? floorAssignmentError}</p>
          ) : null}
          <div className="designer-project-area-heading">
            <IconRulerMeasure size={22} />
            <div>
              <h4>{isEditingArea ? 'Update Project Area' : 'Add Project Area'}</h4>
            </div>
          </div>
          <div className="designer-project-area-form">
            <label>
              <span>Area Name</span>
              <input
                aria-invalid={Boolean(fieldErrors.areaName)}
                className={fieldErrors.areaName ? 'designer-project-area-input-invalid' : undefined}
                title={fieldErrors.areaName}
                value={areaDraft.areaName}
              onChange={(event) => updateDraft('areaName', event.target.value)}
              />
            </label>
            <label>
              <span>Layout Mode</span>
              <select
                value={areaDraft.isSpecialLayout ? 'special' : 'standard'}
                onChange={(event) => updateDraft('isSpecialLayout', event.target.value === 'special')}
              >
                <option value="standard">Standard rectangle</option>
                <option value="special">Special layout</option>
              </select>
            </label>
            <NumericAreaInput
              error={fieldErrors.width}
              inputMode="decimal"
              label={areaDraft.isSpecialLayout ? 'Width (m, optional)' : 'Width (m)'}
              value={areaDraft.width}
              onChange={(value) => updateNumericDraft('width', value)}
            />
            <NumericAreaInput
              error={fieldErrors.length}
              inputMode="decimal"
              label={areaDraft.isSpecialLayout ? 'Length (m, optional)' : 'Length (m)'}
              value={areaDraft.length}
              onChange={(value) => updateNumericDraft('length', value)}
            />
            <NumericAreaInput
              error={fieldErrors.height}
              inputMode="decimal"
              label="Height (m)"
              value={areaDraft.height}
              onChange={(value) => updateNumericDraft('height', value)}
            />
            {areaDraft.isSpecialLayout ? (
              <NumericAreaInput
                error={fieldErrors.areaSqm}
                inputMode="decimal"
                label="Area (m2, optional)"
                value={areaDraft.areaSqm}
                onChange={(value) => updateNumericDraft('areaSqm', value)}
              />
            ) : (
              <div className={`designer-project-area-calculated${areaLimitError ? ' designer-project-area-calculated-invalid' : ''}`}>
                <span>Area m2</span>
                <strong>{formatMetric(calculatedAreaSqm, 'm2')}</strong>
                {areaLimitError ? <em>{areaLimitError}</em> : null}
              </div>
            )}
            <label className="designer-project-area-note">
              <span>Description</span>
              <textarea value={areaDraft.description} onChange={(event) => updateDraft('description', event.target.value)} />
            </label>
            <label className="designer-project-area-note">
              <span>Current Condition</span>
              <textarea value={areaDraft.currentCondition} onChange={(event) => updateDraft('currentCondition', event.target.value)} />
            </label>
            <label className="designer-project-area-note">
              <span>Requirement Note</span>
              <textarea value={areaDraft.requirementNote} onChange={(event) => updateDraft('requirementNote', event.target.value)} />
            </label>
            <div className="designer-project-area-form-actions">
              {isEditingArea ? (
                <button className="designer-project-area-cancel-button" disabled={isSavingArea} type="button" onClick={resetAreaForm}>
                  <IconX size={16} /> Cancel
                </button>
              ) : null}
              <button disabled={isSavingArea || !areaDraft.areaName.trim() || assignedFloorNumber === null} type="button" onClick={() => void saveArea()}>
                {isEditingArea ? <IconEdit size={16} /> : <IconPlus size={16} />}
                {getSaveButtonLabel(isSavingArea, isEditingArea)}
              </button>
            </div>
          </div>
        </section>

        <section className="designer-project-area-list-card">
          <div className="designer-project-area-list">
            {areasQuery.isLoading ? <p className="designer-project-empty-text">Loading project areas...</p> : null}
            {!areasQuery.isLoading && areas.length === 0 ? <p className="designer-project-empty-text">No project areas yet.</p> : null}
            {areas.map((area) => <ProjectAreaItem area={area} key={area.projectAreaId} onUpdate={startUpdateArea} />)}
          </div>
        </section>
      </div>
    </section>
  );
}

function NumericAreaInput({
  error,
  inputMode,
  label,
  onChange,
  value,
}: Readonly<{
  error?: string;
  inputMode: 'decimal' | 'numeric';
  label: string;
  onChange: (value: string) => void;
  value: string;
}>) {
  return (
    <label>
      <span>{label}</span>
      <input
        aria-invalid={Boolean(error)}
        autoComplete="off"
        className={error ? 'designer-project-area-input-invalid' : undefined}
        inputMode={inputMode}
        title={error}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === '-' || event.key === 'e' || event.key === 'E' || event.key === '+') {
            event.preventDefault();
          }
        }}
      />
    </label>
  );
}

function ProjectAreaItem({ area, onUpdate }: Readonly<{ area: ProjectAreaDto; onUpdate: (area: ProjectAreaDto) => void }>) {
  const areaSqm = getProjectAreaSqm(area);
  const measurementImagesQuery = useProjectAreaMeasurementImages(area.projectAreaId);
  const measurementImages = measurementImagesQuery.data?.items ?? [];

  return (
    <article className="designer-project-area-item">
      <div className="designer-project-area-item-main">
        <header>
          <div>
            <strong>{area.areaName}</strong>
            <span>{typeof area.floorNumber === 'number' ? `Floor ${area.floorNumber}` : 'Floor area'} - {area.isSpecialLayout ? 'Special layout' : 'Standard'}</span>
          </div>
          <small>{formatEnumLabel(area.status)}</small>
        </header>
        <p className="designer-project-area-metrics">
          Area: {formatMetric(areaSqm, 'm2')} - Width: {formatMetric(area.width, 'm')} - Length: {formatMetric(area.length, 'm')} - Height: {formatMetric(area.height, 'm')}
        </p>
        <details className="designer-project-area-notes">
          <summary>Area details</summary>
          <p><span>Description</span>{area.description || '-'}</p>
          <p><span>Current Condition</span>{area.currentCondition || '-'}</p>
          <p><span>Requirement Note</span>{area.requirementNote || '-'}</p>
        </details>
        {measurementImages.length > 0 ? (
          <div className="designer-project-area-measurements">
            {measurementImages.slice(0, 4).map((image) => {
              const imageUrl = image.url ?? image.publicUrl;

              return imageUrl ? (
                <a href={imageUrl} key={image.fileId} rel="noreferrer" target="_blank">
                  <img alt={image.originalFileName ?? area.areaName} src={imageUrl} />
                </a>
              ) : null;
            })}
          </div>
        ) : null}
      </div>
      <button className="designer-project-area-update-button" type="button" onClick={() => onUpdate(area)}>
        <IconEdit size={15} /> Update
      </button>
    </article>
  );
}

function getAreasOldestFirst(areas: ProjectAreaDto[]) {
  return [...areas].sort((first, second) => {
    const floorDifference = getSortableFloor(first.floorNumber) - getSortableFloor(second.floorNumber);

    if (floorDifference !== 0) {
      return floorDifference;
    }

    return first.areaName.localeCompare(second.areaName);
  });
}

function getAreaFieldErrors(
  draft: AreaDraft,
  areas: ProjectAreaDto[],
  editingAreaId: string | null,
  project: ProjectDto,
  assignedFloorNumber: number | null,
): AreaFieldErrors {
  const fieldErrors: AreaFieldErrors = {};

  if (!draft.areaName.trim()) {
    fieldErrors.areaName = 'Area name is required.';
  }

  if (assignedFloorNumber === null) {
    fieldErrors.floorNumber = getFloorAssignmentError(areas, editingAreaId, project) ?? 'No available floor for this project.';
  }

  if (draft.isSpecialLayout) {
    (['width', 'length', 'areaSqm'] as const).forEach((field) => {
      const value = parseOptionalNumber(draft[field]);

      if (value !== null) {
        const result = validateOptionalPositiveNumber(value, NUMERIC_FIELD_LABELS[field]);
        if (!result.ok) fieldErrors[field] = result.message;
      }
    });
  } else {
    (['width', 'length'] as const).forEach((field) => {
      const result = validateOptionalPositiveNumber(parseOptionalNumber(draft[field]), NUMERIC_FIELD_LABELS[field]);
      if (!result.ok) fieldErrors[field] = result.message;
    });

    if (parseOptionalNumber(draft.width) === null) {
      fieldErrors.width = 'Width is required.';
    }

    if (parseOptionalNumber(draft.length) === null) {
      fieldErrors.length = 'Length is required.';
    }

    const areaLimitError = getAreaLimitError(draft, areas, editingAreaId, project);
    if (areaLimitError) {
      fieldErrors.width = areaLimitError;
      fieldErrors.length = areaLimitError;
    }
  }

  const height = validateOptionalPositiveNumber(parseOptionalNumber(draft.height), NUMERIC_FIELD_LABELS.height);
  if (!height.ok) fieldErrors.height = height.message;

  return fieldErrors;
}

function getAreaLimitError(
  draft: AreaDraft,
  areas: ProjectAreaDto[],
  editingAreaId: string | null,
  project: ProjectDto,
) {
  const totalAreaSqm = project.totalAreaSqm;
  const draftAreaSqm = getDraftAreaSqm(draft);

  if (draft.isSpecialLayout) {
    return null;
  }

  if (typeof totalAreaSqm !== 'number' || draftAreaSqm === null) {
    return null;
  }

  if (draftAreaSqm > totalAreaSqm) {
    return `Calculated area cannot be greater than project area (${formatMetric(totalAreaSqm, 'm2')}).`;
  }

  return null;
}

function isAreaLimitErrorMessage(message?: string) {
  return message?.startsWith('Calculated area cannot be greater') || false;
}

function getAssignedFloorNumber(
  draft: AreaDraft,
  areas: ProjectAreaDto[],
  editingAreaId: string | null,
  project: ProjectDto,
) {
  const currentFloor = parseOptionalNumber(draft.floorNumber);

  if (editingAreaId && currentFloor !== null) {
    return currentFloor;
  }

  return getNextAvailableFloorNumber(areas, editingAreaId, project);
}

function getNextAvailableFloorNumber(areas: ProjectAreaDto[], editingAreaId: string | null, project: ProjectDto) {
  const usedFloors = new Set(
    areas
      .filter((area) => area.projectAreaId !== editingAreaId && area.areaType === 'FLOOR' && typeof area.floorNumber === 'number')
      .map((area) => area.floorNumber as number),
  );
  const maxFloors = typeof project.numberOfFloors === 'number' && project.numberOfFloors > 0
    ? project.numberOfFloors
    : usedFloors.size + 1;

  for (let floorNumber = 1; floorNumber <= maxFloors; floorNumber += 1) {
    if (!usedFloors.has(floorNumber)) {
      return floorNumber;
    }
  }

  return null;
}

function getFloorAssignmentError(areas: ProjectAreaDto[], editingAreaId: string | null, project: ProjectDto) {
  const maxFloors = project.numberOfFloors;

  if (typeof maxFloors === 'number' && maxFloors > 0) {
    const usedFloorCount = new Set(
      areas
        .filter((area) => area.projectAreaId !== editingAreaId && area.areaType === 'FLOOR' && typeof area.floorNumber === 'number')
        .map((area) => area.floorNumber),
    ).size;

    if (usedFloorCount >= maxFloors) {
      return `This project already has all ${maxFloors} floor(s) created.`;
    }
  }

  return null;
}

function getAreaDraft(area: ProjectAreaDto): AreaDraft {
  return {
    areaName: area.areaName,
    areaSqm: formatDraftNumber(area.areaSqm),
    currentCondition: area.currentCondition ?? '',
    description: area.description ?? '',
    floorNumber: formatDraftNumber(area.floorNumber),
    height: formatDraftNumber(area.height),
    isSpecialLayout: area.isSpecialLayout,
    length: formatDraftNumber(area.length),
    requirementNote: area.requirementNote ?? '',
    status: LOCKED_AREA_STATUS,
    width: formatDraftNumber(area.width),
  };
}

function sanitizeDecimalInput(value: string) {
  const normalized = value.replace(',', '.');
  const cleaned = normalized.replace(/[^\d.]/g, '');
  const separatorIndex = cleaned.indexOf('.');

  if (separatorIndex < 0) {
    return cleaned;
  }

  const whole = cleaned.slice(0, separatorIndex).replace(/\D/g, '');
  const fraction = cleaned.slice(separatorIndex + 1).replace(/\D/g, '');

  return fraction ? `${whole}.${fraction}` : `${whole}.`;
}

function parseOptionalNumber(value: string) {
  const normalizedValue = value.trim().replace(',', '.');

  if (!normalizedValue || normalizedValue === '.') {
    return null;
  }

  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function formatDraftNumber(value?: number | null) {
  return typeof value === 'number' ? String(value) : '';
}

function getDraftAreaSqm(draft: AreaDraft) {
  const width = parseOptionalNumber(draft.width);
  const length = parseOptionalNumber(draft.length);

  if (width === null || length === null) {
    return null;
  }

  const areaSqm = width * length;

  return Number.isFinite(areaSqm) ? Number(areaSqm.toFixed(2)) : null;
}

function getProjectAreaSqm(area: ProjectAreaDto) {
  if (typeof area.areaSqm === 'number') {
    return area.areaSqm;
  }

  if (typeof area.width === 'number' && typeof area.length === 'number') {
    const areaSqm = area.width * area.length;

    return Number.isFinite(areaSqm) ? Number(areaSqm.toFixed(2)) : null;
  }

  return null;
}

function getSortableFloor(floorNumber: number | null) {
  return typeof floorNumber === 'number' ? floorNumber : Number.MAX_SAFE_INTEGER;
}

function formatMetric(value: number | null, unit: string) {
  if (typeof value !== 'number') return '-';

  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value)} ${unit}`;
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getSaveButtonLabel(isSavingArea: boolean, isEditingArea: boolean) {
  if (isSavingArea) return 'Saving...';
  return isEditingArea ? 'Update Area' : 'Create Area';
}
