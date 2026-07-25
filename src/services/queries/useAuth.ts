import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  changePassword,
  forgotPassword,
  getCurrentUser,
  login,
  logout,
  refresh,
  register,
  resendVerificationOtp,
  resetPassword,
  updateCurrentUser,
  verifyEmail,
  type ChangePasswordInput,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
  type ResendVerificationOtpInput,
  type ResetPasswordInput,
  type UpdateCurrentUserInput,
  type VerifyEmailInput,
} from '@/services/api/auth';

export const authQueryKeys = {
  all: ['auth'] as const,
  me: ['auth', 'me'] as const,
};

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

export function useResendVerificationOtp() {
  return useMutation({
    mutationFn: (input: ResendVerificationOtpInput) => resendVerificationOtp(input),
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: (input: LoginInput) => login(input),
  });
}

export function useRefreshAuth() {
  return useMutation({
    mutationFn: refresh,
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (input: ForgotPasswordInput) => forgotPassword(input),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) => resetPassword(input),
  });
}

type UseCurrentUserOptions = {
  enabled?: boolean;
};

export function useCurrentUser(options: UseCurrentUserOptions = {}) {
  return useQuery({
    queryKey: authQueryKeys.me,
    queryFn: getCurrentUser,
    enabled: options.enabled ?? true,
    retry: false,
    staleTime: 60_000,
    select: (result) => result.data,
  });
}

export function useUpdateCurrentUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateCurrentUserInput) => updateCurrentUser(input),
    onSuccess: (result) => {
      queryClient.setQueryData(authQueryKeys.me, result);
      void queryClient.invalidateQueries({ queryKey: authQueryKeys.me });
    },
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ChangePasswordInput) => changePassword(input),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: authQueryKeys.all });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: authQueryKeys.all });
    },
  });
}
