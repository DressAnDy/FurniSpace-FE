import { type Dispatch, type FormEvent, type SetStateAction, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  IconChevronRight,
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
import { useChangePassword, useCurrentUser, useProjectList, useUpdateCurrentUser } from '@/services/queries';
import { SiteFooter } from '@/shared/components';

import './UserProfilePage.css';

type ProfileTab = 'profile' | 'security';

const sidebarItems: Array<{
  id: ProfileTab;
  icon: typeof IconUser;
  label: string;
}> = [
  { id: 'profile', icon: IconUser, label: 'Thong tin ca nhan' },
  { id: 'security', icon: IconKey, label: 'Bao mat' },
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
  const currentUserQuery = useCurrentUser();
  const user = currentUserQuery.data;
  const projectsSummaryQuery = useProjectList({ page: 1, limit: 1 }, { enabled: Boolean(user?.accountId) });
  const updateProfileMutation = useUpdateCurrentUser();
  const changePasswordMutation = useChangePassword();
  const [activeTab, setActiveTab] = useState<ProfileTab>(() => getProfileTabFromSearch(searchParams));
  const [profileForm, setProfileForm] = useState<ProfileFormState>({ fullName: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [profileMessage, setProfileMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [securityMessage, setSecurityMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const isLoading = currentUserQuery.isLoading;
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
    setSearchParams(tab === 'security' ? { tab: 'security' } : {});
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
              <h1>{activeTab === 'security' ? 'Bao mat tai khoan' : 'Thong tin ca nhan'}</h1>
            </div>
            <button className="user-profile-edit-button" type="button" onClick={() => changeTab(activeTab === 'security' ? 'profile' : 'security')}>
              {activeTab === 'security' ? <IconUser size={18} stroke={1.8} /> : <IconEdit size={18} stroke={1.8} />}
              <span>{activeTab === 'security' ? 'Xem ho so' : 'Mo bao mat'}</span>
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
  return searchParams.get('tab') === 'security' ? 'security' : 'profile';
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
