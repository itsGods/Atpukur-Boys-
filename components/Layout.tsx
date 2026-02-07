import React, { useEffect, useState } from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [time, setTime] = useState(new Date());
  const [sysLoad, setSysLoad] = useState(42);

  useEffect(() => {
    const timer = setInterval(() => {
        setTime(new Date());
        // Random fluctuation for "System Load" effect
        setSysLoad(prev => Math.min(99, Math.max(10, prev + (Math.random() > 0.5 ? 2 : -2))));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-[100dvh] w-screen bg-hacker-black flex flex-col overflow-hidden relative font-sans text-hacker-text crt bg-noise bg-[size:50px_50px] bg-grid-pattern">
      {/* Ambient Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_120%)] pointer-events-none z-0" />
      
      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full w-full sm:max-w-[1500px] sm:mx-auto sm:h-[95dvh] sm:my-auto sm:border sm:border-hacker-border sm:bg-hacker-panel/95 sm:backdrop-blur-sm sm:shadow-[0_0_50px_rgba(0,0,0,0.8)] relative z-10 clip-tech-border">
        
        {/* Tech Header (Desktop) */}
        <div className="hidden sm:flex h-8 border-b border-hacker-border items-center justify-between px-3 bg-hacker-black/80">
            <div className="flex gap-2 items-center">
                <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-hacker-red animate-pulse"></div>
                    <div className="w-2 h-2 rounded-full bg-hacker-gold"></div>
                    <div className="w-2 h-2 rounded-full bg-hacker-green"></div>
                </div>
                <div className="h-4 w-px bg-hacker-border mx-2"></div>
                <div className="text-[10px] font-mono text-hacker-green tracking-widest uppercase">
                    SECURE_SHELL_V3.0 :: <span className="text-hacker-text opacity-70">ENCRYPTED</span>
                </div>
            </div>
            
            <div className="flex items-center gap-4 text-[10px] font-mono text-hacker-muted">
                 <span>MEM: {sysLoad}%</span>
                 <span>NET: <span className="text-hacker-cyan">CONNECTED</span></span>
                 <span className="text-hacker-green">{time.toLocaleTimeString()}</span>
            </div>
        </div>

        <div className="flex-1 flex flex-col sm:flex-row h-full relative overflow-hidden">
            {children}
        </div>

        {/* Tech Footer (Desktop) */}
        <div className="hidden sm:flex h-6 border-t border-hacker-border items-center justify-between px-3 bg-hacker-black/80 text-[9px] font-mono text-hacker-muted uppercase">
             <div className="flex gap-4">
                 <span>Coordinates: 23.44.11.9</span>
                 <span>Protocol: TCP/SECURE</span>
             </div>
             <div className="animate-pulse text-hacker-green">SYSTEM_STABLE</div>
        </div>
      </div>
    </div>
  );
};