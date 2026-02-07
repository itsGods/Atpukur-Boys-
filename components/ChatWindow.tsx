import React, { useState, useEffect, useRef } from 'react';
import { Message, User } from '../types';
import { mockService } from '../services/storage';
import { Avatar } from './ui/Avatar';

interface ChatWindowProps {
  currentUser: User;
  activeChatId: string;
  onBack?: () => void;
  onChatSelect?: (userId: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ currentUser, activeChatId, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
        setMessages(mockService.getMessages());
        setUsers(mockService.getUsers());
    };
    update();
    return mockService.subscribe(update);
  }, []);

  useEffect(() => {
    if (activeChatId !== 'general') {
        mockService.markMessagesAsRead(activeChatId, currentUser.id);
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeChatId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    await mockService.sendMessage({
        senderId: currentUser.id,
        receiverId: activeChatId === 'general' ? undefined : activeChatId,
        content: inputText.trim()
    });
    setInputText('');
  };

  const filteredMessages = messages.filter(msg => {
      if (activeChatId === 'general') return !msg.receiverId || msg.receiverId === 'general';
      return (msg.senderId === currentUser.id && msg.receiverId === activeChatId) ||
             (msg.senderId === activeChatId && msg.receiverId === currentUser.id);
  });

  const chatPartner = users.find(u => u.id === activeChatId);
  const isGeneral = activeChatId === 'general';
  const title = isGeneral ? 'General Chat' : chatPartner?.username || 'Unknown';
  const isOnline = isGeneral ? true : chatPartner?.isOnline;

  // Grouping logic for bubbles
  const renderMessageGroup = (msg: Message, prevMsg: Message | null) => {
      const isMe = msg.senderId === currentUser.id;
      const showAvatar = !isMe && isGeneral && (!prevMsg || prevMsg.senderId !== msg.senderId);
      const showName = !isMe && isGeneral && showAvatar;
      const sender = users.find(u => u.id === msg.senderId);

      return (
          <div key={msg.id} className={`flex flex-col mb-1 ${isMe ? 'items-end' : 'items-start'}`}>
              {showName && <span className="text-[11px] text-ios-gray ml-10 mb-0.5">{sender?.username}</span>}
              <div className="flex items-end max-w-[75%] gap-2">
                  {!isMe && isGeneral && (
                      <div className="w-8 shrink-0">
                          {showAvatar && <Avatar name={sender?.username || '?'} size="sm" />}
                      </div>
                  )}
                  <div 
                    className={`px-4 py-2 text-[15px] leading-relaxed break-words shadow-sm
                        ${isMe 
                            ? 'bg-ios-blue text-white rounded-2xl rounded-tr-sm' 
                            : 'bg-ios-card2 text-white rounded-2xl rounded-tl-sm'
                        }
                    `}
                  >
                      {msg.content}
                  </div>
              </div>
              {/* Timestamp on hover or last message */}
              <span className={`text-[10px] text-ios-subtext mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isMe ? 'mr-1' : 'ml-10'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
          </div>
      );
  };

  return (
    <div className="flex flex-col h-full bg-ios-bg relative w-full">
      {/* Header */}
      <div className="h-[60px] bg-ios-card/80 backdrop-blur-md border-b border-ios-separator/50 flex items-center justify-between px-4 z-20 shrink-0">
          <div className="flex items-center gap-3">
              <button onClick={onBack} className="sm:hidden text-ios-blue flex items-center gap-1 pr-2">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <Avatar name={title} size="sm" isOnline={isOnline} />
              <div className="flex flex-col justify-center">
                  <h3 className="font-semibold text-white text-sm">{title}</h3>
                  <span className="text-[11px] text-ios-subtext">{isGeneral ? `${users.length} members` : (isOnline ? 'Active now' : 'Offline')}</span>
              </div>
          </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-black">
          {filteredMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-40">
                  <div className="w-20 h-20 bg-ios-card2 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-10 h-10 text-ios-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  </div>
                  <p className="text-ios-gray text-sm">No messages yet</p>
              </div>
          ) : (
              <div className="flex flex-col justify-end min-h-full space-y-1 py-4">
                  {filteredMessages.map((msg, i) => renderMessageGroup(msg, i > 0 ? filteredMessages[i-1] : null))}
                  <div ref={bottomRef} />
              </div>
          )}
      </div>

      {/* Input */}
      <div className="p-3 bg-ios-card/80 backdrop-blur-md border-t border-ios-separator/50 pb-safe-bottom z-20">
          <form onSubmit={handleSend} className="flex items-center gap-2 max-w-4xl mx-auto">
              <input 
                  className="flex-1 bg-ios-card2 border border-white/5 rounded-full px-4 py-2.5 text-white placeholder-ios-gray/60 focus:outline-none focus:ring-1 focus:ring-ios-blue/50 transition-all text-[15px]"
                  placeholder="iMessage"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
              />
              <button 
                  type="submit" 
                  disabled={!inputText.trim()}
                  className="bg-ios-blue text-white rounded-full p-2.5 hover:bg-ios-blue/90 disabled:opacity-50 disabled:bg-ios-card2 transition-all shadow-md active:scale-95"
              >
                  <svg className="w-5 h-5 translate-x-0.5 -translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
              </button>
          </form>
      </div>
    </div>
  );
};