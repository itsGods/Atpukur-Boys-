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
  password?: string; // Only for admin display/reset, normally hashed
  role: UserRole;
  isOnline: boolean;
  avatarUrl?: string;
  lastSeen?: number;
  isActive: boolean;
  isSynced?: boolean; // True if user exists in Cloud DB
}

export interface Message {
  id: string;
  senderId: string;
  receiverId?: string; // Optional: If null/undefined/'general', it is a group message
  content: string;
  timestamp: number;
  status: MessageStatus;
  isSystem?: boolean; // For "User added" messages
}

export interface ChatSession {
  id: string; // 'general' or userId for DM
  name: string;
  isGroup: boolean;
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
}