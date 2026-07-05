import { createIcon } from '../renderers';
import {
  activeIconDefinition,
  alertCircleIconDefinition,
  checkIconDefinition,
  circleCheckIconDefinition,
  inactiveIconDefinition,
  infoIconDefinition,
  pendingIconDefinition,
  warningIconDefinition,
  xCircleIconDefinition,
} from './definitions';

export const CheckIcon = createIcon(checkIconDefinition);
export const CircleCheckIcon = createIcon(circleCheckIconDefinition);
export const XCircleIcon = createIcon(xCircleIconDefinition);
export const AlertCircleIcon = createIcon(alertCircleIconDefinition);
export const InfoIcon = createIcon(infoIconDefinition);
export const WarningIcon = createIcon(warningIconDefinition);
export const PendingIcon = createIcon(pendingIconDefinition);
export const ActiveIcon = createIcon(activeIconDefinition);
export const InactiveIcon = createIcon(inactiveIconDefinition);

export {
  activeIconDefinition,
  alertCircleIconDefinition,
  checkIconDefinition,
  circleCheckIconDefinition,
  inactiveIconDefinition,
  infoIconDefinition,
  pendingIconDefinition,
  warningIconDefinition,
  xCircleIconDefinition,
};
