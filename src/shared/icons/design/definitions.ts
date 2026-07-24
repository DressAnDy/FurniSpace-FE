import { circle, defineIcon, line, path, polygon, polyline, rect } from '../types';

export const layerIconDefinition = defineIcon('LayerIcon', [
  polygon('12 3 21 8 12 13 3 8 12 3'),
  polyline('3 12 12 17 21 12'),
  polyline('3 16 12 21 21 16'),
]);

export const boxIconDefinition = defineIcon('BoxIcon', [
  polygon('12 3 20 7.5 12 12 4 7.5 12 3'),
  polyline('4 7.5 4 16.5 12 21 20 16.5 20 7.5'),
  line(12, 12, 12, 21),
]);

export const cubeIconDefinition = defineIcon('CubeIcon', [
  polygon('12 2.8 20 7.2 20 16.8 12 21.2 4 16.8 4 7.2 12 2.8'),
  polyline('4 7.2 12 12 20 7.2'),
  line(12, 12, 12, 21.2),
]);

export const sofaIconDefinition = defineIcon('SofaIcon', [
  path('M7 11V8a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v3'),
  path('M5 11h14a2 2 0 0 1 2 2v5H3v-5a2 2 0 0 1 2-2Z'),
  line(6, 18, 6, 20),
  line(18, 18, 18, 20),
]);

export const chairIconDefinition = defineIcon('ChairIcon', [
  path('M8 4h8v8H8V4Z'),
  path('M7 12h10l1 8'),
  line(6, 20, 18, 20),
  line(9, 12, 8, 20),
  line(15, 12, 16, 20),
]);

export const rulerIconDefinition = defineIcon('RulerIcon', [
  rect(3, 9, 18, 6, 1.5),
  line(7, 9, 7, 12),
  line(11, 9, 11, 13),
  line(15, 9, 15, 12),
  line(19, 9, 19, 13),
]);

export const paletteIconDefinition = defineIcon('PaletteIcon', [
  path('M12 4a8 8 0 0 0 0 16h1.5a2 2 0 0 0 1.4-3.4 1.6 1.6 0 0 1 1.1-2.6H17a4 4 0 0 0 0-8.9A8.3 8.3 0 0 0 12 4Z'),
  circle(8.5, 10, 0.8),
  circle(11, 7.5, 0.8),
  circle(14.5, 8.5, 0.8),
]);

export const materialIconDefinition = defineIcon('MaterialIcon', [
  rect(4, 4, 16, 16, 2),
  path('M4 10h16'),
  path('M10 4v16'),
  path('m10 10 10 10'),
]);

export const threeDIconDefinition = defineIcon('ThreeDIcon', [
  path('M5 7.5 12 4l7 3.5v9L12 20l-7-3.5v-9Z'),
  path('M5 7.5 12 11l7-3.5'),
  path('M12 11v9'),
  path('M8.2 13 5 16.5'),
  path('M15.8 13 19 16.5'),
]);

export const floorPlanIconDefinition = defineIcon('FloorPlanIcon', [
  rect(4, 4, 16, 16, 1.5),
  path('M4 11h6V4'),
  path('M14 4v7h6'),
  path('M10 20v-5h4v5'),
]);

export const gridIconDefinition = defineIcon('GridIcon', [
  rect(4, 4, 16, 16, 1.5),
  line(4, 10, 20, 10),
  line(4, 16, 20, 16),
  line(10, 4, 10, 20),
  line(16, 4, 16, 20),
]);
