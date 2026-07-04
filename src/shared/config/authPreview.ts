export function shouldRedirectUnauthorized() {
  return window.location.pathname !== '/login';
}
