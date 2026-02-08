import React from 'react';

interface AvatarProps {
  name: string;
  isOnline?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ name, isOnline, size = 'md', className = '' }) => {
  // We use a text-based representation for the hacker aesthetic
  // e.g. [USER]
  
  const onlineColor = isOnline ? 'text-cyber-green' : 'text-cyber-subtext';
  
  return (
    <div className={`font-mono font-bold tracking-tighter ${onlineColor} ${className} flex items-center`}>
      <span className="opacity-50 mr-0.5">[</span>
      <span className="truncate max-w-[100px]">{name}</span>
      <span className="opacity-50 ml-0.5">]</span>
      {isOnline && <span className="ml-1 w-1.5 h-1.5 bg-cyber-green rounded-full shadow-neon-green animate-pulse"></span>}
    </div>
  );
};