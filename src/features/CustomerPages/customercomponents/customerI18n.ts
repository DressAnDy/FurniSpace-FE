import type { Lang } from '@/app/providers/useLang';

export type CustomerNavKey =
  | 'home'
  | 'myProjects'
  | 'tracking'
  | 'quotations'
  | 'orders'
  | 'schedules'
  | 'projectChat';

type CustomerCopy = {
  openSidebar: string;
  collapseSidebar: string;
  navAria: string;
  createProjectRequest: string;
  switchLang: string;
  nav: Record<CustomerNavKey, string>;
  common: {
    loading: string;
    previous: string;
    next: string;
    cancel: string;
    close: string;
    save: string;
    send: string;
    confirm: string;
    confirming: string;
    search: string;
    all: string;
    status: string;
    actions: string;
    view: string;
    open: string;
    project: string;
    projectName: string;
    businessType: string;
    notSpecified: string;
    customer: string;
    version: string;
    published: string;
    from: (value: string) => string;
    upTo: (value: string) => string;
  };
  status: {
    SUBMITTED: string;
    NEED_BASIC_INFORMATION: string;
    IN_CONSULTATION: string;
    WAITING_FOR_DESIGNER_ASSIGNMENT: string;
    MEASUREMENT_REQUIRED: string;
    SPACE_VERIFIED: string;
    PROPOSAL_CONSULTING: string;
    PROPOSAL_SELECTED: string;
    QUOTATION_SENT: string;
    QUOTATION_REVISION_REQUESTED: string;
    ORDER_CONFIRMED: string;
    IN_PRODUCTION: string;
    READY_FOR_DELIVERY: string;
    DELIVERING: string;
    AWAITING_CUSTOMER_CONFIRMATION: string;
    DELIVERED: string;
    COMPLETED: string;
    REJECTED: string;
  };
  journey: {
    requestSubmitted: string;
    consultation: string;
    designerAssignment: string;
    spaceVerification: string;
    spaceVerified: string;
    proposalConsulting: string;
    quotation: string;
    orderConfirmed: string;
    production: string;
    delivery: string;
    completed: string;
    rejected: string;
  };
  paymentType: {
    PROJECT_START_FEE: string;
    DEPOSIT: string;
    REMAINING_PAYMENT: string;
  };
  paymentStatus: {
    PENDING: string;
    PROCESSING: string;
    PAID: string;
    CANCELLED: string;
    EXPIRED: string;
    REFUNDED: string;
  };
  dashboard: {
    welcomeBack: (name: string) => string;
    journeyInProgress: string;
    startRequestHint: string;
    loadingActiveProject: string;
    noActiveProjectTitle: string;
    noActiveProjectDesc: string;
    createProject: string;
    yourActiveProject: string;
    trackProgress: string;
    trackProject: string;
    openProject: string;
    budgetRange: string;
    availableInDetail: string;
    projectJourney: string;
    pendingYourReview: string;
    viewAll: string;
    loadingProposals: string;
    cannotLoadProposals: string;
    noPendingProposals: string;
    review: string;
    projectSchedule: string;
    scheduleIntro: string;
    createProjectForSchedules: string;
    loadingSchedules: string;
    noUpcomingSchedules: string;
    scheduleShared: string;
    scheduleConfirmed: string;
    confirmedByCustomer: string;
    needHelp: string;
    needHelpDesc: string;
    contactYourTeam: string;
    viewHelpCenter: string;
    actionAddInfoTitle: string;
    actionAddInfoDesc: string;
    updateInfo: string;
    actionReviewProposalsTitle: string;
    actionReviewProposalsDesc: string;
    reviewNow: string;
    actionReviewQuotationTitle: string;
    actionReviewQuotationDesc: string;
    viewQuotation: string;
    actionConfirmDeliveryTitle: string;
    actionConfirmDeliveryDesc: string;
    confirmDelivery: string;
    projectCompletedTitle: string;
    projectCompletedDesc: string;
  };
  projects: {
    title: string;
    searchPlaceholder: string;
    allStatuses: string;
    submitted: string;
    currentStage: string;
    payStartFee: string;
    updateInformation: string;
    openProject: string;
    chat: string;
    showing: (from: number, to: number, total: number) => string;
    loading: string;
    empty: string;
    loadError: string;
    startFeeTitle: string;
    startFeePaid: string;
    backToProjects: string;
  };
  projectDetail: {
    overview: string;
    updateInformation: string;
    tabOverview: string;
    tabSchedules: string;
    tabProposals: string;
    submitted: string;
    address: string;
    currentStage: string;
    area: string;
    floors: string;
    minBudget: string;
    maxBudget: string;
    requirements: string;
    projectTimeline: string;
    measurementImages: string;
    orders: string;
    deliveryTracking: string;
    designProposals: string;
    reopenProposal: string;
    noProposals: string;
    loadingProposals: string;
    projectSchedules: string;
    pendingUpcoming: (count: number) => string;
    requestChange: string;
    responseNotePlaceholder: string;
    trackingLink: string;
    reopenedToast: string;
    scheduleConfirmedToast: string;
    scheduleCancelledToast: string;
    changeRequestSentToast: string;
  };
  proposalAccordion: {
    proposalScenes: string;
    openScene: string;
    noScenes: string;
    loadingScenes: string;
    itemName: string;
    version: string;
    dimensions: string;
    material: string;
    qty: string;
    unitPrice: string;
    total: string;
    actions: string;
    customize: string;
    totalEstimated: string;
    requestCustomization: string;
    titlePlaceholder: string;
    materialPlaceholder: string;
    colorPlaceholder: string;
    widthPlaceholder: string;
    heightPlaceholder: string;
    depthPlaceholder: string;
    submitRequest: string;
    requestRevision: string;
    sendRevisionRequest: string;
    revisionPlaceholder: string;
    customVersions: string;
    acceptCustomVersion: string;
    feasibilityPending: string;
    accepted: string;
    feasible: string;
    notFeasible: string;
    productionReview: string;
    noPreview: string;
    previewModel: string;
    titleRequiredToast: string;
    revisionRequiredToast: string;
  };
  projectRequest: {
    createTitle: string;
    updateTitle: string;
    basicInformation: string;
    spaceDetails: string;
    budgetTimeline: string;
    projectFiles: string;
    projectName: string;
    businessType: string;
    businessPurpose: string;
    address: string;
    furnitureRequirement: string;
    description: string;
    totalArea: string;
    floors: string;
    minBudget: string;
    maxBudget: string;
    targetCompletionDate: string;
    uploadHint: string;
    uploadTypes: string;
    submitRequest: string;
    submitting: string;
    submitUpdated: string;
    loading: string;
    notEditable: string;
    filesReady: (count: number) => string;
    dropFiles: string;
    missingProjectId: string;
    cafe: string;
    retail: string;
    office: string;
    restaurant: string;
    showroom: string;
  };
  tracking: {
    title: string;
    projects: string;
    found: (count: number) => string;
    searchProject: string;
    noActiveOrder: string;
    noProjectSelected: string;
    projectCode: string;
    progress: string;
    nextDelivery: string;
    confirmFinalDelivery: string;
    orderedQty: string;
    deliveredQty: string;
    completedTrips: string;
    remainingQty: string;
    deliveryItems: string;
    deliveryTimeline: string;
    contactTeam: string;
    waiting: string;
    partial: string;
    delivered: string;
    unavailable: string;
    cancelled: string;
    ordered: string;
    deliveredLabel: string;
    remaining: string;
    location: string;
    note: string;
    productsInDelivery: string;
    completed: string;
    ends: string;
    awaiting: string;
    notScheduled: string;
    deliverySchedule: string;
    batchCreated: string;
    batchNotCreated: string;
    batchInProgress: string;
    statusInProduction: string;
    statusReadyForDelivery: string;
    statusDelivering: string;
    statusAwaitingConfirmation: string;
    statusDelivered: string;
    statusCompleted: string;
    statusDefault: string;
    noProductsInSchedule: string;
    productsScheduled: (productCount: number, itemCount: number) => string;
  };
  quotations: {
    title: string;
    myProjects: string;
    project: string;
    empty: string;
    subtotal: string;
    discount: string;
    beforeVat: string;
    vat: string;
    deposit: string;
    total: string;
    item: string;
    qty: string;
    unit: string;
    gross: string;
    lineTotal: string;
    salesNote: string;
    customerNote: string;
    revisionReason: string;
    acceptQuotation: string;
    requestRevision: string;
    revisionPlaceholder: string;
    acceptedToast: string;
    revisionSentToast: string;
    revisionRequiredToast: string;
    readOnlyNote: string;
  };
  orders: {
    title: string;
    myOrders: string;
    orderCount: (count: number) => string;
    searchOrderCode: string;
    allStatuses: string;
    depositPending: string;
    inProduction: string;
    delivering: string;
    finalPayment: string;
    completed: string;
    orderSummary: string;
    depositPayment: string;
    deliveryDetails: string;
    actions: string;
    orderItems: string;
    paymentHistory: string;
    deliveryProgress: string;
    itemsGross: string;
    itemDiscount: string;
    preVat: string;
    vat: string;
    total: string;
    deposit: string;
    paid: string;
    remaining: string;
    createDepositPayment: string;
    payRemaining: string;
    confirmDelivery: string;
    saveDeliveryDetails: string;
    address: string;
    receiver: string;
    phone: string;
    note: string;
    complete: string;
    required: string;
    locked: string;
    orderPayment: string;
    paymentSuccessful: string;
    backToOrders: string;
    deliveryConfirmedToast: string;
    deliverySavedToast: string;
    depositReadyToast: string;
    emptyOrders: string;
    noDeliveryDetails: string;
    noPaymentHistory: string;
    depositPaid: string;
    completeDeliveryFirst: string;
    paymentPending: string;
    waitingFinalConfirmation: string;
    mixed: string;
    projectDetails: string;
    readyToCreatePayment: string;
    confirmedAt: (when: string) => string;
    physicalDeliveryInProgress: string;
    pendingDelivery: string;
    confirmed: string;
    type: string;
    expired: string;
    transactionAttempts: (count: number) => string;
    itemsProgress: (delivered: number, quantity: string, status: string) => string;
  };
  schedules: {
    title: string;
    searchPlaceholder: string;
    allTypes: string;
    allStatuses: string;
    monthlyOverview: string;
    sun: string;
    mon: string;
    tue: string;
    wed: string;
    thu: string;
    fri: string;
    sat: string;
    scheduleCount: (count: number) => string;
    noSchedule: string;
    showLess: string;
    more: (count: number) => string;
    start: string;
    end: string;
    location: string;
    project: string;
    details: string;
    deliveryChangeRequest: string;
    changePlaceholder: string;
    confirm: string;
    requestChange: string;
    noScheduleSelected: string;
    confirmedToast: string;
    changeRequestSentToast: string;
    noAdditionalDetails: string;
  };
  chat: {
    title: string;
    selectProject: string;
    filterConversations: string;
    loadingProjects: string;
    loadingChats: string;
    loadingMessages: string;
    noChat: string;
    noMessages: string;
    attachment: string;
    typeMessage: string;
    sendMessage: string;
  };
  preview3d: {
    sceneLevels: string;
    all: string;
    chat: string;
    sceneItems: string;
    proposals: string;
    select: string;
    selecting: string;
    requestRevision: string;
    fullscreen: string;
    loadingScene: string;
    selectProposal: string;
    noSavedLayout: string;
    editingDisabled: string;
    selectedObject: string;
    fromScene: string;
    localObject: string;
    designerChat: string;
    cancel: string;
    sendRevisionRequest: string;
    proposalSelectedToast: string;
    revisionRequiredToast: string;
    revisionSentToast: string;
    noProposalSelected: string;
  };
};

