import { type Dispatch, type FormEvent, type SetStateAction, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  IconChevronRight,
  IconClock,
  IconCreditCard,
  IconEdit,
  IconFileInvoice,
  IconHome,
  IconKey,
  IconLock,
  IconMail,
  IconMapPin,
  IconPhone,
  IconShieldCheck,
  IconUser,
} from '@tabler/icons-react';

import { mockCustomerPayments } from '@/features/CustomerPages/mock';
import type { CustomerPayment } from '@/features/CustomerPages/types';
import { formatCustomerDate, formatCustomerMoney, paymentStatusLabels, paymentTypeLabels } from '@/features/CustomerPages/utils';
import { MainNavbar } from '@/features/MainPages/maincomponents';
import { getServiceResultMessage } from '@/services/api/auth';
import { useChangePassword, useCurrentUser, useUpdateCurrentUser } from '@/services/queries';
import { SiteFooter } from '@/shared/components';

import './UserProfilePage.css';

type ProfileTab = 'profile' | 'billing' | 'security';

const sidebarItems: Array<{
  id: ProfileTab;
  icon: typeof IconUser;
  label: string;
}> = [
  { id: 'profile', icon: IconUser, label: 'Hồ sơ cá nhân' },
  { id: 'billing', icon: IconCreditCard, label: 'Thanh toán & hóa đơn' },
  { id: 'security', icon: IconKey, label: 'Bảo mật' },
];

