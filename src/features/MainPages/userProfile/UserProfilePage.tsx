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

import { useLang, type Lang } from '@/app/providers/useLang';
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
  labelKey: keyof ProfileCopy['tabs'];
}> = [
  { id: 'profile', icon: IconUser, labelKey: 'profile' },
  { id: 'security', icon: IconKey, labelKey: 'security' },
  { id: 'payments', icon: IconCreditCard, labelKey: 'payments' },
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

type ProfileCopy = typeof profileCopy.en;

const profileCopy = {
  en: {
    account: 'FurniSpace account',
    tabs: {
      profile: 'Personal information',
      security: 'Security',
      payments: 'Payments',
    },
    heroAction: {
      openSecurity: 'Open security',
      viewProfile: 'View profile',
    },
    stats: {
      status: 'Status',
      role: 'Role',
      projects: 'Total projects',
    },
    profile: {
      eyebrow: 'Profile',
      title: 'Personal information',
      fullName: 'Full name',
      phone: 'Phone number',
      email: 'Email',
      accountType: 'Account type',
      status: 'Status',
      phoneMissing: 'Not updated',
      emailMissing: 'No email yet',
      readonlyEyebrow: 'Read only',
      readonlyTitle: 'Account data',
      readonlyBody: 'Email, role, status, and avatar are synced from the system. Profile update only changes full name and phone number.',
      save: 'Save changes',
      saving: 'Saving...',
      nameRequired: 'Please enter your full name.',
      nameTooLong: 'Full name cannot exceed 100 characters.',
      phoneTooLong: 'Phone number cannot exceed 20 characters.',
      saved: 'Profile updated.',
      loadingName: 'Loading...',
      fallbackName: 'FurniSpace Client',
    },
    security: {
      eyebrow: 'Security',
      title: 'Login settings',
      currentAccount: 'Signed-in account',
      helper: 'New password must be 8-128 characters and include uppercase, lowercase, and a number.',
      currentPassword: 'Current password',
      newPassword: 'New password',
      confirmPassword: 'Confirm new password',
      submit: 'Change password',
      submitting: 'Changing...',
      currentRequired: 'Please enter your current password.',
      invalidNew: 'New password must be 8-128 characters and include uppercase, lowercase, and a number.',
      mismatch: 'New password and confirmation do not match.',
      changed: 'Password changed. Please sign in again.',
      passwordBadge: 'Password',
    },
    payments: {
      eyebrow: 'Payments',
      title: 'Payment history',
      loadingStatus: 'Loading',
      transactionSuffix: 'transactions',
      statusFilter: 'Status',
      typeFilter: 'Payment type',
      from: 'From',
      to: 'To',
      loading: 'Loading payment history...',
      empty: 'No payments match the current filters.',
      page: 'Page',
      previous: 'Previous',
      next: 'Next',
      allStatuses: 'All statuses',
      allTypes: 'All types',
      projectFallback: 'Project',
    },
    status: {
      ACTIVE: 'Active',
      INACTIVE: 'Inactive',
      SUSPENDED: 'Suspended',
      PENDING: 'Pending',
      PROCESSING: 'Processing',
      PAID: 'Paid',
      FAILED: 'Failed',
      CANCELLED: 'Cancelled',
      EXPIRED: 'Expired',
      REFUNDED: 'Refunded',
    },
    paymentType: {
      PROJECT_START_FEE: 'Start fee',
      DEPOSIT: 'Deposit',
      REMAINING_PAYMENT: 'Remaining payment',
    },
    role: {
      CUSTOMER: 'Customer',
      SALES: 'Sales',
      DESIGNER: 'Designer',
      PRODUCTION: 'Production',
      ADMIN: 'Admin',
    },
  },
  vi: {
    account: 'Tai khoan FurniSpace',
    tabs: {
      profile: 'Thong tin ca nhan',
      security: 'Bao mat',
      payments: 'Thanh toan',
    },
    heroAction: {
      openSecurity: 'Mo bao mat',
      viewProfile: 'Xem ho so',
    },
    stats: {
      status: 'Trang thai',
      role: 'Vai tro',
      projects: 'Tong du an',
    },
    profile: {
      eyebrow: 'Ho so',
      title: 'Thong tin ca nhan',
      fullName: 'Ho ten',
      phone: 'So dien thoai',
      email: 'Email',
      accountType: 'Loai tai khoan',
      status: 'Trang thai',
      phoneMissing: 'Chua cap nhat',
      emailMissing: 'Chua co email',
      readonlyEyebrow: 'Thong tin chi doc',
      readonlyTitle: 'Du lieu tai khoan',
      readonlyBody: 'Email, vai tro, trang thai va avatar hien duoc dong bo tu he thong. Endpoint cap nhat ho so chi cho phep sua ho ten va so dien thoai.',
      save: 'Luu thay doi',
      saving: 'Dang luu...',
      nameRequired: 'Vui long nhap ho ten.',
      nameTooLong: 'Ho ten khong duoc vuot qua 100 ky tu.',
      phoneTooLong: 'So dien thoai khong duoc vuot qua 20 ky tu.',
      saved: 'Da cap nhat ho so.',
      loadingName: 'Dang tai...',
      fallbackName: 'FurniSpace Client',
    },
    security: {
      eyebrow: 'Bao mat',
      title: 'Thiet lap dang nhap',
      currentAccount: 'Tai khoan dang dang nhap',
      helper: 'Mat khau moi can dai 8-128 ky tu, co chu hoa, chu thuong va chu so.',
      currentPassword: 'Mat khau hien tai',
      newPassword: 'Mat khau moi',
      confirmPassword: 'Xac nhan mat khau moi',
      submit: 'Doi mat khau',
      submitting: 'Dang doi...',
      currentRequired: 'Vui long nhap mat khau hien tai.',
      invalidNew: 'Mat khau moi phai dai 8-128 ky tu va co chu hoa, chu thuong, chu so.',
      mismatch: 'Mat khau moi va xac nhan mat khau chua khop.',
      changed: 'Da doi mat khau. Vui long dang nhap lai.',
      passwordBadge: 'Mat khau',
    },
    payments: {
      eyebrow: 'Thanh toan',
      title: 'Lich su thanh toan',
      loadingStatus: 'Dang tai',
      transactionSuffix: 'giao dich',
      statusFilter: 'Trang thai',
      typeFilter: 'Loai thanh toan',
      from: 'Tu ngay',
      to: 'Den ngay',
      loading: 'Dang tai lich su thanh toan...',
      empty: 'Chua co thanh toan phu hop voi bo loc.',
      page: 'Trang',
      previous: 'Truoc',
      next: 'Sau',
      allStatuses: 'Tat ca trang thai',
      allTypes: 'Tat ca loai',
      projectFallback: 'Du an',
    },
    status: {
      ACTIVE: 'Dang hoat dong',
      INACTIVE: 'Ngung hoat dong',
      SUSPENDED: 'Tam khoa',
      PENDING: 'Dang cho',
      PROCESSING: 'Dang xu ly',
      PAID: 'Da thanh toan',
      FAILED: 'That bai',
      CANCELLED: 'Da huy',
      EXPIRED: 'Het han',
      REFUNDED: 'Da hoan tien',
    },
    paymentType: {
      PROJECT_START_FEE: 'Phi khoi tao du an',
      DEPOSIT: 'Dat coc',
      REMAINING_PAYMENT: 'Thanh toan con lai',
    },
    role: {
      CUSTOMER: 'Khach hang',
      SALES: 'Nhan vien kinh doanh',
      DESIGNER: 'Nha thiet ke',
      PRODUCTION: 'San xuat',
      ADMIN: 'Quan tri vien',
    },
  },
};

export function UserProfilePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { lang } = useLang();
  const t = profileCopy[lang];
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
  const displayName = getDisplayName(user?.fullName, user?.email, isLoading, t);
  const email = user?.email || t.profile.emailMissing;
  const phone = user?.phone?.trim() || t.profile.phoneMissing;
  const initials = getInitials(displayName);
  const overviewStats = useMemo(
    () => [
      { label: t.stats.status, value: formatStatus(user?.status, t)},
      { label: t.stats.role, value: formatRole(user?.role, t),  },
      {
        label: t.stats.projects,
        value: projectsSummaryQuery.isLoading ? '...' : String(projectsSummaryQuery.data?.total ?? 0),
      },
    ],
    [projectsSummaryQuery.data?.total, projectsSummaryQuery.isError, projectsSummaryQuery.isLoading, t, user?.role, user?.status],
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
      setProfileMessage({ tone: 'error', text: t.profile.nameRequired });
      return;
    }

    if (fullName.length > 100) {
      setProfileMessage({ tone: 'error', text: t.profile.nameTooLong });
      return;
    }

    if (phoneValue.length > 20) {
      setProfileMessage({ tone: 'error', text: t.profile.phoneTooLong });
      return;
    }

    try {
      const result = await updateProfileMutation.mutateAsync({
        fullName,
        phone: phoneValue || null,
      });
      setProfileMessage({ tone: 'success', text: result.message || t.profile.saved });
    } catch (error) {
      setProfileMessage({ tone: 'error', text: getServiceResultMessage(error) });
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSecurityMessage(null);

    if (!passwordForm.currentPassword.trim()) {
      setSecurityMessage({ tone: 'error', text: t.security.currentRequired });
      return;
    }

    if (!isValidPassword(passwordForm.newPassword)) {
      setSecurityMessage({ tone: 'error', text: t.security.invalidNew });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setSecurityMessage({ tone: 'error', text: t.security.mismatch });
      return;
    }

    try {
      const result = await changePasswordMutation.mutateAsync({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSecurityMessage({ tone: 'success', text: result.message || t.security.changed });
      window.setTimeout(() => navigate('/login', { replace: true }), 900);
    } catch (error) {
      setSecurityMessage({ tone: 'error', text: getServiceResultMessage(error) });
    }
  }

  return (
    <main className="user-profile-page">
      <MainNavbar activePath="/user-profile" classPrefix="user-profile" />

      <section className="user-profile-shell">
        <aside className="user-profile-sidebar" aria-label={lang === 'vi' ? 'Dieu huong ho so' : 'User profile navigation'}>
          <div className="user-profile-sidebar-card">
            <Avatar avatarUrl={user?.avatarUrl} initials={initials} size="sm" />
            <div>
              <strong>{displayName}</strong>
              <p>{email}</p>
            </div>
          </div>

          <nav className="user-profile-sidebar-nav" aria-label={lang === 'vi' ? 'Cac muc ho so' : 'Profile sections'}>
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
                  <span>{t.tabs[item.labelKey]}</span>
                  <IconChevronRight size={16} stroke={1.8} />
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="user-profile-content">
          <section className="user-profile-hero">
            <div>
              <p className="user-profile-eyebrow">{t.account}</p>
              <h1>{getProfileHeading(activeTab, t)}</h1>
            </div>
            <button className="user-profile-edit-button" type="button" onClick={() => changeTab(activeTab === 'profile' ? 'security' : 'profile')}>
              {activeTab === 'profile' ? <IconEdit size={18} stroke={1.8} /> : <IconUser size={18} stroke={1.8} />}
              <span>{activeTab === 'profile' ? t.heroAction.openSecurity : t.heroAction.viewProfile}</span>
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
              t={t}
              onProfileFormChange={setProfileForm}
              onProfileSubmit={handleProfileSubmit}
            />
          ) : null}

          {activeTab === 'security' ? (
            <SecurityTabPanel
              changePasswordMutation={changePasswordMutation}
              passwordForm={passwordForm}
              securityMessage={securityMessage}
              t={t}
              userEmail={email}
              onPasswordFormChange={setPasswordForm}
              onPasswordSubmit={handlePasswordSubmit}
            />
          ) : null}

          {activeTab === 'payments' ? (
            <PaymentsTabPanel
              filters={paymentFilters}
              lang={lang}
              page={paymentPage}
              paymentsQuery={paymentsQuery}
              t={t}
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
  t: ProfileCopy;
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
  t,
  updateProfileMutation,
  onProfileFormChange,
  onProfileSubmit,
}: ProfileTabPanelProps) {
  return (
    <section className="user-profile-grid">
      <article className="user-profile-panel user-profile-main-panel">
        <div className="user-profile-panel-head">
          <div>
            <p className="user-profile-eyebrow">{t.profile.eyebrow}</p>
            <h2>{t.profile.title}</h2>
          </div>
          <span className="user-profile-status">
            <IconShieldCheck size={16} stroke={1.8} />
            {formatStatus(status, t)}
          </span>
        </div>

        <div className="user-profile-identity">
          <Avatar avatarUrl={avatarUrl} initials={initials} size="lg" />
          <div>
            <h3>{displayName}</h3>
            <p>{formatRole(role, t)}</p>
          </div>
        </div>

        <div className="user-profile-info-list">
          <InfoRow icon={<IconMail size={18} stroke={1.8} />} label={t.profile.email} value={email} />
          <InfoRow icon={<IconPhone size={18} stroke={1.8} />} label={t.profile.phone} value={phone} />
          <InfoRow icon={<IconHome size={18} stroke={1.8} />} label={t.profile.accountType} value={formatRole(role, t)} />
          <InfoRow icon={<IconShieldCheck size={18} stroke={1.8} />} label={t.profile.status} value={formatStatus(status, t)} />
        </div>

        <form className="user-profile-form" id="profile-form" onSubmit={onProfileSubmit}>
          <label>
            <span>{t.profile.fullName}</span>
            <input
              autoComplete="name"
              disabled={updateProfileMutation.isPending}
              maxLength={100}
              value={profileForm.fullName}
              onChange={(event) => onProfileFormChange((current) => ({ ...current, fullName: event.target.value }))}
            />
          </label>
          <label>
            <span>{t.profile.phone}</span>
            <input
              autoComplete="tel"
              disabled={updateProfileMutation.isPending}
              maxLength={20}
              placeholder={t.profile.phoneMissing}
              value={profileForm.phone}
              onChange={(event) => onProfileFormChange((current) => ({ ...current, phone: event.target.value }))}
            />
          </label>
          {profileMessage ? <FormMessage tone={profileMessage.tone}>{profileMessage.text}</FormMessage> : null}
          <button className="user-profile-submit" disabled={updateProfileMutation.isPending || isLoading} type="submit">
            {updateProfileMutation.isPending ? t.profile.saving : t.profile.save}
          </button>
        </form>
      </article>

      <aside className="user-profile-panel user-profile-readonly-panel">
        <p className="user-profile-eyebrow">{t.profile.readonlyEyebrow}</p>
        <h2>{t.profile.readonlyTitle}</h2>
        <p>{t.profile.readonlyBody}</p>
      </aside>
    </section>
  );
}

type SecurityTabPanelProps = {
  changePasswordMutation: ReturnType<typeof useChangePassword>;
  passwordForm: PasswordFormState;
  securityMessage: { tone: 'success' | 'error'; text: string } | null;
  t: ProfileCopy;
  userEmail: string;
  onPasswordFormChange: Dispatch<SetStateAction<PasswordFormState>>;
  onPasswordSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function SecurityTabPanel({
  changePasswordMutation,
  passwordForm,
  securityMessage,
  t,
  userEmail,
  onPasswordFormChange,
  onPasswordSubmit,
}: SecurityTabPanelProps) {
  return (
    <section className="user-profile-security-layout">
      <article className="user-profile-panel user-profile-security-panel">
        <div className="user-profile-panel-head">
          <div>
            <p className="user-profile-eyebrow">{t.security.eyebrow}</p>
            <h2>{t.security.title}</h2>
          </div>
          <span className="user-profile-status">
            <IconLock size={16} stroke={1.8} />
            {t.security.passwordBadge}
          </span>
        </div>

        <div className="user-profile-security-intro">
          <div>
            <strong>{t.security.currentAccount}</strong>
            <span>{userEmail}</span>
          </div>
          <p>{t.security.helper}</p>
        </div>

        <form className="user-profile-form user-profile-security-form" onSubmit={onPasswordSubmit}>
          <label>
            <span>{t.security.currentPassword}</span>
            <input
              autoComplete="current-password"
              disabled={changePasswordMutation.isPending}
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) => onPasswordFormChange((current) => ({ ...current, currentPassword: event.target.value }))}
            />
          </label>
          <label>
            <span>{t.security.newPassword}</span>
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
            <span>{t.security.confirmPassword}</span>
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
            {changePasswordMutation.isPending ? t.security.submitting : t.security.submit}
          </button>
        </form>
      </article>
    </section>
  );
}

type PaymentsTabPanelProps = {
  filters: PaymentFilterState;
  lang: Lang;
  page: number;
  paymentsQuery: ReturnType<typeof usePayments>;
  t: ProfileCopy;
  onFiltersChange: (filters: PaymentFilterState) => void;
  onPageChange: Dispatch<SetStateAction<number>>;
};

function PaymentsTabPanel({
  filters,
  lang,
  page,
  paymentsQuery,
  t,
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
            <p className="user-profile-eyebrow">{t.payments.eyebrow}</p>
            <h2>{t.payments.title}</h2>
          </div>
          <span className="user-profile-status">
            <IconCreditCard size={16} stroke={1.8} />
            {paymentsQuery.isLoading ? t.payments.loadingStatus : `${total} ${t.payments.transactionSuffix}`}
          </span>
        </div>

        <div className="user-profile-payment-filters">
          <label>
            <span>{t.payments.statusFilter}</span>
            <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
              {getPaymentStatusOptions(t).map((option) => (
                <option key={option.value || 'all-status'} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>{t.payments.typeFilter}</span>
            <select value={filters.paymentType} onChange={(event) => updateFilter('paymentType', event.target.value)}>
              {getPaymentTypeOptions(t).map((option) => (
                <option key={option.value || 'all-type'} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>{t.payments.from}</span>
            <input type="date" value={filters.from} onChange={(event) => updateFilter('from', event.target.value)} />
          </label>
          <label>
            <span>{t.payments.to}</span>
            <input type="date" value={filters.to} onChange={(event) => updateFilter('to', event.target.value)} />
          </label>
        </div>

        {paymentsQuery.isError ? <FormMessage tone="error">{getPaymentServiceResultMessage(paymentsQuery.error)}</FormMessage> : null}
        {paymentsQuery.isLoading ? <p className="user-profile-muted">{t.payments.loading}</p> : null}
        {!paymentsQuery.isLoading && payments.length === 0 ? <p className="user-profile-muted">{t.payments.empty}</p> : null}

        {payments.length > 0 ? (
          <div className="user-profile-payment-list">
            {payments.map((payment) => (
              <PaymentHistoryRow key={payment.paymentId} lang={lang} payment={payment} t={t} />
            ))}
          </div>
        ) : null}

        <div className="user-profile-payment-pagination">
          <span>{t.payments.page} {page} / {totalPages}</span>
          <div>
            <button disabled={page <= 1 || paymentsQuery.isFetching} type="button" onClick={() => onPageChange((current) => Math.max(1, current - 1))}>
              {t.payments.previous}
            </button>
            <button disabled={page >= totalPages || paymentsQuery.isFetching} type="button" onClick={() => onPageChange((current) => Math.min(totalPages, current + 1))}>
              {t.payments.next}
            </button>
          </div>
        </div>
      </article>
    </section>
  );
}

function PaymentHistoryRow({ lang, payment, t }: { lang: Lang; payment: PaymentDto; t: ProfileCopy }) {
  return (
    <article className="user-profile-payment-row">
      <div>
        <strong>{getPaymentProjectName(payment, t)} - {payment.paymentCode}</strong>
        <span>{formatPaymentDateTime(payment.paidAt ?? payment.createdAt, lang)}</span>
        <em>{formatPaymentType(payment.paymentType, t)}</em>
      </div>
      <div className="user-profile-payment-row-side">
        <strong>{formatMoney(payment.amount, lang)}</strong>
        <PaymentStatusBadge status={payment.status} t={t} />
      </div>
    </article>
  );
}

function getPaymentProjectName(payment: PaymentDto, t: ProfileCopy) {
  return payment.projectName ?? payment.projectCode ?? `${t.payments.projectFallback} ${shortCode(payment.projectId)}`;
}

function formatPaymentDateTime(value: string | null | undefined, lang: Lang) {
  if (!value) return '-';

  const date = new Date(value);
  const locale = getLocale(lang);

  return `${new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)} - ${new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)}`;
}

function PaymentStatusBadge({ status, t }: { status?: PaymentStatus | null; t: ProfileCopy }) {
  return <span className={`user-profile-payment-status user-profile-payment-status-${(status ?? 'PENDING').toLowerCase()}`}>{formatPaymentStatus(status, t)}</span>;
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

function getProfileHeading(tab: ProfileTab, t: ProfileCopy) {
  if (tab === 'security') return t.tabs.security;
  if (tab === 'payments') return t.payments.title;

  return t.tabs.profile;
}

function getDisplayName(fullName: string | null | undefined, email: string | null | undefined, isLoading: boolean | undefined, t: ProfileCopy) {
  const trimmedName = fullName?.trim();

  if (trimmedName) {
    return trimmedName;
  }

  if (email?.includes('@')) {
    return email.split('@')[0];
  }

  return isLoading ? t.profile.loadingName : t.profile.fallbackName;
}

function formatRole(role: string | undefined, t: ProfileCopy) {
  if (!role) {
    return t.role.CUSTOMER;
  }

  const normalizedRole = role.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  if (normalizedRole in t.role) return t.role[normalizedRole as keyof ProfileCopy['role']];

  return role
    .toLowerCase()
    .split(/[_\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatStatus(status: string | undefined, t: ProfileCopy) {
  if (!status) {
    return t.status.ACTIVE;
  }

  if (status in t.status) return t.status[status as keyof ProfileCopy['status']];

  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatPaymentType(value: PaymentType | null | undefined, t: ProfileCopy) {
  if (!value) return '-';

  return t.paymentType[value] ?? formatEnumLabel(value);
}

function formatPaymentStatus(value: PaymentStatus | null | undefined, t: ProfileCopy) {
  const status = value ?? 'PENDING';

  return t.status[status] ?? formatEnumLabel(status);
}

function formatMoney(value: number | null | undefined, lang: Lang) {
  if (typeof value !== 'number') return '-';

  return new Intl.NumberFormat(getLocale(lang), {
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

function getLocale(lang: Lang) {
  return lang === 'vi' ? 'vi-VN' : 'en-US';
}

function getPaymentStatusOptions(t: ProfileCopy): Array<{ label: string; value: '' | PaymentStatus }> {
  return [
    { label: t.payments.allStatuses, value: '' },
    { label: t.status.PENDING, value: 'PENDING' },
    { label: t.status.PROCESSING, value: 'PROCESSING' },
    { label: t.status.PAID, value: 'PAID' },
    { label: t.status.FAILED, value: 'FAILED' },
    { label: t.status.CANCELLED, value: 'CANCELLED' },
    { label: t.status.EXPIRED, value: 'EXPIRED' },
    { label: t.status.REFUNDED, value: 'REFUNDED' },
  ];
}

function getPaymentTypeOptions(t: ProfileCopy): Array<{ label: string; value: '' | PaymentType }> {
  return [
    { label: t.payments.allTypes, value: '' },
    { label: t.paymentType.PROJECT_START_FEE, value: 'PROJECT_START_FEE' },
    { label: t.paymentType.DEPOSIT, value: 'DEPOSIT' },
    { label: t.paymentType.REMAINING_PAYMENT, value: 'REMAINING_PAYMENT' },
  ];
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
