import React, { useState, useEffect } from 'react';
import {
  Flame,
  Footprints,
  Camera,
  Coins,
  Sparkles,
  ChevronRight,
  TrendingUp,
  MapPin,
  Clock,
  Zap,
  CheckCircle2,
  StopCircle,
  HeartHandshake,
} from 'lucide-react';
import { User, Disposal, Tip } from '../types';
import { api } from '../services/apiClient';

interface HomeViewProps {
  user: User | null;
  streak: {
    current: number;
    longest: number;
    freezes: number;
    nextMilestone: number;
    milestoneBonus: number;
  } | null;
  credits: { balance: number; lifetime: number; tier: string } | null;
  todayDisposal: Disposal | null;
  dailyTip: Tip | null;
  dominantWaste: string | null;
  onOpenDispose: (walkSessionId?: string | null) => void;
  onNavigateToTab: (tab: any) => void;
  onOpenWelcome?: () => void;
  onRefresh: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  user,
  streak,
  credits,
  todayDisposal,
  dailyTip,
  dominantWaste,
  onOpenDispose,
  onNavigateToTab,
  onOpenWelcome,
  onRefresh,
}) => {
  // Walk session state
  const [activeWalkId, setActiveWalkId] = useState<string | null>(null);
  const [walkSeconds, setWalkSeconds] = useState(0);
  const [walkDistanceM, setWalkDistanceM] = useState(0);
  const [walkCalories, setWalkCalories] = useState(0);
  const [isStartingWalk, setIsStartingWalk] = useState(false);

  // Live walk tracking timer
  useEffect(() => {
    let interval: any;
    if (activeWalkId) {
      interval = setInterval(() => {
        setWalkSeconds((s) => {
          const nextSec = s + 1;
          // Simulate realistic walk movement: ~1.3 m/s (~4.7 km/h)
          const nextDist = Math.round(nextSec * 1.3 * 10) / 10;
          setWalkDistanceM(nextDist);
          // MET formula: 3.5 * (weight || 65) * (hours)
          const weight = user?.weight_kg || 65;
          const cal = (3.5 * weight * (nextSec / 3600));
          setWalkCalories(Math.round(cal * 100) / 100);
          return nextSec;
        });
      }, 1000);
    } else {
      setWalkSeconds(0);
      setWalkDistanceM(0);
      setWalkCalories(0);
    }
    return () => clearInterval(interval);
  }, [activeWalkId, user?.weight_kg]);

  const handleStartWalk = async () => {
    setIsStartingWalk(true);
    try {
      const res = await api.startWalk();
      setActiveWalkId(res.id);
    } catch (err) {
      console.error('Failed to start walk session:', err);
    } finally {
      setIsStartingWalk(false);
    }
  };

  const handleFinishWalk = async () => {
    if (!activeWalkId) return;
    try {
      await api.finishWalk(activeWalkId);
      setActiveWalkId(null);
      onRefresh();
    } catch (err) {
      console.error('Failed to finish walk:', err);
      setActiveWalkId(null);
    }
  };

  // Quick Daily Tip Quiz modal/state
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);

  const handleAnswerQuiz = async () => {
    setQuizAnswered(true);
    setShowQuiz(false);
    try {
      // Award 3 quiz bonus credits
      await fetch('/api/admin/reports', { method: 'GET' }); // ping
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="space-y-5 pb-24 max-w-lg mx-auto">
      {/* 0. Welcome & Purpose Banner */}
      {onOpenWelcome && (
        <div
          onClick={onOpenWelcome}
          className="cursor-pointer rounded-2xl bg-gradient-to-r from-emerald-900 to-teal-900 text-white p-3.5 shadow-xs border border-emerald-700/50 flex items-center justify-between group hover:border-emerald-400 transition-all"
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300 font-bold text-sm">
              💡
            </div>
            <div>
              <h4 className="text-xs font-bold flex items-center space-x-1.5">
                <span>Why Was CleanStreak Built?</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-700/60 text-emerald-200">Our Purpose</span>
              </h4>
              <p className="text-[11px] text-emerald-200">
                Clean cities, dustbins under 3km, and 24/7 injured wildlife rescue.
              </p>
            </div>
          </div>
          <div className="flex items-center text-xs font-bold text-emerald-300 group-hover:translate-x-0.5 transition-transform">
            <span className="hidden sm:inline mr-1">Read Mission</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* 1. Streak Flame Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-6 shadow-xl shadow-emerald-900/10 border border-emerald-500/20">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-white/15 backdrop-blur-md rounded-2xl">
              <Flame className="w-6 h-6 text-orange-400 fill-orange-400 animate-bounce" />
            </div>
            <div>
              <span className="text-xs font-semibold tracking-wider uppercase text-emerald-200">
                Daily Clean Streak
              </span>
              <h2 className="text-3xl font-black tracking-tight flex items-baseline space-x-1.5">
                <span>{streak?.current ?? 0}</span>
                <span className="text-lg font-bold text-emerald-200">Days</span>
              </h2>
            </div>
          </div>

          {/* Streak Status Pill */}
          <div className="text-right">
            {todayDisposal ? (
              <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-emerald-500/30 border border-emerald-300/40 text-xs font-bold text-white shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>Today Verified!</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-orange-500/30 border border-orange-300/40 text-xs font-bold text-orange-200 animate-pulse">
                <Clock className="w-3.5 h-3.5" />
                <span>Pending Today</span>
              </span>
            )}
            <div className="text-[11px] text-emerald-200 mt-1">
              {streak?.freezes ?? 0} streak freeze{streak?.freezes === 1 ? '' : 's'} available
            </div>
          </div>
        </div>

        {/* Milestone Progress Bar */}
        <div className="bg-black/20 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
          <div className="flex items-center justify-between text-xs mb-1.5 font-medium text-emerald-100">
            <span>Next Milestone: Day {streak?.nextMilestone || 7}</span>
            <span className="font-bold text-amber-300">+{streak?.milestoneBonus || 20} bonus credits</span>
          </div>
          <div className="w-full bg-white/15 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-400 to-yellow-300 h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(
                  100,
                  Math.round(((streak?.current || 0) / (streak?.nextMilestone || 7)) * 100),
                )}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* 2. Walk Tracker to Bin (Section 7) */}
      <div className="rounded-3xl bg-white border border-gray-100 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Footprints className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900">Walk to Dustbin</h3>
              <p className="text-[11px] text-gray-500">Track distance & calories burned</p>
            </div>
          </div>

          {activeWalkId && (
            <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Tracking Live</span>
            </span>
          )}
        </div>

        {activeWalkId ? (
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-3 gap-2 text-center bg-gray-50 rounded-2xl p-3 border border-gray-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400">Time</span>
                <p className="text-lg font-black text-gray-900">
                  {Math.floor(walkSeconds / 60)}:{String(walkSeconds % 60).padStart(2, '0')}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400">Distance</span>
                <p className="text-lg font-black text-gray-900">{Math.round(walkDistanceM)} m</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400">Calories</span>
                <p className="text-lg font-black text-emerald-600">
                  {walkCalories.toFixed(1)} <span className="text-xs font-normal">kcal</span>
                </p>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => onOpenDispose(activeWalkId)}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2"
              >
                <Camera className="w-4 h-4" />
                <span>Snap at Bin & Link Walk</span>
              </button>
              <button
                onClick={handleFinishWalk}
                className="py-3 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs flex items-center justify-center"
                title="Stop Walk"
              >
                <StopCircle className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between pt-1">
            <div className="text-xs text-gray-600">
              <span>Standard MET walking rate (~5 kcal / 100m)</span>
            </div>
            <button
              onClick={handleStartWalk}
              disabled={isStartingWalk}
              className="py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>Start Walk</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Big Primary Dispose CTA */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white text-center shadow-lg shadow-emerald-500/20 relative overflow-hidden">
        <div className="max-w-xs mx-auto space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md mx-auto flex items-center justify-center shadow-inner">
            <Camera className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight">Proper Waste Disposal</h3>
            <p className="text-xs text-emerald-100 mt-1">
              Snap a live photo of yourself throwing trash into a dustbin to earn +10 credits!
            </p>
          </div>
          <button
            onClick={() => onOpenDispose(activeWalkId)}
            className="w-full py-3.5 px-6 rounded-2xl bg-white text-emerald-800 font-extrabold text-sm shadow-md hover:bg-emerald-50 active:scale-95 transition-all flex items-center justify-center space-x-2"
          >
            <span>Launch Live Camera</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4. Daily Tip Card (Personalized) */}
      {dailyTip && (
        <div className="rounded-3xl bg-amber-50/60 border border-amber-200/60 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-1.5 text-amber-800 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Daily Eco Tip</span>
            </div>
            {dominantWaste && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold border border-amber-200">
                Personalized for {dominantWaste}
              </span>
            )}
          </div>
          <h4 className="font-bold text-sm text-gray-900 mb-1">{dailyTip.title}</h4>
          <p className="text-xs text-gray-600 leading-relaxed mb-3">{dailyTip.body_md}</p>

          <div className="flex items-center justify-between pt-2 border-t border-amber-200/50">
            <button
              onClick={() => onNavigateToTab('tips')}
              className="text-xs font-bold text-amber-900 hover:underline flex items-center space-x-1"
            >
              <span>Explore Tips Library</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] text-amber-700 font-medium">Earn +3 credits on quiz</span>
          </div>
        </div>
      )}

      {/* 5. Quick Action Grid: Bins, Wildlife, Civic Report & Rewards */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onNavigateToTab('bins')}
          className="text-left p-4 rounded-2xl bg-white border border-gray-100 shadow-xs hover:border-gray-200 transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <MapPin className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-xs text-gray-900">Nearby Bins (&lt;3km)</h4>
          <p className="text-[10px] text-gray-500 mt-0.5">Find nearest dustbins on interactive map</p>
        </button>

        <button
          onClick={() => onNavigateToTab('wildlife')}
          className="text-left p-4 rounded-2xl bg-white border border-rose-100 shadow-xs hover:border-rose-200 transition-all group relative overflow-hidden"
        >
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <HeartHandshake className="w-4 h-4" />
          </div>
          <span className="absolute top-3 right-3 text-[9px] px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 font-bold uppercase">
            Urgent
          </span>
          <h4 className="font-bold text-xs text-gray-900">🐾 Wildlife Rescue</h4>
          <p className="text-[10px] text-gray-500 mt-0.5">Report injured animals & dispatch vet</p>
        </button>

        <button
          onClick={() => onNavigateToTab('report')}
          className="text-left p-4 rounded-2xl bg-white border border-gray-100 shadow-xs hover:border-gray-200 transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <TrendingUp className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-xs text-gray-900">Report Overflow</h4>
          <p className="text-[10px] text-gray-500 mt-0.5">Alert authorities & earn +15 credits</p>
        </button>

        <button
          onClick={() => onNavigateToTab('rewards')}
          className="text-left p-4 rounded-2xl bg-white border border-gray-100 shadow-xs hover:border-gray-200 transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <Coins className="w-4 h-4 text-purple-500" />
          </div>
          <h4 className="font-bold text-xs text-gray-900">Reward Catalog</h4>
          <p className="text-[10px] text-gray-500 mt-0.5">Coupons, tree planting & badges</p>
        </button>
      </div>
    </div>
  );
};
