import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  variant?: 'default' | 'search';
}

export const Input: React.FC<InputProps> = ({ label, error, variant = 'default', className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-[13px] font-medium text-ios-subtext mb-2 ml-1">{label}</label>}
      <div className="relative group">
        {variant === 'search' && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-ios-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        )}
        <input 
          className={`
            block w-full text-[15px] transition-all placeholder-ios-gray/60
            ${variant === 'search' 
                ? 'bg-ios-card2/50 rounded-lg pl-9 py-2 text-white focus:bg-ios-card2 focus:ring-0' 
                : 'bg-ios-card border border-white/5 rounded-xl px-4 py-3.5 text-white focus:border-ios-blue/50 focus:ring-1 focus:ring-ios-blue/50'
            }
            ${error ? 'border-ios-red focus:border-ios-red focus:ring-ios-red' : ''}
            focus:outline-none
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 ml-1 text-[12px] text-ios-red font-medium">{error}</p>}
    </div>
  );
};