import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, Message, UserRole, MessageStatus } from '../types';

// Supabase Configuration
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
    // 1. Load Local Data Immediately (Fast UI)
    this.loadFromLocalStorage();
    this.notifyChange();

    // 2. Try Fetching Fresh Data
    try {
      await Promise.all([this.fetchUsers(), this.fetchMessages()]);
      
      // 3. Sync Up: Push any local data that is missing from Cloud (Fixes "Admin created user locally" issue)
      await this.syncToCloud();

      this.subscribeToRealtime();
    } catch (error) {
      console.warn("Connection issue during init:", error);
      this.isOffline = true;
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

  // --- Realtime ---

  private subscribeToRealtime() {
    const channel = this.supabase.channel('public:db-changes');

    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
        if (payload.eventType === 'INSERT') {
            const newUser = this.mapUser(payload.new);
            // Only add if we don't have it (or if we have a local version, overwrite it with server version)
            const idx = this.cachedUsers.findIndex(u => u.id === newUser.id);
            if (idx === -1) {
                this.cachedUsers = [...this.cachedUsers, newUser];
            } else {
                this.cachedUsers[idx] = newUser;
            }
            this.saveToLocalStorage();
            this.notifyChange();
        } else if (payload.eventType === 'UPDATE') {
            const updated = this.mapUser(payload.new);
            this.cachedUsers = this.cachedUsers.map(u => u.id === updated.id ? updated : u);
            this.saveToLocalStorage();
            this.notifyChange();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.eventType === 'INSERT') {
            const newMsg = this.mapMessage(payload.new);
            // Check existence by ID to prevent duplicates
            if (!this.cachedMessages.some(m => m.id === newMsg.id)) {
                this.cachedMessages = [...this.cachedMessages, newMsg].sort((a,b) => a.timestamp - b.timestamp);
                this.saveToLocalStorage();
                this.notifyChange();
            }
        }
      })
      .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
              this.isOffline = false;
              // Re-sync on reconnect
              this.fetchMessages(); 
              this.syncToCloud();
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
    try {
        const { data: dbUsers } = await this.supabase.from('users').select('*');
        
        if (dbUsers) {
            const remoteUsers = dbUsers.map(u => this.mapUser(u));
            const remoteIds = new Set(remoteUsers.map(u => u.id));
            
            // Keep local users that aren't in DB yet (pending sync)
            const localPending = this.cachedUsers.filter(u => !remoteIds.has(u.id) && !u.id.startsWith('admin-virtual'));
            
            this.cachedUsers = [...remoteUsers, ...localPending];
            this.saveToLocalStorage();
            this.notifyChange();
        }
    } catch(e) { console.error("Fetch users error", e); }
  }

  async fetchMessages() {
    if (this.isOffline) return;
    try {
        const { data: dbMsgs } = await this.supabase.from('messages').select('*').order('timestamp', { ascending: true });
        
        if (dbMsgs) {
            const remoteMsgs = dbMsgs.map(m => this.mapMessage(m));
            const remoteIds = new Set(remoteMsgs.map(m => m.id));
            
            // Keep local messages pending sync
            const localPending = this.cachedMessages.filter(m => !remoteIds.has(m.id));

            this.cachedMessages = [...remoteMsgs, ...localPending].sort((a,b) => a.timestamp - b.timestamp);
            this.saveToLocalStorage();
            this.notifyChange();
        }
    } catch (e) { console.error("Fetch messages error", e); }
  }

  // === CRITICAL: Sync Local Data to Cloud ===
  // This pushes any users created locally (when DB was down/blocked) to the server
  async syncToCloud() {
      if (this.isOffline) return;

      const usersToSync = this.cachedUsers.filter(u => !u.id.startsWith('admin-virtual'));
      
      // Upsert users (Insert if not exists, Update if exists)
      if (usersToSync.length > 0) {
          const { error } = await this.supabase.from('users').upsert(
              usersToSync.map(u => ({
                  id: u.id,
                  username: u.username,
                  password: u.password,
                  role: u.role,
                  is_online: u.isOnline,
                  is_active: u.isActive,
                  last_seen: new Date(u.lastSeen || Date.now()).toISOString()
              })),
              { onConflict: 'id' } // Use ID to identify duplicates
          );
          if (error) console.error("Sync to cloud failed:", error);
      }
  }

  async login(username: string, password: string): Promise<User | null> {
    const cleanUser = username.trim();
    const cleanPass = password.trim();
    const isAdminAttempt = cleanUser === 'Habib' && cleanPass === 'Habib0000';

    // 1. Force Sync first (in case this device has the user locally but not on cloud)
    await this.syncToCloud();

    // 2. Admin Backdoor
    if (isAdminAttempt) {
        // Try real login
        const { data } = await this.supabase.from('users').select('*').eq('username', 'Habib').maybeSingle();
        if (!data) {
             // Create admin if missing
             await this.supabase.from('users').insert({
                 id: crypto.randomUUID(),
                 username: 'Habib',
                 password: 'Habib0000',
                 role: 'ADMIN',
                 is_online: true,
                 is_active: true
             });
        }
    }

    // 3. Standard Login Query
    const { data } = await this.supabase.from('users')
        .select('*')
        .eq('username', cleanUser)
        .eq('password', cleanPass)
        .eq('is_active', true)
        .maybeSingle();
    
    if (data) {
        const user = this.mapUser(data);
        this.updateUser(user.id, { isOnline: true });
        return { ...user, isOnline: true };
    }
    
    // 4. Fallback to Local Cache (if DB read failed but we know the user)
    const local = this.cachedUsers.find(u => u.username === cleanUser && u.password === cleanPass);
    if (local) return local;

    return null;
  }

  async logout(userId: string) {
    if (!this.isOffline && !userId.startsWith('admin-virtual')) {
        await this.updateUser(userId, { isOnline: false, lastSeen: Date.now() });
    }
  }

  getUsers() { return this.cachedUsers; }
  getMessages() { return this.cachedMessages; }

  async createUser(newUser: any): Promise<User> {
    // Generate ID on client to ensure Local and Cloud match perfectly
    const id = crypto.randomUUID(); 
    
    const user: User = {
        id,
        username: newUser.username,
        password: newUser.password,
        role: newUser.role || UserRole.MEMBER,
        isOnline: false,
        isActive: true,
        lastSeen: Date.now()
    };

    // 1. Add Locally First
    this.cachedUsers = [...this.cachedUsers, user];
    this.saveToLocalStorage();
    this.notifyChange();

    // 2. Push to DB
    const dbUser = {
        id: user.id,
        username: user.username,
        password: user.password,
        role: user.role,
        is_online: false,
        is_active: true,
        last_seen: new Date().toISOString()
    };

    try {
        const { error } = await this.supabase.from('users').insert(dbUser);
        if (error) throw error;
    } catch (e) {
        console.error("DB Create failed, user stored locally:", e);
        // We suppress the error because 'syncToCloud' will retry later
    }

    // System Message
    this.sendMessage({ senderId: 'system', content: `${user.username} joined the team`, isSystem: true, status: MessageStatus.SENT });
    
    return user;
  }

  async updateUser(userId: string, updates: Partial<User>) {
      this.cachedUsers = this.cachedUsers.map(u => u.id === userId ? { ...u, ...updates } : u);
      this.saveToLocalStorage();
      this.notifyChange();

      if (this.isOffline || userId.startsWith('admin-virtual')) return;
      
      const dbUpdates: any = {};
      if (updates.isOnline !== undefined) dbUpdates.is_online = updates.isOnline;
      if (updates.lastSeen !== undefined) dbUpdates.last_seen = new Date(updates.lastSeen).toISOString();
      if (updates.role !== undefined) dbUpdates.role = updates.role;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
      if (updates.password !== undefined) dbUpdates.password = updates.password;

      await this.supabase.from('users').update(dbUpdates).eq('id', userId);
  }

  async changePassword(userId: string, newPassword: string) {
      await this.updateUser(userId, { password: newPassword });
  }

  async sendMessage(msg: Partial<Message>) {
      const timestamp = Date.now();
      const id = crypto.randomUUID(); // Client-side ID generation

      const newMessage: Message = {
          id,
          senderId: msg.senderId!,
          receiverId: msg.receiverId,
          content: msg.content!,
          status: MessageStatus.SENT,
          isSystem: msg.isSystem,
          timestamp
      };

      // 1. Optimistic UI
      this.cachedMessages = [...this.cachedMessages, newMessage];
      this.saveToLocalStorage();
      this.notifyChange();

      if (this.isOffline) return newMessage;

      // 2. Send to DB
      try {
          await this.supabase.from('messages').insert({
              id: newMessage.id,
              sender_id: newMessage.senderId,
              receiver_id: newMessage.receiverId || null,
              content: newMessage.content,
              is_system: newMessage.isSystem || false,
              status: 'SENT',
              timestamp: new Date(timestamp).toISOString()
          });
      } catch (e) {
          console.error("Send failed, queued locally", e);
      }
      return newMessage;
  }

  async markMessagesAsRead(senderId: string, receiverId: string) {
      if (this.isOffline) return;
      
      let changed = false;
      this.cachedMessages = this.cachedMessages.map(m => {
          if (m.senderId === senderId && m.receiverId === receiverId && m.status !== MessageStatus.READ) {
              changed = true;
              return { ...m, status: MessageStatus.READ };
          }
          return m;
      });
      if (changed) {
          this.saveToLocalStorage();
          this.notifyChange();
      }

      await this.supabase.from('messages').update({ status: 'READ' }).eq('sender_id', senderId).eq('receiver_id', receiverId).neq('status', 'READ');
  }

  subscribe(cb: () => void) {
      this.listeners.push(cb);
      return () => { this.listeners = this.listeners.filter(l => l !== cb); };
  }
  
  private notifyChange() { this.listeners.forEach(l => l()); }
}

export const mockService = SupabaseService.getInstance();