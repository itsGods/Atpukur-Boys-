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
        }

        if (msgs) {
            this.cachedMessages = JSON.parse(msgs);
        }
    } catch (e) {
        console.error("Failed to load local backup", e);
    }
  }

  private ensureLocalData() {
    // 1. Try loading from storage if cache is empty
    if (this.cachedUsers.length === 0) {
        this.loadFromLocalStorage();
    }

    // 2. If still empty, seed defaults
    if (this.cachedUsers.length === 0) {
        this.cachedUsers = [
            { id: 'admin-01', username: 'admin', password: 'Habib0000', role: UserRole.ADMIN, isOnline: false, isActive: true, lastSeen: Date.now() },
            { id: 'user-01', username: 'alice', password: 'password', role: UserRole.MEMBER, isOnline: false, isActive: true, lastSeen: Date.now() },
            { id: 'user-02', username: 'bob', password: 'password', role: UserRole.MEMBER, isOnline: false, isActive: true, lastSeen: Date.now() }
        ];
        this.saveToLocalStorage();
    } else {
        // 3. Ensure Admin exists for demo purposes if data exists but is stale/broken
        const admin = this.cachedUsers.find(u => u.username === 'admin');
        if (admin) {
            admin.password = 'Habib0000'; // Enforce known password for demo
            admin.role = UserRole.ADMIN;
            admin.isActive = true;
        } else {
             // IMMUTABLE UPDATE
            this.cachedUsers = [...this.cachedUsers, { 
                id: 'admin-01', username: 'admin', password: 'Habib0000', role: UserRole.ADMIN, isOnline: false, isActive: true, lastSeen: Date.now() 
            }];
        }
        this.saveToLocalStorage();
    }
  }

  private saveToLocalStorage() {
      localStorage.setItem(LS_USERS, JSON.stringify(this.cachedUsers));
      localStorage.setItem(LS_MSGS, JSON.stringify(this.cachedMessages));
  }

  // --- Realtime Subscription ---
  private subscribeToRealtime() {
    if (this.isOffline) return;

    // Remove existing channels if any to prevent duplicates
    this.supabase.getChannels().forEach(channel => {
        this.supabase.removeChannel(channel);
    });

    this.supabase.channel('public:db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
        // Handle User Updates
        if (payload.eventType === 'INSERT') {
            const newUser = this.mapUser(payload.new);
            if (!this.cachedUsers.find(u => u.id === newUser.id)) {
                // IMMUTABLE UPDATE
                this.cachedUsers = [...this.cachedUsers, newUser];
                this.notifyChange();
            }
        } else if (payload.eventType === 'UPDATE') {
            const updatedUser = this.mapUser(payload.new);
            // IMMUTABLE UPDATE
            this.cachedUsers = this.cachedUsers.map(u => u.id === updatedUser.id ? updatedUser : u);
            this.notifyChange();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        // Handle Message Updates
        if (payload.eventType === 'INSERT') {
            const newMsg = this.mapMessage(payload.new);
            
            // Deduplicate: Check if message exists (by ID) or matches a temporary optimistic message
            const exists = this.cachedMessages.some(m => m.id === newMsg.id);
            const isOptimisticMatch = this.cachedMessages.some(m => 
                m.id.startsWith('temp-') && 
                m.content === newMsg.content && 
                m.senderId === newMsg.senderId &&
                m.receiverId === newMsg.receiverId && // CRITICAL FIX: Ensure receiver matches (personal vs general)
                Math.abs(m.timestamp - newMsg.timestamp) < 5000 // Increased tolerance for server delays
            );

            if (!exists && !isOptimisticMatch) {
                // IMMUTABLE UPDATE
                this.cachedMessages = [...this.cachedMessages, newMsg];
                this.notifyChange();
            } else if (isOptimisticMatch) {
                // Replace optimistic message with real DB message
                // IMMUTABLE UPDATE
                this.cachedMessages = this.cachedMessages.map(m => 
                     (m.id.startsWith('temp-') && m.content === newMsg.content && m.senderId === newMsg.senderId && m.receiverId === newMsg.receiverId) ? newMsg : m
                );
                this.notifyChange();
            }
        } else if (payload.eventType === 'UPDATE') {
            // Handle Message Status Updates (e.g. Read Receipts)
            const updatedMsg = this.mapMessage(payload.new);
            // IMMUTABLE UPDATE
            this.cachedMessages = this.cachedMessages.map(m => m.id === updatedMsg.id ? updatedMsg : m);
            this.notifyChange();
        }
      })
      .subscribe((status) => {
          console.log("Realtime Status:", status);
          if (status === 'SUBSCRIBED') {
              this.isOffline = false;
              // Sync once on connect to fill gaps
              this.fetchMessages();
              this.fetchUsers();
          }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.warn("Realtime error, switching offline");
              // Could trigger a UI 'Reconnecting...' state here
          }
      });
  }

  // --- Helpers for Data Mapping ---
  
  private parseTimestamp(val: any): number {
    try {
        if (!val) return Date.now();
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
            if (val.includes('T') && val.includes('Z')) return Date.parse(val);
            const num = Number(val);
            if (!isNaN(num)) return num;
        }
        return Date.now();
    } catch (e) {
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
      receiverId: row.receiver_id || undefined, // Ensure strict undefined if null/empty
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
            this.saveToLocalStorage(); 
            this.notifyChange();
        }
    } catch (e) {
        console.error("Fetch users failed", e);
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
            this.cachedMessages = mapped; // Replaces array reference
            this.saveToLocalStorage();
            this.notifyChange();
        }
    } catch (e) {
        console.error("Fetch messages failed", e);
    }
  }

  // --- Auth & User Management ---

  private checkLocalLogin(username: string, password: string): User | null {
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

  async login(username: string, password: string): Promise<User | null> {
    // 1. If offline, check local immediately
    if (this.isOffline) {
        this.ensureLocalData();
        return this.checkLocalLogin(username, password);
    }

    // 2. Try Remote Login
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password) 
      .eq('is_active', true)
      .maybeSingle();

    // 3. Fallback: If network error OR user not found in DB (maybe DB is empty), check local
    if (error || !data) {
       console.warn("Remote login failed or user not found. Checking local fallback.");
       this.ensureLocalData(); // Ensures admin exists if cache was empty
       return this.checkLocalLogin(username, password);
    }

    // 4. Remote Success
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
        // IMMUTABLE UPDATE
        this.cachedUsers = [...this.cachedUsers, user];
        this.saveToLocalStorage();
        
        this.sendMessage({
            senderId: 'system',
            content: `${user.username} has joined the team (Offline Mode).`,
            isSystem: true,
            status: MessageStatus.SENT,
        });
        
        this.notifyChange();
        return user;
    }

    // Explicitly add 'id' with tempId to allow creation, supabase will usually ignore if serial/uuid default, 
    // but here we are using text ID for users
    const userPayload = { ...userData, id: tempId };

    const { data, error } = await this.supabase
      .from('users')
      .insert(userPayload)
      .select()
      .single();

    if (error || !data) {
        // Fallback for demo if DB insert fails (e.g., duplicate ID collision on random generation)
        console.error("User creation error", error);
        throw new Error(error?.message || "Failed to create user");
    }

    const createdUser = this.mapUser(data);
    
    await this.sendMessage({
      senderId: 'system',
      content: `${createdUser.username} has joined the team.`,
      isSystem: true,
      status: MessageStatus.SENT,
    });

    return createdUser;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    if (this.isOffline) {
        const idx = this.cachedUsers.findIndex(u => u.id === userId);
        if (idx !== -1) {
            const updatedUser = { ...this.cachedUsers[idx], ...updates };
            // IMMUTABLE UPDATE
            this.cachedUsers = [...this.cachedUsers.slice(0, idx), updatedUser, ...this.cachedUsers.slice(idx + 1)];
            this.saveToLocalStorage();
            this.notifyChange();
            return updatedUser;
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
    
    // We do NOT need to manually update cachedUsers here, because subscribeToRealtime will catch the UPDATE event
    // However, for immediate local responsiveness, we can:
    const updated = this.mapUser(data);
    // IMMUTABLE UPDATE
    this.cachedUsers = this.cachedUsers.map(u => u.id === updated.id ? updated : u);
    this.notifyChange();
    
    return updated;
  }

  // --- Messaging ---

  getMessages(): Message[] {
    return this.cachedMessages;
  }

  async sendMessage(messageData: Omit<Message, 'id' | 'timestamp'>): Promise<Message> {
    const timestamp = Date.now();
    
    // 1. Optimistic Update (Immediate Feedback)
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
    
    // IMMUTABLE UPDATE
    this.cachedMessages = [...this.cachedMessages, optimisticMsg];
    this.notifyChange();

    if (this.isOffline) {
        this.saveToLocalStorage();
        return optimisticMsg;
    }

    try {
        const msgData = {
          sender_id: messageData.senderId,
          receiver_id: messageData.receiverId || null, 
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

        // The realtime subscription will eventually see this insert.
        // But to ensure we don't have a flash of duplicate/missing content, 
        // we manually replace the optimistic message with the confirmed one now.
        const realMsg = this.mapMessage(data);
        // IMMUTABLE UPDATE
        this.cachedMessages = this.cachedMessages.map(m => m.id === tempId ? realMsg : m);
        this.saveToLocalStorage();
        this.notifyChange();
        
        return realMsg;

    } catch (e) {
        console.error("Send failed", e);
        // Keep optimistic message but mark as potential error state? 
        // For now, we leave it as 'SENT' locally.
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

  async markMessagesAsRead(senderId: string, receiverId: string) {
    if (this.isOffline) return;
    
    // Optimistic update locally
    let changed = false;
    const newMessages = this.cachedMessages.map(m => {
        if (m.senderId === senderId && m.receiverId === receiverId && m.status !== MessageStatus.READ) {
            changed = true;
            return { ...m, status: MessageStatus.READ };
        }
        return m;
    });

    if (changed) {
        this.cachedMessages = newMessages;
        this.notifyChange();
    }

    // DB update
    try {
        await this.supabase
        .from('messages')
        .update({ status: MessageStatus.READ })
        .eq('sender_id', senderId)
        .eq('receiver_id', receiverId)
        .neq('status', MessageStatus.READ);
    } catch (e) {
        console.error("Failed to mark as read", e);
    }
  }

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