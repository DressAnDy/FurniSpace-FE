import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCash,
  IconClipboardList,
  IconExternalLink,
  IconRefresh,
  IconSearch,
  IconX,
} from '@tabler/icons-react';

import { useLang, type Lang } from '@/app/providers/useLang';
import { getProjectReportServiceResultMessage } from '@/services/api/projectReports';
import type {
  ProjectReportAttentionReason,
  ProjectReportDetailDto,
  ProjectReportListItemDto,
  ProjectReportOwnerRole,
  ProjectReportSeverity,
  ProjectReportStageKey,
} from '@/services/api/projectReports';
import { useProjectReportDetail, useProjectReportList } from '@/services/queries';

import { AdminNavbar, AdminSidebar } from '../admincomponents';
import { FinancialPanel } from './AdminFinancialPanel';
import {
  formatDate,
  formatDateTime,
  formatDays,
  formatMoney,
  labelOwner,
  labelReason,
  labelSeverity,
  labelStage,
  labelStageState,
  ownerOptions,
  reasonOptions,
  reportsCopy,
  severityOptions,
  severityTone,
  stageOptions,
} from './adminReportsI18n';
import './AdminReports.css';

type ReportTabId = 'attention' | 'financial';

const EMPTY_ITEMS: ProjectReportListItemDto[] = [];

function defaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 29);
  return {
    from: toDateInputValue(from),
    to: toDateInputValue(to),
  };
}

function isReportTabId(value: string | null): value is ReportTabId {
  return value === 'attention' || value === 'financial';
}

