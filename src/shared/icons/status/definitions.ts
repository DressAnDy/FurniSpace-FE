import { circle, defineIcon, line, path, polyline } from '../types';

export const checkIconDefinition = defineIcon('CheckIcon', [polyline('5 12.5 10 17 19 7')]);

export const circleCheckIconDefinition = defineIcon('CircleCheckIcon', [circle(12, 12, 8), polyline('8 12.5 11 15.5 16.5 9')]);

export const xCircleIconDefinition = defineIcon('XCircleIcon', [circle(12, 12, 8), line(9, 9, 15, 15), line(15, 9, 9, 15)]);

export const alertCircleIconDefinition = defineIcon('AlertCircleIcon', [circle(12, 12, 8), line(12, 8, 12, 13), path('M12 16h.01')]);

export const infoIconDefinition = defineIcon('InfoIcon', [circle(12, 12, 8), line(12, 11, 12, 16), path('M12 8h.01')]);

export const warningIconDefinition = defineIcon('WarningIcon', [
  path('M12 4 21 20H3L12 4Z'),
  line(12, 10, 12, 14),
  path('M12 17h.01'),
]);

export const pendingIconDefinition = defineIcon('PendingIcon', [circle(12, 12, 8), line(12, 7, 12, 12), line(12, 12, 15, 14)]);

export const activeIconDefinition = defineIcon('ActiveIcon', [circle(12, 12, 8), circle(12, 12, 3)]);

export const inactiveIconDefinition = defineIcon('InactiveIcon', [circle(12, 12, 8), line(8, 16, 16, 8)]);
