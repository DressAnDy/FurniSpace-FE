import { QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { queryClient } from '@/app/providers/queryClient';
import { theme } from '@/app/providers/theme';
import { ProtectedRoute } from '@/app/providers/ProtectedRoute';
import { LangProvider } from '@/app/providers/LangContext';
import { CodeVerifyPage, ForgotPasswordPage, LoginPage, RegisterPage } from '@/features/auth';
import { AdminDashbroad } from '@/features/AdminPages/AdminDashbroad';
import { AdminProjects } from '@/features/AdminPages/AdminProjects';
import { AdminReports } from '@/features/AdminPages/AdminReports';
import { AdminThreeDLabPage } from '@/features/AdminPages/AdminThreeDLab';
import { Categorymanagement } from '@/features/AdminPages/Categorymanagement';
import { CreateProductPage, CreateProductVersionPage, Productmanagement, ProductVersionManagement } from '@/features/AdminPages/Productmanagement';
import { UserManagement } from '@/features/AdminPages/UserManagement';
import { CatalogModelManagementPage, ProductModelWorkspacePage } from '@/features/AdminPages/CatalogModelManagement';
import { Customer3dPreviewPage } from '@/features/CustomerPages/customer3dPreview';
import { CustomerChatPage } from '@/features/CustomerPages/customerChat';
import { CustomerDashboardPage } from '@/features/CustomerPages/customerDashboard';
import { CustomerProjectListPage } from '@/features/CustomerPages/customerProjectList';
import { CustomerProjectInformationPage } from '@/features/CustomerPages/customerProjectInformation/CustomerProjectInformationPage';
import { CustomerProjectRequestPage } from '@/features/CustomerPages/customerProjectRequest';
import { CustomerProposalDetailPage } from '@/features/CustomerPages/customerProposalDetail';
import { CustomerOrdersPage } from '@/features/CustomerPages/customerOrders';
import { CustomerQuotationsPage } from '@/features/CustomerPages/customerQuotations';
import { ProjectFeedback } from '@/features/CustomerPages/Feedback';
import { Tracking } from '@/features/CustomerPages/Tracking';
import { DesignerAssignedProjects } from '@/features/DesignerPages/DesignerAssignedProjects';
import { DesignerProposalWorkspace } from '@/features/DesignerPages/DesignerProposalWorkspace';
import { CustomerSchedulesPage } from '@/features/CustomerPages/customerSchedules';
import { HomePage } from '@/features/MainPages/home';
import { ProductDetailPage } from '@/features/MainPages/productDetail';
import { ProductListPreviewPage } from '@/features/MainPages/productListPreview';
import { ProjectDetailPage } from '@/features/MainPages/projectDetail';
import { ProjectListReviewPage } from '@/features/MainPages/projectListReview';
import { UserProfilePage } from '@/features/MainPages/userProfile';
import { ProjectDetail } from '@/features/SalePages/ProjectDetail';
import { ProjectRequestQueue } from '@/features/SalePages/ProjectRequestQueue';
import { AssignedProjects } from '@/features/SalePages/AssignedProjects';
import { DesignerDashbroad } from '@/features/DesignerPages/DesignerDashbroad';
import { DesignerCreateProductVersionPage, DesignerProductLibrary } from '@/features/DesignerPages/DesignerProductLibrary';
import { DesignerProjectDetail } from '@/features/DesignerPages/DesignerProjectDetail';
import { DesignerSchedules } from '@/features/DesignerPages/DesignerSchedules';
import { BuildingBlueprintTestPage, BuildingThreeDTestPage } from '@/features/ThreeDTest';
import { BlockedIssues } from '@/features/ProductionPages/BlockedIssues';
import { MyProductionTasks } from '@/features/ProductionPages/MyProductionTasks';
import { ProductionCustomizationRequests } from '@/features/ProductionPages/ProductionCustomizationRequests';
import { ProductionDashbroad } from '@/features/ProductionPages/ProductionDashbroad';
import { ProductionRequestDetail } from '@/features/ProductionPages/ProductionRequestDetail';
import { ProductionRequests } from '@/features/ProductionPages/ProductionRequests';
import { ReadyForDelivery } from '@/features/ProductionPages/ReadyForDelivery';
import { SaleQuotations } from '@/features/SalePages/SaleQuotations';
import { SaleOrders } from '@/features/SalePages/SaleOrders';
import { SaleSchedules } from '@/features/SalePages/SaleSchedules';
import { SaleDashbroad } from '@/features/SalePages/SaleDashbroad';
import { ThreeDTestPage } from '@/features/ThreeD/pages/ThreeDTestPage';
import { ViewerDemoPage } from '@/features/viewer3d';
import { TileTransitionProvider } from '@/shared/components';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LangProvider>
        <BrowserRouter>
          <TileTransitionProvider>
          <Routes>
            {/* ── Public routes ── */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/code-verify" element={<CodeVerifyPage />} />
            <Route path="/products" element={<ProductListPreviewPage />} />
            <Route path="/products/detail" element={<ProductDetailPage />} />
            <Route path="/projects" element={<ProjectListReviewPage />} />
            <Route path="/projects/detail" element={<ProjectDetailPage />} />
            <Route path="/user-profile" element={<UserProfilePage />} />
            <Route path="/viewer3d" element={<ViewerDemoPage />} />
            <Route path="/3d-building-test" element={<BuildingThreeDTestPage />} />
            <Route path="/3d-building-test/blueprint" element={<BuildingBlueprintTestPage />} />

            {/* Legacy public redirects */}
            <Route path="/product-detail" element={<Navigate to="/products/detail" replace />} />
            <Route path="/product-list-preview" element={<Navigate to="/products" replace />} />
            <Route path="/project-detail" element={<Navigate to="/projects/detail" replace />} />
            <Route path="/project-list-review" element={<Navigate to="/projects" replace />} />

            {/* ── Admin routes (role: ADMIN) ── */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/admin" element={<Navigate to="/admin/dashbroad" replace />} />
              <Route path="/admin/dashbroad" element={<AdminDashbroad />} />
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/admin/categories" element={<Categorymanagement />} />
              <Route path="/admin/products" element={<Productmanagement />} />
              <Route path="/admin/products/create" element={<CreateProductPage />} />
              <Route path="/admin/products/:productId/versions" element={<ProductVersionManagement />} />
              <Route path="/admin/products/:productId/versions/create" element={<CreateProductVersionPage />} />
              <Route path="/admin/products/:productId/versions/:productVersionId/edit" element={<CreateProductVersionPage />} />
              <Route path="/admin/projects" element={<AdminProjects />} />
              <Route path="/admin/reports" element={<AdminReports />} />
              {/* Admin legacy redirects */}
              <Route path="/admin-dashbroad" element={<Navigate to="/admin/dashbroad" replace />} />
              <Route path="/admin-user-management" element={<Navigate to="/admin/users" replace />} />
              <Route path="/admin-category-management" element={<Navigate to="/admin/categories" replace />} />
              <Route path="/admin-product-management" element={<Navigate to="/admin/products" replace />} />
            </Route>

            {/* ── Customer routes (role: CUSTOMER) ── */}
            <Route element={<ProtectedRoute allowedRoles={['CUSTOMER', 'USER']} />}>
              <Route path="/customer" element={<Navigate to="/customer/dashboard" replace />} />
              <Route path="/customer/dashboard" element={<CustomerDashboardPage />} />
              <Route path="/customer/projects" element={<CustomerProjectListPage />} />
              <Route path="/customer/projects/:projectId/edit" element={<CustomerProjectInformationPage />} />
              <Route path="/customer/project-request" element={<CustomerProjectRequestPage />} />
              <Route path="/customer/tracking" element={<Tracking />} />
              <Route path="/customer/schedules" element={<CustomerSchedulesPage />} />
              <Route path="/customer/proposals" element={<CustomerProposalDetailPage />} />
              <Route path="/customer/proposals/:proposalId" element={<CustomerProposalDetailPage />} />
              <Route path="/customer/quotations" element={<CustomerQuotationsPage />} />
              <Route path="/customer/orders" element={<CustomerOrdersPage />} />
              <Route path="/customer/profile" element={<UserProfilePage />} />
              <Route path="/customer/projects/:projectId/feedback" element={<ProjectFeedback />} />
              <Route path="/customer/3d-preview" element={<Customer3dPreviewPage />} />
              <Route path="/customer/chat" element={<CustomerChatPage />} />
              {/* Customer legacy redirects */}
              <Route path="/customer-dashboard" element={<Navigate to="/customer/dashboard" replace />} />
              <Route path="/customer-3d-preview" element={<Navigate to="/customer/3d-preview" replace />} />
              <Route path="/customer-projects" element={<Navigate to="/customer/projects" replace />} />
              <Route path="/customer-project-request" element={<Navigate to="/customer/project-request" replace />} />
              <Route path="/customer-tracking" element={<Navigate to="/customer/tracking" replace />} />
              <Route path="/customer-schedules" element={<Navigate to="/customer/schedules" replace />} />
              <Route path="/customer-proposal-detail" element={<Navigate to="/customer/proposals" replace />} />
              <Route path="/customer-chat" element={<Navigate to="/customer/chat" replace />} />
            </Route>

            {/* ── Sales routes (role: SALE) ── */}
            <Route element={<ProtectedRoute allowedRoles={['SALE']} />}>
              <Route path="/sale" element={<Navigate to="/sales/dashbroad" replace />} />
              <Route path="/sale/dashbroad" element={<Navigate to="/sales/dashbroad" replace />} />
              <Route path="/sales" element={<Navigate to="/sales/project-requests" replace />} />
              <Route path="/sales/dashbroad" element={<SaleDashbroad />} />
              <Route path="/sales/project-requests" element={<ProjectRequestQueue />} />
              <Route path="/sales/assigned-projects" element={<AssignedProjects />} />
              <Route path="/sales/assigned-projects/:projectId" element={<ProjectDetail />} />
              <Route path="/sales/schedules" element={<SaleSchedules />} />
              <Route path="/sales/quotations" element={<SaleQuotations />} />
              <Route path="/sales/orders" element={<SaleOrders />} />
              <Route path="/sales/project-requests/:projectId" element={<ProjectDetail />} />
            </Route>

            {/* Designer routes (role: DESIGNER) */}
            <Route element={<ProtectedRoute allowedRoles={['DESIGNER']} />}>
              <Route path="/designer" element={<Navigate to="/designer/dashbroad" replace />} />
              <Route path="/designer/dashbroad" element={<DesignerDashbroad />} />
              <Route path="/designer/assigned-projects" element={<DesignerAssignedProjects />} />
              <Route path="/designer/assigned-projects/:projectId" element={<DesignerProjectDetail />} />
              <Route path="/designer/product-library" element={<DesignerProductLibrary />} />
              <Route path="/designer/product-library/:productId/versions/create" element={<DesignerCreateProductVersionPage />} />
              <Route path="/designer/schedules" element={<DesignerSchedules />} />
            </Route>

            {/* Production routes (role: PRODUCTION) */}
            <Route element={<ProtectedRoute allowedRoles={['PRODUCTION']} />}>
              <Route path="/production" element={<Navigate to="/production/dashboard" replace />} />
              <Route path="/production/dashboard" element={<ProductionDashbroad />} />
              <Route path="/production/dashbroad" element={<ProductionDashbroad />} />
              <Route path="/production/customization-reviews" element={<ProductionCustomizationRequests />} />
              <Route path="/production/customization-requests" element={<ProductionCustomizationRequests />} />
              <Route path="/production/requests" element={<ProductionRequests />} />
              <Route path="/production/requests/:productionRequestId" element={<ProductionRequestDetail />} />
              <Route path="/production/my-tasks" element={<MyProductionTasks />} />
              <Route path="/production/blocked-issues" element={<BlockedIssues />} />
              <Route path="/production/ready-for-delivery" element={<ReadyForDelivery />} />
              <Route path="/production/settings" element={<Navigate to="/production/dashboard" replace />} />
            </Route>

            <Route path="/viewer3d" element={<ViewerDemoPage />} />
            <Route path="/3d-lab" element={<ThreeDTestPage />} />
            <Route path="/3d-building-test" element={<BuildingThreeDTestPage />} />
            <Route path="/3d-building-test/blueprint" element={<BuildingBlueprintTestPage />} />
            <Route path="/proposal-scenes/:sceneId/room-planner" element={<ThreeDTestPage />} />

            <Route path="/designer" element={<Navigate to="/designer/assigned-projects" replace />} />
            <Route path="/designer/assigned-projects" element={<DesignerAssignedProjects />} />
            <Route path="/designer/projects/:projectId/proposals/new" element={<DesignerProposalWorkspace />} />
            <Route path="/designer/projects/:projectId/proposals/:proposalId" element={<DesignerProposalWorkspace />} />

            <Route path="/customer" element={<Navigate to="/customer/dashboard" replace />} />
            <Route path="/customer/dashboard" element={<CustomerDashboardPage />} />
            <Route path="/customer/projects" element={<CustomerProjectListPage />} />
            <Route path="/customer/projects/:projectId/edit" element={<CustomerProjectInformationPage />} />
            <Route path="/customer/project-request" element={<CustomerProjectRequestPage />} />
            <Route path="/customer/tracking" element={<Tracking />} />
            <Route path="/customer/proposals" element={<CustomerProposalDetailPage />} />
            <Route path="/customer/proposals/:proposalId" element={<CustomerProposalDetailPage />} />
            <Route path="/customer/quotations" element={<CustomerQuotationsPage />} />
            <Route path="/customer/orders" element={<CustomerOrdersPage />} />
            <Route path="/customer/profile" element={<UserProfilePage />} />
            <Route path="/customer/projects/:projectId/feedback" element={<ProjectFeedback />} />
            <Route path="/customer/3d-preview" element={<Customer3dPreviewPage />} />
            <Route path="/customer-dashboard" element={<Navigate to="/customer/dashboard" replace />} />
            <Route path="/customer-3d-preview" element={<Navigate to="/customer/3d-preview" replace />} />
            <Route path="/customer-projects" element={<Navigate to="/customer/projects" replace />} />
            <Route path="/customer-project-request" element={<Navigate to="/customer/project-request" replace />} />
            <Route path="/customer-tracking" element={<Navigate to="/customer/tracking" replace />} />
            <Route path="/customer-proposal-detail" element={<Navigate to="/customer/proposals" replace />} />
            
            <Route path="/admin" element={<Navigate to="/admin/dashbroad" replace />} />
            <Route path="/admin/dashbroad" element={<AdminDashbroad />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/categories" element={<Categorymanagement />} />
            <Route path="/admin/products" element={<Productmanagement />} />
            <Route path="/admin/products/create" element={<CreateProductPage />} />
            <Route path="/admin/products/:productId/versions" element={<ProductVersionManagement />} />
            <Route path="/admin/products/:productId/versions/create" element={<CreateProductVersionPage />} />
            <Route path="/admin/products/:productId/versions/:productVersionId/edit" element={<CreateProductVersionPage />} />
            <Route path="/admin/projects" element={<AdminProjects />} />
            <Route path="/admin/catalog/models" element={<CatalogModelManagementPage />} />
            <Route path="/admin/catalog/models/workspace/:productId/:productVersionId" element={<ProductModelWorkspacePage />} />
            <Route path="/admin/3d-lab" element={<AdminThreeDLabPage />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/admin-dashbroad" element={<Navigate to="/admin/dashbroad" replace />} />
            <Route path="/admin-user-management" element={<Navigate to="/admin/users" replace />} />
            <Route path="/admin-category-management" element={<Navigate to="/admin/categories" replace />} />
            <Route path="/admin-product-management" element={<Navigate to="/admin/products" replace />} />
            
            <Route path="/sale" element={<Navigate to="/sales/dashbroad" replace />} />
            <Route path="/sale/dashbroad" element={<Navigate to="/sales/dashbroad" replace />} />
            <Route path="/sales" element={<Navigate to="/sales/project-requests" replace />} />
            <Route path="/sales/dashbroad" element={<SaleDashbroad />} />
            <Route path="/sales/project-requests" element={<ProjectRequestQueue />} />
            <Route path="/sales/assigned-projects" element={<AssignedProjects />} />
            <Route path="/sales/assigned-projects/:projectId" element={<ProjectDetail />} />
            <Route path="/sales/schedules" element={<SaleSchedules />} />
            <Route path="/sales/quotations" element={<SaleQuotations />} />
            <Route path="/sales/orders" element={<SaleOrders />} />
            <Route path="/sales/project-requests/:projectId" element={<ProjectDetail />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </TileTransitionProvider>
        </BrowserRouter>
        </LangProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
