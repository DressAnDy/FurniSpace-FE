import type { Lang } from '@/app/providers/useLang';

export type AdminNavKey =
  | 'dashboard'
  | 'users'
  | 'categories'
  | 'products'
  | 'catalogModels'
  | 'layoutAssets'
  | 'threeDLab'
  | 'projects'
  | 'reports';

type AdminCopy = {
  workspace: string;
  openSidebar: string;
  collapseSidebar: string;
  nav: Record<AdminNavKey, string>;
  common: {
    refresh: string;
    refreshing: string;
    search: string;
    previous: string;
    next: string;
    rows: string;
    page: string;
    all: string;
    loading: string;
    view: string;
    open: string;
    actions: string;
    status: string;
    save: string;
    cancel: string;
    create: string;
    edit: string;
    delete: string;
    close: string;
  };
  dashboard: {
    title: string;
    subtitle: string;
    lastRefresh: (time: string) => string;
    periodThisMonth: string;
    periodLastMonth: string;
    periodThisQuarter: string;
    periodThisYear: string;
  };
  users: {
    title: string;
    subtitle: string;
    tabAccounts: string;
    tabDesignerWorkload: string;
    tabSalesWorkload: string;
    searchPlaceholder: string;
    fullName: string;
    email: string;
    phone: string;
    role: string;
    createdAt: string;
    addAccount: string;
    noAccounts: string;
    accountDetail: string;
    deleteAccount: string;
  };
  projects: {
    title: string;
    subtitle: string;
    tabProjects: string;
    tabDeadlines: string;
    allProjects: string;
    deadlineTitle: string;
    deadlineSubtitle: string;
    searchPlaceholder: string;
    salesStaff: string;
    designer: string;
    phase: string;
    allStatuses: string;
    allSales: string;
    allDesigners: string;
    allPhases: string;
    projectsInView: string;
    activeProjects: string;
    needsOwner: string;
    attentionNeeded: string;
    matchesFilters: string;
    systemWideActive: string;
    unassignedNote: string;
    attentionNote: string;
    colProject: string;
    colCustomer: string;
    colOwners: string;
    colBusinessType: string;
    colSubmitted: string;
    colNextFocus: string;
    loadingProjects: string;
    noProjects: string;
    loadingDeadlines: string;
    noDeadlines: string;
  };
  products: {
    title: string;
    subtitle: string;
    createTitle: string;
    versionsTitle: string;
    versionsSubtitle: string;
    createVersion: string;
    updateVersion: string;
  };
  categories: {
    title: string;
    subtitle: string;
  };
  catalogModels: {
    title: string;
    subtitle: string;
    workspaceFallback: string;
  };
  layoutAssets: {
    title: string;
    subtitle: string;
  };
  threeDLab: {
    title: string;
    subtitle: string;
    noProposal: string;
  };
};

