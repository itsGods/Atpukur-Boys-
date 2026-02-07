import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, Message, UserRole, MessageStatus } from '../types';

// Supabase Configuration
// REPLACE THESE WITH YOUR OWN SUPABASE PROJECT DETAILS FOR PRODUCTION
const SUPABASE_URL = 'https://joddnproehqkbppzxjbw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvZGRucHJvZWhxa2JwcHp4amJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNzc2MjEsImV4cCI6MjA4NTk1MzYyMX0.tPLo_hNH34r8JaaCzeo5eN5APVUoy8FjaDI8C-z8Pj0';

// Local Storage Keys
const LS_USERS = 'pt_users_backup';
const LS_MSGS = 'pt_msgs_backup';

export class SupabaseService {
  private static instance: SupabaseService;
  private supabase: SupabaseClient;
  
  // Local cache for synchronous access
  private cachedUsers: User[] = [];
  private cachedMessages: Message[] = [];
  
  private listeners: (() => void)[] = [];
  private isOffline: boolean = false;

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
      await Promise.all([this.fetchUsers(), this.fetchMessages()]);
      this.subscribeToRealtime();
    } catch (error) {
      this.isOffline = true;
      this.loadFromLocalStorage();
      this.notifyChange();
    }
  }

  // --- Offline & Cache ---

  private loadFromLocalStorage() {
    try {
        const users = localStorage.getItem(LS_USERS);
        const msgs = localStorage.getItem(LS_MSGS);
        if (users) this.cachedUsers = JSON.parse(users);
        if (msgs) this.cachedMessages = JSON.parse(msgs);
    } catch (e) {
        console.error("Cache load failed", e);
    }
  }

  private saveToLocalStorage() {
      localStorage.setItem(LS_USERS, JSON.stringify(this.cachedUsers));
      localStorage.setItem(LS_MSGS, JSON.stringify(this.cachedMessages));
  }

  private ensureLocalData() {
    if (this.cachedUsers.length === 0) this.loadFromLocalStorage();
    
    // Seed default admin if totally empty
    if (this.cachedUsers.length === 0) {
        this.cachedUsers = [
            { id: 'admin-01', username: 'admin', password: 'password', role: UserRole.ADMIN, isOnline: false, isActive: true, lastSeen: Date.now() },
            { id: 'user-01', username: 'alice', password: 'password', role: UserRole.MEMBER, isOnline: false, isActive: true, lastSeen: Date.now() }
        ];
        this.saveToLocalStorage();
    }
  }

  // --- Realtime ---

  private subscribeToRealtime() {
    this.supabase.channel('public:db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
        if (payload.eventType === 'INSERT') {
            this.cachedUsers = [...this.cachedUsers, this.mapUser(payload.new)];
        } else if (payload.eventType === 'UPDATE') {
            const updated = this.mapUser(payload.new);
            this.cachedUsers = this.cachedUsers.map(u => u.id === updated.id ? updated : u);
        }
        this.notifyChange();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.eventType === 'INSERT') {
            const newMsg = this.mapMessage(payload.new);
            const exists = this.cachedMessages.some(m => m.id === newMsg.id);
            // Dedupe optimistic messages
            const isOptimistic = this.cachedMessages.some(m => m.id.startsWith('temp-') && m.content === newMsg.content && m.senderId === newMsg.senderId);
            
            if (!exists && !isOptimistic) {
                this.cachedMessages = [...this.cachedMessages, newMsg];
            } else if (isOptimistic) {
                this.cachedMessages = this.cachedMessages.map(m => (m.id.startsWith('temp-') && m.content === newMsg.content) ? newMsg : m);
            }
            this.notifyChange();
        } else if (payload.eventType === 'UPDATE') {
            const updated = this.mapMessage(payload.new);
            this.cachedMessages = this.cachedMessages.map(m => m.id === updated.id ? updated : m);
            this.notifyChange();
        }
      })
      .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
              this.isOffline = false;
              this.fetchMessages(); // Sync on reconnect
          }
      });
  }

  // --- Data Mapping ---
  private mapUser(row: any): User {
    return {
      id: row.id,
      username: row.username,
      password: row.password, 
      role: (row.role?.toUpperCase() as UserRole) || UserRole.MEMBER,
      isOnline: row.is_online,
      avatarUrl: row.avatar_url,
      lastSeen: new Date(row.last_seen || Date.now()).getTime(),
      isActive: row.is_active
    };
  }

  private mapMessage(row: any): Message {
    return {
      id: row.id,
      senderId: row.sender_id,
      receiverId: row.receiver_id || undefined,
      content: row.content,
      timestamp: new Date(row.timestamp || Date.now()).getTime(),
      status: (row.status?.toUpperCase() as MessageStatus) || MessageStatus.SENT,
      isSystem: row.is_system
    };
  }

  // --- API ---

  async fetchUsers() {
    if (this.isOffline) return;
    const { data } = await this.supabase.from('users').select('*');
    if (data) {
        this.cachedUsers = data.map(u => this.mapUser(u));
        this.saveToLocalStorage();
        this.notifyChange();
    }
  }

  async fetchMessages() {
    if (this.isOffline) return;
    const { data } = await this.supabase.from('messages').select('*').order('timestamp', { ascending: true });
    if (data) {
        this.cachedMessages = data.map(m => this.mapMessage(m));
        this.saveToLocalStorage();
        this.notifyChange();
    }
  }

  async login(username: string, password: string): Promise<User | null> {
    if (this.isOffline) {
        this.ensureLocalData();
        return this.cachedUsers.find(u => u.username === username && u.password === password) || null;
    }

    const { data } = await this.supabase.from('users').select('*').eq('username', username).eq('password', password).eq('is_active', true).maybeSingle();
    
    if (data) {
        const user = this.mapUser(data);
        this.updateUser(user.id, { isOnline: true, lastSeen: Date.now() });
        return { ...user, isOnline: true };
    }
    
    // Fallback if remote fails but user exists locally
    this.ensureLocalData();
    return this.cachedUsers.find(u => u.username === username && u.password === password) || null;
  }

  async logout(userId: string) {
    if (!this.isOffline) {
        await this.updateUser(userId, { isOnline: false, lastSeen: Date.now() });
    }
  }

  getUsers() { return this.cachedUsers; }
  getMessages() { return this.cachedMessages; }

  async createUser(newUser: any): Promise<User> {
    const tempId = `user-${Date.now()}`;
    const userData = {
      username: newUser.username,
      password: newUser.password,
      role: newUser.role || UserRole.MEMBER,
      is_online: false,
      is_active: true,
      last_seen: new Date().toISOString()
    };

    if (this.isOffline) {
        const user: User = {
            id: tempId,
            username: userData.username,
            password: userData.password,
            role: userData.role,
            isOnline: userData.is_online,
            isActive: userData.is_active,
            lastSeen: Date.now()
        };
        this.cachedUsers.push(user);
        this.notifyChange();
        return user;
    }

    const { data, error } = await this.supabase.from('users').insert(userData).select().single();
    if (error) throw new Error(error.message);
    
    const created = this.mapUser(data);
    this.sendMessage({ senderId: 'system', content: `${created.username} joined the team`, isSystem: true, status: MessageStatus.SENT });
    return created;
  }

  async updateUser(userId: string, updates: Partial<User>) {
      if (this.isOffline) return;
      
      const dbUpdates: any = {};
      if (updates.isOnline !== undefined) dbUpdates.is_online = updates.isOnline;
      if (updates.lastSeen !== undefined) dbUpdates.last_seen = new Date(updates.lastSeen).toISOString();
      if (updates.role !== undefined) dbUpdates.role = updates.role;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
      if (updates.password !== undefined) dbUpdates.password = updates.password;

      await this.supabase.from('users').update(dbUpdates).eq('id', userId);
  }

  async changePassword(userId: string, newPassword: string) {
      if(this.isOffline) return;
      await this.supabase.from('users').update({ password: newPassword }).eq('id', userId);
  }

  async sendMessage(msg: Partial<Message>) {
      const timestamp = Date.now();
      const optimistic: Message = {
          id: `temp-${timestamp}`,
          senderId: msg.senderId!,
          receiverId: msg.receiverId,
          content: msg.content!,
          status: MessageStatus.SENT,
          isSystem: msg.isSystem,
          timestamp
      };

      this.cachedMessages = [...this.cachedMessages, optimistic];
      this.notifyChange();

      if (this.isOffline) return optimistic;

      const { data } = await this.supabase.from('messages').insert({
          sender_id: msg.senderId,
          receiver_id: msg.receiverId || null,
          content: msg.content,
          is_system: msg.isSystem || false,
          status: 'SENT',
          timestamp: new Date(timestamp).toISOString()
      }).select().single();

      if (data) {
          const real = this.mapMessage(data);
          this.cachedMessages = this.cachedMessages.map(m => m.id === optimistic.id ? real : m);
          this.notifyChange();
          return real;
      }
      return optimistic;
  }

  async markMessagesAsRead(senderId: string, receiverId: string) {
      if (this.isOffline) return;
      
      // Optimistic
      let changed = false;
      this.cachedMessages = this.cachedMessages.map(m => {
          if (m.senderId === senderId && m.receiverId === receiverId && m.status !== MessageStatus.READ) {
              changed = true;
              return { ...m, status: MessageStatus.READ };
          }
          return m;
      });
      if (changed) this.notifyChange();

      await this.supabase.from('messages').update({ status: 'READ' }).eq('sender_id', senderId).eq('receiver_id', receiverId).neq('status', 'READ');
  }

  subscribe(cb: () => void) {
      this.listeners.push(cb);
      return () => { this.listeners = this.listeners.filter(l => l !== cb); };
  }
  
  private notifyChange() { this.listeners.forEach(l => l()); }
}

export const mockService = SupabaseService.getInstance();