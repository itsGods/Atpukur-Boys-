import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="h-screen w-screen bg-brand-dark flex flex-col relative overflow-hidden">
      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col h-full max-w-[1920px] mx-auto w-full p-0 sm:p-4 lg:p-6">
        <div className="flex-1 bg-brand-darker sm:rounded-2xl border border-white/5 shadow-2xl overflow-hidden flex flex-col sm:flex-row h-full">
            {children}
        </div>
      </div>
    </div>
  );
};