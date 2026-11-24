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
} from '../../../../packages/shared/src/types';
import { haversine } from '../../../../packages/shared/src/haversine';
import { SEED_REWARDS, SEED_BINS, SEED_TIPS } from './seed';

export class DatabaseStore {
  users: Map<string, User> = new Map();
  disposals: Map<string, Disposal> = new Map();
  streaks: Map<string, UserStreak> = new Map();
  creditLedger: CreditLedgerEntry[] = [];
  rewards: Map<string, Reward> = new Map();
  redemptions: Map<string, Redemption> = new Map();
  bins: Map<string, Bin> = new Map();
  reports: Map<string, Report> = new Map();
  reportEvents: ReportEvent[] = [];
  tips: Map<string, Tip> = new Map();
  walkSessions: Map<string, WalkSession> = new Map();
  wildlifeReports: Map<string, WildlifeReport> = new Map();

  private ledgerSeq = 1;
  private reportEventSeq = 1;

  constructor() {
    this.reset();
  }

  reset() {
    this.users.clear();
    this.disposals.clear();
    this.streaks.clear();
    this.creditLedger = [];
    this.rewards.clear();
    this.redemptions.clear();
    this.bins.clear();
    this.reports.clear();
    this.reportEvents = [];
    this.tips.clear();
    this.walkSessions.clear();
    this.wildlifeReports.clear();
    this.ledgerSeq = 1;
    this.reportEventSeq = 1;

    // Seed Rewards
    for (const r of SEED_REWARDS) {
      this.rewards.set(r.id, { ...r });
    }

    // Seed Bins
    for (const b of SEED_BINS) {
      this.bins.set(b.id, { ...b });
    }

    // Seed Tips
    for (const t of SEED_TIPS) {
      this.tips.set(t.id, { ...t });
    }

    // Seed Default Users
    const defaultUser: User = {
      id: 'demo-user-1',
      email: 'citizen@cleanstreak.app',
      display_name: 'Alex Eco',
      timezone: 'America/Los_Angeles',
      weight_kg: 70,
      height_cm: 175,
      birth_year: 1996,
      role: 'user',
      trust_score: 0.85,
      created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
    };
    this.users.set(defaultUser.id, defaultUser);
    this.streaks.set(defaultUser.id, {
      user_id: defaultUser.id,
      current_streak: 5,
      longest_streak: 12,
      last_active_date: '2026-10-23',
      freezes_available: 1,
    });

    const adminUser: User = {
      id: 'admin-user-1',
      email: 'moderator@cleanstreak.app',
      display_name: 'Moderator Sarah',
      timezone: 'UTC',
      role: 'admin',
      trust_score: 1.0,
      created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
    };
    this.users.set(adminUser.id, adminUser);
    this.streaks.set(adminUser.id, {
      user_id: adminUser.id,
      current_streak: 0,
      longest_streak: 0,
      last_active_date: null,
      freezes_available: 0,
    });

    // Seed initial ledger credits for demo user (120 credits)
    this.appendLedgerEntry({
      user_id: defaultUser.id,
      delta: 120,
      reason: 'adjustment',
      ref_type: 'system',
      ref_id: 'seed-balance',
    });

    // Seed sample Wildlife Emergency cases
    const sampleWild1: WildlifeReport = {
      id: 'wild-demo-1',
      user_id: defaultUser.id,
      reporter_name: defaultUser.display_name,
      animal_type: 'dog',
      condition: 'bleeding_fracture',
      description: 'Stray dog with injured right paw, limping near city park entrance. Very calm but unable to walk.',
      photo_url: 'uploads/wildlife-dog-injured.jpg',
      captured_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      location: { lat: 28.6698, lng: 77.4545 },
      address_hint: 'Corner of Sector 4 Park Gate, near Water Fountain',
      status: 'team_dispatched',
      dispatched_team: {
        team_name: 'Paws & Claws Rapid Vet Unit #2',
        contact_phone: '+1 (800) 555-PAWS',
        eta_minutes: 15,
        dispatched_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      },
      created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    };
    this.wildlifeReports.set(sampleWild1.id, sampleWild1);

    const sampleWild2: WildlifeReport = {
      id: 'wild-demo-2',
      user_id: defaultUser.id,
      reporter_name: 'Alex Eco',
      animal_type: 'bird',
      condition: 'trapped',
      description: 'Pigeon entangled in discarded synthetic kite string on tree branch.',
      photo_url: 'uploads/wildlife-pigeon-string.jpg',
      captured_at: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
      location: { lat: 28.6685, lng: 77.4528 },
      address_hint: 'Opposite Central Library Lawn',
      status: 'treated_rescued',
      dispatched_team: {
        team_name: 'Avian Wildlife Rescue Team',
        contact_phone: '+1 (800) 555-BIRD',
        eta_minutes: 0,
        dispatched_at: new Date(Date.now() - 100 * 60 * 1000).toISOString(),
      },
      diagnosis_notes: 'String safely untangled from left wing. Antiseptic applied. Wing fracture ruled out.',
      rescue_outcome: 'Successfully released after 1 hour observation.',
      resolved_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    };
    this.wildlifeReports.set(sampleWild2.id, sampleWild2);
  }

