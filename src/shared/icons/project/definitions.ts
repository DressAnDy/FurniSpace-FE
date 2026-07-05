import { circle, defineIcon, line, path, polyline, rect } from '../types';

export const checklistIconDefinition = defineIcon('ChecklistIcon', [
  rect(4, 4, 16, 16, 2),
  polyline('8 9 9.5 10.5 12 8'),
  line(14, 9, 17, 9),
  polyline('8 15 9.5 16.5 12 14'),
  line(14, 15, 17, 15),
]);

export const calendarIconDefinition = defineIcon('CalendarIcon', [
  rect(4, 5, 16, 15, 2),
  line(8, 3, 8, 7),
  line(16, 3, 16, 7),
  line(4, 10, 20, 10),
]);

export const clockIconDefinition = defineIcon('ClockIcon', [circle(12, 12, 8), polyline('12 8 12 12 15 14')]);

export const timelineIconDefinition = defineIcon('TimelineIcon', [
  line(6, 5, 6, 19),
  circle(6, 7, 2),
  circle(6, 17, 2),
  path('M8 7h5a3 3 0 0 1 0 6h-2a3 3 0 0 0 0 6h7'),
]);

export const clipboardIconDefinition = defineIcon('ClipboardIcon', [
  rect(6, 5, 12, 16, 2),
  rect(9, 3, 6, 4, 1),
  line(9, 12, 15, 12),
  line(9, 16, 14, 16),
]);

export const taskIconDefinition = defineIcon('TaskIcon', [
  rect(4, 5, 16, 14, 2),
  polyline('8 12 10.5 14.5 16 9'),
]);

export const projectIconDefinition = defineIcon('ProjectIcon', [
  rect(4, 5, 7, 6, 1.5),
  rect(13, 5, 7, 6, 1.5),
  rect(4, 15, 7, 4, 1.5),
  line(11, 8, 13, 8),
  line(7.5, 11, 7.5, 15),
  line(16.5, 11, 16.5, 15),
]);

export const progressIconDefinition = defineIcon('ProgressIcon', [
  circle(12, 12, 8),
  path('M12 4a8 8 0 0 1 8 8'),
  line(12, 12, 16, 8),
]);

export const handoverIconDefinition = defineIcon('HandoverIcon', [
  path('M7 13h4l2 2h3a3 3 0 0 0 3-3V8'),
  path('M5 16h5l2 2h4'),
  path('M4 13V7a2 2 0 0 1 2-2h6'),
  polyline('15 4 19 4 19 8'),
]);

export const surveyIconDefinition = defineIcon('SurveyIcon', [
  rect(5, 4, 14, 16, 2),
  line(9, 9, 15, 9),
  line(9, 13, 15, 13),
  circle(8, 17, 0.7),
  line(11, 17, 15, 17),
]);
