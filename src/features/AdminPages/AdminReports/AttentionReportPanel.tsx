import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCash,
  IconClipboardList,
  IconExternalLink,
  IconSearch,
  IconX,
} from '@tabler/icons-react';

import type { Lang } from '@/app/providers/useLang';
import type { AdminFinancialExceptionRowDto } from '@/services/api/adminFinancial';
import type {
  ProjectReportAttentionReason,
  ProjectReportDetailDto,
  ProjectReportListItemDto,
  ProjectReportSeverity,
  ProjectReportStageKey,
} from '@/services/api/projectReports';

import {
  financialCopy,
  formatDate,
  formatDateTime,
  formatDays,
  formatEnumLabel,
  formatKpiMoney,
  formatMoney,
  formatSeverityLabel,
  labelOwner,
  labelReason,
  labelSeverity,
  labelStage,
  labelStageState,
  reasonOptions,
  reportsCopy,
  severityOptions,
  severityTone,
  stageOptions,
} from './adminReportsI18n';

export type AttentionFeedKind = 'all' | 'project' | 'money';

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
  attentionOnly: boolean;
  feedKind: AttentionFeedKind;
  onFeedKindChange: (value: AttentionFeedKind) => void;
  listLoading: boolean;
  listError: string | null;
  onRetryList: () => void;
  items: ProjectReportListItemDto[];
  totalItems: number;
  moneyLoading: boolean;
  moneyError: string | null;
  onRetryMoney: () => void;
  moneyItems: AdminFinancialExceptionRowDto[];
  moneyTotalItems: number;
  selectedProjectId: string | null;
  selectedMoneyKey: string | null;
  onSelectProject: (projectId: string) => void;
  onSelectMoney: (item: AdminFinancialExceptionRowDto, index: number) => void;
  onCloseDetail: () => void;
  detail: ProjectReportDetailDto | null;
  detailLoading: boolean;
  detailError: string | null;
  onRetryDetail: () => void;
  selectedMoney: AdminFinancialExceptionRowDto | null;
};

export function moneyExceptionKey(item: AdminFinancialExceptionRowDto, index: number) {
  return `${item.exceptionType}-${item.targetResourceId ?? item.paymentId ?? item.orderId ?? item.projectId ?? index}`;
}

