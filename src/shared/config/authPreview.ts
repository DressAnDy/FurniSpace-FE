export function isAuthPreviewBypassEnabled() {
  return import.meta.env.VITE_DISABLE_AUTH_GUARD === 'true';
}

export function shouldRedirectUnauthorized() {
  return !isAuthPreviewBypassEnabled() && window.location.pathname !== '/login';
}