export const adminCopy: Record<Lang, AdminCopy> = {
  en: {
    workspace: 'Admin Workspace',
    openSidebar: 'Open admin sidebar',
    collapseSidebar: 'Collapse admin sidebar',
    nav: {
      dashboard: 'Admin Dashboard',
      users: 'User & Role Management',
      categories: 'Product Categories',
      products: 'Products',
      catalogModels: '3D Model & File Library',
      layoutAssets: 'Layout Assets',
      threeDLab: '3D Lab',
      projects: 'Projects',
      reports: 'Reports',
    },
    common: {
      refresh: 'Refresh',
      refreshing: 'Refreshing...',
      search: 'Search',
      previous: 'Previous',
      next: 'Next',
      rows: 'Rows',
      page: 'Page',
      all: 'All',
      loading: 'Loading...',
      view: 'View',
      open: 'Open',
      actions: 'Actions',
      status: 'Status',
      save: 'Save',
      cancel: 'Cancel',
      create: 'Create',
      edit: 'Edit',
      delete: 'Delete',
      close: 'Close',
    },
    dashboard: {
      title: 'Admin Dashboard',
      subtitle: 'Overview of projects, collections, and exceptions across the workspace.',
      lastRefresh: (time) => `Updated ${time}`,
      periodThisMonth: 'This month',
      periodLastMonth: 'Last month',
      periodThisQuarter: 'This quarter',
      periodThisYear: 'This year',
    },
    users: {
      title: 'User & Role Management',
      subtitle: 'Manage accounts, roles, and staff workload across the platform.',
      tabAccounts: 'Accounts',
      tabDesignerWorkload: 'Designer workload',
      tabSalesWorkload: 'Sales workload',
      searchPlaceholder: 'Search by name or email...',
      fullName: 'Full Name',
      email: 'Email',
      phone: 'Phone',
      role: 'Role',
      createdAt: 'Created At',
      addAccount: 'Add account',
      noAccounts: 'No accounts found.',
      accountDetail: 'Account Detail',
      deleteAccount: 'Delete Account',
    },
    projects: {
      title: 'Project Management',
      subtitle: 'Monitor every customer project from request intake to design, production, delivery, and completion.',
      tabProjects: 'Projects',
      tabDeadlines: 'Deadline risk board',
      allProjects: 'All Projects',
      deadlineTitle: 'Deadline risk board',
      deadlineSubtitle: 'Proposal and production due dates that are overdue, due soon, or completed late.',
      searchPlaceholder: 'Search code, project name, business type...',
      salesStaff: 'Sales staff',
      designer: 'Designer',
      phase: 'Phase',
      allStatuses: 'All statuses',
      allSales: 'All sales staff',
      allDesigners: 'All designers',
      allPhases: 'All phases',
      projectsInView: 'Projects in View',
      activeProjects: 'Active Projects',
      needsOwner: 'Needs Owner',
      attentionNeeded: 'Attention Needed',
      matchesFilters: 'Matches current filters',
      systemWideActive: 'System-wide · not completed/rejected',
      unassignedNote: 'Unassigned intake or waiting designer',
      attentionNote: 'Missing info or rejected',
      colProject: 'Project',
      colCustomer: 'Customer',
      colOwners: 'Owners',
      colBusinessType: 'Business Type',
      colSubmitted: 'Submitted',
      colNextFocus: 'Next Focus',
      loadingProjects: 'Loading projects from API...',
      noProjects: 'No projects match the current filters.',
      loadingDeadlines: 'Loading deadline risks...',
      noDeadlines: 'No deadline risks match the current filters.',
    },
    products: {
      title: 'Product Management',
      subtitle: 'Create and maintain catalog products and their versions.',
      createTitle: 'Create New Product',
      versionsTitle: 'Product Versions',
      versionsSubtitle: 'Manage version files and publishing state for each product.',
      createVersion: 'Create Product Version',
      updateVersion: 'Update Product Version',
    },
    categories: {
      title: 'Catalog Taxonomy',
      subtitle: 'Organize business types and product categories for the catalog.',
    },
    catalogModels: {
      title: '3D Models',
      subtitle: 'Browse and manage product 3D models and related files.',
      workspaceFallback: 'Product Version Model Workspace',
    },
    layoutAssets: {
      title: 'Layout Assets',
      subtitle: 'Manage layout assets used across 3D scenes and proposals.',
    },
    threeDLab: {
      title: '3D Lab',
      subtitle: 'Preview and inspect 3D scenes for admin review.',
      noProposal: 'No proposal selected',
    },
  },
  vi: {
    workspace: 'Không gian Admin',
    openSidebar: 'Mở thanh bên admin',
    collapseSidebar: 'Thu gọn thanh bên admin',
    nav: {
      dashboard: 'Bảng điều khiển',
      users: 'Người dùng & Vai trò',
      categories: 'Danh mục sản phẩm',
      products: 'Sản phẩm',
      catalogModels: 'Thư viện model 3D',
      layoutAssets: 'Tài nguyên layout',
      threeDLab: 'Phòng lab 3D',
      projects: 'Dự án',
      reports: 'Báo cáo',
    },
    common: {
      refresh: 'Làm mới',
      refreshing: 'Đang làm mới...',
      search: 'Tìm',
      previous: 'Trước',
      next: 'Sau',
      rows: 'Dòng',
      page: 'Trang',
      all: 'Tất cả',
      loading: 'Đang tải...',
      view: 'Xem',
      open: 'Mở',
      actions: 'Thao tác',
      status: 'Trạng thái',
      save: 'Lưu',
      cancel: 'Hủy',
      create: 'Tạo',
      edit: 'Sửa',
      delete: 'Xóa',
      close: 'Đóng',
    },
    dashboard: {
      title: 'Bảng điều khiển',
      subtitle: 'Tổng quan dự án, thu tiền và ngoại lệ trên toàn hệ thống.',
      lastRefresh: (time) => `Cập nhật ${time}`,
      periodThisMonth: 'Tháng này',
      periodLastMonth: 'Tháng trước',
      periodThisQuarter: 'Quý này',
      periodThisYear: 'Năm nay',
    },
    users: {
      title: 'Người dùng & Vai trò',
      subtitle: 'Quản lý tài khoản, vai trò và khối lượng công việc nhân sự.',
      tabAccounts: 'Tài khoản',
      tabDesignerWorkload: 'Khối lượng Designer',
      tabSalesWorkload: 'Khối lượng Sales',
      searchPlaceholder: 'Tìm theo tên hoặc email...',
      fullName: 'Họ tên',
      email: 'Email',
      phone: 'Số điện thoại',
      role: 'Vai trò',
      createdAt: 'Ngày tạo',
      addAccount: 'Thêm tài khoản',
      noAccounts: 'Không tìm thấy tài khoản.',
      accountDetail: 'Chi tiết tài khoản',
      deleteAccount: 'Xóa tài khoản',
    },
    projects: {
      title: 'Quản lý dự án',
      subtitle: 'Theo dõi mọi dự án khách từ tiếp nhận đến thiết kế, sản xuất, giao hàng và hoàn tất.',
      tabProjects: 'Dự án',
      tabDeadlines: 'Bảng rủi ro deadline',
      allProjects: 'Tất cả dự án',
      deadlineTitle: 'Bảng rủi ro deadline',
      deadlineSubtitle: 'Hạn proposal và production quá hạn, sắp đến hạn hoặc hoàn thành trễ.',
      searchPlaceholder: 'Tìm mã, tên dự án, loại hình kinh doanh...',
      salesStaff: 'Nhân viên sales',
      designer: 'Designer',
      phase: 'Giai đoạn',
      allStatuses: 'Mọi trạng thái',
      allSales: 'Mọi sales',
      allDesigners: 'Mọi designer',
      allPhases: 'Mọi giai đoạn',
      projectsInView: 'Dự án đang xem',
      activeProjects: 'Dự án đang chạy',
      needsOwner: 'Chưa có phụ trách',
      attentionNeeded: 'Cần chú ý',
      matchesFilters: 'Khớp bộ lọc hiện tại',
      systemWideActive: 'Toàn hệ thống · chưa hoàn tất/từ chối',
      unassignedNote: 'Chưa gán intake hoặc chờ designer',
      attentionNote: 'Thiếu thông tin hoặc bị từ chối',
      colProject: 'Dự án',
      colCustomer: 'Khách hàng',
      colOwners: 'Phụ trách',
      colBusinessType: 'Loại hình',
      colSubmitted: 'Ngày gửi',
      colNextFocus: 'Việc tiếp theo',
      loadingProjects: 'Đang tải dự án...',
      noProjects: 'Không có dự án khớp bộ lọc hiện tại.',
      loadingDeadlines: 'Đang tải rủi ro deadline...',
      noDeadlines: 'Không có rủi ro deadline khớp bộ lọc hiện tại.',
    },
    products: {
      title: 'Quản lý sản phẩm',
      subtitle: 'Tạo và duy trì sản phẩm catalog cùng các phiên bản.',
      createTitle: 'Tạo sản phẩm mới',
      versionsTitle: 'Phiên bản sản phẩm',
      versionsSubtitle: 'Quản lý file phiên bản và trạng thái xuất bản của từng sản phẩm.',
      createVersion: 'Tạo phiên bản sản phẩm',
      updateVersion: 'Cập nhật phiên bản sản phẩm',
    },
    categories: {
      title: 'Phân loại catalog',
      subtitle: 'Tổ chức loại hình kinh doanh và danh mục sản phẩm.',
    },
    catalogModels: {
      title: 'Model 3D',
      subtitle: 'Duyệt và quản lý model 3D sản phẩm cùng file liên quan.',
      workspaceFallback: 'Không gian model phiên bản sản phẩm',
    },
    layoutAssets: {
      title: 'Tài nguyên layout',
      subtitle: 'Quản lý tài nguyên layout dùng cho scene 3D và proposal.',
    },
    threeDLab: {
      title: 'Phòng lab 3D',
      subtitle: 'Xem trước và kiểm tra scene 3D phục vụ review admin.',
      noProposal: 'Chưa chọn proposal',
    },
  },
};
