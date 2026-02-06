import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>}
      <input 
        className={`w-full bg-brand-darker border border-gray-700/50 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm placeholder-gray-600 ${error ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500' : ''} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
};