import { type Dispatch, type FormEvent, type SetStateAction, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  IconChevronRight,
  IconCreditCard,
  IconEdit,
  IconHome,
  IconKey,
  IconLock,
  IconMail,
  IconPhone,
  IconShieldCheck,
  IconUser,
} from '@tabler/icons-react';

import { MainNavbar } from '@/features/MainPages/maincomponents';
import { getServiceResultMessage } from '@/services/api/auth';
import {
  getPaymentServiceResultMessage,
  type PaymentDto,
  type PaymentStatus,
  type PaymentType,
} from '@/services/api/payments';
import { useChangePassword, useCurrentUser, usePayments, useProjectList, useUpdateCurrentUser } from '@/services/queries';
import { SiteFooter } from '@/shared/components';

import './UserProfilePage.css';

type ProfileTab = 'profile' | 'security' | 'payments';

const sidebarItems: Array<{
  id: ProfileTab;
  icon: typeof IconUser;
  label: string;
}> = [
  { id: 'profile', icon: IconUser, label: 'Thong tin ca nhan' },
  { id: 'security', icon: IconKey, label: 'Bao mat' },
  { id: 'payments', icon: IconCreditCard, label: 'Thanh toan' },
];

type ProfileFormState = {
  fullName: string;
  phone: string;
};

type PasswordFormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type PaymentFilterState = {
  status: '' | PaymentStatus;
  paymentType: '' | PaymentType;
  from: string;
  to: string;
};

const PAYMENT_PAGE_SIZE = 8;

