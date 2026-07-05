import { createIcon } from '../renderers';
import {
  eyeIconDefinition,
  eyeOffIconDefinition,
  lockIconDefinition,
  logoutIconDefinition,
  mailIconDefinition,
  shieldIconDefinition,
  userIconDefinition,
  userPlusIconDefinition,
} from './definitions';

export const MailIcon = createIcon(mailIconDefinition);
export const LockIcon = createIcon(lockIconDefinition);
export const EyeIcon = createIcon(eyeIconDefinition);
export const EyeOffIcon = createIcon(eyeOffIconDefinition);
export const UserIcon = createIcon(userIconDefinition);
export const UserPlusIcon = createIcon(userPlusIconDefinition);
export const LogoutIcon = createIcon(logoutIconDefinition);
export const ShieldIcon = createIcon(shieldIconDefinition);

export {
  eyeIconDefinition,
  eyeOffIconDefinition,
  lockIconDefinition,
  logoutIconDefinition,
  mailIconDefinition,
  shieldIconDefinition,
  userIconDefinition,
  userPlusIconDefinition,
};
