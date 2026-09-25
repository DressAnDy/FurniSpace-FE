import { type ChangeEvent, type FormEvent, type FocusEvent, useState } from 'react';
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

type RegisterFieldName = 'email' | 'fullName' | 'phoneNumber' | 'password' | 'confirmPassword';

type RegisterFormValues = Record<RegisterFieldName, string>;

type FieldErrors = Partial<Record<RegisterFieldName, string>>;

const registerFields: Array<{
  autoComplete: string;
  label: string;
  name: RegisterFieldName;
  type: 'email' | 'text' | 'tel' | 'password';
  required: boolean;
}> = [
  { autoComplete: 'email', label: 'Email', name: 'email', type: 'email', required: true },
  { autoComplete: 'name', label: 'Full name', name: 'fullName', type: 'text', required: true },
  { autoComplete: 'tel', label: 'Phone number', name: 'phoneNumber', type: 'tel', required: false },
  { autoComplete: 'new-password', label: 'Password', name: 'password', type: 'password', required: true },
  { autoComplete: 'new-password', label: 'Confirm password', name: 'confirmPassword', type: 'password', required: true },
];

const EMPTY_VALUES: RegisterFormValues = {
  email: '',
  fullName: '',
  phoneNumber: '',
  password: '',
  confirmPassword: '',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+]?[\d\s().-]{8,20}$/;

