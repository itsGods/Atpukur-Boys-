import React, { useState, useEffect } from 'react';
import { User, UserRole, MessageStatus } from '../types';
import { mockService } from '../services/storage';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Avatar } from './ui/Avatar';

interface AdminPanelProps {
  currentUser: User;
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser, onClose }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [view, setView] = useState<'dashboard' | 'user-detail' | 'create'>('dashboard');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [broadcastText, setBroadcastText] = useState('');
  
  const [stats, setStats] = useState({ users: 0, online: 0, messages: 0 });
  const [formData, setFormData] = useState({ username: '', password: '', role: UserRole.MEMBER });
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const allUsers = mockService.getUsers();
    const allMessages = mockService.getMessages();
    setUsers(allUsers);
    setStats({
      users: allUsers.length,
      online: allUsers.filter(u => u.isOnline).length,
      messages: allMessages.length
    });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (!formData.username || !formData.password) throw new Error("CREDENTIALS_MISSING");
      await mockService.createUser(formData);
      setFormData({ username: '', password: '', role: UserRole.MEMBER });
      setView('dashboard');
      loadData();
      showSuccess("UNIT_INITIALIZED");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    try {
      const updates: any = { role: formData.role };
      if (formData.password) updates.password = formData.password;
      
      await mockService.updateUser(selectedUser.id, updates);
      loadData();
      showSuccess("DB_RECORD_UPDATED");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedUser) return;
    await mockService.updateUser(selectedUser.id, { isActive: !selectedUser.isActive });
    setSelectedUser({ ...selectedUser, isActive: !selectedUser.isActive });
    loadData();
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;
    
    await mockService.sendMessage({
      senderId: 'system',
      content: `SYSTEM_BROADCAST:\n\n${broadcastText}`,
      isSystem: true,
      status: MessageStatus.SENT
    });
    setBroadcastText('');
    showSuccess("PACKET_SENT_ALL");
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.id.includes(searchQuery.toLowerCase())
  );

  const openUserDetail = (user: User) => {
    setSelectedUser(user);
    setFormData({ username: user.username, password: '', role: user.role });
    setView('user-detail');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-0 sm:p-8 animate-matrix-fade font-mono">
      {/* Mainframe Container */}
      <div className="w-full h-full bg-hacker-black relative flex flex-col overflow-hidden sm:border sm:border-hacker-green/30 sm:shadow-[0_0_60px_rgba(0,255,65,0.1)] bg-noise bg-[size:30px_30px] bg-grid-pattern clip-tech-border">
        
        {/* Top Decorative Bar */}
        <div className="h-1 w-full bg-gradient-to-r from-hacker-green/0 via-hacker-green/50 to-hacker-green/0"></div>
        
        {/* Header */}
        <div className="h-16 border-b border-hacker-border flex items-center justify-between px-6 bg-hacker-panel/90 backdrop-blur-md shrink-0">
            {/* Title Block */}
            <div className="flex items-center gap-4">
                 <div className="w-8 h-8 border border-hacker-green flex items-center justify-center bg-hacker-green/10 animate-pulse">
                    <svg className="w-5 h-5 text-hacker-green" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                 </div>
                 <div>
                     <h2 className="text-xl font-bold text-white tracking-[0.15em] glitch-text" data-text="ROOT_ACCESS_TERMINAL">ROOT_ACCESS_TERMINAL</h2>
                     <div className="flex items-center gap-2">
                         <div className="w-1.5 h-1.5 bg-hacker-green animate-pulse rounded-full"></div>
                         <span className="text-[10px] text-hacker-green tracking-widest uppercase">Secure Connection</span>
                         {successMsg && <span className="ml-4 text-[10px] text-hacker-green bg-hacker-green/10 border border-hacker-green px-2 py-0.5 animate-pulse">>> {successMsg}</span>}
                     </div>
                 </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-6">
                {view !== 'dashboard' && (
                    <button onClick={() => setView('dashboard')} className="text-hacker-cyan text-xs font-bold tracking-widest hover:text-white transition-colors flex items-center gap-2 group border border-transparent hover:border-hacker-cyan/30 px-3 py-1">
                        <span>&lt; RETURN_TO_DASHBOARD</span>
                    </button>
                )}
                <div className="h-8 w-px bg-hacker-border hidden sm:block"></div>
                <button onClick={onClose} className="text-hacker-red text-xs font-bold tracking-widest hover:text-white transition-colors flex items-center gap-2 group border border-hacker-red/30 hover:bg-hacker-red/10 px-3 py-1">
                    <span>[ TERMINATE_SESSION ]</span>
                </button>
            </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-6 sm:p-10 relative">
            
            {/* View: Dashboard */}
            {view === 'dashboard' && (
                <div className="max-w-7xl mx-auto space-y-10">
                    
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { label: 'REGISTERED_UNITS', val: stats.users, color: 'text-white' },
                            { label: 'ACTIVE_LINKS', val: stats.online, color: 'text-hacker-green' },
                            { label: 'DATA_PACKETS', val: stats.messages, color: 'text-hacker-cyan' }
                        ].map((stat, i) => (
                            <div key={i} className="bg-hacker-panel/40 border border-hacker-border p-6 relative group overflow-hidden">
                                {/* Hover Effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-hacker-green/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                                
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-[10px] text-hacker-muted tracking-[0.2em] font-bold">{stat.label}</span>
                                    <svg className={`w-4 h-4 ${stat.color} opacity-50`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                </div>
                                <div className={`text-5xl font-bold ${stat.color} font-mono tracking-tighter`}>{stat.val}</div>
                                
                                {/* Corner Decorations */}
                                <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-hacker-muted/30 group-hover:border-hacker-green transition-colors"></div>
                                <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-hacker-muted/30 group-hover:border-hacker-green transition-colors"></div>
                            </div>
                        ))}
                    </div>

                    {/* Broadcast Module */}
                    <div className="border border-hacker-border bg-black/40 p-1 relative">
                        <div className="absolute top-0 left-0 bg-hacker-green text-black text-[9px] font-bold px-3 py-0.5 tracking-widest">BROADCAST_MODULE_V2</div>
                        <div className="p-6 pt-8 flex gap-4 items-center">
                            <div className="flex-1 bg-transparent border-b border-hacker-border focus-within:border-hacker-green transition-colors flex items-center gap-2 py-2">
                                <span className="text-hacker-green text-sm font-bold">{`>`}</span>
                                <input 
                                    className="bg-transparent w-full text-hacker-text placeholder-hacker-muted/50 focus:outline-none font-mono text-sm"
                                    placeholder="ENTER_SYSTEM_ANNOUNCEMENT..."
                                    value={broadcastText}
                                    onChange={(e) => setBroadcastText(e.target.value)}
                                />
                            </div>
                            <Button onClick={handleBroadcast} disabled={!broadcastText} className="shrink-0 h-10 px-8 text-xs border-hacker-green/50 hover:bg-hacker-green/10">
                                TRANSMIT
                            </Button>
                        </div>
                    </div>

                    {/* User Database */}
                    <div className="space-y-6">
                        <div className="flex justify-between items-end border-b border-hacker-border pb-4">
                            <h3 className="text-xl font-bold text-white tracking-[0.2em] glitch-text" data-text="DATABASE_ENTRIES">DATABASE_ENTRIES</h3>
                            <Button variant="secondary" onClick={() => { setFormData({username: '', password: '', role: UserRole.MEMBER}); setView('create'); }} className="flex items-center gap-2">
                                <span>+ NEW_ENTRY</span>
                            </Button>
                        </div>

                        <Input 
                           variant="search" 
                           placeholder="QUERY_USER_DB..." 
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                           className="bg-black/20 border-hacker-border"
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                           {filteredUsers.map(user => (
                               <div key={user.id} onClick={() => openUserDetail(user)} className="bg-hacker-panel/20 border border-hacker-border hover:border-hacker-green/50 p-4 flex items-center gap-4 cursor-pointer group transition-all relative overflow-hidden clip-tech-border hover:bg-hacker-green/5">
                                   <Avatar name={user.username} src={user.avatarUrl} size="md" className="shrink-0 border-hacker-border" isOnline={user.isOnline} />
                                   <div className="flex-1 min-w-0">
                                       <div className="flex justify-between items-center mb-1">
                                           <div className="font-bold text-hacker-text group-hover:text-hacker-green tracking-wide">{user.username}</div>
                                           {user.role === UserRole.ADMIN && <span className="text-[8px] bg-hacker-red/10 text-hacker-red px-1 border border-hacker-red/30">ROOT</span>}
                                       </div>
                                       <div className="text-[9px] text-hacker-muted font-mono">{user.id}</div>
                                       <div className={`text-[9px] mt-2 font-bold tracking-widest ${user.isActive ? 'text-hacker-green' : 'text-hacker-red'}`}>
                                           [{user.isActive ? 'ACTIVE' : 'TERMINATED'}]
                                       </div>
                                   </div>
                               </div>
                           ))}
                        </div>
                    </div>
                </div>
            )}

            {/* View: User Detail */}
            {view === 'user-detail' && selectedUser && (
                <div className="max-w-3xl mx-auto space-y-8 mt-4 animate-fade-in">
                     <div className="flex items-start gap-8 border-b border-hacker-border pb-8">
                         <div className="p-2 border border-hacker-green/50 bg-black/50 shadow-[0_0_30px_rgba(0,255,65,0.1)]">
                            <Avatar name={selectedUser.username} src={selectedUser.avatarUrl} size="xl" />
                         </div>
                         <div className="flex-1 pt-2">
                             <div className="flex items-center justify-between">
                                 <h2 className="text-4xl font-bold text-white tracking-widest mb-2 font-mono glitch-text" data-text={selectedUser.username}>{selectedUser.username}</h2>
                                 <div className={`px-3 py-1 border text-xs font-bold tracking-widest ${selectedUser.isOnline ? 'border-hacker-green text-hacker-green bg-hacker-green/5' : 'border-hacker-muted text-hacker-muted'}`}>
                                     {selectedUser.isOnline ? 'ONLINE' : 'OFFLINE'}
                                 </div>
                             </div>
                             <p className="text-hacker-cyan font-mono text-sm tracking-widest mb-4">ID: {selectedUser.id}</p>
                             <div className="flex gap-4 text-[10px] text-hacker-muted font-mono uppercase">
                                 <span>Last Seen: {new Date(selectedUser.lastSeen || 0).toLocaleString()}</span>
                                 <span>Role: {selectedUser.role}</span>
                             </div>
                         </div>
                     </div>

                     <div className="grid grid-cols-1 gap-6">
                         <div className="border border-hacker-border bg-hacker-panel/30 p-8 relative">
                            <div className="absolute top-0 left-0 w-20 h-0.5 bg-hacker-cyan"></div>
                            <h3 className="text-hacker-cyan text-xs font-bold uppercase mb-6 tracking-[0.2em]">PERMISSION_LEVEL</h3>
                            <div className="flex gap-4">
                                {[UserRole.MEMBER, UserRole.ADMIN].map(role => (
                                    <button 
                                        key={role}
                                        onClick={() => setFormData({...formData, role})}
                                        disabled={selectedUser.id === currentUser.id}
                                        className={`flex-1 py-4 border text-xs font-bold transition-all relative group overflow-hidden ${
                                            formData.role === role 
                                            ? 'border-hacker-green bg-hacker-green/10 text-hacker-green shadow-[0_0_15px_rgba(0,255,65,0.2)]' 
                                            : 'border-hacker-border text-hacker-muted hover:border-hacker-text bg-black/30'
                                        }`}
                                    >
                                        {role}
                                        {formData.role === role && <div className="absolute bottom-0 right-0 w-2 h-2 bg-hacker-green"></div>}
                                    </button>
                                ))}
                            </div>
                         </div>

                         <div className="border border-hacker-border bg-hacker-panel/30 p-8">
                            <h3 className="text-hacker-cyan text-xs font-bold uppercase mb-6 tracking-[0.2em]">SECURITY_OVERRIDE</h3>
                            <div className="flex gap-4 items-end">
                                 <div className="flex-1">
                                    <Input 
                                        label="NEW_ACCESS_KEY"
                                        placeholder="ENTER_NEW_PASSWORD"
                                        className="font-mono bg-black/50 border-hacker-border"
                                        value={formData.password}
                                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                                    />
                                 </div>
                                <Button onClick={handleUpdateUser} className="shrink-0 h-[46px] border-hacker-green hover:bg-hacker-green hover:text-black" disabled={selectedUser.id === currentUser.id && formData.role !== selectedUser.role}>
                                    EXECUTE_UPDATE
                                </Button>
                            </div>
                         </div>

                         {selectedUser.id !== currentUser.id && (
                             <div className="border border-hacker-red/30 bg-hacker-red/5 p-8 relative overflow-hidden">
                                <div className="absolute -right-4 -top-4 text-hacker-red/10 text-9xl font-bold select-none pointer-events-none">!</div>
                                <h3 className="text-hacker-red text-xs font-bold uppercase mb-6 tracking-[0.2em]">DANGER_ZONE</h3>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-sm text-hacker-text font-bold block mb-1">REVOKE_ACCESS_RIGHTS</span>
                                        <span className="text-[10px] text-hacker-muted block">Disable login capabilities for this unit.</span>
                                    </div>
                                    <Button 
                                        variant="danger" 
                                        onClick={handleToggleStatus}
                                        className="border border-hacker-red text-hacker-red hover:bg-hacker-red hover:text-white"
                                    >
                                        {selectedUser.isActive ? 'DEACTIVATE_UNIT' : 'REACTIVATE_UNIT'}
                                    </Button>
                                </div>
                             </div>
                         )}
                     </div>
                </div>
            )}

            {/* View: Create User */}
            {view === 'create' && (
                  <div className="max-w-xl mx-auto mt-10">
                     <div className="border border-hacker-green/50 bg-black/80 p-10 relative shadow-[0_0_40px_rgba(0,255,65,0.05)] clip-tech-border">
                         <div className="absolute top-0 left-0 bg-hacker-green text-black text-[10px] font-bold px-4 py-1 tracking-widest">NEW_OPERATIVE_PROTOCOL</div>
                         
                         <form onSubmit={handleCreateUser} className="space-y-8 mt-4">
                             <Input 
                                 label="DESIGNATION" 
                                 placeholder="USERNAME"
                                 value={formData.username}
                                 onChange={e => setFormData({...formData, username: e.target.value})}
                                 className="bg-black/50 border-hacker-border"
                             />
                             
                             <Input 
                                 label="ACCESS_KEY" 
                                 placeholder="PASSWORD"
                                 value={formData.password}
                                 onChange={e => setFormData({...formData, password: e.target.value})}
                                 className="bg-black/50 border-hacker-border"
                             />
                             
                             <div className="space-y-3">
                                 <label className="text-[11px] font-bold text-hacker-green uppercase tracking-widest pl-1">{`> CLEARANCE_LEVEL`}</label>
                                 <div className="flex gap-4">
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({...formData, role: UserRole.MEMBER})}
                                        className={`flex-1 py-3 border text-xs font-bold tracking-widest transition-all ${formData.role === UserRole.MEMBER ? 'bg-hacker-cyan/10 border-hacker-cyan text-hacker-cyan shadow-[0_0_10px_rgba(0,243,255,0.2)]' : 'border-hacker-border text-hacker-muted bg-black/30'}`}
                                    >
                                        STANDARD
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({...formData, role: UserRole.ADMIN})}
                                        className={`flex-1 py-3 border text-xs font-bold tracking-widest transition-all ${formData.role === UserRole.ADMIN ? 'bg-hacker-red/10 border-hacker-red text-hacker-red shadow-[0_0_10px_rgba(255,0,60,0.2)]' : 'border-hacker-border text-hacker-muted bg-black/30'}`}
                                    >
                                        ADMIN
                                    </button>
                                 </div>
                             </div>

                             {error && <div className="text-hacker-red text-center text-xs font-bold border border-hacker-red p-3 bg-hacker-red/5 animate-pulse">{error}</div>}

                             <Button type="submit" className="w-full mt-6 h-12 text-sm tracking-[0.2em] shadow-[0_0_20px_rgba(0,255,65,0.1)]">
                                INITIATE_CREATION
                             </Button>
                         </form>
                     </div>
                  </div>
            )}
        </div>

        {/* Footer */}
         <div className="h-8 border-t border-hacker-border bg-black/80 flex items-center justify-between px-6 text-[9px] text-hacker-muted font-mono uppercase shrink-0">
             <div className="flex gap-6">
                 <span>CPU_LOAD: {Math.floor(Math.random() * 30 + 20)}%</span>
                 <span>MEM_ALLOC: 1024MB</span>
             </div>
             <div className="flex gap-2 items-center">
                 <span className="w-1.5 h-1.5 bg-hacker-green/50 animate-pulse rounded-full"></span>
                 <span>SYSTEM_INTEGRITY: 100%</span>
             </div>
        </div>
      </div>
    </div>
  );
};