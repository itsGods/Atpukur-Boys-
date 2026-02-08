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
        await new Promise(r => setTimeout(r, 600)); // Smooth fake loading
        
        const user = await mockService.login(username, password);
        
        if (user) {
            onLogin(user);
        } else {
            setError("Login failed");
        }
    } catch (err: any) {
        // Show specific error from service (e.g. "User not found" or "Incorrect password")
        setError(err.message || "Connection failed. Try again.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center relative overflow-hidden bg-black font-sans">
        {/* Ambient Gradient Background */}
        <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[100px] animate-pulse delay-1000"></div>
        </div>

        <div className="w-full max-w-sm px-6 relative z-10 animate-slide-up">
            <div className="text-center mb-10">
                <div className="w-16 h-16 mx-auto bg-gradient-to-tr from-ios-blue to-purple-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20 mb-6">
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-semibold text-white tracking-tight">Atpukur Boys</h2>
                <p className="text-ios-subtext mt-2 text-[15px]">Secure Team Communication</p>
            </div>

            <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-2xl">
                <form className="space-y-5" onSubmit={handleSubmit}>
                    <Input 
                        label="Username"
                        type="text"
                        autoComplete="username"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your ID"
                        className="bg-black/20"
                    />

                    <Input 
                        label="Password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="bg-black/20"
                    />

                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex flex-col gap-1 animate-fade-in">
                             <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-ios-red" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span className="text-xs text-ios-red font-medium">{error}</span>
                             </div>
                             {/* Always show helper if error occurs for transparency */}
                             <p className="text-[10px] text-ios-subtext ml-6 opacity-70">
                                 Default admin: <b>Habib</b> / <b>Habib0000</b>
                             </p>
                        </div>
                    )}

                    <Button type="submit" className="w-full mt-2" isLoading={loading}>
                        Enter Workspace
                    </Button>
                </form>
            </div>
            
            <p className="text-center text-[10px] text-ios-gray mt-8 opacity-50">
                End-to-End Encrypted & Private
            </p>
        </div>
    </div>
  );
};