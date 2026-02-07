import React from 'react';

interface AvatarProps {
  src?: string;
  name: string;
  isOnline?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ src, name, isOnline, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-24 h-24 text-lg',
  };

  const getInitials = (n: string) => n.slice(0, 2).toUpperCase();

  return (
    <div className={`relative inline-block ${className}`}>
      <div className={`${sizeClasses[size]} bg-hacker-black border border-hacker-green/30 flex items-center justify-center shadow-lg relative overflow-hidden group`}>
        {/* Scan line over avatar */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-hacker-green/10 to-transparent translate-y-[-100%] group-hover:animate-[scanline_2s_linear_infinite]"></div>
        
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover opacity-90 grayscale group-hover:grayscale-0 transition-all duration-500" />
        ) : (
          <span className="font-mono font-bold text-hacker-green">{getInitials(name)}</span>
        )}
        
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-1 h-1 border-t border-l border-hacker-green"></div>
        <div className="absolute bottom-0 right-0 w-1 h-1 border-b border-r border-hacker-green"></div>
      </div>
      
      {isOnline !== undefined && (
        <span className={`absolute -bottom-1 -right-1 block border border-black ${size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'} ${isOnline ? 'bg-hacker-green shadow-[0_0_5px_#00FF41]' : 'bg-hacker-muted'}`} />
      )}
    </div>
  );
};