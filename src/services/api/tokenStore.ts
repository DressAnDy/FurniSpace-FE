const AUTH_ACCESS_TOKEN_KEY = 'auth.accessToken';
const LEGACY_ACCESS_TOKEN_KEY = 'accessToken';

export function storeAccessToken(token: string) {
  localStorage.setItem(AUTH_ACCESS_TOKEN_KEY, token);
  localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
}

export function getStoredAccessToken() {
  return localStorage.getItem(AUTH_ACCESS_TOKEN_KEY) ?? localStorage.getItem(LEGACY_ACCESS_TOKEN_KEY);
}

export function removeStoredAccessToken() {
  localStorage.removeItem(AUTH_ACCESS_TOKEN_KEY);
  localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
}
