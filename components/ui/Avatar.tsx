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
      <div className={`${sizeClasses[size]} bg-black border border-hacker-green flex items-center justify-center shadow-[0_0_10px_rgba(0,255,65,0.1)] relative overflow-hidden group transition-all duration-300 group-hover:shadow-[0_0_15px_rgba(0,255,65,0.3)]`}>
        
        {/* Scan line over avatar */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-hacker-green/10 to-transparent translate-y-[-100%] group-hover:animate-[scanline_2s_linear_infinite] z-10 pointer-events-none"></div>
        
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover opacity-80 grayscale group-hover:grayscale-0 transition-all duration-300" />
        ) : (
          <span className="font-mono font-bold text-hacker-green tracking-widest">{getInitials(name)}</span>
        )}
        
        {/* Solid Corner accents (Matching General Chat style) */}
        <div className="absolute top-0 left-0 w-1 h-1 bg-hacker-green z-20"></div>
        <div className="absolute bottom-0 right-0 w-1 h-1 bg-hacker-green z-20"></div>
      </div>
      
      {isOnline !== undefined && (
        <span className={`absolute -bottom-1 -right-1 block border border-black z-30 ${size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'} ${isOnline ? 'bg-hacker-green shadow-[0_0_5px_#00FF41]' : 'bg-hacker-muted'}`} />
      )}
    </div>
  );
};