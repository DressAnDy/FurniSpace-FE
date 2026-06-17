import {
  IconBell,
  IconBriefcase,
  IconChevronRight,
  IconCreditCard,
  IconEdit,
  IconHome,
  IconKey,
  IconMail,
  IconMapPin,
  IconPhone,
  IconShieldCheck,
  IconUser,
} from '@tabler/icons-react';

import { MainFooter, MainNavbar } from '@/features/MainPages/maincomponents';
import { useCurrentUser } from '@/services/queries';

import './UserProfilePage.css';

const sidebarItems = [
  { icon: IconUser, label: 'H\u1ed3 s\u01a1 c\u00e1 nh\u00e2n', active: true },
  { icon: IconBriefcase, label: 'D\u1ef1 \u00e1n c\u1ee7a t\u00f4i' },
  { icon: IconCreditCard, label: 'Thanh to\u00e1n & h\u00f3a \u0111\u01a1n' },
  { icon: IconBell, label: 'Th\u00f4ng b\u00e1o' },
  { icon: IconKey, label: 'B\u1ea3o m\u1eadt' },
];

const profileStats = [
  { label: 'D\u1ef1 \u00e1n \u0111ang theo d\u00f5i', value: '03' },
  { label: 'Concept \u0111\u00e3 duy\u1ec7t', value: '12' },
  { label: 'L\u1ea7n c\u1eadp nh\u1eadt h\u1ed3 s\u01a1', value: '18/06' },
];

export function UserProfilePage() {
  const { data: user, isLoading } = useCurrentUser();
  const displayName = user?.fullName?.trim() || (isLoading ? '\u0110ang t\u1ea3i...' : 'FurniSpace Client');
  const email = user?.email || 'client@furnispace.vn';
  const phone = user?.phone || '+84 770 111 101';
  const initials = getInitials(displayName);

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

          <nav className="user-profile-sidebar-nav">
            {sidebarItems.map((item) => {
              const Icon = item.icon;

              return (
                <button className={item.active ? 'user-profile-sidebar-link user-profile-sidebar-link-active' : 'user-profile-sidebar-link'} key={item.label} type="button">
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
              <p className="user-profile-eyebrow">{'THÔNG TIN NGƯỜI DÙNG'}</p>
              <h1>{'Quản lý hồ sơ FurniSpace của bạn'}</h1>
              <p>
                {'Theo dõi thông tin tài khoản, liên hệ, bảo mật và các thiết lập cá nhân cho hành trình thiết kế không gian.'}
              </p>
            </div>
            <button className="user-profile-edit-button" type="button">
              <IconEdit size={18} stroke={1.8} />
              <span>{'Chỉnh sửa hồ sơ'}</span>
            </button>
          </section>

          <section className="user-profile-overview">
            {profileStats.map((stat) => (
              <article className="user-profile-stat" key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </article>
            ))}
          </section>

          <section className="user-profile-grid">
            <article className="user-profile-panel user-profile-main-panel">
              <div className="user-profile-panel-head">
                <div>
                  <p className="user-profile-eyebrow">{'HỒ SƠ'}</p>
                  <h2>{'Thông tin cá nhân'}</h2>
                </div>
                <span className="user-profile-status">
                  <IconShieldCheck size={16} stroke={1.8} />
                  {'Đã xác thực'}
                </span>
              </div>

              <div className="user-profile-identity">
                <div className="user-profile-large-avatar">
                  {user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span>{initials}</span>}
                </div>
                <div>
                  <h3>{displayName}</h3>
                  <p>{formatRole(user?.role)}</p>
                </div>
              </div>

              <div className="user-profile-info-list">
                <InfoRow icon={<IconMail size={18} stroke={1.8} />} label="Email" value={email} />
                <InfoRow icon={<IconPhone size={18} stroke={1.8} />} label="Số điện thoại" value={phone} />
                <InfoRow icon={<IconHome size={18} stroke={1.8} />} label="Loại tài khoản" value={formatRole(user?.role)} />
                <InfoRow icon={<IconMapPin size={18} stroke={1.8} />} label="Địa chỉ" value="Chưa cập nhật" />
              </div>
            </article>

            <div className="user-profile-side-panels">
              <article className="user-profile-panel">
                <div className="user-profile-panel-head">
                  <div>
                    <p className="user-profile-eyebrow">{'BẢO MẬT'}</p>
                    <h2>{'Thiết lập đăng nhập'}</h2>
                  </div>
                </div>
                <p className="user-profile-muted">
                  {'Quản lý mật khẩu, phiên đăng nhập và các phương thức xác thực trong các bản cập nhật sau.'}
                </p>
              </article>

              <article className="user-profile-panel user-profile-gold-panel">
                <p className="user-profile-eyebrow">{'HỖ TRỢ'}</p>
                <h2>{'Cần tư vấn cho dự án mới?'}</h2>
                <p>{'FurniSpace có thể giúp bạn chuẩn bị brief, concept và kế hoạch triển khai.'}</p>
                <button type="button">{'Liên hệ tư vấn'}</button>
              </article>
            </div>
          </section>
        </div>
      </section>

      <MainFooter />
    </main>
  );
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

function getInitials(value: string) {
  const initials = value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || 'U';
}
