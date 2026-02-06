import React, { useState, useEffect, useRef } from 'react';
import { Message, User, UserRole, MessageStatus } from '../types';
import { mockService } from '../services/storage';
import { geminiService } from '../services/geminiService';
import { Button } from './ui/Button';

interface ChatWindowProps {
  currentUser: User;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ currentUser }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Load initial data and subscribe
  useEffect(() => {
    const fetchData = () => {
      setMessages(mockService.getMessages());
      setUsers(mockService.getUsers());
    };

    fetchData();
    const unsubscribe = mockService.subscribe(fetchData);
    
    // Safe polling fallback
    const interval = setInterval(fetchData, 3000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      await mockService.sendMessage({
        senderId: currentUser.id,
        content: inputText.trim(),
        status: MessageStatus.SENT,
        isSystem: false,
      });
      setInputText('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSummarize = async () => {
    setIsSummarizing(true);
    const summary = await geminiService.summarizeChat(messages);
    
    await mockService.sendMessage({
      senderId: 'system-ai',
      content: `📝 **Team AI Summary**:\n\n${summary}`,
      isSystem: true,
      status: MessageStatus.SENT
    });
    
    setIsSummarizing(false);
  };

  const formatTime = (ts: number) => {
    if (!ts || isNaN(ts)) return '';
    try {
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return '';
    }
  };

  const getSender = (id: string) => users.find(u => u.id === id);

  return (
    <div className="flex flex-col h-full bg-[#0b141a] relative w-full">
      
      {/* Header */}
      <div className="bg-brand-panel py-3 px-4 flex justify-between items-center border-b border-white/5 z-10 shadow-sm shrink-0 h-16">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center text-white cursor-pointer hover:bg-brand-600 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="cursor-pointer">
            <h3 className="font-semibold text-white">General Team</h3>
            <p className="text-xs text-gray-400">{users.filter(u => u.isOnline).length} online, {users.length} members</p>
          </div>
        </div>
        <div className="flex gap-2">
            {process.env.API_KEY && (
                <Button variant="secondary" onClick={handleSummarize} isLoading={isSummarizing} className="text-xs py-1.5 px-3">
                    ✨ AI Summary
                </Button>
            )}
        </div>
      </div>

      {/* Messages */}
      {/* Added background image pattern effect overlay */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-2 z-10 custom-scrollbar min-h-0 bg-[#0b141a] relative">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}></div>
        
        {messages.length === 0 && (
             <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-50 relative z-10">
                <div className="bg-brand-panel p-4 rounded-full mb-4">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </div>
                <p>No messages yet.</p>
             </div>
        )}

        {messages.map((msg, idx) => {
          const isMe = msg.senderId === currentUser.id;
          const sender = getSender(msg.senderId);
          const isSystem = msg.isSystem || msg.senderId === 'system' || msg.senderId === 'system-ai';
          const isConsecutive = idx > 0 && messages[idx - 1].senderId === msg.senderId && (msg.timestamp - messages[idx - 1].timestamp < 60000);

          if (isSystem) {
             return (
                 <div key={msg.id} className="flex justify-center my-4 animate-fade-in relative z-10">
                     <div className="bg-brand-panel/80 text-gray-300 text-xs px-3 py-1.5 rounded-lg shadow-sm border border-white/5 backdrop-blur-sm max-w-lg text-center whitespace-pre-wrap">
                        {msg.content}
                     </div>
                 </div>
             )
          }

          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group animate-fade-in relative z-10`}>
              
              <div className={`max-w-[85%] md:max-w-[60%] relative rounded-lg px-3 py-1.5 shadow-sm text-sm ${
                isMe 
                  ? 'bg-brand-outgoing text-white rounded-tr-none' 
                  : 'bg-brand-panel text-white rounded-tl-none'
              } ${isConsecutive ? (isMe ? 'rounded-tr-lg mt-0.5' : 'rounded-tl-lg mt-0.5') : 'mt-2'}`}>
                
                {/* Sender Name - Only show for others, if not consecutive */}
                {!isMe && !isConsecutive && (
                  <div className="text-[12px] font-bold mb-1 flex items-center gap-1" style={{ color: '#00a884' }}>
                    {sender?.username || 'Unknown User'}
                    {sender?.role === UserRole.ADMIN && (
                        <span className="bg-brand-500/10 text-brand-500 px-1 rounded text-[9px] border border-brand-500/20">ADMIN</span>
                    )}
                  </div>
                )}
                
                <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                
                <div className="flex items-center justify-end gap-1 mt-0.5 opacity-60 select-none float-right ml-2 relative top-1">
                    <span className="text-[10px]">{formatTime(msg.timestamp)}</span>
                    {isMe && (
                        <span className={msg.status === MessageStatus.READ ? 'text-blue-400' : 'text-gray-400'}>
                             <svg className="w-3.5 h-3.5" viewBox="0 0 16 11" fill="none">
                                <path d="M1 6L4.5 9.5L11.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M5 6L8.5 9.5L15.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                             </svg>
                        </span>
                    )}
                </div>

                {/* Tail */}
                {!isConsecutive && (
                    <div className={`absolute top-0 w-2.5 h-2.5 ${isMe ? '-right-2.5' : '-left-2.5'}`}>
                        <svg viewBox="0 0 10 10" className={`w-full h-full ${isMe ? 'text-brand-outgoing' : 'text-brand-panel'}`} fill="currentColor">
                            <path d={isMe ? "M0,0 L10,0 L0,10 Z" : "M10,0 L0,0 L10,10 Z"} />
                        </svg>
                    </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-brand-panel px-4 py-3 border-t border-white/5 z-20 shrink-0">
        <form onSubmit={handleSendMessage} className="flex gap-4 items-end max-w-4xl mx-auto w-full">
          <Button variant="ghost" type="button" className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/5 hidden sm:block shrink-0 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </Button>
          
          <Button variant="ghost" type="button" className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/5 hidden sm:block shrink-0 transition-colors -ml-2">
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
             </svg>
          </Button>
          
          <input 
            className="flex-1 bg-brand-darker text-white placeholder-gray-500 rounded-lg px-4 py-3 border border-white/5 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all min-w-0"
            placeholder="Type a message..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
          />

          <Button type="submit" className="p-3 rounded-full bg-brand-500 hover:bg-brand-600 shadow-lg shrink-0 transition-transform active:scale-95" disabled={!inputText.trim()}>
            {inputText.trim() ? (
                <svg className="w-5 h-5 translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
            ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};