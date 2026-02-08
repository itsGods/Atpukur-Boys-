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
      this.startPolling(); // Fallback mechanism
    } catch (error) {
      console.warn("OFFLINE MODE ACTIVATED: Could not connect to Supabase", error);
      this.isOffline = true;
    }
  }

  private startPolling() {
      // Poll every 3 seconds to guarantee delivery even if sockets fail
      setInterval(() => {
          if (!document.hidden) {
              this.fetchMessages();
          }
      }, 3000);

      // Poll users less frequently (10s)
      setInterval(() => {
          if (!document.hidden) {
             this.fetchUsers();
          }
      }, 10000);

      // Immediate refresh when tab becomes visible
      if (typeof document !== 'undefined') {
          document.addEventListener('visibilitychange', () => {
              if (document.visibilityState === 'visible') {
                  this.fetchMessages();
                  this.fetchUsers();
              }
          });
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
    this.supabase.removeAllChannels();

    const channel = this.supabase.channel('nexus_realtime');

    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const user = this.mapUser(payload.new);
            const idx = this.cachedUsers.findIndex(u => u.id === user.id);
            
            // IMPORTANT: Create NEW array reference for React to detect change
            if (idx === -1) {
                this.cachedUsers = [...this.cachedUsers, user];
            } else {
                const newUsers = [...this.cachedUsers];
                newUsers[idx] = user;
                this.cachedUsers = newUsers;
            }
            
            this.saveToLocalStorage();
            this.notifyChange();
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const msg = this.mapMessage(payload.new);
          // Prevent duplicates
          if (!this.cachedMessages.some(m => m.id === msg.id)) {
              // IMPORTANT: Create NEW array reference
              this.cachedMessages = [...this.cachedMessages, msg].sort((a,b) => a.timestamp - b.timestamp);
              
              this.saveToLocalStorage();
              this.notifyChange();
          }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
          this.cachedMessages = this.cachedMessages.filter(m => m.id !== payload.old.id);
          this.saveToLocalStorage();
          this.notifyChange();
      })
      .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
              console.log('REALTIME_UPLINK_ESTABLISHED');
          } else {
              console.log('REALTIME_STATUS:', status);
          }
      });
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
      canSend: row.can_send !== false, 
      isSynced: true
    };
  }

  private mapMessage(row: any): Message {
    return {
      id: row.id,
      senderId: row.sender_id,
      receiverId: row.receiver_id || 'global',
      content: row.content,
      timestamp: new Date(row.created_at || row.timestamp || Date.now()).getTime(),
      status: (row.status?.toUpperCase() as MessageStatus) || MessageStatus.SENT,
      isSystem: row.is_system
    };
  }

  async fetchUsers() {
    if (this.isOffline) return;
    const { data, error } = await this.supabase.from('users').select('*');
    if (error) {
        console.error("DB_ERROR: Failed to fetch users.", error);
        return;
    }
    if (data) {
        const remote = data.map(u => this.mapUser(u));
        // Use remote data as truth, but we could merge local state if needed.
        // Simple overwrite is often safer for sync.
        this.cachedUsers = remote;
        this.saveToLocalStorage();
        this.notifyChange();
    }
  }

  async fetchMessages() {
    if (this.isOffline) return;
    const { data, error } = await this.supabase.from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    
    if (error) {
        console.error("DB_ERROR: Failed to fetch messages.", error);
        return;
    }

    if (data) {
        const remoteMessages = data.reverse().map(m => this.mapMessage(m));
        
        // Only update if data actually changed to avoid loop
        // We compare basic length and last ID for efficiency
        const isDifferent = remoteMessages.length !== this.cachedMessages.length ||
            (remoteMessages.length > 0 && remoteMessages[remoteMessages.length - 1].id !== this.cachedMessages[this.cachedMessages.length - 1]?.id);

        if (isDifferent) {
            this.cachedMessages = remoteMessages;
            this.saveToLocalStorage();
            this.notifyChange();
        }
    }
  }

  async syncToCloud() {
      if (this.isOffline) return;
      const localUsers = this.cachedUsers.filter(u => !u.isSynced);
      if (localUsers.length > 0) {
          const { error } = await this.supabase.from('users').upsert(localUsers.map(u => ({
              id: u.id,
              username: u.username,
              password: u.password,
              role: u.role,
              is_online: u.isOnline,
              is_active: u.isActive,
              can_send: u.canSend,
              last_seen: new Date().toISOString()
          })));
          
          if (!error) {
             // Update references for local users
             this.cachedUsers = this.cachedUsers.map(u => 
                 localUsers.find(lu => lu.id === u.id) ? { ...u, isSynced: true } : u
             );
             this.saveToLocalStorage();
          }
      }
  }

  async login(username: string, password: string): Promise<User | null> {
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    // Admin backdoor
    if (cleanUsername === 'Habib' && cleanPassword === 'Habib0000') {
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

    await this.fetchUsers();

    const { data, error } = await this.supabase.from('users')
        .select('*')
        .eq('username', cleanUsername)
        .eq('password', cleanPassword)
        .eq('is_active', true)
        .maybeSingle();

    if (error) {
        console.error("LOGIN_DB_ERROR", error);
        return null;
    }

    if (data) {
        const u = this.mapUser(data);
        await this.updateUser(u.id, { isOnline: true });
        return u;
    }
    
    return null;
  }

  async getUserById(id: string): Promise<User | null> {
      let user = this.cachedUsers.find(u => u.id === id);
      if (user) {
          this.updateUser(user.id, { isOnline: true });
          return user;
      }
      
      if (!this.isOffline) {
          const { data } = await this.supabase.from('users').select('*').eq('id', id).maybeSingle();
          if (data) {
             const u = this.mapUser(data);
             // Immutable push
             this.cachedUsers = [...this.cachedUsers, u];
             this.updateUser(u.id, { isOnline: true });
             return u;
          }
      }
      return null;
  }

  async logout(userId: string) {
      await this.updateUser(userId, { isOnline: false });
  }

  getUsers() { return [...this.cachedUsers]; }
  getMessages() { return [...this.cachedMessages]; }

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

    // Immutable add
    this.cachedUsers = [...this.cachedUsers, user];
    this.saveToLocalStorage();
    this.notifyChange();

    const { error } = await this.supabase.from('users').insert({
        id,
        username: cleanData.username,
        password: cleanData.password,
        role: cleanData.role,
        is_online: false,
        is_active: true,
        can_send: true,
        created_at: new Date().toISOString()
    });

    if (error) {
        console.error("DB_INSERT_ERROR", error);
    } else {
        // Update sync status immutably
        this.cachedUsers = this.cachedUsers.map(u => u.id === id ? { ...u, isSynced: true } : u);
        this.saveToLocalStorage();
    }
    
    return user;
  }

  async updateUser(id: string, updates: Partial<User>) {
      const idx = this.cachedUsers.findIndex(u => u.id === id);
      if (idx !== -1) {
          const newUsers = [...this.cachedUsers];
          newUsers[idx] = { ...newUsers[idx], ...updates };
          this.cachedUsers = newUsers;
          
          this.saveToLocalStorage();
          this.notifyChange();
      }

      if (this.isOffline) return;

      const dbUpdates: any = {};
      if (updates.isOnline !== undefined) dbUpdates.is_online = updates.isOnline;
      if (updates.canSend !== undefined) dbUpdates.can_send = updates.canSend;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
      if (updates.role !== undefined) dbUpdates.role = updates.role;
      if (updates.password !== undefined) dbUpdates.password = updates.password;

      if (Object.keys(dbUpdates).length > 0) {
        await this.supabase.from('users').update(dbUpdates).eq('id', id);
      }
  }

  async sendMessage(msg: Partial<Message>) {
      const id = this.generateId();
      const receiverId = msg.receiverId || 'global';
      
      const newMsg: Message = {
          id,
          senderId: msg.senderId!,
          receiverId: receiverId,
          content: msg.content!,
          status: MessageStatus.SENT,
          timestamp: Date.now(),
          isSystem: msg.isSystem
      };

      // Optimistic UI update - Immutable
      this.cachedMessages = [...this.cachedMessages, newMsg];
      this.saveToLocalStorage();
      this.notifyChange();

      const { error } = await this.supabase.from('messages').insert({
          id,
          sender_id: newMsg.senderId,
          receiver_id: receiverId,
          content: newMsg.content,
          status: 'SENT',
          created_at: new Date().toISOString()
      });

      if (error) {
          console.error("MESSAGE_SEND_ERROR", error);
      }
  }

  async deleteMessage(id: string) {
      this.cachedMessages = this.cachedMessages.filter(m => m.id !== id);
      this.saveToLocalStorage();
      this.notifyChange();
      await this.supabase.from('messages').delete().eq('id', id);
  }

  subscribe(cb: () => void) {
      this.listeners.push(cb);
      // Call callback immediately to ensure sync
      cb();
      return () => { this.listeners = this.listeners.filter(l => l !== cb); };
  }
  
  private notifyChange() { this.listeners.forEach(l => l()); }
}

export const mockService = SupabaseService.getInstance();