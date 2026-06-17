import { QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { queryClient } from '@/app/providers/queryClient';
import { theme } from '@/app/providers/theme';
import { CodeVerifyPage, LoginPage, RegisterPage } from '@/features/auth';
import { AdminDashbroad } from '@/features/AdminPages/AdminDashbroad';
import { Categorymanagement } from '@/features/AdminPages/Categorymanagement';
import { CreateProductPage, CreateProductVersionPage, Productmanagement, ProductVersionManagement } from '@/features/AdminPages/Productmanagement';
import { UserManagement } from '@/features/AdminPages/UserManagement';
import { Customer3dPreviewPage } from '@/features/CustomerPages/customer3dPreview';
import { CustomerDashboardPage } from '@/features/CustomerPages/customerDashboard';
import { CustomerProjectListPage } from '@/features/CustomerPages/customerProjectList';
import { CustomerProjectRequestPage } from '@/features/CustomerPages/customerProjectRequest';
import { CustomerProposalDetailPage } from '@/features/CustomerPages/customerProposalDetail';
import { HomePage } from '@/features/MainPages/home';
import { ProductDetailPage } from '@/features/MainPages/productDetail';
import { ProductListPreviewPage } from '@/features/MainPages/productListPreview';
import { ProjectDetailPage } from '@/features/MainPages/projectDetail';
import { ProjectListReviewPage } from '@/features/MainPages/projectListReview';
import { ProjectDetail } from '@/features/SalePages/ProjectDetail';
import { ProjectRequestQueue } from '@/features/SalePages/ProjectRequestQueue';
import { AssignedProjects } from '@/features/SalePages/AssignedProjects';
import { SaleQuotations } from '@/features/SalePages/SaleQuotations';
import { SaleSchedules } from '@/features/SalePages/SaleSchedules';
import { SaleDashbroad } from '@/features/SalePages/SaleDashbroad';
import { ThreeDTestPage } from '@/features/ThreeD/pages/ThreeDTestPage';
import { ViewerDemoPage } from '@/features/viewer3d';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/code-verify" element={<CodeVerifyPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/products" element={<ProductListPreviewPage />} />
            <Route path="/products/detail" element={<ProductDetailPage />} />
            <Route path="/projects" element={<ProjectListReviewPage />} />
            <Route path="/projects/detail" element={<ProjectDetailPage />} />
            <Route path="/product-detail" element={<Navigate to="/products/detail" replace />} />
            <Route path="/product-list-preview" element={<Navigate to="/products" replace />} />
            <Route path="/project-detail" element={<Navigate to="/projects/detail" replace />} />
            <Route path="/project-list-review" element={<Navigate to="/projects" replace />} />
            <Route path="/viewer3d" element={<ViewerDemoPage />} />
            <Route path="/3d-lab" element={<ThreeDTestPage />} />

            <Route path="/customer" element={<Navigate to="/customer/dashboard" replace />} />
            <Route path="/customer/dashboard" element={<CustomerDashboardPage />} />
            <Route path="/customer/projects" element={<CustomerProjectListPage />} />
            <Route path="/customer/project-request" element={<CustomerProjectRequestPage />} />
            <Route path="/customer/proposals" element={<CustomerProposalDetailPage />} />
            <Route path="/customer/3d-preview" element={<Customer3dPreviewPage />} />
            <Route path="/customer-dashboard" element={<Navigate to="/customer/dashboard" replace />} />
            <Route path="/customer-3d-preview" element={<Navigate to="/customer/3d-preview" replace />} />
            <Route path="/customer-projects" element={<Navigate to="/customer/projects" replace />} />
            <Route path="/customer-project-request" element={<Navigate to="/customer/project-request" replace />} />
            <Route path="/customer-proposal-detail" element={<Navigate to="/customer/proposals" replace />} />
            
            <Route path="/admin" element={<Navigate to="/admin/dashbroad" replace />} />
            <Route path="/admin/dashbroad" element={<AdminDashbroad />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/categories" element={<Categorymanagement />} />
            <Route path="/admin/products" element={<Productmanagement />} />
            <Route path="/admin/products/create" element={<CreateProductPage />} />
            <Route path="/admin/products/:productId/versions" element={<ProductVersionManagement />} />
            <Route path="/admin/products/:productId/versions/create" element={<CreateProductVersionPage />} />
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
            <Route path="/sales/project-requests/:projectId" element={<ProjectDetail />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
