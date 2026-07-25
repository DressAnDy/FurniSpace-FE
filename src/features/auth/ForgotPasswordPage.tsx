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
      setMessage('Vui lòng nhập email hợp lệ.');
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
          setMessage(result.message || 'Nếu tài khoản tồn tại, email đặt lại mật khẩu đã được gửi.');
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
          setMessage(result.message || 'Đã đặt lại mật khẩu. Vui lòng đăng nhập.');
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
            <h1 id="forgot-password-title">Quên mật khẩu</h1>
            <p className="login-helper-copy">Nhập email tài khoản để nhận mã đặt lại mật khẩu.</p>

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
              {forgotPasswordMutation.isPending ? 'Đang gửi...' : 'Gửi mã đặt lại'}
            </button>

            <p className="login-register-copy">
              Nhớ mật khẩu? <Link to="/login">Đăng nhập</Link>
            </p>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleResetSubmit}>
            <h1 id="forgot-password-title">Đặt mật khẩu mới</h1>
            <p className="login-helper-copy">Nhập mã trong email và mật khẩu mới cho {email}.</p>

            <div className="login-field-list">
              <label className="login-field">
                <span>Mã đặt lại</span>
                <input aria-label="Mã đặt lại" autoComplete="one-time-code" name="token" placeholder="Mã đặt lại" />
              </label>
              <label className="login-field">
                <span>Mật khẩu mới</span>
                <input
                  aria-label="Mật khẩu mới"
                  autoComplete="new-password"
                  name="newPassword"
                  placeholder="Mật khẩu mới"
                  type={showPassword ? 'text' : 'password'}
                />
                <button
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="login-password-toggle"
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <IconEyeOff size={20} stroke={1.9} /> : <IconEye size={20} stroke={1.9} />}
                </button>
              </label>
              <label className="login-field">
                <span>Xác nhận mật khẩu mới</span>
                <input
                  aria-label="Xác nhận mật khẩu mới"
                  autoComplete="new-password"
                  name="confirmPassword"
                  placeholder="Xác nhận mật khẩu mới"
                  type={showPassword ? 'text' : 'password'}
                />
              </label>
            </div>

            {message ? <p className="login-message">{message}</p> : null}

            <button className="login-submit" disabled={resetPasswordMutation.isPending} type="submit">
              {resetPasswordMutation.isPending ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
            </button>

            <p className="login-register-copy">
              Chưa nhận được mã?{' '}
              <button className="login-inline-button" disabled={forgotPasswordMutation.isPending} type="button" onClick={() => forgotPasswordMutation.mutate({ email })}>
                {forgotPasswordMutation.isPending ? 'Đang gửi...' : 'Gửi lại'}
              </button>
            </p>
          </form>
        )}
      </section>

      <section className="login-hero" aria-label="FurniSpace password reset preview">
        <img src={authenPic} alt="" aria-hidden="true" />
        <Link className="login-back-home" to="/">
          Trở về trang chủ
        </Link>
        <strong className="login-brand">FurniSpace</strong>
      </section>
    </main>
  );
}

function validateResetForm(input: { email: string; token: string; newPassword: string; confirmPassword: string }) {
  if (!normalizeEmail(input.email)) {
    return 'Vui lòng nhập email trước khi đặt lại mật khẩu.';
  }

  if (!input.token) {
    return 'Vui lòng nhập mã đặt lại mật khẩu.';
  }

  if (!isValidPassword(input.newPassword)) {
    return 'Mật khẩu phải dài 8-128 ký tự và có chữ hoa, chữ thường, số.';
  }

  if (input.newPassword !== input.confirmPassword) {
    return 'Xác nhận mật khẩu không khớp.';
  }

  return '';
}

function isValidPassword(password: string) {
  return password.length >= 8 && password.length <= 128 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
}
