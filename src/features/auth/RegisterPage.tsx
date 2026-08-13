import { FormEvent, useState } from 'react';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router-dom';

import authenPic from '@/assets/auth/register-hero.png';
import {
  AUTH_PENDING_EMAIL_KEY,
  getServiceResultMessage,
  normalizeEmail,
} from '@/services/api/auth';
import { useRegister } from '@/services/queries';

import './RegisterPage.css';

const registerFields = [
  { autoComplete: 'email', label: 'Email', name: 'email', type: 'email' },
  { autoComplete: 'name', label: 'Full name', name: 'fullName', type: 'text' },
  { autoComplete: 'tel', label: 'Phone number', name: 'phoneNumber', type: 'tel' },
  { autoComplete: 'new-password', label: 'Password', name: 'password', type: 'password' },
  { autoComplete: 'new-password', label: 'Confirm password', name: 'confirmPassword', type: 'password' },
];

export function RegisterPage() {
  const navigate = useNavigate();
  const registerMutation = useRegister();
  const [message, setMessage] = useState('');
  const [visiblePasswordFields, setVisiblePasswordFields] = useState<Record<string, boolean>>({});

  function togglePasswordVisibility(fieldName: string) {
    setVisiblePasswordFields((current) => ({
      ...current,
      [fieldName]: !current[fieldName],
    }));
  }

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
          <h1 id="register-title">Sign up</h1>

          <div className="register-field-list">
            {registerFields.map((field) => (
              <label className="register-field" key={field.name}>
                <span>{field.label}</span>
                {field.type === 'password' ? (
                  <button
                    aria-label={visiblePasswordFields[field.name] ? `Hide ${field.label.toLowerCase()}` : `Show ${field.label.toLowerCase()}`}
                    className="register-password-toggle"
                    type="button"
                    onClick={() => togglePasswordVisibility(field.name)}
                  >
                    {visiblePasswordFields[field.name] ? <IconEyeOff size={20} stroke={1.9} /> : <IconEye size={20} stroke={1.9} />}
                  </button>
                ) : null}
                <input
                  aria-label={field.label}
                  autoComplete={field.autoComplete}
                  name={field.name}
                  placeholder={field.label}
                  type={field.type === 'password' && visiblePasswordFields[field.name] ? 'text' : field.type}
                />
              </label>
            ))}
          </div>

          {message ? <p className="register-message">{message}</p> : null}

          <button className="register-submit" type="submit" disabled={registerMutation.isPending}>
            {registerMutation.isPending ? 'Signing up...' : 'Sign up'}
          </button>

          <div className="register-divider" />

          <p className="register-login-copy">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </section>

      <section className="register-hero" aria-label="FurniSpace register preview">
        <img src={authenPic} alt="" aria-hidden="true" />
        <Link className="register-back-home" to="/">
          Back to home
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
    return 'Please enter a valid email.';
  }

  if (!fullName || fullName.length > 100) {
    return 'Please enter a valid full name.';
  }

  if (phone.length > 20) {
    return 'Phone number must be 20 characters or fewer.';
  }

  if (!isValidPassword(input.password)) {
    return 'Password must be 8-128 characters and include uppercase, lowercase, and a number.';
  }

  if (input.password !== input.confirmPassword) {
    return 'Passwords do not match.';
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
