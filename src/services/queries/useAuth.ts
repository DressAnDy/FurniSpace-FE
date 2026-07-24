import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getCurrentUser,
  login,
  logout,
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

type UseCurrentUserOptions = {
  enabled?: boolean;
};

export function useCurrentUser(options: UseCurrentUserOptions = {}) {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getCurrentUser,
    enabled: options.enabled ?? true,
    retry: false,
    staleTime: 60_000,
    select: (result) => result.data,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['auth'] });
    },
  });
}
