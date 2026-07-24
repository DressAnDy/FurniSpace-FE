export function getPostLoginPath(role?: string) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole.includes('ADMIN')) {
    return '/admin/dashbroad';
  }

  if (normalizedRole.includes('SALE')) {
    return '/sale/dashbroad';
  }

  if (normalizedRole.includes('DESIGNER')) {
    return '/designer/assigned-projects';
  }

  if (normalizedRole.includes('PRODUCTION')) {
    return '/production/customization-requests';
  }

  if (normalizedRole.includes('CUSTOMER')) {
    return '/customer/dashboard';
  }

  return '/';
}

function normalizeRole(role?: string) {
  return (role ?? '').trim().replace(/[\s-]+/g, '_').toUpperCase();
}
