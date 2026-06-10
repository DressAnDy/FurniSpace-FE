const LEGACY_ACCESS_TOKEN_KEY = 'accessToken';

export function removeLegacyAccessToken() {
  localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
}
