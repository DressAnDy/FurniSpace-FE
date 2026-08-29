import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  IconCash,
  IconClipboardList,
  IconCreditCard,
  IconDiscount2,
  IconReceipt,
} from '@tabler/icons-react';

import { useLang } from '@/app/providers/useLang';
import { adminCopy } from '../admincomponents/adminI18n';
import { getAdminFinancialServiceResultMessage, type AdminFinancialDrilldownMetric, type AdminFinancialExceptionRowDto } from '@/services/api/adminFinancial';
import { getProjectReportServiceResultMessage } from '@/services/api/projectReports';
import type {
  ProjectReportAttentionReason,
  ProjectReportListItemDto,
  ProjectReportSeverity,
  ProjectReportStageKey,
} from '@/services/api/projectReports';
import {
  useAdminFinancialExceptions,
  useProjectReportDetail,
  useProjectReportList,
} from '@/services/queries';

import { AdminNavbar, AdminSidebar } from '../admincomponents';
import { FinancialPanel, type FinancialListView, type FinancialUrlParams } from './AdminFinancialPanel';
import {
  AttentionReportPanel,
  moneyExceptionKey,
  type AttentionFeedKind,
} from './AttentionReportPanel';
import { financialCopy, reportsCopy } from './adminReportsI18n';
import './AdminReports.css';

type ReportTabId = 'attention' | 'financial';

const EMPTY_ITEMS: ProjectReportListItemDto[] = [];
const EMPTY_MONEY: AdminFinancialExceptionRowDto[] = [];

const FINANCIAL_LIST_OPTIONS: FinancialListView[] = ['receivables', 'payments', 'discounts'];

const FINANCIAL_LIST_ICONS = {
  receivables: IconReceipt,
  payments: IconCreditCard,
  discounts: IconDiscount2,
} as const;

function isFinancialListView(value: string | null): value is FinancialListView {
  return value === 'receivables' || value === 'payments' || value === 'discounts';
}

function normalizeFinancialListView(value: string | null): FinancialListView {
  if (value === 'projects') return 'receivables';
  return isFinancialListView(value) ? value : 'receivables';
}

