import React from 'react';

interface AvatarProps {
  src?: string; // Kept for compatibility but ignored by implementation
  name: string;
  isOnline?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ name, isOnline, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base',
    xl: 'w-24 h-24 text-xl',
  };

  const getInitials = (n: string) => n.slice(0, 2).toUpperCase();
  
  // Deterministic "random" color based on name
  const getColorVariant = (n: string) => {
      const hash = n.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const variants = [
          'text-hacker-green border-hacker-green shadow-[0_0_10px_rgba(0,255,65,0.2)]', // Green
          'text-hacker-cyan border-hacker-cyan shadow-[0_0_10px_rgba(0,243,255,0.2)]',  // Cyan
          'text-hacker-red border-hacker-red shadow-[0_0_10px_rgba(255,0,60,0.2)]'      // Red
      ];
      return variants[hash % variants.length];
  };

  const colorClass = getColorVariant(name);

  return (
    <div className={`relative inline-block ${className}`}>
      <div className={`${sizeClasses[size]} bg-black flex items-center justify-center overflow-hidden border clip-tech-border transition-all ${colorClass}`}>
        <span className="font-bold font-mono tracking-tighter">{getInitials(name)}</span>
      </div>
      
      {isOnline !== undefined && (
        <span className={`absolute -bottom-1 -right-1 block border border-black ${size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'} ${isOnline ? 'bg-hacker-green shadow-[0_0_8px_#00ff41]' : 'bg-hacker-muted'}`} />
      )}
    </div>
  );
};