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
  const baseStyles = "inline-flex items-center justify-center px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed font-mono clip-tech-border relative overflow-hidden group";
  
  const variants = {
    primary: "bg-hacker-green/10 text-hacker-green border border-hacker-green hover:bg-hacker-green hover:text-black shadow-[0_0_10px_rgba(0,255,65,0.2)]",
    secondary: "bg-transparent text-hacker-text border border-hacker-border hover:border-hacker-green hover:text-hacker-green",
    danger: "bg-hacker-red/10 text-hacker-red border border-hacker-red hover:bg-hacker-red hover:text-white",
    ghost: "bg-transparent text-hacker-muted hover:text-hacker-green",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center animate-pulse">
          <span className="mr-2">Loading...</span>
          <span className="h-1 w-1 bg-current rounded-full mx-0.5 animate-bounce"></span>
          <span className="h-1 w-1 bg-current rounded-full mx-0.5 animate-bounce delay-75"></span>
          <span className="h-1 w-1 bg-current rounded-full mx-0.5 animate-bounce delay-150"></span>
        </span>
      ) : (
        children
      )}
    </button>
  );
};