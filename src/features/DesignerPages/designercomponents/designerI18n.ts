import type { Lang } from '@/app/providers/useLang';

export type DesignerNavKey =
  | 'dashboard'
  | 'assignedProjects'
  | 'productLibrary'
  | 'schedules';

export type DesignerCopy = {
  workspace: string;
  openSidebar: string;
  collapseSidebar: string;
  nav: Record<DesignerNavKey, string>;
  navbar: {
    searchPlaceholder: string;
    openUserMenu: string;
    logout: string;
    loggingOut: string;
    switchLang: string;
    designerUser: string;
  };
  common: {
    refresh: string;
    refreshing: string;
    search: string;
    previous: string;
    next: string;
    page: string;
    rows: string;
    all: string;
    loading: string;
    view: string;
    actions: string;
    status: string;
    save: string;
    saving: string;
    cancel: string;
    create: string;
    edit: string;
    delete: string;
    close: string;
    clear: string;
    clearAll: string;
    done: string;
    filters: string;
    filterProjects: string;
    closeFilters: string;
    allStatus: string;
    allBusinessTypes: string;
    businessType: string;
    customer: string;
    project: string;
    open: string;
    notSpecified: string;
    dash: string;
    yes: string;
    no: string;
    priority: string;
    allPriorities: string;
    type: string;
    pageOf: (current: number, total: number) => string;
    itemsCount: (n: number) => string;
  };
  dashboard: {
    eyebrow: string;
    title: string;
    subtitle: string;
    filtersAria: string;
    dateRange: string;
    today: string;
    thisWeek: string;
    thisMonth: string;
    projectFilter: string;
    filterAssigned: string;
    filterOverdue: string;
    filterCustomization: string;
    primaryActionCustomization: string;
    primaryActionOverdue: string;
    primaryActionAssigned: string;
    refreshAt: (time: string) => string;
    kpiConfirmedLabel: string;
    kpiConfirmedNote: string;
    kpiConfirmedDescription: string;
    kpiConsultingLabel: string;
    kpiConsultingNote: string;
    kpiConsultingDescription: string;
    kpiRevisionLabel: string;
    kpiRevisionNote: string;
    kpiRevisionDescription: string;
    kpiAssignedLabel: string;
    kpiAssignedNote: string;
    kpiAssignedDescription: string;
    panelWorkQueue: string;
    panelConfirmed: string;
    panelConsulting: string;
    panelRevisions: string;
    panelAssigned: string;
    panelSubtitleWorkQueue: (range: string, filter: string) => string;
    panelSubtitleConfirmed: (range: string) => string;
    panelSubtitleConsulting: (range: string) => string;
    panelSubtitleRevisions: (range: string) => string;
    panelSubtitleAssigned: string;
    backToQueue: string;
    openSchedules: string;
    openProjects: string;
    filterWorkQueue: string;
    workQueueFiltersAria: string;
    workGroupsAria: string;
    priorityChip: (label: string) => string;
    queueCols: {
      project: string;
      phase: string;
      warning: string;
      priority: string;
      action: string;
      due: string;
      status: string;
    };
    measurementsCols: {
      project: string;
      title: string;
      start: string;
      location: string;
      assignee: string;
      status: string;
    };
    consultingCols: {
      project: string;
      customer: string;
      designer: string;
      assigned: string;
      updated: string;
      status: string;
    };
    revisionsCols: {
      proposal: string;
      project: string;
      note: string;
      requested: string;
      designer: string;
      status: string;
    };
    assignedCols: {
      project: string;
      customer: string;
      assigned: string;
      customization: string;
      customStatus: string;
      status: string;
    };
    tabConfirmed: string;
    tabConsulting: string;
    tabRevisions: string;
    tabAssigned: string;
    loadingQueue: string;
    loadingConfirmed: string;
    loadingConsulting: string;
    loadingRevisions: string;
    loadingAssigned: string;
    emptyConfirmed: (range: string) => string;
    emptyConsulting: (range: string) => string;
    emptyRevisions: (range: string) => string;
    emptyAssigned: string;
    emptyQueueFiltered: (range: string, filter: string) => string;
    emptyQueueDefault: string;
    openProject: string;
    openProposal: string;
    untitledProposal: string;
    customizationYes: string;
    customizationNo: string;
    customizationYesOpen: (count: number) => string;
    pagerZeroItems: string;
    pagerSummary: (page: number, totalPages: number, totalItems: number) => string;
    previousPageAria: string;
    nextPageAria: string;
    openProjectAria: (code: string) => string;
    openProposalAria: (name: string) => string;
  };
  assignedProjects: {
    title: string;
    subtitleLoading: string;
    subtitleCount: (filtered: number, total: number) => string;
    searchPlaceholder: string;
    filtersLabel: string;
    filterProjects: string;
    projectFiltersAria: string;
    closeFilters: string;
    status: string;
    businessType: string;
    countOfProjects: (filtered: number, total: number) => string;
    statusChip: (label: string) => string;
    typeChip: (type: string) => string;
    clearAll: string;
    cols: {
      project: string;
      customer: string;
      type: string;
      submitted: string;
      status: string;
      sales: string;
      action: string;
    };
    loading: string;
    loadingCustomer: string;
    loadingSales: string;
    viewProject: string;
    empty: string;
  };
  productLibrary: {
    back: string;
    title: string;
    subtitleBrowse: (visible: number, total: number) => string;
    subtitleLoading: string;
    subtitleVersions: (n: number) => string;
    searchPlaceholder: string;
    versionType: string;
    businessType: string;
    allBusinessTypes: string;
    versionsCount: (n: number) => string;
    filterAllTypes: string;
    filterDefault: string;
    filterPublic: string;
    filterProjectSpecific: string;
    filterPlannerReady: string;
    empty: string;
    paginationAria: string;
    rowsPerPage: string;
    pageLabel: string;
    productsCount: (n: number) => string;
    modelsReady: string;
    productVersions: string;
    noDescription: string;
    versionCount: (n: number) => string;
    viewVersions: string;
    loadingVersions: string;
    noVersions: string;
    modelReady: string;
    noModel: string;
    previewHint: string;
    noModelFile: string;
    closePreview: string;
    material: string;
    color: string;
    size: string;
    estimatedPrice: string;
    ready3d: string;
    no3d: string;
    assets3d: string;
    badgeDefault: string;
    badgePublic: string;
    badgeProject: string;
  };
  createProductVersion: {
    back: string;
    title: string;
    loadingProduct: string;
    subtitle: (name: string) => string;
    loadingParent: string;
    adminNote: string;
    parentProduct: string;
    product: string;
    category: string;
    businessType: string;
    notAssigned: string;
    code: string;
    versionInformation: string;
    versionCode: string;
    versionName: string;
    versionType: string;
    material: string;
    color: string;
    estimatedPrice: string;
    placeholderVersionName: string;
    placeholderMaterial: string;
    placeholderColor: string;
    placeholderPrice: string;
    dimensions: string;
    width: string;
    height: string;
    depth: string;
    settings: string;
    projectSpecific: string;
    projectSpecificHint: string;
    cancel: string;
    saving: string;
    createVersion: string;
  };
  schedules: {
    title: string;
    legendAria: string;
    monthlyOverview: string;
    prevMonth: string;
    nextMonth: string;
    weekdays: readonly [string, string, string, string, string, string, string];
    scheduleCount: (n: number) => string;
    noSchedule: string;
    showLess: string;
    more: (n: number) => string;
    emptyTitle: string;
    emptyHint: string;
    start: string;
    end: string;
    location: string;
    assignment: string;
    assignedToYou: string;
    details: string;
    noDetails: string;
    notSpecified: string;
    completing: string;
    completeSchedule: string;
    openProject: string;
    completedSuccess: string;
    completeNote: string;
  };
  projectDetail: {
    back: string;
    loading: string;
    tabs: {
      overview: string;
      spaceFiles: string;
      measurementImages: string;
      projectAreas: string;
      proposals: string;
      customization: string;
      schedules: string;
      chat: string;
    };
    tabsAria: string;
    placeholder: string;
    loadingCustomer: string;
    noTargetDate: string;
    sales: (name: string) => string;
    saleDeadline: (date: string) => string;
    sqm: (type: string, area: number) => string;
    currentStatus: string;
    updating: string;
    markSpaceVerified: string;
    startProposalConsulting: string;
    readyForProposals: string;
    noDesignerStep: string;
    updateTo: (status: string) => string;
    spaceVerifyBlock: string;
    statusUpdated: (status: string) => string;
  };
  overviewTab: {
    projectInformation: string;
    projectCode: string;
    businessType: string;
    address: string;
    floors: string;
    totalArea: string;
    budget: string;
    targetDate: string;
    status: string;
    designTimeline: string;
    noDeadline: string;
    customerRequirements: string;
    furnitureRequirement: string;
    businessPurpose: string;
    description: string;
    emptyRequirements: string;
    sqm: (v: number) => string;
  };
  spaceFilesTab: {
    title: string;
    loading: string;
    count: (n: number, code: string) => string;
    error: string;
    empty: string;
    projectFile: string;
    preview: (name: string) => string;
    download: (name: string) => string;
  };
  measurementImagesTab: {
    title: string;
    intro: string;
    uploadTitle: string;
    uploadDesc: string;
    measurementSchedule: string;
    projectArea: string;
    note: string;
    loadingSchedules: string;
    selectSchedule: string;
    measurement: string;
    loadingAreas: string;
    selectArea: string;
    optionalNote: string;
    chooseImages: string;
    imagesReady: (n: number) => string;
    multiHint: string;
    uploading: string;
    uploadButton: string;
    area: string;
    allAreas: string;
    cannotLoadAreas: string;
    emptyTitle: string;
    emptyHint: string;
    noUploadTime: string;
    scheduleLabel: string;
    areasLabel: string;
    unnamedArea: string;
    measurementFile: string;
    fileId: (id: string) => string;
    removeFile: (name: string) => string;
    createAreaFirst: string;
    noConfirmedSchedule: string;
    invalidFileType: string;
    errSelectSchedule: string;
    errSelectArea: string;
    errSelectImages: string;
    uploadPartial: (uploaded: number, total: number, failed: number) => string;
    uploadSuccess: (count: number) => string;
  };
  projectAreasTab: {
    title: string;
    intro: string;
    addArea: string;
    updateArea: string;
    areaName: string;
    layoutMode: string;
    standardRect: string;
    specialLayout: string;
    width: string;
    length: string;
    height: string;
    areaM2: string;
    description: string;
    currentCondition: string;
    requirementNote: string;
    cancel: string;
    saving: string;
    update: string;
    create: string;
    loading: string;
    empty: string;
    specialImages: string;
    uploadHint: string;
    retry: string;
    imageUploaded: string;
    floor: (n: number) => string;
    floorArea: string;
    special: string;
    standard: string;
    areaDetails: string;
    updateBtn: string;
    specialLayoutImages: string;
    measurementImages: string;
    referenceImage: string;
    errAreaName: string;
    errFloor: string;
    errDimensions: string;
    errNoFloor: string;
  };
  proposalsTab: {
    title: string;
    loading: string;
    count: (n: number) => string;
    setupButton: string;
    setupTooltip: string;
    moveToConsulting: string;
    cols: {
      proposal: string;
      version: string;
      status: string;
      scenes: string;
      published: string;
      updated: string;
      action: string;
    };
    loadingTable: string;
    empty: string;
    emptyHint: string;
    openDetail: string;
    publish: string;
    publishing: string;
    published: string;
    notPublished: string;
    scenes: (n: number) => string;
    revisionNote: string;
    createModalTitle: string;
    name: string;
    description: string;
    namePh: string;
    descPh: string;
    cancel: string;
    creating: string;
    createSubmit: string;
    errNameRequired: string;
    errDescRequired: string;
    errNeedAreas: string;
    publishSuccess: (name: string) => string;
    createSuccess: (name: string, floors: number) => string;
  };
  customizationTab: {
    title: string;
    filterAll: string;
    filterSubmitted: string;
    filterReviewing: string;
    filterAccepted: string;
    filterCancelled: string;
    filterAria: string;
    loading: string;
    empty: string;
    emptyHint: string;
    assistTitle: string;
    assistDesc: string;
    publishedProposals: string;
    itemsLoaded: string;
    createRequest: string;
    created: (date: string) => string;
    versions: (n: number) => string;
    noNote: string;
    source: string;
    material: string;
    color: string;
    selectedRequest: string;
    newVersion: string;
    versionsLabel: string;
    noVersion: string;
    cancelRequest: string;
    versionPanel: string;
    selectRequest: string;
    modalAssistTitle: string;
    modalVersionCreate: string;
    modalVersionEdit: string;
    modalCancelTitle: string;
    formTitle: string;
    formDescription: string;
    formMaterial: string;
    formColor: string;
    formChangeNote: string;
    submit: string;
    submitting: string;
    createDraft: string;
    updateDraft: string;
    saving: string;
    cancelReasonPh: string;
    cancelling: string;
    successRequestCreated: string;
    successVersionSaved: string;
    successVersionSubmitted: string;
    successCancelled: string;
    errVersionName: string;
    errCancelReason: string;
    errRequestFields: string;
  };
  schedulesTab: {
    title: string;
    subtitle: (code: string) => string;
    loading: string;
    empty: string;
    completedSuccess: string;
    when: string;
    location: string;
    assignee: string;
    notSpecified: string;
    assignedToYou: string;
    complete: string;
    completing: string;
  };
  chatTab: {
    selectChat: string;
    projectChat: string;
    sales: string;
    noChat: string;
    loadingChat: string;
    noThreads: string;
    loadingMessages: string;
    noMessages: string;
    typeMessage: string;
    send: string;
    sending: string;
    attachment: string;
    messageDeleted: string;
    unknown: string;
  };
  proposalWorkspace: {
    backProjectDetail: string;
    loadingProject: string;
    projectNotFound: string;
    loadingProposal: string;
    proposalNotFound: string;
    noProjectData: string;
    version: (n: number) => string;
    setup: string;
    setupTitle: string;
    updateInfo: string;
    reopen: string;
    reopening: string;
    publish: string;
    publishing: string;
    scenes: string;
    chat: string;
    designerChat: string;
    proposalInfo: string;
    proposalScenes: string;
    proposalScenesHint: string;
    projectItems: string;
    createProposalScene: string;
    projectAreas: string;
    selectArea: string;
    untitledScene: string;
    unnamedArea: string;
    floors: string;
    noFloors: string;
    openRoomPlanner: string;
    editScene: string;
    productVersion: string;
    material: string;
    color: string;
    quantity: string;
    unitPrice: string;
    subtotal: string;
    estimatedTotal: string;
    proposalItem: string;
    saveInfo: string;
    saveScene: string;
    noAreaLinked: string;
    confirmReopen: string;
    reopenForEditing: string;
    publishProposal: string;
    updateProposalModalTitle: string;
    updateProposalModalDesc: string;
    updateSceneModalTitle: string;
    updateSceneModalDesc: string;
    proposalName: string;
    sceneName: string;
    errPublish: string;
    errNameRequired: string;
    errDescRequired: string;
    errNeedAreas: string;
    publishSuccess: string;
    proposalUpdated: string;
    sceneUpdated: string;
    reopened: string;
    loadingScenes: string;
    selectAreaFirst: string;
    noSceneForArea: string;
    loadingItems: string;
    noItems: string;
    chatUnavailable: string;
    noDescription: string;
    customerRevisionNote: string;
    selected: (name: string) => string;
    condition: string;
    requirement: string;
    width: string;
    length: string;
    height: string;
    floor: string;
    area: string;
  };
};