  // User methods
  getUser(id: string): User | undefined {
    return this.users.get(id);
  }

  getUserByEmail(email: string): User | undefined {
    return Array.from(this.users.values()).find((u) => u.email === email);
  }

  createUser(u: Omit<User, 'id' | 'created_at' | 'trust_score' | 'role'> & { id?: string; trust_score?: number; role?: User['role'] }): User {
    const id = u.id || `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const user: User = {
      id,
      email: u.email,
      phone: u.phone,
      display_name: u.display_name,
      timezone: u.timezone || 'UTC',
      weight_kg: u.weight_kg,
      height_cm: u.height_cm,
      birth_year: u.birth_year,
      role: u.role || 'user',
      trust_score: u.trust_score ?? 0.5,
      created_at: new Date().toISOString(),
    };
    this.users.set(id, user);

    this.streaks.set(id, {
      user_id: id,
      current_streak: 0,
      longest_streak: 0,
      last_active_date: null,
      freezes_available: 0,
    });

    return user;
  }

  updateUser(id: string, partial: Partial<User>): User {
    const user = this.users.get(id);
    if (!user) throw new Error(`User ${id} not found`);
    const updated = { ...user, ...partial };
    this.users.set(id, updated);
    return updated;
  }

  // Streaks
  getStreak(userId: string): UserStreak {
    const s = this.streaks.get(userId);
    if (s) return s;
    const initial: UserStreak = {
      user_id: userId,
      current_streak: 0,
      longest_streak: 0,
      last_active_date: null,
      freezes_available: 0,
    };
    this.streaks.set(userId, initial);
    return initial;
  }

  updateStreak(userId: string, s: Partial<UserStreak>): UserStreak {
    const current = this.getStreak(userId);
    const updated = { ...current, ...s };
    this.streaks.set(userId, updated);
    return updated;
  }

  // Credits & Ledger
  getUserCredits(userId: string): { balance: number; lifetime: number; ledger: CreditLedgerEntry[] } {
    const entries = this.creditLedger.filter((e) => e.user_id === userId);
    const balance = entries.length > 0 ? entries[entries.length - 1].balance_after : 0;
    const lifetime = entries
      .filter((e) => e.delta > 0)
      .reduce((sum, e) => sum + e.delta, 0);
    return { balance, lifetime, ledger: entries };
  }

  appendLedgerEntry(entry: {
    user_id: string;
    delta: number;
    reason: CreditLedgerEntry['reason'];
    ref_type: string;
    ref_id: string;
  }): { entry: CreditLedgerEntry; alreadyProcessed: boolean } {
    // Enforce idempotency: UNIQUE (ref_type, ref_id, reason)
    const existing = this.creditLedger.find(
      (e) =>
        e.user_id === entry.user_id &&
        e.ref_type === entry.ref_type &&
        e.ref_id === entry.ref_id &&
        e.reason === entry.reason,
    );
    if (existing) {
      return { entry: existing, alreadyProcessed: true };
    }

    const currentBal = this.getUserCredits(entry.user_id).balance;
    const newBal = currentBal + entry.delta;

    const newEntry: CreditLedgerEntry = {
      id: this.ledgerSeq++,
      user_id: entry.user_id,
      delta: entry.delta,
      reason: entry.reason,
      ref_type: entry.ref_type,
      ref_id: entry.ref_id,
      balance_after: newBal,
      created_at: new Date().toISOString(),
    };
    this.creditLedger.push(newEntry);
    return { entry: newEntry, alreadyProcessed: false };
  }

  // Disposals
  createDisposal(d: Omit<Disposal, 'id' | 'created_at'>): Disposal {
    const id = `disp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const disposal: Disposal = {
      ...d,
      id,
      created_at: new Date().toISOString(),
    };
    this.disposals.set(id, disposal);
    return disposal;
  }

