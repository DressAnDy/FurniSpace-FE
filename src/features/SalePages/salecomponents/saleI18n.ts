import type { Lang } from '@/app/providers/useLang';

export type SaleNavKey =
  | 'dashboard'
  | 'projectRequestQueue'
  | 'assignedProjects'
  | 'projectChat'
  | 'quotations'
  | 'orders'
  | 'tracking'
  | 'schedules';

type SaleCopy = {
  workspace: string;
  openSidebar: string;
  collapseSidebar: string;
  nav: Record<SaleNavKey, string>;
  navbar: {
    searchPlaceholder: string;
    openUserMenu: string;
    logout: string;
    loggingOut: string;
    switchLang: string;
    salesUser: string;
  };
  common: {
    refresh: string;
    refreshing: string;
    search: string;
    previous: string;
    next: string;
    page: string;
    all: string;
    loading: string;
    view: string;
    actions: string;
    status: string;
    save: string;
    cancel: string;
    create: string;
    edit: string;
    delete: string;
    close: string;
    send: string;
    sending: string;
    filters: string;
    searchProjects: string;
    allStatus: string;
    allBusinessTypes: string;
    businessType: string;
    projectCode: string;
    projectName: string;
    customer: string;
    unassigned: string;
    noBusinessType: string;
  };
  dashboard: {
    eyebrow: string;
    title: string;
    subtitle: string;
    dateRange: string;
    today: string;
    thisWeek: string;
    thisMonth: string;
    scope: string;
    myProjects: string;
    teamOverview: string;
    mainActionQueue: string;
    loadingData: string;
    loadError: string;
    emptyPhase: string;
    filtersAria: string;
    colProject: string;
    colCustomer: string;
    colPhase: string;
    colPriority: string;
    colDue: string;
    colUpdated: string;
    kpiNewRequests: string;
    kpiActiveProjects: string;
    kpiWaitingCustomer: string;
    kpiPaymentsFollowUp: string;
    kpiOverdueTasks: string;
  };
  projectRequestQueue: {
    title: string;
    subtitle: string;
    accept: string;
    empty: string;
    submittedAt: string;
  };
  assignedProjects: {
    title: string;
    subtitle: string;
    empty: string;
    assignedSales: string;
    assignedCount: (count: number) => string;
  };
  projectChat: {
    title: string;
    subtitle: string;
    assignedProjects: string;
    searchByCode: string;
    loadingProjects: string;
    unableLoadProjects: string;
    noProjects: string;
    selectProjectTitle: string;
    selectProjectHint: string;
    loadingChats: string;
    noChatAvailable: string;
    loadingMessages: string;
    noMessages: string;
    typeMessage: string;
    selectChatToStart: string;
    projectCount: (count: number) => string;
  };
  quotations: {
    title: string;
    subtitle: string;
    waitingTab: string;
    finalizedTab: string;
    emptyWaiting: string;
    emptyList: string;
    selectProject: string;
    selectedProject: string;
    quotationItems: string;
    subtotal: string;
    deposit: string;
    salesNote: string;
    saveDiscounts: string;
    saveDetails: string;
    sendToCustomer: string;
    revise: string;
    validUntil: string;
    quotationCode: string;
    proposal: string;
    version: string;
    totalAmount: string;
  };
  orders: {
    title: string;
    subtitle: string;
    selectedProject: string;
    depositPayment: string;
    productionAssignment: string;
    finalPayment: string;
    createDeposit: string;
    createProduction: string;
    emptyProjects: string;
    emptyOrder: string;
    staff: string;
    priority: string;
    productionDeadline: string;
  };
  tracking: {
    title: string;
    subtitle: string;
    deliveryProjects: string;
    deliverySchedules: string;
    deliveryTimeline: string;
    itemFulfillment: string;
    remainingQty: string;
    upcoming: string;
    completedTrips: string;
    emptySelected: string;
    emptyProjects: string;
    emptySchedule: string;
    emptyTimeline: string;
    item: string;
    ordered: string;
    delivered: string;
  };
  schedules: {
    title: string;
    subtitle: string;
    createSchedule: string;
    markComplete: string;
    reschedule: string;
    emptySelected: string;
    emptyHint: string;
    start: string;
    end: string;
    location: string;
    assignment: string;
    details: string;
    monthlyOverview: string;
    allTypes: string;
    allStatuses: string;
    type: string;
  };
  createScheduleModal: {
    createTitle: string;
    updateTitle: string;
    project: string;
    scheduleType: string;
    title: string;
    startDateTime: string;
    endDateTime: string;
    location: string;
    description: string;
    selectProject: string;
    scheduleTitle: string;
    meetingLocation: string;
    additionalNotes: string;
    create: string;
    saveChanges: string;
    noDesignerProject: string;
  };
  projectDetail: {
    fallbackTitle: string;
    backAssigned: string;
    backQueue: string;
    tabOverview: string;
    tabMembers: string;
    tabFiles: string;
    tabDelay: string;
    tabIssues: string;
    tabShowcase: string;
    tabSchedules: string;
    tabOrders: string;
    requestMoreInfo: string;
    rejectProject: string;
    acceptConsultation: string;
    reopenProposal: string;
    sendRequest: string;
    completeProject: string;
    requestBasicInfo: string;
    projectCompletion: string;
    projectCompleted: string;
  };
};

