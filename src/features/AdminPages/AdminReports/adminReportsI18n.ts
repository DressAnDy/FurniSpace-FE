import type { Lang } from '@/app/providers/useLang';
import type {
  ProjectReportAttentionReason,
  ProjectReportOwnerRole,
  ProjectReportSeverity,
  ProjectReportStageKey,
  ProjectReportStageState,
} from '@/services/api/projectReports';

type Option<T extends string> = { value: T; label: string };

const severityByLang: Record<Lang, Array<Option<ProjectReportSeverity>>> = {
  vi: [
    { value: 'ESCALATE', label: 'Cần can thiệp' },
    { value: 'ACTION', label: 'Cần xử lý' },
    { value: 'WATCH', label: 'Theo dõi' },
  ],
  en: [
    { value: 'ESCALATE', label: 'Escalate' },
    { value: 'ACTION', label: 'Needs action' },
    { value: 'WATCH', label: 'Watch' },
  ],
};

const stageByLang: Record<Lang, Array<Option<ProjectReportStageKey>>> = {
  vi: [
    { value: 'INTAKE', label: 'Tiếp nhận' },
    { value: 'DESIGNER_ASSIGNMENT', label: 'Gán designer' },
    { value: 'DESIGN_REVIEW', label: 'Duyệt thiết kế' },
    { value: 'QUOTATION_ORDER', label: 'Báo giá & đơn' },
    { value: 'PRODUCTION', label: 'Sản xuất' },
    { value: 'DELIVERY', label: 'Giao hàng' },
  ],
  en: [
    { value: 'INTAKE', label: 'Intake' },
    { value: 'DESIGNER_ASSIGNMENT', label: 'Designer assignment' },
    { value: 'DESIGN_REVIEW', label: 'Design review' },
    { value: 'QUOTATION_ORDER', label: 'Quote & order' },
    { value: 'PRODUCTION', label: 'Production' },
    { value: 'DELIVERY', label: 'Delivery' },
  ],
};

const reasonByLang: Record<Lang, Array<Option<ProjectReportAttentionReason>>> = {
  vi: [
    { value: 'UNASSIGNED_INTAKE', label: 'Chưa gán Sales' },
    { value: 'WAITING_CUSTOMER_INFO', label: 'Chờ thông tin khách' },
    { value: 'START_FEE_BLOCKING', label: 'Chưa trả phí khởi tạo' },
    { value: 'WAITING_DESIGNER', label: 'Chờ gán Designer' },
    { value: 'MEASUREMENT_OVERDUE', label: 'Đo đạc quá hạn' },
    { value: 'PROPOSAL_STALLED', label: 'Thiết kế bị chậm' },
    { value: 'QUOTATION_REVISION_LOOP', label: 'Báo giá sửa nhiều lần' },
    { value: 'PAYMENT_EXCEPTION', label: 'Lỗi thanh toán' },
    { value: 'PRODUCTION_BLOCKED', label: 'Sản xuất bị chặn' },
    { value: 'DELIVERY_OVERDUE', label: 'Giao hàng quá hạn' },
    { value: 'FINAL_PAYMENT_PENDING', label: 'Chờ thanh toán cuối' },
    { value: 'READY_TO_COMPLETE', label: 'Sẵn sàng hoàn tất' },
  ],
  en: [
    { value: 'UNASSIGNED_INTAKE', label: 'Unassigned intake' },
    { value: 'WAITING_CUSTOMER_INFO', label: 'Waiting for customer info' },
    { value: 'START_FEE_BLOCKING', label: 'Start fee unpaid' },
    { value: 'WAITING_DESIGNER', label: 'Waiting for designer' },
    { value: 'MEASUREMENT_OVERDUE', label: 'Measurement overdue' },
    { value: 'PROPOSAL_STALLED', label: 'Proposal stalled' },
    { value: 'QUOTATION_REVISION_LOOP', label: 'Quotation revision loop' },
    { value: 'PAYMENT_EXCEPTION', label: 'Payment exception' },
    { value: 'PRODUCTION_BLOCKED', label: 'Production blocked' },
    { value: 'DELIVERY_OVERDUE', label: 'Delivery overdue' },
    { value: 'FINAL_PAYMENT_PENDING', label: 'Final payment pending' },
    { value: 'READY_TO_COMPLETE', label: 'Ready to complete' },
  ],
};

const ownerByLang: Record<Lang, Array<Option<ProjectReportOwnerRole>>> = {
  vi: [
    { value: 'ADMIN', label: 'Admin' },
    { value: 'SALES', label: 'Sales' },
    { value: 'DESIGNER', label: 'Designer' },
    { value: 'PRODUCTION', label: 'Sản xuất' },
  ],
  en: [
    { value: 'ADMIN', label: 'Admin' },
    { value: 'SALES', label: 'Sales' },
    { value: 'DESIGNER', label: 'Designer' },
    { value: 'PRODUCTION', label: 'Production' },
  ],
};

