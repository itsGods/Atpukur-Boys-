import React, { useState, useEffect } from 'react';
import { User, UserRole, Message, MessageStatus } from './types';
import { mockService } from './services/storage';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { ChatWindow } from './components/ChatWindow';
import { Avatar } from './components/ui/Avatar';
import { AdminPanel } from './components/AdminPanel';
import { Input } from './components/ui/Input';
import { Button } from './components/ui/Button';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  
  // Navigation State
  const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar');
  const [activeChatId, setActiveChatId] = useState<string>('general');
  const [activeTab, setActiveTab] = useState<'chats' | 'people' | 'settings'>('chats');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Password Change State
  const [newPassword, setNewPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    const update = () => {
      setUsers(mockService.getUsers());
      setMessages(mockService.getMessages());
    };
    update();
    return mockService.subscribe(update);
  }, []);

  const handleLogout = () => {
    if (currentUser) mockService.logout(currentUser.id);
    setCurrentUser(null);
  };

  const handleChatSelect = (id: string) => {
      setActiveChatId(id);
      setMobileView('chat');
  };
  
  const handleChangePassword = async () => {
      if(!newPassword || !currentUser) return;
      await mockService.changePassword(currentUser.id, newPassword);
      setPasswordSuccess('Password updated successfully');
      setNewPassword('');
      setTimeout(() => setPasswordSuccess(''), 3000);
  };

  if (!currentUser) return <Login onLogin={setCurrentUser} />;

  // Derived Data
  const getLastMsg = (uid: string) => {
      const msgs = messages.filter(m => (m.senderId === currentUser.id && m.receiverId === uid) || (m.senderId === uid && m.receiverId === currentUser.id));
      return msgs[msgs.length - 1];
  };
  
  const getUnread = (uid: string) => messages.filter(m => m.senderId === uid && m.receiverId === currentUser.id && m.status !== MessageStatus.READ).length;
  const lastGeneralMsg = messages.filter(m => !m.receiverId || m.receiverId === 'general').pop();

  const sortedUsers = users.filter(u => u.id !== currentUser.id)
    .filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a,b) => {
        const tA = getLastMsg(a.id)?.timestamp || 0;
        const tB = getLastMsg(b.id)?.timestamp || 0;
        return tB - tA;
    });

  // --- Render Components ---

  const renderChatsTab = () => (
      <div className="flex-1 overflow-y-auto pb-safe-bottom">
          <div className="px-4 pb-2 text-xs font-semibold text-ios-gray uppercase tracking-wider mt-4">Channels</div>
          {/* General Chat */}
          <div 
             onClick={() => handleChatSelect('general')}
             className={`mx-2 p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all ${activeChatId === 'general' ? 'bg-ios-blue text-white shadow-lg shadow-ios-blue/20' : 'hover:bg-white/5 text-ios-subtext'}`}
          >
              <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center ${activeChatId === 'general' ? 'bg-white/20' : 'bg-ios-card2 border border-white/5'}`}>
                  <span className="font-bold text-lg">#</span>
              </div>
              <div className="flex-1 min-w-0 border-b border-white/5 pb-3">
                  <div className="flex justify-between items-baseline mb-0.5">
                      <span className="font-semibold text-[15px]">General</span>
                      {lastGeneralMsg && <span className="text-[11px] opacity-70">{new Date(lastGeneralMsg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>}
                  </div>
                  <p className="text-[13px] truncate opacity-70">
                      {lastGeneralMsg ? (
                        <span>
                            <span className="text-white">{users.find(u => u.id === lastGeneralMsg.senderId)?.username}: </span>
                            {lastGeneralMsg.content}
                        </span>
                      ) : 'No messages'}
                  </p>
              </div>
          </div>

          <div className="px-4 pb-2 text-xs font-semibold text-ios-gray uppercase tracking-wider mt-6">Direct Messages</div>
          {sortedUsers.map(user => {
              const last = getLastMsg(user.id);
              const unread = getUnread(user.id);
              const isActive = activeChatId === user.id;

              return (
                  <div 
                    key={user.id} 
                    onClick={() => handleChatSelect(user.id)}
                    className={`mx-2 p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all ${isActive ? 'bg-ios-blue text-white shadow-lg shadow-ios-blue/20' : 'hover:bg-white/5 text-ios-subtext'}`}
                  >
                      <div className="relative shrink-0">
                          <Avatar name={user.username} size="md" isOnline={user.isOnline} />
                          {unread > 0 && <span className="absolute -top-1 -right-1 bg-ios-blue text-white text-[10px] font-bold px-1.5 rounded-full ring-2 ring-black">{unread}</span>}
                      </div>
                      <div className="flex-1 min-w-0 border-b border-white/5 pb-3">
                          <div className="flex justify-between items-baseline mb-0.5">
                              <span className="font-semibold text-[15px] capitalize">{user.username}</span>
                              {last && <span className="text-[11px] opacity-70">{new Date(last.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>}
                          </div>
                          <p className={`text-[13px] truncate ${unread > 0 ? 'font-medium text-white' : 'opacity-70'}`}>
                              {last ? last.content : 'Start a conversation'}
                          </p>
                      </div>
                  </div>
              );
          })}
      </div>
  );

  const renderPeopleTab = () => (
      <div className="flex-1 overflow-y-auto p-2 pb-safe-bottom">
          {users.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase())).map(user => (
              <div key={user.id} onClick={() => handleChatSelect(user.id)} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5">
                  <Avatar name={user.username} size="md" isOnline={user.isOnline} />
                  <div className="flex-1">
                      <h4 className="font-semibold text-white capitalize text-[15px]">{user.username}</h4>
                      <p className="text-[13px] text-ios-subtext flex items-center gap-1.5 mt-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${user.isOnline ? 'bg-ios-green' : 'bg-ios-gray'}`}></span>
                          {user.isOnline ? 'Online' : 'Offline'}
                      </p>
                  </div>
                  <div className="text-ios-blue">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  </div>
              </div>
          ))}
      </div>
  );

  const renderSettingsTab = () => (
      <div className="flex-1 overflow-y-auto p-4 pb-safe-bottom">
          <div className="flex flex-col items-center py-6 border-b border-ios-separator/50 mb-6">
              <Avatar name={currentUser.username} size="xl" className="mb-4 shadow-2xl" />
              <h2 className="text-xl font-bold text-white capitalize">{currentUser.username}</h2>
              <span className="text-xs text-ios-blue bg-ios-blue/10 px-2 py-0.5 rounded-full mt-2 font-medium">
                  {currentUser.role}
              </span>
          </div>

          <div className="space-y-4 max-w-sm mx-auto">
              {currentUser.role === UserRole.ADMIN && (
                  <button onClick={() => setShowAdminPanel(true)} className="w-full flex items-center justify-between p-4 bg-ios-card2/50 hover:bg-ios-card2 rounded-xl transition-all group border border-white/5">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-ios-blue/20 rounded-lg text-ios-blue">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          </div>
                          <span className="font-semibold text-white">Admin Console</span>
                      </div>
                      <svg className="w-5 h-5 text-ios-gray group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
              )}
              
              <div className="bg-ios-card2/30 rounded-xl p-4 border border-white/5">
                  <h3 className="text-sm font-medium text-ios-subtext mb-3">Security</h3>
                  <div className="space-y-3">
                      <Input 
                        type="password"
                        placeholder="New Password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="bg-black/20"
                      />
                      <Button variant="secondary" onClick={handleChangePassword} disabled={!newPassword} className="w-full text-sm py-2">
                          Update Password
                      </Button>
                      {passwordSuccess && <p className="text-xs text-ios-green text-center font-medium">{passwordSuccess}</p>}
                  </div>
              </div>

              <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 bg-ios-red/10 hover:bg-ios-red/20 rounded-xl transition-all group border border-ios-red/10">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-ios-red/20 rounded-lg text-ios-red">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                      </div>
                      <span className="font-semibold text-ios-red">Sign Out</span>
                  </div>
              </button>
          </div>
      </div>
  );

  const getPageTitle = () => {
      switch(activeTab) {
          case 'people': return 'Team';
          case 'settings': return 'Settings';
          default: return 'Chats';
      }
  }

  const Sidebar = () => (
      <div className="flex flex-col h-full bg-ios-card2/30 backdrop-blur-xl border-r border-ios-separator/50 w-full sm:w-[350px] shrink-0">
          {/* Top Bar */}
          <div className="h-[60px] flex items-center justify-between px-4 border-b border-ios-separator/50 shrink-0 bg-ios-card/50">
              <h1 className="text-xl font-bold text-white tracking-tight">{getPageTitle()}</h1>
              {activeTab === 'chats' && (
                  <button onClick={() => setShowAdminPanel(true)} className="p-2 text-ios-blue hover:bg-ios-blue/10 rounded-full">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </button>
              )}
          </div>

          {/* Search (Only on Chats/People) */}
          {activeTab !== 'settings' && (
             <div className="px-4 py-3 shrink-0">
                  <div className="relative">
                      <svg className="absolute left-3 top-2.5 w-4 h-4 text-ios-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      <input 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search"
                        className="w-full bg-ios-card/80 border border-white/5 rounded-lg pl-9 pr-4 py-1.5 text-[15px] text-white placeholder-ios-gray focus:outline-none focus:ring-1 focus:ring-ios-blue/50"
                      />
                  </div>
              </div>
          )}

          {/* Content Area */}
          {activeTab === 'chats' && renderChatsTab()}
          {activeTab === 'people' && renderPeopleTab()}
          {activeTab === 'settings' && renderSettingsTab()}

          {/* Mobile Tab Bar */}
          <div className="bg-ios-card/90 backdrop-blur-xl border-t border-ios-separator/50 flex justify-around items-center h-[85px] pb-safe-bottom sm:hidden shrink-0 z-50 fixed bottom-0 w-full left-0">
            <button 
                onClick={() => setActiveTab('chats')}
                className={`flex flex-col items-center gap-1 p-2 w-16 ${activeTab === 'chats' ? 'text-ios-blue' : 'text-ios-gray'}`}
            >
                <svg className="w-6 h-6" fill={activeTab === 'chats' ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                <span className="text-[10px] font-medium">Chats</span>
            </button>
            
            <button 
                onClick={() => setActiveTab('people')}
                className={`flex flex-col items-center gap-1 p-2 w-16 ${activeTab === 'people' ? 'text-ios-blue' : 'text-ios-gray'}`}
            >
                 <svg className="w-6 h-6" fill={activeTab === 'people' ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                <span className="text-[10px] font-medium">Team</span>
            </button>

            <button 
                onClick={() => setActiveTab('settings')}
                className={`flex flex-col items-center gap-1 p-2 w-16 ${activeTab === 'settings' ? 'text-ios-blue' : 'text-ios-gray'}`}
            >
                 <svg className="w-6 h-6" fill={activeTab === 'settings' ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span className="text-[10px] font-medium">Config</span>
            </button>
         </div>
      </div>
  );

  return (
    <Layout>
      {/* Mobile: Sidebar is visible if view is 'sidebar', else hidden */}
      <div className={`${mobileView === 'sidebar' ? 'block' : 'hidden'} sm:block w-full sm:w-auto h-full`}>
          <Sidebar />
      </div>

      {/* Mobile: Chat is visible if view is 'chat', else hidden */}
      {/* Desktop: Always visible */}
      <div className={`${mobileView === 'chat' ? 'block' : 'hidden'} sm:block flex-1 h-full bg-black relative`}>
          <ChatWindow 
            currentUser={currentUser} 
            activeChatId={activeChatId} 
            onBack={() => setMobileView('sidebar')}
          />
      </div>

      {showAdminPanel && <AdminPanel currentUser={currentUser} onClose={() => setShowAdminPanel(false)} />}
    </Layout>
  );
}

export default App;