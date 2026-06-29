import { type FormEvent, useMemo, useState } from 'react';
import { IconBriefcase, IconEdit, IconEye, IconPlus, IconSearch, IconTrash, IconUser, IconUsers, IconX } from '@tabler/icons-react';

import {
  ACCOUNT_ROLE_OPTIONS,
  ACCOUNT_STATUS_OPTIONS,
  getAccountRoleName,
  getAccountServiceResultMessage,
  normalizeAccountOptionalText,
  normalizeAccountRequiredText,
  type AccountDto,
  type AccountStatus,
} from '@/services/api';
import {
  useAccountList,
  useAdminAccountDetail,
  useCreateAccount,
  useDeleteAccount,
  useUpdateAccount,
} from '@/services/queries';

import { AdminNavbar, AdminSidebar } from '../admincomponents';
import './UserManagement.css';

type AccountFormMode = 'create' | 'edit';

export function UserManagement() {
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<AccountStatus | ''>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountDto | null>(null);
  const [viewingAccountId, setViewingAccountId] = useState<string | null>(null);

  const accountListQuery = useAccountList({
    page: 1,
    pageSize: 100,
    search: searchValue,
    status: statusFilter || null,
    includeDeleted: false,
  });
  const accountDetailQuery = useAdminAccountDetail(viewingAccountId ?? undefined);
  const createAccountMutation = useCreateAccount();
  const updateAccountMutation = useUpdateAccount();
  const deleteAccountMutation = useDeleteAccount();

  const accounts = accountListQuery.data?.items ?? [];
  const totalAccounts = accountListQuery.data?.totalItems ?? accounts.length;
  const roleStats = useMemo(() => {
    const countRole = (roleName: string) =>
      accounts.filter((account) => getAccountRoleName(account.roleId).toUpperCase() === roleName).length;

    return [
      { label: 'Customer', value: countRole('CUSTOMER'), icon: IconUsers, tone: 'blue' },
      { label: 'Saler', value: countRole('SALES'), icon: IconBriefcase, tone: 'gold' },
      { label: 'Design', value: countRole('DESIGNER'), icon: IconEdit, tone: 'violet' },
    ];
  }, [accounts]);
  const isFormOpen = isCreateModalOpen || Boolean(editingAccount);
  const formMode: AccountFormMode = editingAccount ? 'edit' : 'create';
  const isSubmitting = createAccountMutation.isPending || updateAccountMutation.isPending;
  const formError = editingAccount
    ? updateAccountMutation.isError
      ? getAccountServiceResultMessage(updateAccountMutation.error)
      : null
    : createAccountMutation.isError
      ? getAccountServiceResultMessage(createAccountMutation.error)
      : null;

  const openCreateModal = () => {
    createAccountMutation.reset();
    updateAccountMutation.reset();
    setEditingAccount(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (account: AccountDto) => {
    createAccountMutation.reset();
    updateAccountMutation.reset();
    setIsCreateModalOpen(false);
    setEditingAccount(account);
  };

  const closeFormModal = () => {
    setIsCreateModalOpen(false);
    setEditingAccount(null);
    createAccountMutation.reset();
    updateAccountMutation.reset();
  };

  const handleSubmitAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const roleId = normalizeAccountRequiredText(formData.get('roleId'));
    const email = normalizeAccountRequiredText(formData.get('email'));
    const fullName = normalizeAccountRequiredText(formData.get('fullName'));
    const status = normalizeAccountRequiredText(formData.get('status')) as AccountStatus;

    if (!roleId || !email || !fullName || !status) {
      return;
    }

    try {
      if (editingAccount) {
        await updateAccountMutation.mutateAsync({
          accountId: editingAccount.accountId,
          roleId,
          email,
          fullName,
          phone: normalizeAccountOptionalText(formData.get('phone')),
          avatarUrl: normalizeAccountOptionalText(formData.get('avatarUrl')),
          status,
        });
      } else {
        const passwordHash = normalizeAccountRequiredText(formData.get('passwordHash'));

        if (!passwordHash) {
          return;
        }

        await createAccountMutation.mutateAsync({
          roleId,
          email,
          passwordHash,
          fullName,
          phone: normalizeAccountOptionalText(formData.get('phone')),
          avatarUrl: normalizeAccountOptionalText(formData.get('avatarUrl')),
          status,
        });
      }

      closeFormModal();
    } catch {
      // Error state is rendered from React Query mutation.
    }
  };

  const handleDeleteAccount = async (account: AccountDto) => {
    const shouldDelete = window.confirm(`Delete account ${account.email}? This will soft delete the account and set it inactive.`);

    if (!shouldDelete) {
      return;
    }

    try {
      await deleteAccountMutation.mutateAsync(account.accountId);
    } catch {
      // Error state is rendered below the toolbar.
    }
  };

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
                <p>Manage user accounts, roles, and account status from backend API.</p>
              </div>
              <button className="admin-button admin-button-primary" type="button" onClick={openCreateModal}>
                <IconPlus size={16} />
                Create Staff Account
              </button>
            </div>

            <section className="user-role-stat-grid" aria-label="Role overview">
              {roleStats.map(({ label, value, icon: Icon, tone }) => (
                <article key={label} className="user-role-stat-card">
                  <div className="user-role-stat-copy">
                    <span>{label}</span>
                    <strong>{value}</strong>
                    <p>Accounts in current view</p>
                  </div>
                  <div className={`user-role-stat-icon admin-tone-${tone}`}>
                    <Icon size={22} />
                  </div>
                </article>
              ))}
            </section>

            <section className="admin-card user-management-card">
              <div className="user-management-tools">
                <label className="admin-search user-management-search">
                  <IconSearch size={18} />
                  <input
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder="Search by email, name, or phone..."
                    type="search"
                  />
                </label>

                <label className="user-management-filter">
                  <span>Status</span>
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as AccountStatus | '')}>
                    <option value="">All statuses</option>
                    {ACCOUNT_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="user-management-total">
                  <span>Total</span>
                  <strong>{totalAccounts}</strong>
                </div>
              </div>

              {accountListQuery.isLoading ? <div className="user-management-state">Loading accounts from API...</div> : null}

              {accountListQuery.isError ? (
                <div className="user-management-state user-management-state-error">
                  {getAccountServiceResultMessage(accountListQuery.error)}
                </div>
              ) : null}

              {deleteAccountMutation.isError ? (
                <div className="user-management-state user-management-state-error">
                  {getAccountServiceResultMessage(deleteAccountMutation.error)}
                </div>
              ) : null}

              {!accountListQuery.isLoading && !accountListQuery.isError && accounts.length === 0 ? (
                <div className="user-management-state">No accounts found.</div>
              ) : null}

              {!accountListQuery.isLoading && !accountListQuery.isError && accounts.length > 0 ? (
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
                      {accounts.map((account) => (
                        <tr key={account.accountId}>
                          <td className="user-management-id" title={account.accountId}>
                            {shortenId(account.accountId)}
                          </td>
                          <td>
                            <div className="user-management-user">
                              <div className="user-management-avatar">
                                {account.avatarUrl ? <img src={account.avatarUrl} alt="" /> : <IconUser size={16} />}
                              </div>
                              <span>{account.fullName}</span>
                            </div>
                          </td>
                          <td>{account.email}</td>
                          <td>{account.phone ?? '-'}</td>
                          <td>
                            <span className="user-management-role">{getAccountRoleName(account.roleId)}</span>
                          </td>
                          <td>
                            <span className={`user-management-status user-management-status-${(account.status ?? 'inactive').toLowerCase()}`}>
                              {account.status ?? 'INACTIVE'}
                            </span>
                          </td>
                          <td>{formatDate(account.createdAt)}</td>
                          <td>
                            <div className="user-management-actions">
                              <button type="button" aria-label={`Edit ${account.fullName}`} title="Edit account" onClick={() => openEditModal(account)}>
                                <IconEdit size={16} />
                              </button>
                              <button
                                type="button"
                                aria-label={`View ${account.fullName}`}
                                title="View admin detail"
                                onClick={() => setViewingAccountId(account.accountId)}
                              >
                                <IconEye size={16} />
                              </button>
                              <button
                                type="button"
                                aria-label={`Delete ${account.fullName}`}
                                title="Soft delete account"
                                disabled={deleteAccountMutation.isPending}
                                onClick={() => handleDeleteAccount(account)}
                              >
                                <IconTrash size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>
          </div>
        </section>
      </div>

      <AccountFormModal
        isOpen={isFormOpen}
        mode={formMode}
        account={editingAccount}
        isSubmitting={isSubmitting}
        errorMessage={formError}
        onClose={closeFormModal}
        onSubmit={handleSubmitAccount}
      />

      {viewingAccountId ? (
        <AccountDetailModal
          isLoading={accountDetailQuery.isLoading}
          errorMessage={accountDetailQuery.isError ? getAccountServiceResultMessage(accountDetailQuery.error) : null}
          account={accountDetailQuery.data}
          onClose={() => setViewingAccountId(null)}
        />
      ) : null}
    </main>
  );
}

type AccountFormModalProps = {
  isOpen: boolean;
  mode: AccountFormMode;
  account: AccountDto | null;
  isSubmitting: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function AccountFormModal({ isOpen, mode, account, isSubmitting, errorMessage, onClose, onSubmit }: AccountFormModalProps) {
  if (!isOpen) {
    return null;
  }

  const title = mode === 'edit' ? 'Edit Account' : 'Create Account';
  const submitLabel = mode === 'edit' ? 'Save Changes' : 'Create Account';

  return (
    <div className="user-modal-overlay">
      <form className="user-modal-panel" onSubmit={onSubmit}>
        <div className="user-modal-header">
          <div>
            <h2>{title}</h2>
            <p>Account CRUD follows the backend /api/Accounts contract.</p>
          </div>
          <button className="user-modal-icon-button" type="button" aria-label="Close account form" onClick={onClose}>
            <IconX size={18} />
          </button>
        </div>

        <div className="user-modal-grid">
          <label className="user-modal-field">
            <span>Full Name *</span>
            <input defaultValue={account?.fullName ?? ''} maxLength={100} name="fullName" required type="text" />
          </label>

          <label className="user-modal-field">
            <span>Email *</span>
            <input defaultValue={account?.email ?? ''} maxLength={100} name="email" required type="email" />
          </label>

          {mode === 'create' ? (
            <label className="user-modal-field">
              <span>Password *</span>
              <input maxLength={255} name="passwordHash" required type="text" />
            </label>
          ) : null}

          <label className="user-modal-field">
            <span>Phone</span>
            <input defaultValue={account?.phone ?? ''} maxLength={20} name="phone" type="tel" />
          </label>

          <label className="user-modal-field">
            <span>Role *</span>
            <select defaultValue={account?.roleId ?? ACCOUNT_ROLE_OPTIONS[1].roleId} name="roleId" required>
              {ACCOUNT_ROLE_OPTIONS.map((role) => (
                <option key={role.roleId} value={role.roleId}>
                  {role.roleName}
                </option>
              ))}
            </select>
          </label>

          <label className="user-modal-field">
            <span>Status *</span>
            <select defaultValue={account?.status ?? 'ACTIVE'} name="status" required>
              {ACCOUNT_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="user-modal-field user-modal-field-full">
            <span>Avatar URL</span>
            <input defaultValue={account?.avatarUrl ?? ''} name="avatarUrl" type="url" />
          </label>
        </div>



        {errorMessage ? <p className="user-modal-error">{errorMessage}</p> : null}

        <div className="user-modal-actions">
          <button className="user-modal-secondary" type="button" disabled={isSubmitting} onClick={onClose}>
            Cancel
          </button>
          <button className="user-modal-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

type AccountDetailModalProps = {
  isLoading: boolean;
  errorMessage: string | null;
  account?: {
    accountId: string;
    email: string;
    fullName: string;
    phone: string | null;
    avatarUrl: string | null;
    role: {
      roleName: string;
      description?: string | null;
    };
    status: AccountStatus | null;
    createdAt: string | null;
    updatedAt: string | null;
    deletedAt: string | null;
  };
  onClose: () => void;
};

function AccountDetailModal({ isLoading, errorMessage, account, onClose }: AccountDetailModalProps) {
  return (
    <div className="user-modal-overlay">
      <div className="user-modal-panel user-detail-panel">
        <div className="user-modal-header">
          <div>
            <h2>Account Detail</h2>
            <p>Loaded from /admin/accounts/:accountId.</p>
          </div>
          <button className="user-modal-icon-button" type="button" aria-label="Close account detail" onClick={onClose}>
            <IconX size={18} />
          </button>
        </div>

        {isLoading ? <div className="user-management-state">Loading account detail...</div> : null}
        {errorMessage ? <div className="user-management-state user-management-state-error">{errorMessage}</div> : null}

        {!isLoading && !errorMessage && account ? (
          <div className="user-detail-grid">
            <DetailItem label="Account ID" value={account.accountId} />
            <DetailItem label="Full Name" value={account.fullName} />
            <DetailItem label="Email" value={account.email} />
            <DetailItem label="Phone" value={account.phone ?? '-'} />
            <DetailItem label="Role" value={account.role.roleName} />
            <DetailItem label="Role Description" value={account.role.description ?? '-'} />
            <DetailItem label="Status" value={account.status ?? 'INACTIVE'} />
            <DetailItem label="Created At" value={formatDateTime(account.createdAt)} />
            <DetailItem label="Updated At" value={formatDateTime(account.updatedAt)} />
            <DetailItem label="Deleted At" value={formatDateTime(account.deletedAt)} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="user-detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function shortenId(value: string) {
  return value.length > 12 ? `${value.slice(0, 8)}...` : value;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default UserManagement;
