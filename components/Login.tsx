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
      const user = await mockService.login(username, password);
      if (user) {
        onLogin(user);
      } else {
        setError("Invalid credentials or account inactive.");
      }
    } catch (err) {
      setError("Login service unavailable.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111b21] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-0 left-0 w-full h-40 bg-brand-500 z-0"></div>
        
        <div className="w-full max-w-md bg-brand-panel z-10 rounded-xl shadow-2xl p-8 border border-white/5 relative">
          
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-brand-500/30">
               <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
               </svg>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">PrivaTeam</h1>
            <p className="text-gray-400 text-sm mt-2">Secure Team Communication</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="bg-brand-darker p-4 rounded-lg border border-yellow-500/10 mb-4">
              <p className="text-xs text-yellow-500/80 text-center leading-relaxed">
                <span className="font-bold block mb-1">Restricted Access</span>
                Only authorized personnel with Admin-generated credentials may access this system.
              </p>
            </div>

            <Input 
              label="User ID" 
              value={username} 
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter your username"
            />
            
            <Input 
              label="Password" 
              type="password"
              value={password} 
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full py-3" isLoading={loading}>
              Authenticate
            </Button>
            
            <div className="text-center">
                 <span className="text-xs text-gray-500">Default Admin: admin / password123</span>
            </div>
          </form>
        </div>
        
        <div className="absolute bottom-6 text-center w-full z-10 text-gray-600 text-xs">
          End-to-End Encrypted Environment &copy; 2024
        </div>
    </div>
  );
};