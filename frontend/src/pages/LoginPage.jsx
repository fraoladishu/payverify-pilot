import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Eye, EyeOff, Lock, User } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between items-center bg-[#F8FAFC] px-4 py-8 sm:py-12">
      {/* Top Section / Header */}
      <div className="w-full max-w-sm flex flex-col items-center text-center mt-4">
        {/* Figma Brand Logo */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 mb-3">
          <ShieldCheck className="w-10 h-10 stroke-[2.2]" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Pay<span className="text-emerald-600">Verify</span>
        </h1>
        <p className="text-xs font-semibold text-slate-500 mt-1">
          Verified Payments, Instantly.
        </p>
      </div>

      {/* Main Login Card (Matching Figma Screen 1) */}
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 sm:p-8 shadow-card border border-slate-100 my-auto">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900">Staff Portal</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Enter credentials to start verifying merchant tables
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username / Staff ID Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Username or Staff ID
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. ethio_waiter12"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Log In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-60"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <span>Log In</span>
            )}
          </button>

          {/* Forgot Password */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => alert('Please contact the Restaurant Manager or Cashier Supervisor to reset your staff credentials.')}
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 underline"
            >
              Forgot password?
            </button>
          </div>
        </form>

        {/* Portal Security Note */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <p className="text-[11px] font-semibold text-slate-400">
            Sign in with your assigned staff username and password.
          </p>
        </div>
      </div>

      {/* Footer (Matching Figma screen) */}
      <div className="w-full max-w-sm text-center mt-6">
        <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 inline" />
          <span>Secured for Ethiopian Merchants & Restaurants</span>
        </p>
      </div>
    </div>
  );
}
