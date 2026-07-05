import { AdminSidebar } from '@/features/AdminPages/admincomponents';
import { ThreeDTestPage } from '@/features/ThreeD/pages/ThreeDTestPage';

import '@/features/AdminPages/AdminDashbroad/AdminDashbroad.css';
import './AdminThreeDLabPage.css';

export function AdminThreeDLabPage() {
  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <AdminSidebar activeLabel="3D Lab" />

        <section className="admin-main admin-three-d-lab-main">
          <div className="admin-three-d-lab-content">
            <ThreeDTestPage />
          </div>
        </section>
      </div>
    </main>
  );
}
