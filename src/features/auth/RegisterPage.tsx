import { Link } from 'react-router-dom';

import registerHero from '@/assets/auth/register-hero.png';

import './RegisterPage.css';

const registerFields = [
  { autoComplete: 'email', label: 'Email', name: 'email', type: 'email' },
  { autoComplete: 'name', label: 'Họ và tên', name: 'fullName', type: 'text' },
  { autoComplete: 'tel', label: 'Số điện thoại', name: 'phoneNumber', type: 'tel' },
  { autoComplete: 'new-password', label: 'Mật khẩu', name: 'password', type: 'password' },
  { autoComplete: 'new-password', label: 'Xác nhận mật khẩu', name: 'confirmPassword', type: 'password' },
];

export function RegisterPage() {
  return (
    <main className="register-page">
      <section className="register-form-panel" aria-labelledby="register-title">
        <form className="register-form">
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

          <button className="register-submit" type="submit">
            Đăng ký
          </button>

          <div className="register-divider" />

          <p className="register-login-copy">
            Bạn đã có tài khoản? <Link to="/login">Đăng nhập</Link>
          </p>
        </form>
      </section>

      <section className="register-hero" aria-label="FurniSpace register preview">
        <img src={registerHero} alt="Warm wooden interior design preview" />
        <Link className="register-back-home" to="/">
          Trở về trang chủ
        </Link>
        <strong className="register-brand">FurniSpace</strong>
      </section>
    </main>
  );
}
