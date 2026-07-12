import { IconCheck, IconPlus, IconRulerMeasure } from '@tabler/icons-react';
import { useState } from 'react';

import { getProjectAreaServiceResultMessage, type ProjectAreaDto, type ProjectAreaType } from '@/services/api/projectAreas';
import type { ProjectDto } from '@/services/api/projects';
import { useCreateProjectArea, useProjectAreas } from '@/services/queries';

type ProjectAreasTabProps = {
  project: ProjectDto;
};

type AreaDraft = {
  areaName: string;
  areaType: ProjectAreaType;
  areaSqm: string;
  floorNumber: string;
  height: string;
  length: string;
  requirementNote: string;
  width: string;
};

const DEFAULT_AREA_DRAFT: AreaDraft = {
  areaName: '',
  areaType: 'ROOM',
  areaSqm: '',
  floorNumber: '',
  height: '',
  length: '',
  requirementNote: '',
  width: '',
};

const AREA_TYPES: ProjectAreaType[] = ['STORE', 'FLOOR', 'ROOM', 'ZONE', 'OUTDOOR_AREA', 'OTHER'];

export function ProjectAreasTab({ project }: ProjectAreasTabProps) {
  const [areaDraft, setAreaDraft] = useState<AreaDraft>(DEFAULT_AREA_DRAFT);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'error' | 'success'>('success');
  const areasQuery = useProjectAreas({
    projectId: project.projectId,
    includeCancelled: false,
  });
  const createAreaMutation = useCreateProjectArea();
  const areas = areasQuery.data ?? [];

  function updateDraft<K extends keyof AreaDraft>(field: K, value: AreaDraft[K]) {
    setAreaDraft({ ...areaDraft, [field]: value });
  }

  async function createArea() {
    const areaName = areaDraft.areaName.trim();

    setMessage('');
    setMessageTone('error');

    if (!areaName) {
      setMessage('Area name is required.');
      return;
    }

    try {
      const area = await createAreaMutation.mutateAsync({
        projectId: project.projectId,
        areaName,
        areaType: areaDraft.areaType,
        areaSqm: parseOptionalNumber(areaDraft.areaSqm),
        floorNumber: parseOptionalNumber(areaDraft.floorNumber),
        height: parseOptionalNumber(areaDraft.height),
        length: parseOptionalNumber(areaDraft.length),
        requirementNote: areaDraft.requirementNote,
        status: 'NEED_MEASUREMENT',
        width: parseOptionalNumber(areaDraft.width),
      });

      setAreaDraft(DEFAULT_AREA_DRAFT);
      setMessageTone('success');
      setMessage(`${area.areaName} has been created for this project.`);
    } catch (error) {
      setMessageTone('error');
      setMessage(getProjectAreaServiceResultMessage(error));
    }
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
              <h4>Add Project Area</h4>
              <p>Use this as the category/scope before creating proposal scenes.</p>
            </div>
          </div>
          <div className="designer-project-area-form">
            <label>
              <span>Area Name</span>
              <input value={areaDraft.areaName} onChange={(event) => updateDraft('areaName', event.target.value)} />
            </label>
            <label>
              <span>Type</span>
              <select value={areaDraft.areaType} onChange={(event) => updateDraft('areaType', event.target.value as ProjectAreaType)}>
                {AREA_TYPES.map((type) => <option key={type} value={type}>{formatEnumLabel(type)}</option>)}
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
              <span>Width</span>
              <input inputMode="decimal" value={areaDraft.width} onChange={(event) => updateDraft('width', event.target.value)} />
            </label>
            <label>
              <span>Length</span>
              <input inputMode="decimal" value={areaDraft.length} onChange={(event) => updateDraft('length', event.target.value)} />
            </label>
            <label>
              <span>Height</span>
              <input inputMode="decimal" value={areaDraft.height} onChange={(event) => updateDraft('height', event.target.value)} />
            </label>
            <label className="designer-project-area-note">
              <span>Requirement Note</span>
              <textarea value={areaDraft.requirementNote} onChange={(event) => updateDraft('requirementNote', event.target.value)} />
            </label>
            <button disabled={createAreaMutation.isPending || !areaDraft.areaName.trim()} type="button" onClick={() => void createArea()}>
              <IconPlus size={16} /> {createAreaMutation.isPending ? 'Creating...' : 'Create Area'}
            </button>
          </div>
        </section>

        <section className="designer-project-area-list-card">
          <div className="designer-project-area-heading">
            <IconCheck size={22} />
            <div>
              <h4>Available Areas</h4>
              <p>{areasQuery.isLoading ? 'Loading project areas...' : `${areas.length} area${areas.length === 1 ? '' : 's'} ready for proposals.`}</p>
            </div>
          </div>
          <div className="designer-project-area-list">
            {areasQuery.isLoading ? <p className="designer-project-empty-text">Loading project areas...</p> : null}
            {!areasQuery.isLoading && areas.length === 0 ? <p className="designer-project-empty-text">No project areas yet.</p> : null}
            {areas.map((area) => <ProjectAreaItem area={area} key={area.projectAreaId} />)}
          </div>
        </section>
      </div>
    </section>
  );
}

function ProjectAreaItem({ area }: { area: ProjectAreaDto }) {
  return (
    <article className="designer-project-area-item">
      <div>
        <strong>{area.areaName}</strong>
        <span>{formatEnumLabel(area.areaType)}{area.areaSqm ? ` - ${area.areaSqm} m2` : ''}</span>
      </div>
      <small>{formatEnumLabel(area.status)}</small>
    </article>
  );
}

function parseOptionalNumber(value: string) {
  const normalizedValue = value.trim().replace(',', '.');

  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
