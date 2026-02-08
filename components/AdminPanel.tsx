import React, { useState, useEffect } from 'react';
import { User, Message, UserRole } from '../types';
import { mockService } from '../services/storage';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface AdminPanelProps {
  currentUser: User;
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tab, setTab] = useState<'users' | 'messages' | 'system'>('users');
  const [newUser, setNewUser] = useState({ username: '', password: '' });

  useEffect(() => {
    const load = () => {
        setUsers(mockService.getUsers());
        setMessages(mockService.getMessages());
    };
    load();
    return mockService.subscribe(load);
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if(newUser.username.trim() && newUser.password.trim()) {
        await mockService.createUser({ 
            username: newUser.username.trim(), 
            password: newUser.password.trim(), 
            role: UserRole.MEMBER 
        });
        setNewUser({ username: '', password: '' });
    }
  };

  const toggleSend = async (u: User) => {
      await mockService.updateUser(u.id, { canSend: !u.canSend });
  };

  const handleDeleteMsg = async (id: string) => {
      if(confirm('CONFIRM DELETION?')) {
          await mockService.deleteMessage(id);
      }
  };

  return (
    <div className="fixed inset-0 z-50 bg-cyber-black text-cyber-text font-mono flex flex-col animate-fade-in">
        {/* Top Bar */}
        <div className="h-16 border-b border-cyber-green/30 flex items-center justify-between px-6 bg-cyber-dark shadow-neon-green relative z-10">
            <h1 className="text-xl font-bold text-cyber-green tracking-widest glitch-text">COMMAND_CENTER</h1>
            <button onClick={onClose} className="text-cyber-red border border-cyber-red/50 px-4 py-1 hover:bg-cyber-red hover:text-black transition-all">
                EXIT_TERMINAL
            </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
            {/* Sidebar Tabs */}
            <div className="w-64 border-r border-cyber-border bg-black/50 p-6 space-y-2">
                <button onClick={() => setTab('users')} className={`w-full text-left p-3 border ${tab === 'users' ? 'border-cyber-green text-cyber-green bg-cyber-green/10' : 'border-transparent text-cyber-subtext hover:text-white'}`}>
                    > USER_DATABASE
                </button>
                <button onClick={() => setTab('messages')} className={`w-full text-left p-3 border ${tab === 'messages' ? 'border-cyber-green text-cyber-green bg-cyber-green/10' : 'border-transparent text-cyber-subtext hover:text-white'}`}>
                    > MESSAGE_LOGS
                </button>
                <button onClick={() => setTab('system')} className={`w-full text-left p-3 border ${tab === 'system' ? 'border-cyber-green text-cyber-green bg-cyber-green/10' : 'border-transparent text-cyber-subtext hover:text-white'}`}>
                    > SYSTEM_STATS
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyber-dark to-black">
                
                {tab === 'users' && (
                    <div className="max-w-4xl mx-auto space-y-8">
                        <div className="glass-panel p-6">
                            <h3 className="text-cyber-green border-b border-cyber-green/30 pb-2 mb-4">INITIATE_NEW_UNIT</h3>
                            <form onSubmit={handleCreateUser} className="flex gap-4 items-end">
                                <Input label="UNIT_ID" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} placeholder="USERNAME" />
                                <Input label="ACCESS_KEY" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} placeholder="PASSWORD" />
                                <Button type="submit">CREATE</Button>
                            </form>
                        </div>

                        <div className="glass-panel p-6">
                            <h3 className="text-cyber-green border-b border-cyber-green/30 pb-2 mb-4">UNIT_ROSTER</h3>
                            <table className="w-full text-left text-sm">
                                <thead className="text-cyber-subtext border-b border-cyber-border">
                                    <tr>
                                        <th className="py-2">IDENTITY</th>
                                        <th className="py-2">STATUS</th>
                                        <th className="py-2">PERMISSIONS</th>
                                        <th className="py-2 text-right">CONTROLS</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-cyber-border">
                                    {users.map(u => (
                                        <tr key={u.id} className="hover:bg-white/5">
                                            <td className="py-3 font-bold">{u.username}</td>
                                            <td className="py-3">
                                                <span className={u.isOnline ? 'text-cyber-green' : 'text-cyber-subtext'}>
                                                    {u.isOnline ? 'ONLINE' : 'OFFLINE'}
                                                </span>
                                            </td>
                                            <td className="py-3">
                                                <span className={u.canSend ? 'text-cyber-blue' : 'text-cyber-red'}>
                                                    {u.canSend ? 'WRITE_ENABLED' : 'READ_ONLY'}
                                                </span>
                                            </td>
                                            <td className="py-3 text-right">
                                                {u.role !== 'ADMIN' && (
                                                    <button 
                                                        onClick={() => toggleSend(u)}
                                                        className={`text-xs px-2 py-1 border ${u.canSend ? 'border-cyber-red text-cyber-red hover:bg-cyber-red/10' : 'border-cyber-green text-cyber-green hover:bg-cyber-green/10'}`}
                                                    >
                                                        {u.canSend ? 'REVOKE_WRITE' : 'GRANT_WRITE'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {tab === 'messages' && (
                    <div className="max-w-4xl mx-auto glass-panel p-6">
                        <h3 className="text-cyber-green border-b border-cyber-green/30 pb-2 mb-4">GLOBAL_INTERCEPT_LOG</h3>
                        <div className="space-y-2">
                            {messages.slice().reverse().map(m => {
                                const sender = users.find(u => u.id === m.senderId)?.username || 'UNKNOWN';
                                return (
                                    <div key={m.id} className="flex items-center justify-between p-2 hover:bg-white/5 border border-transparent hover:border-cyber-border transition-colors">
                                        <div className="flex-1">
                                            <div className="flex gap-2 text-xs mb-1">
                                                <span className="text-cyber-blue">{sender}</span>
                                                <span className="text-cyber-subtext">-></span>
                                                <span className="text-cyber-subtext">TARGET_ID:{m.receiverId?.slice(0,5)}</span>
                                                <span className="opacity-50 ml-auto">{new Date(m.timestamp).toLocaleString()}</span>
                                            </div>
                                            <p className="text-sm font-mono text-white opacity-80">{m.content}</p>
                                        </div>
                                        <button onClick={() => handleDeleteMsg(m.id)} className="ml-4 text-cyber-red hover:bg-cyber-red/20 p-2">
                                            [DEL]
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {tab === 'system' && (
                    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="glass-panel p-6 flex flex-col items-center justify-center h-40 border-t-4 border-t-cyber-green shadow-neon-green">
                            <span className="text-4xl font-bold text-white mb-2">{users.length}</span>
                            <span className="text-cyber-green text-sm tracking-widest">TOTAL_UNITS</span>
                        </div>
                        <div className="glass-panel p-6 flex flex-col items-center justify-center h-40 border-t-4 border-t-cyber-blue shadow-neon-blue">
                            <span className="text-4xl font-bold text-white mb-2">{messages.length}</span>
                            <span className="text-cyber-blue text-sm tracking-widest">INTERCEPTED_MSGS</span>
                        </div>
                        <div className="glass-panel p-6 flex flex-col items-center justify-center h-40 border-t-4 border-t-white">
                            <span className="text-4xl font-bold text-white mb-2">{users.filter(u => u.isOnline).length}</span>
                            <span className="text-white text-sm tracking-widest">ACTIVE_SIGNALS</span>
                        </div>
                    </div>
                )}

            </div>
        </div>
    </div>
  );
};