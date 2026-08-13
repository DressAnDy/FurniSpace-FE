import { type FormEvent, useState } from 'react';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router-dom';

import authenPic from '@/assets/auth/register-hero.png';
import { getServiceResultMessage, normalizeEmail } from '@/services/api/auth';
import { useForgotPassword, useResetPassword } from '@/services/queries';

import './LoginPage.css';

type ResetStep = 'request' | 'reset';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const forgotPasswordMutation = useForgotPassword();
  const resetPasswordMutation = useResetPassword();
  const [step, setStep] = useState<ResetStep>('request');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  function handleRequestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setMessage('Please enter a valid email.');
      return;
    }

    forgotPasswordMutation.mutate(
      { email: normalizedEmail },
      {
        onError: (error) => {
          setMessage(getServiceResultMessage(error));
        },
        onSuccess: (result) => {
          setEmail(normalizedEmail);
          setMessage(result.message || 'If an account exists, a password reset email has been sent.');
          setStep('reset');
        },
      },
    );
  }

  function handleResetSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const token = String(formData.get('token') ?? '').trim();
    const newPassword = String(formData.get('newPassword') ?? '');
    const confirmPassword = String(formData.get('confirmPassword') ?? '');
    const validationMessage = validateResetForm({ email, token, newPassword, confirmPassword });

    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    resetPasswordMutation.mutate(
      { email, token, newPassword },
      {
        onError: (error) => {
          setMessage(getServiceResultMessage(error));
        },
        onSuccess: (result) => {
          setMessage(result.message || 'Password updated. Please sign in.');
          window.setTimeout(() => navigate('/login', { replace: true }), 900);
        },
      },
    );
  }

  return (
    <main className="login-page">
      <section className="login-form-panel" aria-labelledby="forgot-password-title">
        {step === 'request' ? (
          <form className="login-form" onSubmit={handleRequestSubmit}>
            <h1 id="forgot-password-title">Forgot password</h1>
            <p className="login-helper-copy">Enter your account email to receive a password reset code.</p>

            <label className="login-field">
              <span>Email</span>
              <input
                aria-label="Email"
                autoComplete="email"
                name="email"
                placeholder="Email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            {message ? <p className="login-message">{message}</p> : null}

            <button className="login-submit" disabled={forgotPasswordMutation.isPending} type="submit">
              {forgotPasswordMutation.isPending ? 'Sending...' : 'Send reset code'}
            </button>

            <p className="login-register-copy">
              Remember your password? <Link to="/login">Sign in</Link>
            </p>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleResetSubmit}>
            <h1 id="forgot-password-title">Set a new password</h1>
            <p className="login-helper-copy">Enter the code from your email and a new password for {email}.</p>

            <div className="login-field-list">
              <label className="login-field">
                <span>Reset code</span>
                <input aria-label="Reset code" autoComplete="one-time-code" name="token" placeholder="Reset code" />
              </label>
              <label className="login-field">
                <span>New password</span>
                <input
                  aria-label="New password"
                  autoComplete="new-password"
                  name="newPassword"
                  placeholder="New password"
                  type={showPassword ? 'text' : 'password'}
                />
                <button
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="login-password-toggle"
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <IconEyeOff size={20} stroke={1.9} /> : <IconEye size={20} stroke={1.9} />}
                </button>
              </label>
              <label className="login-field">
                <span>Confirm new password</span>
                <input
                  aria-label="Confirm new password"
                  autoComplete="new-password"
                  name="confirmPassword"
                  placeholder="Confirm new password"
                  type={showPassword ? 'text' : 'password'}
                />
              </label>
            </div>

            {message ? <p className="login-message">{message}</p> : null}

            <button className="login-submit" disabled={resetPasswordMutation.isPending} type="submit">
              {resetPasswordMutation.isPending ? 'Updating...' : 'Update password'}
            </button>

            <p className="login-register-copy">
              Didn&apos;t get a code?{' '}
              <button className="login-inline-button" disabled={forgotPasswordMutation.isPending} type="button" onClick={() => forgotPasswordMutation.mutate({ email })}>
                {forgotPasswordMutation.isPending ? 'Sending...' : 'Resend'}
              </button>
            </p>
          </form>
        )}
      </section>

      <section className="login-hero" aria-label="FurniSpace password reset preview">
        <img src={authenPic} alt="" aria-hidden="true" />
        <Link className="login-back-home" to="/">
          Back to home
        </Link>
        <strong className="login-brand">FurniSpace</strong>
      </section>
    </main>
  );
}

function validateResetForm(input: { email: string; token: string; newPassword: string; confirmPassword: string }) {
  if (!normalizeEmail(input.email)) {
    return 'Please enter your email before resetting the password.';
  }

  if (!input.token) {
    return 'Please enter the password reset code.';
  }

  if (!isValidPassword(input.newPassword)) {
    return 'Password must be 8-128 characters and include uppercase, lowercase, and a number.';
  }

  if (input.newPassword !== input.confirmPassword) {
    return 'Passwords do not match.';
  }

  return '';
}

function isValidPassword(password: string) {
  return password.length >= 8 && password.length <= 128 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
}
