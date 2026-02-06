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
        setError("Invalid ID or Password");
      }
    } catch (err) {
      setError("Service Unavailable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
        
        {/* Apple-style Gradient Blob Background */}
        <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-ios-blue/20 rounded-full blur-[100px] opacity-50 animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] bg-ios-green/20 rounded-full blur-[100px] opacity-30"></div>

        <div className="w-full max-w-sm z-10 flex flex-col items-center animate-fade-in">
          
          <div className="mb-10 flex flex-col items-center">
            <div className="w-20 h-20 bg-gradient-to-br from-ios-green to-teal-600 rounded-[22px] flex items-center justify-center shadow-2xl shadow-ios-green/20 mb-6">
               <svg className="w-10 h-10 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
               </svg>
            </div>
            <h1 className="text-[28px] font-bold text-white tracking-tight">PrivaTeam</h1>
            <p className="text-ios-gray text-[17px] mt-1">Sign in with your Team ID</p>
          </div>

          <form onSubmit={handleSubmit} className="w-full space-y-6">
            <div className="space-y-4">
                <Input 
                  label="User ID" 
                  value={username} 
                  onChange={e => setUsername(e.target.value)}
                  placeholder="name@team"
                  className="bg-ios-card2/50 backdrop-blur-md"
                />
                
                <Input 
                  label="Password" 
                  type="password"
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Required"
                  className="bg-ios-card2/50 backdrop-blur-md"
                />
            </div>

            {error && (
              <p className="text-ios-red text-center text-sm font-medium animate-pulse">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full mt-4" isLoading={loading}>
              Sign In
            </Button>
            
            <div className="text-center mt-6">
                 <button type="button" className="text-ios-blue text-[15px] hover:underline" onClick={() => alert("Contact System Administrator")}>
                    Forgot Password?
                 </button>
            </div>
            <div className="text-center mt-2">
                 <span className="text-[11px] text-gray-600 font-mono">admin / password123</span>
            </div>
          </form>
        </div>
        
        <div className="absolute bottom-8 text-center w-full z-10">
           <p className="text-[11px] text-ios-gray/50 tracking-widest uppercase">Secure Environment</p>
        </div>
    </div>
  );
};