import { describe, expect, it } from 'vitest';

import { getPostLoginPath } from './authRedirect';

describe('getPostLoginPath', () => {
  it.each([
    ['ADMIN', '/admin/dashbroad'],
    ['ROLE_SALE', '/sale/dashbroad'],
    ['designer', '/designer/assigned-projects'],
    ['ROLE-DESIGNER', '/designer/assigned-projects'],
    ['CUSTOMER', '/customer/dashboard'],
  ])('routes %s to the correct workspace', (role, expectedPath) => {
    expect(getPostLoginPath(role)).toBe(expectedPath);
  });

  it('does not route an unknown role into the customer workspace', () => {
    expect(getPostLoginPath('PRODUCTION')).toBe('/');
    expect(getPostLoginPath()).toBe('/');
  });
});
