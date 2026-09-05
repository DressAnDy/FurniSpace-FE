import type { ProjectChatListItem, ProjectChatMessage, ProjectChatType } from '@/services/api/projectChats';

type ChatViewerRole = 'CUSTOMER' | 'SALES' | 'DESIGNER' | 'PRODUCTION';

type ChatParticipantOptions = {
  viewerRole: ChatViewerRole;
  customerName?: string | null;
  customerFallback?: string | null;
};

export function getChatTitle(chat?: ProjectChatListItem | null) {
  if (!chat) {
    return 'Select chat';
  }

  return chat.title || getChatTypeLabel(chat.chatType);
}

export function getChatParticipant(chat: ProjectChatListItem | null | undefined, options: ChatParticipantOptions) {
  if (!chat) {
    return {
      name: 'Select chat',
      role: 'Project Chat',
    };
  }

  if (shouldShowCustomerAsParticipant(chat, options.viewerRole)) {
    return {
      name: options.customerName || options.customerFallback || 'Customer',
      role: 'Customer',
    };
  }

  if (options.viewerRole === 'PRODUCTION' && chat.chatType === 'PRODUCTION') {
    return {
      name: chat.staffName || chat.title || 'Sales',
      role: 'Sales',
    };
  }

  return {
    name: chat.staffName || chat.title || getChatTypeLabel(chat.chatType),
    role: getChatParticipantRoleLabel(chat.chatType),
  };
}

export function getChatTypeLabel(chatType?: ProjectChatType | null) {
  const labels: Record<ProjectChatType, string> = {
    SALES: 'Sales Chat',
    DESIGNER: 'Designer Chat',
    PRODUCTION: 'Production Chat',
    DELIVERY: 'Delivery Chat',
    GENERAL: 'General Chat',
    INTERNAL: 'Internal Chat',
  };

  return chatType ? labels[chatType] : 'Project Chat';
}

export function getChatParticipantRoleLabel(chatType?: ProjectChatType | null) {
  const labels: Record<ProjectChatType, string> = {
    SALES: 'Sales',
    DESIGNER: 'Designer',
    PRODUCTION: 'Production',
    DELIVERY: 'Delivery',
    GENERAL: 'General',
    INTERNAL: 'Internal',
  };

  return chatType ? labels[chatType] : 'Project Chat';
}

function shouldShowCustomerAsParticipant(chat: ProjectChatListItem, viewerRole: ChatViewerRole) {
  return (viewerRole === 'SALES' && chat.chatType === 'SALES') || (viewerRole === 'DESIGNER' && chat.chatType === 'DESIGNER');
}

export function getInitials(name?: string | null, fallback?: string | null) {
  const source = name || fallback || 'User';
  const parts = source.trim().split(/\s+/).slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase()).join('') || 'U';
}

export function formatChatTime(value?: string | null) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

export function getMessageContent(message: ProjectChatMessage) {
  if (message.content) {
    return message.content;
  }

  if (message.attachment) {
    return message.attachment.originalFileName;
  }

  return 'Message deleted';
}

export function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function formatUnreadBadge(count?: number | null) {
  if (!count || count <= 0) {
    return null;
  }

  return count > 5 ? '5+' : String(count);
}