function isFinancialMetric(value: string | null): value is AdminFinancialDrilldownMetric {
  return (
    value === 'COLLECTED' ||
    value === 'OUTSTANDING' ||
    value === 'CONTRACTED_RECEIVABLE' ||
    value === 'ORDER_VALUE' ||
    value === 'FAILED_TRANSACTIONS' ||
    value === 'ACTIVE_PAYMENTS'
  );
}

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
  const adminNav = adminCopy[lang];
  const t = reportsCopy[lang];
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRange = useMemo(() => defaultDateRange(), []);
  const tabFromUrl = searchParams.get('tab');
  const listFromUrl = searchParams.get('list');
  const financialProjectFromUrl = searchParams.get('projectId');
  const financialOrderFromUrl = searchParams.get('orderId');
  const metricFromUrl = searchParams.get('metric');
  const attentionProjectFromUrl = searchParams.get('projectId');

  const [activeTab, setActiveTab] = useState<ReportTabId>(isReportTabId(tabFromUrl) ? tabFromUrl : 'attention');
  const [financialFromDate, setFinancialFromDate] = useState(initialRange.from);
  const [financialToDate, setFinancialToDate] = useState(initialRange.to);
  const [financialListView, setFinancialListView] = useState<FinancialListView>(
    normalizeFinancialListView(listFromUrl),
  );
  const [keyword, setKeyword] = useState('');
  const [draftKeyword, setDraftKeyword] = useState('');
  const [severity, setSeverity] = useState<ProjectReportSeverity | ''>('');
  const [stage, setStage] = useState<ProjectReportStageKey | ''>('');
  const [attentionReason, setAttentionReason] = useState<ProjectReportAttentionReason | ''>('');
  const [attentionFeedKind, setAttentionFeedKind] = useState<AttentionFeedKind>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    activeTab === 'attention' ? attentionProjectFromUrl : null,
  );
  const [selectedMoneyKey, setSelectedMoneyKey] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'attention') {
      setSelectedProjectId(attentionProjectFromUrl);
    }
  }, [activeTab, attentionProjectFromUrl]);

  useEffect(() => {
    if (isReportTabId(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    } else if (!tabFromUrl) {
      setActiveTab('attention');
    }
  }, [tabFromUrl]);

  useEffect(() => {
    if (activeTab !== 'financial') return;
    if (listFromUrl === 'projects') {
      handleFinancialUrlChange({ list: 'receivables' });
      setFinancialListView('receivables');
      return;
    }
    if (isFinancialListView(listFromUrl)) {
      setFinancialListView(listFromUrl);
    }
  }, [activeTab, listFromUrl]);

  const financialUrlParams = useMemo<FinancialUrlParams>(
    () => ({
      list: financialListView,
      projectId: activeTab === 'financial' ? financialProjectFromUrl : null,
      orderId: activeTab === 'financial' ? financialOrderFromUrl : null,
      metric: isFinancialMetric(metricFromUrl) ? metricFromUrl : null,
    }),
    [activeTab, financialListView, financialOrderFromUrl, financialProjectFromUrl, metricFromUrl],
  );

  const handleFinancialUrlChange = (params: Partial<FinancialUrlParams>) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'financial');

    if (params.list !== undefined) {
      if (params.list) next.set('list', params.list);
      else next.delete('list');
    }

    if (params.projectId !== undefined) {
      if (params.projectId) next.set('projectId', params.projectId);
      else next.delete('projectId');
    }

    if (params.orderId !== undefined) {
      if (params.orderId) next.set('orderId', params.orderId);
      else next.delete('orderId');
    }

    if (params.metric !== undefined) {
      if (params.metric) next.set('metric', params.metric);
      else next.delete('metric');
    }

    setSearchParams(next, { replace: true });
  };

  const handleFinancialListChange = (list: FinancialListView) => {
    setFinancialListView(list);
    handleFinancialUrlChange({ list, projectId: null, orderId: null });
  };

  const dateParams = useMemo(
    () => ({
      from: toFinancialApiDateTime(financialFromDate),
      to: toFinancialApiDateTime(financialToDate),
    }),
    [financialFromDate, financialToDate],
  );

  const listParams = useMemo(
    () => ({
      keyword: keyword.trim() || null,
      severity: severity || null,
      stage: stage || null,
      attentionReason: attentionReason || null,
      ownerRole: null,
      attentionOnly: true,
      from: null,
      to: null,
      page: 1,
      pageSize: 100,
      sortBy: 'severityDesc' as const,
    }),
    [attentionReason, keyword, severity, stage],
  );

  const listQuery = useProjectReportList(listParams, {
    enabled: activeTab === 'attention' && attentionFeedKind !== 'money',
  });
  const moneyQuery = useAdminFinancialExceptions(
    {
      page: 1,
      pageSize: 100,
    },
    { enabled: activeTab === 'attention' && attentionFeedKind !== 'project' },
  );
  const detailQuery = useProjectReportDetail(selectedProjectId, {
    enabled: activeTab === 'attention' && Boolean(selectedProjectId),
  });

  const items = listQuery.data?.items ?? EMPTY_ITEMS;
  const moneyItems = moneyQuery.data?.items ?? EMPTY_MONEY;
  const selectedMoney =
    selectedMoneyKey == null
      ? null
      : (moneyItems.find((item, index) => moneyExceptionKey(item, index) === selectedMoneyKey) ?? null);
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
    setSelectedMoneyKey(null);
    setSelectedProjectId(projectId);
    const next = new URLSearchParams(searchParams);
    next.set('projectId', projectId);
    if (activeTab !== 'attention') next.delete('tab');
    setSearchParams(next, { replace: true });
  };

  const handleSelectMoney = (item: AdminFinancialExceptionRowDto, index: number) => {
    if (item.projectId) {
      handleSelectProject(item.projectId);
      return;
    }
    setSelectedProjectId(null);
    setSelectedMoneyKey(moneyExceptionKey(item, index));
    const next = new URLSearchParams(searchParams);
    next.delete('projectId');
    setSearchParams(next, { replace: true });
  };

  const handleCloseDetail = () => {
    setSelectedProjectId(null);
    setSelectedMoneyKey(null);
    const next = new URLSearchParams(searchParams);
    next.delete('projectId');
    setSearchParams(next, { replace: true });
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setKeyword(draftKeyword);
  };

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <AdminSidebar activeKey="reports" />
        <section className="admin-main">
          <AdminNavbar activeLabel={adminNav.nav.reports} />
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
                    <input
                      type="date"
                      value={financialFromDate}
                      onChange={(event) => setFinancialFromDate(event.target.value)}
                    />
                  </label>
                  <label className="admin-report-filter">
                    <span>{t.toDate}</span>
                    <input
                      type="date"
                      value={financialToDate}
                      onChange={(event) => setFinancialToDate(event.target.value)}
                    />
                  </label>
                  <div className="admin-pr-financial-list-switch" role="tablist" aria-label={financialCopy[lang].listSwitcherAria}>
                    {FINANCIAL_LIST_OPTIONS.map((id) => {
                      const Icon = FINANCIAL_LIST_ICONS[id];
                      const labels = {
                        receivables: financialCopy[lang].listBtnReceivables,
                        payments: financialCopy[lang].listBtnPayments,
                        discounts: financialCopy[lang].listBtnDiscounts,
                      };
                      const selected = financialListView === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          role="tab"
                          aria-selected={selected}
                          className={`admin-pr-financial-list-btn${selected ? ' is-active' : ''}`}
                          onClick={() => handleFinancialListChange(id)}
                        >
                          <Icon size={15} />
                          {labels[id]}
                        </button>
                      );
                    })}
                  </div>
                </section>
                <FinancialPanel
                  activeList={financialListView}
                  dateParams={dateParams}
                  fromDate={financialFromDate}
                  toDate={financialToDate}
                  urlParams={financialUrlParams}
                  onUrlChange={handleFinancialUrlChange}
                />
              </>
            ) : (
              <AttentionReportPanel
                lang={lang}
                draftKeyword={draftKeyword}
                setDraftKeyword={setDraftKeyword}
                onSearchSubmit={handleSearchSubmit}
                severity={severity}
                setSeverity={setSeverity}
                stage={stage}
                setStage={setStage}
                attentionReason={attentionReason}
                setAttentionReason={setAttentionReason}
                attentionOnly
                feedKind={attentionFeedKind}
                onFeedKindChange={setAttentionFeedKind}
                listLoading={listQuery.isLoading}
                listError={listQuery.isError ? getProjectReportServiceResultMessage(listQuery.error) : null}
                onRetryList={() => void listQuery.refetch()}
                items={items}
                totalItems={totalItems}
                moneyLoading={moneyQuery.isLoading}
                moneyError={moneyQuery.isError ? getAdminFinancialServiceResultMessage(moneyQuery.error) : null}
                onRetryMoney={() => void moneyQuery.refetch()}
                moneyItems={moneyItems}
                moneyTotalItems={moneyQuery.data?.totalItems ?? 0}
                selectedProjectId={selectedProjectId}
                selectedMoneyKey={selectedMoneyKey}
                onSelectProject={handleSelectProject}
                onSelectMoney={handleSelectMoney}
                onCloseDetail={handleCloseDetail}
                detail={detailQuery.data ?? null}
                detailLoading={detailQuery.isLoading}
                detailError={detailQuery.isError ? getProjectReportServiceResultMessage(detailQuery.error) : null}
                onRetryDetail={() => void detailQuery.refetch()}
                selectedMoney={selectedMoney}
              />
            )}
          </div>
        </section>
      </div>
    </main>
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
