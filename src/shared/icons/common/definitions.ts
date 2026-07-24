import { circle, defineIcon, path, polygon, rect } from '../types';

export const starIconDefinition = defineIcon('StarIcon', [
  polygon('12 4 14.5 9.2 20.2 10 16.1 14 17.1 19.7 12 17 6.9 19.7 7.9 14 3.8 10 9.5 9.2 12 4'),
]);

export const heartIconDefinition = defineIcon('HeartIcon', [
  path('M20.5 8.8c0 5.2-8.5 10.2-8.5 10.2S3.5 14 3.5 8.8A4.5 4.5 0 0 1 12 6.7a4.5 4.5 0 0 1 8.5 2.1Z'),
]);

export const locationIconDefinition = defineIcon('LocationIcon', [
  path('M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z'),
  circle(12, 10, 2.5),
]);

export const mapPinIconDefinition = defineIcon('MapPinIcon', [
  path('M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z'),
  circle(12, 11, 2),
]);

export const cameraIconDefinition = defineIcon('CameraIcon', [
  path('M6 7h3l1.5-2h3L15 7h3a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3Z'),
  circle(12, 13.5, 3),
]);

export const linkIconDefinition = defineIcon('LinkIcon', [
  path('M10 13a5 5 0 0 0 7.1.2l2.1-2.1a4 4 0 0 0-5.7-5.7l-1.2 1.2'),
  path('M14 11a5 5 0 0 0-7.1-.2l-2.1 2.1a4 4 0 0 0 5.7 5.7l1.2-1.2'),
]);

export const copyIconDefinition = defineIcon('CopyIcon', [
  rect(8, 8, 11, 11, 2),
  path('M5 16H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'),
]);

export const helpIconDefinition = defineIcon('HelpIcon', [
  circle(12, 12, 8),
  path('M9.8 9a2.6 2.6 0 1 1 4.4 1.8c-1.4 1-2.2 1.7-2.2 3.2'),
  path('M12 17h.01'),
]);
