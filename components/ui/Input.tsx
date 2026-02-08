import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-[10px] uppercase tracking-widest text-cyber-green mb-1.5 opacity-80">&gt; {label}</label>}
      <div className="relative group">
        <input 
          className={`
            block w-full bg-black/50 border border-cyber-border rounded-none px-4 py-3 text-cyber-text font-mono text-sm
            focus:border-cyber-green focus:ring-1 focus:ring-cyber-green/50 focus:shadow-neon-green
            placeholder-cyber-subtext/50 transition-all outline-none
            ${error ? 'border-cyber-red text-cyber-red' : ''}
            ${className}
          `}
          {...props}
        />
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-cyber-green/5 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity" />
      </div>
      {error && <p className="mt-1 text-[10px] text-cyber-red font-bold uppercase tracking-wide">! {error}</p>}
    </div>
  );
};