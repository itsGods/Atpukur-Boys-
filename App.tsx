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
        <div className="flex-1 overflow-y-auto no-scrollbar bg-black animate-fade-in">
             <div className="mt-2">
                 {/* Pinned General Chat */}
                 {!searchQuery && (
                    <div 
                      onClick={() => openChat('general')}
                      className={`flex items-center gap-3 px-4 py-2 active:bg-ios-card2 transition-colors cursor-pointer group ${activeChatId === 'general' ? 'bg-white/5 sm:bg-ios-card2' : ''}`}
                    >
                        <div className="w-[52px] h-[52px] rounded-full bg-gradient-to-b from-ios-green to-[#28c840] flex items-center justify-center text-white shrink-0 shadow-md">
                            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0 py-2 border-b border-white/10 ml-1">
                            <div className="flex justify-between items-baseline mb-0.5">
                                <h4 className="text-white font-semibold text-[17px]">General Team</h4>
                                {lastGeneralMsg && (
                                    <span className="text-[14px] text-ios-gray shrink-0 font-normal">{formatTime(lastGeneralMsg.timestamp)}</span>
                                )}
                            </div>
                            <p className="text-[15px] text-ios-gray truncate leading-snug pr-2">
                                {lastGeneralMsg ? (
                                    <span className={lastGeneralMsg.senderId === currentUser.id ? 'text-white/60' : 'text-ios-gray'}>
                                        <span className="text-white">{lastGeneralMsg.senderId === currentUser.id ? 'You: ' : `${users.find(u => u.id === lastGeneralMsg.senderId)?.username}: `}</span>
                                        {lastGeneralMsg.content}
                                    </span>
                                ) : (
                                    'No messages yet'
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
                         className={`flex items-center gap-3 px-4 py-2 active:bg-ios-card2 transition-colors cursor-pointer ${activeChatId === user.id ? 'bg-white/5 sm:bg-ios-card2' : ''}`}
                       >
                           <div className="relative">
                               <Avatar name={user.username} src={user.avatarUrl} size="lg" className="ring-1 ring-white/10 rounded-full" />
                               {user.isOnline && (
                                   <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-ios-green border-2 border-black rounded-full"></div>
                               )}
                           </div>
                           
                           <div className="flex-1 min-w-0 border-b border-white/10 pb-3 pt-1 ml-1">
                               <div className="flex justify-between items-center mb-0.5">
                                   <h4 className="text-white font-semibold text-[17px]">
                                     {user.username}
                                   </h4>
                                   {lastMsg && (
                                       <span className="text-[14px] text-ios-gray">{formatTime(lastMsg.timestamp)}</span>
                                   )}
                               </div>
                               <p className="text-[15px] text-ios-gray truncate pr-4">
                                  {lastMsg ? lastMsg.content : <span className="text-ios-gray/50 italic">Start a conversation</span>}
                               </p>
                           </div>
                       </div>
                   );
                 })}
             </div>
        </div>
    );
  };

  const renderPeopleTab = () => {
     // Sort alphabetically
     const people = users.filter(u => u.id !== currentUser.id)
        .filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a,b) => a.username.localeCompare(b.username));
     
     return (
         <div className="flex-1 overflow-y-auto no-scrollbar bg-black animate-fade-in">
             <div className="px-4 py-2">
                 {people.map(user => (
                     <div key={user.id} onClick={() => openChat(user.id)} className="flex items-center gap-3 py-3 active:bg-ios-card2 transition-colors cursor-pointer border-b border-white/5">
                         <Avatar name={user.username} src={user.avatarUrl} size="md" isOnline={user.isOnline} />
                         <div className="flex-1">
                             <h4 className="text-white font-medium text-[17px]">{user.username}</h4>
                             <p className="text-[14px] text-ios-gray">{user.isOnline ? 'Online' : 'Offline'}</p>
                         </div>
                         <div className="w-8 h-8 rounded-full bg-ios-card2 flex items-center justify-center text-ios-blue">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.013 8.013 0 01-5.63-2.309l-5.66 1.134 1.13-5.656A8 8 0 012 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" /></svg>
                         </div>
                     </div>
                 ))}
             </div>
         </div>
     );
  };

  const renderSettingsTab = () => {
      return (
          <div className="flex-1 overflow-y-auto bg-black animate-fade-in p-4">
              <div className="flex flex-col items-center py-8">
                  <Avatar name={currentUser.username} src={currentUser.avatarUrl} size="xl" className="mb-4" />
                  <h2 className="text-2xl font-bold text-white">{currentUser.username}</h2>
                  <p className="text-ios-gray font-medium">{currentUser.role === UserRole.ADMIN ? 'Administrator' : 'Team Member'}</p>
                  <p className="text-ios-gray/50 text-xs mt-1 font-mono">{currentUser.id}</p>
              </div>

              <div className="space-y-6">
                  <div className="bg-[#1C1C1E] rounded-xl overflow-hidden divide-y divide-white/5">
                      {currentUser.role === UserRole.ADMIN && (
                          <button onClick={() => setShowAdminPanel(true)} className="w-full flex items-center justify-between p-4 active:bg-white/10 transition-colors">
                              <div className="flex items-center gap-3">
                                  <div className="w-7 h-7 rounded-md bg-ios-blue flex items-center justify-center text-white">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                  </div>
                                  <span className="text-white font-medium">Admin Dashboard</span>
                              </div>
                              <svg className="w-4 h-4 text-ios-gray/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                          </button>
                      )}
                      
                      <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 active:bg-white/10 transition-colors">
                          <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-md bg-ios-red flex items-center justify-center text-white">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                              </div>
                              <span className="text-white font-medium">Log Out</span>
                          </div>
                      </button>
                  </div>

                  <p className="text-center text-ios-gray/30 text-xs">
                      PrivaTeam v1.0.2<br/>
                      Secure End-to-End Environment
                  </p>
              </div>
          </div>
      );
  };

  const getPageTitle = () => {
      switch(activeTab) {
          case 'people': return 'People';
          case 'settings': return 'Settings';
          default: return 'Chats';
      }
  }

  return (
    <Layout>
      {/* 
        SIDEBAR / MOBILE TAB VIEW
      */}
      <div className={`
          ${mobileView === 'list' ? 'flex' : 'hidden'} 
          sm:flex flex-col w-full sm:w-[380px] bg-black sm:border-r border-ios-separator z-20 h-full relative
      `}>
         
         {/* Navigation Bar */}
         <div className="pt-safe-top sticky top-0 bg-black/80 backdrop-blur-xl z-30 border-b border-ios-separator/50 shrink-0">
            <div className="flex justify-between items-center px-4 h-[44px]">
                <div />
                
                {/* On desktop, show logout if not in settings tab */}
                <div className="sm:block hidden">
                   {activeTab !== 'settings' && (
                       <Button variant="ghost" onClick={handleLogout} className="text-ios-blue text-[17px] -mr-4 font-normal active:opacity-50">
                           Logout
                       </Button>
                   )}
                </div>
            </div>
            <div className="px-4 pb-2">
                <h1 className="text-[34px] font-bold text-white tracking-tight transition-all duration-300">{getPageTitle()}</h1>
            </div>
            {activeTab !== 'settings' && (
                <div className="px-4 pb-3">
                    <Input 
                      variant="search"
                      placeholder="Search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            )}
         </div>
             
         {/* Content Area */}
         {activeTab === 'chats' && renderChatsTab()}
         {activeTab === 'people' && renderPeopleTab()}
         {activeTab === 'settings' && renderSettingsTab()}
         
         {/* iOS Footer (Tab Bar) */}
         <div className="glass-morphism border-t border-white/10 flex justify-around items-start pt-2 pb-safe-bottom sm:hidden shrink-0 z-50">
            <button 
                onClick={() => setActiveTab('chats')}
                className={`flex flex-col items-center gap-1 w-16 ${activeTab === 'chats' ? 'text-ios-blue' : 'text-ios-gray/50'}`}
            >
                <svg className="w-[26px] h-[26px]" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                <span className="text-[10px] font-medium mt-0.5">Chats</span>
            </button>
            
            <button 
                onClick={() => setActiveTab('people')}
                className={`flex flex-col items-center gap-1 w-16 ${activeTab === 'people' ? 'text-ios-blue' : 'text-ios-gray/50'}`}
            >
                <svg className="w-[28px] h-[28px]" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                <span className="text-[10px] font-medium mt-0.5">People</span>
            </button>

            <button 
                onClick={() => setActiveTab('settings')}
                className={`flex flex-col items-center gap-1 w-16 ${activeTab === 'settings' ? 'text-ios-blue' : 'text-ios-gray/50'}`}
            >
                <svg className="w-[26px] h-[26px]" fill="currentColor" viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.488.488 0 00-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.21.08.47 0 .59-.22l1.92-3.32a.49.49 0 00-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
                <span className="text-[10px] font-medium mt-0.5">Settings</span>
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