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

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser, onClose }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', role: UserRole.MEMBER });
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    setUsers(mockService.getUsers());
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (!formData.username || !formData.password) throw new Error("Fields required");
      await mockService.createUser(formData);
      setIsCreating(false);
      setFormData({ username: '', password: '', role: UserRole.MEMBER });
      loadUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleUserStatus = async (user: User) => {
    if (user.id === currentUser.id) return; // Can't deactivate self
    await mockService.updateUser(user.id, { isActive: !user.isActive });
    loadUsers();
  };

  const resetPassword = async (userId: string) => {
    const newPass = prompt("Enter new password for user:");
    if (newPass) {
      await mockService.updateUser(userId, { password: newPass });
      alert("Password updated");
      loadUsers();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-brand-panel border border-white/10 rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-brand-panel rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-500"/> Admin Dashboard
            </h2>
            <p className="text-gray-400 text-sm mt-1">Manage team access and credentials</p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 flex flex-col gap-8">
          
          {/* Create User Form */}
          {isCreating ? (
            <div className="bg-brand-darker p-6 rounded-lg border border-white/5 animate-fade-in">
               <h3 className="text-lg font-medium text-white mb-4">Create New Team Member</h3>
               <form onSubmit={handleCreateUser} className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <Input 
                     label="Username" 
                     value={formData.username} 
                     onChange={e => setFormData({...formData, username: e.target.value})}
                     placeholder="j.doe"
                   />
                   <Input 
                     label="Password" 
                     type="text" // Visible for admin creation
                     value={formData.password}
                     onChange={e => setFormData({...formData, password: e.target.value})}
                     placeholder="Initial password"
                   />
                   <div>
                     <label className="block text-xs font-medium text-gray-400 mb-1">Role</label>
                     <select 
                       className="w-full bg-brand-darker border border-gray-700/50 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-brand-500 text-sm"
                       value={formData.role}
                       onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                     >
                       <option value={UserRole.MEMBER}>Member</option>
                       <option value={UserRole.ADMIN}>Admin</option>
                     </select>
                   </div>
                 </div>
                 {error && <p className="text-red-400 text-sm">{error}</p>}
                 <div className="flex gap-3 justify-end">
                   <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                   <Button type="submit">Create User</Button>
                 </div>
               </form>
            </div>
          ) : (
             <div className="flex justify-between items-center">
               <div className="text-gray-400 text-sm">
                 Total Users: <span className="text-white font-medium">{users.length}</span>
               </div>
               <Button onClick={() => setIsCreating(true)}>
                 + Add New User
               </Button>
             </div>
          )}

          {/* User Table */}
          <div className="bg-brand-darker rounded-lg border border-white/5 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-gray-400 text-xs uppercase tracking-wider bg-white/5">
                  <th className="p-4 font-medium">User</th>
                  <th className="p-4 font-medium">Role</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Password</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.username} src={user.avatarUrl} size="sm" />
                        <div>
                          <div className="text-sm font-medium text-white">{user.username}</div>
                          <div className="text-xs text-gray-500">ID: {user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${user.role === UserRole.ADMIN ? 'bg-purple-500/20 text-purple-200' : 'bg-blue-500/20 text-blue-200'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs ${user.isActive ? 'text-green-400' : 'text-red-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-green-400' : 'bg-red-400'}`} />
                        {user.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-xs font-mono text-gray-500 flex items-center gap-2">
                        ••••••••
                        <button onClick={() => resetPassword(user.id)} className="text-brand-500 hover:text-brand-400">
                          Reset
                        </button>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      {user.id !== currentUser.id && (
                        <Button 
                          variant={user.isActive ? 'danger' : 'secondary'} 
                          className="px-2 py-1 text-xs"
                          onClick={() => toggleUserStatus(user)}
                        >
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
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