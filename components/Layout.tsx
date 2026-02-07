import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="h-[100dvh] w-screen bg-black flex justify-center overflow-hidden">
      {/* 
        Container constraints for large screens (iPad/Desktop).
        On mobile, it takes full width/height.
      */}
      <div className="w-full h-full sm:max-w-[1400px] sm:h-[95dvh] sm:my-auto sm:rounded-3xl sm:border sm:border-ios-separator/50 sm:shadow-2xl overflow-hidden bg-ios-bg relative flex">
         {children}
      </div>
    </div>
  );
};