import loginObjectUrl from '@/assets/auth/login-object.png';
import loginRoomUrl from '@/assets/auth/login-room.png';

import './LoginPage.css';

export function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-shell" aria-label="Đăng nhập FurniSpace">
        <div className="login-panel">
          <h1>Đăng nhập</h1>

          <form className="login-form">
            <label htmlFor="login-email">Email</label>
            <input id="login-email" name="email" type="email" autoComplete="email" />

            <label htmlFor="login-password">Mật khẩu</label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
            />

            <a className="login-forgot-link" href="#forgot-password">
              Quên mật khẩu?
            </a>

            <button type="submit">Đăng nhập</button>
          </form>

          <p className="login-register">
            Chưa có tài khoản? <a href="#register">Đăng ký</a>
          </p>
        </div>

        <div className="login-visual">
          <img className="login-room" src={loginRoomUrl} alt="" />
          <div className="login-visual-overlay" />
          <p>FurniSpace</p>
          <img className="login-object" src={loginObjectUrl} alt="" />
          <span className="login-corner-mark" aria-hidden="true" />
        </div>
      </section>
    </main>
  );
}
