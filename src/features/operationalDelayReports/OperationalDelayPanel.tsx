import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { IconAlertTriangle, IconPlus, IconRefresh, IconX } from '@tabler/icons-react';
import { useSearchParams } from 'react-router-dom';

import {
  DELIVERY_DELAY_REASON_CODES,
  getOperationalDelayErrorMessage,
  getReportReasonCode,
  PRODUCTION_DELAY_REASON_CODES,
  type DeliveryDelayReasonCode,
  type OperationalDelayPhase,
  type OperationalDelayReportDto,
  type ProductionDelayReasonCode,
  type OperationalDelayReportResolutionStatus,
} from '@/services/api/operationalDelayReports';
import {
  useCurrentUser,
  useCreateDeliveryDelayReport,
  useCreateProductionDelayReport,
  useOperationalDelayReport,
  useProjectOperationalDelayReports,
  useResolveOperationalDelayReport,
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

const DEFAULT_ALLOWED_PHASES: OperationalDelayPhase[] = ['PRODUCTION', 'DELIVERY'];
const REPORT_STATUS_FILTERS: Array<'ALL' | OperationalDelayReportResolutionStatus> = ['ALL', 'OPEN', 'RESOLVED'];

export function OperationalDelayPanel({
  allowCreate = true,
  allowedPhases = DEFAULT_ALLOWED_PHASES,
  defaultPhase,
  deliveryId,
  orderId,
  productionRequestId,
  projectId,
  title = 'ISSUES',
}: Readonly<OperationalDelayPanelProps>) {
  const [searchParams] = useSearchParams();
  const initialPhase = defaultPhase && allowedPhases.includes(defaultPhase) ? defaultPhase : allowedPhases[0];
  const [phase, setPhase] = useState<OperationalDelayPhase>(initialPhase ?? 'PRODUCTION');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | OperationalDelayReportResolutionStatus>('OPEN');
  const [productionReasonCode, setProductionReasonCode] = useState<ProductionDelayReasonCode | ''>('');
  const [deliveryReasonCode, setDeliveryReasonCode] = useState<DeliveryDelayReasonCode | ''>('');
  const [reasonDetail, setReasonDetail] = useState('');
  const [message, setMessage] = useState('');
  const listQuery = useProjectOperationalDelayReports(projectId, phase);
  const detailQuery = useOperationalDelayReport(selectedReportId);
  const currentUserQuery = useCurrentUser();
  const createProductionMutation = useCreateProductionDelayReport();
  const createDeliveryMutation = useCreateDeliveryDelayReport();
  const reports = useMemo(() => listQuery.data?.items ?? [], [listQuery.data?.items]);
  const filteredReports = useMemo(
    () =>
      statusFilter === 'ALL'
        ? reports
        : reports.filter((report) => getReportResolutionStatus(report) === statusFilter),
    [reports, statusFilter],
  );
  const isSubmitting = createProductionMutation.isPending || createDeliveryMutation.isPending;
  const allowedPhaseKey = allowedPhases.join('|');
  const canResolve = canResolveReports(currentUserQuery.data?.role);

  useEffect(() => {
    const allowedPhaseList = allowedPhaseKey.split('|').filter(Boolean) as OperationalDelayPhase[];
    const requestedPhase = normalizeDelayPhase(searchParams.get('reportPhase'));
    const nextPhase = requestedPhase && allowedPhaseList.includes(requestedPhase)
      ? requestedPhase
      : defaultPhase && allowedPhaseList.includes(defaultPhase)
        ? defaultPhase
        : allowedPhaseList[0] ?? 'PRODUCTION';
    const reportId = searchParams.get('delayReportId');

    setPhase((current) => allowedPhaseList.includes(current) && current === nextPhase ? current : nextPhase);
    setSelectedReportId(reportId ?? '');
    setMessage('');
    setIsCreateOpen(false);
  }, [allowedPhaseKey, defaultPhase, searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const detail = reasonDetail.trim();

    if (!detail) {
      setMessage('Reason detail is required.');
      return;
    }

    if (detail.length > 4000) {
      setMessage('Reason detail must be at most 4000 characters.');
      return;
    }

    if (phase === 'PRODUCTION') {
      if (!productionRequestId) {
        setMessage('A production request is required to record a production delay.');
        return;
      }

      if (!productionReasonCode) {
        setMessage('Production reason code is required.');
        return;
      }
    } else if (!deliveryReasonCode) {
      setMessage('Delivery reason code is required.');
      return;
    }

    setMessage('');

    try {
      if (phase === 'PRODUCTION') {
        if (!productionRequestId || !productionReasonCode) {
          return;
        }

        await createProductionMutation.mutateAsync({
          productionRequestId,
          productionReasonCode,
          projectId,
          reasonDetail: detail,
        });
        setProductionReasonCode('');
      } else {
        if (!deliveryReasonCode) {
          return;
        }

        await createDeliveryMutation.mutateAsync({
          deliveryId: deliveryId || null,
          deliveryReasonCode,
          orderId: orderId || null,
          projectId,
          reasonDetail: detail,
        });
        setDeliveryReasonCode('');
      }

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

      <div className="operational-delay-tabs operational-delay-status-tabs" role="tablist" aria-label="Delay report status">
        {REPORT_STATUS_FILTERS.map((item) => (
          <button
            className={statusFilter === item ? 'is-active' : ''}
            key={item}
            role="tab"
            type="button"
            onClick={() => setStatusFilter(item)}
          >
            {item === 'ALL' ? 'All' : formatLabel(item)}
          </button>
        ))}
      </div>

      {listQuery.isLoading ? <p className="operational-delay-state">Loading delay reports...</p> : null}
      {listQuery.isError ? (
        <p className="operational-delay-state operational-delay-error">
          {getOperationalDelayErrorMessage(listQuery.error)}
        </p>
      ) : null}
      {!listQuery.isLoading && !listQuery.isError && filteredReports.length === 0 ? (
        <p className="operational-delay-state">No {formatLabel(statusFilter).toLowerCase()} {formatLabel(phase).toLowerCase()} delay reports.</p>
      ) : null}

      <div className="operational-delay-list">
        {filteredReports.map((report) => {
          const reasonCode = getReportReasonCode(report);
          const resolutionStatus = getReportResolutionStatus(report);

          return (
            <button
              className={`operational-delay-row${resolutionStatus === 'RESOLVED' ? ' is-resolved' : ''}`}
              key={report.operationalDelayReportId}
              type="button"
              onClick={() => setSelectedReportId(report.operationalDelayReportId)}
            >
              {resolutionStatus === 'OPEN' ? (
                <span className={`operational-delay-badge is-${report.delayState.toLowerCase()}`}>
                  {formatLabel(report.delayState)}
                </span>
              ) : null}
              <span>
                <strong>{reasonCode ? formatLabel(reasonCode) : 'Schedule risk'}</strong>
                <small>{report.reasonDetail}</small>
              </span>
              <span>
                <strong>Deadline {formatDate(report.deadlineSnapshot)}</strong>
                <small>{report.reporterName ?? 'Staff'} · {formatDateTime(report.reportedAt)}</small>
              </span>
              <span className={`operational-delay-resolution is-${resolutionStatus.toLowerCase()}`}>
                {formatLabel(resolutionStatus)}
              </span>
            </button>
          );
        })}
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
            <p>This report will stay in the queue until a staff member marks it resolved.</p>
            {phase === 'PRODUCTION' ? (
              <label>
                <span>Production reason code</span>
                <select
                  required
                  value={productionReasonCode}
                  onChange={(event) =>
                    setProductionReasonCode(event.target.value as ProductionDelayReasonCode | '')
                  }
                >
                  <option value="">Select a reason</option>
                  {PRODUCTION_DELAY_REASON_CODES.map((code) => (
                    <option key={code} value={code}>
                      {formatLabel(code)}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label>
                <span>Delivery reason code</span>
                <select
                  required
                  value={deliveryReasonCode}
                  onChange={(event) =>
                    setDeliveryReasonCode(event.target.value as DeliveryDelayReasonCode | '')
                  }
                >
                  <option value="">Select a reason</option>
                  {DELIVERY_DELAY_REASON_CODES.map((code) => (
                    <option key={code} value={code}>
                      {formatLabel(code)}
                    </option>
                  ))}
                </select>
              </label>
            )}
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
          canResolve={canResolve}
          report={detailQuery.data}
          isLoading={detailQuery.isLoading}
          onClose={() => setSelectedReportId('')}
        />
      ) : null}
    </section>
  );
}

function DelayReportDetail({
  canResolve,
  isLoading,
  onClose,
  report,
}: Readonly<{
  canResolve: boolean;
  isLoading: boolean;
  onClose: () => void;
  report?: OperationalDelayReportDto;
}>) {
  const reasonCode = report ? getReportReasonCode(report) : null;
  const [isResolveOpen, setIsResolveOpen] = useState(false);
  const resolutionStatus = report ? getReportResolutionStatus(report) : 'OPEN';

  return (
    <div className="operational-delay-modal-backdrop">
      <dialog className="operational-delay-modal" open>
        <div className="operational-delay-modal-title">
          <h3>Delay report detail</h3>
          <button aria-label="Close" type="button" onClick={onClose}><IconX size={18} /></button>
        </div>
        {isLoading || !report ? <p className="operational-delay-state">Loading report...</p> : (
          <div className="operational-delay-detail-grid">
            <Detail label="Phase" value={formatLabel(report.reportPhase)} />
            {resolutionStatus === 'OPEN' ? (
              <div className="operational-delay-detail-state">
                <span>State</span>
                <span className={`operational-delay-badge is-${report.delayState.toLowerCase()}`}>
                  {formatLabel(report.delayState)}
                </span>
              </div>
            ) : null}
            <div className="operational-delay-detail-state">
              <span>Status</span>
              <span className={`operational-delay-resolution is-${resolutionStatus.toLowerCase()}`}>
                {formatLabel(resolutionStatus)}
              </span>
            </div>
            <Detail label="Deadline snapshot" value={formatDate(report.deadlineSnapshot)} />
            <Detail label="Reason code" value={reasonCode ? formatLabel(reasonCode) : '-'} />
            <Detail label="Reporter" value={report.reporterName ?? report.reportedBy} />
            <Detail label="Reported at" value={formatDateTime(report.reportedAt)} />
            {report.resolvedAt ? <Detail label="Resolved at" value={formatDateTime(report.resolvedAt)} /> : null}
            <div className="operational-delay-detail-wide">
              <Detail label="Reason detail" value={report.reasonDetail} />
            </div>
            {report.resolutionNote ? (
              <div className="operational-delay-detail-wide">
                <Detail label="Resolution note" value={report.resolutionNote} />
              </div>
            ) : null}
          </div>
        )}
        {!isLoading && report && canResolve && resolutionStatus === 'OPEN' ? (
          <div className="operational-delay-modal-actions">
            <button className="operational-delay-primary" type="button" onClick={() => setIsResolveOpen(true)}>
              Mark resolved
            </button>
          </div>
        ) : null}
      </dialog>
      {isResolveOpen && report ? (
        <ResolveDelayReportModal reportId={report.operationalDelayReportId} onClose={() => setIsResolveOpen(false)} />
      ) : null}
    </div>
  );
}

function ResolveDelayReportModal({
  onClose,
  reportId,
}: Readonly<{
  onClose: () => void;
  reportId: string;
}>) {
  const [resolutionNote, setResolutionNote] = useState('');
  const [error, setError] = useState('');
  const resolveMutation = useResolveOperationalDelayReport();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (resolutionNote.length > 4000) {
      setError('Resolution note must be at most 4000 characters.');
      return;
    }

    try {
      setError('');
      await resolveMutation.mutateAsync({
        reportId,
        resolutionNote,
      });
      onClose();
    } catch (mutationError) {
      setError(getOperationalDelayErrorMessage(mutationError));
    }
  }

  return (
    <div className="operational-delay-modal-backdrop operational-delay-nested-backdrop">
      <form className="operational-delay-modal" onSubmit={handleSubmit}>
        <div className="operational-delay-modal-title">
          <h3>Resolve delay report</h3>
          <button aria-label="Close" type="button" onClick={onClose}><IconX size={18} /></button>
        </div>
        <label>
          <span>Resolution note</span>
          <textarea
            maxLength={4000}
            rows={5}
            value={resolutionNote}
            onChange={(event) => {
              setResolutionNote(event.target.value);
              setError('');
            }}
          />
        </label>
        {error ? <p className="operational-delay-error">{error}</p> : null}
        <div className="operational-delay-modal-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button className="operational-delay-primary" disabled={resolveMutation.isPending} type="submit">
            {resolveMutation.isPending ? 'Resolving...' : 'Mark resolved'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Detail({ label, value }: Readonly<{ label: string; value: string }>) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function formatLabel(value: string) {
  return value.toLowerCase().split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function normalizeDelayPhase(value: string | null): OperationalDelayPhase | null {
  if (value === 'PRODUCTION' || value === 'DELIVERY') {
    return value;
  }

  return null;
}

function getReportResolutionStatus(report: OperationalDelayReportDto): OperationalDelayReportResolutionStatus {
  return report.status ?? 'OPEN';
}

function canResolveReports(role?: string | null) {
  const normalizedRole = (role ?? '').trim().replace(/[\s-]+/g, '_').toUpperCase();

  return normalizedRole === 'ADMIN' || normalizedRole === 'SALES' || normalizedRole === 'SALE' || normalizedRole === 'PRODUCTION';
}

function formatDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
