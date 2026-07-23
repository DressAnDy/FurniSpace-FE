import { IconChevronDown, IconLogout, IconUserCircle } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import { useCurrentUser, useLogout } from '@/services/queries';
import { NotificationBell } from '@/shared/components/NotificationBell';

import './CustomerUserSummary.css';

type CustomerUserSummaryProps = {
  classPrefix: string;
};

export function CustomerUserSummary({ classPrefix }: CustomerUserSummaryProps) {
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: user, isError, isLoading } = useCurrentUser();
  const logoutMutation = useLogout();
  const displayName = user?.fullName || (isLoading ? 'Loading...' : 'Guest');
  const role = formatRole(user?.role);
  const initials = getInitials(user?.fullName || user?.email || 'Guest');

  function handleLogout() {
    setIsMenuOpen(false);
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

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <>
      <NotificationBell buttonClassName={`${classPrefix}-bell`} />
      <div className="customer-user-summary-menu-wrap" ref={menuRef}>
        <button
          aria-expanded={isMenuOpen}
          aria-haspopup="menu"
          className="customer-user-summary-button"
          disabled={logoutMutation.isPending}
          onClick={() => setIsMenuOpen((current) => !current)}
          title="Account menu"
          type="button"
        >
          <div>
            <strong>{displayName}</strong>
            <span>{role}</span>
          </div>
          <span className="customer-user-summary-avatar">
            {user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials}
          </span>
          <IconChevronDown className="customer-user-summary-chevron" size={15} stroke={1.9} />
        </button>

        {isMenuOpen ? (
          <div className="customer-user-summary-menu" role="menu">
            <NavLink className="customer-user-summary-menu-item" role="menuitem" to="/user-profile" onClick={() => setIsMenuOpen(false)}>
              <IconUserCircle size={17} stroke={1.8} />
              <span>View Profile</span>
            </NavLink>
            <button className="customer-user-summary-menu-item customer-user-summary-menu-danger" disabled={logoutMutation.isPending} role="menuitem" type="button" onClick={handleLogout}>
              <IconLogout size={17} stroke={1.8} />
              <span>{logoutMutation.isPending ? 'Signing out...' : 'Sign Out'}</span>
            </button>
          </div>
        ) : null}
      </div>
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
