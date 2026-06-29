import { Navigate, Outlet } from 'react-router-dom';

import { isAuthPreviewBypassEnabled } from '@/shared/config/authPreview';
import { useCurrentUser } from '@/services/queries';

type ProtectedRouteProps = {
  /**
   * Danh sách role được phép truy cập (so khớp dạng includes, không phân biệt hoa thường).
   * Nếu không truyền → chỉ cần đăng nhập, không kiểm tra role.
   */
  allowedRoles?: string[];
};

/**
 * Bảo vệ nhóm route con:
 * 1. Chưa có token  → redirect /Home
 * 2. Token hợp lệ, đang fetch  → hiện màn hình loading
 * 3. Token không hợp lệ (401)  → redirect /Home
 * 4. Đúng role  → render <Outlet />
 * 5. Sai role   → redirect /
 */
export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const authPreviewBypassEnabled = isAuthPreviewBypassEnabled();
  const { data: user, isLoading, isError } = useCurrentUser({ enabled: !authPreviewBypassEnabled });

  if (authPreviewBypassEnabled) {
    return <Outlet />;
  }

  if (isLoading) {
    return (
      <div className="auth-loading" role="status" aria-label="Đang tải...">
        <span className="auth-loading-spinner" />
      </div>
    );
  }

  if (isError || !user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const normalizedRole = normalizeRole(user.role);
    const hasRole = allowedRoles.some((r) => normalizedRole.includes(r.toUpperCase()));

    if (!hasRole) {
      return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
}

function normalizeRole(role?: string) {
  return (role ?? '').trim().replace(/[\s-]+/g, '_').toUpperCase();
}
