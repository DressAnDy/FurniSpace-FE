import { createIcon } from '../renderers';
import {
  calendarIconDefinition,
  checklistIconDefinition,
  clipboardIconDefinition,
  clockIconDefinition,
  handoverIconDefinition,
  progressIconDefinition,
  projectIconDefinition,
  surveyIconDefinition,
  taskIconDefinition,
  timelineIconDefinition,
} from './definitions';

export const ChecklistIcon = createIcon(checklistIconDefinition);
export const CalendarIcon = createIcon(calendarIconDefinition);
export const ClockIcon = createIcon(clockIconDefinition);
export const TimelineIcon = createIcon(timelineIconDefinition);
export const ClipboardIcon = createIcon(clipboardIconDefinition);
export const TaskIcon = createIcon(taskIconDefinition);
export const ProjectIcon = createIcon(projectIconDefinition);
export const ProgressIcon = createIcon(progressIconDefinition);
export const HandoverIcon = createIcon(handoverIconDefinition);
export const SurveyIcon = createIcon(surveyIconDefinition);

export {
  calendarIconDefinition,
  checklistIconDefinition,
  clipboardIconDefinition,
  clockIconDefinition,
  handoverIconDefinition,
  progressIconDefinition,
  projectIconDefinition,
  surveyIconDefinition,
  taskIconDefinition,
  timelineIconDefinition,
};