const profileStats = [
  { label: 'Dự án đang theo dõi', value: '03' },
  { label: 'Concept đã duyệt', value: '12' },
  { label: 'Trạng thái tài khoản', value: 'Active' },
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

export function UserProfilePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: user, isLoading } = useCurrentUser();
  const updateProfileMutation = useUpdateCurrentUser();
  const changePasswordMutation = useChangePassword();
  const [activeTab, setActiveTab] = useState<ProfileTab>(searchParams.get('tab') === 'payments' ? 'billing' : 'profile');
  const [profileForm, setProfileForm] = useState<ProfileFormState>({ fullName: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [profileMessage, setProfileMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [securityMessage, setSecurityMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const displayName = user?.fullName?.trim() || (isLoading ? 'Đang tải...' : 'FurniSpace Client');
  const email = user?.email || 'client@furnispace.vn';
  const phone = user?.phone || 'Chưa cập nhật';
  const initials = getInitials(displayName);

  useEffect(() => {
    if (!user) return;

    setProfileForm({
      fullName: user.fullName ?? '',
      phone: user.phone ?? '',
    });
  }, [user]);

  function changeTab(tab: ProfileTab) {
    setActiveTab(tab);
    setSearchParams(tab === 'billing' ? { tab: 'payments' } : tab === 'security' ? { tab: 'security' } : {});
  }

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileMessage(null);

    if (!profileForm.fullName.trim()) {
      setProfileMessage({ tone: 'error', text: 'Vui lòng nhập họ tên.' });
      return;
    }

    try {
      const result = await updateProfileMutation.mutateAsync(profileForm);
      setProfileMessage({ tone: 'success', text: result.message || 'Đã cập nhật hồ sơ.' });
    } catch (error) {
      setProfileMessage({ tone: 'error', text: getServiceResultMessage(error) });
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSecurityMessage(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setSecurityMessage({ tone: 'error', text: 'Mật khẩu mới và xác nhận mật khẩu chưa khớp.' });
      return;
    }

    try {
      const result = await changePasswordMutation.mutateAsync({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSecurityMessage({ tone: 'success', text: result.message || 'Đã đổi mật khẩu. Vui lòng đăng nhập lại.' });
      window.setTimeout(() => navigate('/login', { replace: true }), 900);
    } catch (error) {
      setSecurityMessage({ tone: 'error', text: getServiceResultMessage(error) });
    }
  };

  return (
    <main className="user-profile-page">
      <MainNavbar activePath="/user-profile" classPrefix="user-profile" />

      <section className="user-profile-shell">
        <aside className="user-profile-sidebar" aria-label="User profile navigation">
          <div className="user-profile-sidebar-card">
            <div className="user-profile-sidebar-avatar">
              {user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span>{initials}</span>}
            </div>
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
              <p className="user-profile-eyebrow">Thông tin người dùng</p>
              <h1>{activeTab === 'security' ? 'Bảo mật tài khoản FurniSpace' : 'Quản lý hồ sơ FurniSpace của bạn'}</h1>
              <p>
                {activeTab === 'security'
                  ? 'Cập nhật mật khẩu cho tài khoản đang đăng nhập.'
                  : 'Theo dõi thông tin tài khoản, liên hệ và các thiết lập cá nhân cho hành trình thiết kế không gian.'}
              </p>
            </div>
            <button className="user-profile-edit-button" type="button" onClick={() => changeTab(activeTab === 'security' ? 'profile' : 'security')}>
              {activeTab === 'security' ? <IconUser size={18} stroke={1.8} /> : <IconEdit size={18} stroke={1.8} />}
              <span>{activeTab === 'security' ? 'Xem hồ sơ' : 'Mở bảo mật'}</span>
            </button>
          </section>

          <section className="user-profile-overview">
            {profileStats.map((stat) => (
              <article className="user-profile-stat" key={stat.label}>
                <strong>{stat.label === 'Trạng thái tài khoản' ? formatStatus(user?.status) : stat.value}</strong>
                <span>{stat.label}</span>
              </article>
            ))}
          </section>

          {activeTab === 'profile' ? (
            <ProfileTabPanel
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
              avatarUrl={user?.avatarUrl}
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

          {activeTab === 'billing' ? <BillingTabPanel /> : null}
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
            <p className="user-profile-eyebrow">Hồ sơ</p>
            <h2>Thông tin cá nhân</h2>
          </div>
          <span className="user-profile-status">
            <IconShieldCheck size={16} stroke={1.8} />
            {formatStatus(status)}
          </span>
        </div>

        <div className="user-profile-identity">
          <div className="user-profile-large-avatar">
            {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{initials}</span>}
          </div>
          <div>
            <h3>{displayName}</h3>
            <p>{formatRole(role)}</p>
          </div>
        </div>

        <div className="user-profile-info-list">
          <InfoRow icon={<IconMail size={18} stroke={1.8} />} label="Email" value={email} />
          <InfoRow icon={<IconPhone size={18} stroke={1.8} />} label="Số điện thoại" value={phone} />
          <InfoRow icon={<IconHome size={18} stroke={1.8} />} label="Loại tài khoản" value={formatRole(role)} />
          <InfoRow icon={<IconMapPin size={18} stroke={1.8} />} label="Địa chỉ" value="Chưa cập nhật" />
        </div>

        <form className="user-profile-form" id="profile-form" onSubmit={onProfileSubmit}>
          <label>
            <span>Họ tên</span>
            <input
              autoComplete="name"
              disabled={updateProfileMutation.isPending}
              maxLength={100}
              value={profileForm.fullName}
              onChange={(event) => onProfileFormChange((current) => ({ ...current, fullName: event.target.value }))}
            />
          </label>
          <label>
            <span>Số điện thoại</span>
            <input
              autoComplete="tel"
              disabled={updateProfileMutation.isPending}
              maxLength={20}
              value={profileForm.phone}
              onChange={(event) => onProfileFormChange((current) => ({ ...current, phone: event.target.value }))}
            />
          </label>
          {profileMessage ? <FormMessage tone={profileMessage.tone}>{profileMessage.text}</FormMessage> : null}
          <button className="user-profile-submit" disabled={updateProfileMutation.isPending || isLoading} type="submit">
            {updateProfileMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </form>
      </article>

      <div className="user-profile-side-panels">
        <article className="user-profile-panel user-profile-gold-panel">
          <p className="user-profile-eyebrow">Hỗ trợ</p>
          <h2>Cần tư vấn cho dự án mới?</h2>
          <p>FurniSpace có thể giúp bạn chuẩn bị brief, concept và kế hoạch triển khai.</p>
          <button type="button">Liên hệ tư vấn</button>
        </article>
      </div>
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
            <p className="user-profile-eyebrow">Bảo mật</p>
            <h2>Thiết lập đăng nhập</h2>
          </div>
          <span className="user-profile-status">
            <IconLock size={16} stroke={1.8} />
            Password
          </span>
        </div>

        <div className="user-profile-security-intro">
          <div>
            <strong>Tài khoản đang đăng nhập</strong>
            <span>{userEmail}</span>
          </div>
          <p>Đổi mật khẩu định kỳ giúp bảo vệ tài khoản và các thông tin dự án của bạn.</p>
        </div>

        <form className="user-profile-form user-profile-security-form" onSubmit={onPasswordSubmit}>
          <label>
            <span>Mật khẩu hiện tại</span>
            <input
              autoComplete="current-password"
              disabled={changePasswordMutation.isPending}
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) => onPasswordFormChange((current) => ({ ...current, currentPassword: event.target.value }))}
            />
          </label>
          <label>
            <span>Mật khẩu mới</span>
            <input
              autoComplete="new-password"
              disabled={changePasswordMutation.isPending}
              minLength={8}
              type="password"
              value={passwordForm.newPassword}
              onChange={(event) => onPasswordFormChange((current) => ({ ...current, newPassword: event.target.value }))}
            />
          </label>
          <label>
            <span>Xác nhận mật khẩu mới</span>
            <input
              autoComplete="new-password"
              disabled={changePasswordMutation.isPending}
              minLength={8}
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(event) => onPasswordFormChange((current) => ({ ...current, confirmPassword: event.target.value }))}
            />
          </label>
          {securityMessage ? <FormMessage tone={securityMessage.tone}>{securityMessage.text}</FormMessage> : null}
          <button className="user-profile-submit" disabled={changePasswordMutation.isPending} type="submit">
            {changePasswordMutation.isPending ? 'Đang đổi...' : 'Đổi mật khẩu'}
          </button>
        </form>
      </article>
    </section>
  );
}

function BillingTabPanel() {
  const [selectedPayment, setSelectedPayment] = useState<CustomerPayment | null>(mockCustomerPayments[0] ?? null);
  const pendingPayments = mockCustomerPayments.filter((payment) => payment.status === 'PENDING' || payment.status === 'PROCESSING');
  const historyPayments = mockCustomerPayments.filter((payment) => payment.status !== 'PENDING' && payment.status !== 'PROCESSING');
  const pendingAmount = pendingPayments.reduce((total, payment) => total + payment.amount, 0);

  return (
    <section className="user-profile-billing-layout">
      <div className="user-profile-billing-overview">
        <BillingStat icon={<IconCreditCard size={22} />} label="Pending Amount" value={formatCustomerMoney(pendingAmount)} />
        <BillingStat icon={<IconFileInvoice size={22} />} label="Paid Payments" value={mockCustomerPayments.filter((payment) => payment.status === 'PAID').length} />
        <BillingStat icon={<IconClock size={22} />} label="Expired Payments" value={mockCustomerPayments.filter((payment) => payment.status === 'EXPIRED').length} />
        <BillingStat icon={<IconCreditCard size={22} />} label="Refunded Payments" value={mockCustomerPayments.filter((payment) => payment.status === 'REFUNDED').length} />
      </div>

      <article className="user-profile-panel user-profile-billing-panel">
        <div className="user-profile-panel-head">
          <div>
            <p className="user-profile-eyebrow">Thanh toán</p>
            <h2>Pending Payments</h2>
          </div>
          <span className="user-profile-status">Mock mode</span>
        </div>
        <div className="user-profile-payment-list">
          {pendingPayments.map((payment) => (
            <PaymentCard key={payment.paymentId} payment={payment} onSelect={setSelectedPayment} />
          ))}
        </div>
      </article>

      <section className="user-profile-billing-grid">
        <article className="user-profile-panel">
          <div className="user-profile-panel-head">
            <div>
              <p className="user-profile-eyebrow">Lịch sử</p>
              <h2>Payment History</h2>
            </div>
          </div>
          <div className="user-profile-payment-table-wrap">
            <table className="user-profile-payment-table">
              <thead>
                <tr>
                  <th>Payment Code</th>
                  <th>Project</th>
                  <th>Order</th>
                  <th>Payment Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Paid At</th>
                  <th>Expired At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {historyPayments.map((payment) => (
                  <tr key={payment.paymentId}>
                    <td>{payment.paymentCode}</td>
                    <td>{payment.projectName}</td>
                    <td>{payment.orderCode ?? '-'}</td>
                    <td>{paymentTypeLabels[payment.paymentType]}</td>
                    <td>{formatCustomerMoney(payment.amount, payment.currency)}</td>
                    <td><PaymentStatusPill status={payment.status} /></td>
                    <td>{formatCustomerDate(payment.paidAt)}</td>
                    <td>{formatCustomerDate(payment.expiredAt)}</td>
                    <td><button type="button" onClick={() => setSelectedPayment(payment)}>View detail</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="user-profile-panel">
          <div className="user-profile-panel-head">
            <div>
              <p className="user-profile-eyebrow">Chi tiết</p>
              <h2>Transaction Detail</h2>
            </div>
          </div>
          {selectedPayment ? <TransactionDetail payment={selectedPayment} /> : <p className="user-profile-muted">Select a payment to view transaction attempts.</p>}
        </article>
      </section>

      <article className="user-profile-panel user-profile-documents">
        <div className="user-profile-panel-head">
          <div>
            <p className="user-profile-eyebrow">Tài liệu</p>
            <h2>Invoice & Receipt Documents</h2>
          </div>
        </div>
        <div>
          {['Quotation File', 'Order Document', 'Payment Receipt', 'Refund Receipt'].map((item) => (
            <div key={item}>
              <strong>{item}</strong>
              <span>Receipt download will be available after payment is confirmed.</span>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

function BillingStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <article className="user-profile-stat user-profile-billing-stat">
      <span>{icon}</span>
      <strong>{value}</strong>
      <em>{label}</em>
    </article>
  );
}

function PaymentCard({ onSelect, payment }: { payment: CustomerPayment; onSelect: (payment: CustomerPayment) => void }) {
  return (
    <article>
      <div>
        <strong>{payment.paymentCode}</strong>
        <PaymentStatusPill status={payment.status} />
      </div>
      <p>{payment.projectName} - {payment.orderCode ?? payment.quotationCode ?? '-'}</p>
      <div className="user-profile-payment-card-meta">
        <span>{paymentTypeLabels[payment.paymentType]}</span>
        <strong>{formatCustomerMoney(payment.amount, payment.currency)}</strong>
        <span>Expires {formatCustomerDate(payment.expiredAt)}</span>
      </div>
      <div className="user-profile-payment-actions">
        <button type="button">{getPaymentActionLabel(payment.status)}</button>
        <button type="button">View QR</button>
        <button type="button" onClick={() => onSelect(payment)}>View Detail</button>
      </div>
    </article>
  );
}

function TransactionDetail({ payment }: { payment: CustomerPayment }) {
  return (
    <div className="user-profile-transaction-list">
      <div className="user-profile-payment-selected">
        <strong>{payment.paymentCode}</strong>
        <span>{paymentTypeLabels[payment.paymentType]} - {formatCustomerMoney(payment.amount, payment.currency)}</span>
      </div>
      {payment.transactions.map((transaction) => (
        <article key={transaction.paymentTransactionId}>
          <div><span>Transaction code</span><strong>{transaction.transactionCode}</strong></div>
          <div><span>Transaction type</span><strong>{transaction.transactionType}</strong></div>
          <div><span>Amount</span><strong>{formatCustomerMoney(transaction.amount, transaction.currency)}</strong></div>
          <div><span>Payment provider</span><strong>{transaction.paymentProvider ?? '-'}</strong></div>
          <div><span>Payment method</span><strong>{transaction.paymentMethod ?? '-'}</strong></div>
          <div><span>Provider transaction ID</span><strong>{transaction.providerTransactionId ?? '-'}</strong></div>
          <div><span>Provider reference code</span><strong>{transaction.providerReferenceCode ?? '-'}</strong></div>
          <div><span>Status</span><strong>{transaction.status}</strong></div>
          <div><span>Transaction time</span><strong>{formatCustomerDate(transaction.transactionTime)}</strong></div>
          <div><span>Failure reason</span><strong>{transaction.failureReason ?? '-'}</strong></div>
        </article>
      ))}
    </div>
  );
}

function PaymentStatusPill({ status }: { status: CustomerPayment['status'] }) {
  return <span className={`user-profile-payment-status user-profile-payment-status-${status.toLowerCase()}`}>{paymentStatusLabels[status]}</span>;
}

function getPaymentActionLabel(status: CustomerPayment['status']) {
  const labels: Record<CustomerPayment['status'], string> = {
    PENDING: 'Pay Now',
    PROCESSING: 'Continue Payment',
    EXPIRED: 'Contact Sales',
    PAID: 'View Receipt',
    CANCELLED: 'Disabled',
    REFUNDED: 'View Refund Detail',
  };

  return labels[status];
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

function getInitials(value: string) {
  const initials = value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || 'U';
}