const stageStateByLang: Record<Lang, Record<ProjectReportStageState, string>> = {
  vi: {
    NOT_STARTED: 'Chưa tới',
    ACTIVE: 'Đang làm',
    BLOCKED: 'Bị chặn',
    COMPLETED: 'Xong',
  },
  en: {
    NOT_STARTED: 'Not started',
    ACTIVE: 'Active',
    BLOCKED: 'Blocked',
    COMPLETED: 'Done',
  },
};

export function severityOptions(lang: Lang) {
  return severityByLang[lang];
}

export function stageOptions(lang: Lang) {
  return stageByLang[lang];
}

export function reasonOptions(lang: Lang) {
  return reasonByLang[lang];
}

export function ownerOptions(lang: Lang) {
  return ownerByLang[lang];
}

export function labelStage(lang: Lang, stage: ProjectReportStageKey | string | null | undefined) {
  if (!stage) return '—';
  return stageByLang[lang].find((item) => item.value === stage)?.label ?? stage;
}

export function labelReason(lang: Lang, reason: ProjectReportAttentionReason | string | null | undefined) {
  if (!reason) return lang === 'vi' ? 'Ổn' : 'Healthy';
  return reasonByLang[lang].find((item) => item.value === reason)?.label ?? reason;
}

export function labelSeverity(lang: Lang, severity: ProjectReportSeverity | string | null | undefined) {
  if (!severity) return lang === 'vi' ? 'Ổn' : 'Healthy';
  return severityByLang[lang].find((item) => item.value === severity)?.label ?? severity;
}

export function labelOwner(lang: Lang, owner: ProjectReportOwnerRole | string | null | undefined) {
  if (!owner) return '—';
  return ownerByLang[lang].find((item) => item.value === owner)?.label ?? owner;
}

export function labelStageState(lang: Lang, state: ProjectReportStageState | string | null | undefined) {
  if (!state) return '—';
  return stageStateByLang[lang][state as ProjectReportStageState] ?? state;
}

export function formatMoney(lang: Lang, value: number | null | undefined) {
  const parts = getMoneyParts(lang, value, false);
  if (!parts) return '—';
  return `${parts.amount}\u00A0₫`;
}

export function formatKpiMoney(lang: Lang, value: number | null | undefined) {
  const parts = getMoneyParts(lang, value, true);
  if (!parts) return '—';
  return `${parts.amount}\u00A0₫`;
}

/** Amount text without ₫ — use with a separately styled currency mark. */
export function getMoneyParts(
  lang: Lang,
  value: number | null | undefined,
  compact = false,
): { amount: string } | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;

  const locale = lang === 'vi' ? 'vi-VN' : 'en-US';
  const abs = Math.abs(value);

  if (compact) {
    if (lang === 'vi') {
      if (abs >= 1_000_000_000) {
        return {
          amount: `${(value / 1_000_000_000).toLocaleString(locale, { maximumFractionDigits: 2 })} tỷ`,
        };
      }
      if (abs >= 1_000_000) {
        return {
          amount: `${(value / 1_000_000).toLocaleString(locale, { maximumFractionDigits: 1 })} triệu`,
        };
      }
    } else {
      if (abs >= 1_000_000_000) {
        return {
          amount: `${(value / 1_000_000_000).toLocaleString(locale, { maximumFractionDigits: 2 })}B`,
        };
      }
      if (abs >= 1_000_000) {
        return {
          amount: `${(value / 1_000_000).toLocaleString(locale, { maximumFractionDigits: 1 })}M`,
        };
      }
    }
  }

  return {
    amount: new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value),
  };
}

