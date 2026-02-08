import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className = '', 
  disabled,
  ...props 
}) => {
  const baseStyles = "relative overflow-hidden inline-flex items-center justify-center px-6 py-3 text-sm font-bold uppercase tracking-widest transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-cyber-green text-black border border-cyber-green hover:bg-transparent hover:text-cyber-green shadow-neon-green",
    secondary: "bg-transparent text-cyber-blue border border-cyber-blue hover:bg-cyber-blue/10 shadow-neon-blue",
    danger: "bg-transparent text-cyber-red border border-cyber-red hover:bg-cyber-red/10",
    ghost: "bg-transparent text-cyber-subtext hover:text-white",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2 animate-pulse">
           [PROCESSING...]
        </span>
      ) : (
        children
      )}
    </button>
  );
};