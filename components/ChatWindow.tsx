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
  
  const partner = users.find(u => u.id === chatPartnerId);

  useEffect(() => {
    const update = () => {
        setMessages(mockService.getMessages());
        setUsers(mockService.getUsers());
    };
    update();
    return mockService.subscribe(update);
  }, []);

  // Scroll to bottom whenever messages change or we switch chats
  useEffect(() => {
    if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [chatPartnerId]); // Immediate scroll on chat switch

  useEffect(() => {
    if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]); // Smooth scroll on new message

  const conversation = messages.filter(m => 
      (m.senderId === currentUser.id && m.receiverId === chatPartnerId) ||
      (m.senderId === chatPartnerId && m.receiverId === currentUser.id)
  );

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
                    <h2 className="text-cyber-green font-bold text-sm tracking-wider">
                        {partner ? `UPLINK_ESTABLISHED: ${partner.username}` : 'UNKNOWN_TARGET'}
                    </h2>
                    <span className="text-[10px] text-cyber-subtext uppercase">
                        {partner?.isOnline ? 'SIGNAL_STRONG' : 'NO_CARRIER'}
                    </span>
                </div>
            </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/50">
            {conversation.map(msg => {
                const isMe = msg.senderId === currentUser.id;
                return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`
                            max-w-[80%] p-3 text-sm font-mono border
                            ${isMe 
                                ? 'bg-cyber-green/10 border-cyber-green text-cyber-green shadow-neon-green rounded-tl-lg rounded-bl-lg rounded-br-none' 
                                : 'bg-cyber-blue/5 border-cyber-blue/30 text-cyber-blue rounded-tr-lg rounded-br-lg rounded-bl-none'
                            }
                        `}>
                            <p>{msg.content}</p>
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
                    <span className="text-cyber-green py-3">></span>
                    <input 
                        value={text}
                        onChange={e => setText(e.target.value)}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-white font-mono placeholder-cyber-subtext/40"
                        placeholder="ENTER_MESSAGE..."
                        autoFocus
                    />
                    <button type="submit" disabled={!text.trim()} className="text-cyber-green font-bold text-xs uppercase disabled:opacity-30 hover:text-white">
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