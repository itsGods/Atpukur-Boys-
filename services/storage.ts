import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, Message, UserRole, MessageStatus } from '../types';

const SUPABASE_URL = 'https://joddnproehqkbppzxjbw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvZGRucHJvZWhxa2JwcHp4amJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNzc2MjEsImV4cCI6MjA4NTk1MzYyMX0.tPLo_hNH34r8JaaCzeo5eN5APVUoy8FjaDI8C-z8Pj0';

// Local Storage Keys
const LS_USERS = 'nexus_users';
const LS_MSGS = 'nexus_msgs';

export class SupabaseService {
  private static instance: SupabaseService;
  private supabase: SupabaseClient;
  
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
    this.loadFromLocalStorage();
    this.notifyChange();

    try {
      await Promise.all([this.fetchUsers(), this.fetchMessages()]);
      await this.syncToCloud();
      this.subscribeToRealtime();
    } catch (error) {
      console.warn("OFFLINE MODE ACTIVATED");
      this.isOffline = true;
    }
  }

  private generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
  }

  private loadFromLocalStorage() {
    try {
        const users = localStorage.getItem(LS_USERS);
        const msgs = localStorage.getItem(LS_MSGS);
        if (users) this.cachedUsers = JSON.parse(users);
        if (msgs) this.cachedMessages = JSON.parse(msgs);
    } catch (e) { console.error("Cache corrupted"); }
  }

  private saveToLocalStorage() {
      localStorage.setItem(LS_USERS, JSON.stringify(this.cachedUsers));
      localStorage.setItem(LS_MSGS, JSON.stringify(this.cachedMessages));
  }

  private subscribeToRealtime() {
    const channel = this.supabase.channel('public:db-changes');

    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const user = this.mapUser(payload.new);
            const idx = this.cachedUsers.findIndex(u => u.id === user.id);
            if (idx === -1) this.cachedUsers.push(user);
            else this.cachedUsers[idx] = user;
            
            this.saveToLocalStorage();
            this.notifyChange();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.eventType === 'INSERT') {
            const msg = this.mapMessage(payload.new);
            if (!this.cachedMessages.some(m => m.id === msg.id)) {
                this.cachedMessages.push(msg);
                this.cachedMessages.sort((a,b) => a.timestamp - b.timestamp);
                this.saveToLocalStorage();
                this.notifyChange();
            }
        } else if (payload.eventType === 'DELETE') {
            this.cachedMessages = this.cachedMessages.filter(m => m.id !== payload.old.id);
            this.saveToLocalStorage();
            this.notifyChange();
        }
      })
      .subscribe();
  }

  private mapUser(row: any): User {
    return {
      id: row.id,
      username: row.username,
      password: row.password, 
      role: (row.role?.toUpperCase() as UserRole) || UserRole.MEMBER,
      isOnline: row.is_online,
      lastSeen: new Date(row.last_seen || Date.now()).getTime(),
      isActive: row.is_active,
      canSend: row.can_send !== false, // Default to true if undefined
      isSynced: true
    };
  }

  private mapMessage(row: any): Message {
    return {
      id: row.id,
      senderId: row.sender_id,
      receiverId: row.receiver_id || undefined,
      content: row.content,
      timestamp: new Date(row.created_at || row.timestamp || Date.now()).getTime(),
      status: (row.status?.toUpperCase() as MessageStatus) || MessageStatus.SENT,
      isSystem: row.is_system
    };
  }

  async fetchUsers() {
    if (this.isOffline) return;
    const { data } = await this.supabase.from('users').select('*');
    if (data) {
        const remote = data.map(u => this.mapUser(u));
        // Merge: prefer remote, keep local if not in remote yet
        const remoteIds = new Set(remote.map(u => u.id));
        const localOnly = this.cachedUsers.filter(u => !remoteIds.has(u.id));
        this.cachedUsers = [...remote, ...localOnly];
        this.saveToLocalStorage();
        this.notifyChange();
    }
  }

  async fetchMessages() {
    if (this.isOffline) return;
    const { data } = await this.supabase.from('messages').select('*').order('created_at', { ascending: true });
    if (data) {
        this.cachedMessages = data.map(m => this.mapMessage(m));
        this.saveToLocalStorage();
        this.notifyChange();
    }
  }

  async syncToCloud() {
      if (this.isOffline) return;
      const localUsers = this.cachedUsers.filter(u => !u.isSynced);
      if (localUsers.length > 0) {
          await this.supabase.from('users').upsert(localUsers.map(u => ({
              id: u.id,
              username: u.username,
              password: u.password,
              role: u.role,
              is_online: u.isOnline,
              is_active: u.isActive,
              can_send: u.canSend,
              last_seen: new Date().toISOString()
          })));
      }
  }

  async changePassword(id: string, newPass: string) {
      const idx = this.cachedUsers.findIndex(u => u.id === id);
      if (idx !== -1) {
          this.cachedUsers[idx] = { ...this.cachedUsers[idx], password: newPass };
          this.saveToLocalStorage();
          this.notifyChange();
      }
      
      if (this.isOffline) return;
      
      await this.supabase.from('users').update({ password: newPass }).eq('id', id);
  }

  async login(username: string, password: string): Promise<User | null> {
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    // Admin Backdoor
    if (cleanUsername === 'Habib' && cleanPassword === 'Habib0000') {
         // Check if admin exists, if not create
         const { data } = await this.supabase.from('users').select('*').eq('username', 'Habib').maybeSingle();
         if (!data) {
             const admin = {
                 id: this.generateId(),
                 username: 'Habib',
                 password: 'Habib0000',
                 role: 'ADMIN',
                 is_online: true,
                 is_active: true,
                 can_send: true
             };
             await this.supabase.from('users').insert(admin);
             return this.mapUser(admin);
         }
    }

    // 1. Try Local Cache First (Handle race condition where Supabase insert is pending/lagging)
    const localUser = this.cachedUsers.find(u => 
        u.username === cleanUsername && 
        u.password === cleanPassword && 
        u.isActive
    );

    if (localUser) {
        // Update online status
        this.updateUser(localUser.id, { isOnline: true });
        return localUser;
    }

    // 2. Try Supabase as backup (if not in local cache)
    const { data } = await this.supabase.from('users')
        .select('*')
        .eq('username', cleanUsername)
        .eq('password', cleanPassword)
        .eq('is_active', true)
        .maybeSingle();

    if (data) {
        const u = this.mapUser(data);
        this.updateUser(u.id, { isOnline: true });
        return u;
    }
    
    return null;
  }

  async logout(userId: string) {
      await this.updateUser(userId, { isOnline: false });
  }

  getUsers() { return this.cachedUsers; }
  getMessages() { return this.cachedMessages; }

  async createUser(data: any): Promise<User> {
    const id = this.generateId();
    const cleanData = {
        ...data,
        username: data.username.trim(),
        password: data.password.trim()
    };

    const user: User = {
        id,
        username: cleanData.username,
        password: cleanData.password,
        role: cleanData.role,
        isOnline: false,
        isActive: true,
        canSend: true,
        isSynced: false
    };

    this.cachedUsers.push(user);
    this.saveToLocalStorage();
    this.notifyChange();

    await this.supabase.from('users').insert({
        id,
        username: cleanData.username,
        password: cleanData.password,
        role: cleanData.role,
        is_online: false,
        is_active: true,
        can_send: true,
        created_at: new Date().toISOString()
    });
    
    return user;
  }

  async updateUser(id: string, updates: Partial<User>) {
      const idx = this.cachedUsers.findIndex(u => u.id === id);
      if (idx !== -1) {
          this.cachedUsers[idx] = { ...this.cachedUsers[idx], ...updates };
          this.saveToLocalStorage();
          this.notifyChange();
      }

      if (this.isOffline) return;

      const dbUpdates: any = {};
      if (updates.isOnline !== undefined) dbUpdates.is_online = updates.isOnline;
      if (updates.canSend !== undefined) dbUpdates.can_send = updates.canSend;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
      if (updates.role !== undefined) dbUpdates.role = updates.role;
      // We don't usually update password via this generic method, but we can if needed
      if (updates.password !== undefined) dbUpdates.password = updates.password;

      await this.supabase.from('users').update(dbUpdates).eq('id', id);
  }

  async sendMessage(msg: Partial<Message>) {
      const id = this.generateId();
      const newMsg: Message = {
          id,
          senderId: msg.senderId!,
          receiverId: msg.receiverId,
          content: msg.content!,
          status: MessageStatus.SENT,
          timestamp: Date.now(),
          isSystem: msg.isSystem
      };

      this.cachedMessages.push(newMsg);
      this.saveToLocalStorage();
      this.notifyChange();

      await this.supabase.from('messages').insert({
          id,
          sender_id: newMsg.senderId,
          receiver_id: newMsg.receiverId,
          content: newMsg.content,
          username: 'unused_field', // Filled for compat if needed
          message: newMsg.content, // Filled for compat
          created_at: new Date().toISOString()
      });
  }

  async deleteMessage(id: string) {
      this.cachedMessages = this.cachedMessages.filter(m => m.id !== id);
      this.saveToLocalStorage();
      this.notifyChange();
      await this.supabase.from('messages').delete().eq('id', id);
  }

  subscribe(cb: () => void) {
      this.listeners.push(cb);
      return () => { this.listeners = this.listeners.filter(l => l !== cb); };
  }
  
  private notifyChange() { this.listeners.forEach(l => l()); }
}

export const mockService = SupabaseService.getInstance();