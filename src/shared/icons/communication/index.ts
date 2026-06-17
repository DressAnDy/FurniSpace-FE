import { createIcon } from '../renderers';
import {
  bellIconDefinition,
  chatIconDefinition,
  mailIconDefinition,
  messageIconDefinition,
  notificationIconDefinition,
  paperclipIconDefinition,
  phoneIconDefinition,
  sendIconDefinition,
} from './definitions';

export const BellIcon = createIcon(bellIconDefinition);
export const ChatIcon = createIcon(chatIconDefinition);
export const MessageIcon = createIcon(messageIconDefinition);
export const PhoneIcon = createIcon(phoneIconDefinition);
export const MailIcon = createIcon(mailIconDefinition);
export const SendIcon = createIcon(sendIconDefinition);
export const PaperclipIcon = createIcon(paperclipIconDefinition);
export const NotificationIcon = createIcon(notificationIconDefinition);

export {
  bellIconDefinition,
  chatIconDefinition,
  mailIconDefinition,
  messageIconDefinition,
  notificationIconDefinition,
  paperclipIconDefinition,
  phoneIconDefinition,
  sendIconDefinition,
};
