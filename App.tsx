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
  const [activeChatId, setActiveChatId] = useState<string>('general'); // 'general' or userId
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

  // Sorting and Filtering
  const filteredUsers = users
    .filter(u => u.id !== currentUser.id)
    .filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()));

  filteredUsers.sort((a, b) => {
    if (a.isOnline === b.isOnline) return a.username.localeCompare(b.username);
    return a.isOnline ? -1 : 1;
  });

  const getLastMessage = (userId: string) => {
      // Find last message exchanged between current user and this specific user
      const dmMsgs = messages.filter(m => 
        (m.senderId === currentUser.id && m.receiverId === userId) ||
        (m.senderId === userId && m.receiverId === currentUser.id)
      );
      if (dmMsgs.length === 0) return null;
      return dmMsgs[dmMsgs.length - 1];
  };

  const getLastGeneralMessage = () => {
      // General messages have no receiverId or it is 'general'
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

  return (
    <Layout>
      {/* 
        SIDEBAR / CHAT LIST
        Mobile: Full width, hidden when chat is open.
        Desktop: Fixed width sidebar.
      */}
      <div className={`
          ${mobileView === 'list' ? 'flex' : 'hidden'} 
          sm:flex flex-col w-full sm:w-[380px] bg-black sm:border-r border-ios-separator z-20 h-full relative
      `}>
         
         {/* Navigation Bar (Large Title mimic) */}
         <div className="pt-safe-top sticky top-0 bg-black/80 backdrop-blur-xl z-30 border-b border-ios-separator/50">
            <div className="flex justify-between items-center px-4 h-[44px]">
                <Button variant="ghost" onClick={() => setShowAdminPanel(true)} className="text-ios-blue text-[17px] -ml-4 font-normal active:opacity-50">
                    {currentUser.role === UserRole.ADMIN ? 'Admin' : 'Edit'}
                </Button>
                <Button variant="ghost" onClick={handleLogout} className="text-ios-blue text-[17px] -mr-4 font-normal active:opacity-50">
                    Logout
                </Button>
            </div>
            <div className="px-4 pb-2">
                <h1 className="text-[34px] font-bold text-white tracking-tight">Chats</h1>
            </div>
            <div className="px-4 pb-3">
                <Input 
                  variant="search"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
         </div>
             
         {/* Chat List Content */}
         <div className="flex-1 overflow-y-auto no-scrollbar bg-black">
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

                 {/* Team Header */}
                 <div className="px-4 py-2 mt-2 bg-ios-card2/30 sticky top-0 backdrop-blur-md z-10 border-b border-white/5">
                     <span className="text-[13px] font-semibold text-ios-gray uppercase tracking-wide">People</span>
                 </div>

                 {filteredUsers.map(user => {
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
                                  {lastMsg ? lastMsg.content : (user.isOnline ? 'Online' : 'Offline')}
                               </p>
                           </div>
                       </div>
                   );
                 })}
             </div>
         </div>
         
         {/* Bottom Tab Bar (Visual Only) */}
         <div className="glass-morphism border-t border-white/10 flex justify-around items-start pt-2 pb-safe-bottom sm:hidden">
            <div className="flex flex-col items-center gap-1 opacity-100 text-ios-blue">
                <svg className="w-[26px] h-[26px]" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                <span className="text-[10px] font-medium mt-0.5">Chats</span>
            </div>
            <div className="flex flex-col items-center gap-1 opacity-40 text-ios-gray">
                <svg className="w-[26px] h-[26px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                <span className="text-[10px] font-medium mt-0.5">People</span>
            </div>
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