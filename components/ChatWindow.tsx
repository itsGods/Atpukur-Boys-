import React, { useState, useEffect, useRef } from 'react';
import { Message, User, UserRole, MessageStatus } from '../types';
import { mockService } from '../services/storage';
import { geminiService } from '../services/geminiService';
import { Button } from './ui/Button';
import { Avatar } from './ui/Avatar';

interface ChatWindowProps {
  currentUser: User;
  activeChatId: string; // 'general' or userId
  onBack?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ currentUser, activeChatId, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  useEffect(() => {
    const fetchData = () => {
      setMessages(mockService.getMessages());
      setUsers(mockService.getUsers());
    };
    fetchData();
    const unsubscribe = mockService.subscribe(fetchData);
    const interval = setInterval(fetchData, 3000);
    return () => { unsubscribe(); clearInterval(interval); };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages, activeChatId]); // Scroll when messages change OR chat changes

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    try {
      await mockService.sendMessage({
        senderId: currentUser.id,
        receiverId: activeChatId === 'general' ? undefined : activeChatId,
        content: inputText.trim(),
        status: MessageStatus.SENT,
        isSystem: false,
      });
      setInputText('');
    } catch (err) { console.error(err); }
  };

  const handleSummarize = async () => {
    setIsSummarizing(true);
    const summary = await geminiService.summarizeChat(getFilteredMessages());
    await mockService.sendMessage({
      senderId: 'system-ai',
      receiverId: activeChatId === 'general' ? undefined : activeChatId,
      content: `📝 **Team AI Summary**:\n\n${summary}`,
      isSystem: true,
      status: MessageStatus.SENT
    });
    setIsSummarizing(false);
  };

  const formatTime = (ts: number) => {
    if (!ts || isNaN(ts)) return '';
    return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const getSender = (id: string) => users.find(u => u.id === id);

  // Filter messages based on active context
  const getFilteredMessages = () => {
      return messages.filter(msg => {
          if (activeChatId === 'general') {
              // Show messages that have NO receiver OR receiver is explicitly 'general'
              return !msg.receiverId || msg.receiverId === 'general';
          } else {
              // DM Logic: Show messages between Current User AND Active Chat User
              const isMyMsg = msg.senderId === currentUser.id && msg.receiverId === activeChatId;
              const isTheirMsg = msg.senderId === activeChatId && msg.receiverId === currentUser.id;
              return isMyMsg || isTheirMsg;
          }
      });
  };

  const filteredMessages = getFilteredMessages();

  // Header Logic
  const isGeneral = activeChatId === 'general';
  const chatPartner = users.find(u => u.id === activeChatId);
  const title = isGeneral ? 'General Team' : chatPartner?.username || 'Unknown';
  const onlineCount = isGeneral ? users.filter(u => u.isOnline).length : (chatPartner?.isOnline ? 1 : 0);
  const subtitle = isGeneral ? `${onlineCount} members online` : (chatPartner?.isOnline ? 'Online' : 'Offline');

  return (
    <div className="flex flex-col h-full bg-black relative w-full">
      
      {/* iOS HEADER - Glassmorphic with Safe Area */}
      <div className="absolute top-0 left-0 right-0 glass-morphism border-b border-white/10 z-30 pt-safe-top">
        <div className="h-[44px] flex items-center justify-between px-2">
            {/* Back Button */}
            <Button variant="ghost" onClick={onBack} className="sm:hidden pl-2 pr-4 text-ios-blue flex items-center gap-1 active:opacity-50 transition-opacity hover:bg-transparent">
                <svg width="12" height="20" viewBox="0 0 12 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10.5 1.5L2 10L10.5 18.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-[17px] font-normal -mt-0.5">Chats</span>
            </Button>
            
            {/* Center Title */}
            <div className="flex flex-col items-center justify-center absolute left-1/2 -translate-x-1/2 w-48 pointer-events-none">
                <div className="flex items-center gap-2">
                    {/* Icon/Avatar */}
                    {isGeneral ? (
                        <div className="w-5 h-5 rounded-full bg-ios-green flex items-center justify-center shadow-sm">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        </div>
                    ) : (
                         <div className="w-5 h-5 rounded-full overflow-hidden">
                             <Avatar name={chatPartner?.username || '?'} src={chatPartner?.avatarUrl} size="sm" className="w-full h-full" />
                         </div>
                    )}
                    <span className="text-[17px] font-semibold text-white tracking-tight truncate max-w-[120px]">{title}</span>
                </div>
                <span className="text-[11px] text-ios-gray font-medium tracking-wide">
                    {subtitle}
                </span>
            </div>

            {/* Right Action */}
            <div className="pr-2">
                {process.env.API_KEY && (
                    <Button variant="icon" onClick={handleSummarize} isLoading={isSummarizing} className="text-ios-blue">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                    </Button>
                )}
            </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto pt-[calc(env(safe-area-inset-top)+45px)] pb-[calc(env(safe-area-inset-bottom)+60px)] px-4 bg-black no-scrollbar w-full">
        <div className="py-4 space-y-1">
        {filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center pt-20 text-ios-gray opacity-50 space-y-2">
                <span className="text-4xl">💬</span>
                <span className="text-sm">No messages yet</span>
            </div>
        ) : filteredMessages.map((msg, idx) => {
          const isMe = msg.senderId === currentUser.id;
          const sender = getSender(msg.senderId);
          const isSystem = msg.isSystem || msg.senderId === 'system' || msg.senderId === 'system-ai';
          const isConsecutive = idx > 0 && filteredMessages[idx - 1].senderId === msg.senderId && (msg.timestamp - filteredMessages[idx - 1].timestamp < 60000);

          if (isSystem) {
             return (
                 <div key={msg.id} className="flex justify-center my-6">
                     <span className="text-[11px] font-medium text-ios-gray/80 text-center bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                        {msg.content}
                     </span>
                 </div>
             )
          }

          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${isConsecutive ? 'mt-[2px]' : 'mt-3'}`}>
              {!isMe && !isConsecutive && isGeneral && (
                  <span className="text-[11px] text-ios-gray/60 ml-3 mb-1 font-medium">{sender?.username}</span>
              )}
              
              <div className={`
                 max-w-[75%] px-[12px] py-[8px] text-[16px] leading-[1.35] relative group shadow-sm
                 ${isMe 
                    ? 'bg-gradient-to-br from-ios-green to-[#28c840] text-white rounded-[18px] rounded-tr-[4px]' 
                    : 'bg-[#262628] text-white rounded-[18px] rounded-tl-[4px]'
                 }
              `}>
                <p className="break-words font-normal tracking-wide">{msg.content}</p>
                
                {/* Meta Data */}
                <div className={`flex items-center justify-end gap-1 mt-0.5 select-none ${isMe ? 'opacity-80' : 'opacity-40'}`}>
                    <span className={`text-[10px] ${isMe ? 'text-white' : 'text-ios-gray'}`}>
                        {formatTime(msg.timestamp)}
                    </span>
                    {isMe && (
                       <div className="w-3 h-3 flex items-center">
                           {msg.status === MessageStatus.READ ? (
                               // Double Check (Blue/White)
                               <svg viewBox="0 0 16 11" fill="none" className="w-full h-full text-white">
                                    <path d="M1 6L4.5 9.5L11.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M5 6L8.5 9.5L15.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                               </svg>
                           ) : (
                               // Single Check
                               <svg viewBox="0 0 16 11" fill="none" className="w-full h-full text-white/70">
                                   <path d="M1.5 6L5 9.5L14 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                               </svg>
                           )}
                       </div>
                    )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
        </div>
      </div>

      {/* iOS INPUT BAR - Glassmorphic with Safe Area Bottom */}
      <div className="absolute bottom-0 w-full glass-morphism border-t border-white/10 pb-safe-bottom z-40">
        <form onSubmit={handleSendMessage} className="flex items-end gap-3 px-3 py-2">
            
            {/* Plus Button */}
            <Button variant="ghost" type="button" className="p-0 w-[30px] h-[36px] text-ios-blue hover:bg-transparent active:opacity-50 shrink-0 mb-[2px]">
               <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                   <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
               </svg>
            </Button>
            
            {/* Pill Input */}
            <div className="flex-1 bg-[#1C1C1E] border border-[#3A3A3C] rounded-full min-h-[36px] flex items-center px-4 py-1.5 focus-within:border-ios-gray/50 transition-colors">
                <input 
                    className="flex-1 bg-transparent text-white placeholder-[#8E8E93] focus:outline-none text-[16px] leading-5 max-h-24 py-1"
                    placeholder="iMessage"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                />
            </div>

            {/* Send Button - Animated */}
            {inputText.trim() ? (
                <Button type="submit" className="w-[34px] h-[34px] rounded-full bg-ios-blue text-white flex items-center justify-center shadow-lg active:scale-95 transition-all mb-[2px]">
                    <svg className="w-5 h-5 ml-0.5 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                </Button>
            ) : (
                <Button type="button" className="w-[30px] h-[36px] text-ios-blue/40 flex items-center justify-center mb-[2px]">
                   <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                   </svg>
                </Button>
            )}
        </form>
      </div>
    </div>
  );
};