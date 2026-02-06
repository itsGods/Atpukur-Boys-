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
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-20 h-20 text-xl',
  };

  const getInitials = (n: string) => n.slice(0, 2).toUpperCase();

  return (
    <div className={`relative inline-block ${className}`}>
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden flex items-center justify-center bg-brand-panel border border-white/5`}>
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="font-semibold text-gray-300">{getInitials(name)}</span>
        )}
      </div>
      {isOnline !== undefined && (
        <span className={`absolute bottom-0 right-0 block rounded-full ring-2 ring-brand-dark ${size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'} ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
      )}
    </div>
  );
};