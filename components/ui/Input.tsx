import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  variant?: 'default' | 'search';
}

export const Input: React.FC<InputProps> = ({ label, error, variant = 'default', className = '', ...props }) => {
  return (
    <div className="w-full font-mono">
      {label && <label className="block text-[11px] font-bold text-hacker-green mb-1 uppercase tracking-widest pl-1">{`> ${label}`}</label>}
      <div className="relative group">
        {variant === 'search' && (
             <div className="absolute left-3 top-1/2 -translate-y-1/2 text-hacker-muted group-focus-within:text-hacker-green transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
             </div>
        )}
        <input 
          className={`
            w-full bg-hacker-black/50 text-hacker-text 
            placeholder-hacker-muted/50 focus:outline-none transition-all 
            font-mono text-sm
            ${variant === 'search' 
                ? 'pl-10 py-2 border border-hacker-border focus:border-hacker-cyan' 
                : 'px-4 py-3 border-b-2 border-hacker-border focus:border-hacker-green bg-transparent'
            }
            ${error ? 'border-hacker-red' : ''} 
            ${className}
          `}
          {...props}
        />
        {/* Blinking cursor effect for non-search inputs */}
        {variant !== 'search' && (
             <div className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-4 bg-hacker-green animate-pulse opacity-0 group-focus-within:opacity-100 pointer-events-none"></div>
        )}
      </div>
      {error && <p className="mt-1 text-[11px] text-hacker-red font-bold uppercase tracking-wide">! {error}</p>}
    </div>
  );
};