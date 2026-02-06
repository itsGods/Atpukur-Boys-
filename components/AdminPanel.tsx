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
  
  // Stats
  const [stats, setStats] = useState({ users: 0, online: 0, messages: 0 });

  // Form State
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
      if (!formData.username || !formData.password) throw new Error("Username and Password required");
      await mockService.createUser(formData);
      setFormData({ username: '', password: '', role: UserRole.MEMBER });
      setView('dashboard');
      loadData();
      showSuccess("User created successfully");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    try {
      // If password field is not empty, update it
      const updates: any = { role: formData.role };
      if (formData.password) updates.password = formData.password;
      
      await mockService.updateUser(selectedUser.id, updates);
      loadData();
      showSuccess("User updated");
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
      content: `📢 **ANNOUNCEMENT**\n\n${broadcastText}`,
      isSystem: true,
      status: MessageStatus.SENT
    });
    setBroadcastText('');
    showSuccess("Broadcast sent to General");
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center sm:p-6 animate-fade-in">
      <div className="bg-ios-bg w-full h-full sm:h-[85vh] sm:max-w-5xl sm:rounded-3xl border border-white/10 overflow-hidden flex flex-col shadow-2xl relative">
        
        {/* Navigation Bar */}
        <div className="h-[64px] border-b border-white/10 flex items-center justify-between px-4 bg-[#1C1C1E]/80 backdrop-blur-xl z-10 shrink-0">
          <div className="flex items-center gap-2">
            {view !== 'dashboard' && (
              <Button variant="ghost" onClick={() => setView('dashboard')} className="pl-0 text-ios-blue flex items-center gap-1">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back
              </Button>
            )}
            {view === 'dashboard' && (
                <h2 className="text-[20px] font-bold text-white tracking-tight">Admin Dashboard</h2>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {successMsg && <span className="text-ios-green text-sm font-medium animate-pulse">{successMsg}</span>}
            <Button variant="ghost" onClick={onClose} className="font-semibold text-ios-blue">Done</Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-black">
          
          {/* DASHBOARD VIEW */}
          {view === 'dashboard' && (
            <div className="p-4 sm:p-6 space-y-8 max-w-4xl mx-auto">
              
              {/* Analytics Cards */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-[#1C1C1E] rounded-xl p-4 border border-white/5">
                    <div className="text-ios-gray text-xs font-medium uppercase tracking-wider mb-1">Total Users</div>
                    <div className="text-2xl font-bold text-white">{stats.users}</div>
                </div>
                <div className="bg-[#1C1C1E] rounded-xl p-4 border border-white/5">
                    <div className="text-ios-gray text-xs font-medium uppercase tracking-wider mb-1">Online Now</div>
                    <div className="text-2xl font-bold text-ios-green">{stats.online}</div>
                </div>
                <div className="bg-[#1C1C1E] rounded-xl p-4 border border-white/5">
                    <div className="text-ios-gray text-xs font-medium uppercase tracking-wider mb-1">Messages</div>
                    <div className="text-2xl font-bold text-ios-blue">{stats.messages}</div>
                </div>
              </div>

              {/* System Broadcast */}
              <div className="space-y-2">
                 <h3 className="text-lg font-semibold text-white px-1">System Broadcast</h3>
                 <div className="bg-[#1C1C1E] rounded-xl p-4 border border-white/5 space-y-3">
                    <Input 
                        placeholder="Type an announcement..." 
                        value={broadcastText}
                        onChange={(e) => setBroadcastText(e.target.value)}
                        className="bg-black/50"
                    />
                    <div className="flex justify-end">
                        <Button variant="primary" onClick={handleBroadcast} disabled={!broadcastText} className="py-2 px-4 text-sm bg-ios-blue text-white shadow-none">
                            Send Announcement
                        </Button>
                    </div>
                 </div>
              </div>

              {/* User Management */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                    <h3 className="text-lg font-semibold text-white">Team Members</h3>
                    <Button variant="icon" onClick={() => { setFormData({username: '', password: '', role: UserRole.MEMBER}); setView('create'); }} className="text-ios-blue">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    </Button>
                </div>

                <div className="sticky top-0 z-10 bg-black py-2">
                     <Input 
                        variant="search" 
                        placeholder="Search users..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                     />
                </div>

                <div className="bg-[#1C1C1E] rounded-xl overflow-hidden border border-white/5 divide-y divide-white/5">
                   {filteredUsers.map(user => (
                       <div key={user.id} onClick={() => openUserDetail(user)} className="flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer active:bg-white/10 transition-colors">
                           <Avatar name={user.username} src={user.avatarUrl} size="md" className="shrink-0" isOnline={user.isOnline} />
                           <div className="flex-1 min-w-0">
                               <div className="flex justify-between">
                                   <div className="font-medium text-white flex items-center gap-2">
                                       {user.username}
                                       {user.role === UserRole.ADMIN && <span className="bg-ios-blue/20 text-ios-blue text-[10px] px-1.5 py-0.5 rounded font-bold">ADMIN</span>}
                                   </div>
                                   <div className={`text-xs ${user.isActive ? 'text-ios-gray' : 'text-ios-red'}`}>
                                       {user.isActive ? 'Active' : 'Inactive'}
                                   </div>
                               </div>
                               <div className="text-xs text-ios-gray truncate">ID: {user.id}</div>
                           </div>
                           <svg className="w-5 h-5 text-ios-gray/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                       </div>
                   ))}
                   {filteredUsers.length === 0 && (
                       <div className="p-4 text-center text-ios-gray text-sm">No users found.</div>
                   )}
                </div>
              </div>

            </div>
          )}

          {/* USER DETAIL VIEW */}
          {view === 'user-detail' && selectedUser && (
             <div className="p-4 sm:p-8 max-w-2xl mx-auto space-y-6">
                 
                 <div className="flex flex-col items-center pb-6 border-b border-white/10">
                     <Avatar name={selectedUser.username} src={selectedUser.avatarUrl} size="xl" className="mb-4" />
                     <h2 className="text-2xl font-bold text-white">{selectedUser.username}</h2>
                     <p className="text-ios-gray text-sm font-mono mt-1">{selectedUser.id}</p>
                 </div>

                 <div className="space-y-6">
                     {/* Edit Settings Group */}
                     <div className="space-y-2">
                        <label className="text-xs font-medium text-ios-gray uppercase ml-4">Account Settings</label>
                        <div className="bg-[#1C1C1E] rounded-xl border border-white/5 overflow-hidden">
                            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                                <span className="text-white">Role</span>
                                <select 
                                    className="bg-transparent text-ios-blue focus:outline-none text-right"
                                    value={formData.role}
                                    onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
                                    disabled={selectedUser.id === currentUser.id}
                                >
                                    <option value={UserRole.MEMBER}>Member</option>
                                    <option value={UserRole.ADMIN}>Admin</option>
                                </select>
                            </div>
                            <div className="p-4 flex items-center justify-between">
                                <span className="text-white">Reset Password</span>
                                <input 
                                    type="text" 
                                    placeholder="Enter new password"
                                    className="bg-transparent text-right text-white placeholder-ios-gray/50 focus:outline-none w-1/2"
                                    value={formData.password}
                                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="px-4">
                           <Button onClick={handleUpdateUser} className="w-full bg-ios-blue text-white py-2" disabled={selectedUser.id === currentUser.id && formData.role !== selectedUser.role}>
                              Save Changes
                           </Button>
                        </div>
                     </div>

                     {/* Danger Zone */}
                     {selectedUser.id !== currentUser.id && (
                         <div className="space-y-2 pt-4">
                            <label className="text-xs font-medium text-ios-gray uppercase ml-4">Security</label>
                            <div className="bg-[#1C1C1E] rounded-xl border border-white/5 overflow-hidden">
                                <button 
                                    onClick={handleToggleStatus}
                                    className="w-full p-4 text-left flex justify-between items-center active:bg-white/5 transition-colors"
                                >
                                    <span className="text-white">Account Status</span>
                                    <span className={selectedUser.isActive ? "text-ios-green" : "text-ios-red"}>
                                        {selectedUser.isActive ? "Active" : "Deactivated"}
                                    </span>
                                </button>
                            </div>
                            <div className="px-1">
                                <p className="text-xs text-ios-gray p-2">
                                    Deactivating a user prevents them from logging in but keeps their message history.
                                </p>
                            </div>
                         </div>
                     )}
                 </div>
             </div>
          )}

          {/* CREATE USER VIEW */}
          {view === 'create' && (
              <div className="p-4 sm:p-8 max-w-xl mx-auto">
                 <h2 className="text-2xl font-bold text-white mb-6 text-center">New Team Member</h2>
                 
                 <form onSubmit={handleCreateUser} className="space-y-6">
                     <div className="bg-[#1C1C1E] rounded-xl border border-white/5 overflow-hidden">
                        <div className="p-1">
                           <Input 
                             label="Username" 
                             className="bg-transparent border-none focus:ring-0 px-4" 
                             placeholder="e.g. john.appleseed"
                             value={formData.username}
                             onChange={e => setFormData({...formData, username: e.target.value})}
                           />
                        </div>
                        <div className="h-px bg-white/5 mx-4" />
                        <div className="p-1">
                           <Input 
                             label="Initial Password" 
                             className="bg-transparent border-none focus:ring-0 px-4" 
                             placeholder="Required"
                             value={formData.password}
                             onChange={e => setFormData({...formData, password: e.target.value})}
                           />
                        </div>
                        <div className="h-px bg-white/5 mx-4" />
                        <div className="p-4 flex justify-between items-center">
                            <label className="text-[13px] font-medium text-ios-gray ml-1">Role</label>
                            <div className="flex bg-black/50 p-1 rounded-lg">
                                <button 
                                    type="button"
                                    onClick={() => setFormData({...formData, role: UserRole.MEMBER})}
                                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${formData.role === UserRole.MEMBER ? 'bg-white/20 text-white' : 'text-gray-500'}`}
                                >
                                    Member
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setFormData({...formData, role: UserRole.ADMIN})}
                                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${formData.role === UserRole.ADMIN ? 'bg-white/20 text-white' : 'text-gray-500'}`}
                                >
                                    Admin
                                </button>
                            </div>
                        </div>
                     </div>

                     {error && <div className="text-ios-red text-center text-sm bg-ios-red/10 p-2 rounded-lg">{error}</div>}

                     <Button type="submit" className="w-full bg-ios-blue py-3 text-[17px]">
                        Create Account
                     </Button>
                 </form>
              </div>
          )}

        </div>
      </div>
    </div>
  );
};