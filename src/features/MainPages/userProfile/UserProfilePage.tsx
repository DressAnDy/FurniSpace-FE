import { type Dispatch, type FormEvent, type SetStateAction, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconChevronRight,
  IconCreditCard,
  IconEdit,
  IconHome,
  IconKey,
  IconLock,
  IconMail,
  IconMapPin,
  IconPhone,
  IconShieldCheck,
  IconUser,
} from '@tabler/icons-react';

import { MainNavbar } from '@/features/MainPages/maincomponents';
import { getServiceResultMessage } from '@/services/api/auth';
import { useChangePassword, useCurrentUser, useForgotPassword, useUpdateCurrentUser } from '@/services/queries';
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
  const { data: user, isLoading } = useCurrentUser();
  const updateProfileMutation = useUpdateCurrentUser();
  const changePasswordMutation = useChangePassword();
  const forgotPasswordMutation = useForgotPassword();
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile');
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

  const handleForgotPassword = async () => {
    setSecurityMessage(null);

    if (!user?.email) {
      setSecurityMessage({ tone: 'error', text: 'Không tìm thấy email tài khoản hiện tại.' });
      return;
    }

    try {
      const result = await forgotPasswordMutation.mutateAsync({ email: user.email });
      setSecurityMessage({ tone: 'success', text: result.message || 'Nếu tài khoản tồn tại, email đặt lại mật khẩu đã được gửi.' });
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
                  onClick={() => setActiveTab(item.id)}
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
                  ? 'Cập nhật mật khẩu và yêu cầu email đặt lại mật khẩu cho tài khoản hiện tại.'
                  : 'Theo dõi thông tin tài khoản, liên hệ và các thiết lập cá nhân cho hành trình thiết kế không gian.'}
              </p>
            </div>
            <button className="user-profile-edit-button" type="button" onClick={() => setActiveTab(activeTab === 'security' ? 'profile' : 'security')}>
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
              forgotPasswordMutation={forgotPasswordMutation}
              passwordForm={passwordForm}
              securityMessage={securityMessage}
              userEmail={email}
              onForgotPassword={handleForgotPassword}
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
  forgotPasswordMutation: ReturnType<typeof useForgotPassword>;
  passwordForm: PasswordFormState;
  securityMessage: { tone: 'success' | 'error'; text: string } | null;
  userEmail: string;
  onForgotPassword: () => void;
  onPasswordFormChange: Dispatch<SetStateAction<PasswordFormState>>;
  onPasswordSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function SecurityTabPanel({
  changePasswordMutation,
  forgotPasswordMutation,
  passwordForm,
  securityMessage,
  userEmail,
  onForgotPassword,
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
            <strong>Email đăng nhập</strong>
            <span>{userEmail}</span>
          </div>
          <button className="user-profile-link-button" disabled={forgotPasswordMutation.isPending} type="button" onClick={onForgotPassword}>
            {forgotPasswordMutation.isPending ? 'Đang gửi email...' : 'Gửi email đặt lại mật khẩu'}
          </button>
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
  return (
    <section className="user-profile-security-layout">
      <article className="user-profile-panel user-profile-empty-panel">
        <p className="user-profile-eyebrow">Thanh toán</p>
        <h2>Thanh toán & hóa đơn</h2>
        <p>Thông tin thanh toán của các dự án sẽ được đồng bộ tại đây khi backend mở API tương ứng.</p>
      </article>
    </section>
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
