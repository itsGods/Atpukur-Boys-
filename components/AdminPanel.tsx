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
  
  useEffect(() => {
    setUsers(mockService.getUsers());
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username) return;
    await mockService.createUser(formData);
    setUsers(mockService.getUsers());
    setFormData({ username: '', password: '', role: UserRole.MEMBER });
  };

  const toggleStatus = async (u: User) => {
      await mockService.updateUser(u.id, { isActive: !u.isActive });
      setUsers(mockService.getUsers());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in">
        <div className="w-full max-w-4xl bg-ios-card rounded-2xl border border-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="h-16 border-b border-ios-separator/50 flex items-center justify-between px-6 shrink-0 bg-ios-card/50">
                <h2 className="text-lg font-semibold text-white">Admin Console</h2>
                <button onClick={onClose} className="p-2 bg-ios-card2 rounded-full hover:bg-white/10">
                    <svg className="w-5 h-5 text-ios-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
                {/* Create User Form */}
                <div className="mb-8 bg-ios-card2/50 rounded-xl p-6 border border-white/5">
                    <h3 className="text-sm font-semibold text-ios-subtext uppercase tracking-wider mb-4">Create New User</h3>
                    <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-4 items-end">
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
                        <Button type="submit" className="w-full sm:w-auto h-[50px]">Create</Button>
                    </form>
                </div>

                {/* Users Table */}
                <h3 className="text-sm font-semibold text-ios-subtext uppercase tracking-wider mb-4">User Database</h3>
                <div className="bg-ios-card2/30 rounded-xl border border-white/5 overflow-hidden">
                    <table className="w-full text-left text-sm text-ios-subtext">
                        <thead className="bg-black/20 text-xs uppercase font-semibold text-ios-gray">
                            <tr>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Role</th>
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
                                        <span className={`px-2 py-1 rounded-md text-xs font-semibold ${u.role === UserRole.ADMIN ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`flex items-center gap-2 ${u.isActive ? 'text-ios-green' : 'text-ios-red'}`}>
                                            <span className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-ios-green' : 'bg-ios-red'}`}></span>
                                            {u.isActive ? 'Active' : 'Suspended'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => toggleStatus(u)}
                                            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${u.isActive ? 'bg-ios-red/10 text-ios-red hover:bg-ios-red/20' : 'bg-ios-green/10 text-ios-green hover:bg-ios-green/20'}`}
                                        >
                                            {u.isActive ? 'Suspend' : 'Activate'}
                                        </button>
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