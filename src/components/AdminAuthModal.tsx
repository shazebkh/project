import React, { useState } from 'react';
import {
  ShieldAlert,
  Key,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { api } from '../services/apiClient';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (adminUser: any) => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [passcode, setPasscode] = useState('');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authMethod, setAuthMethod] = useState<'passcode' | 'email'>('passcode');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.verifyAdminGateway(
        authMethod === 'passcode' ? passcode : undefined,
        authMethod === 'email' ? email : undefined,
      );
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess(res.user);
        setIsSuccess(false);
        setPasscode('');
        setEmail('');
      }, 900);
    } catch (err: any) {
      setErrorMsg(err.message || 'Access denied: Invalid administrator credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPreset = (key: string) => {
    setAuthMethod('passcode');
    setPasscode(key);
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-gradient-to-b from-gray-900 via-slate-900 to-black text-white rounded-3xl p-6 shadow-2xl border border-purple-500/30 space-y-5 my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Security Shield Header */}
        <div className="text-center space-y-2 pt-2">
          <div className="relative w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 p-0.5 shadow-lg shadow-purple-600/30 flex items-center justify-center">
            <div className="w-full h-full bg-gray-900 rounded-[14px] flex items-center justify-center text-purple-400">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-gray-900 flex items-center justify-center text-[10px]">
              🔒
            </div>
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-purple-400 bg-purple-950/80 px-2.5 py-0.5 rounded-full border border-purple-800">
              Security Gateway v2.4
            </span>
            <h3 className="text-xl font-black tracking-tight text-white mt-1.5">
              Moderator & Admin Access
            </h3>
            <p className="text-xs text-gray-400 max-w-xs mx-auto mt-0.5">
              Authentication required to review citizen disposals, triage civic alerts, and manage rewards.
            </p>
          </div>
        </div>

        {/* Method Switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-gray-800/80 rounded-xl text-xs font-semibold border border-gray-700">
          <button
            type="button"
            onClick={() => {
              setAuthMethod('passcode');
              setErrorMsg(null);
            }}
            className={`py-1.5 rounded-lg transition-all ${
              authMethod === 'passcode'
                ? 'bg-purple-600 text-white shadow-xs font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Admin Security Key
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMethod('email');
              setErrorMsg(null);
            }}
            className={`py-1.5 rounded-lg transition-all ${
              authMethod === 'email'
                ? 'bg-purple-600 text-white shadow-xs font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Authorized Moderator
          </button>
        </div>

        {/* Gateway Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {authMethod === 'passcode' ? (
            <div>
              <label className="font-semibold text-gray-300 block mb-1.5">
                Passcode / Master Security Key
              </label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3 top-3 text-purple-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter security key..."
                  required
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-hidden font-mono tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="font-semibold text-gray-300 block mb-1.5">
                Moderator Account Email
              </label>
              <div className="relative">
                <UserCheck className="w-4 h-4 absolute left-3 top-3 text-purple-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. moderator@cleanstreak.app"
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-hidden font-medium"
                />
              </div>
            </div>
          )}

          {/* Quick Demo Fill Pills */}
          <div className="space-y-1.5 bg-purple-950/30 p-2.5 rounded-xl border border-purple-900/40">
            <span className="text-[10px] uppercase font-bold text-purple-300 block">
              Authorized Test Credentials:
            </span>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => handleQuickPreset('cleanstreak-admin-2026')}
                className="px-2 py-0.5 rounded-md bg-purple-900/60 hover:bg-purple-800 text-purple-200 font-mono text-[10px] border border-purple-700/60"
              >
                cleanstreak-admin-2026
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('email');
                  setEmail('moderator@cleanstreak.app');
                }}
                className="px-2 py-0.5 rounded-md bg-purple-900/60 hover:bg-purple-800 text-purple-200 font-mono text-[10px] border border-purple-700/60"
              >
                moderator@cleanstreak.app
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-center space-x-2 p-3 bg-red-950/80 border border-red-800/80 rounded-xl text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Animation */}
          {isSuccess && (
            <div className="flex items-center justify-center space-x-2 p-3 bg-emerald-950/90 border border-emerald-600 rounded-xl text-emerald-300 font-bold animate-pulse">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Gateway Cleared! Entering Moderator Console...</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading || isSuccess}
              className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || isSuccess}
              className="flex-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center space-x-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Verifying Gateway...' : 'Unlock Admin Portal'}</span>
            </button>
          </div>
        </form>

        <p className="text-[10px] text-gray-500 text-center font-mono">
          Audit Logging Active • All administrative events recorded
        </p>
      </div>
    </div>
  );
};
