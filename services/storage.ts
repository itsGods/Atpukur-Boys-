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

    // 2. Try Fetching Fresh Data & Syncing
    try {
      await Promise.all([this.fetchUsers(), this.fetchMessages()]);
      await this.syncToCloud();
      this.subscribeToRealtime();
    } catch (error) {
      console.warn("Connection issue during init:", error);
      this.isOffline = true;
    }
  }

  // --- Helper: Robust ID Generation ---
  private generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for older environments
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
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
            newUser.isSynced = true; 
            
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
            updated.isSynced = true;
            this.cachedUsers = this.cachedUsers.map(u => u.id === updated.id ? updated : u);
            this.saveToLocalStorage();
            this.notifyChange();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.eventType === 'INSERT') {
            const newMsg = this.mapMessage(payload.new);
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
      isActive: row.is_active,
      isSynced: true // Mapped from DB, so it is synced
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
        const { data: dbUsers, error } = await this.supabase.from('users').select('*');
        
        if (dbUsers) {
            const remoteUsers = dbUsers.map(u => this.mapUser(u));
            const remoteIds = new Set(remoteUsers.map(u => u.id));
            
            // Identify local users that are NOT in the DB yet
            const localPending = this.cachedUsers
                .filter(u => !remoteIds.has(u.id) && !u.id.startsWith('admin-virtual'))
                .map(u => ({ ...u, isSynced: false }));
            
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
            const localPending = this.cachedMessages.filter(m => !remoteIds.has(m.id));
            this.cachedMessages = [...remoteMsgs, ...localPending].sort((a,b) => a.timestamp - b.timestamp);
            this.saveToLocalStorage();
            this.notifyChange();
        }
    } catch (e) { console.error("Fetch messages error", e); }
  }

  async syncToCloud() {
      if (this.isOffline) return;

      const usersToSync = this.cachedUsers.filter(u => !u.isSynced && !u.id.startsWith('admin-virtual'));
      
      if (usersToSync.length > 0) {
          console.log(`Attempting to sync ${usersToSync.length} users to cloud...`);
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
              { onConflict: 'id' }
          );
          
          if (error) {
              console.error("Sync to cloud failed:", error);
          } else {
              console.log("Sync successful!");
              // Mark as synced locally
              this.cachedUsers = this.cachedUsers.map(u => usersToSync.some(s => s.id === u.id) ? { ...u, isSynced: true } : u);
              this.saveToLocalStorage();
              this.notifyChange();
          }
      }
  }

  async login(username: string, password: string): Promise<User | null> {
    const cleanUser = username.trim();
    const cleanPass = password.trim();
    const isAdminAttempt = cleanUser === 'Habib' && cleanPass === 'Habib0000';

    await this.syncToCloud();

    if (isAdminAttempt) {
        const { data } = await this.supabase.from('users').select('*').eq('username', 'Habib').maybeSingle();
        if (!data) {
             const newAdmin = {
                 id: this.generateId(),
                 username: 'Habib',
                 password: 'Habib0000',
                 role: UserRole.ADMIN,
                 is_online: true,
                 is_active: true
             };
             await this.supabase.from('users').insert(newAdmin);
             return {
                 id: newAdmin.id,
                 username: newAdmin.username,
                 password: newAdmin.password,
                 role: newAdmin.role,
                 isOnline: newAdmin.is_online,
                 isActive: newAdmin.is_active,
                 isSynced: true
             } as User;
        }
    }

    // Improved Login Logic: Fetch by Username first, then check password
    // This provides better diagnostics than checking both in SQL
    const { data: userRecord, error } = await this.supabase.from('users')
        .select('*')
        .eq('username', cleanUser)
        .maybeSingle();
    
    if (userRecord) {
        // User exists in DB
        if (userRecord.password === cleanPass) {
            if (!userRecord.is_active) throw new Error("Account is suspended");
            
            const user = this.mapUser(userRecord);
            this.updateUser(user.id, { isOnline: true });
            return { ...user, isOnline: true };
        } else {
            throw new Error("Incorrect password");
        }
    } else if (!this.isOffline) {
        // User not found in DB
        // Check local cache just in case (e.g. freshly created by Admin on this device)
        const local = this.cachedUsers.find(u => u.username === cleanUser && u.password === cleanPass);
        if (local) return local;
        
        throw new Error("User not found. Please contact Admin.");
    }
    
    // Offline Fallback
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
    const id = this.generateId();
    
    const user: User = {
        id,
        username: newUser.username.trim(),
        password: newUser.password.trim(),
        role: newUser.role || UserRole.MEMBER,
        isOnline: false,
        isActive: true,
        lastSeen: Date.now(),
        isSynced: false // Initially local only
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
        if (error) {
            console.error("DB Create failed (likely permissions or ID conflict), user stored locally:", error);
            throw error;
        } else {
            // Update to synced
            this.cachedUsers = this.cachedUsers.map(u => u.id === id ? { ...u, isSynced: true } : u);
            this.saveToLocalStorage();
            this.notifyChange();
        }
    } catch (e) {
        // Silent fail - syncToCloud will pick it up later
    }

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
      const id = this.generateId();

      const newMessage: Message = {
          id,
          senderId: msg.senderId!,
          receiverId: msg.receiverId,
          content: msg.content!,
          status: MessageStatus.SENT,
          isSystem: msg.isSystem,
          timestamp
      };

      this.cachedMessages = [...this.cachedMessages, newMessage];
      this.saveToLocalStorage();
      this.notifyChange();

      if (this.isOffline) return newMessage;

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