export function AttentionReportPanel(props: AttentionReportPanelProps) {
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
    attentionOnly,
    feedKind,
    onFeedKindChange,
    listLoading,
    listError,
    onRetryList,
    items,
    totalItems,
    moneyLoading,
    moneyError,
    onRetryMoney,
    moneyItems,
    moneyTotalItems,
    selectedProjectId,
    selectedMoneyKey,
    onSelectProject,
    onSelectMoney,
    onCloseDetail,
    detail,
    detailLoading,
    detailError,
    onRetryDetail,
    selectedMoney,
  } = props;
  const t = reportsCopy[lang];
  const ft = financialCopy[lang];
  const showProjects = feedKind !== 'money';
  const showMoney = feedKind !== 'project';
  const hasDetail = Boolean(selectedProjectId || selectedMoney);
  const combinedCount = (showProjects ? totalItems : 0) + (showMoney ? moneyTotalItems : 0);
  const [displayPage, setDisplayPage] = useState(1);
  const [displayPageSize, setDisplayPageSize] = useState(3);
  const feedKeys = useMemo(
    () => [
      ...(showMoney ? moneyItems.map((item, index) => `money-${moneyExceptionKey(item, index)}`) : []),
      ...(showProjects ? items.map((item) => `project-${item.projectId}`) : []),
    ],
    [items, moneyItems, showMoney, showProjects],
  );
  const displayTotalPages = Math.max(Math.ceil(feedKeys.length / displayPageSize), 1);
  const visibleFeedKeys = useMemo(
    () =>
      new Set(
        feedKeys.slice(
          (displayPage - 1) * displayPageSize,
          displayPage * displayPageSize,
        ),
      ),
    [displayPage, displayPageSize, feedKeys],
  );

  useEffect(() => {
    setDisplayPage(1);
  }, [feedKind, displayPageSize]);

  useEffect(() => {
    if (displayPage > displayTotalPages) setDisplayPage(displayTotalPages);
  }, [displayPage, displayTotalPages]);
  const showEmpty =
    !listLoading &&
    !moneyLoading &&
    (showProjects ? items.length === 0 : true) &&
    (showMoney ? moneyItems.length === 0 : true);

  return (
    <div className="admin-pr-attention-wrap">
      <form
        id="admin-pr-attention-search-form"
        className="admin-card admin-report-filters admin-pr-financial-filters admin-pr-attention-toolbar"
        onSubmit={onSearchSubmit}
      >
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

        <div className="admin-pr-financial-list-switch admin-pr-feed-switch" role="tablist" aria-label={t.feedKindAria}>
          {(
            [
              { id: 'all', label: t.feedKindAll, count: totalItems + moneyTotalItems },
              { id: 'project', label: t.feedKindProject, count: totalItems },
              { id: 'money', label: t.feedKindMoney, count: moneyTotalItems },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={feedKind === option.id}
              className={`admin-pr-financial-list-btn${feedKind === option.id ? ' is-active' : ''}`}
              onClick={() => onFeedKindChange(option.id)}
            >
              {option.label}
              <em className="admin-pr-feed-count">{option.count}</em>
            </button>
          ))}
        </div>
      </form>

      <div className={`admin-pr-layout${hasDetail ? ' has-detail' : ''}`}>
        <section className="admin-card admin-pr-list-panel" aria-label={t.listAria}>
          <div className="admin-pr-list-meta">
            <strong>{combinedCount}</strong> {t.attentionItemsCount}
          </div>

        {showMoney && moneyError ? (
          <StateBox tone="error" title={ft.exceptionsTitle} message={moneyError} actionLabel={t.retry} onAction={onRetryMoney} />
        ) : null}

        {showProjects && listError ? (
          <StateBox tone="error" title={t.listErrorTitle} message={listError} actionLabel={t.retry} onAction={onRetryList} />
        ) : null}

        {(showMoney && moneyLoading) || (showProjects && listLoading) ? (
          <StateBox tone="neutral" title={t.loadingTitle} message={t.loadingList} />
        ) : null}

        {showEmpty ? (
          <StateBox
            tone="ok"
            title={t.emptyAttentionTitle}
            message={attentionOnly ? t.emptyAttentionOnly : t.emptyFiltered}
          />
        ) : (
          <ul className="admin-pr-list">
            {showMoney
              ? moneyItems
                .map((item, index) => ({ item, index }))
                .filter(({ item, index }) =>
                  visibleFeedKeys.has(`money-${moneyExceptionKey(item, index)}`),
                )
                .map(({ item, index }) => {
                  const key = moneyExceptionKey(item, index);
                  const tone = severityTone(item.severity);
                  const selected =
                    key === selectedMoneyKey || (item.projectId != null && item.projectId === selectedProjectId);
                  return (
                    <li key={`money-${key}`}>
                      <button
                        type="button"
                        className={`admin-pr-row${selected ? ' is-selected' : ''} tone-${tone}`}
                        onClick={() => onSelectMoney(item, index)}
                      >
                        <div className="admin-pr-row-top">
                          <span className="admin-pr-kind is-money">{t.feedKindMoney}</span>
                          <span className={`admin-pr-badge tone-${tone}`}>{formatSeverityLabel(lang, item.severity)}</span>
                          <span className="admin-pr-age">{item.age != null ? formatDays(lang, item.age) : '—'}</span>
                        </div>
                        <h3>{item.title}</h3>
                        <p className="admin-pr-reason">{formatEnumLabel(lang, item.exceptionType)}</p>
                        <p className="admin-pr-action">{item.recommendedAction || item.reason || t.noImmediateAction}</p>
                        <div className="admin-pr-row-meta">
                          <span>{item.amount != null ? formatKpiMoney(lang, item.amount) : '—'}</span>
                          <span>{item.projectId ? t.hasLinkedProject : t.noLinkedProject}</span>
                        </div>
                      </button>
                    </li>
                  );
                })
              : null}

            {showProjects
              ? items.filter((item) =>
                  visibleFeedKeys.has(`project-${item.projectId}`),
                ).map((item) => {
                  const tone = severityTone(item.severity);
                  const selected = item.projectId === selectedProjectId;
                  return (
                    <li key={`project-${item.projectId}`}>
                      <button
                        type="button"
                        className={`admin-pr-row${selected ? ' is-selected' : ''} tone-${tone}`}
                        onClick={() => onSelectProject(item.projectId)}
                      >
                        <div className="admin-pr-row-top">
                          <span className="admin-pr-kind is-project">{t.feedKindProject}</span>
                          <span className={`admin-pr-badge tone-${tone}`}>{labelSeverity(lang, item.severity)}</span>
                          <span className="admin-pr-code">{item.projectCode || item.projectId.slice(0, 8)}</span>
                          <span className="admin-pr-age">
                            {formatDays(lang, item.ageInStatusDays)} {t.inThisStatus}
                          </span>
                        </div>
                        <h3>{item.projectName}</h3>
                        <p className="admin-pr-reason">{labelReason(lang, item.attentionReason)}</p>
                        <p className="admin-pr-action">{item.suggestedAction || t.noImmediateAction}</p>
                        <div className="admin-pr-row-meta">
                          <span>{item.customerName || '—'}</span>
                          <span>{labelStage(lang, item.stage)}</span>
                          <span>
                            {t.ownedBy}: {labelOwner(lang, item.ownerRole)}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })
              : null}
          </ul>
        )}

        <AttentionPager
          lang={lang}
          page={displayPage}
          pageSize={displayPageSize}
          totalPages={displayTotalPages}
          totalItems={feedKeys.length}
          onPageChange={setDisplayPage}
          onPageSizeChange={setDisplayPageSize}
        />
      </section>

      {selectedMoney && !selectedProjectId ? (
        <section className="admin-card admin-pr-detail-panel" aria-label={t.detailAria}>
          <header className="admin-pr-detail-header">
            <div>
              <p className="admin-pr-detail-kicker">{ft.exceptionsTitle}</p>
              <h3>{selectedMoney.title}</h3>
            </div>
            <button type="button" className="admin-button admin-button-ghost" onClick={onCloseDetail} aria-label={t.closeDetail}>
              <IconX size={16} />
              {t.close}
            </button>
          </header>
          <MoneyExceptionDetail lang={lang} item={selectedMoney} />
        </section>
      ) : selectedProjectId ? (
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
    </div>
  );
}

function AttentionPager({
  lang,
  page,
  pageSize,
  totalPages,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: {
  lang: Lang;
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const t = reportsCopy[lang];
  const ft = financialCopy[lang];
  const [pageDraft, setPageDraft] = useState(String(page));
  const [sizeDraft, setSizeDraft] = useState(String(pageSize));

  useEffect(() => setPageDraft(String(page)), [page]);
  useEffect(() => setSizeDraft(String(pageSize)), [pageSize]);

  const commitPage = () => {
    const parsed = Number.parseInt(pageDraft, 10);
    const next = Number.isFinite(parsed)
      ? Math.min(Math.max(parsed, 1), totalPages)
      : page;
    setPageDraft(String(next));
    onPageChange(next);
  };

  const commitPageSize = () => {
    const parsed = Number.parseInt(sizeDraft, 10);
    const next = Number.isFinite(parsed)
      ? Math.min(Math.max(parsed, 1), 100)
      : pageSize;
    setSizeDraft(String(next));
    onPageSizeChange(next);
  };

  return (
    <div className="admin-financial-pager admin-pr-list-pager">
      <div className="admin-financial-pager-meta">
        <label className="admin-financial-pager-field">
          <span>{ft.rowsPerPage}</span>
          <input
            aria-label={ft.rowsPerPage}
            min={1}
            max={100}
            type="number"
            value={sizeDraft}
            onChange={(event) => setSizeDraft(event.target.value)}
            onBlur={commitPageSize}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
          />
        </label>
        <label className="admin-financial-pager-field">
          <span>{ft.pageLabel}</span>
          <input
            aria-label={ft.pageLabel}
            min={1}
            max={totalPages}
            type="number"
            value={pageDraft}
            onChange={(event) => setPageDraft(event.target.value)}
            onBlur={commitPage}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
          />
          <span className="admin-financial-pager-of">/ {totalPages}</span>
        </label>
        <span className="admin-financial-pager-total">{ft.totalRows(totalItems)}</span>
      </div>
      <div className="admin-financial-pager-nav">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          {t.prev}
        </button>
        <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          {t.next}
        </button>
      </div>
    </div>
  );
}

function MoneyExceptionDetail({ lang, item }: { lang: Lang; item: AdminFinancialExceptionRowDto }) {
  const t = reportsCopy[lang];
  const ft = financialCopy[lang];
  const tone = severityTone(item.severity);

  return (
    <div className="admin-pr-detail">
      <section className={`admin-pr-attention tone-${tone}`}>
        <div className="admin-pr-attention-top">
          <span className={`admin-pr-badge tone-${tone}`}>{formatSeverityLabel(lang, item.severity)}</span>
          <span>{formatEnumLabel(lang, item.exceptionType)}</span>
          <span className="admin-pr-kind is-money">{t.feedKindMoney}</span>
        </div>
        <p className="admin-pr-attention-action">
          <IconArrowRight size={16} />
          {item.recommendedAction || item.reason || t.noImmediateAction}
        </p>
      </section>
      <section className="admin-pr-section">
        <h4>{t.shortInfo}</h4>
        <dl className="admin-pr-facts">
          <Fact label={ft.content} value={item.reason || '—'} />
          <Fact label={ft.amount} value={formatMoney(lang, item.amount)} />
          <Fact label={ft.age} value={item.age != null ? formatDays(lang, item.age) : '—'} />
          <Fact label={t.submittedAt} value={formatDateTime(lang, item.occurredAt)} />
        </dl>
      </section>
    </div>
  );
}

function ProjectReportDetailView({ lang, detail }: { lang: Lang; detail: ProjectReportDetailDto }) {
  const t = reportsCopy[lang];
  const { header, currentStageHealth, flowProgress, commercialSnapshot, terminalSummary } = detail;
  const attention = header.primaryAttention;
  const tone = severityTone(attention?.severity);
  const [expandedSection, setExpandedSection] = useState<'flow' | 'money' | null>(null);
  const stageOwnerName = resolveStageOwnerName(
    currentStageHealth?.nextAction.ownerRole,
    header.assignedSalesName,
    header.assignedDesignerName,
  );

  useEffect(() => {
    setExpandedSection(null);
  }, [header.projectId]);

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
          <Fact label={t.code} value={header.projectCode || '—'} />
          <Fact label={t.status} value={header.projectStatus ? formatEnumLabel(lang, header.projectStatus) : '—'} />
          <Fact label={t.stage} value={labelStage(lang, header.stage)} />
          <Fact label={t.customer} value={header.customerName || '—'} />
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
              {currentStageHealth.statusInStage ? (
                <span className="admin-pr-stage-status">
                  {formatEnumLabel(lang, currentStageHealth.statusInStage)}
                </span>
              ) : null}
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
            <div className="admin-pr-next-action">
              <span>{t.nextAction}</span>
              <div>
                <strong>{labelOwner(lang, currentStageHealth.nextAction.ownerRole)}</strong>
                {stageOwnerName ? <small>{stageOwnerName}</small> : null}
              </div>
              <p>{currentStageHealth.nextAction.suggestedAction}</p>
            </div>
            <div className="admin-pr-links admin-pr-resource-links" aria-label={t.moreProjectDetails}>
              <Link
                className="admin-pr-link admin-pr-link-primary"
                to={`/admin/projects?projectId=${header.projectId}&focus=workflow&stage=${currentStageHealth.stage}`}
              >
                <IconExternalLink size={14} />
                <span>{t.openStageWorkspace}</span>
              </Link>
              <button
                type="button"
                className={`admin-pr-link${expandedSection === 'flow' ? ' is-active' : ''}`}
                aria-expanded={expandedSection === 'flow'}
                onClick={() => setExpandedSection((current) => (current === 'flow' ? null : 'flow'))}
              >
                <IconClipboardList size={14} />
                {t.flowProgress}
              </button>
              {commercialSnapshot ? (
                <button
                  type="button"
                  className={`admin-pr-link${expandedSection === 'money' ? ' is-active' : ''}`}
                  aria-expanded={expandedSection === 'money'}
                  onClick={() => setExpandedSection((current) => (current === 'money' ? null : 'money'))}
                >
                  <IconCash size={14} />
                  {t.moneyQuick}
                </button>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {expandedSection === 'flow' ? (
        <section className="admin-pr-section admin-pr-expandable-section">
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
      ) : null}

      {expandedSection === 'money' && commercialSnapshot ? (
        <section className="admin-pr-section admin-pr-expandable-section">
          <h4>{t.moneyQuick}</h4>
          <dl className="admin-pr-facts admin-pr-money">
            <Fact
              label={t.startFee}
              value={`${formatMoney(lang, commercialSnapshot.projectStartFeeAmount)} · ${
                commercialSnapshot.projectStartFeeStatus
                  ? formatEnumLabel(lang, commercialSnapshot.projectStartFeeStatus)
                  : t.noneYet
              }`}
            />
            <Fact
              label={t.order}
              value={
                commercialSnapshot.orderCode
                  ? `${commercialSnapshot.orderCode} · ${
                      commercialSnapshot.orderStatus ? formatEnumLabel(lang, commercialSnapshot.orderStatus) : '—'
                    }`
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
                  ? `${formatMoney(lang, commercialSnapshot.activePaymentAmount)} · ${
                      commercialSnapshot.activePaymentStatus
                        ? formatEnumLabel(lang, commercialSnapshot.activePaymentStatus)
                        : '—'
                    }`
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
            <Link className="admin-pr-link" to={`/admin/reports?tab=financial&projectId=${header.projectId}`}>
              <IconExternalLink size={14} />
              {t.openFinancial}
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function resolveStageOwnerName(
  ownerRole: string | null | undefined,
  salesName: string | null | undefined,
  designerName: string | null | undefined,
) {
  if (ownerRole === 'SALES') return salesName ?? null;
  if (ownerRole === 'DESIGNER') return designerName ?? null;
  return null;
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
