const LEGACY_ACCESS_TOKEN_KEY = 'accessToken';
const AUTH_ACCESS_TOKEN_KEY = 'auth.accessToken';

export function removeLegacyAccessToken() {
  localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
}

export function storeAccessToken(token: string) {
  localStorage.setItem(AUTH_ACCESS_TOKEN_KEY, token);
}

export function getStoredAccessToken() {
  return localStorage.getItem(AUTH_ACCESS_TOKEN_KEY);
}

export function removeStoredAccessToken() {
  localStorage.removeItem(AUTH_ACCESS_TOKEN_KEY);
  removeLegacyAccessToken();
}
