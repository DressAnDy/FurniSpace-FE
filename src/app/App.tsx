import { QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { queryClient } from '@/app/providers/queryClient';
import { theme } from '@/app/providers/theme';
import { Customer3dPreviewPage } from '@/features/customer3dPreview';
import { CustomerDashboardPage } from '@/features/customerDashboard';
import { CustomerProjectListPage } from '@/features/customerProjectList';
import { CustomerProjectRequestPage } from '@/features/customerProjectRequest';
import { CustomerProposalDetailPage } from '@/features/customerProposalDetail';
import { AdminDashbroad } from '@/features/AdminPages/AdminDashbroad';
import { Categorymanagement } from '@/features/AdminPages/Categorymanagement';
import { CreateProductPage, CreateProductVersionPage, Productmanagement, ProductVersionManagement } from '@/features/AdminPages/Productmanagement';
import { UserManagement } from '@/features/AdminPages/UserManagement';
import { HomePage } from '@/features/home';
import { ProductDetailPage } from '@/features/productDetail';
import { ProductListPreviewPage } from '@/features/productListPreview';
import { ProjectDetailPage } from '@/features/projectDetail';
import { ProjectListReviewPage } from '@/features/projectListReview';
import { ViewerDemoPage } from '@/features/viewer3d';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/customer-dashboard" element={<CustomerDashboardPage />} />
            <Route path="/customer-3d-preview" element={<Customer3dPreviewPage />} />
            <Route path="/customer-projects" element={<CustomerProjectListPage />} />
            <Route path="/customer-project-request" element={<CustomerProjectRequestPage />} />
            <Route path="/customer-proposal-detail" element={<CustomerProposalDetailPage />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/product-detail" element={<ProductDetailPage />} />
            <Route path="/product-list-preview" element={<ProductListPreviewPage />} />
            <Route path="/project-detail" element={<ProjectDetailPage />} />
            <Route path="/project-list-review" element={<ProjectListReviewPage />} />
            <Route path="/viewer3d" element={<ViewerDemoPage />} />
            
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
