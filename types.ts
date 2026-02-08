export enum UserRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
}

export interface User {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  isOnline: boolean;
  lastSeen?: number;
  isActive: boolean;
  canSend: boolean; // Permission to send messages
  isSynced?: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId?: string;
  content: string;
  timestamp: number;
  status: MessageStatus;
  isSystem?: boolean;
}

export interface ChatSession {
  id: string;
  name: string;
  participants: string[];
  unreadCount: number;
}