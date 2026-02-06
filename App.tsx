import React, { useState, useEffect } from 'react';
import { User, UserRole, Message } from './types';
import { mockService } from './services/storage';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { ChatWindow } from './components/ChatWindow';
import { Avatar } from './components/ui/Avatar';
import { Button } from './components/ui/Button';
import { AdminPanel } from './components/AdminPanel';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  
  // Mobile Navigation State: 'list' (Sidebar) or 'chat' (ChatWindow)
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
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

  const openChat = () => {
    setMobileView('chat');
  };

  const backToList = () => {
    setMobileView('list');
  };

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} />;
  }

  // Filter users based on search
  const filteredUsers = users
    .filter(u => u.id !== currentUser.id) // Exclude self
    .filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()));

  // Sort: Online first, then alphabetical
  filteredUsers.sort((a, b) => {
    if (a.isOnline === b.isOnline) return a.username.localeCompare(b.username);
    return a.isOnline ? -1 : 1;
  });

  const getLastMessage = (userId: string) => {
      const userMsgs = messages.filter(m => m.senderId === userId && !m.isSystem);
      if (userMsgs.length === 0) return null;
      return userMsgs[userMsgs.length - 1];
  };

  const getLastGeneralMessage = () => {
      if (messages.length === 0) return null;
      return messages[messages.length - 1];
  };

  const lastGeneralMsg = getLastGeneralMessage();
  const formatTime = (ts: number) => {
     try {
         const date = new Date(ts);
         // If today, show time, else show date
         if (new Date().toDateString() === date.toDateString()) {
             return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
         }
         return date.toLocaleDateString();
     } catch (e) {
         return '';
     }
  };

  return (
    <Layout>
      {/* Sidebar - Chat List Style */}
      {/* On Mobile: Hidden if mobileView is 'chat'. Always Flex on SM+ */}
      <div className={`
          ${mobileView === 'list' ? 'flex' : 'hidden'} 
          sm:flex flex-col w-full sm:w-96 border-r border-white/5 bg-brand-panel z-20 h-full
      `}>
         {/* Sidebar Header */}
         <div className="p-3 sm:p-4 bg-brand-panel border-b border-white/5 flex justify-between items-center shrink-0 h-16">
            <div className="flex items-center gap-3">
               <Avatar name={currentUser.username} src={currentUser.avatarUrl} isOnline={true} />
               <div className="overflow-hidden">
                  <h3 className="text-white text-sm font-medium truncate">{currentUser.username}</h3>
                  <span className="text-xs text-brand-500 font-medium block">{currentUser.role}</span>
               </div>
            </div>
            <div className="flex gap-2">
               {currentUser.role === UserRole.ADMIN && (
                 <Button variant="ghost" onClick={() => setShowAdminPanel(true)} className="p-2 text-gray-400 hover:text-brand-500 transition-colors" title="Admin Panel">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                 </Button>
               )}
               <Button variant="ghost" onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-400 transition-colors" title="Logout">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
               </Button>
            </div>
         </div>

         {/* Search */}
         <div className="p-2 sm:p-3 bg-brand-panel shrink-0">
             <div className="relative">
                <input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-brand-darker rounded-lg pl-10 pr-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50 transition-all border border-transparent focus:border-brand-500/30" 
                  placeholder="Search chats..." 
                />
                <div className="absolute left-3 top-2.5">
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
             </div>
         </div>
             
         {/* Chat List */}
         <div className="flex-1 overflow-y-auto custom-scrollbar">
             
             {/* General Team Pinned Chat */}
             {!searchQuery && (
                 <>
                    <div className="px-3 pt-2">
                        <div 
                          onClick={openChat}
                          className="flex items-center gap-3 p-3 bg-brand-darker/50 rounded-lg cursor-pointer border-l-4 border-brand-500 transition-colors hover:bg-brand-darker"
                        >
                            <div className="w-12 h-12 rounded-full bg-brand-500 flex items-center justify-center text-white shrink-0">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <div className="flex-1 min-w-0 overflow-hidden">
                                <div className="flex justify-between items-baseline mb-0.5">
                                    <h4 className="text-white font-medium text-base truncate">General Team</h4>
                                    {lastGeneralMsg && (
                                        <span className="text-[10px] text-gray-400 shrink-0">{formatTime(lastGeneralMsg.timestamp)}</span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-400 truncate">
                                    {lastGeneralMsg ? (
                                        <span className="flex items-center gap-1">
                                            {lastGeneralMsg.senderId === currentUser.id && (
                                                <svg className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 16 11" fill="none">
                                                   <path d="M1 6L4.5 9.5L11.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                   <path d="M5 6L8.5 9.5L15.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            )}
                                            {lastGeneralMsg.senderId === currentUser.id ? 'You: ' : `${users.find(u => u.id === lastGeneralMsg.senderId)?.username}: `} 
                                            {lastGeneralMsg.content}
                                        </span>
                                    ) : (
                                        <span className="italic text-gray-500">No messages yet</span>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="px-4 py-3 flex items-center gap-2">
                        <span className="text-xs text-brand-500 font-bold uppercase tracking-wider">Team Members</span>
                        <div className="h-px bg-white/5 flex-1"/>
                    </div>
                 </>
             )}

             <div className="px-2 space-y-0.5 pb-4">
               {filteredUsers.length === 0 ? (
                 <div className="text-center py-4 text-gray-500 text-xs italic">
                   No other members found
                 </div>
               ) : (
                 filteredUsers.map(user => {
                   const lastMsg = getLastMessage(user.id);
                   return (
                       <div 
                         key={user.id} 
                         onClick={openChat} 
                         className="p-3 rounded-lg flex items-center gap-3 hover:bg-white/5 transition-colors cursor-pointer group"
                       >
                           <div className="relative">
                               <Avatar name={user.username} src={user.avatarUrl} size="lg" />
                               {user.isOnline && (
                                   <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-brand-panel rounded-full"></div>
                               )}
                           </div>
                           
                           <div className="flex-1 min-w-0 border-b border-white/5 pb-3 group-hover:border-transparent">
                               <div className="flex justify-between items-center mb-0.5">
                                   <h4 className="text-gray-200 font-medium text-sm flex items-center gap-1.5">
                                     {user.username}
                                     {user.role === UserRole.ADMIN && (
                                       <span className="bg-brand-500/20 text-brand-500 text-[9px] px-1.5 py-0.5 rounded font-bold">ADMIN</span>
                                     )}
                                   </h4>
                                   {lastMsg && (
                                       <span className="text-[10px] text-gray-500">{formatTime(lastMsg.timestamp)}</span>
                                   )}
                               </div>
                               <p className="text-xs text-gray-400 truncate pr-2">
                                  {lastMsg ? lastMsg.content : (user.isOnline ? 'Online' : 'Offline')}
                               </p>
                           </div>
                       </div>
                   );
                 })
               )}
             </div>
         </div>
      </div>

      {/* Main Chat Area */}
      {/* On Mobile: Hidden if mobileView is 'list'. Always Flex on SM+ */}
      <div className={`
          ${mobileView === 'chat' ? 'flex' : 'hidden'} 
          sm:flex flex-1 flex-col relative w-full h-full bg-[#0b141a]
      `}>
         <ChatWindow currentUser={currentUser} onBack={backToList} />
      </div>

      {/* Admin Modal */}
      {showAdminPanel && (
          <AdminPanel currentUser={currentUser} onClose={() => setShowAdminPanel(false)} />
      )}
    </Layout>
  );
}

export default App;