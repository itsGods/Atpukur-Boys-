import React, { useState, useEffect } from 'react';
import { User, UserRole, Message } from './types';
import { mockService } from './services/storage';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { ChatWindow } from './components/ChatWindow';
import { Avatar } from './components/ui/Avatar';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { AdminPanel } from './components/AdminPanel';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [activeChatId, setActiveChatId] = useState<string>('general');
  const [activeTab, setActiveTab] = useState<'chats' | 'people' | 'settings'>('chats');
  const [searchQuery, setSearchQuery] = useState('');

  // Initial Data Load & Subscription
  useEffect(() => {
    const updateData = () => {
      setUsers(mockService.getUsers());
      setMessages(mockService.getMessages());
    };
    
    updateData();
    const unsubscribe = mockService.subscribe(updateData);
    const interval = setInterval(updateData, 2000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    if (currentUser) {
      mockService.logout(currentUser.id);
    }
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} />;
  }

  // --- Helpers ---
  const getLastMessage = (userId: string) => {
      const dmMsgs = messages.filter(m => 
        (m.senderId === currentUser.id && m.receiverId === userId) ||
        (m.senderId === userId && m.receiverId === currentUser.id)
      );
      if (dmMsgs.length === 0) return null;
      return dmMsgs[dmMsgs.length - 1];
  };

  const getLastGeneralMessage = () => {
      const genMsgs = messages.filter(m => !m.receiverId || m.receiverId === 'general');
      if (genMsgs.length === 0) return null;
      return genMsgs[genMsgs.length - 1];
  };

  const lastGeneralMsg = getLastGeneralMessage();
  const formatTime = (ts: number) => {
     try {
         const date = new Date(ts);
         if (new Date().toDateString() === date.toDateString()) {
             return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
         }
         return date.toLocaleDateString();
     } catch (e) {
         return '';
     }
  };

  const openChat = (chatId: string) => {
      setActiveChatId(chatId);
      setMobileView('chat');
  };

  // --- Views ---

  const renderChatsTab = () => {
    // Sort users by last message timestamp (most recent first)
    const chatUsers = users.filter(u => u.id !== currentUser.id)
      .filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        const msgA = getLastMessage(a.id);
        const msgB = getLastMessage(b.id);
        const timeA = msgA ? msgA.timestamp : 0;
        const timeB = msgB ? msgB.timestamp : 0;
        return timeB - timeA;
    });

    return (
        <div className="flex-1 overflow-y-auto no-scrollbar bg-transparent animate-fade-in p-2 space-y-1">
             {/* Pinned General Chat */}
             {!searchQuery && (
                <div 
                  onClick={() => openChat('general')}
                  className={`
                    group relative flex items-center gap-3 px-3 py-4 cursor-pointer border-b border-hacker-border/50 hover:bg-hacker-green/5 transition-all
                    ${activeChatId === 'general' ? 'bg-hacker-green/5 border-l-2 border-l-hacker-green' : 'border-l-2 border-l-transparent'}
                  `}
                >
                    <div className="w-12 h-12 flex items-center justify-center border border-hacker-green text-hacker-green bg-black relative shadow-[0_0_10px_rgba(0,255,65,0.1)] group-hover:shadow-[0_0_15px_rgba(0,255,65,0.3)] transition-shadow">
                        <span className="font-bold text-lg">#</span>
                        {/* Corner markers */}
                        <div className="absolute top-0 left-0 w-1 h-1 bg-hacker-green"></div>
                        <div className="absolute bottom-0 right-0 w-1 h-1 bg-hacker-green"></div>
                    </div>
                    
                    <div className="flex-1 min-w-0 font-mono relative z-10">
                        <div className="flex justify-between items-baseline mb-1">
                            <h4 className="text-hacker-text font-bold text-sm tracking-wider group-hover:text-hacker-green transition-all">GENERAL_CHANNEL</h4>
                            {lastGeneralMsg && (
                                <span className="text-[9px] text-hacker-muted shrink-0">{formatTime(lastGeneralMsg.timestamp)}</span>
                            )}
                        </div>
                        <p className="text-[11px] text-hacker-muted truncate leading-snug font-sans group-hover:text-hacker-text/70 transition-colors">
                            {lastGeneralMsg ? (
                                <span className={lastGeneralMsg.senderId === currentUser.id ? 'text-hacker-cyan' : ''}>
                                    <span className="text-hacker-green/70 text-[9px] uppercase mr-1">{lastGeneralMsg.senderId === currentUser.id ? 'YOU' : `${users.find(u => u.id === lastGeneralMsg.senderId)?.username}`}</span>
                                    {lastGeneralMsg.content}
                                </span>
                            ) : (
                                '<NO_DATA_PACKETS>'
                            )}
                        </p>
                    </div>
                </div>
             )}

             {/* Users List */}
             {chatUsers.map(user => {
               const lastMsg = getLastMessage(user.id);
               return (
                   <div 
                     key={user.id} 
                     onClick={() => openChat(user.id)} 
                     className={`
                        group relative flex items-center gap-3 px-3 py-4 cursor-pointer border-b border-hacker-border/50 hover:bg-hacker-green/5 transition-all
                        ${activeChatId === user.id ? 'bg-hacker-green/5 border-l-2 border-l-hacker-green' : 'border-l-2 border-l-transparent'}
                     `}
                   >
                       <Avatar name={user.username} src={user.avatarUrl} size="md" isOnline={user.isOnline} />
                       
                       <div className="flex-1 min-w-0 font-mono">
                           <div className="flex justify-between items-center mb-1">
                               <h4 className="text-hacker-text font-bold text-sm tracking-wide group-hover:text-hacker-green transition-colors">
                                 @{user.username.toUpperCase()}
                               </h4>
                               {lastMsg && (
                                   <span className="text-[9px] text-hacker-muted">{formatTime(lastMsg.timestamp)}</span>
                               )}
                           </div>
                           <p className="text-[11px] text-hacker-muted truncate font-sans group-hover:text-hacker-text/70 transition-colors">
                              {lastMsg ? lastMsg.content : <span className="text-hacker-muted/40 italic">...awaiting connection</span>}
                            </p>
                       </div>
                   </div>
               );
             })}
        </div>
    );
  };

  const renderPeopleTab = () => {
     const people = users.filter(u => u.id !== currentUser.id)
        .filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a,b) => a.username.localeCompare(b.username));
     
     return (
         <div className="flex-1 overflow-y-auto no-scrollbar bg-transparent animate-fade-in p-3 space-y-2">
             {people.map(user => (
                 <div key={user.id} onClick={() => openChat(user.id)} className="flex items-center gap-4 p-4 border border-hacker-border hover:border-hacker-green/50 cursor-pointer bg-hacker-panel/30 hover:bg-hacker-green/5 transition-all clip-tech-border">
                     <Avatar name={user.username} src={user.avatarUrl} size="md" isOnline={user.isOnline} />
                     <div className="flex-1 font-mono">
                         <h4 className="text-hacker-text font-bold text-sm tracking-widest">@{user.username.toUpperCase()}</h4>
                         <p className="text-[10px] text-hacker-muted uppercase mt-1">
                             STATUS: <span className={user.isOnline ? 'text-hacker-green' : 'text-hacker-red'}>{user.isOnline ? 'ACTIVE' : 'OFFLINE'}</span>
                         </p>
                     </div>
                     <div className="text-hacker-cyan opacity-50">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                     </div>
                 </div>
             ))}
         </div>
     );
  };

  const renderSettingsTab = () => {
      return (
          <div className="flex-1 overflow-y-auto bg-transparent animate-fade-in p-6">
              <div className="flex flex-col items-center py-8 border-b border-hacker-border/50 mb-8 relative">
                  <div className="relative">
                      <Avatar name={currentUser.username} src={currentUser.avatarUrl} size="xl" className="mb-4" />
                      <div className="absolute inset-0 rounded-full border border-hacker-green/30 animate-pulse"></div>
                  </div>
                  <h2 className="text-2xl font-bold text-hacker-green font-mono tracking-widest glitch-text" data-text={currentUser.username.toUpperCase()}>{currentUser.username.toUpperCase()}</h2>
                  <div className="flex items-center gap-2 mt-3">
                      <span className="text-[10px] bg-hacker-cyan/10 border border-hacker-cyan/30 text-hacker-cyan px-2 py-0.5">
                          {currentUser.role === UserRole.ADMIN ? 'ROOT_ACCESS' : 'OPERATIVE'}
                      </span>
                  </div>
                  <p className="text-hacker-muted text-[10px] mt-2 font-mono tracking-wider">ID: {currentUser.id}</p>
              </div>

              <div className="space-y-4">
                  {currentUser.role === UserRole.ADMIN && (
                      <button onClick={() => setShowAdminPanel(true)} className="w-full flex items-center justify-between p-4 border border-hacker-green/30 bg-hacker-green/5 hover:bg-hacker-green/10 transition-colors group clip-tech-border">
                          <div className="flex items-center gap-3">
                              <span className="text-hacker-green font-mono font-bold group-hover:shadow-[0_0_10px_#00FF41] transition-shadow tracking-widest">ACCESS_MAINFRAME</span>
                          </div>
                          <svg className="w-5 h-5 text-hacker-green" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                  )}
                  
                  <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 border border-hacker-red/30 bg-hacker-red/5 hover:bg-hacker-red/10 transition-colors group clip-tech-border">
                      <div className="flex items-center gap-3">
                          <span className="text-hacker-red font-mono font-bold tracking-widest">KILL_SESSION</span>
                      </div>
                      <svg className="w-5 h-5 text-hacker-red" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  </button>
              </div>

              <div className="mt-12 p-4 border border-hacker-border/30 bg-black/20 text-center opacity-50 font-mono text-[9px] text-hacker-muted uppercase">
                  <p>
                      Encryption: AES-256-GCM<br/>
                      Server: NODE_ASIA_01<br/>
                      Version: 3.0.1<br/>
                      Atpukur_Boys_Secure_Net
                  </p>
              </div>
          </div>
      );
  };

  const getPageTitle = () => {
      switch(activeTab) {
          case 'people': return 'ACTIVE_AGENTS';
          case 'settings': return 'SYSTEM_CONFIG';
          default: return 'COMM_LINKS';
      }
  }

  return (
    <Layout>
      {/* 
        SIDEBAR
      */}
      <div className={`
          ${mobileView === 'list' ? 'flex' : 'hidden'} 
          sm:flex flex-col w-full sm:w-[350px] bg-hacker-panel sm:border-r border-hacker-border z-20 h-full relative
      `}>
         
         {/* Navigation Bar */}
         <div className="pt-safe-top sticky top-0 bg-hacker-panel/95 backdrop-blur-xl z-30 border-b border-hacker-border shrink-0 shadow-[0_5px_15px_rgba(0,0,0,0.5)]">
            <div className="px-5 py-5 flex justify-between items-center">
                <h1 className="text-xl font-bold text-white tracking-[0.1em] font-mono glitch-text" data-text={getPageTitle()}>{getPageTitle()}</h1>
                <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-hacker-green animate-pulse"></div>
                    <div className="w-1.5 h-1.5 bg-hacker-green/30"></div>
                </div>
            </div>
            {activeTab !== 'settings' && (
                <div className="px-4 pb-4">
                    <Input 
                      variant="search"
                      placeholder="SEARCH_DATABASE..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-black/50 border-hacker-border/50"
                    />
                </div>
            )}
         </div>
             
         {/* Content Area */}
         {activeTab === 'chats' && renderChatsTab()}
         {activeTab === 'people' && renderPeopleTab()}
         {activeTab === 'settings' && renderSettingsTab()}
         
         {/* Footer (Tab Bar) */}
         <div className="bg-hacker-black border-t border-hacker-border flex justify-around items-center h-[70px] pb-safe-bottom sm:hidden shrink-0 z-50">
            <button 
                onClick={() => setActiveTab('chats')}
                className={`flex flex-col items-center gap-1.5 p-2 transition-colors ${activeTab === 'chats' ? 'text-hacker-green' : 'text-hacker-muted'}`}
            >
                <div className={`p-1.5 rounded-sm ${activeTab === 'chats' ? 'bg-hacker-green/10 border border-hacker-green/30' : ''}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                </div>
                <span className="text-[9px] font-mono uppercase tracking-wider">CHATS</span>
            </button>
            
            <button 
                onClick={() => setActiveTab('people')}
                className={`flex flex-col items-center gap-1.5 p-2 transition-colors ${activeTab === 'people' ? 'text-hacker-green' : 'text-hacker-muted'}`}
            >
                 <div className={`p-1.5 rounded-sm ${activeTab === 'people' ? 'bg-hacker-green/10 border border-hacker-green/30' : ''}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                 </div>
                <span className="text-[9px] font-mono uppercase tracking-wider">AGENTS</span>
            </button>

            <button 
                onClick={() => setActiveTab('settings')}
                className={`flex flex-col items-center gap-1.5 p-2 transition-colors ${activeTab === 'settings' ? 'text-hacker-green' : 'text-hacker-muted'}`}
            >
                 <div className={`p-1.5 rounded-sm ${activeTab === 'settings' ? 'bg-hacker-green/10 border border-hacker-green/30' : ''}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                 </div>
                <span className="text-[9px] font-mono uppercase tracking-wider">CONFIG</span>
            </button>
         </div>
      </div>

      {/* CHAT WINDOW */}
      <div className={`
          ${mobileView === 'chat' ? 'flex' : 'hidden'} 
          sm:flex flex-1 flex-col relative w-full h-full bg-black z-30
      `}>
         <ChatWindow 
            currentUser={currentUser} 
            activeChatId={activeChatId}
            onBack={() => setMobileView('list')} 
         />
      </div>

      {/* Admin Modal */}
      {showAdminPanel && (
          <AdminPanel currentUser={currentUser} onClose={() => setShowAdminPanel(false)} />
      )}
    </Layout>
  );
}

export default App;