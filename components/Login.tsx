import React, { useState, useEffect, useRef } from 'react';
import { mockService } from '../services/storage';
import { User } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface LoginProps {
  onLogin: (user: User) => void;
}

const BOOT_SEQUENCE = [
  "INITIALIZING KERNEL...",
  "LOADING MODULES [OK]",
  "VERIFYING INTEGRITY...",
  "SYSTEM CHECK: PASSED",
  "ESTABLISHING SECURE CONNECTION...",
  "HANDSHAKE ACCEPTED",
  "MOUNTING FILESYSTEM...",
  "ACCESS GRANTED",
  "WELCOME TO ATPUKUR BOYS TERMINAL"
];

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Boot Sequence State
  const [bootStep, setBootStep] = useState(0);
  const [showLogin, setShowLogin] = useState(false);
  const bootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Determine if we should show boot sequence (e.g. first visit)
    // For now, always show it for effect
    let step = 0;
    const interval = setInterval(() => {
      if (step >= BOOT_SEQUENCE.length) {
         clearInterval(interval);
         setTimeout(() => setShowLogin(true), 800);
      } else {
         setBootStep(prev => prev + 1);
         step++;
         // Auto scroll boot logs
         if(bootRef.current) bootRef.current.scrollTop = bootRef.current.scrollHeight;
      }
    }, 150); // Speed of text lines

    // Default credentials log
    console.log("DEFAULT CREDENTIALS: admin / Habib0000");

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await mockService.login(username, password);
      if (user) {
        onLogin(user);
      } else {
        setError("ACCESS DENIED: INVALID CREDENTIALS");
      }
    } catch (err) {
      setError("SYSTEM ERROR: UNABLE TO CONNECT");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
      setter(value);
      if (error) setError('');
  };

  // Render Boot Sequence
  if (!showLogin) {
      return (
          <div className="min-h-screen bg-black font-mono text-hacker-green p-6 flex flex-col justify-end pb-20 sm:justify-start sm:pt-20">
              <div ref={bootRef} className="max-w-2xl mx-auto w-full space-y-1 overflow-y-auto max-h-[80vh] no-scrollbar">
                  {BOOT_SEQUENCE.slice(0, bootStep).map((line, idx) => (
                      <div key={idx} className="animate-matrix-fade">
                          <span className="text-hacker-muted mr-2">[{new Date().toLocaleTimeString()}]</span>
                          <span className={idx === BOOT_SEQUENCE.length - 1 ? 'text-white font-bold' : ''}>{line}</span>
                      </div>
                  ))}
                  <div className="animate-pulse">_</div>
              </div>
          </div>
      )
  }

  // Render Login Form
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden font-mono text-hacker-green bg-noise bg-[size:30px_30px] bg-grid-pattern">
        
        {/* Animated Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black z-0 pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,65,0.03),transparent)] z-0"></div>
        
        {/* Scanning Line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-hacker-green/20 animate-scanline z-0"></div>

        <div className="w-full max-w-sm z-10 flex flex-col relative animate-matrix-fade">
          {/* Terminal Window */}
          <div className="border border-hacker-border bg-hacker-black/95 backdrop-blur-xl shadow-[0_0_50px_rgba(0,255,65,0.1)] relative clip-tech-border p-[1px]">
            
            {/* Inner Border Container for double border effect */}
            <div className="bg-hacker-panel h-full w-full p-8 relative overflow-hidden">
                
                {/* Header Graphic */}
                <div className="flex flex-col items-center mb-10">
                    <div className="w-16 h-16 border-2 border-hacker-green flex items-center justify-center rounded-sm mb-4 relative shadow-[0_0_15px_rgba(0,255,65,0.3)]">
                         <div className="absolute inset-1 border border-hacker-green/30"></div>
                         <svg className="w-8 h-8 text-hacker-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                         </svg>
                    </div>
                    <h1 className="text-3xl font-bold tracking-[0.2em] text-white glitch-text mb-1" data-text="ATPUKUR_BOYS">ATPUKUR_BOYS</h1>
                    <p className="text-[10px] text-hacker-green tracking-[0.3em] uppercase opacity-70">Secure Access Terminal</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                    <div className="space-y-6">
                        <Input 
                          label="USER_IDENTITY" 
                          value={username} 
                          onChange={e => handleInputChange(setUsername, e.target.value)}
                          placeholder="ENTER_ID"
                          autoComplete="off"
                          className="bg-black/50 border-hacker-border/50"
                        />
                        
                        <Input 
                          label="SECURITY_KEY" 
                          type="password"
                          value={password} 
                          onChange={e => handleInputChange(setPassword, e.target.value)}
                          placeholder="••••••••"
                          className="bg-black/50 border-hacker-border/50"
                        />
                    </div>

                    {error && (
                      <div className="border-l-2 border-hacker-red bg-hacker-red/5 p-3 animate-pulse flex items-center gap-3">
                         <svg className="w-4 h-4 text-hacker-red" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                         <p className="text-hacker-red text-[10px] font-bold tracking-widest">{error}</p>
                      </div>
                    )}

                    <Button type="submit" className="w-full h-12 text-base shadow-[0_0_20px_rgba(0,255,65,0.1)]" isLoading={loading}>
                      <span className="mr-2">>></span> INITIATE_LOGIN
                    </Button>
                </form>

                {/* Decorative Background numbers */}
                <div className="absolute top-0 right-0 p-4 text-[8px] text-hacker-green/10 font-mono leading-tight pointer-events-none select-none text-right">
                    AF.99.21<br/>
                    88.11.00<br/>
                    SEC.99
                </div>
            </div>
          </div>
          
          {/* Footer Info */}
          <div className="mt-6 flex justify-between text-[9px] text-hacker-muted font-mono uppercase tracking-widest px-1">
              <span>Encrypted: AES-256</span>
              <span>Node: Global_1</span>
          </div>
        </div>
    </div>
  );
};