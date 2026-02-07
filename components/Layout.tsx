import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="h-[100dvh] w-screen flex flex-col bg-black overflow-hidden relative font-sans">
      {/* Background Grid */}
      <div className="absolute inset-0 z-0 opacity-10" style={{ 
          backgroundImage: 'linear-gradient(rgba(0, 255, 65, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 65, 0.1) 1px, transparent 1px)',
          backgroundSize: '20px 20px'
      }}></div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col sm:flex-row h-full w-full sm:max-w-[1600px] sm:mx-auto sm:h-[95dvh] sm:my-auto bg-hacker-black sm:border sm:border-hacker-border shadow-2xl overflow-hidden relative z-10">
         {children}
      </div>
    </div>
  );
};