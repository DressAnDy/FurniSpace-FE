import { FormEvent, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';

import { getCurrentUser, getServiceResultMessage, normalizeEmail } from '@/services/api/auth';
import { useLogin } from '@/services/queries';

import { getPostLoginPath } from './authRedirect';
import './LoginPage.css';

const loginFields = [
  { autoComplete: 'email', label: 'Email', name: 'email', type: 'email' },
  { autoComplete: 'current-password', label: 'Mật khẩu', name: 'password', type: 'password' },
];

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const loginMutation = useLogin();
  const [message, setMessage] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');
    const validationMessage = validateLoginForm({ email, password });

    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    loginMutation.mutate(
      { email, password },
      {
        onError: (error) => {
          setMessage(getServiceResultMessage(error));
        },
        onSuccess: async (result) => {
          setMessage(result.message);

          try {
            const currentUserResult = await getCurrentUser();
            const currentUser = currentUserResult.data;

            queryClient.setQueryData(['auth', 'me'], currentUserResult);
            navigate(getPostLoginPath(currentUser?.role), { replace: true });
          } catch (error) {
            setMessage(getServiceResultMessage(error));
          }
        },
      },
    );
  }

  return (
    <main className="login-page">
      <section className="login-form-panel" aria-labelledby="login-title">
        <form className="login-form" onSubmit={handleSubmit}>
          <h1 id="login-title">Đăng nhập</h1>

          <div className="login-field-list">
            {loginFields.map((field) => (
              <label className="login-field" key={field.name}>
                <span>{field.label}</span>
                <input
                  aria-label={field.label}
                  autoComplete={field.autoComplete}
                  name={field.name}
                  placeholder={field.label}
                  type={field.type}
                />
              </label>
            ))}
          </div>

          {message ? <p className="login-message">{message}</p> : null}

          <button className="login-submit" type="submit" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>

          <div className="login-divider" />

          <p className="login-register-copy">
            Bạn chưa có tài khoản? <Link to="/register">Đăng ký</Link>
          </p>
        </form>
      </section>

      <section className="login-hero" aria-label="FurniSpace login preview">
        <Link className="login-back-home" to="/">
          Trở về trang chủ
        </Link>
        <strong className="login-brand">FurniSpace</strong>
      </section>
    </main>
  );
}

function validateLoginForm(input: { email: string; password: string }) {
  if (!normalizeEmail(input.email)) {
    return 'Vui lòng nhập email.';
  }

  if (!input.password.trim()) {
    return 'Vui lòng nhập mật khẩu.';
  }

  return '';
}

