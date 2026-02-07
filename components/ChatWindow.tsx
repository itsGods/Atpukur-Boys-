import React, { useState, useEffect, useRef } from 'react';
import { Message, User, MessageStatus } from '../types';
import { mockService } from '../services/storage';
import { Avatar } from './ui/Avatar';

interface ChatWindowProps {
  currentUser: User;
  activeChatId: string; // 'general' or userId
  onBack?: () => void;
  onChatSelect?: (userId: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ currentUser, activeChatId, onBack, onChatSelect }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    if (activeChatId !== 'general') {
        mockService.markMessagesAsRead(activeChatId, currentUser.id);
    }
  }, [messages, activeChatId, currentUser.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages, activeChatId]); 

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

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const filteredMessages = messages.filter(msg => {
      if (activeChatId === 'general') {
          return !msg.receiverId || msg.receiverId === 'general';
      } else {
          return (msg.senderId === currentUser.id && msg.receiverId === activeChatId) ||
                 (msg.senderId === activeChatId && msg.receiverId === currentUser.id);
      }
  });

  const isGeneral = activeChatId === 'general';
  const chatPartner = users.find(u => u.id === activeChatId);
  const title = isGeneral ? 'General Chat' : (chatPartner?.username || 'Unknown User').toUpperCase();

  return (
    <div className="flex flex-col h-full bg-black relative w-full font-mono">
      {/* Matrix Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(0deg,rgba(0,255,65,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,65,0.1)_1px,transparent_1px)] bg-[size:20px_20px]"></div>

      {/* Chat Header */}
      <div className="h-16 border-b border-hacker-border bg-hacker-panel/90 flex items-center justify-between px-4 py-2 shrink-0 z-10 relative">
          <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-hacker-green to-transparent opacity-50"></div>
          
          <div className="flex items-center gap-4">
              <button onClick={onBack} className="sm:hidden p-2 -ml-2 text-hacker-green hover:bg-hacker-green/10 border border-transparent hover:border-hacker-green/30 transition-all">
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              
              <div className="flex items-center gap-4">
                  <div className="relative">
                     <Avatar name={title} src={isGeneral ? undefined : chatPartner?.avatarUrl} isOnline={isGeneral ? undefined : chatPartner?.isOnline} className="border border-hacker-green/30" />
                     {/* Decorative corner lines */}
                     <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-hacker-green"></div>
                     <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-hacker-green"></div>
                  </div>
                  <div className="flex flex-col">
                      <span className="font-bold text-hacker-text tracking-widest text-sm glitch-text" data-text={title}>{title}</span>
                      <span className="text-[9px] text-hacker-green font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1">
                         <span className={`w-1.5 h-1.5 rounded-full ${isGeneral ? 'bg-hacker-cyan animate-pulse' : (chatPartner?.isOnline ? 'bg-hacker-green animate-pulse' : 'bg-hacker-red')}`}></span>
                         {isGeneral ? 'Public Group' : (chatPartner?.isOnline ? 'Online' : 'Offline')}
                      </span>
                  </div>
              </div>
          </div>
          
          {/* Header decorative elements */}
          <div className="hidden sm:flex gap-1">
              {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-1 h-4 bg-hacker-green/20 skew-x-12"></div>
              ))}
          </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/50 relative z-0 no-scrollbar">
        {filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-50">
                <div className="w-16 h-16 border border-hacker-green/30 flex items-center justify-center mb-4 text-hacker-green/50 animate-pulse">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                </div>
                <h3 className="text-hacker-green font-bold tracking-widest text-xs">No Messages</h3>
                <p className="text-hacker-muted text-[10px] mt-1 uppercase">No messages here yet.</p>
            </div>
        ) : filteredMessages.map((msg, idx) => {
          const isMe = msg.senderId === currentUser.id;
          const isSystem = msg.isSystem || msg.senderId === 'system';
          const sender = users.find(u => u.id === msg.senderId);

          if (isSystem) {
             return (
                 <div key={msg.id} className="flex justify-center my-4">
                     <span className="bg-hacker-green/5 border border-hacker-green/20 text-hacker-green text-[9px] px-3 py-1 font-bold uppercase tracking-widest shadow-[0_0_10px_rgba(0,255,65,0.1)]">
                        {`>> ${msg.content}`}
                     </span>
                 </div>
             )
          }

          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group animate-matrix-fade`}>
               <div className={`
                 max-w-[85%] sm:max-w-[65%] relative px-4 py-3 text-sm shadow-sm font-sans border
                 ${isMe 
                    ? 'bg-hacker-green/10 border-hacker-green text-hacker-text shadow-[0_0_10px_rgba(0,255,65,0.1)]' 
                    : 'bg-hacker-panel border-hacker-border text-hacker-muted shadow-none'
                 }
               `}>
                 {/* Tech corners */}
                 <div className={`absolute top-0 w-2 h-2 border-t ${isMe ? 'right-0 border-r border-hacker-green' : 'left-0 border-l border-hacker-border'}`}></div>
                 <div className={`absolute bottom-0 w-2 h-2 border-b ${isMe ? 'left-0 border-l border-hacker-green' : 'right-0 border-r border-hacker-border'}`}></div>

                 {!isMe && isGeneral && (
                     <button
                        className="text-[10px] font-bold text-hacker-cyan mb-1 flex items-center gap-1 uppercase tracking-wider hover:bg-hacker-cyan/10 hover:border-b hover:border-hacker-cyan transition-all px-1 -ml-1 rounded-sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (sender) onChatSelect?.(sender.id);
                        }}
                        title="Send Message"
                     >
                         <span>@</span>
                         <span className="underline decoration-dotted decoration-hacker-cyan/50">{sender?.username}</span>
                         <svg className="w-3 h-3 ml-1 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                     </button>
                 )}
                 <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                 <div className={`text-[9px] mt-2 flex items-center justify-end gap-2 uppercase tracking-widest font-mono ${isMe ? 'text-hacker-green/50' : 'text-hacker-muted/50'}`}>
                     <span>{formatTime(msg.timestamp)}</span>
                     {isMe && (
                         <span>{msg.status === 'READ' ? 'Read' : 'Sent'}</span>
                     )}
                 </div>
               </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-hacker-black border-t border-hacker-border z-20 relative">
        <form onSubmit={handleSendMessage} className="flex items-end gap-3 max-w-4xl mx-auto">
             <div className="flex-1 bg-black border border-hacker-border focus-within:border-hacker-green transition-all flex items-center px-4 py-2 relative shadow-inner group">
                 <span className="text-hacker-green mr-2 animate-pulse">{`>`}</span>
                 <input 
                    className="flex-1 bg-transparent text-hacker-green placeholder-hacker-muted/50 focus:outline-none text-sm max-h-32 py-1 font-mono"
                    placeholder="Type a message..."
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    autoComplete="off"
                 />
                 {/* Input decorative scanline */}
                 <div className="absolute bottom-0 left-0 h-[1px] bg-hacker-green w-0 group-focus-within:w-full transition-all duration-500"></div>
             </div>
             <button 
                type="submit" 
                disabled={!inputText.trim()} 
                className="h-10 w-12 flex items-center justify-center bg-hacker-green/10 border border-hacker-green text-hacker-green hover:bg-hacker-green hover:text-black disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-[0_0_10px_rgba(0,255,65,0.1)] group"
             >
                 <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
             </button>
        </form>
      </div>
    </div>
  );
};