import { IconEdit, IconPlus, IconRulerMeasure, IconX } from '@tabler/icons-react';
import { useState } from 'react';

import { getProjectAreaServiceResultMessage, type ProjectAreaDto, type ProjectAreaStatus, type ProjectAreaWriteInput } from '@/services/api/projectAreas';
import type { ProjectDto } from '@/services/api/projects';
import { useCreateProjectArea, useProjectAreas, useUpdateProjectArea } from '@/services/queries';

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
  length: string;
  requirementNote: string;
  status: ProjectAreaStatus;
  width: string;
};

const DEFAULT_AREA_DRAFT: AreaDraft = {
  areaName: '',
  areaSqm: '',
  currentCondition: '',
  description: '',
  floorNumber: '',
  height: '',
  length: '',
  requirementNote: '',
  status: 'NEED_MEASUREMENT',
  width: '',
};

const areaStatusOptions: ProjectAreaStatus[] = ['DRAFT', 'NEED_MEASUREMENT', 'MEASURED', 'VERIFIED', 'CANCELLED'];

export function ProjectAreasTab({ project }: ProjectAreasTabProps) {
  const [areaDraft, setAreaDraft] = useState<AreaDraft>(DEFAULT_AREA_DRAFT);
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'error' | 'success'>('success');
  const areasQuery = useProjectAreas({
    projectId: project.projectId,
    includeCancelled: false,
  });
  const createAreaMutation = useCreateProjectArea();
  const updateAreaMutation = useUpdateProjectArea();
  const areas = areasQuery.data ?? [];
  const isEditingArea = Boolean(editingAreaId);
  const isSavingArea = createAreaMutation.isPending || updateAreaMutation.isPending;

  function updateDraft<K extends keyof AreaDraft>(field: K, value: AreaDraft[K]) {
    setAreaDraft({ ...areaDraft, [field]: value });
  }

  async function saveArea() {
    const areaName = areaDraft.areaName.trim();

    setMessage('');
    setMessageTone('error');

    if (!areaName) {
      setMessage('Area name is required.');
      return;
    }

    try {
      const wasEditing = Boolean(editingAreaId);
      const input: ProjectAreaWriteInput = {
        projectId: project.projectId,
        areaName,
        areaType: 'FLOOR',
        areaSqm: parseOptionalNumber(areaDraft.areaSqm),
        currentCondition: areaDraft.currentCondition,
        description: areaDraft.description,
        floorNumber: parseOptionalNumber(areaDraft.floorNumber),
        height: parseOptionalNumber(areaDraft.height),
        length: parseOptionalNumber(areaDraft.length),
        requirementNote: areaDraft.requirementNote,
        status: areaDraft.status,
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
    setMessage('');
  }

  function resetAreaForm() {
    setEditingAreaId(null);
    setAreaDraft(DEFAULT_AREA_DRAFT);
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
          <div className="designer-project-area-heading">
            <IconRulerMeasure size={22} />
            <div>
              <h4>{isEditingArea ? 'Update Project Area' : 'Add Project Area'}</h4>
              <p>{isEditingArea ? 'Update the selected area measurements and notes.' : 'Use this as the category/scope before creating proposal scenes.'}</p>
            </div>
          </div>
          <div className="designer-project-area-form">
            <label>
              <span>Area Name</span>
              <input value={areaDraft.areaName} onChange={(event) => updateDraft('areaName', event.target.value)} />
            </label>
            <label>
              <span>Status</span>
              <select value={areaDraft.status} onChange={(event) => updateDraft('status', event.target.value as ProjectAreaStatus)}>
                {areaStatusOptions.map((status) => <option key={status} value={status}>{formatEnumLabel(status)}</option>)}
              </select>
            </label>
            <label>
              <span>Floor</span>
              <input inputMode="numeric" value={areaDraft.floorNumber} onChange={(event) => updateDraft('floorNumber', event.target.value)} />
            </label>
            <label>
              <span>Area m2</span>
              <input inputMode="decimal" value={areaDraft.areaSqm} onChange={(event) => updateDraft('areaSqm', event.target.value)} />
            </label>
            <label>
              <span>Width (m)</span>
              <input inputMode="decimal" value={areaDraft.width} onChange={(event) => updateDraft('width', event.target.value)} />
            </label>
            <label>
              <span>Length (m)</span>
              <input inputMode="decimal" value={areaDraft.length} onChange={(event) => updateDraft('length', event.target.value)} />
            </label>
            <label>
              <span>Height (m)</span>
              <input inputMode="decimal" value={areaDraft.height} onChange={(event) => updateDraft('height', event.target.value)} />
            </label>
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
              <button disabled={isSavingArea || !areaDraft.areaName.trim()} type="button" onClick={() => void saveArea()}>
                {isEditingArea ? <IconEdit size={16} /> : <IconPlus size={16} />}
                {isSavingArea ? 'Saving...' : isEditingArea ? 'Update Area' : 'Create Area'}
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

function ProjectAreaItem({ area, onUpdate }: { area: ProjectAreaDto; onUpdate: (area: ProjectAreaDto) => void }) {
  return (
    <article className="designer-project-area-item">
      <div className="designer-project-area-item-main">
        <header>
          <div>
            <strong>{area.areaName}</strong>
            <span>{typeof area.floorNumber === 'number' ? `Floor ${area.floorNumber}` : 'Floor area'}</span>
          </div>
          <small>{formatEnumLabel(area.status)}</small>
        </header>
        <p className="designer-project-area-metrics">
          Area: {formatMetric(area.areaSqm, 'm2')} - Width: {formatMetric(area.width, 'm')} - Length: {formatMetric(area.length, 'm')} - Height: {formatMetric(area.height, 'm')}
        </p>
        <details className="designer-project-area-notes">
          <summary>Area details</summary>
          <p><span>Description</span>{area.description || '-'}</p>
          <p><span>Current Condition</span>{area.currentCondition || '-'}</p>
          <p><span>Requirement Note</span>{area.requirementNote || '-'}</p>
        </details>
      </div>
      <button className="designer-project-area-update-button" type="button" onClick={() => onUpdate(area)}>
        <IconEdit size={15} /> Update
      </button>
    </article>
  );
}

function getAreaDraft(area: ProjectAreaDto): AreaDraft {
  return {
    areaName: area.areaName,
    areaSqm: formatDraftNumber(area.areaSqm),
    currentCondition: area.currentCondition ?? '',
    description: area.description ?? '',
    floorNumber: formatDraftNumber(area.floorNumber),
    height: formatDraftNumber(area.height),
    length: formatDraftNumber(area.length),
    requirementNote: area.requirementNote ?? '',
    status: area.status,
    width: formatDraftNumber(area.width),
  };
}

function parseOptionalNumber(value: string) {
  const normalizedValue = value.trim().replace(',', '.');

  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function formatDraftNumber(value?: number | null) {
  return typeof value === 'number' ? String(value) : '';
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
