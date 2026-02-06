import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  variant?: 'default' | 'search';
}

export const Input: React.FC<InputProps> = ({ label, error, variant = 'default', className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-[13px] font-medium text-ios-gray mb-1.5 ml-1">{label}</label>}
      <div className="relative">
        {variant === 'search' && (
             <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ios-gray">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
             </div>
        )}
        <input 
          className={`
            w-full bg-ios-card2 text-white rounded-xl px-4 py-3 
            placeholder-ios-gray focus:outline-none focus:ring-1 focus:ring-ios-blue transition-all 
            text-[17px] leading-relaxed
            ${variant === 'search' ? 'pl-9 bg-[#2C2C2E]/80 backdrop-blur-md' : 'border border-transparent'}
            ${error ? 'ring-1 ring-ios-red' : ''} 
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 ml-1 text-[13px] text-ios-red font-medium">{error}</p>}
    </div>
  );
};