export function formatDate(lang: Lang, value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(lang: Lang, value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDays(lang: Lang, value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—';
  return lang === 'vi' ? `${value} ngày` : `${value} day${value === 1 ? '' : 's'}`;
}

export function severityTone(severity: ProjectReportSeverity | string | null | undefined) {
  const key = (severity || '').toUpperCase();
  if (key === 'ESCALATE' || key === 'HIGH') return 'escalate';
  if (key === 'ACTION' || key === 'MEDIUM') return 'action';
  if (key === 'WATCH' || key === 'LOW') return 'watch';
  return 'ok';
}

export function formatTrendPeriod(lang: Lang, value: string) {
  const monthMatch = /^(\d{4})-(\d{2})(?:$|T|-)/.exec(value);
  if (monthMatch) {
    const month = Number(monthMatch[2]);
    return lang === 'vi' ? `Thg ${month}/${monthMatch[1]}` : `${month}/${monthMatch[1]}`;
  }
  return value;
}

export const reportsCopy = {
  vi: {
    pageTitle: 'Báo cáo',
    pageSubtitle: 'Theo dõi dự án đang tắc và xem cần làm gì tiếp — không phải bảng số liệu tổng hợp.',
    tabsAria: 'Loại báo cáo',
    attentionTab: 'Cần xử lý',
    financialTab: 'Tài chính',
    attentionDesc: 'Một danh sách việc cần làm: dự án đang tắc và vấn đề tiền bất thường — bấm dòng để xem bước tiếp theo.',
    financialDesc: 'Tiền thu, công nợ và thanh toán bất thường trên toàn hệ thống.',
    fromDate: 'Từ ngày',
    toDate: 'Đến ngày',
    submittedFromDate: 'Gửi từ ngày',
    submittedToDate: 'Gửi đến ngày',
    dateRangeAria: 'Khoảng ngày tài chính',
    listAria: 'Danh sách việc cần chú ý',
    feedKindAria: 'Lọc loại việc cần chú ý',
    feedKindAll: 'Tất cả',
    feedKindProject: 'Dự án',
    feedKindMoney: 'Tiền',
    attentionItemsCount: 'việc cần chú ý',
    hasLinkedProject: 'Có dự án liên kết',
    noLinkedProject: 'Chưa gắn dự án',
    searchLabel: 'Tìm dự án',
    searchPlaceholder: 'Mã, tên dự án hoặc khách hàng',
    severity: 'Mức độ',
    stage: 'Giai đoạn',
    reason: 'Lý do',
    owner: 'Người phụ trách',
    all: 'Tất cả',
    attentionOnly: 'Chỉ hiện dự án cần chú ý',
    filter: 'Lọc',
    reset: 'Đặt lại',
    projectsCount: 'dự án',
    needingAttention: ' cần chú ý',
    listErrorTitle: 'Không tải được danh sách',
    retry: 'Thử lại',
    loadingTitle: 'Đang tải...',
    loadingList: 'Đang lấy danh sách dự án cần xử lý.',
    emptyAttentionTitle: 'Không có dự án cần chú ý',
    emptyAttentionOnly: 'Hiện không có dự án nào đang tắc theo bộ lọc này.',
    emptyFiltered: 'Không có dự án khớp bộ lọc.',
    inThisStatus: 'ở trạng thái này',
    noImmediateAction: 'Chưa có việc cần làm ngay.',
    ownedBy: 'Phụ trách',
    prev: 'Trước',
    next: 'Sau',
    pageOf: (page: number, total: number) => `Trang ${page}/${total}`,
    detailAria: 'Chi tiết báo cáo dự án',
    detailKicker: 'Chi tiết dự án',
    loading: 'Đang tải...',
    close: 'Đóng',
    closeDetail: 'Đóng chi tiết',
    detailErrorTitle: 'Không tải được chi tiết',
    loadingDetailTitle: 'Đang tải chi tiết...',
    loadingDetailMsg: 'Lấy tình trạng giai đoạn hiện tại và việc cần làm.',
    guideAria: 'Hướng dẫn',
    pickProjectTitle: 'Chọn một dự án',
    pickProjectMsg: 'Mở dòng bên trái để xem vì sao đang tắc, ai nên xử lý, và đường dẫn sang workflow / tài chính khi cần đào sâu.',
    healthyProject: 'Dự án hiện không có điểm cần chú ý.',
    otherReasons: 'Lý do khác',
    shortInfo: 'Thông tin ngắn',
    code: 'Mã',
    status: 'Trạng thái',
    customer: 'Khách hàng',
    unassigned: 'Chưa gán',
    projectAge: 'Tuổi dự án',
    inStatus: 'Ở trạng thái này',
    submittedAt: 'Gửi lúc',
    businessType: 'Loại hình',
    address: 'Địa chỉ',
    rejectionReason: 'Lý do từ chối',
    completed: 'Đã hoàn tất',
    rejected: 'Đã từ chối',
    completedNote: 'Dự án đã kết thúc.',
    rejectedNote: 'Dự án đã bị từ chối.',
    endedAt: 'Ngày kết thúc',
    duration: 'Tổng thời gian',
    reasonLabel: 'Lý do',
    currentStage: 'Giai đoạn hiện tại',
    inThisStage: 'trong giai đoạn này',
    nextAction: 'Việc cần làm tiếp theo',
    openStageWorkspace: 'Khu vực xử lý giai đoạn',
    moreProjectDetails: 'Xem thêm thông tin dự án',
    flowProgress: 'Tiến độ 6 giai đoạn',
    moneyQuick: 'Tiền nhanh',
    startFee: 'Phí khởi tạo',
    order: 'Đơn hàng',
    noneYet: 'Chưa có',
    noOrder: 'Chưa có đơn',
    orderValue: 'Giá trị đơn',
    paidOnOrder: 'Đã thu theo đơn',
    remainingOnOrder: 'Còn lại theo đơn',
    collecting: 'Đang thu',
    none: 'Không có',
    totalCollected: 'Tổng đã thu dự án',
    lastPaid: 'Lần thu gần nhất',
    openProject: 'Mở dự án',
    openFinancial: 'Xem tài chính hệ thống',
  },
  en: {
    pageTitle: 'Reports',
    pageSubtitle: 'Track stuck projects and what to do next — not a vanity metrics dashboard.',
    tabsAria: 'Report types',
    attentionTab: 'Needs attention',
    financialTab: 'Financial',
    attentionDesc: 'One action list: blocked projects and money issues — open a row for the next step.',
    financialDesc: 'Collected cash, receivables, and unusual payments across the system.',
    fromDate: 'From',
    toDate: 'To',
    submittedFromDate: 'Submitted from',
    submittedToDate: 'Submitted to',
    dateRangeAria: 'Financial date range',
    listAria: 'Attention queue',
    feedKindAria: 'Filter attention item type',
    feedKindAll: 'All',
    feedKindProject: 'Project',
    feedKindMoney: 'Money',
    attentionItemsCount: 'items needing attention',
    hasLinkedProject: 'Linked project',
    noLinkedProject: 'No linked project',
    searchLabel: 'Search projects',
    searchPlaceholder: 'Code, project name, or customer',
    severity: 'Severity',
    stage: 'Stage',
    reason: 'Reason',
    owner: 'Owner',
    all: 'All',
    attentionOnly: 'Attention only',
    filter: 'Filter',
    reset: 'Reset',
    projectsCount: 'projects',
    needingAttention: ' needing attention',
    listErrorTitle: 'Could not load the list',
    retry: 'Retry',
    loadingTitle: 'Loading...',
    loadingList: 'Fetching projects that need action.',
    emptyAttentionTitle: 'No projects need attention',
    emptyAttentionOnly: 'Nothing is blocked for this filter.',
    emptyFiltered: 'No projects match this filter.',
    inThisStatus: 'in this status',
    noImmediateAction: 'No immediate action needed.',
    ownedBy: 'Owner',
    prev: 'Prev',
    next: 'Next',
    pageOf: (page: number, total: number) => `Page ${page}/${total}`,
    detailAria: 'Project report detail',
    detailKicker: 'Project detail',
    loading: 'Loading...',
    close: 'Close',
    closeDetail: 'Close detail',
    detailErrorTitle: 'Could not load detail',
    loadingDetailTitle: 'Loading detail...',
    loadingDetailMsg: 'Fetching current stage health and next action.',
    guideAria: 'Guide',
    pickProjectTitle: 'Select a project',
    pickProjectMsg: 'Open a row on the left to see why it is stuck, who should act, and links to workflow / financial when you need to dig deeper.',
    healthyProject: 'This project has no attention items right now.',
    otherReasons: 'Other reasons',
    shortInfo: 'Quick info',
    code: 'Code',
    status: 'Status',
    customer: 'Customer',
    unassigned: 'Unassigned',
    projectAge: 'Project age',
    inStatus: 'In this status',
    submittedAt: 'Submitted',
    businessType: 'Business type',
    address: 'Address',
    rejectionReason: 'Rejection reason',
    completed: 'Completed',
    rejected: 'Rejected',
    completedNote: 'Project finished.',
    rejectedNote: 'Project was rejected.',
    endedAt: 'Ended at',
    duration: 'Duration',
    reasonLabel: 'Reason',
    currentStage: 'Current stage',
    inThisStage: 'in this stage',
    nextAction: 'Next action',
    openStageWorkspace: 'Stage workspace',
    moreProjectDetails: 'View more project details',
    flowProgress: '6-stage progress',
    moneyQuick: 'Money snapshot',
    startFee: 'Start fee',
    order: 'Order',
    noneYet: 'None yet',
    noOrder: 'No order yet',
    orderValue: 'Order value',
    paidOnOrder: 'Paid on order',
    remainingOnOrder: 'Remaining on order',
    collecting: 'Collecting',
    none: 'None',
    totalCollected: 'Total collected',
    lastPaid: 'Last paid',
    openProject: 'Open project',
    openFinancial: 'Open system financials',
  },
} as const;

export const financialCopy = {
  vi: {
    heroAria: 'Bối cảnh báo cáo tài chính',
    eyebrow: 'Tiền thu & công nợ',
    heroTitle: 'Tổng quan tiền',
    heroBody:
      '“Đã thu” chỉ tính tiền thật đã vào (phí khởi tạo, đặt cọc, thanh toán còn lại). Không cộng chung với “đang chờ thu” hay “còn phải thu theo đơn”.',
    loadingSummary: 'Đang tải tổng quan tiền...',
    kpiAria: 'Chỉ số tài chính',
    collected: 'Đã thu',
    failedInRange: (count: number) => `${count} lần thanh toán lỗi trong khoảng này`,
    outstanding: 'Đang chờ thu',
    openItems: (count: number) => `${count} khoản đang mở`,
    contracted: 'Còn phải thu theo đơn',
    activeOrdersRemaining: 'Đơn đang chạy còn số dư',
    orderValue: 'Giá trị đơn đã xác nhận',
    inSelectedRange: 'Trong khoảng ngày đã chọn',
    failedTx: 'Giao dịch lỗi',
    failedAttempts: 'Số lần thử thanh toán thất bại',
    activePayments: 'Khoản đang thu',
    waitingCustomer: 'Đang chờ khách thanh toán',
    drilldownEyebrow: 'Chi tiết chỉ số',
    drilldownSubtitle: 'Nguồn tạo nên chỉ số và các dự án liên quan trong phạm vi đã chọn.',
    closeDrilldown: 'Đóng chi tiết chỉ số',
    loadingDrilldown: 'Đang tải chi tiết chỉ số...',
    drilldownTotal: 'Tổng chỉ số',
    drilldownCount: (count: number) => `${count} mục`,
    drilldownPeriod: (from: string, to: string) =>
      `${formatDateTime('vi', from)} – ${formatDateTime('vi', to)}`,
    breakdownAria: 'Phân rã chỉ số',
    drilldownShare: (percentage: number, count: number) => `${percentage.toFixed(1)}% · ${count} mục`,
    drilldownResource: 'Nguồn',
    drilldownValue: 'Giá trị',
    drilldownOccurred: 'Thời điểm',
    drilldownDetails: 'Chi tiết',
    emptyDrilldown: 'Không có dữ liệu tạo nên chỉ số này.',
    retryDrilldown: 'Thử tải lại',
    drilldownPaidRemaining: (paid: string, remaining: string) => `Đã trả ${paid} · Còn ${remaining}`,
    drilldownExpires: (date: string) => `Hết hạn: ${date}`,
    trendTitle: 'Xu hướng thu tiền',
    trendSubtitle: 'So sánh tiền thu từng tháng theo loại thanh toán.',
    loadingTrend: 'Đang tải xu hướng thu tiền...',
    typeTitle: 'Theo loại thanh toán',
    typeSubtitle: 'Đã thu và đang chờ thu của từng loại.',
    loadingBreakdown: 'Đang tải phân loại...',
    paidCount: (count: number) => `${count} đã trả`,
    waiting: 'Đang chờ',
    openExpired: 'Đang mở / Hết hạn',
    receivablesTitle: 'Công nợ cần thu',
    searchReceivables: 'Tìm công nợ theo đơn hàng',
    searchOrderPlaceholder: 'Mã đơn, dự án hoặc khách hàng',
    collectionState: 'Trạng thái thu tiền',
    allCollectionStates: 'Tất cả trạng thái thu',
    waitingAmount: (amount: string) => `Đang chờ ${amount}`,
    byOrderAmount: (amount: string) => `Theo đơn ${amount}`,
    withoutPayment: (count: number) => `${count} đơn chưa tạo khoản thu`,
    activeCollections: (count: number) => `${count} khoản đang thu`,
    loadingReceivables: 'Đang tải công nợ...',
    project: 'Dự án',
    projectCustomer: 'Dự án / Khách hàng',
    order: 'Đơn hàng',
    finalTotal: 'Tổng đơn',
    paid: 'Đã trả',
    remaining: 'Còn lại',
    needToCollect: 'Cần thu',
    paymentProgress: 'Tiến độ thanh toán',
    receivableAge: 'Tuổi công nợ',
    activePayment: 'Khoản đang thu',
    noActivePayment: 'Chưa có khoản đang thu',
    paymentCreated: 'Đã tạo phiếu?',
    openOrderDetail: 'Xem chi tiết công nợ đơn hàng',
    orderReceivableDetail: 'Chi tiết công nợ đơn hàng',
    loadingReceivableDetail: 'Đang tải chi tiết công nợ...',
    closeOrderDetail: 'Đóng chi tiết công nợ',
    suggestedAction: 'Việc nên làm tiếp theo',
    notCreated: 'Chưa tạo',
    paidAt: 'Thanh toán lúc',
    expiredAt: 'Hết hạn lúc',
    yes: 'Có',
    no: 'Chưa',
    emptyReceivables: 'Không có công nợ.',
    projectsTitle: 'Tiền theo dự án',
    projectsSubtitle: 'Dùng tổng đã thu của dự án — không cộng tay phí khởi tạo với tiền đơn.',
    projectStatement: 'Sao kê tiền theo dự án',
    loadingStatement: 'Đang tải sao kê dự án...',
    closeStatement: 'Đóng sao kê dự án',
    openingBalance: 'Số dư đầu kỳ',
    totalRefunded: 'Tổng hoàn tiền',
    netCollected: 'Thu ròng',
    closingBalance: 'Số dư cuối kỳ',
    transactionDate: 'Ngày giao dịch',
    statementContent: 'Nội dung',
    reference: 'Tham chiếu',
    moneyIn: 'Tiền vào',
    moneyOut: 'Tiền ra',
    runningBalance: 'Số dư',
    emptyStatement: 'Chưa có giao dịch trong khoảng ngày này.',
    searchProjects: 'Tìm dự án',
    searchPlaceholder: 'Mã, tên, khách hàng',
    loadingProjects: 'Đang tải dự án...',
    customer: 'Khách hàng',
    lastPaid: 'Thu gần nhất',
    emptyProjects: 'Không tìm thấy dự án.',
    paymentsTitle: 'Thanh toán đang chạy',
    paymentsSubtitle: 'Lần thử qua cổng thanh toán và lý do lỗi (không hiện thông tin bí mật).',
    failedOnly: 'Chỉ hiện lần lỗi',
    loadingPayments: 'Đang tải thanh toán...',
    payment: 'Thanh toán',
    projectOrder: 'Dự án / Đơn',
    type: 'Loại',
    amount: 'Số tiền',
    status: 'Trạng thái',
    provider: 'Cổng',
    attempts: 'Lần thử',
    lastFailure: 'Lỗi / thời điểm',
    attemptTried: (count: number) => `Đã thử ${count} lần`,
    attemptFailed: (count: number) => `${count} lần lỗi`,
    attemptOk: 'Chưa lỗi',
    noFailureReason: 'Không có lỗi',
    lastTriedAt: 'Thử lúc',
    neverTried: 'Chưa thử',
    failedTimes: (count: number) => `${count} lần lỗi`,
    zeroFailed: '0 lần lỗi',
    emptyPayments: 'Không có thanh toán.',
    exceptionsTitle: 'Việc cần xử lý',
    exceptionsSubtitle: 'Các vấn đề tiền bất thường admin nên xem.',
    loadingExceptions: 'Đang tải danh sách cần xử lý...',
    severity: 'Mức độ',
    content: 'Nội dung',
    age: 'Đã bao lâu',
    action: 'Việc nên làm',
    days: (count: number) => `${count} ngày`,
    emptyExceptions: 'Không có việc cần xử lý.',
    openProject: 'Mở dự án',
    openInAttention: 'Bấm để xem chi tiết dự án phía trên',
    listSwitcherAria: 'Chọn danh sách tài chính',
    listBtnReceivables: 'Công nợ',
    listBtnProjects: 'Theo dự án',
    listBtnPayments: 'Thanh toán',
    emptyTrend: 'Không có dữ liệu thu tiền trong khoảng này.',
    startFee: 'Phí khởi tạo',
    deposit: 'Đặt cọc',
    remainingPayment: 'Thanh toán còn lại',
    totalCollected: 'Tổng đã thu',
    paymentCount: 'Số giao dịch',
    noCollectionMonth: 'Chưa thu trong tháng này',
    pageItems: (page: number, totalPages: number, totalItems: number) =>
      `Trang ${page} / ${Math.max(totalPages, 1)} · ${totalItems} dòng`,
    rowsPerPage: 'Số dòng',
    pageLabel: 'Trang',
    totalRows: (totalItems: number) => `${totalItems} dòng`,
    prev: 'Trước',
    next: 'Sau',
    escalate: 'Cần can thiệp',
    actionLevel: 'Cần xử lý',
    watch: 'Theo dõi',
  },
  en: {
    heroAria: 'Financial report context',
    eyebrow: 'Cash & receivables',
    heroTitle: 'Money overview',
    heroBody:
      '“Collected” only counts real cash in (start fee, deposit, remaining). Do not add it together with outstanding payments or contracted receivables.',
    loadingSummary: 'Loading money overview...',
    kpiAria: 'Financial KPIs',
    collected: 'Collected',
    failedInRange: (count: number) => `${count} failed payment attempts in range`,
    outstanding: 'Outstanding',
    openItems: (count: number) => `${count} open items`,
    contracted: 'Contracted receivable',
    activeOrdersRemaining: 'Active orders with remaining balance',
    orderValue: 'Confirmed order value',
    inSelectedRange: 'In selected date range',
    failedTx: 'Failed transactions',
    failedAttempts: 'Failed payment attempts',
    activePayments: 'Active payments',
    waitingCustomer: 'Waiting for customer payment',
    drilldownEyebrow: 'Metric details',
    drilldownSubtitle: 'Sources behind this metric and the related projects in the selected scope.',
    closeDrilldown: 'Close metric details',
    loadingDrilldown: 'Loading metric details...',
    drilldownTotal: 'Metric total',
    drilldownCount: (count: number) => `${count} item${count === 1 ? '' : 's'}`,
    drilldownPeriod: (from: string, to: string) =>
      `${formatDateTime('en', from)} – ${formatDateTime('en', to)}`,
    breakdownAria: 'Metric breakdown',
    drilldownShare: (percentage: number, count: number) =>
      `${percentage.toFixed(1)}% · ${count} item${count === 1 ? '' : 's'}`,
    drilldownResource: 'Source',
    drilldownValue: 'Value',
    drilldownOccurred: 'Occurred',
    drilldownDetails: 'Details',
    emptyDrilldown: 'No records contribute to this metric.',
    retryDrilldown: 'Try again',
    drilldownPaidRemaining: (paid: string, remaining: string) => `Paid ${paid} · Remaining ${remaining}`,
    drilldownExpires: (date: string) => `Expires: ${date}`,
    trendTitle: 'Collection trend',
    trendSubtitle: 'Compare monthly cash by payment type side by side.',
    loadingTrend: 'Loading collection trend...',
    typeTitle: 'By payment type',
    typeSubtitle: 'Collected vs outstanding for each type.',
    loadingBreakdown: 'Loading breakdown...',
    paidCount: (count: number) => `${count} paid`,
    waiting: 'Outstanding',
    openExpired: 'Open / Expired',
    receivablesTitle: 'Receivables',
    searchReceivables: 'Search order receivables',
    searchOrderPlaceholder: 'Order, project, or customer',
    collectionState: 'Collection state',
    allCollectionStates: 'All collection states',
    waitingAmount: (amount: string) => `Outstanding ${amount}`,
    byOrderAmount: (amount: string) => `By order ${amount}`,
    withoutPayment: (count: number) => `${count} orders without a payment request`,
    activeCollections: (count: number) => `${count} active collections`,
    loadingReceivables: 'Loading receivables...',
    project: 'Project',
    projectCustomer: 'Project / Customer',
    order: 'Order',
    finalTotal: 'Order total',
    paid: 'Paid',
    remaining: 'Remaining',
    needToCollect: 'To collect',
    paymentProgress: 'Payment progress',
    receivableAge: 'Receivable age',
    activePayment: 'Active payment',
    noActivePayment: 'No active payment',
    paymentCreated: 'Payment created?',
    openOrderDetail: 'View order receivable details',
    orderReceivableDetail: 'Order receivable details',
    loadingReceivableDetail: 'Loading receivable details...',
    closeOrderDetail: 'Close receivable details',
    suggestedAction: 'Suggested next action',
    notCreated: 'Not created',
    paidAt: 'Paid at',
    expiredAt: 'Expires at',
    yes: 'Yes',
    no: 'No',
    emptyReceivables: 'No receivables.',
    projectsTitle: 'Money by project',
    projectsSubtitle: 'Use total project cash collected — do not manually add start fee + order paid.',
    projectStatement: 'Project money statement',
    loadingStatement: 'Loading project statement...',
    closeStatement: 'Close project statement',
    openingBalance: 'Opening balance',
    totalRefunded: 'Total refunded',
    netCollected: 'Net collected',
    closingBalance: 'Closing balance',
    transactionDate: 'Transaction date',
    statementContent: 'Description',
    reference: 'Reference',
    moneyIn: 'Money in',
    moneyOut: 'Money out',
    runningBalance: 'Balance',
    emptyStatement: 'No transactions in this date range.',
    searchProjects: 'Search projects',
    searchPlaceholder: 'Code, name, customer',
    loadingProjects: 'Loading projects...',
    customer: 'Customer',
    lastPaid: 'Last paid',
    emptyProjects: 'No projects found.',
    paymentsTitle: 'Payment operations',
    paymentsSubtitle: 'Provider attempts and failure reasons (no secrets shown).',
    failedOnly: 'Failed attempts only',
    loadingPayments: 'Loading payments...',
    payment: 'Payment',
    projectOrder: 'Project / Order',
    type: 'Type',
    amount: 'Amount',
    status: 'Status',
    provider: 'Provider',
    attempts: 'Tries',
    lastFailure: 'Error / when',
    attemptTried: (count: number) => `Tried ${count} time${count === 1 ? '' : 's'}`,
    attemptFailed: (count: number) => `${count} failed`,
    attemptOk: 'No failures',
    noFailureReason: 'No error',
    lastTriedAt: 'Last try',
    neverTried: 'Not tried yet',
    failedTimes: (count: number) => `${count} failed`,
    zeroFailed: '0 failed',
    emptyPayments: 'No payments.',
    exceptionsTitle: 'Needs action',
    exceptionsSubtitle: 'Unusual money issues admins should review.',
    loadingExceptions: 'Loading action list...',
    severity: 'Severity',
    content: 'Details',
    age: 'Age',
    action: 'Suggested action',
    days: (count: number) => `${count} day${count === 1 ? '' : 's'}`,
    emptyExceptions: 'Nothing needs action.',
    openProject: 'Open project',
    openInAttention: 'Click to open project detail above',
    listSwitcherAria: 'Choose financial list',
    listBtnReceivables: 'Receivables',
    listBtnProjects: 'By project',
    listBtnPayments: 'Payments',
    emptyTrend: 'No collection data in this range.',
    startFee: 'Start fee',
    deposit: 'Deposit',
    remainingPayment: 'Remaining payment',
    totalCollected: 'Total collected',
    paymentCount: 'Payments',
    noCollectionMonth: 'No collection this month',
    pageItems: (page: number, totalPages: number, totalItems: number) =>
      `Page ${page} / ${Math.max(totalPages, 1)} · ${totalItems} rows`,
    rowsPerPage: 'Rows',
    pageLabel: 'Page',
    totalRows: (totalItems: number) => `${totalItems} rows`,
    prev: 'Prev',
    next: 'Next',
    escalate: 'Escalate',
    actionLevel: 'Needs action',
    watch: 'Watch',
  },
} as const;

const LABEL_VI: Record<string, string> = {
  PROJECT_START_FEE: 'Phí khởi tạo',
  DEPOSIT: 'Tiền đặt cọc',
  REMAINING_PAYMENT: 'Số tiền thanh toán còn lại',
  FULL_PAYMENT: 'Thanh toán đủ',
  REFUND: 'Hoàn tiền',
  OTHER: 'Khác',
  PENDING: 'Đang chờ',
  PROCESSING: 'Đang xử lý',
  PAID: 'Đã thanh toán',
  CANCELLED: 'Đã hủy',
  EXPIRED: 'Hết hạn',
  REFUNDED: 'Đã hoàn',
  PAYOS: 'PayOS',
  SEPAY: 'SePay',
  CASH: 'Tiền mặt',
  MANUAL_BANK_TRANSFER: 'Chuyển khoản thủ công',
  NOT_CREATED: 'Chưa tạo khoản thu',
  FAILED: 'Thất bại',
  COLLECTION: 'Thu tiền',
  ADJUSTMENT: 'Điều chỉnh',
  CREDIT: 'Tiền vào',
  DEBIT: 'Tiền ra',
  PAYMENT_TYPE: 'Loại thanh toán',
  PROJECT: 'Dự án',
  PROVIDER: 'Cổng thanh toán',
  STATUS: 'Trạng thái',
  AGING: 'Thời gian tồn đọng',
  ORDER_STATUS: 'Trạng thái đơn hàng',
  FAILURE_REASON: 'Lý do thất bại',
  '0_3': '0–3 ngày',
  '4_7': '4–7 ngày',
  '8_14': '8–14 ngày',
  OVER_14: 'Trên 14 ngày',
};

const LABEL_EN: Record<string, string> = {
  PROJECT_START_FEE: 'Start fee',
  DEPOSIT: 'Deposit',
  REMAINING_PAYMENT: 'Remaining payment',
  FULL_PAYMENT: 'Full payment',
  REFUND: 'Refund',
  OTHER: 'Other',
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  PAID: 'Paid',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
  REFUNDED: 'Refunded',
  PAYOS: 'PayOS',
  SEPAY: 'SePay',
  CASH: 'Cash',
  MANUAL_BANK_TRANSFER: 'Manual bank transfer',
  NOT_CREATED: 'Not created',
  FAILED: 'Failed',
  COLLECTION: 'Collection',
  ADJUSTMENT: 'Adjustment',
  CREDIT: 'Credit',
  DEBIT: 'Debit',
  PAYMENT_TYPE: 'Payment type',
  PROJECT: 'Project',
  PROVIDER: 'Provider',
  STATUS: 'Status',
  AGING: 'Aging',
  ORDER_STATUS: 'Order status',
  FAILURE_REASON: 'Failure reason',
  '0_3': '0–3 days',
  '4_7': '4–7 days',
  '8_14': '8–14 days',
  OVER_14: 'Over 14 days',
};

export function formatEnumLabel(lang: Lang, value: string) {
  if (!value) return '—';
  const key = value.toUpperCase();
  const mapped = (lang === 'vi' ? LABEL_VI : LABEL_EN)[key];
  if (mapped) return mapped;
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatSeverityLabel(lang: Lang, value: string | null | undefined) {
  if (!value) return '—';
  const key = value.toUpperCase();
  const t = financialCopy[lang];
  if (key === 'HIGH' || key === 'ESCALATE') return t.escalate;
  if (key === 'MEDIUM' || key === 'ACTION') return t.actionLevel;
  if (key === 'LOW' || key === 'WATCH') return t.watch;
  return value;
}
