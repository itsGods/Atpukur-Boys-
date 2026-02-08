import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { mockService } from '../services/storage';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Avatar } from './ui/Avatar';

interface AdminPanelProps {
  currentUser: User;
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState({ username: '', password: '', role: UserRole.MEMBER });
  const [isCreating, setIsCreating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [createError, setCreateError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  useEffect(() => {
    const load = () => setUsers(mockService.getUsers());
    load();
    const unsub = mockService.subscribe(load);
    return unsub;
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password) {
        setCreateError("Username and password are required");
        return;
    }

    setIsCreating(true);
    setCreateError('');
    setSuccessMsg('');

    try {
        await mockService.createUser(formData);
        setFormData({ username: '', password: '', role: UserRole.MEMBER });
        setSuccessMsg(`User ${formData.username} created successfully`);
        setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
        setCreateError("Failed to create user. Please try again.");
    } finally {
        setIsCreating(false);
    }
  };

  const handleForceSync = async () => {
      setIsSyncing(true);
      await mockService.syncToCloud();
      await mockService.fetchUsers();
      setIsSyncing(false);
      setSuccessMsg("Cloud Sync Completed");
      setTimeout(() => setSuccessMsg(''), 3000);
  };

  const toggleStatus = async (u: User) => {
      await mockService.updateUser(u.id, { isActive: !u.isActive });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in">
        <div className="w-full max-w-4xl bg-ios-card rounded-2xl border border-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="h-16 border-b border-ios-separator/50 flex items-center justify-between px-6 shrink-0 bg-ios-card/50">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-white">Admin Console</h2>
                    <button 
                        onClick={handleForceSync}
                        disabled={isSyncing}
                        className={`text-[10px] px-2 py-1 rounded border border-ios-blue text-ios-blue hover:bg-ios-blue/10 flex items-center gap-1 ${isSyncing ? 'opacity-50' : ''}`}
                    >
                        <svg className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        {isSyncing ? 'Syncing...' : 'Force Cloud Sync'}
                    </button>
                </div>
                <button onClick={onClose} className="p-2 bg-ios-card2 rounded-full hover:bg-white/10">
                    <svg className="w-5 h-5 text-ios-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
                {/* Create User Form */}
                <div className="mb-8 bg-ios-card2/50 rounded-xl p-6 border border-white/5 relative overflow-hidden">
                    <h3 className="text-sm font-semibold text-ios-subtext uppercase tracking-wider mb-4">Create New User</h3>
                    
                    <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-4 items-end relative z-10">
                        <Input 
                            label="Username" 
                            value={formData.username} 
                            onChange={e => setFormData({...formData, username: e.target.value})} 
                            className="bg-black/20"
                        />
                        <Input 
                            label="Password" 
                            value={formData.password} 
                            onChange={e => setFormData({...formData, password: e.target.value})}
                            className="bg-black/20" 
                        />
                        <div className="w-full sm:w-48">
                             <label className="block text-[13px] font-medium text-ios-subtext mb-2 ml-1">Role</label>
                             <select 
                                className="w-full bg-black/20 text-white rounded-xl px-4 py-3.5 border border-white/5 outline-none focus:ring-1 focus:ring-ios-blue"
                                value={formData.role}
                                onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                             >
                                 <option value={UserRole.MEMBER}>Member</option>
                                 <option value={UserRole.ADMIN}>Admin</option>
                             </select>
                        </div>
                        <Button type="submit" className="w-full sm:w-auto h-[50px]" isLoading={isCreating}>Create</Button>
                    </form>

                    {createError && (
                        <p className="mt-3 text-ios-red text-xs font-medium bg-ios-red/10 p-2 rounded-lg inline-block animate-fade-in">
                            {createError}
                        </p>
                    )}
                    {successMsg && (
                        <p className="mt-3 text-ios-green text-xs font-medium bg-ios-green/10 p-2 rounded-lg inline-block animate-fade-in">
                            {successMsg}
                        </p>
                    )}
                </div>

                {/* Users Table */}
                <h3 className="text-sm font-semibold text-ios-subtext uppercase tracking-wider mb-4">User Database ({users.length})</h3>
                <div className="bg-ios-card2/30 rounded-xl border border-white/5 overflow-hidden">
                    <table className="w-full text-left text-sm text-ios-subtext">
                        <thead className="bg-black/20 text-xs uppercase font-semibold text-ios-gray">
                            <tr>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Sync</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Password</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {users.map(u => (
                                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <Avatar name={u.username} size="sm" isOnline={u.isOnline} />
                                            <span className="font-medium text-white">{u.username}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {u.isSynced ? (
                                            <span className="flex items-center gap-1.5 text-ios-blue text-xs font-medium">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                Synced
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1.5 text-orange-400 text-xs font-medium" title="User only exists on this device. Click Force Sync to upload.">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                Local Only
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-md text-xs font-semibold ${u.role === UserRole.ADMIN ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-mono opacity-50">
                                        {u.password || '****'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`flex items-center gap-2 ${u.isActive ? 'text-ios-green' : 'text-ios-red'}`}>
                                            <span className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-ios-green' : 'bg-ios-red'}`}></span>
                                            {u.isActive ? 'Active' : 'Suspended'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {u.username !== 'Habib' && (
                                            <button 
                                                onClick={() => toggleStatus(u)}
                                                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${u.isActive ? 'bg-ios-red/10 text-ios-red hover:bg-ios-red/20' : 'bg-ios-green/10 text-ios-green hover:bg-ios-green/20'}`}
                                            >
                                                {u.isActive ? 'Suspend' : 'Activate'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
  );
};