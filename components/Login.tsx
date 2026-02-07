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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
        // Simple artificial delay for effect
        await new Promise(r => setTimeout(r, 800)); 
        const user = await mockService.login(username, password);
        if (user) {
            onLogin(user);
        } else {
            setError("Incorrect password");
        }
    } catch (err) {
        setError("Server error");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-mono relative overflow-hidden">
        {/* Matrix Rain / Grid Effect Background */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{ 
            backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(0, 255, 65, .3) 25%, rgba(0, 255, 65, .3) 26%, transparent 27%, transparent 74%, rgba(0, 255, 65, .3) 75%, rgba(0, 255, 65, .3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(0, 255, 65, .3) 25%, rgba(0, 255, 65, .3) 26%, transparent 27%, transparent 74%, rgba(0, 255, 65, .3) 75%, rgba(0, 255, 65, .3) 76%, transparent 77%, transparent)',
            backgroundSize: '50px 50px'
        }}></div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
            <div className="mx-auto w-20 h-20 border border-hacker-green bg-hacker-green/5 flex items-center justify-center shadow-[0_0_20px_rgba(0,255,65,0.2)] animate-pulse mb-6 clip-tech-border">
                <svg className="w-10 h-10 text-hacker-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.131A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.2-2.858.59-4.18" />
                </svg>
            </div>
            <h2 className="text-center text-3xl font-bold text-white tracking-[0.2em] glitch-text" data-text="LOGIN">LOGIN</h2>
            <p className="mt-2 text-center text-xs text-hacker-green tracking-widest uppercase">
                Team Messenger
            </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
            <div className="bg-hacker-black/80 backdrop-blur-sm py-8 px-4 border border-hacker-green/30 shadow-[0_0_50px_rgba(0,255,65,0.05)] sm:px-10 clip-tech-border">
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <Input 
                        label="Username"
                        type="text"
                        autoComplete="username"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter username"
                    />

                    <Input 
                        label="Password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                    />

                    {error && (
                        <div className="border border-hacker-red bg-hacker-red/10 p-3">
                            <div className="flex">
                                <h3 className="text-xs font-bold text-hacker-red uppercase tracking-wide flex items-center gap-2">
                                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-hacker-red opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-hacker-red"></span>
                                    {error}
                                </h3>
                            </div>
                        </div>
                    )}

                    <Button type="submit" className="w-full h-12 text-sm" isLoading={loading}>
                        Login
                    </Button>
                </form>
            </div>
            
            <p className="mt-6 text-center text-[9px] text-hacker-muted uppercase tracking-widest">
                Authorized access only.<br/>
                IP Address Logged.
            </p>
        </div>
    </div>
  );
};