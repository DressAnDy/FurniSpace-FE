import { type FormEvent, useMemo, useState } from 'react';
import { IconAlertTriangle, IconPlus, IconRefresh, IconX } from '@tabler/icons-react';

import {
  getOperationalDelayErrorMessage,
  type OperationalDelayPhase,
  type OperationalDelayReportDto,
} from '@/services/api/operationalDelayReports';
import {
  useCreateDeliveryDelayReport,
  useCreateProductionDelayReport,
  useOperationalDelayReport,
  useProjectOperationalDelayReports,
} from '@/services/queries';

import './OperationalDelayPanel.css';

type OperationalDelayPanelProps = {
  projectId: string;
  productionRequestId?: string | null;
  orderId?: string | null;
  deliveryId?: string | null;
  defaultPhase?: OperationalDelayPhase;
  allowedPhases?: OperationalDelayPhase[];
  allowCreate?: boolean;
  title?: string;
};

export function OperationalDelayPanel({
  allowCreate = true,
  allowedPhases = ['PRODUCTION', 'DELIVERY'],
  defaultPhase,
  deliveryId,
  orderId,
  productionRequestId,
  projectId,
  title = 'Delay history',
}: Readonly<OperationalDelayPanelProps>) {
  const initialPhase = defaultPhase && allowedPhases.includes(defaultPhase) ? defaultPhase : allowedPhases[0];
  const [phase, setPhase] = useState<OperationalDelayPhase>(initialPhase ?? 'PRODUCTION');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  const [reasonDetail, setReasonDetail] = useState('');
  const [message, setMessage] = useState('');
  const listQuery = useProjectOperationalDelayReports(projectId, phase);
  const detailQuery = useOperationalDelayReport(selectedReportId);
  const createProductionMutation = useCreateProductionDelayReport();
  const createDeliveryMutation = useCreateDeliveryDelayReport();
  const reports = useMemo(() => listQuery.data?.items ?? [], [listQuery.data?.items]);
  const isSubmitting = createProductionMutation.isPending || createDeliveryMutation.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const detail = reasonDetail.trim();

    if (!detail) {
      setMessage('Reason detail is required.');
      return;
    }

    if (phase === 'PRODUCTION' && !productionRequestId) {
      setMessage('A production request is required to record a production delay.');
      return;
    }

    setMessage('');

    try {
      if (phase === 'PRODUCTION') {
        await createProductionMutation.mutateAsync({
          productionRequestId: productionRequestId!,
          projectId,
          reasonCode: reasonCode.trim() || null,
          reasonDetail: detail,
        });
      } else {
        await createDeliveryMutation.mutateAsync({
          deliveryId,
          orderId,
          projectId,
          reasonCode: reasonCode.trim() || null,
          reasonDetail: detail,
        });
      }

      setReasonCode('');
      setReasonDetail('');
      setIsCreateOpen(false);
    } catch (error) {
      setMessage(getOperationalDelayErrorMessage(error));
    }
  }

  return (
    <section className="operational-delay-panel">
      <div className="operational-delay-header">
        <div>
          <h3>{title}</h3>
          <p>Immutable records of production or delivery schedule risk.</p>
        </div>
        <div className="operational-delay-actions">
          <button
            aria-label="Refresh delay reports"
            disabled={listQuery.isFetching}
            type="button"
            onClick={() => void listQuery.refetch()}
          >
            <IconRefresh size={16} />
          </button>
          {allowCreate ? (
            <button className="operational-delay-primary" type="button" onClick={() => setIsCreateOpen(true)}>
              <IconPlus size={16} />
              Record risk / delay
            </button>
          ) : null}
        </div>
      </div>

      {allowedPhases.length > 1 ? (
        <div className="operational-delay-tabs" role="tablist">
          {allowedPhases.map((item) => (
            <button
              className={phase === item ? 'is-active' : ''}
              key={item}
              role="tab"
              type="button"
              onClick={() => setPhase(item)}
            >
              {formatLabel(item)}
            </button>
          ))}
        </div>
      ) : null}

      {listQuery.isLoading ? <p className="operational-delay-state">Loading delay reports...</p> : null}
      {listQuery.isError ? (
        <p className="operational-delay-state operational-delay-error">
          {getOperationalDelayErrorMessage(listQuery.error)}
        </p>
      ) : null}
      {!listQuery.isLoading && !listQuery.isError && reports.length === 0 ? (
        <p className="operational-delay-state">No {formatLabel(phase).toLowerCase()} delay reports.</p>
      ) : null}

      <div className="operational-delay-list">
        {reports.map((report) => (
          <button
            className="operational-delay-row"
            key={report.operationalDelayReportId}
            type="button"
            onClick={() => setSelectedReportId(report.operationalDelayReportId)}
          >
            <span className={`operational-delay-badge is-${report.delayState.toLowerCase()}`}>
              {formatLabel(report.delayState)}
            </span>
            <span>
              <strong>{report.reasonCode ? formatLabel(report.reasonCode) : 'Schedule risk'}</strong>
              <small>{report.reasonDetail}</small>
            </span>
            <span>
              <strong>Deadline {formatDate(report.deadlineSnapshot)}</strong>
              <small>{report.reporterName ?? 'Staff'} · {formatDateTime(report.reportedAt)}</small>
            </span>
          </button>
        ))}
      </div>

      {isCreateOpen ? (
        <div className="operational-delay-modal-backdrop">
          <form className="operational-delay-modal" onSubmit={handleSubmit}>
            <div className="operational-delay-modal-title">
              <div>
                <IconAlertTriangle size={22} />
                <h3>Record {formatLabel(phase).toLowerCase()} risk / delay</h3>
              </div>
              <button aria-label="Close" type="button" onClick={() => setIsCreateOpen(false)}>
                <IconX size={18} />
              </button>
            </div>
            <p>This report is permanent and does not create a resolution workflow.</p>
            <label>
              <span>Reason code (optional)</span>
              <input
                maxLength={100}
                placeholder={phase === 'PRODUCTION' ? 'e.g. MATERIAL_DELAY' : 'e.g. SITE_NOT_READY'}
                value={reasonCode}
                onChange={(event) => setReasonCode(event.target.value.toUpperCase().replace(/\s+/g, '_'))}
              />
            </label>
            <label>
              <span>Reason detail</span>
              <textarea
                maxLength={4000}
                required
                rows={5}
                value={reasonDetail}
                onChange={(event) => setReasonDetail(event.target.value)}
              />
            </label>
            {message ? <p className="operational-delay-error">{message}</p> : null}
            <div className="operational-delay-modal-actions">
              <button type="button" onClick={() => setIsCreateOpen(false)}>Cancel</button>
              <button className="operational-delay-primary" disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Saving...' : 'Save report'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {selectedReportId ? (
        <DelayReportDetail
          report={detailQuery.data}
          isLoading={detailQuery.isLoading}
          onClose={() => setSelectedReportId('')}
        />
      ) : null}
    </section>
  );
}

