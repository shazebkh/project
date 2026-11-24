import React from 'react';
import { Flame, Shield, Award, User as UserIcon, Coins, Sparkles, RefreshCw, HelpCircle } from 'lucide-react';
import { User, UserStreak } from '../types';

interface HeaderProps {
  user: User | null;
  streak: { current: number; longest: number; freezes: number } | null;
  credits: { balance: number; lifetime: number; tier: string } | null;
  isAdminMode: boolean;
  onToggleAdmin: () => void;
  onOpenProfile: () => void;
  onOpenWelcome?: () => void;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  streak,
  credits,
  isAdminMode,
  onToggleAdmin,
  onOpenProfile,
  onOpenWelcome,
  onRefresh,
}) => {
  const tierColor = {
    bronze: 'bg-amber-100 text-amber-800 border-amber-300',
    silver: 'bg-slate-100 text-slate-700 border-slate-300',
    gold: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    platinum: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  }[credits?.tier || 'bronze'];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-emerald-100 shadow-xs">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-emerald-800 to-teal-700 bg-clip-text text-transparent">
                CleanStreak
              </span>
              {isAdminMode && (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-purple-100 text-purple-700 border border-purple-200 uppercase tracking-wide">
                  Mod Queue
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 font-medium">Daily Waste Disposal Habit</p>
          </div>
        </div>

        {/* Status Indicators: Streak & Credits */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Streak Flame Badge */}
          <div
            title={`Current streak: ${streak?.current || 0} days. Freezes available: ${streak?.freezes || 0}`}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold shadow-xs cursor-pointer hover:bg-orange-100 transition-colors"
          >
            <Flame className="w-4 h-4 text-orange-500 fill-orange-500 animate-pulse" />
            <span>{streak?.current ?? 0}</span>
            <span className="text-[10px] text-orange-400 font-normal">
              ({streak?.freezes ?? 0} ❄️)
            </span>
          </div>

          {/* Credits & Tier Badge */}
          <div
            title={`Balance: ${credits?.balance || 0} credits. Lifetime: ${credits?.lifetime || 0} credits (${credits?.tier} tier)`}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full border text-xs font-bold shadow-xs ${tierColor}`}
          >
            <Coins className="w-4 h-4 text-amber-500 fill-amber-400" />
            <span>{credits?.balance ?? 0}</span>
            <span className="hidden sm:inline-block text-[10px] uppercase font-semibold opacity-75">
              • {credits?.tier}
            </span>
          </div>

          {/* Admin / Moderator Gateway Toggle */}
          <button
            onClick={onToggleAdmin}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 border transition-all ${
              isAdminMode
                ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20'
                : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
            }`}
            title={isAdminMode ? 'Lock & Exit Admin Console' : 'Open Admin Authentication Gateway'}
          >
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline font-bold">{isAdminMode ? 'Exit Admin' : 'Admin Gateway'}</span>
          </button>

          {/* Welcome / Purpose Guide */}
          {onOpenWelcome && (
            <button
              onClick={onOpenWelcome}
              className="p-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-all shadow-xs"
              title="Why CleanStreak was built & Our Purpose"
            >
              <HelpCircle className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline font-bold">Our Purpose</span>
            </button>
          )}

          {/* User Profile */}
          <button
            onClick={onOpenProfile}
            className="w-9 h-9 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-200 transition-colors"
            title="User Profile & Settings"
          >
            <UserIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
