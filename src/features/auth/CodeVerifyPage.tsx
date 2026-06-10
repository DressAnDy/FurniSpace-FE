import { ChangeEvent, FormEvent, KeyboardEvent, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import authHero from '@/assets/auth/register-hero.png';
import {
  AUTH_PENDING_EMAIL_KEY,
  getServiceResultMessage,
  normalizeEmail,
} from '@/services/api/auth';
import { useVerifyEmail } from '@/services/queries';

import './CodeVerifyPage.css';

const codeSlots = Array.from({ length: 6 }, (_, index) => `code-${index + 1}`);

export function CodeVerifyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const verifyMutation = useVerifyEmail();
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [code, setCode] = useState(() => Array.from({ length: 6 }, () => ''));
  const [message, setMessage] = useState('');
  const email = useMemo(() => {
    const emailFromUrl = searchParams.get('email') ?? '';
    const emailFromStorage = sessionStorage.getItem(AUTH_PENDING_EMAIL_KEY) ?? '';

    return normalizeEmail(emailFromUrl || emailFromStorage);
  }, [searchParams]);

  function handleCodeChange(index: number, event: ChangeEvent<HTMLInputElement>) {
    const nextDigit = event.target.value.replace(/\D/g, '').slice(-1);

    setCode((currentCode) => {
      const nextCode = [...currentCode];

      nextCode[index] = nextDigit;
      return nextCode;
    });

    if (nextDigit && index < codeSlots.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleCodeKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const otpCode = code.join('');

    if (!email) {
      setMessage('Không tìm thấy email cần xác nhận. Vui lòng đăng ký lại.');
      return;
    }

    if (otpCode.length !== 6) {
      setMessage('Vui lòng nhập đủ 6 số OTP.');
      return;
    }

    verifyMutation.mutate(
      { email, otpCode },
      {
        onError: (error) => {
          setMessage(getServiceResultMessage(error));
        },
        onSuccess: (result) => {
          sessionStorage.removeItem(AUTH_PENDING_EMAIL_KEY);
          setMessage(result.message);
          navigate('/customer-dashboard');
        },
      },
    );
  }

  return (
    <main className="code-verify-page">
      <section className="code-verify-form-panel" aria-labelledby="code-verify-title">
        <form className="code-verify-form" onSubmit={handleSubmit}>
          <h1 id="code-verify-title">Xác nhận</h1>
          <p>Nhập mã CODE mà chúng tôi đã gửi cho bạn thông qua email để xác nhận</p>

          <div className="code-verify-inputs" aria-label="Verification code">
            {codeSlots.map((slot, index) => (
              <input
                aria-label={`Mã xác nhận số ${index + 1}`}
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                inputMode="numeric"
                key={slot}
                maxLength={1}
                name={slot}
                onChange={(event) => handleCodeChange(index, event)}
                onKeyDown={(event) => handleCodeKeyDown(index, event)}
                ref={(node) => {
                  inputRefs.current[index] = node;
                }}
                type="text"
                value={code[index]}
              />
            ))}
          </div>

          {message ? <p className="code-verify-message">{message}</p> : null}

          <button className="code-verify-submit" type="submit" disabled={verifyMutation.isPending}>
            {verifyMutation.isPending ? 'Đang xác nhận...' : 'Xác nhận'}
          </button>

          <div className="code-verify-divider" />
        </form>
      </section>

      <section className="code-verify-hero" aria-label="FurniSpace verification preview">
        <img src={authHero} alt="Warm wooden interior design preview" />
        <Link className="code-verify-back-home" to="/">
          Trở về trang chủ
        </Link>
        <strong className="code-verify-brand">FurniSpace</strong>
      </section>
    </main>
  );
}
