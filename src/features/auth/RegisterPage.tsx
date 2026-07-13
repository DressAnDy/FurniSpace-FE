import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import {
  AUTH_PENDING_EMAIL_KEY,
  getServiceResultMessage,
  normalizeEmail,
} from '@/services/api/auth';
import { useRegister } from '@/services/queries';

import './RegisterPage.css';

const registerFields = [
  { autoComplete: 'email', label: 'Email', name: 'email', type: 'email' },
  { autoComplete: 'name', label: 'Họ và tên', name: 'fullName', type: 'text' },
  { autoComplete: 'tel', label: 'Số điện thoại', name: 'phoneNumber', type: 'tel' },
  { autoComplete: 'new-password', label: 'Mật khẩu', name: 'password', type: 'password' },
  { autoComplete: 'new-password', label: 'Xác nhận mật khẩu', name: 'confirmPassword', type: 'password' },
];

export function RegisterPage() {
  const navigate = useNavigate();
  const registerMutation = useRegister();
  const [message, setMessage] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '');
    const fullName = String(formData.get('fullName') ?? '');
    const phone = String(formData.get('phone') ?? '');
    const password = String(formData.get('password') ?? '');
    const confirmPassword = String(formData.get('confirmPassword') ?? '');
    const validationMessage = validateRegisterForm({ confirmPassword, email, fullName, password, phone });

    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    registerMutation.mutate(
      { email, fullName, password, phone },
      {
        onError: (error) => {
          setMessage(getServiceResultMessage(error));
        },
        onSuccess: (result) => {
          const normalizedEmail = result.data?.email ?? normalizeEmail(email);

          sessionStorage.setItem(AUTH_PENDING_EMAIL_KEY, normalizedEmail);
          setMessage(result.message);
          navigate(`/code-verify?email=${encodeURIComponent(normalizedEmail)}`);
        },
      },
    );
  }

  return (
    <main className="register-page">
      <section className="register-form-panel" aria-labelledby="register-title">
        <form className="register-form" onSubmit={handleSubmit}>
          <h1 id="register-title">Đăng ký</h1>

          <div className="register-field-list">
            {registerFields.map((field) => (
              <label className="register-field" key={field.name}>
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

          {message ? <p className="register-message">{message}</p> : null}

          <button className="register-submit" type="submit" disabled={registerMutation.isPending}>
            {registerMutation.isPending ? 'Đang đăng ký...' : 'Đăng ký'}
          </button>

          <div className="register-divider" />

          <p className="register-login-copy">
            Bạn đã có tài khoản? <Link to="/login">Đăng nhập</Link>
          </p>
        </form>
      </section>

      <section className="register-hero" aria-label="FurniSpace register preview">
        <Link className="register-back-home" to="/">
          Trở về trang chủ
        </Link>
        <strong className="register-brand">FurniSpace</strong>
      </section>
    </main>
  );
}

function validateRegisterForm(input: {
  confirmPassword: string;
  email: string;
  fullName: string;
  password: string;
  phone: string;
}) {
  const email = normalizeEmail(input.email);
  const fullName = input.fullName.trim();
  const phone = input.phone.trim();

  if (!email || email.length > 100 || !email.includes('@')) {
    return 'Email không hợp lệ.';
  }

  if (!fullName || fullName.length > 100) {
    return 'Họ và tên không hợp lệ.';
  }

  if (phone.length > 20) {
    return 'Số điện thoại không được vượt quá 20 ký tự.';
  }

  if (!isValidPassword(input.password)) {
    return 'Mật khẩu phải dài 8-128 ký tự và có chữ hoa, chữ thường, số.';
  }

  if (input.password !== input.confirmPassword) {
    return 'Xác nhận mật khẩu không khớp.';
  }

  return '';
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