  getDisposal(id: string): Disposal | undefined {
    return this.disposals.get(id);
  }

  updateDisposal(id: string, partial: Partial<Disposal>): Disposal {
    const d = this.disposals.get(id);
    if (!d) throw new Error(`Disposal ${id} not found`);
    const updated = { ...d, ...partial };
    this.disposals.set(id, updated);
    return updated;
  }

  getDisposalsForUser(userId: string, from?: string, to?: string): Disposal[] {
    return Array.from(this.disposals.values())
      .filter((d) => {
        if (d.user_id !== userId) return false;
        if (from && d.local_date < from) return false;
        if (to && d.local_date > to) return false;
        return true;
      })
      .sort((a, b) => b.captured_at.localeCompare(a.captured_at));
  }

  getDisposalsForDay(userId: string, localDate: string): Disposal[] {
    return Array.from(this.disposals.values()).filter(
      (d) => d.user_id === userId && d.local_date === localDate && d.status === 'approved',
    );
  }

  // Duplicate checks across all users' disposals (Hamming distance <= 6)
  findDuplicatePHash(phash: string, excludeId?: string): Disposal | undefined {
    for (const d of this.disposals.values()) {
      if (excludeId && d.id === excludeId) continue;
      // Compare phash
      let dist = 0;
      const len = Math.max(phash.length, d.photo_phash.length);
      const hA = phash.padStart(len, '0');
      const hB = d.photo_phash.padStart(len, '0');
      for (let i = 0; i < len; i++) {
        let xor = (parseInt(hA[i], 16) || 0) ^ (parseInt(hB[i], 16) || 0);
        while (xor > 0) {
          dist += xor & 1;
          xor >>= 1;
        }
      }
      if (dist <= 6) {
        return d;
      }
    }
    return undefined;
  }

