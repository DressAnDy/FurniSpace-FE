import { FormEvent, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router-dom';

import authenPic from '@/assets/auth/register-hero.png';
import { getCurrentUser, getServiceResultMessage, normalizeEmail } from '@/services/api/auth';
import { useLogin } from '@/services/queries';

import { getPostLoginPath } from './authRedirect';
import './LoginPage.css';

const loginFields = [
  { autoComplete: 'email', label: 'Email', name: 'email', type: 'email' },
  { autoComplete: 'current-password', label: 'Password', name: 'password', type: 'password' },
];

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const loginMutation = useLogin();
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
          <h1 id="login-title">Sign in</h1>

          <div className="login-field-list">
            {loginFields.map((field) => (
              <label className="login-field" key={field.name}>
                <span>{field.label}</span>
                <input
                  aria-label={field.label}
                  autoComplete={field.autoComplete}
                  name={field.name}
                  placeholder={field.label}
                  type={field.type === 'password' && showPassword ? 'text' : field.type}
                />
                {field.type === 'password' ? (
                  <button
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="login-password-toggle"
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? <IconEyeOff size={20} stroke={1.9} /> : <IconEye size={20} stroke={1.9} />}
                  </button>
                ) : null}
              </label>
            ))}
          </div>

          {message ? <p className="login-message">{message}</p> : null}

          <button className="login-submit" type="submit" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
          </button>

          <div className="login-divider" />

          <div className="login-account-row">
            <p className="login-register-copy">
              Don&apos;t have an account? <Link to="/register">Sign up</Link>
            </p>
            <Link className="login-forgot-link" to="/forgot-password">
              Forgot password?
            </Link>
          </div>
        </form>
      </section>

      <section className="login-hero" aria-label="FurniSpace login preview">
        <img src={authenPic} alt="" aria-hidden="true" />
        <Link className="login-back-home" to="/">
          Back to home
        </Link>
        <strong className="login-brand">FurniSpace</strong>
      </section>
    </main>
  );
}

function validateLoginForm(input: { email: string; password: string }) {
  if (!normalizeEmail(input.email)) {
    return 'Please enter your email.';
  }

  if (!input.password.trim()) {
    return 'Please enter your password.';
  }

  return '';
}

