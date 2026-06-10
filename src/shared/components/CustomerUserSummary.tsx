import { IconBell } from '@tabler/icons-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useCurrentUser, useLogout } from '@/services/queries';

import './CustomerUserSummary.css';

type CustomerUserSummaryProps = {
  classPrefix: string;
};

export function CustomerUserSummary({ classPrefix }: CustomerUserSummaryProps) {
  const navigate = useNavigate();
  const { data: user, isError, isLoading } = useCurrentUser();
  const logoutMutation = useLogout();
  const displayName = user?.fullName || (isLoading ? 'Loading...' : 'Guest');
  const role = formatRole(user?.role);
  const initials = getInitials(user?.fullName || user?.email || 'Guest');

  function handleLogout() {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        navigate('/login');
      },
    });
  }

  useEffect(() => {
    if (isError) {
      navigate('/login');
    }
  }, [isError, navigate]);

  return (
    <>
      <button className={`${classPrefix}-bell`} aria-label="Notifications" type="button">
        <IconBell size={20} stroke={1.8} />
        <span />
      </button>
      <button
        className={`${classPrefix}-user customer-user-summary-button`}
        disabled={logoutMutation.isPending}
        onClick={handleLogout}
        title="Đăng xuất"
        type="button"
      >
        <div>
          <strong>{displayName}</strong>
          <span>{role}</span>
        </div>
        <span>{initials}</span>
      </button>
    </>
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
