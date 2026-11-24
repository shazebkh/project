/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Navigation, TabType } from './components/Navigation';
import { HomeView } from './components/HomeView';
import { TimelineView } from './components/TimelineView';
import { RewardsView } from './components/RewardsView';
import { ReportView } from './components/ReportView';
import { TipsView } from './components/TipsView';
import { NearbyBinsView } from './components/NearbyBinsView';
import { WildlifeReportView } from './components/WildlifeReportView';
import { AdminView } from './components/AdminView';
import { AdminAuthModal } from './components/AdminAuthModal';
import { CameraModal } from './components/CameraModal';
import { ProfileModal } from './components/ProfileModal';
import { WelcomeModal } from './components/WelcomeModal';
import { User, Disposal, Tip } from './types';
import { api } from './services/apiClient';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState<boolean>(false);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState<boolean>(() => {
    return !localStorage.getItem('cleanstreak_welcome_seen');
  });
  const [activeWalkSessionId, setActiveWalkSessionId] = useState<string | null>(null);

  // App Data
  const [user, setUser] = useState<User | null>(null);
  const [streak, setStreak] = useState<{
    current: number;
    longest: number;
    lastActiveDate: string | null;
    freezes: number;
    nextMilestone: number;
    milestoneBonus: number;
  } | null>(null);
  const [credits, setCredits] = useState<{
    balance: number;
    lifetime: number;
    tier: string;
  } | null>(null);
  const [disposals, setDisposals] = useState<Disposal[]>([]);
  const [dailyTip, setDailyTip] = useState<Tip | null>(null);
  const [dominantWaste, setDominantWaste] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initial load
  useEffect(() => {
    loadAppData();
  }, []);

  const loadAppData = async () => {
    try {
      const [uRes, sRes, cRes, dRes, tRes] = await Promise.all([
        api.getMe(),
        api.getStreak(),
        api.getCredits(),
        api.getDisposals(),
        api.getDailyTip(),
      ]);

      setUser(uRes.user);
      setStreak(sRes);
      setCredits(cRes);
      setDisposals(dRes.disposals);
      setDailyTip(tRes.tip);
      setDominantWaste(tRes.dominant_waste_type);
    } catch (err) {
      console.error('Error loading initial app data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDispose = (walkSessionId?: string | null) => {
    setActiveWalkSessionId(walkSessionId || null);
    setIsCameraOpen(true);
  };

  const handleDisposalSuccess = async (result: any) => {
    // Refresh user state after verification
    await loadAppData();
  };

  const handleToggleAdmin = async () => {
    if (isAdminMode) {
      // Exit admin session
      api.logoutAdmin();
      setIsAdminMode(false);
      return;
    }

    // Check if current session already has verified admin credentials
    const authStatus = await api.checkAdminAuth();
    if (authStatus.authenticated) {
      setIsAdminMode(true);
    } else {
      // Require entering the Authentication Gateway
      setIsAdminAuthModalOpen(true);
    }
  };

  const handleAdminAuthSuccess = (adminUser: any) => {
    setIsAdminAuthModalOpen(false);
    setIsAdminMode(true);
    loadAppData();
  };

  // Find today's disposal if any
  const todayDate = new Date().toISOString().slice(0, 10);
  const todayDisposal = disposals.find(
    (d) => d.local_date === todayDate && (d.status === 'approved' || d.status === 'pending'),
  ) || null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-900 antialiased flex flex-col selection:bg-emerald-200">
      {/* Sticky Header */}
      <Header
        user={user}
        streak={streak}
        credits={credits}
        isAdminMode={isAdminMode}
        onToggleAdmin={handleToggleAdmin}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenWelcome={() => setIsWelcomeOpen(true)}
        onRefresh={loadAppData}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6">
        {isAdminMode ? (
          <AdminView
            onRefresh={loadAppData}
            onExitAdmin={() => {
              api.logoutAdmin();
              setIsAdminMode(false);
            }}
          />
        ) : (
          <>
            {currentTab === 'home' && (
              <HomeView
                user={user}
                streak={streak}
                credits={credits}
                todayDisposal={todayDisposal}
                dailyTip={dailyTip}
                dominantWaste={dominantWaste}
                onOpenDispose={handleOpenDispose}
                onNavigateToTab={(tab) => setCurrentTab(tab)}
                onOpenWelcome={() => setIsWelcomeOpen(true)}
                onRefresh={loadAppData}
              />
            )}

            {currentTab === 'timeline' && (
              <TimelineView
                disposals={disposals}
                onOpenDispose={() => handleOpenDispose()}
              />
            )}

            {currentTab === 'rewards' && (
              <RewardsView
                balance={credits?.balance || 0}
                lifetime={credits?.lifetime || 0}
                tier={credits?.tier || 'bronze'}
                onRefresh={loadAppData}
              />
            )}

            {currentTab === 'report' && (
              <ReportView onRefresh={loadAppData} />
            )}

            {currentTab === 'tips' && (
              <TipsView onRefresh={loadAppData} />
            )}

            {currentTab === 'bins' && (
              <NearbyBinsView />
            )}

            {currentTab === 'wildlife' && (
              <WildlifeReportView onRefresh={loadAppData} />
            )}
          </>
        )}
      </main>

      {/* Bottom Sticky Navigation */}
      {!isAdminMode && (
        <Navigation
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          onOpenDispose={() => handleOpenDispose()}
        />
      )}

      {/* Camera Live Modal */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        walkSessionId={activeWalkSessionId}
        onSuccess={handleDisposalSuccess}
      />

      {/* Admin Authentication Gateway Modal */}
      <AdminAuthModal
        isOpen={isAdminAuthModalOpen}
        onClose={() => setIsAdminAuthModalOpen(false)}
        onSuccess={handleAdminAuthSuccess}
      />

      {/* Profile & Settings Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        onUpdate={loadAppData}
      />

      {/* Purpose & Welcome Modal */}
      <WelcomeModal
        isOpen={isWelcomeOpen}
        onClose={() => setIsWelcomeOpen(false)}
        onNavigateToTab={(tab) => setCurrentTab(tab as TabType)}
        onOpenDispose={() => handleOpenDispose()}
      />
    </div>
  );
}
