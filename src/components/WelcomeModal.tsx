import React, { useState } from 'react';
import {
  Sparkles,
  MapPin,
  HeartHandshake,
  Flame,
  Camera,
  CheckCircle2,
  X,
  Footprints,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  Globe2,
  HelpCircle,
  Truck,
  Stethoscope,
} from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab?: (tab: string) => void;
  onOpenDispose?: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onClose,
  onNavigateToTab,
  onOpenDispose,
}) => {
  const [activeTab, setActiveTab] = useState<'mission' | 'how_it_works' | 'impact'>('mission');

  if (!isOpen) return null;

  const handleDismiss = () => {
    localStorage.setItem('cleanstreak_welcome_seen', 'true');
    onClose();
  };

  const handleQuickAction = (action: () => void) => {
    handleDismiss();
    action();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full my-auto shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header Bar */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-200">
                About CleanStreak · Civic Movement
              </span>
              <h2 className="text-lg sm:text-xl font-black tracking-tight">
                The Purpose of CleanStreak
              </h2>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Close Welcome Page"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 bg-gray-50/80 px-6 pt-2 gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('mission')}
            className={`pb-2.5 px-3 border-b-2 transition-all ${
              activeTab === 'mission'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            🎯 Why We Built This
          </button>
          <button
            onClick={() => setActiveTab('how_it_works')}
            className={`pb-2.5 px-3 border-b-2 transition-all ${
              activeTab === 'how_it_works'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            ⚙️ How It Works
          </button>
          <button
            onClick={() => setActiveTab('impact')}
            className={`pb-2.5 px-3 border-b-2 transition-all ${
              activeTab === 'impact'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            🌱 Community & Wildlife Impact
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-gray-700">
          
          {/* TAB 1: MISSION & PURPOSE */}
          {activeTab === 'mission' && (
            <div className="space-y-5">
              {/* Mission Statement Box */}
              <div className="rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-white border border-emerald-200/80 p-4 sm:p-5">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                  Our Core Mission
                </span>
                <p className="text-sm sm:text-base font-semibold text-gray-900 leading-snug">
                  "To turn proper waste disposal into a rewarding daily habit, eliminate the excuse that 'there are no dustbins nearby', and build a compassionate community response network for injured urban wildlife."
                </p>
              </div>

              {/* The Three Fundamental Problems We Solve */}
              <div>
                <h3 className="font-extrabold text-xs text-gray-400 uppercase tracking-wider mb-3">
                  The Three Problems CleanStreak Solves
                </h3>
                <div className="grid sm:grid-cols-3 gap-3">
                  
                  {/* Problem 1 */}
                  <div className="rounded-2xl bg-white border border-gray-200 p-4 space-y-2 hover:border-emerald-300 transition-colors shadow-2xs">
                    <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                      <Flame className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-xs text-gray-900">1. Litter is Invisible & Unrewarded</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Most people litter because throwing trash away feels like a chore that goes unnoticed. CleanStreak gamifies civic hygiene with daily streaks, walking fitness metrics, and real credit rewards.
                    </p>
                  </div>

                  {/* Problem 2 */}
                  <div className="rounded-2xl bg-white border border-gray-200 p-4 space-y-2 hover:border-teal-300 transition-colors shadow-2xs">
                    <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center font-bold text-sm">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-xs text-gray-900">2. The "No Dustbin Nearby" Excuse</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      People drop garbage on roads claiming they couldn't find a bin. Our live interactive map locates every public dustbin within a 3km radius with walking directions, eliminating that excuse.
                    </p>
                  </div>

                  {/* Problem 3 */}
                  <div className="rounded-2xl bg-white border border-gray-200 p-4 space-y-2 hover:border-rose-300 transition-colors shadow-2xs">
                    <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-sm">
                      <HeartHandshake className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-xs text-gray-900">3. Helpless Injured Animals</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Stray dogs, cows, birds, and cats get injured by vehicles or trapped in plastic trash without any swift rescue. CleanStreak gives citizens a camera to report them with GPS and dispatch rescue units.
                    </p>
                  </div>
                </div>
              </div>

              {/* The Philosophy */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs text-slate-700 space-y-1.5">
                <span className="font-bold text-slate-900 block">Why the Live Camera Watermarking Matters:</span>
                <p className="leading-relaxed">
                  Every photo clicked in CleanStreak is permanently burned with <strong>Date, Time (to the second), and GPS Coordinates</strong> directly into the image canvas. This guarantees verified proof for civic authorities, stops fraud, and gives animal rescue teams the exact street spot where an injured creature needs emergency veterinary attention.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: HOW IT WORKS */}
          {activeTab === 'how_it_works' && (
            <div className="space-y-4">
              <div className="text-xs text-gray-500 font-medium">
                CleanStreak is built around 4 simple everyday actions:
              </div>

              <div className="space-y-3">
                {/* Step 1 */}
                <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/60">
                  <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-emerald-950">Walk to a Dustbin & Snap Live Photo</h4>
                    <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                      Start your walking tracker to burn calories on your way to a bin. Snap a photo of trash entering the dustbin. The app stamps it with date, time, and GPS, preserving your daily streak and granting +10 credits!
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200/60">
                  <div className="w-7 h-7 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-teal-950">Locate Nearest Receptacles under 3 Kilometers</h4>
                    <p className="text-xs text-teal-800 mt-0.5 leading-relaxed">
                      Need to dispose of something right now? Open the <strong>Bins &lt;3km</strong> tab to view verified general, dry, wet, and recycling bins in your immediate vicinity with distance meters and navigation links.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200/60">
                  <div className="w-7 h-7 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-rose-950">Report Injured Wildlife & Dispatch Help</h4>
                    <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
                      If you come across a stray animal with a fracture, bleeding, or trapped in netting, take a watermarked photo in the <strong>🐾 Wildlife</strong> section. Admins assign rapid response vet teams who arrive, diagnose, and treat the animal.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/60">
                  <div className="w-7 h-7 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-amber-950">Redeem Eco-Rewards & Support Real Initiatives</h4>
                    <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                      Use credits accumulated from proper disposal, walks, quizzes, and rescue reports to sponsor tree planting, unlock sustainable product discounts, and climb user tiers.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: COMMUNITY & WILDLIFE IMPACT */}
          {activeTab === 'impact' && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-gradient-to-r from-teal-900 to-emerald-950 text-white p-5 space-y-3">
                <div className="flex items-center space-x-2">
                  <Globe2 className="w-5 h-5 text-teal-400" />
                  <h4 className="text-sm font-bold">The Collective Impact of One Action a Day</h4>
                </div>
                <p className="text-xs text-teal-200 leading-relaxed">
                  When 1,000 citizens dispose of their waste responsibly every day instead of tossing it onto sidewalks, over 30,000 pieces of trash stay off our city streets every single month. By pairing cleanliness with wildlife compassion, our streets become safe for both humans and animals.
                </p>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-teal-800 text-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-teal-300">Clean Streets</span>
                    <p className="text-base font-black text-white">100%</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-teal-300">Bin Visibility</span>
                    <p className="text-base font-black text-white">&lt;3 km</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-teal-300">Wildlife Care</span>
                    <p className="text-base font-black text-white">24/7 Aid</p>
                  </div>
                </div>
              </div>

              {/* Safety & Integrity */}
              <div className="bg-white rounded-2xl p-4 border border-gray-200 space-y-2">
                <div className="flex items-center space-x-2 font-bold text-xs text-gray-900">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Accountability & Security Built In</span>
                </div>
                <ul className="text-xs text-gray-600 space-y-1.5 list-disc list-inside">
                  <li><strong>Anti-Cheating Camera:</strong> Live capture required with canvas metadata stamping (no recycled gallery uploads).</li>
                  <li><strong>Admin Verification Gateway:</strong> Secure moderator review queue for ambiguous pictures and emergency team dispatching.</li>
                  <li><strong>Perceptual Hashing (pHash):</strong> Duplicate image detection prevents re-uploading identical disposal shots.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Quick Jump Buttons */}
          <div className="pt-2 border-t border-gray-200">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2.5">
              Jump Straight Into Action:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => handleQuickAction(() => onOpenDispose && onOpenDispose())}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-xs transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Snap Disposal</span>
              </button>

              <button
                onClick={() => handleQuickAction(() => onNavigateToTab && onNavigateToTab('bins'))}
                className="py-2.5 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold flex items-center justify-center space-x-1.5 border border-teal-200 shadow-xs transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-teal-600" />
                <span>Find Bins (&lt;3km)</span>
              </button>

              <button
                onClick={() => handleQuickAction(() => onNavigateToTab && onNavigateToTab('wildlife'))}
                className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold flex items-center justify-center space-x-1.5 border border-rose-200 shadow-xs transition-colors"
              >
                <HeartHandshake className="w-3.5 h-3.5 text-rose-600" />
                <span>Report Injured Animal</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Bar */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="text-[11px] text-gray-500 font-medium">
            Join the CleanStreak community habit today.
          </div>
          <button
            onClick={handleDismiss}
            className="py-2 px-5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold shadow-xs transition-colors flex items-center space-x-1"
          >
            <span>Enter App</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
