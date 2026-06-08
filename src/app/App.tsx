import { QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { queryClient } from '@/app/providers/queryClient';
import { theme } from '@/app/providers/theme';
import { CustomerDashboardPage } from '@/features/customerDashboard';
import { CustomerProjectListPage } from '@/features/customerProjectList';
import { CustomerProjectRequestPage } from '@/features/customerProjectRequest';
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
            <Route path="/customer-projects" element={<CustomerProjectListPage />} />
            <Route path="/customer-project-request" element={<CustomerProjectRequestPage />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/product-detail" element={<ProductDetailPage />} />
            <Route path="/product-list-preview" element={<ProductListPreviewPage />} />
            <Route path="/project-detail" element={<ProjectDetailPage />} />
            <Route path="/project-list-review" element={<ProjectListReviewPage />} />
            <Route path="/viewer3d" element={<ViewerDemoPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
