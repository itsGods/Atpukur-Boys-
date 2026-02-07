import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon';
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
  const baseStyles = "relative font-mono font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] outline-none";
  
  const variants = {
    primary: "bg-hacker-green/10 text-hacker-green border border-hacker-green hover:bg-hacker-green hover:text-black shadow-[0_0_15px_rgba(0,255,65,0.15)] hover:shadow-[0_0_25px_rgba(0,255,65,0.5)] py-3 px-6 text-sm clip-tech-border",
    secondary: "bg-transparent text-hacker-cyan border border-hacker-cyan/50 hover:border-hacker-cyan hover:bg-hacker-cyan/10 hover:shadow-[0_0_15px_rgba(0,243,255,0.3)] py-2 px-4 text-xs",
    danger: "bg-transparent text-hacker-red border border-hacker-red/50 hover:bg-hacker-red/10 py-2 px-4 text-xs hover:shadow-[0_0_15px_rgba(255,0,60,0.3)]",
    ghost: "text-hacker-green hover:bg-hacker-green/10 rounded-none py-2 px-4",
    icon: "p-2 text-hacker-green hover:bg-hacker-green/10 active:bg-hacker-green/20 rounded-sm",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : null}
      {children}
    </button>
  );
};