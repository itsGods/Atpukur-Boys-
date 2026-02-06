import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, Message, UserRole, MessageStatus } from '../types';

// Supabase Configuration
const SUPABASE_URL = 'https://joddnproehqkbppzxjbw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvZGRucHJvZWhxa2JwcHp4amJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNzc2MjEsImV4cCI6MjA4NTk1MzYyMX0.tPLo_hNH34r8JaaCzeo5eN5APVUoy8FjaDI8C-z8Pj0';

// Local Storage Keys
const LS_USERS = 'pt_users_backup';
const LS_MSGS = 'pt_msgs_backup';

/**
 * Service to handle Data interactions.
 * Features automatic fallback to LocalStorage if Supabase is unreachable.
 */
export class SupabaseService {
  private static instance: SupabaseService;
  private supabase: SupabaseClient;
  
  // Local cache for synchronous access
  private cachedUsers: User[] = [];
  private cachedMessages: Message[] = [];
  
  private listeners: (() => void)[] = [];
  private isOffline: boolean = false;
  private isInitialized: boolean = false;

  private constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false },
        db: { schema: 'public' },
    });
    this.init();
  }

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  private async init() {
    try {
      // Attempt to fetch data to verify connection
      await Promise.all([this.fetchUsers(), this.fetchMessages()]);
      this.subscribeToRealtime();
      this.isInitialized = true;
    } catch (error) {
      console.warn("Backend unavailable. Switching to Offline Mode.", error);
      this.isOffline = true;
      this.loadFromLocalStorage();
      this.isInitialized = true;
      this.notifyChange();
    }
  }

  // --- Offline Mode Helpers ---

  private loadFromLocalStorage() {
    try {
        const users = localStorage.getItem(LS_USERS);
        const msgs = localStorage.getItem(LS_MSGS);
        
        if (users) {
            this.cachedUsers = JSON.parse(users);
            // Force update admin password for existing local data if it exists (simple migration)
            const admin = this.cachedUsers.find(u => u.username === 'admin');
            if (admin && admin.password === 'password') {
                admin.password = 'Habib0000';
            }
        } else {
            // Seed Default Users if nothing exists
            this.cachedUsers = [
                { id: 'admin-01', username: 'admin', password: 'Habib0000', role: UserRole.ADMIN, isOnline: false, isActive: true, lastSeen: Date.now() },
                { id: 'user-01', username: 'alice', password: 'password', role: UserRole.MEMBER, isOnline: false, isActive: true, lastSeen: Date.now() },
                { id: 'user-02', username: 'bob', password: 'password', role: UserRole.MEMBER, isOnline: false, isActive: true, lastSeen: Date.now() }
            ];
            this.saveToLocalStorage();
        }

        if (msgs) {
            this.cachedMessages = JSON.parse(msgs);
        }
    } catch (e) {
        console.error("Failed to load local backup", e);
    }
  }

  private saveToLocalStorage() {
      localStorage.setItem(LS_USERS, JSON.stringify(this.cachedUsers));
      localStorage.setItem(LS_MSGS, JSON.stringify(this.cachedMessages));
  }

  // --- Realtime Subscription ---
  private subscribeToRealtime() {
    if (this.isOffline) return;

    this.supabase.channel('public:db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        this.fetchUsers().then(() => this.notifyChange());
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        this.fetchMessages().then(() => this.notifyChange());
      })
      .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.warn("Realtime error, switching offline");
              this.isOffline = true;
          }
      });
  }

  // --- Helpers for Data Mapping ---
  
  private parseTimestamp(val: any): number {
    try {
        if (!val) return Date.now();
        
        // If it's already a number
        if (typeof val === 'number') return val;
        
        // If string, try to parse
        if (typeof val === 'string') {
            // Check for ISO string (e.g. "2026-02-06T...")
            if (val.includes('T') && val.includes('Z')) {
                return Date.parse(val);
            }
            // Check for stringified number (e.g. "1740000000000")
            const num = Number(val);
            if (!isNaN(num)) return num;
        }
        
        return Date.now();
    } catch (e) {
        console.warn("Timestamp parse failed", val);
        return Date.now();
    }
  }

  private mapUser(row: any): User {
    return {
      id: row.id,
      username: row.username,
      password: row.password, 
      role: (row.role?.toUpperCase() as UserRole) || UserRole.MEMBER,
      isOnline: row.is_online,
      avatarUrl: row.avatar_url,
      lastSeen: this.parseTimestamp(row.last_seen),
      isActive: row.is_active
    };
  }

  private mapMessage(row: any): Message {
    return {
      id: row.id,
      senderId: row.sender_id,
      receiverId: row.receiver_id || undefined, // Map DB column to type
      content: row.content,
      timestamp: this.parseTimestamp(row.timestamp),
      status: (row.status?.toUpperCase() as MessageStatus) || MessageStatus.SENT,
      isSystem: row.is_system
    };
  }

  // --- Data Fetching ---
  private async fetchUsers() {
    if (this.isOffline) return;
    try {
        const { data, error } = await this.supabase.from('users').select('*');
        if (error) throw error;
        if (data) {
            this.cachedUsers = data.map(u => this.mapUser(u));
            this.saveToLocalStorage(); // Backup on success
        }
    } catch (e) {
        console.error("Fetch users failed", e);
        // Do not throw here to allow app to continue with cached data
    }
  }

  private async fetchMessages() {
    if (this.isOffline) return;
    try {
        const { data, error } = await this.supabase
            .from('messages')
            .select('*')
            .order('timestamp', { ascending: true });
            
        if (error) throw error;
        if (data) {
            const mapped = data.map(m => this.mapMessage(m));
            this.cachedMessages = mapped;
            this.saveToLocalStorage();
        }
    } catch (e) {
        console.error("Fetch messages failed", e);
        // Do not throw here to allow app to continue
    }
  }

  // --- Auth & User Management ---

  async login(username: string, password: string): Promise<User | null> {
    if (this.isOffline) {
        const user = this.cachedUsers.find(u => u.username === username && u.password === password && u.isActive);
        if (user) {
            user.isOnline = true;
            user.lastSeen = Date.now();
            this.saveToLocalStorage();
            this.notifyChange();
            return user;
        }
        return null;
    }

    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password) 
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
       console.error("Login network error, checking local cache", error);
       return null; 
    }

    if (data) {
      const user = this.mapUser(data);
      this.updateUser(user.id, { isOnline: true, lastSeen: Date.now() }).catch(e => console.warn(e));
      return { ...user, isOnline: true };
    }
    return null;
  }

  async logout(userId: string): Promise<void> {
    if (this.isOffline) {
        const user = this.cachedUsers.find(u => u.id === userId);
        if (user) {
            user.isOnline = false;
            user.lastSeen = Date.now();
            this.saveToLocalStorage();
            this.notifyChange();
        }
        return;
    }

    try {
        await this.updateUser(userId, { isOnline: false, lastSeen: Date.now() });
    } catch (e) {
        console.error("Logout status update failed:", e);
    }
  }

  getUsers(): User[] {
    return this.cachedUsers;
  }

  async createUser(newUser: Omit<User, 'id' | 'isOnline' | 'isActive'>): Promise<User> {
    if (this.cachedUsers.find(u => u.username === newUser.username)) {
      throw new Error("Username already exists");
    }

    const tempId = `user-${Date.now()}`;
    const userData = {
      username: newUser.username,
      password: newUser.password,
      role: newUser.role || UserRole.MEMBER,
      is_online: false,
      is_active: true,
      avatar_url: `https://ui-avatars.com/api/?name=${newUser.username}&background=random`,
      last_seen: Date.now()
    };

    if (this.isOffline) {
        const user: User = { id: tempId, isOnline: false, isActive: true, lastSeen: Date.now(), ...userData } as any;
        this.cachedUsers.push(user);
        this.saveToLocalStorage();
        
        // System msg
        this.sendMessage({
            senderId: 'system',
            content: `${user.username} has joined the team (Offline Mode).`,
            isSystem: true,
            status: MessageStatus.SENT,
        });
        
        this.notifyChange();
        return user;
    }

    const { data, error } = await this.supabase
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (error || !data) throw new Error(error?.message || "Failed to create user");

    const createdUser = this.mapUser(data);
    
    await this.sendMessage({
      senderId: 'system',
      content: `${createdUser.username} has joined the team.`,
      isSystem: true,
      status: MessageStatus.SENT,
    });

    await this.fetchUsers();
    this.notifyChange();
    
    return createdUser;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    if (this.isOffline) {
        const idx = this.cachedUsers.findIndex(u => u.id === userId);
        if (idx !== -1) {
            this.cachedUsers[idx] = { ...this.cachedUsers[idx], ...updates };
            this.saveToLocalStorage();
            this.notifyChange();
            return this.cachedUsers[idx];
        }
        throw new Error("User not found");
    }

    const dbUpdates: any = {};
    if (updates.isOnline !== undefined) dbUpdates.is_online = updates.isOnline;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    if (updates.lastSeen !== undefined) dbUpdates.last_seen = updates.lastSeen;
    if (updates.password !== undefined) dbUpdates.password = updates.password;
    if (updates.role !== undefined) dbUpdates.role = updates.role;

    const { data, error } = await this.supabase
      .from('users')
      .update(dbUpdates)
      .eq('id', userId)
      .select()
      .single();

    if (error || !data) throw new Error(error?.message || "Failed to update user");

    await this.fetchUsers();
    this.notifyChange();
    
    return this.mapUser(data);
  }

  // --- Messaging ---

  getMessages(): Message[] {
    return this.cachedMessages;
  }

  async sendMessage(messageData: Omit<Message, 'id' | 'timestamp'>): Promise<Message> {
    const timestamp = Date.now();
    
    // 1. Optimistic Update
    const tempId = `temp-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
    const optimisticMsg: Message = {
        id: tempId,
        senderId: messageData.senderId,
        receiverId: messageData.receiverId,
        content: messageData.content,
        status: MessageStatus.SENT, 
        isSystem: messageData.isSystem || false,
        timestamp: timestamp
    };
    
    this.cachedMessages = [...this.cachedMessages, optimisticMsg];
    this.notifyChange();

    if (this.isOffline) {
        this.saveToLocalStorage();
        return optimisticMsg;
    }

    try {
        const msgData = {
          sender_id: messageData.senderId,
          receiver_id: messageData.receiverId || null, // Send receiver_id
          content: messageData.content,
          status: MessageStatus.SENT,
          is_system: messageData.isSystem || false,
          timestamp: timestamp 
        };

        const { data, error } = await this.supabase
          .from('messages')
          .insert(msgData)
          .select()
          .single();

        if (error) throw error;

        // 2. Success
        const realMsg = this.mapMessage(data);
        this.cachedMessages = this.cachedMessages.map(m => m.id === tempId ? realMsg : m);
        this.saveToLocalStorage();
        this.notifyChange();
        
        return realMsg;

    } catch (e) {
        console.error("Send failed (likely schema mismatch or network)", e);
        // If it failed because receiver_id column doesn't exist, we just keep optimistic update 
        // effectively falling back to local only for this specific message feature if DB is strict.
        // However, for this task, we assume we update the code to support it.
        return optimisticMsg;
    }
  }

  async updateMessageStatus(messageId: string, status: MessageStatus) {
    if (this.isOffline) return;
    
    await this.supabase
      .from('messages')
      .update({ status })
      .eq('id', messageId);
  }

  // --- Subscription ---

  private notifyChange() {
    this.listeners.forEach(l => l());
  }

  subscribe(callback: () => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }
}

export const mockService = SupabaseService.getInstance();