import React, { useState, useEffect, useRef } from 'react';
import { Message, User } from '../types';
import { mockService } from '../services/storage';

interface ChatWindowProps {
  currentUser: User;
  chatPartnerId: string;
  onBack: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ currentUser, chatPartnerId, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  
  const isGlobal = chatPartnerId === 'global';
  const partner = users.find(u => u.id === chatPartnerId);

  useEffect(() => {
    const update = () => {
        setMessages(mockService.getMessages());
        setUsers(mockService.getUsers());
    };
    update();
    return mockService.subscribe(update);
  }, []);

  // Force scroll to bottom when entering a chat
  useEffect(() => {
    if (bottomRef.current) {
        // Short timeout ensures the DOM has rendered the new messages before scrolling
        setTimeout(() => {
           bottomRef.current?.scrollIntoView({ behavior: 'auto' });
        }, 50);
    }
  }, [chatPartnerId]); 

  // Smooth scroll for new messages
  useEffect(() => {
    if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  const conversation = messages.filter(m => {
      if (isGlobal) {
          // Global messages have receiverId as 'global'
          return m.receiverId === 'global';
      }
      // Private chat logic
      return (m.senderId === currentUser.id && m.receiverId === chatPartnerId) ||
             (m.senderId === chatPartnerId && m.receiverId === currentUser.id);
  });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !currentUser.canSend) return;
    
    await mockService.sendMessage({
        senderId: currentUser.id,
        receiverId: chatPartnerId,
        content: text.trim()
    });
    setText('');
  };

  return (
    <div className="flex flex-col h-full w-full">
        {/* Header */}
        <div className="h-16 bg-cyber-glass border-b border-cyber-border flex items-center justify-between px-4 z-20 shrink-0">
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="md:hidden text-cyber-green hover:text-white">
                   &lt; BACK
                </button>
                <div>
                    <h2 className={`font-bold text-sm tracking-wider ${isGlobal ? 'text-cyber-blue' : 'text-cyber-green'}`}>
                        {isGlobal ? 'PUBLIC_CHANNEL // GLOBAL' : partner ? `UPLINK_ESTABLISHED: ${partner.username}` : 'UNKNOWN_TARGET'}
                    </h2>
                    <span className="text-[10px] text-cyber-subtext uppercase">
                        {isGlobal ? 'OPEN_FREQUENCY' : (partner?.isOnline ? 'SIGNAL_STRONG' : 'NO_CARRIER')}
                    </span>
                </div>
            </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/50">
            {conversation.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-cyber-subtext opacity-50">
                    <span className="text-4xl mb-2">_</span>
                    <span className="text-xs uppercase tracking-widest">NO_DATA_FOUND</span>
                </div>
            )}
            
            {conversation.map(msg => {
                const isMe = msg.senderId === currentUser.id;
                const senderName = users.find(u => u.id === msg.senderId)?.username || 'UNKNOWN_UNIT';
                
                return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`
                            max-w-[85%] md:max-w-[70%] p-3 text-sm font-mono border flex flex-col relative
                            ${isMe 
                                ? 'bg-cyber-green/10 border-cyber-green text-cyber-green shadow-neon-green rounded-tl-lg rounded-bl-lg rounded-br-none' 
                                : 'bg-cyber-blue/5 border-cyber-blue/30 text-cyber-blue rounded-tr-lg rounded-br-lg rounded-bl-none'
                            }
                        `}>
                            {/* Show sender name in Global Chat if it's not me */}
                            {isGlobal && !isMe && (
                                <span className="text-[10px] font-bold opacity-70 mb-1 block text-white border-b border-white/10 pb-1">
                                    &gt; {senderName}
                                </span>
                            )}
                            
                            <p className="break-words z-10">{msg.content}</p>
                            <div className="text-[9px] opacity-50 mt-1 text-right">
                                {new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                            </div>
                        </div>
                    </div>
                );
            })}
            <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-cyber-glass border-t border-cyber-border z-20 shrink-0">
            {currentUser.canSend ? (
                <form onSubmit={handleSend} className="flex gap-2">
                    <span className={`py-3 ${isGlobal ? 'text-cyber-blue' : 'text-cyber-green'}`}>&gt;</span>
                    <input 
                        value={text}
                        onChange={e => setText(e.target.value)}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-white font-mono placeholder-cyber-subtext/40"
                        placeholder={isGlobal ? "BROADCAST_MESSAGE..." : "ENTER_MESSAGE..."}
                        autoFocus
                    />
                    <button type="submit" disabled={!text.trim()} className={`font-bold text-xs uppercase disabled:opacity-30 hover:text-white ${isGlobal ? 'text-cyber-blue' : 'text-cyber-green'}`}>
                        SEND_DATA
                    </button>
                </form>
            ) : (
                <div className="w-full py-2 bg-cyber-red/10 border border-cyber-red/30 text-cyber-red text-center text-xs font-bold tracking-widest animate-pulse">
                    WARNING: WRITE_PERMISSION_REVOKED
                </div>
            )}
        </div>
    </div>
  );
};