const en: CustomerCopy = {
  openSidebar: 'Open customer sidebar',
  collapseSidebar: 'Collapse customer sidebar',
  navAria: 'Customer navigation',
  createProjectRequest: 'Create Project Request',
  switchLang: 'Chuyển sang Tiếng Việt',
  nav: {
    home: 'Home',
    myProjects: 'My Projects',
    tracking: 'Tracking',
    quotations: 'Quotations',
    orders: 'Orders',
    schedules: 'Schedules',
    projectChat: 'Project Chat',
  },
  common: {
    loading: 'Loading...',
    previous: 'Previous',
    next: 'Next',
    cancel: 'Cancel',
    close: 'Close',
    save: 'Save',
    send: 'Send',
    confirm: 'Confirm',
    confirming: 'Confirming...',
    search: 'Search',
    all: 'All',
    status: 'Status',
    actions: 'Actions',
    view: 'View',
    open: 'Open',
    project: 'Project',
    projectName: 'Project Name',
    businessType: 'Business Type',
    notSpecified: 'Not specified',
    customer: 'Customer',
    version: 'Version',
    published: 'Published',
    from: (value) => `From ${value}`,
    upTo: (value) => `Up to ${value}`,
  },
  status: {
    SUBMITTED: 'Submitted',
    NEED_BASIC_INFORMATION: 'Need Info',
    IN_CONSULTATION: 'In Consultation',
    WAITING_FOR_DESIGNER_ASSIGNMENT: 'Waiting Designer',
    MEASUREMENT_REQUIRED: 'Measurement Required',
    SPACE_VERIFIED: 'Space Verified',
    PROPOSAL_CONSULTING: 'Proposal Consulting',
    PROPOSAL_SELECTED: 'Proposal Selected',
    QUOTATION_SENT: 'Quotation Sent',
    QUOTATION_REVISION_REQUESTED: 'Quotation Revision',
    ORDER_CONFIRMED: 'Order Confirmed',
    IN_PRODUCTION: 'In Production',
    READY_FOR_DELIVERY: 'Ready for Delivery',
    DELIVERING: 'Delivering',
    AWAITING_CUSTOMER_CONFIRMATION: 'Confirm Delivery',
    DELIVERED: 'Delivered',
    COMPLETED: 'Completed',
    REJECTED: 'Rejected',
  },
  journey: {
    requestSubmitted: 'Request Submitted',
    consultation: 'Consultation',
    designerAssignment: 'Designer Assignment',
    spaceVerification: 'Space Verification',
    spaceVerified: 'Space Verified',
    proposalConsulting: 'Proposal Consulting',
    quotation: 'Quotation',
    orderConfirmed: 'Order Confirmed',
    production: 'Production',
    delivery: 'Delivery',
    completed: 'Completed',
    rejected: 'Rejected',
  },
  paymentType: {
    PROJECT_START_FEE: 'Project Start Fee',
    DEPOSIT: 'Deposit',
    REMAINING_PAYMENT: 'Remaining Payment',
  },
  paymentStatus: {
    PENDING: 'Pending',
    PROCESSING: 'Processing',
    PAID: 'Paid',
    CANCELLED: 'Cancelled',
    EXPIRED: 'Expired',
    REFUNDED: 'Refunded',
  },
  dashboard: {
    welcomeBack: (name) => `Welcome back, ${name}!`,
    journeyInProgress: 'Your interior design journey is in progress. Let us continue transforming your space.',
    startRequestHint: 'Start a project request so your team can guide the next steps.',
    loadingActiveProject: 'Loading your active project...',
    noActiveProjectTitle: 'No active project yet',
    noActiveProjectDesc:
      'Create your first project request so you can follow its progress, schedules, proposals, and team updates from this dashboard.',
    createProject: 'Create Project',
    yourActiveProject: 'Your Active Project',
    trackProgress: 'Track progress and take next steps',
    trackProject: 'Track Project',
    openProject: 'Open Project',
    budgetRange: 'Budget Range',
    availableInDetail: 'Available in detail',
    projectJourney: 'Project Journey',
    pendingYourReview: 'Pending Your Review',
    viewAll: 'View All',
    loadingProposals: 'Loading published proposals...',
    cannotLoadProposals: 'Cannot load published proposals.',
    noPendingProposals: 'No published proposals are pending review.',
    review: 'Review',
    projectSchedule: 'Project Schedule',
    scheduleIntro: 'Schedules created for the project team are shown here for your confirmation and tracking.',
    createProjectForSchedules: 'Create a project to receive schedules from your team.',
    loadingSchedules: 'Loading project schedules...',
    noUpcomingSchedules: 'No upcoming schedules have been sent for this project.',
    scheduleShared: 'Schedule shared with the project roles and customer.',
    scheduleConfirmed: 'Schedule confirmed successfully.',
    confirmedByCustomer: 'Confirmed by customer.',
    needHelp: 'Need Help?',
    needHelpDesc: 'Our team is here to assist you throughout your interior design journey.',
    contactYourTeam: 'Contact Your Team',
    viewHelpCenter: 'View Help Center',
    actionAddInfoTitle: 'Action Required: Add Project Information',
    actionAddInfoDesc: 'Your sales team needs more details before the project can continue.',
    updateInfo: 'Update Info',
    actionReviewProposalsTitle: 'Action Required: Review Design Proposals',
    actionReviewProposalsDesc: 'Your designer has published design proposals. Please review and provide feedback.',
    reviewNow: 'Review Now',
    actionReviewQuotationTitle: 'Action Required: Review Quotation',
    actionReviewQuotationDesc: 'A quotation is ready for review before the next project stage.',
    viewQuotation: 'View Quotation',
    actionConfirmDeliveryTitle: 'Action Required: Confirm Delivery',
    actionConfirmDeliveryDesc:
      'Every item has been physically delivered. Please confirm final receipt so payment or completion can continue.',
    confirmDelivery: 'Confirm Delivery',
    projectCompletedTitle: 'Project Completed',
    projectCompletedDesc: 'Your project is complete. You can still review the project information anytime.',
  },
  projects: {
    title: 'My Projects',
    searchPlaceholder: 'Search projects...',
    allStatuses: 'All statuses',
    submitted: 'Submitted:',
    currentStage: 'Current Stage',
    payStartFee: 'Pay Start Fee',
    updateInformation: 'Update Information',
    openProject: 'Open Project',
    chat: 'Chat',
    showing: (from, to, total) => `Showing ${from}-${to} of ${total} projects`,
    loading: 'Loading projects...',
    empty: 'No projects match your filters.',
    loadError: 'Cannot load projects.',
    startFeeTitle: 'Project Start Fee',
    startFeePaid: 'Start fee paid',
    backToProjects: 'Back to Projects',
  },
  projectDetail: {
    overview: 'Project Overview',
    updateInformation: 'Update Information',
    tabOverview: 'Overview',
    tabSchedules: 'Schedules',
    tabProposals: 'Proposals',
    submitted: 'Submitted',
    address: 'Address',
    currentStage: 'Current Stage',
    area: 'Area',
    floors: 'Floors',
    minBudget: 'Min Budget',
    maxBudget: 'Max Budget',
    requirements: 'Requirements',
    projectTimeline: 'Project Timeline',
    measurementImages: 'Measurement Images',
    orders: 'Orders',
    deliveryTracking: 'Delivery Tracking',
    designProposals: 'Design Proposals',
    reopenProposal: 'Reopen Proposal',
    noProposals: 'No proposals available yet.',
    loadingProposals: 'Loading proposals...',
    projectSchedules: 'Project Schedules',
    pendingUpcoming: (count) => `${count} pending/upcoming`,
    requestChange: 'Request Change',
    responseNotePlaceholder: 'Add a response note (optional)',
    trackingLink: 'Tracking',
    reopenedToast: 'Proposal reopened successfully.',
    scheduleConfirmedToast: 'Schedule confirmed successfully.',
    scheduleCancelledToast: 'Schedule cancelled successfully.',
    changeRequestSentToast: 'Change request sent successfully.',
  },
  proposalAccordion: {
    proposalScenes: 'Proposal Scenes',
    openScene: 'Open Scene',
    noScenes: 'No scenes available.',
    loadingScenes: 'Loading scenes...',
    itemName: 'Item Name',
    version: 'Version',
    dimensions: 'Dimensions',
    material: 'Material',
    qty: 'Qty',
    unitPrice: 'Unit Price',
    total: 'Total',
    actions: 'Actions',
    customize: 'Customize',
    totalEstimated: 'Total Estimated',
    requestCustomization: 'Request Item Customization',
    titlePlaceholder: 'Customization title',
    materialPlaceholder: 'Material',
    colorPlaceholder: 'Color',
    widthPlaceholder: 'Width',
    heightPlaceholder: 'Height',
    depthPlaceholder: 'Depth',
    submitRequest: 'Submit Request',
    requestRevision: 'Request Proposal Revision',
    sendRevisionRequest: 'Send Revision Request',
    revisionPlaceholder: 'Describe what you want changed...',
    customVersions: 'Custom Versions for Review',
    acceptCustomVersion: 'Accept Custom Version',
    feasibilityPending: 'Feasibility Pending',
    accepted: 'Accepted',
    feasible: 'Feasible',
    notFeasible: 'Not Feasible',
    productionReview: 'Production Review',
    noPreview: 'No preview',
    previewModel: 'Preview model',
    titleRequiredToast: 'Title and at least one customization detail are required.',
    revisionRequiredToast: 'Please enter revision feedback.',
  },
  projectRequest: {
    createTitle: 'Create New Project Request',
    updateTitle: 'Update Project Information',
    basicInformation: 'Basic Information',
    spaceDetails: 'Space Details',
    budgetTimeline: 'Budget & Timeline',
    projectFiles: 'Project Files',
    projectName: 'Project Name *',
    businessType: 'Business Type *',
    businessPurpose: 'Business Purpose',
    address: 'Address',
    furnitureRequirement: 'Furniture Requirement *',
    description: 'Description',
    totalArea: 'Total Area',
    floors: 'Floors',
    minBudget: 'Min Budget',
    maxBudget: 'Max Budget',
    targetCompletionDate: 'Target Completion Date',
    uploadHint: 'Click to upload or drag and drop',
    uploadTypes: 'PDF, images, CAD, or ZIP files',
    submitRequest: 'Submit Project Request',
    submitting: 'Submitting...',
    submitUpdated: 'Submit Updated Information',
    loading: 'Loading...',
    notEditable: 'This project cannot be edited in its current status.',
    filesReady: (count) => `${count} file(s) ready`,
    dropFiles: 'Drop files here',
    missingProjectId: 'Project id is missing.',
    cafe: 'Cafe',
    retail: 'Retail',
    office: 'Office',
    restaurant: 'Restaurant',
    showroom: 'Showroom',
  },
  tracking: {
    title: 'Delivery Tracking',
    projects: 'Projects',
    found: (count) => `${count} found`,
    searchProject: 'Search project',
    noActiveOrder: 'No active order',
    noProjectSelected: 'No project selected',
    projectCode: 'Project code',
    progress: 'Progress',
    nextDelivery: 'Next delivery',
    confirmFinalDelivery: 'Confirm Final Delivery',
    orderedQty: 'Ordered Qty',
    deliveredQty: 'Delivered Qty',
    completedTrips: 'Completed Trips',
    remainingQty: 'Remaining Qty',
    deliveryItems: 'Delivery Items',
    deliveryTimeline: 'Delivery Timeline',
    contactTeam: 'Contact team',
    waiting: 'Waiting',
    partial: 'Partial',
    delivered: 'Delivered',
    unavailable: 'Unavailable',
    cancelled: 'Cancelled',
    ordered: 'ordered',
    deliveredLabel: 'delivered',
    remaining: 'remaining',
    location: 'Location',
    note: 'Note',
    productsInDelivery: 'Products in this delivery',
    completed: 'Completed',
    ends: 'Ends',
    awaiting: 'Awaiting',
    notScheduled: 'Not scheduled',
    deliverySchedule: 'Delivery schedule',
    batchCreated: 'Delivery batch created',
    batchNotCreated: 'Delivery batch has not been created yet',
    batchInProgress: 'Delivery batch is in progress',
    statusInProduction: 'Your order is currently in production. Delivery schedules appear after production is completed.',
    statusReadyForDelivery: 'Production is complete. The team is planning one or more delivery schedules.',
    statusDelivering: 'Delivery is in progress across one or more confirmed schedules.',
    statusAwaitingConfirmation: 'Every item has been physically delivered. Please confirm final receipt.',
    statusDelivered: 'Delivery has been confirmed and final payment or completion may be pending.',
    statusCompleted: 'This project has been completed.',
    statusDefault: 'Production tracking will appear after your order enters the production flow.',
    noProductsInSchedule: 'No delivery products added to this schedule yet.',
    productsScheduled: (productCount, itemCount) =>
      `${productCount} product${productCount === 1 ? '' : 's'} / ${itemCount} item${itemCount === 1 ? '' : 's'} scheduled for delivery`,
  },
  quotations: {
    title: 'Quotations',
    myProjects: 'My Projects',
    project: 'Project',
    empty: 'No quotation is available yet for the selected project.',
    subtotal: 'Subtotal',
    discount: 'Discount',
    beforeVat: 'Before VAT',
    vat: 'VAT',
    deposit: 'Deposit',
    total: 'Total',
    item: 'Item',
    qty: 'Qty',
    unit: 'Unit',
    gross: 'Gross',
    lineTotal: 'Line Total (before VAT)',
    salesNote: 'Sales Note',
    customerNote: 'Customer Note',
    revisionReason: 'Revision Reason',
    acceptQuotation: 'Accept Quotation',
    requestRevision: 'Request Revision',
    revisionPlaceholder: 'Tell us what needs revising...',
    acceptedToast: 'Quotation accepted successfully.',
    revisionSentToast: 'Revision request sent successfully.',
    revisionRequiredToast: 'Please tell us what needs revising.',
    readOnlyNote: 'This quotation is read-only in its current status.',
  },
  orders: {
    title: 'Orders',
    myOrders: 'My Orders',
    orderCount: (count) => `${count} order${count === 1 ? '' : 's'}`,
    searchOrderCode: 'Search order code',
    allStatuses: 'All statuses',
    depositPending: 'Deposit pending',
    inProduction: 'In production',
    delivering: 'Delivering',
    finalPayment: 'Final payment',
    completed: 'Completed',
    orderSummary: 'Order Summary',
    depositPayment: 'Deposit Payment',
    deliveryDetails: 'Delivery Details',
    actions: 'Actions',
    orderItems: 'Order Items',
    paymentHistory: 'Payment History',
    deliveryProgress: 'Delivery Progress',
    itemsGross: 'Items Gross',
    itemDiscount: 'Item Discount',
    preVat: 'Pre-VAT',
    vat: 'VAT',
    total: 'Total',
    deposit: 'Deposit',
    paid: 'Paid',
    remaining: 'Remaining',
    createDepositPayment: 'Create Deposit Payment',
    payRemaining: 'Pay Remaining',
    confirmDelivery: 'Confirm Delivery',
    saveDeliveryDetails: 'Save Delivery Details',
    address: 'Address',
    receiver: 'Receiver',
    phone: 'Phone',
    note: 'Note',
    complete: 'Complete',
    required: 'Required',
    locked: 'Locked',
    orderPayment: 'Order Payment',
    paymentSuccessful: 'Payment Successful',
    backToOrders: 'Back to Orders',
    deliveryConfirmedToast: 'Delivery confirmed successfully.',
    deliverySavedToast: 'Delivery details saved successfully.',
    depositReadyToast: 'Deposit payment ready.',
    emptyOrders: 'No order is available yet.',
    noDeliveryDetails: 'No delivery details available.',
    noPaymentHistory: 'No payment history yet.',
    depositPaid: 'Deposit paid',
    completeDeliveryFirst: 'Complete delivery details first',
    paymentPending: 'Payment pending',
    waitingFinalConfirmation: 'Waiting for your final confirmation',
    mixed: 'Mixed',
    projectDetails: 'Project details',
    readyToCreatePayment: 'Ready to create payment',
    confirmedAt: (when) => `Confirmed ${when}`,
    physicalDeliveryInProgress: 'Physical delivery in progress',
    pendingDelivery: 'Pending delivery',
    confirmed: 'Confirmed',
    type: 'Type',
    expired: 'Expired',
    transactionAttempts: (count) => `${count} transaction attempt(s)`,
    itemsProgress: (delivered, quantity, status) => `${delivered} / ${quantity} item(s) - ${status}`,
  },
  schedules: {
    title: 'Project Schedules',
    searchPlaceholder: 'Search schedules...',
    allTypes: 'All types',
    allStatuses: 'All statuses',
    monthlyOverview: 'Monthly overview',
    sun: 'Sun',
    mon: 'Mon',
    tue: 'Tue',
    wed: 'Wed',
    thu: 'Thu',
    fri: 'Fri',
    sat: 'Sat',
    scheduleCount: (count) => `${count} schedule${count === 1 ? '' : 's'}`,
    noSchedule: 'No schedule',
    showLess: 'Show less',
    more: (count) => `+${count} more`,
    start: 'Start',
    end: 'End',
    location: 'Location',
    project: 'Project',
    details: 'Details',
    deliveryChangeRequest: 'Delivery change request',
    changePlaceholder: 'Describe the change you need...',
    confirm: 'Confirm',
    requestChange: 'Request Change',
    noScheduleSelected: 'No schedule selected',
    confirmedToast: 'Schedule confirmed successfully.',
    changeRequestSentToast: 'Change request sent successfully.',
    noAdditionalDetails: 'No additional schedule details were provided.',
  },
  chat: {
    title: 'Project Chat',
    selectProject: 'Select project',
    filterConversations: 'Filter conversations...',
    loadingProjects: 'Loading projects...',
    loadingChats: 'Loading chats...',
    loadingMessages: 'Loading messages...',
    noChat: 'No chat available for this project.',
    noMessages: 'No messages yet.',
    attachment: 'Attachment',
    typeMessage: 'Type your message...',
    sendMessage: 'Send message',
  },
  preview3d: {
    sceneLevels: 'Scene Levels',
    all: 'All',
    chat: 'Chat',
    sceneItems: 'Scene Items',
    proposals: 'Proposals',
    select: 'Select',
    selecting: 'Selecting...',
    requestRevision: 'Request Proposal Revision',
    fullscreen: 'Fullscreen',
    loadingScene: 'Loading saved Room Planner scene...',
    selectProposal: 'Select a proposal to preview its 3D scene.',
    noSavedLayout: 'This proposal does not have a saved layout yet.',
    editingDisabled: 'Saved scene - editing disabled',
    selectedObject: 'Selected object',
    fromScene: 'From scene',
    localObject: 'Local object',
    designerChat: 'Designer Chat',
    cancel: 'Cancel',
    sendRevisionRequest: 'Send Revision Request',
    proposalSelectedToast: 'Proposal selected successfully.',
    revisionRequiredToast: 'Please enter revision feedback.',
    revisionSentToast: 'Revision request sent successfully.',
    noProposalSelected: 'No proposal selected',
  },
};

