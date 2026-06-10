import { IconEdit, IconEye, IconKey, IconSearch, IconTrash, IconUser } from '@tabler/icons-react';

import { AdminNavbar, AdminSidebar } from '../admincomponents';
import './UserManagement.css';

const users = [
  {
    id: 'ACC-001',
    name: 'John Smith',
    email: 'john.smith@example.com',
    phone: '+1-555-0101',
    role: 'Admin',
    status: 'ACTIVE',
    createdAt: '2024-01-15',
  },
  {
    id: 'ACC-002',
    name: 'Sarah Johnson',
    email: 'sarah.j@example.com',
    phone: '+1-555-0102',
    role: 'Sales Consultant',
    status: 'ACTIVE',
    createdAt: '2024-01-20',
  },
  {
    id: 'ACC-003',
    name: 'Michael Chen',
    email: 'm.chen@example.com',
    phone: '+1-555-0103',
    role: 'Designer',
    status: 'ACTIVE',
    createdAt: '2024-02-05',
  },
  {
    id: 'ACC-004',
    name: 'Emily Davis',
    email: 'emily.d@example.com',
    phone: '+1-555-0104',
    role: 'Production Manager',
    status: 'ACTIVE',
    createdAt: '2024-02-10',
  },
  {
    id: 'ACC-005',
    name: 'David Wilson',
    email: 'd.wilson@example.com',
    phone: '+1-555-0105',
    role: 'Customer',
    status: 'ACTIVE',
    createdAt: '2024-02-15',
  },
  {
    id: 'ACC-006',
    name: 'Lisa Anderson',
    email: 'l.anderson@example.com',
    phone: '+1-555-0106',
    role: 'Sales Consultant',
    status: 'SUSPENDED',
    createdAt: '2024-03-01',
  },
];

export function UserManagement() {
  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <AdminSidebar activeLabel="User & Role Management" />

        <section className="admin-main">
          <AdminNavbar />

          <div className="admin-content user-management-content">
            <div className="admin-page-heading user-management-heading">
              <div>
                <h2>User & Role Management</h2>
                <p>Manage user accounts, roles, and permissions</p>
              </div>
              <button className="admin-button admin-button-primary" type="button">
                Create Staff Account
              </button>
            </div>

            <section className="admin-card user-management-card">
              <div className="user-management-tools">
                <label className="admin-search user-management-search">
                  <IconSearch size={18} />
                  <input placeholder="Search users..." type="search" />
                </label>
                <div className="user-management-placeholder user-management-placeholder-large" />
                <div className="user-management-placeholder user-management-placeholder-small" />
              </div>

              <div className="admin-table-wrap">
                <table className="user-management-table">
                  <thead>
                    <tr>
                      <th>Account ID</th>
                      <th>Full Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Created At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="user-management-id">{user.id}</td>
                        <td>
                          <div className="user-management-user">
                            <div className="user-management-avatar">
                              <IconUser size={16} />
                            </div>
                            <span>{user.name}</span>
                          </div>
                        </td>
                        <td>{user.email}</td>
                        <td>{user.phone}</td>
                        <td>
                          <span className="user-management-role">{user.role}</span>
                        </td>
                        <td>
                          <span className={`user-management-status user-management-status-${user.status.toLowerCase()}`}>{user.status}</span>
                        </td>
                        <td>{user.createdAt}</td>
                        <td>
                          <div className="user-management-actions">
                            <button type="button" aria-label={`Edit ${user.name}`}>
                              <IconEdit size={16} />
                            </button>
                            <button type="button" aria-label={`View ${user.name}`}>
                              <IconEye size={16} />
                            </button>
                            <button type="button" aria-label={`Reset key for ${user.name}`}>
                              <IconKey size={16} />
                            </button>
                            <button type="button" aria-label={`Delete ${user.name}`}>
                              <IconTrash size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

export default UserManagement;
