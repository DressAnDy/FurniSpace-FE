import { circle, defineIcon, line, path, polyline, rect } from '../types';

export const homeIconDefinition = defineIcon('HomeIcon', [
  path('M3 11.5 12 4l9 7.5'),
  path('M5.5 10.5V20h13v-9.5'),
  path('M9.5 20v-6h5v6'),
]);

export const dashboardIconDefinition = defineIcon('DashboardIcon', [
  rect(4, 4, 7, 7, 1.5),
  rect(13, 4, 7, 5, 1.5),
  rect(13, 11, 7, 9, 1.5),
  rect(4, 13, 7, 7, 1.5),
]);

export const menuIconDefinition = defineIcon('MenuIcon', [line(4, 7, 20, 7), line(4, 12, 20, 12), line(4, 17, 20, 17)]);

export const closeIconDefinition = defineIcon('CloseIcon', [line(6, 6, 18, 18), line(18, 6, 6, 18)]);

export const chevronLeftIconDefinition = defineIcon('ChevronLeftIcon', [polyline('15 18 9 12 15 6')]);

export const chevronRightIconDefinition = defineIcon('ChevronRightIcon', [polyline('9 18 15 12 9 6')]);

export const chevronDownIconDefinition = defineIcon('ChevronDownIcon', [polyline('6 9 12 15 18 9')]);

export const arrowLeftIconDefinition = defineIcon('ArrowLeftIcon', [line(20, 12, 4, 12), polyline('10 6 4 12 10 18')]);

export const arrowRightIconDefinition = defineIcon('ArrowRightIcon', [line(4, 12, 20, 12), polyline('14 6 20 12 14 18')]);

export const searchIconDefinition = defineIcon('SearchIcon', [circle(10.5, 10.5, 5.5), line(15, 15, 21, 21)]);

export const settingsIconDefinition = defineIcon('SettingsIcon', [
  circle(12, 12, 3),
  path('M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1-2 3.4-.2-.1a1.8 1.8 0 0 0-2.1.2l-.4.2a1.8 1.8 0 0 0-1 1.6v.1h-4v-.1a1.8 1.8 0 0 0-1-1.6l-.4-.2a1.8 1.8 0 0 0-2.1-.2l-.2.1-2-3.4.1-.1a1.8 1.8 0 0 0 .4-2v-.5a1.8 1.8 0 0 0-1.4-1.3h-.2v-4h.2A1.8 1.8 0 0 0 5 8l.1-.5a1.8 1.8 0 0 0-.4-2l-.1-.1 2-3.4.2.1a1.8 1.8 0 0 0 2.1-.2l.4-.2A1.8 1.8 0 0 0 10.2.1V0h4v.1a1.8 1.8 0 0 0 1 1.6l.4.2a1.8 1.8 0 0 0 2.1.2l.2-.1 2 3.4-.1.1a1.8 1.8 0 0 0-.4 2l.1.5A1.8 1.8 0 0 0 21 9.3h.2v4H21a1.8 1.8 0 0 0-1.5 1.2l-.1.5Z'),
]);
