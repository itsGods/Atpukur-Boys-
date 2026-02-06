import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="h-[100dvh] w-screen bg-black flex flex-col overflow-hidden">
      {/* 
        On Desktop: Max width container centered.
        On Mobile: Full width/height, no borders, native feel.
      */}
      <div className="flex-1 flex flex-col h-full w-full sm:max-w-[1200px] sm:mx-auto sm:h-[95dvh] sm:my-auto sm:border sm:border-ios-separator sm:rounded-3xl sm:overflow-hidden sm:shadow-2xl bg-ios-bg">
        <div className="flex-1 flex flex-col sm:flex-row h-full relative overflow-hidden">
            {children}
        </div>
      </div>
    </div>
  );
};