import React, { useState, useEffect, useRef } from 'react';
import { Message, User, UserRole, MessageStatus } from '../types';
import { mockService } from '../services/storage';
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

  useEffect(() => {
    const fetchData = () => {
      setMessages(mockService.getMessages());
      setUsers(mockService.getUsers());
    };
    fetchData();
    const unsubscribe = mockService.subscribe(fetchData);
    // Realtime is primary, but we poll every 10s as a fallback sync
    const interval = setInterval(fetchData, 10000);
    return () => { unsubscribe(); clearInterval(interval); };
  }, []);

  // Mark as Read when opening chat or receiving new messages
  useEffect(() => {
    if (activeChatId !== 'general') {
        const unreadExists = messages.some(m => 
            m.senderId === activeChatId && 
            m.receiverId === currentUser.id && 
            m.status !== MessageStatus.READ
        );
        if (unreadExists) {
            mockService.markMessagesAsRead(activeChatId, currentUser.id);
        }
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

  // --- Helpers ---

  const formatTime = (ts: number) => {
    if (!ts || isNaN(ts)) return '';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const getSender = (id: string) => users.find(u => u.id === id);

  const getFilteredMessages = () => {
      return messages.filter(msg => {
          if (activeChatId === 'general') {
              return !msg.receiverId || msg.receiverId === 'general';
          } else {
              const isMyMsg = msg.senderId === currentUser.id && msg.receiverId === activeChatId;
              const isTheirMsg = msg.senderId === activeChatId && msg.receiverId === currentUser.id;
              return isMyMsg || isTheirMsg;
          }
      });
  };

  const filteredMessages = getFilteredMessages();

  const isGeneral = activeChatId === 'general';
  const chatPartner = users.find(u => u.id === activeChatId);
  const title = isGeneral ? 'GENERAL_CHANNEL' : chatPartner?.username.toUpperCase() || 'UNKNOWN_TARGET';
  const subtitle = isGeneral ? 'BROADCASTING' : (chatPartner?.isOnline ? 'LINK: ACTIVE' : 'LINK: SEVERED');

  return (
    <div className="flex flex-col h-full bg-hacker-black relative w-full font-sans bg-noise bg-[size:40px_40px] bg-grid-pattern">
      
      {/* HUD Header */}
      <div className="absolute top-0 left-0 right-0 bg-hacker-black/90 backdrop-blur-md border-b border-hacker-border z-30 pt-safe-top shadow-[0_5px_30px_rgba(0,0,0,0.8)]">
        <div className="h-[70px] flex items-center justify-between px-4 sm:px-6">
            {/* Back Button */}
            <Button variant="ghost" onClick={onBack} className="sm:hidden px-0 text-hacker-green hover:bg-transparent mr-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </Button>
            
            {/* Target Info */}
            <div className="flex items-center gap-4 flex-1">
                {isGeneral ? (
                    <div className="w-10 h-10 border border-hacker-green/50 flex items-center justify-center bg-hacker-green/5 relative overflow-hidden group">
                        <span className="text-hacker-green font-bold text-lg">#</span>
                        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-hacker-green"></div>
                        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-hacker-green"></div>
                    </div>
                ) : (
                    <Avatar name={chatPartner?.username || '?'} src={chatPartner?.avatarUrl} size="md" className="border-hacker-green/50" />
                )}
                <div className="flex flex-col">
                    <span className="text-lg font-bold text-white tracking-widest font-mono glitch-text" data-text={title}>{title}</span>
                    <div className="flex items-center gap-2">
                         <div className={`w-1.5 h-1.5 ${isGeneral || chatPartner?.isOnline ? 'bg-hacker-green shadow-[0_0_5px_#00FF41]' : 'bg-hacker-red'} animate-pulse`}></div>
                         <span className={`text-[10px] font-mono tracking-[0.2em] uppercase ${isGeneral || chatPartner?.isOnline ? 'text-hacker-green' : 'text-hacker-red'}`}>
                             {subtitle}
                         </span>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 items-center">
                {/* No actions currently */}
            </div>
        </div>
        
        {/* Progress Bar Decoration */}
        <div className="h-[1px] w-full bg-hacker-border relative overflow-hidden">
             <div className="absolute top-0 left-0 h-full w-2/3 bg-gradient-to-r from-transparent via-hacker-green to-transparent animate-[scanline_2s_linear_infinite] transform -translate-x-full opacity-50"></div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto pt-[calc(env(safe-area-inset-top)+80px)] pb-[calc(env(safe-area-inset-bottom)+80px)] px-4 sm:px-8 bg-transparent no-scrollbar w-full relative">
        
        <div className="py-6 space-y-6">
        {filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center pt-20 text-hacker-muted opacity-50 space-y-4 font-mono select-none">
                <div className="w-20 h-20 border border-hacker-muted/30 flex items-center justify-center rounded-full animate-pulse">
                    <span className="text-4xl text-hacker-green">_</span>
                </div>
                <span className="text-xs tracking-[0.3em] uppercase">No_Packets_Received</span>
            </div>
        ) : filteredMessages.map((msg, idx) => {
          const isMe = msg.senderId === currentUser.id;
          const sender = getSender(msg.senderId);
          const isSystem = msg.isSystem || msg.senderId === 'system' || msg.senderId === 'system-ai';
          const isConsecutive = idx > 0 && filteredMessages[idx - 1].senderId === msg.senderId && (msg.timestamp - filteredMessages[idx - 1].timestamp < 60000);

          if (isSystem) {
             return (
                 <div key={msg.id} className="flex flex-col items-center my-8 space-y-2 opacity-80 hover:opacity-100 transition-opacity">
                     <div className="flex items-center gap-4 w-full justify-center">
                        <div className="h-px w-12 bg-gradient-to-r from-transparent to-hacker-green/50"></div>
                        <span className="text-[10px] font-mono text-hacker-green tracking-widest text-center uppercase border border-hacker-green/30 bg-hacker-green/5 px-4 py-1">
                            {msg.content}
                        </span>
                        <div className="h-px w-12 bg-gradient-to-l from-transparent to-hacker-green/50"></div>
                     </div>
                 </div>
             )
          }

          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${isConsecutive ? 'mt-1' : 'mt-6'}`}>
              {!isMe && !isConsecutive && isGeneral && (
                  <div className="flex items-center gap-2 mb-1 ml-1">
                      <span className="text-[10px] text-hacker-cyan font-bold font-mono tracking-wide">{sender?.username.toUpperCase()}</span>
                      <span className="text-[8px] text-hacker-muted font-mono">{formatTime(msg.timestamp)}</span>
                  </div>
              )}
              
              <div className={`
                 max-w-[85%] sm:max-w-[65%] text-sm relative group
                 ${isMe ? 'text-right' : 'text-left'}
              `}>
                <div className={`
                    relative px-5 py-3 
                    ${isMe 
                        ? 'bg-hacker-green/10 text-hacker-text clip-message-sent border-r-2 border-hacker-green' 
                        : 'bg-hacker-panel text-hacker-text clip-message-received border-l-2 border-hacker-border'
                    }
                `}>
                    <p className="break-words font-mono text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
                
                {/* Meta Data */}
                {isMe && (
                    <div className="flex items-center justify-end gap-2 mt-1 select-none pr-1">
                        <span className="text-[8px] text-hacker-muted font-mono tracking-tighter uppercase">
                            {formatTime(msg.timestamp)} :: {msg.status === MessageStatus.READ ? 'ACK' : 'SENT'}
                        </span>
                    </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Console */}
      <div className="absolute bottom-0 w-full bg-hacker-black/95 backdrop-blur-xl border-t border-hacker-border pb-safe-bottom z-40">
        <div className="h-[2px] w-full bg-gradient-to-r from-hacker-green via-hacker-cyan to-hacker-green opacity-30"></div>
        <form onSubmit={handleSendMessage} className="flex items-center gap-0 p-2 sm:p-4">
            
            <div className="flex items-center justify-center w-10 h-10 text-hacker-green animate-pulse font-mono text-xl">{`>`}</div>
            
            <div className="flex-1 bg-hacker-panel/50 border border-hacker-border/50 focus-within:border-hacker-green/50 flex items-center mr-2 relative clip-tech-border">
                <input 
                    className="flex-1 bg-transparent text-hacker-text placeholder-hacker-muted/40 focus:outline-none text-sm font-mono h-[46px] px-4 w-full"
                    placeholder="ENTER_COMMAND..."
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    autoComplete="off"
                />
            </div>

            <Button type="submit" disabled={!inputText.trim()} className="h-[46px] px-6 bg-hacker-green/10 border border-hacker-green/50 text-hacker-green hover:bg-hacker-green hover:text-black font-bold uppercase tracking-widest text-xs transition-all clip-tech-border shadow-[0_0_10px_rgba(0,255,65,0.1)] hover:shadow-[0_0_20px_rgba(0,255,65,0.4)]">
                SEND
            </Button>
        </form>
      </div>
    </div>
  );
};