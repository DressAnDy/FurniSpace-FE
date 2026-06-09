import { useMutation } from '@tanstack/react-query';

import {
  login,
  register,
  verifyEmail,
  type LoginInput,
  type RegisterInput,
  type VerifyEmailInput,
} from '@/services/api/auth';

export function useRegister() {
  return useMutation({
    mutationFn: (input: RegisterInput) => register(input),
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (input: VerifyEmailInput) => verifyEmail(input),
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: (input: LoginInput) => login(input),
  });
}
