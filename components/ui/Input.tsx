import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  variant?: 'default' | 'search';
}

export const Input: React.FC<InputProps> = ({ label, error, variant = 'default', className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-[10px] font-bold text-hacker-green uppercase tracking-widest mb-1.5">{label}</label>}
      <div className="relative group">
        {variant === 'search' && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-hacker-green opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        )}
        <input 
          className={`
            block w-full bg-black border font-mono text-sm transition-all
            ${variant === 'search' ? 'pl-10 py-2 border-hacker-border focus:border-hacker-green text-hacker-text placeholder-hacker-muted' : 'px-3 py-3 border-hacker-border focus:border-hacker-green text-hacker-green placeholder-hacker-muted/50 shadow-inner'}
            ${error ? 'border-hacker-red focus:border-hacker-red text-hacker-red' : ''}
            focus:outline-none focus:shadow-[0_0_15px_rgba(0,255,65,0.1)]
            ${className}
          `}
          {...props}
        />
        {/* Decorative corner */}
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-hacker-border group-focus-within:border-hacker-green transition-colors"></div>
      </div>
      {error && <p className="mt-1 text-[10px] text-hacker-red font-mono uppercase tracking-wider animate-pulse">{`[ERROR]: ${error}`}</p>}
    </div>
  );
};