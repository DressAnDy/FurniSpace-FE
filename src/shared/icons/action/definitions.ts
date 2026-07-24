import { circle, defineIcon, line, path, polyline, rect } from '../types';

export const plusIconDefinition = defineIcon('PlusIcon', [line(12, 5, 12, 19), line(5, 12, 19, 12)]);

export const editIconDefinition = defineIcon('EditIcon', [
  path('M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z'),
  line(13.5, 6.5, 17.5, 10.5),
]);

export const trashIconDefinition = defineIcon('TrashIcon', [
  line(4, 7, 20, 7),
  path('M9 7V5h6v2'),
  path('M6 7l1 13h10l1-13'),
  line(10, 11, 10, 16),
  line(14, 11, 14, 16),
]);

export const saveIconDefinition = defineIcon('SaveIcon', [
  path('M5 4h12l2 2v14H5V4Z'),
  rect(8, 4, 7, 5, 1),
  rect(8, 14, 8, 6, 1),
]);

export const filterIconDefinition = defineIcon('FilterIcon', [path('M4 6h16l-6 7v5l-4 2v-7L4 6Z')]);

export const sortIconDefinition = defineIcon('SortIcon', [
  line(8, 5, 8, 19),
  polyline('5 8 8 5 11 8'),
  line(16, 19, 16, 5),
  polyline('13 16 16 19 19 16'),
]);

export const refreshIconDefinition = defineIcon('RefreshIcon', [
  path('M20 6v5h-5'),
  path('M4 18v-5h5'),
  path('M18.2 11A6.5 6.5 0 0 0 7 7.2L4 10'),
  path('M5.8 13A6.5 6.5 0 0 0 17 16.8L20 14'),
]);

export const moreHorizontalIconDefinition = defineIcon('MoreHorizontalIcon', [circle(6, 12, 1), circle(12, 12, 1), circle(18, 12, 1)]);

export const moreVerticalIconDefinition = defineIcon('MoreVerticalIcon', [circle(12, 6, 1), circle(12, 12, 1), circle(12, 18, 1)]);

export const viewIconDefinition = defineIcon('ViewIcon', [
  path('M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z'),
  circle(12, 12, 2.5),
]);
