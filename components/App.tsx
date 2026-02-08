import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { mockService } from '../services/storage';
import { Login } from './Login';
import { ChatWindow } from './ChatWindow';
import { AdminPanel } from './AdminPanel';
import { Avatar } from './ui/Avatar';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [showAdmin, setShowAdmin] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setUsers(mockService.getUsers());
    update();
    return mockService.subscribe(update);
  }, []);

  if (!currentUser) return <Login onLogin={setCurrentUser} />;

  const onlineUsers = users.filter(u => u.id !== currentUser.id && u.isOnline);
  const offlineUsers = users.filter(u => u.id !== currentUser.id && !u.isOnline);

  const handleLogout = async () => {
      await mockService.logout(currentUser.id);
      setCurrentUser(null);
  };

  return (
    <div className="h-[100dvh] w-full flex bg-cyber-black text-cyber-text overflow-hidden font-mono relative">
      {/* Sidebar: User List */}
      <div className={`
        ${activeChatId ? 'hidden md:flex' : 'flex'}
        flex-col w-full md:w-80 border-r border-cyber-border bg-cyber-dark/80 backdrop-blur-md z-10
      `}>
          {/* Header */}
          <div className="h-16 border-b border-cyber-border flex items-center justify-between px-4 shrink-0 bg-cyber-black">
              <div className="flex flex-col">
                  <span className="text-xs text-cyber-subtext uppercase tracking-widest">OPERATOR</span>
                  <span className="text-cyber-green font-bold tracking-tight">{currentUser.username}</span>
              </div>
              <div className="flex gap-2">
                  {currentUser.role === UserRole.ADMIN && (
                      <button onClick={() => setShowAdmin(true)} className="text-xs bg-cyber-blue/10 text-cyber-blue px-2 py-1 border border-cyber-blue/30 hover:bg-cyber-blue/20 transition-colors">
                          CMD_PANEL
                      </button>
                  )}
                  <button onClick={handleLogout} className="text-cyber-red hover:text-white transition-colors">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  </button>
              </div>
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div>
                  <h3 className="text-[10px] text-cyber-subtext uppercase tracking-widest mb-3 opacity-50 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-cyber-green rounded-full animate-pulse"></span>
                      ACTIVE_UNITS ({onlineUsers.length})
                  </h3>
                  <div className="space-y-1">
                      {onlineUsers.map(u => (
                          <button 
                            key={u.id}
                            onClick={() => setActiveChatId(u.id)}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-cyber-green/10 border border-transparent hover:border-cyber-green/30 transition-all group ${activeChatId === u.id ? 'bg-cyber-green/10 border-cyber-green/30' : ''}`}
                          >
                              <span className="text-cyber-green group-hover:text-white transition-colors">> {u.username}</span>
                          </button>
                      ))}
                      {onlineUsers.length === 0 && <span className="text-xs text-cyber-subtext italic px-3">NO_SIGNAL</span>}
                  </div>
              </div>

              <div>
                  <h3 className="text-[10px] text-cyber-subtext uppercase tracking-widest mb-3 opacity-50">OFFLINE</h3>
                  <div className="space-y-1">
                      {offlineUsers.map(u => (
                          <button 
                            key={u.id}
                            onClick={() => setActiveChatId(u.id)}
                            className={`w-full text-left px-3 py-2 text-sm text-cyber-subtext hover:bg-white/5 border border-transparent transition-all ${activeChatId === u.id ? 'bg-white/5' : ''}`}
                          >
                              > {u.username}
                          </button>
                      ))}
                  </div>
              </div>
          </div>
          
          <div className="p-2 border-t border-cyber-border text-[10px] text-cyber-subtext text-center bg-black">
              SYSTEM_SECURE // ENCRYPTED
          </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col relative bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyber-dark to-black ${!activeChatId ? 'hidden md:flex' : 'flex'}`}>
          {activeChatId ? (
             <ChatWindow 
                currentUser={currentUser} 
                chatPartnerId={activeChatId} 
                onBack={() => setActiveChatId(null)} 
             />
          ) : (
             <div className="flex-1 flex items-center justify-center text-cyber-subtext flex-col">
                 <div className="w-16 h-16 border border-cyber-subtext/30 flex items-center justify-center mb-4 animate-pulse">
                     <span className="text-2xl">_</span>
                 </div>
                 <p className="tracking-widest text-xs">SELECT_TARGET_FOR_UPLINK</p>
             </div>
          )}
      </div>

      {/* Admin Overlay */}
      {showAdmin && <AdminPanel currentUser={currentUser} onClose={() => setShowAdmin(false)} />}
    </div>
  );
}

export default App;