  // Reports
  createReport(r: Omit<Report, 'id' | 'created_at' | 'support_count' | 'status'> & { status?: Report['status'] }): Report {
    const id = `rep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const report: Report = {
      ...r,
      id,
      status: r.status || 'submitted',
      support_count: 1,
      created_at: new Date().toISOString(),
    };
    this.reports.set(id, report);

    this.addReportEvent(id, report.status, 'Report submitted by citizen');
    return report;
  }

  getReport(id: string): Report | undefined {
    return this.reports.get(id);
  }

  updateReport(id: string, partial: Partial<Report>): Report {
    const r = this.reports.get(id);
    if (!r) throw new Error(`Report ${id} not found`);
    const updated = { ...r, ...partial };
    this.reports.set(id, updated);
    return updated;
  }

  addReportEvent(reportId: string, status: Report['status'], note?: string): ReportEvent {
    const ev: ReportEvent = {
      id: this.reportEventSeq++,
      report_id: reportId,
      status,
      note,
      created_at: new Date().toISOString(),
    };
    this.reportEvents.push(ev);
    return ev;
  }

  getReportEvents(reportId: string): ReportEvent[] {
    return this.reportEvents
      .filter((e) => e.report_id === reportId)
      .sort((a, b) => a.id - b.id);
  }

  /**
   * Section 8.2: Duplicate detection
   * Category matches, not in ('resolved', 'rejected'), created within 7 days, within 50m
   */
  findDuplicateReport(category: Report['category'], lat: number, lng: number): Report | undefined {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    for (const r of this.reports.values()) {
      if (r.category !== category) continue;
      if (r.status === 'resolved' || r.status === 'rejected') continue;
      if (r.created_at < sevenDaysAgo) continue;
      const dist = haversine([r.location.lat, r.location.lng], [lat, lng]);
      if (dist <= 50.0) {
        return r;
      }
    }
    return undefined;
  }

  // Bins
  findNearbyBins(lat: number, lng: number, radiusM: number = 3000): Array<Bin & { distance_m: number }> {
    let results: Array<Bin & { distance_m: number }> = [];
    for (const b of this.bins.values()) {
      const dist = haversine([b.location.lat, b.location.lng], [lat, lng]);
      if (dist <= radiusM) {
        results.push({ ...b, distance_m: Math.round(dist) });
      }
    }

    // If no bins exist within radius around user coordinates, populate realistic neighborhood bins under 3km
    if (results.length === 0) {
      const offsets = [
        { dLat: 0.0022, dLng: 0.0018, type: 'general' as const, source: 'municipal' as const, ver: true },
        { dLat: -0.0035, dLng: 0.0025, type: 'recycling' as const, source: 'municipal' as const, ver: true },
        { dLat: 0.0051, dLng: -0.0042, type: 'wet' as const, source: 'user' as const, ver: true },
        { dLat: -0.0082, dLng: -0.0065, type: 'dry' as const, source: 'municipal' as const, ver: true },
        { dLat: 0.0125, dLng: 0.0095, type: 'recycling' as const, source: 'osm' as const, ver: true },
        { dLat: -0.0165, dLng: 0.0135, type: 'hazardous' as const, source: 'municipal' as const, ver: true },
      ];

      for (let i = 0; i < offsets.length; i++) {
        const off = offsets[i];
        const binLat = lat + off.dLat;
        const binLng = lng + off.dLng;
        const dist = haversine([binLat, binLng], [lat, lng]);
        if (dist <= radiusM) {
          const newBin: Bin = {
            id: `bin-local-${Date.now()}-${i}`,
            location: { lat: Math.round(binLat * 100000) / 100000, lng: Math.round(binLng * 100000) / 100000 },
            bin_type: off.type,
            source: off.source,
            verified: off.ver,
          };
          this.bins.set(newBin.id, newBin);
          results.push({ ...newBin, distance_m: Math.round(dist) });
        }
      }
    }

    return results.sort((a, b) => a.distance_m - b.distance_m);
  }

  // Walk sessions
  createWalkSession(userId: string): WalkSession {
    const id = `walk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const session: WalkSession = {
      id,
      user_id: userId,
      started_at: new Date().toISOString(),
      distance_m: 0,
      duration_s: 0,
      source: 'gps',
      points: [],
    };
    this.walkSessions.set(id, session);
    return session;
  }

  getWalkSession(id: string): WalkSession | undefined {
    return this.walkSessions.get(id);
  }

  updateWalkSession(id: string, partial: Partial<WalkSession>): WalkSession {
    const w = this.walkSessions.get(id);
    if (!w) throw new Error(`WalkSession ${id} not found`);
    const updated = { ...w, ...partial };
    this.walkSessions.set(id, updated);
    return updated;
  }

  // Rewards & Redemption
  getRedemptionsForUser(userId: string): Redemption[] {
    return Array.from(this.redemptions.values())
      .filter((r) => r.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  // Wildlife Emergency Reports
  createWildlifeReport(r: Omit<WildlifeReport, 'id' | 'created_at' | 'status'> & { status?: WildlifeReport['status'] }): WildlifeReport {
    const id = `wild-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const report: WildlifeReport = {
      ...r,
      id,
      status: r.status || 'reported',
      created_at: new Date().toISOString(),
    };
    this.wildlifeReports.set(id, report);
    return report;
  }

  getWildlifeReport(id: string): WildlifeReport | undefined {
    return this.wildlifeReports.get(id);
  }

  getWildlifeReports(): WildlifeReport[] {
    return Array.from(this.wildlifeReports.values()).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  updateWildlifeReport(id: string, partial: Partial<WildlifeReport>): WildlifeReport {
    const r = this.wildlifeReports.get(id);
    if (!r) throw new Error(`WildlifeReport ${id} not found`);
    const updated = { ...r, ...partial };
    this.wildlifeReports.set(id, updated);
    return updated;
  }
}

export const db = new DatabaseStore();