export function AdminReports() {
  const { lang } = useLang();
  const t = reportsCopy[lang];
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRange = useMemo(() => defaultDateRange(), []);
  const tabFromUrl = searchParams.get('tab');
  const projectFromUrl = searchParams.get('projectId');

  const [activeTab, setActiveTab] = useState<ReportTabId>(isReportTabId(tabFromUrl) ? tabFromUrl : 'attention');
  const [fromDate, setFromDate] = useState(initialRange.from);
  const [toDate, setToDate] = useState(initialRange.to);
  const [keyword, setKeyword] = useState('');
  const [draftKeyword, setDraftKeyword] = useState('');
  const [severity, setSeverity] = useState<ProjectReportSeverity | ''>('');
  const [stage, setStage] = useState<ProjectReportStageKey | ''>('');
  const [attentionReason, setAttentionReason] = useState<ProjectReportAttentionReason | ''>('');
  const [ownerRole, setOwnerRole] = useState<ProjectReportOwnerRole | ''>('');
  const [attentionOnly, setAttentionOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projectFromUrl);

  const dateParams = useMemo(
    () => ({
      from: toFinancialApiDateTime(fromDate),
      to: toFinancialApiDateTime(toDate),
    }),
    [fromDate, toDate],
  );

  const listParams = useMemo(
    () => ({
      keyword: keyword.trim() || null,
      severity: severity || null,
      stage: stage || null,
      attentionReason: attentionReason || null,
      ownerRole: ownerRole || null,
      attentionOnly,
      from: fromDate ? `${fromDate}T00:00:00` : null,
      to: toDate ? `${toDate}T23:59:59` : null,
      page,
      pageSize: 20,
      sortBy: 'severityDesc' as const,
    }),
    [attentionOnly, attentionReason, fromDate, keyword, ownerRole, page, severity, stage, toDate],
  );

  const listQuery = useProjectReportList(listParams, { enabled: activeTab === 'attention' });
  const detailQuery = useProjectReportDetail(selectedProjectId, {
    enabled: activeTab === 'attention' && Boolean(selectedProjectId),
  });

  const items = listQuery.data?.items ?? EMPTY_ITEMS;
  const totalPages = Math.max(listQuery.data?.totalPages ?? 1, 1);
  const totalItems = listQuery.data?.totalItems ?? 0;
  const activeTabDesc = activeTab === 'attention' ? t.attentionDesc : t.financialDesc;

  const handleTabChange = (tab: ReportTabId) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    if (tab === 'attention') {
      next.delete('tab');
    } else {
      next.set('tab', tab);
    }
    setSearchParams(next, { replace: true });
  };

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    const next = new URLSearchParams(searchParams);
    next.set('projectId', projectId);
    if (activeTab !== 'attention') next.delete('tab');
    setSearchParams(next, { replace: true });
  };

  const handleCloseDetail = () => {
    setSelectedProjectId(null);
    const next = new URLSearchParams(searchParams);
    next.delete('projectId');
    setSearchParams(next, { replace: true });
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setKeyword(draftKeyword);
  };

  const handleResetFilters = () => {
    setDraftKeyword('');
    setKeyword('');
    setSeverity('');
    setStage('');
    setAttentionReason('');
    setOwnerRole('');
    setAttentionOnly(true);
    setPage(1);
    setFromDate(initialRange.from);
    setToDate(initialRange.to);
  };

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <AdminSidebar activeLabel="Reports" />
        <section className="admin-main">
          <AdminNavbar activeLabel="Reports" />
          <div className="admin-content admin-reports-content">
            <section className="admin-page-heading admin-reports-heading">
              <div>
                <h2>{t.pageTitle}</h2>
                <p>{t.pageSubtitle}</p>
              </div>
            </section>

            <nav className="admin-report-tabs" aria-label={t.tabsAria}>
              <button
                type="button"
                className={`admin-report-tab${activeTab === 'attention' ? ' is-active' : ''}`}
                onClick={() => handleTabChange('attention')}
              >
                <IconClipboardList size={16} />
                {t.attentionTab}
              </button>
              <button
                type="button"
                className={`admin-report-tab${activeTab === 'financial' ? ' is-active' : ''}`}
                onClick={() => handleTabChange('financial')}
              >
                <IconCash size={16} />
                {t.financialTab}
              </button>
            </nav>
            <p className="admin-report-tab-desc">{activeTabDesc}</p>

            {activeTab === 'financial' ? (
              <>
                <section className="admin-card admin-report-filters admin-pr-financial-filters" aria-label={t.dateRangeAria}>
                  <label className="admin-report-filter">
                    <span>{t.fromDate}</span>
                    <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
                  </label>
                  <label className="admin-report-filter">
                    <span>{t.toDate}</span>
                    <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
                  </label>
                </section>
                <FinancialPanel dateParams={dateParams} fromDate={fromDate} toDate={toDate} />
              </>
            ) : (
              <AttentionReportPanel
                lang={lang}
                draftKeyword={draftKeyword}
                setDraftKeyword={setDraftKeyword}
                onSearchSubmit={handleSearchSubmit}
                severity={severity}
                setSeverity={(value) => {
                  setSeverity(value);
                  setPage(1);
                }}
                stage={stage}
                setStage={(value) => {
                  setStage(value);
                  setPage(1);
                }}
                attentionReason={attentionReason}
                setAttentionReason={(value) => {
                  setAttentionReason(value);
                  setPage(1);
                }}
                ownerRole={ownerRole}
                setOwnerRole={(value) => {
                  setOwnerRole(value);
                  setPage(1);
                }}
                attentionOnly={attentionOnly}
                setAttentionOnly={(value) => {
                  setAttentionOnly(value);
                  setPage(1);
                }}
                fromDate={fromDate}
                setFromDate={(value) => {
                  setFromDate(value);
                  setPage(1);
                }}
                toDate={toDate}
                setToDate={(value) => {
                  setToDate(value);
                  setPage(1);
                }}
                onResetFilters={handleResetFilters}
                listLoading={listQuery.isLoading}
                listError={listQuery.isError ? getProjectReportServiceResultMessage(listQuery.error) : null}
                onRetryList={() => void listQuery.refetch()}
                items={items}
                totalItems={totalItems}
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                selectedProjectId={selectedProjectId}
                onSelectProject={handleSelectProject}
                onCloseDetail={handleCloseDetail}
                detail={detailQuery.data ?? null}
                detailLoading={detailQuery.isLoading}
                detailError={detailQuery.isError ? getProjectReportServiceResultMessage(detailQuery.error) : null}
                onRetryDetail={() => void detailQuery.refetch()}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

type AttentionReportPanelProps = {
  lang: Lang;
  draftKeyword: string;
  setDraftKeyword: (value: string) => void;
  onSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
  severity: ProjectReportSeverity | '';
  setSeverity: (value: ProjectReportSeverity | '') => void;
  stage: ProjectReportStageKey | '';
  setStage: (value: ProjectReportStageKey | '') => void;
  attentionReason: ProjectReportAttentionReason | '';
  setAttentionReason: (value: ProjectReportAttentionReason | '') => void;
  ownerRole: ProjectReportOwnerRole | '';
  setOwnerRole: (value: ProjectReportOwnerRole | '') => void;
  attentionOnly: boolean;
  setAttentionOnly: (value: boolean) => void;
  fromDate: string;
  setFromDate: (value: string) => void;
  toDate: string;
  setToDate: (value: string) => void;
  onResetFilters: () => void;
  listLoading: boolean;
  listError: string | null;
  onRetryList: () => void;
  items: ProjectReportListItemDto[];
  totalItems: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  selectedProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  onCloseDetail: () => void;
  detail: ProjectReportDetailDto | null;
  detailLoading: boolean;
  detailError: string | null;
  onRetryDetail: () => void;
};

function AttentionReportPanel(props: AttentionReportPanelProps) {
  const {
    lang,
    draftKeyword,
    setDraftKeyword,
    onSearchSubmit,
    severity,
    setSeverity,
    stage,
    setStage,
    attentionReason,
    setAttentionReason,
    ownerRole,
    setOwnerRole,
    attentionOnly,
    setAttentionOnly,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    onResetFilters,
    listLoading,
    listError,
    onRetryList,
    items,
    totalItems,
    page,
    totalPages,
    onPageChange,
    selectedProjectId,
    onSelectProject,
    onCloseDetail,
    detail,
    detailLoading,
    detailError,
    onRetryDetail,
  } = props;
  const t = reportsCopy[lang];

  return (
    <div className={`admin-pr-layout${selectedProjectId ? ' has-detail' : ''}`}>
      <section className="admin-card admin-pr-list-panel" aria-label={t.listAria}>
        <form className="admin-pr-filters" onSubmit={onSearchSubmit}>
          <label className="admin-report-filter admin-pr-search">
            <span>{t.searchLabel}</span>
            <div>
              <IconSearch size={16} />
              <input
                value={draftKeyword}
                onChange={(event) => setDraftKeyword(event.target.value)}
                placeholder={t.searchPlaceholder}
                aria-label={t.searchLabel}
              />
            </div>
          </label>

          <label className="admin-report-filter">
            <span>{t.severity}</span>
            <select value={severity} onChange={(event) => setSeverity(event.target.value as ProjectReportSeverity | '')}>
              <option value="">{t.all}</option>
              {severityOptions(lang).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-report-filter">
            <span>{t.stage}</span>
            <select value={stage} onChange={(event) => setStage(event.target.value as ProjectReportStageKey | '')}>
              <option value="">{t.all}</option>
              {stageOptions(lang).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-report-filter">
            <span>{t.reason}</span>
            <select
              value={attentionReason}
              onChange={(event) => setAttentionReason(event.target.value as ProjectReportAttentionReason | '')}
            >
              <option value="">{t.all}</option>
              {reasonOptions(lang).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-report-filter">
            <span>{t.owner}</span>
            <select value={ownerRole} onChange={(event) => setOwnerRole(event.target.value as ProjectReportOwnerRole | '')}>
              <option value="">{t.all}</option>
              {ownerOptions(lang).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-report-filter">
            <span>{t.fromDate}</span>
            <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          </label>

          <label className="admin-report-filter">
            <span>{t.toDate}</span>
            <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </label>

          <label className="admin-pr-check">
            <input type="checkbox" checked={attentionOnly} onChange={(event) => setAttentionOnly(event.target.checked)} />
            <span>{t.attentionOnly}</span>
          </label>

          <div className="admin-pr-filter-actions">
            <button className="admin-button admin-button-secondary" type="submit">
              <IconSearch size={16} />
              {t.filter}
            </button>
            <button className="admin-button admin-button-ghost" type="button" onClick={onResetFilters}>
              <IconRefresh size={16} />
              {t.reset}
            </button>
          </div>
        </form>

        <div className="admin-pr-list-meta">
          <strong>{totalItems}</strong> {t.projectsCount}
          {attentionOnly ? t.needingAttention : ''}
        </div>

        {listError ? (
          <StateBox tone="error" title={t.listErrorTitle} message={listError} actionLabel={t.retry} onAction={onRetryList} />
        ) : listLoading ? (
          <StateBox tone="neutral" title={t.loadingTitle} message={t.loadingList} />
        ) : items.length === 0 ? (
          <StateBox
            tone="ok"
            title={t.emptyAttentionTitle}
            message={attentionOnly ? t.emptyAttentionOnly : t.emptyFiltered}
          />
        ) : (
          <ul className="admin-pr-list">
            {items.map((item) => {
              const tone = severityTone(item.severity);
              const selected = item.projectId === selectedProjectId;
              return (
                <li key={item.projectId}>
                  <button
                    type="button"
                    className={`admin-pr-row${selected ? ' is-selected' : ''} tone-${tone}`}
                    onClick={() => onSelectProject(item.projectId)}
                  >
                    <div className="admin-pr-row-top">
                      <span className={`admin-pr-badge tone-${tone}`}>{labelSeverity(lang, item.severity)}</span>
                      <span className="admin-pr-code">{item.projectCode}</span>
                      <span className="admin-pr-age">
                        {formatDays(lang, item.ageInStatusDays)} {t.inThisStatus}
                      </span>
                    </div>
                    <h3>{item.projectName}</h3>
                    <p className="admin-pr-reason">{labelReason(lang, item.attentionReason)}</p>
                    <p className="admin-pr-action">{item.suggestedAction || t.noImmediateAction}</p>
                    <div className="admin-pr-row-meta">
                      <span>{item.customerName}</span>
                      <span>{labelStage(lang, item.stage)}</span>
                      <span>
                        {t.ownedBy}: {labelOwner(lang, item.ownerRole)}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {totalPages > 1 ? (
          <div className="admin-pr-pagination">
            <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              {t.prev}
            </button>
            <span>{t.pageOf(page, totalPages)}</span>
            <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
              {t.next}
            </button>
          </div>
        ) : null}
      </section>

      {selectedProjectId ? (
        <section className="admin-card admin-pr-detail-panel" aria-label={t.detailAria}>
          <header className="admin-pr-detail-header">
            <div>
              <p className="admin-pr-detail-kicker">{t.detailKicker}</p>
              <h3>{detail?.header.projectName ?? t.loading}</h3>
            </div>
            <button type="button" className="admin-button admin-button-ghost" onClick={onCloseDetail} aria-label={t.closeDetail}>
              <IconX size={16} />
              {t.close}
            </button>
          </header>

          {detailError ? (
            <StateBox tone="error" title={t.detailErrorTitle} message={detailError} actionLabel={t.retry} onAction={onRetryDetail} />
          ) : detailLoading || !detail ? (
            <StateBox tone="neutral" title={t.loadingDetailTitle} message={t.loadingDetailMsg} />
          ) : (
            <ProjectReportDetailView lang={lang} detail={detail} />
          )}
        </section>
      ) : (
        <aside className="admin-card admin-pr-empty-detail" aria-label={t.guideAria}>
          <IconClipboardList size={28} />
          <h3>{t.pickProjectTitle}</h3>
          <p>{t.pickProjectMsg}</p>
        </aside>
      )}
    </div>
  );
}

function ProjectReportDetailView({ lang, detail }: { lang: Lang; detail: ProjectReportDetailDto }) {
  const t = reportsCopy[lang];
  const { header, currentStageHealth, flowProgress, commercialSnapshot, terminalSummary } = detail;
  const attention = header.primaryAttention;
  const tone = severityTone(attention?.severity);

  return (
    <div className="admin-pr-detail">
      <section className={`admin-pr-attention tone-${tone}`}>
        {attention ? (
          <>
            <div className="admin-pr-attention-top">
              <span className={`admin-pr-badge tone-${tone}`}>{labelSeverity(lang, attention.severity)}</span>
              <span>{labelReason(lang, attention.reason)}</span>
              <span>
                {t.ownedBy}: {labelOwner(lang, attention.ownerRole)}
              </span>
            </div>
            <p className="admin-pr-attention-action">
              <IconArrowRight size={16} />
              {attention.suggestedAction}
            </p>
          </>
        ) : (
          <p className="admin-pr-attention-action is-ok">{t.healthyProject}</p>
        )}
        {header.allAttentionReasons.length > 1 ? (
          <p className="admin-pr-more-reasons">
            {t.otherReasons}: {header.allAttentionReasons.slice(1).map((reason) => labelReason(lang, reason)).join(', ')}
          </p>
        ) : null}
      </section>

      <section className="admin-pr-section">
        <h4>{t.shortInfo}</h4>
        <dl className="admin-pr-facts">
          <Fact label={t.code} value={header.projectCode} />
          <Fact label={t.status} value={header.projectStatus} />
          <Fact label={t.stage} value={labelStage(lang, header.stage)} />
          <Fact label={t.customer} value={header.customerName} />
          <Fact label="Sales" value={header.assignedSalesName ?? t.unassigned} />
          <Fact label="Designer" value={header.assignedDesignerName ?? t.unassigned} />
          <Fact label={t.projectAge} value={formatDays(lang, header.ageDays)} />
          <Fact label={t.inStatus} value={formatDays(lang, header.ageInStatusDays)} />
          <Fact label={t.submittedAt} value={formatDateTime(lang, header.submittedAt)} />
          {header.businessType ? <Fact label={t.businessType} value={header.businessType} /> : null}
          {header.projectAddress ? <Fact label={t.address} value={header.projectAddress} /> : null}
          {header.isRejected ? <Fact label={t.rejectionReason} value={header.rejectionReason ?? '—'} /> : null}
        </dl>
      </section>

      {terminalSummary ? (
        <section className="admin-pr-section">
          <h4>{terminalSummary.outcome === 'COMPLETED' ? t.completed : t.rejected}</h4>
          <p>{terminalSummary.note || (terminalSummary.outcome === 'COMPLETED' ? t.completedNote : t.rejectedNote)}</p>
          <dl className="admin-pr-facts">
            <Fact label={t.endedAt} value={formatDateTime(lang, terminalSummary.completedAt)} />
            <Fact label={t.duration} value={formatDays(lang, terminalSummary.durationDays)} />
            {terminalSummary.rejectionReason ? <Fact label={t.reasonLabel} value={terminalSummary.rejectionReason} /> : null}
          </dl>
        </section>
      ) : null}

      {currentStageHealth ? (
        <section className="admin-pr-section">
          <h4>{t.currentStage}</h4>
          <div className={`admin-pr-stage-health state-${currentStageHealth.state.toLowerCase()}`}>
            <div className="admin-pr-stage-health-top">
              <strong>{currentStageHealth.title}</strong>
              <span>{labelStageState(lang, currentStageHealth.state)}</span>
              <span>
                {formatDays(lang, currentStageHealth.ageInStageDays)} {t.inThisStage}
              </span>
            </div>
            <p>{currentStageHealth.summary}</p>
            {currentStageHealth.blockers.length > 0 ? (
              <ul className="admin-pr-blockers">
                {currentStageHealth.blockers.map((blocker) => (
                  <li key={`${blocker.code}-${blocker.message}`}>
                    <IconAlertTriangle size={14} />
                    {blocker.message}
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="admin-pr-next-action">
              <strong>{labelOwner(lang, currentStageHealth.nextAction.ownerRole)}</strong>
              {' — '}
              {currentStageHealth.nextAction.suggestedAction}
            </p>
            {currentStageHealth.links.length > 0 ? (
              <div className="admin-pr-links">
                {currentStageHealth.links.map((link) => (
                  <DetailLink key={`${link.type}-${link.id}`} type={link.type} id={link.id} label={link.label} projectId={header.projectId} />
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="admin-pr-section">
        <h4>{t.flowProgress}</h4>
        <ol className="admin-pr-flow">
          {flowProgress.stages.map((flowStage) => (
            <li key={flowStage.key} className={`state-${flowStage.state.toLowerCase()}`}>
              <span className="admin-pr-flow-dot" />
              <div>
                <strong>{labelStage(lang, flowStage.key)}</strong>
                <span>{labelStageState(lang, flowStage.state)}</span>
                {flowStage.completedAt ? <small>{formatDate(lang, flowStage.completedAt)}</small> : null}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {commercialSnapshot ? (
        <section className="admin-pr-section">
          <h4>{t.moneyQuick}</h4>
          <dl className="admin-pr-facts admin-pr-money">
            <Fact
              label={t.startFee}
              value={`${formatMoney(lang, commercialSnapshot.projectStartFeeAmount)} · ${commercialSnapshot.projectStartFeeStatus ?? t.noneYet}`}
            />
            <Fact
              label={t.order}
              value={
                commercialSnapshot.orderCode
                  ? `${commercialSnapshot.orderCode} · ${commercialSnapshot.orderStatus ?? '—'}`
                  : t.noOrder
              }
            />
            <Fact label={t.orderValue} value={formatMoney(lang, commercialSnapshot.orderFinalTotal)} />
            <Fact label={t.paidOnOrder} value={formatMoney(lang, commercialSnapshot.orderPaidAmount)} />
            <Fact label={t.remainingOnOrder} value={formatMoney(lang, commercialSnapshot.orderRemainingAmount)} />
            <Fact
              label={t.collecting}
              value={
                commercialSnapshot.activePaymentId
                  ? `${formatMoney(lang, commercialSnapshot.activePaymentAmount)} · ${commercialSnapshot.activePaymentStatus ?? '—'}`
                  : t.none
              }
            />
            <Fact label={t.totalCollected} value={formatMoney(lang, commercialSnapshot.totalProjectCashCollected)} />
            <Fact label={t.lastPaid} value={formatDateTime(lang, commercialSnapshot.lastPaidAt)} />
          </dl>
          <div className="admin-pr-links">
            <Link className="admin-pr-link" to={`/admin/projects?projectId=${header.projectId}`}>
              <IconExternalLink size={14} />
              {t.openProject}
            </Link>
            <Link className="admin-pr-link" to="/admin/reports?tab=financial">
              <IconExternalLink size={14} />
              {t.openFinancial}
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function DetailLink({
  type,
  id,
  label,
  projectId,
}: {
  type: string;
  id: string;
  label: string;
  projectId: string;
}) {
  const href = resolveDetailLink(type, id, projectId);
  if (!href) {
    return (
      <span className="admin-pr-link is-disabled" title={id}>
        {label}
      </span>
    );
  }

  return (
    <Link className="admin-pr-link" to={href}>
      <IconExternalLink size={14} />
      {label}
    </Link>
  );
}

function resolveDetailLink(type: string, id: string, projectId: string) {
  switch (type) {
    case 'WORKFLOW':
      return `/admin/projects?projectId=${projectId}`;
    case 'ORDER':
      return `/admin/projects?projectId=${projectId}`;
    case 'QUOTATION':
      return `/admin/projects?projectId=${projectId}`;
    case 'PAYMENT':
      return `/admin/reports?tab=financial`;
    case 'PRODUCTION_REQUEST':
      return `/admin/projects?projectId=${projectId}`;
    case 'SCHEDULE':
      return `/admin/projects?projectId=${projectId}`;
    default:
      return id ? `/admin/projects?projectId=${projectId}` : null;
  }
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function StateBox({
  tone,
  title,
  message,
  actionLabel,
  onAction,
}: {
  tone: 'error' | 'neutral' | 'ok';
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className={`admin-pr-state tone-${tone}`}>
      <strong>{title}</strong>
      <p>{message}</p>
      {actionLabel && onAction ? (
        <button type="button" className="admin-button admin-button-secondary" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function toDateInputValue(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function toFinancialApiDateTime(date: string) {
  return `${date}T00:00:00+07:00`;
}
