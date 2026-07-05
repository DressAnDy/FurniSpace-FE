import { circle, defineIcon, line, path, polyline, rect } from '../types';

export const mailIconDefinition = defineIcon('MailIcon', [
  rect(3, 5, 18, 14, 2),
  path('m3 7 9 6 9-6'),
]);

export const lockIconDefinition = defineIcon('LockIcon', [
  rect(5, 10, 14, 10, 2),
  path('M8 10V7a4 4 0 0 1 8 0v3'),
  line(12, 14, 12, 16.5),
]);

export const eyeIconDefinition = defineIcon('EyeIcon', [
  path('M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z'),
  circle(12, 12, 2.5),
]);

export const eyeOffIconDefinition = defineIcon('EyeOffIcon', [
  path('M9.9 5.3A10.4 10.4 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-2.1 2.9'),
  path('M6.2 6.2C3.8 7.8 2.5 12 2.5 12s3.5 7 9.5 7a9.8 9.8 0 0 0 5.6-1.8'),
  path('M9.9 9.9a3 3 0 0 0 4.2 4.2'),
  line(3, 3, 21, 21),
]);

export const userIconDefinition = defineIcon('UserIcon', [
  circle(12, 8, 3.5),
  path('M5 20a7 7 0 0 1 14 0'),
]);

export const userPlusIconDefinition = defineIcon('UserPlusIcon', [
  circle(10, 8, 3.5),
  path('M3.5 20a6.5 6.5 0 0 1 13 0'),
  line(19, 8, 19, 14),
  line(16, 11, 22, 11),
]);

export const logoutIconDefinition = defineIcon('LogoutIcon', [
  path('M10 17H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h4'),
  polyline('15 7 20 12 15 17'),
  line(20, 12, 9, 12),
]);

export const shieldIconDefinition = defineIcon('ShieldIcon', [
  path('M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z'),
  path('m9 12 2 2 4-5'),
]);