const en: SaleCopy = {
  workspace: 'Interior Solutions',
  openSidebar: 'Open sale sidebar',
  collapseSidebar: 'Collapse sale sidebar',
  nav: {
    dashboard: 'Dashboard',
    projectRequestQueue: 'Project Request Queue',
    assignedProjects: 'Assigned Projects',
    projectChat: 'Project Chat',
    quotations: 'Quotations',
    orders: 'Orders',
    tracking: 'Tracking',
    schedules: 'Schedules',
  },
  navbar: {
    searchPlaceholder: 'Search sale features, e.g. project requests',
    openUserMenu: 'Open user menu',
    logout: 'Logout',
    loggingOut: 'Logging out...',
    switchLang: 'Switch to Vietnamese',
    salesUser: 'Sales User',
  },
  common: {
    refresh: 'Refresh',
    refreshing: 'Refreshing...',
    search: 'Search',
    previous: 'Previous',
    next: 'Next',
    page: 'Page',
    all: 'All',
    loading: 'Loading...',
    view: 'View',
    actions: 'Actions',
    status: 'Status',
    save: 'Save',
    cancel: 'Cancel',
    create: 'Create',
    edit: 'Edit',
    delete: 'Delete',
    close: 'Close',
    send: 'Send',
    sending: 'Sending...',
    filters: 'Filters',
    searchProjects: 'Search projects...',
    allStatus: 'All status',
    allBusinessTypes: 'All business types',
    businessType: 'Business Type',
    projectCode: 'Project Code',
    projectName: 'Project Name',
    customer: 'Customer',
    unassigned: 'Unassigned',
    noBusinessType: 'No business type',
  },
  dashboard: {
    eyebrow: 'Sales Workspace',
    title: 'Sales Dashboard',
    subtitle: 'Project coordination, commercial follow-up, and operational priorities',
    dateRange: 'Date range',
    today: 'Today',
    thisWeek: 'This week',
    thisMonth: 'This month',
    scope: 'Scope',
    myProjects: 'My assigned projects',
    teamOverview: 'Team overview',
    mainActionQueue: 'Main Action Queue',
    loadingData: 'Loading dashboard data...',
    loadError: 'Unable to load dashboard data.',
    emptyPhase: 'No actions in this phase for the selected filters.',
    filtersAria: 'Sales dashboard filters',
    colProject: 'Project',
    colCustomer: 'Customer',
    colPhase: 'Phase',
    colPriority: 'Priority',
    colDue: 'Due',
    colUpdated: 'Updated',
    kpiNewRequests: 'New Project Requests',
    kpiActiveProjects: 'Active Projects',
    kpiWaitingCustomer: 'Waiting for Customer',
    kpiPaymentsFollowUp: 'Payments Requiring Follow-up',
    kpiOverdueTasks: 'Overdue Tasks',
  },
  projectRequestQueue: {
    title: 'Project Request Queue',
    subtitle: 'Review submitted requests and accept them for consultation',
    accept: 'Accept for Consultation',
    empty: 'No submitted or information-needed projects found.',
    submittedAt: 'Submitted At',
  },
  assignedProjects: {
    title: 'Assigned Projects',
    subtitle: 'Track customer projects assigned to your sales workspace',
    empty: 'No projects have moved into the sales workspace yet.',
    assignedSales: 'Assigned Sales',
    assignedCount: (count) => `${count} assigned`,
  },
  projectChat: {
    title: 'Project Chat',
    subtitle: 'Select an assigned project to chat with the customer or production team.',
    assignedProjects: 'Assigned projects',
    searchByCode: 'Search by code',
    loadingProjects: 'Loading projects...',
    unableLoadProjects: 'Unable to load assigned projects.',
    noProjects: 'No assigned projects found.',
    selectProjectTitle: 'Select a project',
    selectProjectHint: 'Choose a project from the list to open its chat threads.',
    loadingChats: 'Loading chats...',
    noChatAvailable: 'No chat available',
    loadingMessages: 'Loading messages...',
    noMessages: 'No messages yet. Start the conversation below.',
    typeMessage: 'Type a message...',
    selectChatToStart: 'Select a chat to start',
    projectCount: (count) => `${count} project${count === 1 ? '' : 's'}`,
  },
  quotations: {
    title: 'Quotations',
    subtitle: 'Review auto-created draft quotations and send them to customers',
    waitingTab: 'Waiting for quotation',
    finalizedTab: 'Quotation finalized',
    emptyWaiting: 'No project is waiting for a quotation.',
    emptyList: 'No quotation found.',
    selectProject: 'Select a project to review its quotation.',
    selectedProject: 'Selected Project',
    quotationItems: 'Quotation Items',
    subtotal: 'Subtotal',
    deposit: 'Deposit',
    salesNote: 'Sales Note',
    saveDiscounts: 'Save Discounts',
    saveDetails: 'Save Quotation Details',
    sendToCustomer: 'Send to Customer',
    revise: 'Revise',
    validUntil: 'Valid Until',
    quotationCode: 'Quotation Code',
    proposal: 'Proposal',
    version: 'Version',
    totalAmount: 'Total Amount',
  },
  orders: {
    title: 'Orders',
    subtitle: 'Manage confirmed orders, deposits, and production handoff',
    selectedProject: 'Selected Project',
    depositPayment: 'Deposit Payment',
    productionAssignment: 'Production Assignment',
    finalPayment: 'Final Payment',
    createDeposit: 'Create / Reuse Deposit Payment',
    createProduction: 'Create Production',
    emptyProjects: 'No order projects found.',
    emptyOrder: 'No order found for this project.',
    staff: 'Staff',
    priority: 'Priority',
    productionDeadline: 'Production Deadline',
  },
  tracking: {
    title: 'Delivery Coordination',
    subtitle: 'Sales now monitors delivery progress and trip schedules',
    deliveryProjects: 'Delivery Projects',
    deliverySchedules: 'Delivery Schedules',
    deliveryTimeline: 'Delivery Timeline',
    itemFulfillment: 'Item Fulfillment',
    remainingQty: 'Remaining Qty',
    upcoming: 'Upcoming',
    completedTrips: 'Completed Trips',
    emptySelected: 'No delivery project selected',
    emptyProjects: 'No delivery projects found',
    emptySchedule: 'No delivery schedule yet',
    emptyTimeline: 'No timeline yet',
    item: 'Item',
    ordered: 'Ordered',
    delivered: 'Delivered',
  },
  schedules: {
    title: 'Schedules & Appointments',
    subtitle: 'Manage schedules, consultations, and follow-up appointments',
    createSchedule: 'Create Schedule',
    markComplete: 'Mark Complete',
    reschedule: 'Reschedule / Update Schedule',
    emptySelected: 'No schedule selected',
    emptyHint: 'Select a schedule from the calendar to view details.',
    start: 'Start',
    end: 'End',
    location: 'Location',
    assignment: 'Assignment',
    details: 'Details',
    monthlyOverview: 'Monthly overview',
    allTypes: 'All types',
    allStatuses: 'All statuses',
    type: 'Type',
  },
  createScheduleModal: {
    createTitle: 'Create New Schedule',
    updateTitle: 'Update Appointment',
    project: 'Project',
    scheduleType: 'Schedule Type',
    title: 'Title',
    startDateTime: 'Start Date & Time',
    endDateTime: 'End Date & Time',
    location: 'Location',
    description: 'Description',
    selectProject: 'Select project',
    scheduleTitle: 'Schedule title',
    meetingLocation: 'Meeting location',
    additionalNotes: 'Additional notes',
    create: 'Create Schedule',
    saveChanges: 'Save Changes',
    noDesignerProject: 'No assigned project currently has a designer.',
  },
  projectDetail: {
    fallbackTitle: 'Project Detail',
    backAssigned: 'Back to Assigned Projects',
    backQueue: 'Back to Project Request Queue',
    tabOverview: 'Overview',
    tabMembers: 'Project Member',
    tabFiles: 'Files & Attachments',
    tabDelay: 'Delay History',
    tabIssues: 'Product Issues',
    tabShowcase: 'Showcase',
    tabSchedules: 'Schedules',
    tabOrders: 'Orders',
    requestMoreInfo: 'Request More Info',
    rejectProject: 'Reject Project',
    acceptConsultation: 'Accept for Consultation',
    reopenProposal: 'Reopen Proposal',
    sendRequest: 'Send Request',
    completeProject: 'Complete Project',
    requestBasicInfo: 'Request Basic Information',
    projectCompletion: 'Project completion',
    projectCompleted: 'Project completed',
  },
};

