import {
  User,
  Disposal,
  UserStreak,
  CreditLedgerEntry,
  Reward,
  Redemption,
  Bin,
  Report,
  ReportEvent,
  Tip,
  WalkSession,
  WildlifeReport,
} from '../types';

const BASE_URL = '/api';

function getAuthHeader(preferAdmin = false): Record<string, string> {
  let token = localStorage.getItem('cleanstreak_token') || 'demo-user-1';
  if (preferAdmin) {
    const adminToken = sessionStorage.getItem('cleanstreak_admin_token');
    if (adminToken) token = adminToken;
  }
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export const api = {
  // Auth & Profile
  async getMe(): Promise<{ user: User }> {
    const res = await fetch(`${BASE_URL}/me`, { headers: getAuthHeader() });
    if (!res.ok) throw new Error('Failed to load profile');
    return res.json();
  },

  async updateProfile(data: Partial<User>): Promise<{ user: User }> {
    const res = await fetch(`${BASE_URL}/me`, {
      method: 'PATCH',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return res.json();
  },

  // Streaks & Credits
  async getStreak(): Promise<{
    current: number;
    longest: number;
    lastActiveDate: string | null;
    freezes: number;
    nextMilestone: number;
    milestoneBonus: number;
  }> {
    const res = await fetch(`${BASE_URL}/me/streak`, { headers: getAuthHeader() });
    if (!res.ok) throw new Error('Failed to load streak');
    return res.json();
  },

  async getCredits(): Promise<{
    balance: number;
    lifetime: number;
    tier: string;
    ledger: CreditLedgerEntry[];
  }> {
    const res = await fetch(`${BASE_URL}/me/credits`, { headers: getAuthHeader() });
    if (!res.ok) throw new Error('Failed to load credits');
    return res.json();
  },

  // Disposals
  async getDisposals(from?: string, to?: string): Promise<{ disposals: Disposal[] }> {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const res = await fetch(`${BASE_URL}/disposals?${params.toString()}`, { headers: getAuthHeader() });
    if (!res.ok) throw new Error('Failed to load disposals');
    return res.json();
  },

  async submitDisposal(data: {
    photo_key?: string;
    photo_data: string;
    lat: number;
    lng: number;
    gps_accuracy_m?: number;
    captured_at: string;
    walk_session_id?: string;
  }): Promise<{ id: string; status: Disposal['status']; confidence?: number; local_date: string; reject_reason?: string }> {
    const res = await fetch(`${BASE_URL}/disposals`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to submit disposal');
    }
    return json;
  },

  // Walks
  async startWalk(): Promise<{ id: string; started_at: string }> {
    const res = await fetch(`${BASE_URL}/walks/start`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to start walk');
    return res.json();
  },

  async sendWalkPoints(id: string, points: Array<{ lat: number; lng: number; accuracy: number; ts: number }>): Promise<void> {
    await fetch(`${BASE_URL}/walks/${id}/points`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ points }),
    });
  },

  async finishWalk(id: string): Promise<{
    id: string;
    distance_m: number;
    duration_s: number;
    avg_speed_kmh: number;
    calories_kcal: number;
    is_calorie_estimate: boolean;
  }> {
    const res = await fetch(`${BASE_URL}/walks/${id}/finish`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to finish walk');
    return res.json();
  },

  // Rewards
  async getRewards(): Promise<{
    rewards: Array<Reward & { locked: boolean; can_redeem: boolean }>;
    userTier: string;
    balance: number;
  }> {
    const res = await fetch(`${BASE_URL}/rewards`, { headers: getAuthHeader() });
    if (!res.ok) throw new Error('Failed to load rewards');
    return res.json();
  },

  async redeemReward(rewardId: string): Promise<{ code: string; balance: number; redemption: Redemption }> {
    const res = await fetch(`${BASE_URL}/rewards/${rewardId}/redeem`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || 'Failed to redeem reward');
    return json;
  },

  async getMyRedemptions(): Promise<{ redemptions: Redemption[] }> {
    const res = await fetch(`${BASE_URL}/me/redemptions`, { headers: getAuthHeader() });
    if (!res.ok) throw new Error('Failed to load redemptions');
    return res.json();
  },

  // Civic Reports
  async getReports(mineOnly = false): Promise<{ reports: Report[] }> {
    const res = await fetch(`${BASE_URL}/reports?mine=${mineOnly}`, { headers: getAuthHeader() });
    if (!res.ok) throw new Error('Failed to load reports');
    return res.json();
  },

  async getReportDetails(id: string): Promise<{ report: Report; events: ReportEvent[] }> {
    const res = await fetch(`${BASE_URL}/reports/${id}`, { headers: getAuthHeader() });
    if (!res.ok) throw new Error('Failed to load report');
    return res.json();
  },

  async submitReport(data: {
    category: Report['category'];
    description?: string;
    photo_keys: string[];
    lat: number;
    lng: number;
    address_text?: string;
    severity?: number;
  }): Promise<{ report: Report; is_duplicate: boolean; message?: string }> {
    const res = await fetch(`${BASE_URL}/reports`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || 'Failed to submit report');
    return json;
  },

  async supportReport(id: string): Promise<{ report: Report }> {
    const res = await fetch(`${BASE_URL}/reports/${id}/support`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to support report');
    return res.json();
  },

  async confirmReportResolved(id: string): Promise<{ report: Report; credits_awarded: number }> {
    const res = await fetch(`${BASE_URL}/reports/${id}/confirm-resolved`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to confirm report resolution');
    return res.json();
  },

  // Tips & Bins
  async getDailyTip(): Promise<{ tip: Tip; dominant_waste_type: string | null }> {
    const res = await fetch(`${BASE_URL}/tips/daily`, { headers: getAuthHeader() });
    if (!res.ok) throw new Error('Failed to load daily tip');
    return res.json();
  },

  async getTips(category?: string, lang?: string): Promise<{ tips: Tip[] }> {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (lang) params.set('lang', lang);
    const res = await fetch(`${BASE_URL}/tips?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to load tips');
    return res.json();
  },

  async getNearbyBins(lat: number, lng: number, radius = 3000): Promise<{ bins: Array<Bin & { distance_m: number }> }> {
    const res = await fetch(`${BASE_URL}/bins/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
    if (!res.ok) throw new Error('Failed to load nearby bins');
    return res.json();
  },

  // Wildlife Emergency Reports
  async submitWildlifeReport(data: {
    animal_type: string;
    condition: string;
    description: string;
    photo_url: string;
    lat: number;
    lng: number;
    address_hint?: string;
  }): Promise<{ report: WildlifeReport; credits_awarded: number }> {
    const res = await fetch(`${BASE_URL}/wildlife`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || 'Failed to submit wildlife report');
    return json;
  },

  async getWildlifeReports(): Promise<{ reports: WildlifeReport[] }> {
    const res = await fetch(`${BASE_URL}/wildlife`, { headers: getAuthHeader() });
    if (!res.ok) throw new Error('Failed to load wildlife reports');
    return res.json();
  },

  async getWildlifeReport(id: string): Promise<{ report: WildlifeReport }> {
    const res = await fetch(`${BASE_URL}/wildlife/${id}`, { headers: getAuthHeader() });
    if (!res.ok) throw new Error('Failed to load wildlife report details');
    return res.json();
  },

  async dispatchWildlifeRescue(
    id: string,
    data: { team_name: string; contact_phone?: string; eta_minutes?: number },
  ): Promise<{ success: boolean; report: WildlifeReport }> {
    const res = await fetch(`${BASE_URL}/admin/wildlife/${id}/dispatch`, {
      method: 'PATCH',
      headers: getAuthHeader(true),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || 'Failed to dispatch rescue team');
    return json;
  },

  async diagnoseWildlife(
    id: string,
    data: { diagnosis_notes: string; rescue_outcome?: string; status?: string },
  ): Promise<{ success: boolean; report: WildlifeReport }> {
    const res = await fetch(`${BASE_URL}/admin/wildlife/${id}/diagnose`, {
      method: 'PATCH',
      headers: getAuthHeader(true),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || 'Failed to update wildlife diagnosis');
    return json;
  },

  // Admin Gateway & Moderator Routes
  async verifyAdminGateway(passcode?: string, email?: string): Promise<{ success: boolean; token: string; user: User }> {
    const res = await fetch(`${BASE_URL}/admin/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode, email }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || 'Admin authentication failed');
    sessionStorage.setItem('cleanstreak_admin_token', json.token);
    return json;
  },

  async checkAdminAuth(): Promise<{ authenticated: boolean; user?: User }> {
    const adminToken = sessionStorage.getItem('cleanstreak_admin_token');
    if (!adminToken) return { authenticated: false };
    try {
      const res = await fetch(`${BASE_URL}/admin/auth/check`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) return { authenticated: false };
      return res.json();
    } catch {
      return { authenticated: false };
    }
  },

  logoutAdmin(): void {
    sessionStorage.removeItem('cleanstreak_admin_token');
  },

  async getAdminReviews(): Promise<{ reviews: Disposal[] }> {
    const res = await fetch(`${BASE_URL}/admin/reviews`, { headers: getAuthHeader(true) });
    if (!res.ok) throw new Error('Failed to load admin reviews');
    return res.json();
  },

  async submitReviewDecision(id: string, decision: 'approve' | 'reject', reject_reason?: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/admin/reviews/${id}/decision`, {
      method: 'POST',
      headers: getAuthHeader(true),
      body: JSON.stringify({ decision, reject_reason }),
    });
    if (!res.ok) throw new Error('Failed to submit review decision');
    return res.json();
  },

  async getAdminReports(): Promise<{ reports: Report[] }> {
    const res = await fetch(`${BASE_URL}/admin/reports`, { headers: getAuthHeader(true) });
    if (!res.ok) throw new Error('Failed to load admin reports');
    return res.json();
  },

  async updateAdminReport(id: string, data: { status?: Report['status']; note?: string; authority_id?: string }): Promise<any> {
    const res = await fetch(`${BASE_URL}/admin/reports/${id}`, {
      method: 'PATCH',
      headers: getAuthHeader(true),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update report');
    return res.json();
  },

  async getAdminStats(): Promise<{
    totalUsers: number;
    totalDisposals: number;
    approvedDisposals: number;
    pendingReviews: number;
    totalReports: number;
    totalCreditsAwarded: number;
  }> {
    const res = await fetch(`${BASE_URL}/admin/stats`, { headers: getAuthHeader(true) });
    if (!res.ok) throw new Error('Failed to load admin stats');
    return res.json();
  },
};
