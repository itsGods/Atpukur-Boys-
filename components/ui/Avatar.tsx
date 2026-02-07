import React from 'react';

interface AvatarProps {
  src?: string;
  name: string;
  isOnline?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ name, src, isOnline, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-10 h-10 text-xs', // iOS standard list size
    lg: 'w-14 h-14 text-sm',
    xl: 'w-24 h-24 text-xl',
  };

  const getInitials = (n: string) => n.slice(0, 2).toUpperCase();
  
  // Apple-style gradients
  const gradients = [
      'bg-gradient-to-br from-blue-400 to-blue-600',
      'bg-gradient-to-br from-purple-400 to-purple-600',
      'bg-gradient-to-br from-indigo-400 to-indigo-600',
      'bg-gradient-to-br from-pink-400 to-pink-600',
  ];
  
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const bgClass = gradients[hash % gradients.length];

  return (
    <div className={`relative inline-block ${className}`}>
      <div className={`${sizeClasses[size]} ${bgClass} rounded-full flex items-center justify-center text-white shadow-lg shadow-black/20 ring-2 ring-white/5`}>
        {src ? (
             <img src={src} alt={name} className="w-full h-full object-cover rounded-full" />
        ) : (
            <span className="font-bold tracking-wide">{getInitials(name)}</span>
        )}
      </div>
      
      {isOnline !== undefined && (
        <span className={`absolute bottom-0 right-0 block rounded-full ring-2 ring-ios-bg ${size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} ${isOnline ? 'bg-ios-green' : 'bg-ios-gray'}`} />
      )}
    </div>
  );
};