const en: DesignerCopy = {
  workspace: 'Designer',
  openSidebar: 'Open designer sidebar',
  collapseSidebar: 'Collapse designer sidebar',
  nav: {
    dashboard: 'Dashboard',
    assignedProjects: 'Assigned Projects',
    productLibrary: 'Product Library',
    schedules: 'My Schedule',
  },
  navbar: {
    searchPlaceholder: 'Search designer features...',
    openUserMenu: 'Open user menu',
    logout: 'Logout',
    loggingOut: 'Logging out...',
    switchLang: 'Chuyển sang Tiếng Việt',
    designerUser: 'Designer',
  },
  common: {
    refresh: 'Refresh',
    refreshing: 'Refreshing...',
    search: 'Search',
    previous: 'Previous',
    next: 'Next',
    page: 'Page',
    rows: 'Rows',
    all: 'All',
    loading: 'Loading...',
    view: 'View',
    actions: 'Actions',
    status: 'Status',
    save: 'Save',
    saving: 'Saving...',
    cancel: 'Cancel',
    create: 'Create',
    edit: 'Edit',
    delete: 'Delete',
    close: 'Close',
    clear: 'Clear',
    clearAll: 'Clear all',
    done: 'Done',
    filters: 'Filters',
    filterProjects: 'Filter projects',
    closeFilters: 'Close filters',
    allStatus: 'All status',
    allBusinessTypes: 'All business types',
    businessType: 'Business type',
    customer: 'Customer',
    project: 'Project',
    open: 'Open',
    notSpecified: 'Not specified',
    dash: '-',
    yes: 'Yes',
    no: 'No',
    priority: 'Priority',
    allPriorities: 'All priorities',
    type: 'Type',
    pageOf: (current, total) => `Page ${current} of ${total}`,
    itemsCount: (n) => (n === 1 ? '1 item' : `${n} items`),
  },
  dashboard: {
    eyebrow: 'Designer Workspace',
    title: 'Designer Dashboard',
    subtitle: 'Assigned projects, design progress, Room Planner, and customization work',
    filtersAria: 'Designer dashboard filters',
    dateRange: 'Date range',
    today: 'Today',
    thisWeek: 'This week',
    thisMonth: 'This month',
    projectFilter: 'Project filter',
    filterAssigned: 'My assigned projects',
    filterOverdue: 'Overdue / at risk',
    filterCustomization: 'Customization work',
    primaryActionCustomization: 'Open Customization Work',
    primaryActionOverdue: 'Open At-Risk Projects',
    primaryActionAssigned: 'Open Assigned Projects',
    refreshAt: (time) => `Refresh · ${time}`,
    kpiConfirmedLabel: 'Confirmed Measurements',
    kpiConfirmedNote: 'This week',
    kpiConfirmedDescription: 'Confirmed measurement schedules still to complete in this date range',
    kpiConsultingLabel: 'Proposal Consulting',
    kpiConsultingNote: 'This week',
    kpiConsultingDescription: 'Assigned projects currently in Proposal Consulting',
    kpiRevisionLabel: 'Revision Requests',
    kpiRevisionNote: 'This week',
    kpiRevisionDescription: 'Proposals with customer revision requests still pending',
    kpiAssignedLabel: 'Customize Requests',
    kpiAssignedNote: 'Stock',
    kpiAssignedDescription: 'Projects currently assigned to you, including customer customization requests',
    panelWorkQueue: 'Main Design Work Queue',
    panelConfirmed: 'Confirmed Measurements',
    panelConsulting: 'Proposal Consulting',
    panelRevisions: 'Revision Requests',
    panelAssigned: 'Assigned Projects',
    panelSubtitleWorkQueue: (range, filter) => `Prioritized work for ${range} · ${filter}.`,
    panelSubtitleConfirmed: (range) => `Confirmed measurement schedules for ${range}.`,
    panelSubtitleConsulting: (range) => `Projects in Proposal Consulting for ${range}.`,
    panelSubtitleRevisions: (range) => `Proposals with customer revision requests for ${range}.`,
    panelSubtitleAssigned: 'Projects currently assigned to you (stock count). Customer customization shown per project.',
    backToQueue: 'Back to queue',
    openSchedules: 'Open schedules',
    openProjects: 'Open projects',
    filterWorkQueue: 'Filter work queue',
    workQueueFiltersAria: 'Work queue filters',
    workGroupsAria: 'Design work groups',
    priorityChip: (label) => `Priority: ${label}`,
    queueCols: {
      project: 'Project',
      phase: 'Phase',
      warning: 'Warning',
      priority: 'Priority',
      action: 'Action',
      due: 'Due',
      status: 'Status',
    },
    measurementsCols: {
      project: 'Project',
      title: 'Title',
      start: 'Start',
      location: 'Location',
      assignee: 'Assignee',
      status: 'Status',
    },
    consultingCols: {
      project: 'Project',
      customer: 'Customer',
      designer: 'Designer',
      assigned: 'Assigned',
      updated: 'Updated',
      status: 'Status',
    },
    revisionsCols: {
      proposal: 'Proposal',
      project: 'Project',
      note: 'Note',
      requested: 'Requested',
      designer: 'Designer',
      status: 'Status',
    },
    assignedCols: {
      project: 'Project',
      customer: 'Customer',
      assigned: 'Assigned',
      customization: 'Customization',
      customStatus: 'Custom status',
      status: 'Status',
    },
    tabConfirmed: 'Confirmed',
    tabConsulting: 'Proposal Consulting',
    tabRevisions: 'Revision Requests',
    tabAssigned: 'Assigned',
    loadingQueue: 'Loading design work queue...',
    loadingConfirmed: 'Loading confirmed measurements...',
    loadingConsulting: 'Loading Proposal Consulting projects...',
    loadingRevisions: 'Loading revision requests...',
    loadingAssigned: 'Loading assigned projects...',
    emptyConfirmed: (range) => `No confirmed measurement schedules for ${range}.`,
    emptyConsulting: (range) => `No Proposal Consulting projects for ${range}.`,
    emptyRevisions: (range) => `No revision requests for ${range}.`,
    emptyAssigned: 'No projects are currently assigned to you.',
    emptyQueueFiltered: (range, filter) => `No work items match ${range} · ${filter}.`,
    emptyQueueDefault: 'No work items in this phase.',
    openProject: 'Open project',
    openProposal: 'Open proposal',
    untitledProposal: 'Untitled proposal',
    customizationYes: 'Yes',
    customizationNo: 'No',
    customizationYesOpen: (count) => `Yes · ${count} open`,
    pagerZeroItems: '0 items',
    pagerSummary: (page, totalPages, totalItems) => `Page ${page} of ${totalPages} · ${totalItems} items`,
    previousPageAria: 'Previous page',
    nextPageAria: 'Next page',
    openProjectAria: (code) => `Open ${code}`,
    openProposalAria: (name) => `Open proposal ${name}`,
  },
  assignedProjects: {
    title: 'Assigned Projects',
    subtitleLoading: 'Loading projects assigned to you...',
    subtitleCount: (f, t) => `${f} of ${t} assigned projects`,
    searchPlaceholder: 'Search project, customer...',
    filtersLabel: 'Filters:',
    filterProjects: 'Filter projects',
    projectFiltersAria: 'Project filters',
    closeFilters: 'Close filters',
    status: 'Status',
    businessType: 'Business type',
    countOfProjects: (f, t) => `${f} of ${t} projects`,
    statusChip: (label) => `Status: ${label}`,
    typeChip: (type) => `Type: ${type}`,
    clearAll: 'Clear all',
    cols: {
      project: 'Project',
      customer: 'Customer',
      type: 'Type',
      submitted: 'Submitted',
      status: 'Status',
      sales: 'Sales',
      action: 'Action',
    },
    loading: 'Loading assigned projects...',
    loadingCustomer: 'Loading customer...',
    loadingSales: 'Loading sales...',
    viewProject: 'View project',
    empty: 'No assigned projects match the current filters.',
  },
  productLibrary: {
    back: 'Back to Product Library',
    title: 'Product Library',
    subtitleBrowse: (visible, total) => `${visible} of ${total} products - Browse versions and 3D models`,
    subtitleLoading: 'Loading products from catalog...',
    subtitleVersions: (n) => `${n} product versions - Select the version and model for your proposal`,
    searchPlaceholder: 'Search product, material, code...',
    versionType: 'Version type',
    businessType: 'Business type',
    allBusinessTypes: 'All business types',
    versionsCount: (n) => `${n} versions`,
    filterAllTypes: 'All Types',
    filterDefault: 'Default',
    filterPublic: 'Public',
    filterProjectSpecific: 'Project Specific',
    filterPlannerReady: 'Planner Ready',
    empty: 'No products match the current filters.',
    paginationAria: 'Product library pagination',
    rowsPerPage: 'Rows',
    pageLabel: 'Page',
    productsCount: (n) => `${n} products`,
    modelsReady: '3D Models Ready',
    productVersions: 'Product Versions',
    noDescription: 'No description yet.',
    versionCount: (n) => `${n} version${n === 1 ? '' : 's'}`,
    viewVersions: 'View versions',
    loadingVersions: 'Loading product versions...',
    noVersions: 'No product versions found.',
    modelReady: '3D model ready',
    noModel: 'No 3D model',
    previewHint: 'Drag to rotate, scroll to zoom.',
    noModelFile: 'No MODEL_3D file is attached to this version.',
    closePreview: 'Close 3D model preview',
    material: 'Material',
    color: 'Color',
    size: 'Size',
    estimatedPrice: 'Estimated price',
    ready3d: '3D Ready',
    no3d: 'No 3D',
    assets3d: '3D Assets',
    badgeDefault: 'Default',
    badgePublic: 'Public',
    badgeProject: 'Project',
  },
  createProductVersion: {
    back: 'Back to Product Library',
    title: 'Create Product Version',
    loadingProduct: 'Loading product from catalog...',
    subtitle: (name) => `Add a Designer-created version for ${name}`,
    loadingParent: 'Loading parent product...',
    adminNote: 'This version is created by a designer and linked to the catalog parent product.',
    parentProduct: 'Parent product',
    product: 'Product',
    category: 'Category',
    businessType: 'Business type',
    notAssigned: 'Not assigned',
    code: 'Code',
    versionInformation: 'Version information',
    versionCode: 'Version code',
    versionName: 'Version name',
    versionType: 'Version type',
    material: 'Material',
    color: 'Color',
    estimatedPrice: 'Estimated price',
    placeholderVersionName: 'e.g., Designer layout variant',
    placeholderMaterial: 'e.g., Oak Wood',
    placeholderColor: 'e.g., Natural',
    placeholderPrice: '0',
    dimensions: 'Dimensions',
    width: 'Width',
    height: 'Height',
    depth: 'Depth',
    settings: 'Settings',
    projectSpecific: 'Project-specific version',
    projectSpecificHint: 'Mark this version as tied to a single customer project.',
    cancel: 'Cancel',
    saving: 'Saving...',
    createVersion: 'Create Version',
  },
  schedules: {
    title: 'My Schedule',
    legendAria: 'Schedule status legend',
    monthlyOverview: 'Monthly overview',
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
    weekdays: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
    scheduleCount: (n) => (n === 1 ? '1 schedule' : `${n} schedules`),
    noSchedule: 'No schedule',
    showLess: 'Show less',
    more: (n) => `+${n} more`,
    emptyTitle: 'No schedule selected',
    emptyHint: 'Select a schedule from the calendar to review its details.',
    start: 'Start',
    end: 'End',
    location: 'Location',
    assignment: 'Assignment',
    assignedToYou: 'Assigned to you',
    details: 'Details',
    noDetails: 'No additional schedule details were provided.',
    notSpecified: 'Not specified',
    completing: 'Completing...',
    completeSchedule: 'Complete Schedule',
    openProject: 'Open project',
    completedSuccess: 'Schedule completed successfully.',
    completeNote: 'Designer marked the schedule as completed.',
  },
  projectDetail: {
    back: 'Back to Assigned Projects',
    loading: 'Loading project detail...',
    tabs: {
      overview: 'Overview',
      spaceFiles: 'Space Files',
      measurementImages: 'Measurement Images',
      projectAreas: 'Project Areas',
      proposals: 'Proposals',
      customization: 'Customization',
      schedules: 'Schedules',
      chat: 'Chat',
    },
    tabsAria: 'Designer project detail sections',
    placeholder: 'This section is reserved for the next designer workflow implementation.',
    loadingCustomer: 'Loading customer...',
    noTargetDate: 'No target date',
    sales: (name) => `Sales: ${name}`,
    saleDeadline: (date) => `Sale deadline: ${date}`,
    sqm: (type, area) => `${type} - ${area} sqm`,
    currentStatus: 'Current Status',
    updating: 'Updating...',
    markSpaceVerified: 'Mark Space Verified',
    startProposalConsulting: 'Start Proposal Consulting',
    readyForProposals: 'Ready for Proposals',
    noDesignerStep: 'No Designer Step',
    updateTo: (status) => `Project status updated to ${status}.`,
    spaceVerifyBlock: 'Please complete all project schedules before marking the space as verified.',
    statusUpdated: (status) => `Project status updated to ${status}.`,
  },
  overviewTab: {
    projectInformation: 'Project Information',
    projectCode: 'Project Code',
    businessType: 'Business Type',
    address: 'Address',
    floors: 'Floors',
    totalArea: 'Total Area',
    budget: 'Budget',
    targetDate: 'Target Date',
    status: 'Status',
    designTimeline: 'Design Timeline',
    noDeadline: 'No design deadline has been planned yet.',
    customerRequirements: 'Customer Requirements',
    furnitureRequirement: 'Furniture Requirement',
    businessPurpose: 'Business Purpose',
    description: 'Description',
    emptyRequirements: 'No additional customer requirements have been provided yet.',
    sqm: (v) => `${v} sqm`,
  },
  spaceFilesTab: {
    title: 'Space Files',
    loading: 'Loading project files...',
    count: (n, code) => `${n} file${n === 1 ? '' : 's'} available for ${code}`,
    error: 'Could not load project files. Please check project file access permissions.',
    empty: 'No files are available for this project yet.',
    projectFile: 'Project file',
    preview: (name) => `Preview ${name}`,
    download: (name) => `Download ${name}`,
  },
  measurementImagesTab: {
    title: 'Measurement Images',
    intro: 'Images captured from measurement schedules are synced from mobile and linked to project areas.',
    uploadTitle: 'Upload Measurement Image',
    uploadDesc: 'Upload image files to a confirmed measurement schedule and link them to the measured area.',
    measurementSchedule: 'Measurement schedule',
    projectArea: 'Project area',
    note: 'Note',
    loadingSchedules: 'Loading schedules...',
    selectSchedule: 'Select schedule',
    measurement: 'Measurement',
    loadingAreas: 'Loading areas...',
    selectArea: 'Select area',
    optionalNote: 'Optional measurement note',
    chooseImages: 'Choose measurement images',
    imagesReady: (n) => `${n} image(s) ready`,
    multiHint: 'You can choose multiple images at once, or add more before uploading.',
    uploading: 'Uploading...',
    uploadButton: 'Upload Images & Link',
    area: 'Area',
    allAreas: 'All areas',
    cannotLoadAreas: 'Cannot load project areas.',
    emptyTitle: 'No measurement images yet',
    emptyHint: 'Photos uploaded from mobile measurement sessions will appear here.',
    noUploadTime: 'No upload time',
    scheduleLabel: 'Schedule',
    areasLabel: 'Areas',
    unnamedArea: 'Unnamed area',
    measurementFile: 'Measurement file',
    fileId: (id) => `File ${id}`,
    removeFile: (name) => `Remove ${name}`,
    createAreaFirst: 'Create at least one project area before linking measurement images.',
    noConfirmedSchedule: 'No confirmed measurement schedule is available for this project.',
    invalidFileType: 'Measurement images must be JPG, PNG, or WebP files.',
    errSelectSchedule: 'Select a confirmed measurement schedule first.',
    errSelectArea: 'Select a project area so the image can be referenced correctly.',
    errSelectImages: 'Select at least one measurement image.',
    uploadPartial: (uploaded, total, failed) =>
      `${uploaded}/${total} image(s) uploaded, ${failed} failed. Please retry failed images.`,
    uploadSuccess: (count) => `${count} measurement image(s) uploaded and linked to area.`,
  },
  projectAreasTab: {
    title: 'Project Areas',
    intro: 'Define floors and areas for Room Planner scenes and measurement references.',
    addArea: 'Add Area',
    updateArea: 'Update Area',
    areaName: 'Area name',
    layoutMode: 'Layout mode',
    standardRect: 'Standard rectangle',
    specialLayout: 'Special layout',
    width: 'Width (m)',
    length: 'Length (m)',
    height: 'Height (m)',
    areaM2: 'Area (m2)',
    description: 'Description',
    currentCondition: 'Current condition',
    requirementNote: 'Requirement note',
    cancel: 'Cancel',
    saving: 'Saving...',
    update: 'Update',
    create: 'Create',
    loading: 'Loading project areas...',
    empty: 'No project areas have been created yet.',
    specialImages: 'Special layout images',
    uploadHint: 'Upload reference images for non-rectangular layouts.',
    retry: 'Retry upload',
    imageUploaded: 'Image uploaded',
    floor: (n) => `Floor ${n}`,
    floorArea: 'Floor area',
    special: 'Special',
    standard: 'Standard',
    areaDetails: 'Area details',
    updateBtn: 'Update area',
    specialLayoutImages: 'Special layout images',
    measurementImages: 'Measurement images',
    referenceImage: 'Reference image',
    errAreaName: 'Area name is required.',
    errFloor: 'Floor number is required.',
    errDimensions: 'Enter valid dimensions for this area.',
    errNoFloor: 'No available floor for this project.',
  },
  proposalsTab: {
    title: 'Proposals',
    loading: 'Loading proposals from backend...',
    count: (n) => `${n} proposal${n === 1 ? '' : 's'} for this project.`,
    setupButton: 'Set Up Room Planner Proposal',
    setupTooltip: 'Available once the project reaches Proposal Consulting.',
    moveToConsulting: 'Move to Proposal Consulting',
    cols: {
      proposal: 'Proposal',
      version: 'Version',
      status: 'Status',
      scenes: 'Scenes',
      published: 'Published',
      updated: 'Updated',
      action: 'Action',
    },
    loadingTable: 'Loading...',
    empty: 'No proposals have been created for this project yet.',
    emptyHint: 'Create a Room Planner proposal once project areas are ready.',
    openDetail: 'Open detail',
    publish: 'Publish to Customer',
    publishing: 'Publishing...',
    published: 'Published',
    notPublished: 'Not published',
    scenes: (n) => `${n} scene${n === 1 ? '' : 's'}`,
    revisionNote: 'Customer revision note',
    createModalTitle: 'Create Room Planner Proposal',
    name: 'Proposal name',
    description: 'Description',
    namePh: 'Enter proposal name',
    descPh: 'Enter proposal description',
    cancel: 'Cancel',
    creating: 'Creating...',
    createSubmit: 'Create Proposal & Scene',
    errNameRequired: 'Proposal name is required.',
    errDescRequired: 'Proposal description is required.',
    errNeedAreas:
      'Create at least one project area first. Each area will become a floor in the new room planner scene.',
    publishSuccess: (name) => `${name} was published successfully.`,
    createSuccess: (name, floors) =>
      `Created ${name} with a room planner scene across ${floors} floor${floors === 1 ? '' : 's'}.`,
  },
  customizationTab: {
    title: 'Customization',
    filterAll: 'All',
    filterSubmitted: 'Submitted',
    filterReviewing: 'Reviewing',
    filterAccepted: 'Accepted',
    filterCancelled: 'Cancelled',
    filterAria: 'Customization status filter',
    loading: 'Loading customization requests...',
    empty: 'No customization requests match the current filter.',
    emptyHint: 'Published proposal items can be turned into customer customization requests.',
    assistTitle: 'Designer Assisted Request',
    assistDesc: 'Create a customer customization request from a published proposal item.',
    publishedProposals: 'Published proposals',
    itemsLoaded: 'Proposal items loaded',
    createRequest: 'Create request',
    created: (date) => `Created ${date}`,
    versions: (n) => `${n} custom version${n === 1 ? '' : 's'}`,
    noNote: 'No note provided.',
    source: 'Source item',
    material: 'Material',
    color: 'Color',
    selectedRequest: 'Selected request',
    newVersion: 'New version',
    versionsLabel: 'Versions',
    noVersion: 'No version yet',
    cancelRequest: 'Cancel Request',
    versionPanel: 'Version panel',
    selectRequest: 'Select a customization request to view details.',
    modalAssistTitle: 'Designer Assisted Request',
    modalVersionCreate: 'Create Custom Version',
    modalVersionEdit: 'Edit Custom Version',
    modalCancelTitle: 'Cancel Customization Request',
    formTitle: 'Request title',
    formDescription: 'Request description',
    formMaterial: 'Requested material',
    formColor: 'Requested color',
    formChangeNote: 'Customer-facing change note',
    submit: 'Submit Customize Request',
    submitting: 'Submitting...',
    createDraft: 'Create Draft',
    updateDraft: 'Update Draft',
    saving: 'Saving...',
    cancelReasonPh: 'Explain why this request is being cancelled',
    cancelling: 'Cancelling...',
    successRequestCreated: 'Customization request created for the customer.',
    successVersionSaved: 'Customization version draft saved.',
    successVersionSubmitted: 'Customization version sent to production review.',
    successCancelled: 'Customization request cancelled.',
    errVersionName: 'Version name is required.',
    errCancelReason: 'Cancel reason is required.',
    errRequestFields: 'Select a proposal item, add a title, and provide at least one customization field.',
  },
  schedulesTab: {
    title: 'Schedules',
    subtitle: (code) => `${code} - project meetings and design review sessions.`,
    loading: 'Loading project schedules...',
    empty: 'No schedules have been created for this project yet.',
    completedSuccess: 'Schedule completed successfully.',
    when: 'When',
    location: 'Location',
    assignee: 'Assignee',
    notSpecified: 'Not specified',
    assignedToYou: 'Assigned to you',
    complete: 'Complete Schedule',
    completing: 'Completing...',
  },
  chatTab: {
    selectChat: 'Select chat',
    projectChat: 'Project Chat',
    sales: 'Sales',
    noChat: 'No Chat',
    loadingChat: 'Loading chats...',
    noThreads: 'No chat threads available for this project.',
    loadingMessages: 'Loading messages...',
    noMessages: 'No messages yet.',
    typeMessage: 'Type a message...',
    send: 'Send',
    sending: 'Sending...',
    attachment: 'Attachment',
    messageDeleted: 'Message deleted',
    unknown: 'Unknown',
  },
  proposalWorkspace: {
    backProjectDetail: 'Back to project detail',
    loadingProject: 'LOADING PROJECT',
    projectNotFound: 'PROJECT NOT FOUND',
    loadingProposal: 'Loading proposal...',
    proposalNotFound: 'Proposal not found',
    noProjectData: 'No project data from backend',
    version: (n) => `v${n}`,
    setup: 'SETUP',
    setupTitle: 'Set Up Project Areas & Proposal',
    updateInfo: 'Update Info',
    reopen: 'Reopen for Editing',
    reopening: 'Reopening...',
    publish: 'Publish Proposal',
    publishing: 'Publishing...',
    scenes: 'Scenes',
    chat: 'Chat',
    designerChat: 'Designer Chat with Customer',
    proposalInfo: 'Proposal Information',
    proposalScenes: 'Proposal Scenes',
    proposalScenesHint: 'One proposal maps to one Room Planner scene per area.',
    projectItems: 'Project Items',
    createProposalScene: 'Create Proposal & Scene',
    projectAreas: 'Project Areas',
    selectArea: 'Select a project area',
    untitledScene: 'Untitled Room Planner Scene',
    unnamedArea: 'Unnamed area',
    floors: 'Floors',
    noFloors:
      'No project areas exist for this project yet. Create project areas from Project Detail > Project Areas before creating proposal scenes.',
    openRoomPlanner: 'Open Room Planner',
    editScene: 'Edit scene',
    productVersion: 'Product version',
    material: 'Material',
    color: 'Color',
    quantity: 'Quantity',
    unitPrice: 'Unit price',
    subtotal: 'Subtotal',
    estimatedTotal: 'Estimated total',
    proposalItem: 'Proposal item',
    saveInfo: 'Save Info',
    saveScene: 'Save Scene',
    noAreaLinked: 'No area linked',
    confirmReopen:
      'This proposal will move back to Draft. The current quotation, if any, will be cancelled. After editing, publish the proposal again so the customer can select it and create a new quotation.',
    reopenForEditing: 'Reopen for Editing',
    publishProposal: 'Publish Proposal',
    updateProposalModalTitle: 'Update Proposal Info',
    updateProposalModalDesc: 'Edit the proposal name and description before publishing.',
    updateSceneModalTitle: 'Update Scene Info',
    updateSceneModalDesc: 'Update the scene name and link it to a project area.',
    proposalName: 'Proposal Name',
    sceneName: 'Scene Name',
    errPublish: 'Proposal must be editable and have at least one active scene before publishing.',
    errNameRequired: 'Proposal name is required.',
    errDescRequired: 'Proposal description is required.',
    errNeedAreas: 'Create at least one project area first. Each area becomes a floor in the room planner scene.',
    publishSuccess: 'Proposal published successfully. It is now ready for customer review.',
    proposalUpdated: 'Proposal information updated.',
    sceneUpdated: 'Scene information updated.',
    reopened:
      'Proposal reopened for editing. You can update scenes, items, and proposal information before publishing again.',
    loadingScenes: 'Loading proposal scenes from backend...',
    selectAreaFirst: 'Select a project area first.',
    noSceneForArea: 'No scene has been created for the selected project area in this proposal.',
    loadingItems: 'Loading proposal items from backend...',
    noItems:
      'No proposal items returned by backend. Open a scene, add catalog products, then Save Project to sync.',
    chatUnavailable: 'Project chat is unavailable until project data is loaded from backend.',
    noDescription: 'No description provided.',
    customerRevisionNote: 'Customer revision note',
    selected: (name) => `Selected: ${name}`,
    condition: 'Condition',
    requirement: 'Requirement',
    width: 'Width',
    length: 'Length',
    height: 'Height',
    floor: 'Floor',
    area: 'Area',
  },
};