function DelayReportDetail({
  isLoading,
  onClose,
  report,
}: Readonly<{
  isLoading: boolean;
  onClose: () => void;
  report?: OperationalDelayReportDto;
}>) {
  return (
    <div className="operational-delay-modal-backdrop">
      <dialog className="operational-delay-modal" open>
        <div className="operational-delay-modal-title">
          <h3>Delay report detail</h3>
          <button aria-label="Close" type="button" onClick={onClose}><IconX size={18} /></button>
        </div>
        {isLoading || !report ? <p>Loading report...</p> : (
          <div className="operational-delay-detail-grid">
            <Detail label="Phase" value={formatLabel(report.reportPhase)} />
            <Detail label="State" value={formatLabel(report.delayState)} />
            <Detail label="Deadline snapshot" value={formatDate(report.deadlineSnapshot)} />
            <Detail label="Reason code" value={report.reasonCode ? formatLabel(report.reasonCode) : '-'} />
            <Detail label="Reporter" value={report.reporterName ?? report.reportedBy} />
            <Detail label="Reported at" value={formatDateTime(report.reportedAt)} />
            <div className="operational-delay-detail-wide">
              <Detail label="Reason detail" value={report.reasonDetail} />
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}

function Detail({ label, value }: Readonly<{ label: string; value: string }>) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function formatLabel(value: string) {
  return value.toLowerCase().split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function formatDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