const vi: SaleCopy = {
  workspace: 'Giải pháp nội thất',
  openSidebar: 'Mở thanh điều hướng sale',
  collapseSidebar: 'Thu gọn thanh điều hướng sale',
  nav: {
    dashboard: 'Tổng quan',
    projectRequestQueue: 'Hàng chờ yêu cầu',
    assignedProjects: 'Dự án phụ trách',
    projectChat: 'Chat dự án',
    quotations: 'Báo giá',
    orders: 'Đơn hàng',
    tracking: 'Theo dõi giao hàng',
    schedules: 'Lịch hẹn',
  },
  navbar: {
    searchPlaceholder: 'Tìm tính năng sale, ví dụ: hàng chờ yêu cầu',
    openUserMenu: 'Mở menu tài khoản',
    logout: 'Đăng xuất',
    loggingOut: 'Đang đăng xuất...',
    switchLang: 'Switch to English',
    salesUser: 'Nhân viên Sale',
  },
  common: {
    refresh: 'Làm mới',
    refreshing: 'Đang làm mới...',
    search: 'Tìm kiếm',
    previous: 'Trước',
    next: 'Sau',
    page: 'Trang',
    all: 'Tất cả',
    loading: 'Đang tải...',
    view: 'Xem',
    actions: 'Thao tác',
    status: 'Trạng thái',
    save: 'Lưu',
    cancel: 'Hủy',
    create: 'Tạo',
    edit: 'Sửa',
    delete: 'Xóa',
    close: 'Đóng',
    send: 'Gửi',
    sending: 'Đang gửi...',
    filters: 'Bộ lọc',
    searchProjects: 'Tìm dự án...',
    allStatus: 'Tất cả trạng thái',
    allBusinessTypes: 'Tất cả loại hình',
    businessType: 'Loại hình',
    projectCode: 'Mã dự án',
    projectName: 'Tên dự án',
    customer: 'Khách hàng',
    unassigned: 'Chưa gán',
    noBusinessType: 'Chưa có loại hình',
  },
  dashboard: {
    eyebrow: 'Không gian Sale',
    title: 'Bảng điều khiển Sale',
    subtitle: 'Điều phối dự án, theo dõi thương mại và ưu tiên vận hành',
    dateRange: 'Khoảng thời gian',
    today: 'Hôm nay',
    thisWeek: 'Tuần này',
    thisMonth: 'Tháng này',
    scope: 'Phạm vi',
    myProjects: 'Dự án của tôi',
    teamOverview: 'Tổng quan nhóm',
    mainActionQueue: 'Hàng đợi hành động chính',
    loadingData: 'Đang tải dữ liệu bảng điều khiển...',
    loadError: 'Không thể tải dữ liệu bảng điều khiển.',
    emptyPhase: 'Không có hành động nào trong giai đoạn này với bộ lọc đã chọn.',
    filtersAria: 'Bộ lọc bảng điều khiển sale',
    colProject: 'Dự án',
    colCustomer: 'Khách hàng',
    colPhase: 'Giai đoạn',
    colPriority: 'Ưu tiên',
    colDue: 'Hạn',
    colUpdated: 'Cập nhật',
    kpiNewRequests: 'Yêu cầu dự án mới',
    kpiActiveProjects: 'Dự án đang chạy',
    kpiWaitingCustomer: 'Đang chờ khách hàng',
    kpiPaymentsFollowUp: 'Thanh toán cần theo dõi',
    kpiOverdueTasks: 'Công việc quá hạn',
  },
  projectRequestQueue: {
    title: 'Hàng chờ yêu cầu dự án',
    subtitle: 'Xem xét yêu cầu đã gửi và nhận tư vấn',
    accept: 'Nhận tư vấn',
    empty: 'Không có dự án đã gửi hoặc cần bổ sung thông tin.',
    submittedAt: 'Ngày gửi',
  },
  assignedProjects: {
    title: 'Dự án phụ trách',
    subtitle: 'Theo dõi các dự án khách hàng được gán cho bạn',
    empty: 'Chưa có dự án nào trong không gian làm việc sale.',
    assignedSales: 'Sale phụ trách',
    assignedCount: (count) => `${count} đã gán`,
  },
  projectChat: {
    title: 'Chat dự án',
    subtitle: 'Chọn dự án phụ trách để chat với khách hàng hoặc đội sản xuất.',
    assignedProjects: 'Dự án phụ trách',
    searchByCode: 'Tìm theo mã',
    loadingProjects: 'Đang tải dự án...',
    unableLoadProjects: 'Không thể tải dự án phụ trách.',
    noProjects: 'Không tìm thấy dự án phụ trách.',
    selectProjectTitle: 'Chọn một dự án',
    selectProjectHint: 'Chọn dự án trong danh sách để mở hội thoại chat.',
    loadingChats: 'Đang tải chat...',
    noChatAvailable: 'Chưa có chat',
    loadingMessages: 'Đang tải tin nhắn...',
    noMessages: 'Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện bên dưới.',
    typeMessage: 'Nhập tin nhắn...',
    selectChatToStart: 'Chọn chat để bắt đầu',
    projectCount: (count) => `${count} dự án`,
  },
  quotations: {
    title: 'Báo giá',
    subtitle: 'Xem báo giá nháp tự tạo và gửi cho khách hàng',
    waitingTab: 'Chờ báo giá',
    finalizedTab: 'Báo giá đã chốt',
    emptyWaiting: 'Không có dự án đang chờ báo giá.',
    emptyList: 'Không tìm thấy báo giá.',
    selectProject: 'Chọn dự án để xem báo giá.',
    selectedProject: 'Dự án đã chọn',
    quotationItems: 'Hạng mục báo giá',
    subtotal: 'Tạm tính',
    deposit: 'Đặt cọc',
    salesNote: 'Ghi chú sale',
    saveDiscounts: 'Lưu giảm giá',
    saveDetails: 'Lưu chi tiết báo giá',
    sendToCustomer: 'Gửi cho khách',
    revise: 'Sửa lại',
    validUntil: 'Hiệu lực đến',
    quotationCode: 'Mã báo giá',
    proposal: 'Đề xuất',
    version: 'Phiên bản',
    totalAmount: 'Tổng tiền',
  },
  orders: {
    title: 'Đơn hàng',
    subtitle: 'Quản lý đơn đã xác nhận, đặt cọc và bàn giao sản xuất',
    selectedProject: 'Dự án đã chọn',
    depositPayment: 'Thanh toán đặt cọc',
    productionAssignment: 'Gán sản xuất',
    finalPayment: 'Thanh toán cuối',
    createDeposit: 'Tạo / Dùng lại thanh toán đặt cọc',
    createProduction: 'Tạo sản xuất',
    emptyProjects: 'Không tìm thấy dự án đơn hàng.',
    emptyOrder: 'Không tìm thấy đơn hàng cho dự án này.',
    staff: 'Nhân sự',
    priority: 'Ưu tiên',
    productionDeadline: 'Hạn sản xuất',
  },
  tracking: {
    title: 'Điều phối giao hàng',
    subtitle: 'Sale theo dõi tiến độ giao hàng và lịch chuyến',
    deliveryProjects: 'Dự án giao hàng',
    deliverySchedules: 'Lịch giao hàng',
    deliveryTimeline: 'Timeline giao hàng',
    itemFulfillment: 'Hoàn thành hạng mục',
    remainingQty: 'SL còn lại',
    upcoming: 'Sắp tới',
    completedTrips: 'Chuyến đã xong',
    emptySelected: 'Chưa chọn dự án giao hàng',
    emptyProjects: 'Không tìm thấy dự án giao hàng',
    emptySchedule: 'Chưa có lịch giao hàng',
    emptyTimeline: 'Chưa có timeline',
    item: 'Hạng mục',
    ordered: 'Đã đặt',
    delivered: 'Đã giao',
  },
  schedules: {
    title: 'Lịch hẹn',
    subtitle: 'Quản lý lịch, tư vấn và cuộc hẹn theo dõi',
    createSchedule: 'Tạo lịch hẹn',
    markComplete: 'Đánh dấu hoàn thành',
    reschedule: 'Đổi lịch / Cập nhật',
    emptySelected: 'Chưa chọn lịch hẹn',
    emptyHint: 'Chọn một lịch trên lịch để xem chi tiết.',
    start: 'Bắt đầu',
    end: 'Kết thúc',
    location: 'Địa điểm',
    assignment: 'Phân công',
    details: 'Chi tiết',
    monthlyOverview: 'Tổng quan tháng',
    allTypes: 'Tất cả loại',
    allStatuses: 'Tất cả trạng thái',
    type: 'Loại',
  },
  createScheduleModal: {
    createTitle: 'Tạo lịch hẹn mới',
    updateTitle: 'Cập nhật cuộc hẹn',
    project: 'Dự án',
    scheduleType: 'Loại lịch',
    title: 'Tiêu đề',
    startDateTime: 'Ngày & giờ bắt đầu',
    endDateTime: 'Ngày & giờ kết thúc',
    location: 'Địa điểm',
    description: 'Mô tả',
    selectProject: 'Chọn dự án',
    scheduleTitle: 'Tiêu đề lịch hẹn',
    meetingLocation: 'Địa điểm họp',
    additionalNotes: 'Ghi chú thêm',
    create: 'Tạo lịch hẹn',
    saveChanges: 'Lưu thay đổi',
    noDesignerProject: 'Chưa có dự án phụ trách nào đã có designer.',
  },
  projectDetail: {
    fallbackTitle: 'Chi tiết dự án',
    backAssigned: 'Quay lại dự án phụ trách',
    backQueue: 'Quay lại hàng chờ yêu cầu',
    tabOverview: 'Tổng quan',
    tabMembers: 'Thành viên dự án',
    tabFiles: 'Tệp & đính kèm',
    tabDelay: 'Lịch sử delay',
    tabIssues: 'Sự cố sản phẩm',
    tabShowcase: 'Showcase',
    tabSchedules: 'Lịch hẹn',
    tabOrders: 'Đơn hàng',
    requestMoreInfo: 'Yêu cầu thêm thông tin',
    rejectProject: 'Từ chối dự án',
    acceptConsultation: 'Nhận tư vấn',
    reopenProposal: 'Mở lại đề xuất',
    sendRequest: 'Gửi yêu cầu',
    completeProject: 'Hoàn thành dự án',
    requestBasicInfo: 'Yêu cầu thông tin cơ bản',
    projectCompletion: 'Hoàn tất dự án',
    projectCompleted: 'Dự án đã hoàn thành',
  },
};

export const saleCopy: Record<Lang, SaleCopy> = {
  en,
  vi,
};
