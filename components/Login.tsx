import React, { useState } from 'react';
import { mockService } from '../services/storage';
import { User } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
        await new Promise(r => setTimeout(r, 800)); // Simulate connection delay
        const user = await mockService.login(username, password);
        if (user) onLogin(user);
        else setError("ACCESS DENIED: INVALID CREDENTIALS");
    } catch (e) {
        setError("SYSTEM FAILURE: CONNECTION REFUSED");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-cyber-black relative overflow-hidden p-4">
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,65,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,65,0.03)_1px,transparent_1px)] bg-[size:30px_30px]"></div>
        
        <div className="w-full max-w-md relative z-10 glass-panel p-8 border-l-4 border-l-cyber-green shadow-2xl animate-fade-in">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-cyber-green tracking-tighter mb-2 glitch-text">
                    NEXUS<span className="text-white">_UPLINK</span>
                </h1>
                <p className="text-cyber-subtext text-xs uppercase tracking-widest">Secure Communication Protocol v4.0</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <Input 
                    label="IDENTITY"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="ENTER_USERNAME"
                    autoComplete="off"
                />
                <Input 
                    label="ACCESS_CODE"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                />

                {error && (
                    <div className="bg-cyber-red/10 border border-cyber-red/30 p-3 text-cyber-red text-xs font-mono animate-pulse-fast">
                        &gt; ERROR: {error}
                    </div>
                )}

                <Button type="submit" className="w-full" isLoading={loading}>
                    INITIALIZE_SESSION
                </Button>
            </form>
            
            <div className="mt-8 pt-4 border-t border-cyber-border text-[10px] text-cyber-subtext flex justify-between font-mono">
                <span>STATUS: WAITING_FOR_INPUT</span>
                <span className="animate-pulse text-cyber-green">● SYSTEM_READY</span>
            </div>
        </div>
    </div>
  );
};