import { circle, defineIcon, line, path, polyline, rect } from '../types';

export const bellIconDefinition = defineIcon('BellIcon', [
  path('M18 9a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7'),
  path('M10 20a2 2 0 0 0 4 0'),
]);

export const chatIconDefinition = defineIcon('ChatIcon', [
  path('M21 12a8 8 0 0 1-8 8H7l-4 2 1.7-4A8 8 0 1 1 21 12Z'),
  line(8, 11, 16, 11),
  line(8, 15, 13, 15),
]);

export const messageIconDefinition = defineIcon('MessageIcon', [
  rect(4, 5, 16, 12, 2),
  path('M8 17 4 21v-4'),
  line(8, 9, 16, 9),
  line(8, 13, 14, 13),
]);

export const phoneIconDefinition = defineIcon('PhoneIcon', [
  path('M6.6 4.5 9 4l2 4-1.8 1.4a12 12 0 0 0 5.4 5.4L16 13l4 2-.5 2.4A2 2 0 0 1 17.4 19C10.6 18.3 5.7 13.4 5 6.6a2 2 0 0 1 1.6-2.1Z'),
]);

export const mailIconDefinition = defineIcon('MailIcon', [rect(3, 5, 18, 14, 2), path('m3 7 9 6 9-6')]);

export const sendIconDefinition = defineIcon('SendIcon', [
  path('M21 3 10 14'),
  path('m21 3-7 18-4-7-7-4 18-7Z'),
]);

export const paperclipIconDefinition = defineIcon('PaperclipIcon', [
  path('m21 11.5-8.8 8.8a5 5 0 0 1-7.1-7.1l9.2-9.2a3.4 3.4 0 0 1 4.8 4.8l-9.2 9.2a1.8 1.8 0 0 1-2.6-2.6l8.5-8.5'),
]);

export const notificationIconDefinition = defineIcon('NotificationIcon', [
  circle(17, 7, 3),
  path('M14 5H7a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-5'),
  polyline('8 11 11 14 16 9'),
]);