const vi: CustomerCopy = {
  openSidebar: 'Mở thanh điều hướng khách hàng',
  collapseSidebar: 'Thu gọn thanh điều hướng khách hàng',
  navAria: 'Điều hướng khách hàng',
  createProjectRequest: 'Tạo yêu cầu dự án',
  switchLang: 'Switch to English',
  nav: {
    home: 'Trang chủ',
    myProjects: 'Dự án của tôi',
    tracking: 'Theo dõi',
    quotations: 'Báo giá',
    orders: 'Đơn hàng',
    schedules: 'Lịch trình',
    projectChat: 'Chat dự án',
  },
  common: {
    loading: 'Đang tải...',
    previous: 'Trước',
    next: 'Sau',
    cancel: 'Hủy',
    close: 'Đóng',
    save: 'Lưu',
    send: 'Gửi',
    confirm: 'Xác nhận',
    confirming: 'Đang xác nhận...',
    search: 'Tìm kiếm',
    all: 'Tất cả',
    status: 'Trạng thái',
    actions: 'Thao tác',
    view: 'Xem',
    open: 'Mở',
    project: 'Dự án',
    projectName: 'Tên dự án',
    businessType: 'Loại hình kinh doanh',
    notSpecified: 'Chưa xác định',
    customer: 'Khách hàng',
    version: 'Phiên bản',
    published: 'Đã xuất bản',
    from: (value) => `Từ ${value}`,
    upTo: (value) => `Đến ${value}`,
  },
  status: {
    SUBMITTED: 'Đã gửi',
    NEED_BASIC_INFORMATION: 'Cần thông tin',
    IN_CONSULTATION: 'Đang tư vấn',
    WAITING_FOR_DESIGNER_ASSIGNMENT: 'Chờ designer',
    MEASUREMENT_REQUIRED: 'Cần đo đạc',
    SPACE_VERIFIED: 'Đã xác minh không gian',
    PROPOSAL_CONSULTING: 'Tư vấn đề xuất',
    PROPOSAL_SELECTED: 'Đã chọn đề xuất',
    QUOTATION_SENT: 'Đã gửi báo giá',
    QUOTATION_REVISION_REQUESTED: 'Yêu cầu sửa báo giá',
    ORDER_CONFIRMED: 'Đã xác nhận đơn',
    IN_PRODUCTION: 'Đang sản xuất',
    READY_FOR_DELIVERY: 'Sẵn sàng giao',
    DELIVERING: 'Đang giao',
    AWAITING_CUSTOMER_CONFIRMATION: 'Xác nhận giao hàng',
    DELIVERED: 'Đã giao',
    COMPLETED: 'Hoàn thành',
    REJECTED: 'Từ chối',
  },
  journey: {
    requestSubmitted: 'Đã gửi yêu cầu',
    consultation: 'Tư vấn',
    designerAssignment: 'Phân công designer',
    spaceVerification: 'Xác minh không gian',
    spaceVerified: 'Đã xác minh không gian',
    proposalConsulting: 'Tư vấn đề xuất',
    quotation: 'Báo giá',
    orderConfirmed: 'Đã xác nhận đơn',
    production: 'Sản xuất',
    delivery: 'Giao hàng',
    completed: 'Hoàn thành',
    rejected: 'Từ chối',
  },
  paymentType: {
    PROJECT_START_FEE: 'Phí khởi tạo dự án',
    DEPOSIT: 'Đặt cọc',
    REMAINING_PAYMENT: 'Thanh toán còn lại',
  },
  paymentStatus: {
    PENDING: 'Chờ xử lý',
    PROCESSING: 'Đang xử lý',
    PAID: 'Đã thanh toán',
    CANCELLED: 'Đã hủy',
    EXPIRED: 'Hết hạn',
    REFUNDED: 'Đã hoàn tiền',
  },
  dashboard: {
    welcomeBack: (name) => `Chào mừng trở lại, ${name}!`,
    journeyInProgress: 'Hành trình thiết kế nội thất của bạn đang diễn ra. Hãy tiếp tục cùng chúng tôi.',
    startRequestHint: 'Hãy tạo yêu cầu dự án để đội ngũ hỗ trợ bạn các bước tiếp theo.',
    loadingActiveProject: 'Đang tải dự án đang hoạt động...',
    noActiveProjectTitle: 'Chưa có dự án nào',
    noActiveProjectDesc:
      'Tạo yêu cầu dự án đầu tiên để theo dõi tiến độ, lịch trình, đề xuất và cập nhật từ đội ngũ ngay trên bảng điều khiển này.',
    createProject: 'Tạo dự án',
    yourActiveProject: 'Dự án đang hoạt động',
    trackProgress: 'Theo dõi tiến độ và thực hiện bước tiếp theo',
    trackProject: 'Theo dõi dự án',
    openProject: 'Mở dự án',
    budgetRange: 'Khoảng ngân sách',
    availableInDetail: 'Xem trong chi tiết',
    projectJourney: 'Hành trình dự án',
    pendingYourReview: 'Chờ bạn xem xét',
    viewAll: 'Xem tất cả',
    loadingProposals: 'Đang tải đề xuất đã xuất bản...',
    cannotLoadProposals: 'Không tải được đề xuất đã xuất bản.',
    noPendingProposals: 'Không có đề xuất nào đang chờ xem xét.',
    review: 'Xem xét',
    projectSchedule: 'Lịch trình dự án',
    scheduleIntro: 'Các lịch trình do đội ngũ tạo sẽ hiển thị ở đây để bạn xác nhận và theo dõi.',
    createProjectForSchedules: 'Tạo dự án để nhận lịch trình từ đội ngũ.',
    loadingSchedules: 'Đang tải lịch trình dự án...',
    noUpcomingSchedules: 'Chưa có lịch trình sắp tới cho dự án này.',
    scheduleShared: 'Lịch trình được chia sẻ với các vai trò dự án và khách hàng.',
    scheduleConfirmed: 'Xác nhận lịch trình thành công.',
    confirmedByCustomer: 'Đã xác nhận bởi khách hàng.',
    needHelp: 'Cần hỗ trợ?',
    needHelpDesc: 'Đội ngũ của chúng tôi sẵn sàng hỗ trợ bạn trong suốt hành trình thiết kế nội thất.',
    contactYourTeam: 'Liên hệ đội ngũ',
    viewHelpCenter: 'Xem trung tâm trợ giúp',
    actionAddInfoTitle: 'Cần thao tác: Bổ sung thông tin dự án',
    actionAddInfoDesc: 'Đội sales cần thêm chi tiết trước khi dự án có thể tiếp tục.',
    updateInfo: 'Cập nhật thông tin',
    actionReviewProposalsTitle: 'Cần thao tác: Xem xét đề xuất thiết kế',
    actionReviewProposalsDesc: 'Designer đã xuất bản đề xuất thiết kế. Vui lòng xem xét và phản hồi.',
    reviewNow: 'Xem ngay',
    actionReviewQuotationTitle: 'Cần thao tác: Xem xét báo giá',
    actionReviewQuotationDesc: 'Báo giá đã sẵn sàng để xem xét trước giai đoạn tiếp theo.',
    viewQuotation: 'Xem báo giá',
    actionConfirmDeliveryTitle: 'Cần thao tác: Xác nhận giao hàng',
    actionConfirmDeliveryDesc:
      'Tất cả sản phẩm đã được giao thực tế. Vui lòng xác nhận nhận hàng để tiếp tục thanh toán hoặc hoàn tất.',
    confirmDelivery: 'Xác nhận giao hàng',
    projectCompletedTitle: 'Dự án đã hoàn thành',
    projectCompletedDesc: 'Dự án của bạn đã hoàn tất. Bạn vẫn có thể xem lại thông tin dự án bất cứ lúc nào.',
  },
  projects: {
    title: 'Dự án của tôi',
    searchPlaceholder: 'Tìm dự án...',
    allStatuses: 'Tất cả trạng thái',
    submitted: 'Ngày gửi:',
    currentStage: 'Giai đoạn hiện tại',
    payStartFee: 'Thanh toán phí khởi tạo',
    updateInformation: 'Cập nhật thông tin',
    openProject: 'Mở dự án',
    chat: 'Chat',
    showing: (from, to, total) => `Hiển thị ${from}-${to} / ${total} dự án`,
    loading: 'Đang tải dự án...',
    empty: 'Không có dự án khớp bộ lọc.',
    loadError: 'Không tải được danh sách dự án.',
    startFeeTitle: 'Phí khởi tạo dự án',
    startFeePaid: 'Đã thanh toán phí khởi tạo',
    backToProjects: 'Quay lại dự án',
  },
  projectDetail: {
    overview: 'Tổng quan dự án',
    updateInformation: 'Cập nhật thông tin',
    tabOverview: 'Tổng quan',
    tabSchedules: 'Lịch trình',
    tabProposals: 'Đề xuất',
    submitted: 'Ngày gửi',
    address: 'Địa chỉ',
    currentStage: 'Giai đoạn hiện tại',
    area: 'Diện tích',
    floors: 'Số tầng',
    minBudget: 'Ngân sách tối thiểu',
    maxBudget: 'Ngân sách tối đa',
    requirements: 'Yêu cầu',
    projectTimeline: 'Tiến độ dự án',
    measurementImages: 'Ảnh đo đạc',
    orders: 'Đơn hàng',
    deliveryTracking: 'Theo dõi giao hàng',
    designProposals: 'Đề xuất thiết kế',
    reopenProposal: 'Mở lại đề xuất',
    noProposals: 'Chưa có đề xuất nào.',
    loadingProposals: 'Đang tải đề xuất...',
    projectSchedules: 'Lịch trình dự án',
    pendingUpcoming: (count) => `${count} chờ/sắp tới`,
    requestChange: 'Yêu cầu thay đổi',
    responseNotePlaceholder: 'Thêm ghi chú phản hồi (không bắt buộc)',
    trackingLink: 'Theo dõi',
    reopenedToast: 'Đã mở lại đề xuất thành công.',
    scheduleConfirmedToast: 'Xác nhận lịch trình thành công.',
    scheduleCancelledToast: 'Hủy lịch trình thành công.',
    changeRequestSentToast: 'Đã gửi yêu cầu thay đổi thành công.',
  },
  proposalAccordion: {
    proposalScenes: 'Scene đề xuất',
    openScene: 'Mở scene',
    noScenes: 'Chưa có scene nào.',
    loadingScenes: 'Đang tải scene...',
    itemName: 'Tên sản phẩm',
    version: 'Phiên bản',
    dimensions: 'Kích thước',
    material: 'Chất liệu',
    qty: 'SL',
    unitPrice: 'Đơn giá',
    total: 'Thành tiền',
    actions: 'Thao tác',
    customize: 'Tùy chỉnh',
    totalEstimated: 'Tổng ước tính',
    requestCustomization: 'Yêu cầu tùy chỉnh sản phẩm',
    titlePlaceholder: 'Tiêu đề tùy chỉnh',
    materialPlaceholder: 'Chất liệu',
    colorPlaceholder: 'Màu sắc',
    widthPlaceholder: 'Rộng',
    heightPlaceholder: 'Cao',
    depthPlaceholder: 'Sâu',
    submitRequest: 'Gửi yêu cầu',
    requestRevision: 'Yêu cầu chỉnh sửa đề xuất',
    sendRevisionRequest: 'Gửi yêu cầu chỉnh sửa',
    revisionPlaceholder: 'Mô tả những gì bạn muốn thay đổi...',
    customVersions: 'Phiên bản tùy chỉnh cần xem xét',
    acceptCustomVersion: 'Chấp nhận phiên bản tùy chỉnh',
    feasibilityPending: 'Chờ đánh giá khả thi',
    accepted: 'Đã chấp nhận',
    feasible: 'Khả thi',
    notFeasible: 'Không khả thi',
    productionReview: 'Đang xem xét sản xuất',
    noPreview: 'Không có xem trước',
    previewModel: 'Xem trước mô hình',
    titleRequiredToast: 'Cần tiêu đề và ít nhất một chi tiết tùy chỉnh.',
    revisionRequiredToast: 'Vui lòng nhập phản hồi chỉnh sửa.',
  },
  projectRequest: {
    createTitle: 'Tạo yêu cầu dự án mới',
    updateTitle: 'Cập nhật thông tin dự án',
    basicInformation: 'Thông tin cơ bản',
    spaceDetails: 'Chi tiết không gian',
    budgetTimeline: 'Ngân sách & thời gian',
    projectFiles: 'Tệp dự án',
    projectName: 'Tên dự án *',
    businessType: 'Loại hình kinh doanh *',
    businessPurpose: 'Mục đích kinh doanh',
    address: 'Địa chỉ',
    furnitureRequirement: 'Yêu cầu nội thất *',
    description: 'Mô tả',
    totalArea: 'Tổng diện tích',
    floors: 'Số tầng',
    minBudget: 'Ngân sách tối thiểu',
    maxBudget: 'Ngân sách tối đa',
    targetCompletionDate: 'Ngày hoàn thành mục tiêu',
    uploadHint: 'Nhấp để tải lên hoặc kéo thả',
    uploadTypes: 'PDF, hình ảnh, CAD hoặc ZIP',
    submitRequest: 'Gửi yêu cầu dự án',
    submitting: 'Đang gửi...',
    submitUpdated: 'Gửi thông tin đã cập nhật',
    loading: 'Đang tải...',
    notEditable: 'Dự án không thể chỉnh sửa ở trạng thái hiện tại.',
    filesReady: (count) => `${count} tệp sẵn sàng`,
    dropFiles: 'Thả tệp vào đây',
    missingProjectId: 'Thiếu mã dự án.',
    cafe: 'Cafe',
    retail: 'Bán lẻ',
    office: 'Văn phòng',
    restaurant: 'Nhà hàng',
    showroom: 'Showroom',
  },
  tracking: {
    title: 'Theo dõi giao hàng',
    projects: 'Dự án',
    found: (count) => `${count} kết quả`,
    searchProject: 'Tìm dự án',
    noActiveOrder: 'Không có đơn hàng đang hoạt động',
    noProjectSelected: 'Chưa chọn dự án',
    projectCode: 'Mã dự án',
    progress: 'Tiến độ',
    nextDelivery: 'Lần giao tiếp theo',
    confirmFinalDelivery: 'Xác nhận giao hàng cuối',
    orderedQty: 'SL đặt',
    deliveredQty: 'SL đã giao',
    completedTrips: 'Chuyến hoàn thành',
    remainingQty: 'SL còn lại',
    deliveryItems: 'Sản phẩm giao hàng',
    deliveryTimeline: 'Timeline giao hàng',
    contactTeam: 'Liên hệ đội ngũ',
    waiting: 'Chờ',
    partial: 'Một phần',
    delivered: 'Đã giao',
    unavailable: 'Không khả dụng',
    cancelled: 'Đã hủy',
    ordered: 'đã đặt',
    deliveredLabel: 'đã giao',
    remaining: 'còn lại',
    location: 'Địa điểm',
    note: 'Ghi chú',
    productsInDelivery: 'Sản phẩm trong lần giao này',
    completed: 'Hoàn thành',
    ends: 'Kết thúc',
    awaiting: 'Đang chờ',
    notScheduled: 'Chưa lên lịch',
    deliverySchedule: 'Lịch giao hàng',
    batchCreated: 'Đã tạo lô giao hàng',
    batchNotCreated: 'Chưa tạo lô giao hàng',
    batchInProgress: 'Lô giao hàng đang xử lý',
    statusInProduction: 'Đơn hàng đang được sản xuất. Lịch giao hàng sẽ xuất hiện sau khi sản xuất hoàn tất.',
    statusReadyForDelivery: 'Sản xuất đã hoàn tất. Đội ngũ đang lên kế hoạch một hoặc nhiều lịch giao hàng.',
    statusDelivering: 'Đang giao hàng theo một hoặc nhiều lịch đã xác nhận.',
    statusAwaitingConfirmation: 'Tất cả sản phẩm đã được giao thực tế. Vui lòng xác nhận nhận hàng cuối cùng.',
    statusDelivered: 'Giao hàng đã được xác nhận; thanh toán cuối hoặc hoàn tất có thể đang chờ.',
    statusCompleted: 'Dự án này đã hoàn thành.',
    statusDefault: 'Theo dõi sản xuất sẽ xuất hiện sau khi đơn hàng vào quy trình sản xuất.',
    noProductsInSchedule: 'Chưa có sản phẩm giao hàng trong lịch này.',
    productsScheduled: (productCount, itemCount) =>
      `${productCount} sản phẩm / ${itemCount} món đã lên lịch giao`,
  },
  quotations: {
    title: 'Báo giá',
    myProjects: 'Dự án của tôi',
    project: 'Dự án',
    empty: 'Chưa có báo giá cho dự án đang chọn.',
    subtotal: 'Tạm tính',
    discount: 'Giảm giá',
    beforeVat: 'Trước VAT',
    vat: 'VAT',
    deposit: 'Đặt cọc',
    total: 'Tổng',
    item: 'Sản phẩm',
    qty: 'SL',
    unit: 'Đơn vị',
    gross: 'Gross',
    lineTotal: 'Thành tiền dòng (trước VAT)',
    salesNote: 'Ghi chú sales',
    customerNote: 'Ghi chú khách hàng',
    revisionReason: 'Lý do chỉnh sửa',
    acceptQuotation: 'Chấp nhận báo giá',
    requestRevision: 'Yêu cầu chỉnh sửa',
    revisionPlaceholder: 'Cho chúng tôi biết cần chỉnh sửa gì...',
    acceptedToast: 'Chấp nhận báo giá thành công.',
    revisionSentToast: 'Đã gửi yêu cầu chỉnh sửa thành công.',
    revisionRequiredToast: 'Vui lòng cho biết nội dung cần chỉnh sửa.',
    readOnlyNote: 'Báo giá này chỉ xem ở trạng thái hiện tại.',
  },
  orders: {
    title: 'Đơn hàng',
    myOrders: 'Đơn hàng của tôi',
    orderCount: (count) => `${count} đơn hàng`,
    searchOrderCode: 'Tìm mã đơn hàng',
    allStatuses: 'Tất cả trạng thái',
    depositPending: 'Chờ đặt cọc',
    inProduction: 'Đang sản xuất',
    delivering: 'Đang giao',
    finalPayment: 'Thanh toán cuối',
    completed: 'Hoàn thành',
    orderSummary: 'Tóm tắt đơn hàng',
    depositPayment: 'Thanh toán đặt cọc',
    deliveryDetails: 'Chi tiết giao hàng',
    actions: 'Thao tác',
    orderItems: 'Sản phẩm đơn hàng',
    paymentHistory: 'Lịch sử thanh toán',
    deliveryProgress: 'Tiến độ giao hàng',
    itemsGross: 'Tổng gross',
    itemDiscount: 'Giảm giá sản phẩm',
    preVat: 'Trước VAT',
    vat: 'VAT',
    total: 'Tổng',
    deposit: 'Đặt cọc',
    paid: 'Đã thanh toán',
    remaining: 'Còn lại',
    createDepositPayment: 'Tạo thanh toán đặt cọc',
    payRemaining: 'Thanh toán phần còn lại',
    confirmDelivery: 'Xác nhận giao hàng',
    saveDeliveryDetails: 'Lưu chi tiết giao hàng',
    address: 'Địa chỉ',
    receiver: 'Người nhận',
    phone: 'Điện thoại',
    note: 'Ghi chú',
    complete: 'Hoàn tất',
    required: 'Bắt buộc',
    locked: 'Đã khóa',
    orderPayment: 'Thanh toán đơn hàng',
    paymentSuccessful: 'Thanh toán thành công',
    backToOrders: 'Quay lại đơn hàng',
    deliveryConfirmedToast: 'Xác nhận giao hàng thành công.',
    deliverySavedToast: 'Lưu chi tiết giao hàng thành công.',
    depositReadyToast: 'Thanh toán đặt cọc đã sẵn sàng.',
    emptyOrders: 'Chưa có đơn hàng nào.',
    noDeliveryDetails: 'Chưa có chi tiết giao hàng.',
    noPaymentHistory: 'Chưa có lịch sử thanh toán.',
    depositPaid: 'Đã thanh toán đặt cọc',
    completeDeliveryFirst: 'Hoàn tất chi tiết giao hàng trước',
    paymentPending: 'Đang chờ thanh toán',
    waitingFinalConfirmation: 'Đang chờ xác nhận cuối từ bạn',
    mixed: 'Hỗn hợp',
    projectDetails: 'Chi tiết dự án',
    readyToCreatePayment: 'Sẵn sàng tạo thanh toán',
    confirmedAt: (when) => `Đã xác nhận ${when}`,
    physicalDeliveryInProgress: 'Đang giao hàng thực tế',
    pendingDelivery: 'Chờ giao hàng',
    confirmed: 'Đã xác nhận',
    type: 'Loại',
    expired: 'Hết hạn',
    transactionAttempts: (count) => `${count} lần thử giao dịch`,
    itemsProgress: (delivered, quantity, status) => `${delivered} / ${quantity} sản phẩm - ${status}`,
  },
  schedules: {
    title: 'Lịch trình dự án',
    searchPlaceholder: 'Tìm lịch trình...',
    allTypes: 'Tất cả loại',
    allStatuses: 'Tất cả trạng thái',
    monthlyOverview: 'Tổng quan tháng',
    sun: 'CN',
    mon: 'T2',
    tue: 'T3',
    wed: 'T4',
    thu: 'T5',
    fri: 'T6',
    sat: 'T7',
    scheduleCount: (count) => `${count} lịch trình`,
    noSchedule: 'Không có lịch',
    showLess: 'Thu gọn',
    more: (count) => `+${count} nữa`,
    start: 'Bắt đầu',
    end: 'Kết thúc',
    location: 'Địa điểm',
    project: 'Dự án',
    details: 'Chi tiết',
    deliveryChangeRequest: 'Yêu cầu thay đổi giao hàng',
    changePlaceholder: 'Mô tả thay đổi bạn cần...',
    confirm: 'Xác nhận',
    requestChange: 'Yêu cầu thay đổi',
    noScheduleSelected: 'Chưa chọn lịch trình',
    confirmedToast: 'Xác nhận lịch trình thành công.',
    changeRequestSentToast: 'Đã gửi yêu cầu thay đổi thành công.',
    noAdditionalDetails: 'Không có chi tiết lịch trình bổ sung.',
  },
  chat: {
    title: 'Chat dự án',
    selectProject: 'Chọn dự án',
    filterConversations: 'Lọc hội thoại...',
    loadingProjects: 'Đang tải dự án...',
    loadingChats: 'Đang tải chat...',
    loadingMessages: 'Đang tải tin nhắn...',
    noChat: 'Chưa có chat cho dự án này.',
    noMessages: 'Chưa có tin nhắn.',
    attachment: 'Tệp đính kèm',
    typeMessage: 'Nhập tin nhắn...',
    sendMessage: 'Gửi tin nhắn',
  },
  preview3d: {
    sceneLevels: 'Tầng scene',
    all: 'Tất cả',
    chat: 'Chat',
    sceneItems: 'Sản phẩm scene',
    proposals: 'Đề xuất',
    select: 'Chọn',
    selecting: 'Đang chọn...',
    requestRevision: 'Yêu cầu chỉnh sửa đề xuất',
    fullscreen: 'Toàn màn hình',
    loadingScene: 'Đang tải scene Room Planner đã lưu...',
    selectProposal: 'Chọn một đề xuất để xem trước scene 3D.',
    noSavedLayout: 'Đề xuất này chưa có layout đã lưu.',
    editingDisabled: 'Scene đã lưu - không chỉnh sửa',
    selectedObject: 'Đối tượng đang chọn',
    fromScene: 'Từ scene',
    localObject: 'Đối tượng cục bộ',
    designerChat: 'Chat với designer',
    cancel: 'Hủy',
    sendRevisionRequest: 'Gửi yêu cầu chỉnh sửa',
    proposalSelectedToast: 'Đã chọn đề xuất thành công.',
    revisionRequiredToast: 'Vui lòng nhập phản hồi chỉnh sửa.',
    revisionSentToast: 'Đã gửi yêu cầu chỉnh sửa thành công.',
    noProposalSelected: 'Chưa chọn đề xuất',
  },
};

export const customerCopy: Record<Lang, CustomerCopy> = {
  en,
  vi,
};

export type { CustomerCopy };