const vi: DesignerCopy = {
  workspace: 'Thiết kế',
  openSidebar: 'Mở thanh bên thiết kế',
  collapseSidebar: 'Thu gọn thanh bên thiết kế',
  nav: {
    dashboard: 'Tổng quan',
    assignedProjects: 'Dự án được giao',
    productLibrary: 'Thư viện sản phẩm',
    schedules: 'Lịch của tôi',
  },
  navbar: {
    searchPlaceholder: 'Tìm tính năng thiết kế...',
    openUserMenu: 'Mở menu tài khoản',
    logout: 'Đăng xuất',
    loggingOut: 'Đang đăng xuất...',
    switchLang: 'Switch to English',
    designerUser: 'Thiết kế',
  },
  common: {
    refresh: 'Làm mới',
    refreshing: 'Đang làm mới...',
    search: 'Tìm kiếm',
    previous: 'Trước',
    next: 'Sau',
    page: 'Trang',
    rows: 'Số dòng',
    all: 'Tất cả',
    loading: 'Đang tải...',
    view: 'Xem',
    actions: 'Thao tác',
    status: 'Trạng thái',
    save: 'Lưu',
    saving: 'Đang lưu...',
    cancel: 'Hủy',
    create: 'Tạo',
    edit: 'Sửa',
    delete: 'Xóa',
    close: 'Đóng',
    clear: 'Xóa lọc',
    clearAll: 'Xóa tất cả',
    done: 'Xong',
    filters: 'Bộ lọc',
    filterProjects: 'Lọc dự án',
    closeFilters: 'Đóng bộ lọc',
    allStatus: 'Tất cả trạng thái',
    allBusinessTypes: 'Tất cả loại hình',
    businessType: 'Loại hình kinh doanh',
    customer: 'Khách hàng',
    project: 'Dự án',
    open: 'Mở',
    notSpecified: 'Chưa chỉ định',
    dash: '-',
    yes: 'Có',
    no: 'Không',
    priority: 'Ưu tiên',
    allPriorities: 'Tất cả mức ưu tiên',
    type: 'Loại',
    pageOf: (current, total) => `Trang ${current} / ${total}`,
    itemsCount: (n) => (n === 1 ? '1 mục' : `${n} mục`),
  },
  dashboard: {
    eyebrow: 'Không gian thiết kế',
    title: 'Bảng điều khiển thiết kế',
    subtitle: 'Dự án được giao, tiến độ thiết kế, Room Planner và tùy chỉnh sản phẩm',
    filtersAria: 'Bộ lọc bảng điều khiển thiết kế',
    dateRange: 'Khoảng thời gian',
    today: 'Hôm nay',
    thisWeek: 'Tuần này',
    thisMonth: 'Tháng này',
    projectFilter: 'Lọc dự án',
    filterAssigned: 'Dự án được giao cho tôi',
    filterOverdue: 'Quá hạn / có rủi ro',
    filterCustomization: 'Việc tùy chỉnh',
    primaryActionCustomization: 'Mở việc tùy chỉnh',
    primaryActionOverdue: 'Mở dự án có rủi ro',
    primaryActionAssigned: 'Mở dự án được giao',
    refreshAt: (time) => `Làm mới · ${time}`,
    kpiConfirmedLabel: 'Đo đạc đã xác nhận',
    kpiConfirmedNote: 'Tuần này',
    kpiConfirmedDescription: 'Lịch đo đạc đã xác nhận cần hoàn thành trong khoảng thời gian chọn',
    kpiConsultingLabel: 'Tư vấn đề xuất',
    kpiConsultingNote: 'Tuần này',
    kpiConsultingDescription: 'Dự án đang ở giai đoạn tư vấn đề xuất',
    kpiRevisionLabel: 'Yêu cầu chỉnh sửa',
    kpiRevisionNote: 'Tuần này',
    kpiRevisionDescription: 'Đề xuất có yêu cầu chỉnh sửa từ khách hàng đang chờ xử lý',
    kpiAssignedLabel: 'Yêu cầu tùy chỉnh',
    kpiAssignedNote: 'Tồn kho',
    kpiAssignedDescription: 'Dự án hiện được giao cho bạn, bao gồm yêu cầu tùy chỉnh của khách',
    panelWorkQueue: 'Hàng đợi thiết kế chính',
    panelConfirmed: 'Đo đạc đã xác nhận',
    panelConsulting: 'Tư vấn đề xuất',
    panelRevisions: 'Yêu cầu chỉnh sửa',
    panelAssigned: 'Dự án được giao',
    panelSubtitleWorkQueue: (range, filter) => `Ưu tiên trong ${range} · ${filter}.`,
    panelSubtitleConfirmed: (range) => `Lịch đo đạc đã xác nhận trong ${range}.`,
    panelSubtitleConsulting: (range) => `Dự án tư vấn đề xuất trong ${range}.`,
    panelSubtitleRevisions: (range) => `Đề xuất có yêu cầu chỉnh sửa trong ${range}.`,
    panelSubtitleAssigned: 'Dự án đang được giao cho bạn (số lượng tồn). Tùy chỉnh khách hiển thị theo từng dự án.',
    backToQueue: 'Về hàng đợi',
    openSchedules: 'Mở lịch hẹn',
    openProjects: 'Mở dự án',
    filterWorkQueue: 'Lọc hàng đợi',
    workQueueFiltersAria: 'Bộ lọc hàng đợi',
    workGroupsAria: 'Nhóm công việc thiết kế',
    priorityChip: (label) => `Ưu tiên: ${label}`,
    queueCols: {
      project: 'Dự án',
      phase: 'Giai đoạn',
      warning: 'Cảnh báo',
      priority: 'Ưu tiên',
      action: 'Hành động',
      due: 'Hạn',
      status: 'Trạng thái',
    },
    measurementsCols: {
      project: 'Dự án',
      title: 'Tiêu đề',
      start: 'Bắt đầu',
      location: 'Địa điểm',
      assignee: 'Phụ trách',
      status: 'Trạng thái',
    },
    consultingCols: {
      project: 'Dự án',
      customer: 'Khách hàng',
      designer: 'Thiết kế',
      assigned: 'Ngày giao',
      updated: 'Cập nhật',
      status: 'Trạng thái',
    },
    revisionsCols: {
      proposal: 'Đề xuất',
      project: 'Dự án',
      note: 'Ghi chú',
      requested: 'Yêu cầu',
      designer: 'Thiết kế',
      status: 'Trạng thái',
    },
    assignedCols: {
      project: 'Dự án',
      customer: 'Khách hàng',
      assigned: 'Ngày giao',
      customization: 'Tùy chỉnh',
      customStatus: 'Trạng thái tùy chỉnh',
      status: 'Trạng thái',
    },
    tabConfirmed: 'Đã xác nhận',
    tabConsulting: 'Tư vấn đề xuất',
    tabRevisions: 'Yêu cầu chỉnh sửa',
    tabAssigned: 'Được giao',
    loadingQueue: 'Đang tải hàng đợi thiết kế...',
    loadingConfirmed: 'Đang tải lịch đo đạc đã xác nhận...',
    loadingConsulting: 'Đang tải dự án tư vấn đề xuất...',
    loadingRevisions: 'Đang tải yêu cầu chỉnh sửa...',
    loadingAssigned: 'Đang tải dự án được giao...',
    emptyConfirmed: (range) => `Không có lịch đo đạc đã xác nhận trong ${range}.`,
    emptyConsulting: (range) => `Không có dự án tư vấn đề xuất trong ${range}.`,
    emptyRevisions: (range) => `Không có yêu cầu chỉnh sửa trong ${range}.`,
    emptyAssigned: 'Hiện không có dự án được giao cho bạn.',
    emptyQueueFiltered: (range, filter) => `Không có hạng mục phù hợp ${range} · ${filter}.`,
    emptyQueueDefault: 'Không có hạng mục trong giai đoạn này.',
    openProject: 'Mở dự án',
    openProposal: 'Mở đề xuất',
    untitledProposal: 'Đề xuất chưa có tên',
    customizationYes: 'Có',
    customizationNo: 'Không',
    customizationYesOpen: (count) => `Có · ${count} đang mở`,
    pagerZeroItems: '0 mục',
    pagerSummary: (page, totalPages, totalItems) => `Trang ${page} / ${totalPages} · ${totalItems} mục`,
    previousPageAria: 'Trang trước',
    nextPageAria: 'Trang sau',
    openProjectAria: (code) => `Mở ${code}`,
    openProposalAria: (name) => `Mở đề xuất ${name}`,
  },
  assignedProjects: {
    title: 'Dự án được giao',
    subtitleLoading: 'Đang tải dự án được giao cho bạn...',
    subtitleCount: (f, t) => `${f} / ${t} dự án được giao`,
    searchPlaceholder: 'Tìm dự án, khách hàng...',
    filtersLabel: 'Bộ lọc:',
    filterProjects: 'Lọc dự án',
    projectFiltersAria: 'Bộ lọc dự án',
    closeFilters: 'Đóng bộ lọc',
    status: 'Trạng thái',
    businessType: 'Loại hình',
    countOfProjects: (f, t) => `${f} / ${t} dự án`,
    statusChip: (label) => `Trạng thái: ${label}`,
    typeChip: (type) => `Loại: ${type}`,
    clearAll: 'Xóa tất cả',
    cols: {
      project: 'Dự án',
      customer: 'Khách hàng',
      type: 'Loại',
      submitted: 'Ngày gửi',
      status: 'Trạng thái',
      sales: 'Sale',
      action: 'Thao tác',
    },
    loading: 'Đang tải dự án được giao...',
    loadingCustomer: 'Đang tải khách hàng...',
    loadingSales: 'Đang tải sale...',
    viewProject: 'Xem dự án',
    empty: 'Không có dự án phù hợp bộ lọc hiện tại.',
  },
  productLibrary: {
    back: 'Về thư viện sản phẩm',
    title: 'Thư viện sản phẩm',
    subtitleBrowse: (visible, total) => `${visible} / ${total} sản phẩm · Duyệt phiên bản và mô hình 3D`,
    subtitleLoading: 'Đang tải sản phẩm từ danh mục...',
    subtitleVersions: (n) => `${n} phiên bản · Chọn phiên bản và mô hình cho đề xuất`,
    searchPlaceholder: 'Tìm sản phẩm, vật liệu, mã...',
    versionType: 'Loại phiên bản',
    businessType: 'Loại hình',
    allBusinessTypes: 'Tất cả loại hình',
    versionsCount: (n) => `${n} phiên bản`,
    filterAllTypes: 'Tất cả loại',
    filterDefault: 'Mặc định',
    filterPublic: 'Công khai',
    filterProjectSpecific: 'Theo dự án',
    filterPlannerReady: 'Sẵn sàng Planner',
    empty: 'Không có sản phẩm phù hợp bộ lọc hiện tại.',
    paginationAria: 'Phân trang thư viện sản phẩm',
    rowsPerPage: 'Số dòng',
    pageLabel: 'Trang',
    productsCount: (n) => `${n} sản phẩm`,
    modelsReady: 'Đã có mô hình 3D',
    productVersions: 'Phiên bản sản phẩm',
    noDescription: 'Chưa có mô tả.',
    versionCount: (n) => `${n} phiên bản`,
    viewVersions: 'Xem phiên bản',
    loadingVersions: 'Đang tải phiên bản sản phẩm...',
    noVersions: 'Không tìm thấy phiên bản sản phẩm.',
    modelReady: 'Đã có mô hình 3D',
    noModel: 'Chưa có mô hình 3D',
    previewHint: 'Kéo để xoay, cuộn để phóng to.',
    noModelFile: 'Phiên bản này chưa có tệp MODEL_3D.',
    closePreview: 'Đóng xem trước mô hình 3D',
    material: 'Vật liệu',
    color: 'Màu',
    size: 'Kích thước',
    estimatedPrice: 'Giá ước tính',
    ready3d: 'Sẵn sàng 3D',
    no3d: 'Chưa có 3D',
    assets3d: 'Tài nguyên 3D',
    badgeDefault: 'Mặc định',
    badgePublic: 'Công khai',
    badgeProject: 'Dự án',
  },
  createProductVersion: {
    back: 'Về thư viện sản phẩm',
    title: 'Tạo phiên bản sản phẩm',
    loadingProduct: 'Đang tải sản phẩm từ danh mục...',
    subtitle: (name) => `Thêm phiên bản do thiết kế tạo cho ${name}`,
    loadingParent: 'Đang tải sản phẩm gốc...',
    adminNote: 'Phiên bản này do thiết kế tạo và liên kết với sản phẩm gốc trong danh mục.',
    parentProduct: 'Sản phẩm gốc',
    product: 'Sản phẩm',
    category: 'Danh mục',
    businessType: 'Loại hình',
    notAssigned: 'Chưa gán',
    code: 'Mã',
    versionInformation: 'Thông tin phiên bản',
    versionCode: 'Mã phiên bản',
    versionName: 'Tên phiên bản',
    versionType: 'Loại phiên bản',
    material: 'Vật liệu',
    color: 'Màu',
    estimatedPrice: 'Giá ước tính',
    placeholderVersionName: 'vd: Biến thể bố trí của thiết kế',
    placeholderMaterial: 'vd: Gỗ sồi',
    placeholderColor: 'vd: Tự nhiên',
    placeholderPrice: '0',
    dimensions: 'Kích thước',
    width: 'Rộng',
    height: 'Cao',
    depth: 'Sâu',
    settings: 'Cài đặt',
    projectSpecific: 'Phiên bản theo dự án',
    projectSpecificHint: 'Đánh dấu phiên bản chỉ dùng cho một dự án khách hàng.',
    cancel: 'Hủy',
    saving: 'Đang lưu...',
    createVersion: 'Tạo phiên bản',
  },
  schedules: {
    title: 'Lịch của tôi',
    legendAria: 'Chú giải trạng thái lịch hẹn',
    monthlyOverview: 'Tổng quan tháng',
    prevMonth: 'Tháng trước',
    nextMonth: 'Tháng sau',
    weekdays: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
    scheduleCount: (n) => (n === 1 ? '1 lịch hẹn' : `${n} lịch hẹn`),
    noSchedule: 'Không có lịch',
    showLess: 'Thu gọn',
    more: (n) => `+${n} lịch khác`,
    emptyTitle: 'Chưa chọn lịch hẹn',
    emptyHint: 'Chọn một lịch trên lịch để xem chi tiết.',
    start: 'Bắt đầu',
    end: 'Kết thúc',
    location: 'Địa điểm',
    assignment: 'Phân công',
    assignedToYou: 'Giao cho bạn',
    details: 'Chi tiết',
    noDetails: 'Chưa có thông tin chi tiết cho lịch hẹn này.',
    notSpecified: 'Chưa chỉ định',
    completing: 'Đang hoàn thành...',
    completeSchedule: 'Hoàn thành lịch hẹn',
    openProject: 'Mở dự án',
    completedSuccess: 'Đã hoàn thành lịch hẹn.',
    completeNote: 'Thiết kế đã đánh dấu lịch hẹn là hoàn thành.',
  },
  projectDetail: {
    back: 'Về dự án được giao',
    loading: 'Đang tải chi tiết dự án...',
    tabs: {
      overview: 'Tổng quan',
      spaceFiles: 'Tệp không gian',
      measurementImages: 'Ảnh đo đạc',
      projectAreas: 'Khu vực dự án',
      proposals: 'Đề xuất',
      customization: 'Tùy chỉnh',
      schedules: 'Lịch hẹn',
      chat: 'Chat',
    },
    tabsAria: 'Các mục chi tiết dự án thiết kế',
    placeholder: 'Phần này dành cho bước quy trình thiết kế tiếp theo.',
    loadingCustomer: 'Đang tải khách hàng...',
    noTargetDate: 'Chưa có ngày mục tiêu',
    sales: (name) => `Sale: ${name}`,
    saleDeadline: (date) => `Hạn sale: ${date}`,
    sqm: (type, area) => `${type} - ${area} m²`,
    currentStatus: 'Trạng thái hiện tại',
    updating: 'Đang cập nhật...',
    markSpaceVerified: 'Xác nhận không gian',
    startProposalConsulting: 'Bắt đầu tư vấn đề xuất',
    readyForProposals: 'Sẵn sàng cho đề xuất',
    noDesignerStep: 'Không có bước thiết kế',
    updateTo: (status) => `Đã cập nhật trạng thái dự án thành ${status}.`,
    spaceVerifyBlock: 'Vui lòng hoàn thành tất cả lịch hẹn của dự án trước khi xác nhận không gian.',
    statusUpdated: (status) => `Đã cập nhật trạng thái dự án thành ${status}.`,
  },
  overviewTab: {
    projectInformation: 'Thông tin dự án',
    projectCode: 'Mã dự án',
    businessType: 'Loại hình kinh doanh',
    address: 'Địa chỉ',
    floors: 'Số tầng',
    totalArea: 'Tổng diện tích',
    budget: 'Ngân sách',
    targetDate: 'Ngày mục tiêu',
    status: 'Trạng thái',
    designTimeline: 'Tiến độ thiết kế',
    noDeadline: 'Chưa có hạn thiết kế được lên kế hoạch.',
    customerRequirements: 'Yêu cầu khách hàng',
    furnitureRequirement: 'Yêu cầu nội thất',
    businessPurpose: 'Mục đích kinh doanh',
    description: 'Mô tả',
    emptyRequirements: 'Chưa có yêu cầu bổ sung từ khách hàng.',
    sqm: (v) => `${v} m²`,
  },
  spaceFilesTab: {
    title: 'Tệp không gian',
    loading: 'Đang tải tệp dự án...',
    count: (n, code) => `${n} tệp cho ${code}`,
    error: 'Không tải được tệp dự án. Vui lòng kiểm tra quyền truy cập.',
    empty: 'Chưa có tệp cho dự án này.',
    projectFile: 'Tệp dự án',
    preview: (name) => `Xem trước ${name}`,
    download: (name) => `Tải ${name}`,
  },
  measurementImagesTab: {
    title: 'Ảnh đo đạc',
    intro: 'Ảnh từ lịch đo đạc được đồng bộ từ mobile và liên kết với khu vực dự án.',
    uploadTitle: 'Tải ảnh đo đạc',
    uploadDesc: 'Tải ảnh lên lịch đo đạc đã xác nhận và liên kết với khu vực đo.',
    measurementSchedule: 'Lịch đo đạc',
    projectArea: 'Khu vực dự án',
    note: 'Ghi chú',
    loadingSchedules: 'Đang tải lịch...',
    selectSchedule: 'Chọn lịch',
    measurement: 'Đo đạc',
    loadingAreas: 'Đang tải khu vực...',
    selectArea: 'Chọn khu vực',
    optionalNote: 'Ghi chú đo đạc (tùy chọn)',
    chooseImages: 'Chọn ảnh đo đạc',
    imagesReady: (n) => `Đã chọn ${n} ảnh`,
    multiHint: 'Có thể chọn nhiều ảnh hoặc thêm trước khi tải lên.',
    uploading: 'Đang tải lên...',
    uploadButton: 'Tải ảnh & liên kết',
    area: 'Khu vực',
    allAreas: 'Tất cả khu vực',
    cannotLoadAreas: 'Không tải được khu vực dự án.',
    emptyTitle: 'Chưa có ảnh đo đạc',
    emptyHint: 'Ảnh tải từ phiên đo trên mobile sẽ hiển thị tại đây.',
    noUploadTime: 'Chưa có thời gian tải',
    scheduleLabel: 'Lịch',
    areasLabel: 'Khu vực',
    unnamedArea: 'Khu vực chưa đặt tên',
    measurementFile: 'Tệp đo đạc',
    fileId: (id) => `Tệp ${id}`,
    removeFile: (name) => `Xóa ${name}`,
    createAreaFirst: 'Tạo ít nhất một khu vực dự án trước khi liên kết ảnh đo.',
    noConfirmedSchedule: 'Chưa có lịch đo đạc đã xác nhận cho dự án này.',
    invalidFileType: 'Ảnh đo đạc phải là JPG, PNG hoặc WebP.',
    errSelectSchedule: 'Chọn lịch đo đạc đã xác nhận trước.',
    errSelectArea: 'Chọn khu vực dự án để liên kết ảnh đúng cách.',
    errSelectImages: 'Chọn ít nhất một ảnh đo đạc.',
    uploadPartial: (uploaded, total, failed) =>
      `Đã tải ${uploaded}/${total} ảnh, ${failed} lỗi. Vui lòng thử lại ảnh lỗi.`,
    uploadSuccess: (count) => `Đã tải ${count} ảnh đo và liên kết khu vực.`,
  },
  projectAreasTab: {
    title: 'Khu vực dự án',
    intro: 'Khai báo tầng và khu vực cho Room Planner và tham chiếu đo đạc.',
    addArea: 'Thêm khu vực',
    updateArea: 'Cập nhật khu vực',
    areaName: 'Tên khu vực',
    layoutMode: 'Kiểu bố trí',
    standardRect: 'Hình chữ nhật chuẩn',
    specialLayout: 'Bố trí đặc biệt',
    width: 'Rộng (m)',
    length: 'Dài (m)',
    height: 'Cao (m)',
    areaM2: 'Diện tích (m²)',
    description: 'Mô tả',
    currentCondition: 'Hiện trạng',
    requirementNote: 'Ghi chú yêu cầu',
    cancel: 'Hủy',
    saving: 'Đang lưu...',
    update: 'Cập nhật',
    create: 'Tạo',
    loading: 'Đang tải khu vực dự án...',
    empty: 'Chưa có khu vực dự án.',
    specialImages: 'Ảnh bố trí đặc biệt',
    uploadHint: 'Tải ảnh tham chiếu cho bố trí không chuẩn.',
    retry: 'Thử tải lại',
    imageUploaded: 'Đã tải ảnh',
    floor: (n) => `Tầng ${n}`,
    floorArea: 'Diện tích tầng',
    special: 'Đặc biệt',
    standard: 'Chuẩn',
    areaDetails: 'Chi tiết khu vực',
    updateBtn: 'Cập nhật khu vực',
    specialLayoutImages: 'Ảnh bố trí đặc biệt',
    measurementImages: 'Ảnh đo đạc',
    referenceImage: 'Ảnh tham chiếu',
    errAreaName: 'Tên khu vực là bắt buộc.',
    errFloor: 'Số tầng là bắt buộc.',
    errDimensions: 'Nhập kích thước hợp lệ cho khu vực.',
    errNoFloor: 'Không còn tầng trống cho dự án này.',
  },
  proposalsTab: {
    title: 'Đề xuất',
    loading: 'Đang tải đề xuất...',
    count: (n) => `${n} đề xuất cho dự án này.`,
    setupButton: 'Thiết lập đề xuất Room Planner',
    setupTooltip: 'Khả dụng khi dự án đạt giai đoạn tư vấn đề xuất.',
    moveToConsulting: 'Chuyển sang tư vấn đề xuất',
    cols: {
      proposal: 'Đề xuất',
      version: 'Phiên bản',
      status: 'Trạng thái',
      scenes: 'Scene',
      published: 'Đã xuất bản',
      updated: 'Cập nhật',
      action: 'Thao tác',
    },
    loadingTable: 'Đang tải...',
    empty: 'Chưa có đề xuất cho dự án này.',
    emptyHint: 'Tạo đề xuất Room Planner sau khi đã có khu vực dự án.',
    openDetail: 'Xem chi tiết',
    publish: 'Xuất bản cho khách',
    publishing: 'Đang xuất bản...',
    published: 'Đã xuất bản',
    notPublished: 'Chưa xuất bản',
    scenes: (n) => `${n} scene`,
    revisionNote: 'Ghi chú chỉnh sửa của khách',
    createModalTitle: 'Tạo đề xuất Room Planner',
    name: 'Tên đề xuất',
    description: 'Mô tả',
    namePh: 'Nhập tên đề xuất',
    descPh: 'Nhập mô tả đề xuất',
    cancel: 'Hủy',
    creating: 'Đang tạo...',
    createSubmit: 'Tạo đề xuất & scene',
    errNameRequired: 'Tên đề xuất là bắt buộc.',
    errDescRequired: 'Mô tả đề xuất là bắt buộc.',
    errNeedAreas: 'Tạo ít nhất một khu vực dự án. Mỗi khu vực sẽ là một tầng trong scene Room Planner.',
    publishSuccess: (name) => `Đã xuất bản ${name}.`,
    createSuccess: (name, floors) => `Đã tạo ${name} với scene Room Planner trên ${floors} tầng.`,
  },
  customizationTab: {
    title: 'Tùy chỉnh',
    filterAll: 'Tất cả',
    filterSubmitted: 'Đã gửi',
    filterReviewing: 'Đang xem xét',
    filterAccepted: 'Đã chấp nhận',
    filterCancelled: 'Đã hủy',
    filterAria: 'Lọc trạng thái tùy chỉnh',
    loading: 'Đang tải yêu cầu tùy chỉnh...',
    empty: 'Không có yêu cầu phù hợp bộ lọc.',
    emptyHint: 'Hạng mục đề xuất đã xuất bản có thể chuyển thành yêu cầu tùy chỉnh.',
    assistTitle: 'Yêu cầu hỗ trợ của thiết kế',
    assistDesc: 'Tạo yêu cầu tùy chỉnh cho khách từ hạng mục đề xuất đã xuất bản.',
    publishedProposals: 'Đề xuất đã xuất bản',
    itemsLoaded: 'Đã tải hạng mục đề xuất',
    createRequest: 'Tạo yêu cầu',
    created: (date) => `Tạo ${date}`,
    versions: (n) => `${n} phiên bản tùy chỉnh`,
    noNote: 'Chưa có ghi chú.',
    source: 'Hạng mục nguồn',
    material: 'Vật liệu',
    color: 'Màu',
    selectedRequest: 'Yêu cầu đang chọn',
    newVersion: 'Phiên bản mới',
    versionsLabel: 'Phiên bản',
    noVersion: 'Chưa có phiên bản',
    cancelRequest: 'Hủy yêu cầu',
    versionPanel: 'Bảng phiên bản',
    selectRequest: 'Chọn yêu cầu tùy chỉnh để xem chi tiết.',
    modalAssistTitle: 'Yêu cầu hỗ trợ của thiết kế',
    modalVersionCreate: 'Tạo phiên bản tùy chỉnh',
    modalVersionEdit: 'Sửa phiên bản tùy chỉnh',
    modalCancelTitle: 'Hủy yêu cầu tùy chỉnh',
    formTitle: 'Tiêu đề yêu cầu',
    formDescription: 'Mô tả yêu cầu',
    formMaterial: 'Vật liệu yêu cầu',
    formColor: 'Màu yêu cầu',
    formChangeNote: 'Ghi chú thay đổi cho khách',
    submit: 'Gửi yêu cầu tùy chỉnh',
    submitting: 'Đang gửi...',
    createDraft: 'Tạo bản nháp',
    updateDraft: 'Cập nhật bản nháp',
    saving: 'Đang lưu...',
    cancelReasonPh: 'Giải thích lý do hủy yêu cầu',
    cancelling: 'Đang hủy...',
    successRequestCreated: 'Đã tạo yêu cầu tùy chỉnh cho khách.',
    successVersionSaved: 'Đã lưu bản nháp phiên bản tùy chỉnh.',
    successVersionSubmitted: 'Đã gửi phiên bản tùy chỉnh để sản xuất xem xét.',
    successCancelled: 'Đã hủy yêu cầu tùy chỉnh.',
    errVersionName: 'Tên phiên bản là bắt buộc.',
    errCancelReason: 'Lý do hủy là bắt buộc.',
    errRequestFields: 'Chọn hạng mục đề xuất, nhập tiêu đề và ít nhất một trường tùy chỉnh.',
  },
  schedulesTab: {
    title: 'Lịch hẹn',
    subtitle: (code) => `${code} · họp dự án và buổi review thiết kế.`,
    loading: 'Đang tải lịch dự án...',
    empty: 'Chưa có lịch hẹn cho dự án này.',
    completedSuccess: 'Đã hoàn thành lịch hẹn.',
    when: 'Thời gian',
    location: 'Địa điểm',
    assignee: 'Phụ trách',
    notSpecified: 'Chưa chỉ định',
    assignedToYou: 'Giao cho bạn',
    complete: 'Hoàn thành lịch hẹn',
    completing: 'Đang hoàn thành...',
  },
  chatTab: {
    selectChat: 'Chọn cuộc chat',
    projectChat: 'Chat dự án',
    sales: 'Sale',
    noChat: 'Chưa có chat',
    loadingChat: 'Đang tải chat...',
    noThreads: 'Chưa có cuộc trò chuyện cho dự án này.',
    loadingMessages: 'Đang tải tin nhắn...',
    noMessages: 'Chưa có tin nhắn.',
    typeMessage: 'Nhập tin nhắn...',
    send: 'Gửi',
    sending: 'Đang gửi...',
    attachment: 'Tệp đính kèm',
    messageDeleted: 'Tin nhắn đã xóa',
    unknown: 'Không rõ',
  },
  proposalWorkspace: {
    backProjectDetail: 'Về chi tiết dự án',
    loadingProject: 'ĐANG TẢI DỰ ÁN',
    projectNotFound: 'KHÔNG TÌM THẤY DỰ ÁN',
    loadingProposal: 'Đang tải đề xuất...',
    proposalNotFound: 'Không tìm thấy đề xuất',
    noProjectData: 'Chưa có dữ liệu dự án từ máy chủ',
    version: (n) => `v${n}`,
    setup: 'THIẾT LẬP',
    setupTitle: 'Thiết lập khu vực & đề xuất',
    updateInfo: 'Cập nhật thông tin',
    reopen: 'Mở lại để chỉnh sửa',
    reopening: 'Đang mở lại...',
    publish: 'Xuất bản đề xuất',
    publishing: 'Đang xuất bản...',
    scenes: 'Scene',
    chat: 'Chat',
    designerChat: 'Chat thiết kế với khách',
    proposalInfo: 'Thông tin đề xuất',
    proposalScenes: 'Scene đề xuất',
    proposalScenesHint: 'Một đề xuất gắn một scene Room Planner cho mỗi khu vực.',
    projectItems: 'Hạng mục dự án',
    createProposalScene: 'Tạo đề xuất & scene',
    projectAreas: 'Khu vực dự án',
    selectArea: 'Chọn khu vực dự án',
    untitledScene: 'Scene Room Planner chưa đặt tên',
    unnamedArea: 'Khu vực chưa đặt tên',
    floors: 'Tầng',
    noFloors: 'Chưa có khu vực dự án. Tạo tại Chi tiết dự án > Khu vực dự án trước khi tạo scene.',
    openRoomPlanner: 'Mở Room Planner',
    editScene: 'Sửa scene',
    productVersion: 'Phiên bản sản phẩm',
    material: 'Vật liệu',
    color: 'Màu',
    quantity: 'Số lượng',
    unitPrice: 'Đơn giá',
    subtotal: 'Tạm tính',
    estimatedTotal: 'Tổng ước tính',
    proposalItem: 'Hạng mục đề xuất',
    saveInfo: 'Lưu thông tin',
    saveScene: 'Lưu scene',
    noAreaLinked: 'Chưa liên kết khu vực',
    confirmReopen:
      'Đề xuất sẽ chuyển về Nháp. Báo giá hiện tại (nếu có) sẽ bị hủy. Sau khi sửa, xuất bản lại để khách chọn và tạo báo giá mới.',
    reopenForEditing: 'Mở lại để chỉnh sửa',
    publishProposal: 'Xuất bản đề xuất',
    updateProposalModalTitle: 'Cập nhật thông tin đề xuất',
    updateProposalModalDesc: 'Sửa tên và mô tả đề xuất trước khi xuất bản.',
    updateSceneModalTitle: 'Cập nhật thông tin scene',
    updateSceneModalDesc: 'Cập nhật tên scene và liên kết khu vực dự án.',
    proposalName: 'Tên đề xuất',
    sceneName: 'Tên scene',
    errPublish: 'Đề xuất phải có thể sửa và có ít nhất một scene hoạt động trước khi xuất bản.',
    errNameRequired: 'Tên đề xuất là bắt buộc.',
    errDescRequired: 'Mô tả đề xuất là bắt buộc.',
    errNeedAreas: 'Tạo ít nhất một khu vực dự án. Mỗi khu vực là một tầng trong scene.',
    publishSuccess: 'Đã xuất bản đề xuất. Khách có thể xem và đánh giá.',
    proposalUpdated: 'Đã cập nhật thông tin đề xuất.',
    sceneUpdated: 'Đã cập nhật thông tin scene.',
    reopened: 'Đã mở lại đề xuất để chỉnh sửa. Cập nhật scene, hạng mục và thông tin trước khi xuất bản lại.',
    loadingScenes: 'Đang tải scene đề xuất...',
    selectAreaFirst: 'Chọn khu vực dự án trước.',
    noSceneForArea: 'Chưa có scene cho khu vực đã chọn trong đề xuất này.',
    loadingItems: 'Đang tải hạng mục đề xuất...',
    noItems: 'Chưa có hạng mục. Mở scene, thêm sản phẩm danh mục rồi Lưu dự án để đồng bộ.',
    chatUnavailable: 'Chat dự án khả dụng sau khi tải dữ liệu dự án.',
    noDescription: 'Chưa có mô tả.',
    customerRevisionNote: 'Ghi chú chỉnh sửa của khách',
    selected: (name) => `Đã chọn: ${name}`,
    condition: 'Hiện trạng',
    requirement: 'Yêu cầu',
    width: 'Rộng',
    length: 'Dài',
    height: 'Cao',
    floor: 'Tầng',
    area: 'Diện tích',
  },
};

export const designerCopy: Record<Lang, DesignerCopy> = {
  en,
  vi,
};