export function RegisterPage() {
  const navigate = useNavigate();
  const registerMutation = useRegister();
  const [values, setValues] = useState<RegisterFormValues>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<RegisterFieldName, boolean>>>({});
  const [formMessage, setFormMessage] = useState('');
  const [visiblePasswordFields, setVisiblePasswordFields] = useState<Partial<Record<RegisterFieldName, boolean>>>({});

  function togglePasswordVisibility(fieldName: RegisterFieldName) {
    setVisiblePasswordFields((current) => ({
      ...current,
      [fieldName]: !current[fieldName],
    }));
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    const fieldName = name as RegisterFieldName;

    setValues((current) => ({ ...current, [fieldName]: value }));
    setFormMessage('');

    if (touched[fieldName] || fieldErrors[fieldName]) {
      const nextValues = { ...values, [fieldName]: value };
      const error = validateRegisterField(fieldName, nextValues);
      setFieldErrors((current) => {
        const next = { ...current };
        if (error) {
          next[fieldName] = error;
        } else {
          delete next[fieldName];
        }
        // Keep confirm password in sync when password changes.
        if (fieldName === 'password' && (touched.confirmPassword || current.confirmPassword)) {
          const confirmError = validateRegisterField('confirmPassword', nextValues);
          if (confirmError) {
            next.confirmPassword = confirmError;
          } else {
            delete next.confirmPassword;
          }
        }
        return next;
      });
    }
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    const fieldName = event.target.name as RegisterFieldName;
    setTouched((current) => ({ ...current, [fieldName]: true }));
    const error = validateRegisterField(fieldName, values);
    setFieldErrors((current) => {
      const next = { ...current };
      if (error) {
        next[fieldName] = error;
      } else {
        delete next[fieldName];
      }
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = validateRegisterForm(values);
    const touchedAll = registerFields.reduce<Partial<Record<RegisterFieldName, boolean>>>((acc, field) => {
      acc[field.name] = true;
      return acc;
    }, {});

    setTouched(touchedAll);
    setFieldErrors(errors);

    const firstError = registerFields.map((field) => errors[field.name]).find(Boolean);
    if (firstError) {
      setFormMessage(firstError);
      return;
    }

    setFormMessage('');
    registerMutation.mutate(
      {
        email: values.email,
        fullName: values.fullName,
        password: values.password,
        phone: values.phoneNumber.trim() || null,
      },
      {
        onError: (error) => {
          setFormMessage(getServiceResultMessage(error));
        },
        onSuccess: (result) => {
          const normalizedEmail = result.data?.email ?? normalizeEmail(values.email);

          sessionStorage.setItem(AUTH_PENDING_EMAIL_KEY, normalizedEmail);
          setFormMessage(result.message);
          navigate(`/code-verify?email=${encodeURIComponent(normalizedEmail)}`);
        },
      },
    );
  }

  return (
    <main className="register-page">
      <section className="register-form-panel" aria-labelledby="register-title">
        <form className="register-form" noValidate onSubmit={handleSubmit}>
          <h1 id="register-title">Sign up</h1>

          <div className="register-field-list">
            {registerFields.map((field) => {
              const error = fieldErrors[field.name];
              const isPassword = field.type === 'password';

              return (
                <label className={`register-field${error ? ' is-invalid' : ''}`} key={field.name}>
                  <span>
                    {field.label}
                    {field.required ? ' *' : ''}
                  </span>
                  <div className="register-field-control">
                    <input
                      aria-invalid={Boolean(error)}
                      aria-label={field.label}
                      autoComplete={field.autoComplete}
                      className={error ? 'is-invalid' : undefined}
                      name={field.name}
                      placeholder={field.required ? `${field.label} *` : field.label}
                      required={field.required}
                      type={isPassword && visiblePasswordFields[field.name] ? 'text' : field.type}
                      value={values[field.name]}
                      onBlur={handleBlur}
                      onChange={handleChange}
                    />
                    {isPassword ? (
                      <button
                        aria-label={
                          visiblePasswordFields[field.name]
                            ? `Hide ${field.label.toLowerCase()}`
                            : `Show ${field.label.toLowerCase()}`
                        }
                        className="register-password-toggle"
                        type="button"
                        onClick={() => togglePasswordVisibility(field.name)}
                      >
                        {visiblePasswordFields[field.name] ? (
                          <IconEyeOff size={20} stroke={1.9} />
                        ) : (
                          <IconEye size={20} stroke={1.9} />
                        )}
                      </button>
                    ) : null}
                  </div>
                </label>
              );
            })}
          </div>

          {formMessage ? (
            <p className="register-message" role="alert">
              {formMessage}
            </p>
          ) : null}

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

function validateRegisterForm(values: RegisterFormValues): FieldErrors {
  const errors: FieldErrors = {};

  for (const field of registerFields) {
    const error = validateRegisterField(field.name, values);
    if (error) {
      errors[field.name] = error;
    }
  }

  return errors;
}

function validateRegisterField(fieldName: RegisterFieldName, values: RegisterFormValues): string {
  switch (fieldName) {
    case 'email':
      return validateEmail(values.email);
    case 'fullName':
      return validateFullName(values.fullName);
    case 'phoneNumber':
      return validatePhone(values.phoneNumber);
    case 'password':
      return validatePassword(values.password);
    case 'confirmPassword':
      return validateConfirmPassword(values.password, values.confirmPassword);
    default:
      return '';
  }
}

function validateEmail(rawEmail: string) {
  const email = normalizeEmail(rawEmail);

  if (!email) {
    return 'Email is required.';
  }

  if (email.length > 100) {
    return 'Email must be 100 characters or fewer.';
  }

  if (!EMAIL_PATTERN.test(email)) {
    return 'Please enter a valid email address.';
  }

  return '';
}

function validateFullName(rawFullName: string) {
  const fullName = rawFullName.trim();

  if (!fullName) {
    return 'Full name is required.';
  }

  if (fullName.length < 2) {
    return 'Full name must be at least 2 characters.';
  }

  if (fullName.length > 100) {
    return 'Full name must be 100 characters or fewer.';
  }

  return '';
}

function validatePhone(rawPhone: string) {
  const phone = rawPhone.trim();

  if (!phone) {
    return '';
  }

  if (phone.length > 20) {
    return 'Phone number must be 20 characters or fewer.';
  }

  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15 || !PHONE_PATTERN.test(phone)) {
    return 'Please enter a valid phone number.';
  }

  return '';
}

function validatePassword(password: string) {
  if (!password) {
    return 'Password is required.';
  }

  if (!isValidPassword(password)) {
    return 'Password must be 8–128 characters and include uppercase, lowercase, and a number.';
  }

  return '';
}

function validateConfirmPassword(password: string, confirmPassword: string) {
  if (!confirmPassword) {
    return 'Please confirm your password.';
  }

  if (password !== confirmPassword) {
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