const paymentStatusOptions: Array<{ label: string; value: '' | PaymentStatus }> = [
  { label: 'Tat ca trang thai', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Paid', value: 'PAID' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'Expired', value: 'EXPIRED' },
  { label: 'Refunded', value: 'REFUNDED' },
];

const paymentTypeOptions: Array<{ label: string; value: '' | PaymentType }> = [
  { label: 'Tat ca loai', value: '' },
  { label: 'Start fee', value: 'PROJECT_START_FEE' },
  { label: 'Deposit', value: 'DEPOSIT' },
  { label: 'Remaining', value: 'REMAINING_PAYMENT' },
];

export function UserProfilePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUserQuery = useCurrentUser();
  const user = currentUserQuery.data;
  const projectsSummaryQuery = useProjectList({ page: 1, limit: 1 }, { enabled: Boolean(user?.accountId) });
  const updateProfileMutation = useUpdateCurrentUser();
  const changePasswordMutation = useChangePassword();
  const [activeTab, setActiveTab] = useState<ProfileTab>(() => getProfileTabFromSearch(searchParams));
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentFilters, setPaymentFilters] = useState<PaymentFilterState>({
    from: '',
    paymentType: '',
    status: '',
    to: '',
  });
  const [profileForm, setProfileForm] = useState<ProfileFormState>({ fullName: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [profileMessage, setProfileMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [securityMessage, setSecurityMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const isLoading = currentUserQuery.isLoading;
  const paymentsQuery = usePayments(
    {
      from: paymentFilters.from || null,
      limit: PAYMENT_PAGE_SIZE,
      page: paymentPage,
      paymentType: paymentFilters.paymentType || null,
      status: paymentFilters.status || null,
      to: paymentFilters.to || null,
    },
    { enabled: activeTab === 'payments' && Boolean(user?.accountId) },
  );
  const displayName = getDisplayName(user?.fullName, user?.email, isLoading);
  const email = user?.email || 'Chua co email';
  const phone = user?.phone?.trim() || 'Chua cap nhat';
  const initials = getInitials(displayName);
  const overviewStats = useMemo(
    () => [
      { label: 'Trang thai', value: formatStatus(user?.status)},
      { label: 'Vai tro', value: formatRole(user?.role),  },
      {
        label: 'Tong du an',
        value: projectsSummaryQuery.isLoading ? '...' : String(projectsSummaryQuery.data?.total ?? 0),
      },
    ],
    [projectsSummaryQuery.data?.total, projectsSummaryQuery.isError, projectsSummaryQuery.isLoading, user?.role, user?.status],
  );

  useEffect(() => {
    if (!user) return;

    setProfileForm({
      fullName: user.fullName ?? '',
      phone: user.phone ?? '',
    });
  }, [user]);

  function changeTab(tab: ProfileTab) {
    setActiveTab(tab);
    setSearchParams(tab === 'profile' ? {} : { tab });
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileMessage(null);

    const fullName = profileForm.fullName.trim();
    const phoneValue = profileForm.phone.trim();

    if (!fullName) {
      setProfileMessage({ tone: 'error', text: 'Vui long nhap ho ten.' });
      return;
    }

    if (fullName.length > 100) {
      setProfileMessage({ tone: 'error', text: 'Ho ten khong duoc vuot qua 100 ky tu.' });
      return;
    }

    if (phoneValue.length > 20) {
      setProfileMessage({ tone: 'error', text: 'So dien thoai khong duoc vuot qua 20 ky tu.' });
      return;
    }

    try {
      const result = await updateProfileMutation.mutateAsync({
        fullName,
        phone: phoneValue || null,
      });
      setProfileMessage({ tone: 'success', text: result.message || 'Da cap nhat ho so.' });
    } catch (error) {
      setProfileMessage({ tone: 'error', text: getServiceResultMessage(error) });
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSecurityMessage(null);

    if (!passwordForm.currentPassword.trim()) {
      setSecurityMessage({ tone: 'error', text: 'Vui long nhap mat khau hien tai.' });
      return;
    }

    if (!isValidPassword(passwordForm.newPassword)) {
      setSecurityMessage({ tone: 'error', text: 'Mat khau moi phai dai 8-128 ky tu va co chu hoa, chu thuong, chu so.' });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setSecurityMessage({ tone: 'error', text: 'Mat khau moi va xac nhan mat khau chua khop.' });
      return;
    }

    try {
      const result = await changePasswordMutation.mutateAsync({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSecurityMessage({ tone: 'success', text: result.message || 'Da doi mat khau. Vui long dang nhap lai.' });
      window.setTimeout(() => navigate('/login', { replace: true }), 900);
    } catch (error) {
      setSecurityMessage({ tone: 'error', text: getServiceResultMessage(error) });
    }
  }

  return (
    <main className="user-profile-page">
      <MainNavbar activePath="/user-profile" classPrefix="user-profile" />

      <section className="user-profile-shell">
        <aside className="user-profile-sidebar" aria-label="User profile navigation">
          <div className="user-profile-sidebar-card">
            <Avatar avatarUrl={user?.avatarUrl} initials={initials} size="sm" />
            <div>
              <strong>{displayName}</strong>
              <p>{email}</p>
            </div>
          </div>

          <nav className="user-profile-sidebar-nav" aria-label="Profile sections">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  aria-current={isActive ? 'page' : undefined}
                  className={isActive ? 'user-profile-sidebar-link user-profile-sidebar-link-active' : 'user-profile-sidebar-link'}
                  key={item.id}
                  type="button"
                  onClick={() => changeTab(item.id)}
                >
                  <Icon size={18} stroke={1.8} />
                  <span>{item.label}</span>
                  <IconChevronRight size={16} stroke={1.8} />
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="user-profile-content">
          <section className="user-profile-hero">
            <div>
              <p className="user-profile-eyebrow">Tai khoan FurniSpace</p>
              <h1>{getProfileHeading(activeTab)}</h1>
            </div>
            <button className="user-profile-edit-button" type="button" onClick={() => changeTab(activeTab === 'profile' ? 'security' : 'profile')}>
              {activeTab === 'profile' ? <IconEdit size={18} stroke={1.8} /> : <IconUser size={18} stroke={1.8} />}
              <span>{activeTab === 'profile' ? 'Mo bao mat' : 'Xem ho so'}</span>
            </button>
          </section>

          {currentUserQuery.isError ? (
            <FormMessage tone="error">{getServiceResultMessage(currentUserQuery.error)}</FormMessage>
          ) : null}

          <section className="user-profile-overview">
            {overviewStats.map((stat) => (
              <article className="user-profile-stat" key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </article>
            ))}
          </section>

          {activeTab === 'profile' ? (
            <ProfileTabPanel
              avatarUrl={user?.avatarUrl}
              displayName={displayName}
              email={email}
              initials={initials}
              isLoading={isLoading}
              phone={phone}
              profileForm={profileForm}
              profileMessage={profileMessage}
              role={user?.role}
              status={user?.status}
              updateProfileMutation={updateProfileMutation}
              onProfileFormChange={setProfileForm}
              onProfileSubmit={handleProfileSubmit}
            />
          ) : null}

          {activeTab === 'security' ? (
            <SecurityTabPanel
              changePasswordMutation={changePasswordMutation}
              passwordForm={passwordForm}
              securityMessage={securityMessage}
              userEmail={email}
              onPasswordFormChange={setPasswordForm}
              onPasswordSubmit={handlePasswordSubmit}
            />
          ) : null}

          {activeTab === 'payments' ? (
            <PaymentsTabPanel
              filters={paymentFilters}
              page={paymentPage}
              paymentsQuery={paymentsQuery}
              onFiltersChange={(nextFilters) => {
                setPaymentFilters(nextFilters);
                setPaymentPage(1);
              }}
              onPageChange={setPaymentPage}
            />
          ) : null}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

type ProfileTabPanelProps = {
  avatarUrl?: string | null;
  displayName: string;
  email: string;
  initials: string;
  isLoading: boolean;
  phone: string;
  profileForm: ProfileFormState;
  profileMessage: { tone: 'success' | 'error'; text: string } | null;
  role?: string;
  status?: string;
  updateProfileMutation: ReturnType<typeof useUpdateCurrentUser>;
  onProfileFormChange: Dispatch<SetStateAction<ProfileFormState>>;
  onProfileSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function ProfileTabPanel({
  avatarUrl,
  displayName,
  email,
  initials,
  isLoading,
  phone,
  profileForm,
  profileMessage,
  role,
  status,
  updateProfileMutation,
  onProfileFormChange,
  onProfileSubmit,
}: ProfileTabPanelProps) {
  return (
    <section className="user-profile-grid">
      <article className="user-profile-panel user-profile-main-panel">
        <div className="user-profile-panel-head">
          <div>
            <p className="user-profile-eyebrow">Ho so</p>
            <h2>Thong tin ca nhan</h2>
          </div>
          <span className="user-profile-status">
            <IconShieldCheck size={16} stroke={1.8} />
            {formatStatus(status)}
          </span>
        </div>

        <div className="user-profile-identity">
          <Avatar avatarUrl={avatarUrl} initials={initials} size="lg" />
          <div>
            <h3>{displayName}</h3>
            <p>{formatRole(role)}</p>
          </div>
        </div>

        <div className="user-profile-info-list">
          <InfoRow icon={<IconMail size={18} stroke={1.8} />} label="Email" value={email} />
          <InfoRow icon={<IconPhone size={18} stroke={1.8} />} label="So dien thoai" value={phone} />
          <InfoRow icon={<IconHome size={18} stroke={1.8} />} label="Loai tai khoan" value={formatRole(role)} />
          <InfoRow icon={<IconShieldCheck size={18} stroke={1.8} />} label="Trang thai" value={formatStatus(status)} />
        </div>

        <form className="user-profile-form" id="profile-form" onSubmit={onProfileSubmit}>
          <label>
            <span>Ho ten</span>
            <input
              autoComplete="name"
              disabled={updateProfileMutation.isPending}
              maxLength={100}
              value={profileForm.fullName}
              onChange={(event) => onProfileFormChange((current) => ({ ...current, fullName: event.target.value }))}
            />
          </label>
          <label>
            <span>So dien thoai</span>
            <input
              autoComplete="tel"
              disabled={updateProfileMutation.isPending}
              maxLength={20}
              placeholder="Chua cap nhat"
              value={profileForm.phone}
              onChange={(event) => onProfileFormChange((current) => ({ ...current, phone: event.target.value }))}
            />
          </label>
          {profileMessage ? <FormMessage tone={profileMessage.tone}>{profileMessage.text}</FormMessage> : null}
          <button className="user-profile-submit" disabled={updateProfileMutation.isPending || isLoading} type="submit">
            {updateProfileMutation.isPending ? 'Dang luu...' : 'Luu thay doi'}
          </button>
        </form>
      </article>

      <aside className="user-profile-panel user-profile-readonly-panel">
        <p className="user-profile-eyebrow">Thong tin chi doc</p>
        <h2>Du lieu tai khoan</h2>
        <p>Email, vai tro, trang thai va avatar hien duoc dong bo tu he thong. Endpoint cap nhat ho so chi cho phep sua ho ten va so dien thoai.</p>
      </aside>
    </section>
  );
}

type SecurityTabPanelProps = {
  changePasswordMutation: ReturnType<typeof useChangePassword>;
  passwordForm: PasswordFormState;
  securityMessage: { tone: 'success' | 'error'; text: string } | null;
  userEmail: string;
  onPasswordFormChange: Dispatch<SetStateAction<PasswordFormState>>;
  onPasswordSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function SecurityTabPanel({
  changePasswordMutation,
  passwordForm,
  securityMessage,
  userEmail,
  onPasswordFormChange,
  onPasswordSubmit,
}: SecurityTabPanelProps) {
  return (
    <section className="user-profile-security-layout">
      <article className="user-profile-panel user-profile-security-panel">
        <div className="user-profile-panel-head">
          <div>
            <p className="user-profile-eyebrow">Bao mat</p>
            <h2>Thiet lap dang nhap</h2>
          </div>
          <span className="user-profile-status">
            <IconLock size={16} stroke={1.8} />
            Password
          </span>
        </div>

        <div className="user-profile-security-intro">
          <div>
            <strong>Tai khoan dang dang nhap</strong>
            <span>{userEmail}</span>
          </div>
          <p>Mat khau moi can dai 8-128 ky tu, co chu hoa, chu thuong va chu so.</p>
        </div>

        <form className="user-profile-form user-profile-security-form" onSubmit={onPasswordSubmit}>
          <label>
            <span>Mat khau hien tai</span>
            <input
              autoComplete="current-password"
              disabled={changePasswordMutation.isPending}
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) => onPasswordFormChange((current) => ({ ...current, currentPassword: event.target.value }))}
            />
          </label>
          <label>
            <span>Mat khau moi</span>
            <input
              autoComplete="new-password"
              disabled={changePasswordMutation.isPending}
              minLength={8}
              maxLength={128}
              type="password"
              value={passwordForm.newPassword}
              onChange={(event) => onPasswordFormChange((current) => ({ ...current, newPassword: event.target.value }))}
            />
          </label>
          <label>
            <span>Xac nhan mat khau moi</span>
            <input
              autoComplete="new-password"
              disabled={changePasswordMutation.isPending}
              minLength={8}
              maxLength={128}
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(event) => onPasswordFormChange((current) => ({ ...current, confirmPassword: event.target.value }))}
            />
          </label>
          {securityMessage ? <FormMessage tone={securityMessage.tone}>{securityMessage.text}</FormMessage> : null}
          <button className="user-profile-submit" disabled={changePasswordMutation.isPending} type="submit">
            {changePasswordMutation.isPending ? 'Dang doi...' : 'Doi mat khau'}
          </button>
        </form>
      </article>
    </section>
  );
}

type PaymentsTabPanelProps = {
  filters: PaymentFilterState;
  page: number;
  paymentsQuery: ReturnType<typeof usePayments>;
  onFiltersChange: (filters: PaymentFilterState) => void;
  onPageChange: Dispatch<SetStateAction<number>>;
};

function PaymentsTabPanel({
  filters,
  page,
  paymentsQuery,
  onFiltersChange,
  onPageChange,
}: PaymentsTabPanelProps) {
  const payments = paymentsQuery.data?.items ?? [];
  const total = getPaymentListTotal(paymentsQuery.data);
  const totalPages = Math.max(1, paymentsQuery.data?.totalPages ?? Math.ceil(total / PAYMENT_PAGE_SIZE));

  function updateFilter(field: keyof PaymentFilterState, value: string) {
    onFiltersChange({ ...filters, [field]: value } as PaymentFilterState);
  }

  return (
    <section className="user-profile-payments-layout">
      <article className="user-profile-panel user-profile-payments-panel">
        <div className="user-profile-panel-head">
          <div>
            <p className="user-profile-eyebrow">Thanh toan</p>
            <h2>Lich su thanh toan</h2>
          </div>
          <span className="user-profile-status">
            <IconCreditCard size={16} stroke={1.8} />
            {paymentsQuery.isLoading ? 'Dang tai' : `${total} giao dich`}
          </span>
        </div>

        <div className="user-profile-payment-filters">
          <label>
            <span>Trang thai</span>
            <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
              {paymentStatusOptions.map((option) => (
                <option key={option.value || 'all-status'} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Loai thanh toan</span>
            <select value={filters.paymentType} onChange={(event) => updateFilter('paymentType', event.target.value)}>
              {paymentTypeOptions.map((option) => (
                <option key={option.value || 'all-type'} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Tu ngay</span>
            <input type="date" value={filters.from} onChange={(event) => updateFilter('from', event.target.value)} />
          </label>
          <label>
            <span>Den ngay</span>
            <input type="date" value={filters.to} onChange={(event) => updateFilter('to', event.target.value)} />
          </label>
        </div>

        {paymentsQuery.isError ? <FormMessage tone="error">{getPaymentServiceResultMessage(paymentsQuery.error)}</FormMessage> : null}
        {paymentsQuery.isLoading ? <p className="user-profile-muted">Dang tai lich su thanh toan...</p> : null}
        {!paymentsQuery.isLoading && payments.length === 0 ? <p className="user-profile-muted">Chua co thanh toan phu hop voi bo loc.</p> : null}

        {payments.length > 0 ? (
          <div className="user-profile-payment-list">
            {payments.map((payment) => (
              <PaymentHistoryRow key={payment.paymentId} payment={payment} />
            ))}
          </div>
        ) : null}

        <div className="user-profile-payment-pagination">
          <span>Trang {page} / {totalPages}</span>
          <div>
            <button disabled={page <= 1 || paymentsQuery.isFetching} type="button" onClick={() => onPageChange((current) => Math.max(1, current - 1))}>
              Truoc
            </button>
            <button disabled={page >= totalPages || paymentsQuery.isFetching} type="button" onClick={() => onPageChange((current) => Math.min(totalPages, current + 1))}>
              Sau
            </button>
          </div>
        </div>
      </article>
    </section>
  );
}

function PaymentHistoryRow({ payment }: { payment: PaymentDto }) {
  return (
    <article className="user-profile-payment-row">
      <div>
        <strong>{getPaymentProjectName(payment)} - {payment.paymentCode}</strong>
        <span>{formatPaymentDateTime(payment.paidAt ?? payment.createdAt)}</span>
        <em>{formatPaymentType(payment.paymentType)}</em>
      </div>
      <div className="user-profile-payment-row-side">
        <strong>{formatMoney(payment.amount)}</strong>
        <PaymentStatusBadge status={payment.status} />
      </div>
    </article>
  );
}

function getPaymentProjectName(payment: PaymentDto) {
  return payment.projectName ?? payment.projectCode ?? `Project ${shortCode(payment.projectId)}`;
}

function formatPaymentDateTime(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);

  return `${new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)} - ${new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)}`;
}

function PaymentStatusBadge({ status }: { status?: PaymentStatus | null }) {
  return <span className={`user-profile-payment-status user-profile-payment-status-${(status ?? 'PENDING').toLowerCase()}`}>{formatEnumLabel(status ?? 'PENDING')}</span>;
}

function Avatar({ avatarUrl, initials, size }: { avatarUrl?: string | null; initials: string; size: 'sm' | 'lg' }) {
  return (
    <div className={size === 'lg' ? 'user-profile-large-avatar' : 'user-profile-sidebar-avatar'}>
      {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{initials}</span>}
    </div>
  );
}

function FormMessage({ children, tone }: { children: React.ReactNode; tone: 'success' | 'error' }) {
  return <p className={`user-profile-form-message user-profile-form-message-${tone}`}>{children}</p>;
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="user-profile-info-row">
      <span>{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function getProfileTabFromSearch(searchParams: URLSearchParams): ProfileTab {
  const tab = searchParams.get('tab');

  if (tab === 'security' || tab === 'payments') return tab;

  return 'profile';
}

function getProfileHeading(tab: ProfileTab) {
  if (tab === 'security') return 'Bao mat tai khoan';
  if (tab === 'payments') return 'Lich su thanh toan';

  return 'Thong tin ca nhan';
}

function getDisplayName(fullName?: string | null, email?: string | null, isLoading?: boolean) {
  const trimmedName = fullName?.trim();

  if (trimmedName) {
    return trimmedName;
  }

  if (email?.includes('@')) {
    return email.split('@')[0];
  }

  return isLoading ? 'Dang tai...' : 'FurniSpace Client';
}

function formatRole(role?: string) {
  if (!role) {
    return 'Customer';
  }

  return role
    .toLowerCase()
    .split(/[_\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatStatus(status?: string) {
  if (!status) {
    return 'Active';
  }

  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatPaymentType(value?: PaymentType | null) {
  if (!value) return '-';

  return formatEnumLabel(value);
}

function formatMoney(value?: number | null) {
  if (typeof value !== 'number') return '-';

  return new Intl.NumberFormat('vi-VN', {
    currency: 'VND',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
}

function getPaymentListTotal(data?: { items?: PaymentDto[]; total?: number; totalCount?: number } | null) {
  return data?.total ?? data?.totalCount ?? data?.items?.length ?? 0;
}

function shortCode(value: string) {
  return value.slice(0, 8);
}

function getInitials(value: string) {
  const initials = value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || 'U';
}

function isValidPassword(password: string) {
  return (
    password.length >= 8 &&
    password.length <= 128 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password)
  );
}
