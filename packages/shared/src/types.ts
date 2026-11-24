export type UserRole = 'user' | 'moderator' | 'admin';

export interface User {
  id: string;
  email?: string;
  phone?: string;
  display_name: string;
  timezone: string;
  weight_kg?: number;
  height_cm?: number;
  birth_year?: number;
  role: UserRole;
  trust_score: number;
  created_at: string;
}

export type DisposalStatus = 'pending' | 'review' | 'approved' | 'rejected';

export interface Disposal {
  id: string;
  user_id: string;
  walk_session_id?: string;
  photo_key: string;
  photo_phash: string;
  location: { lat: number; lng: number };
  gps_accuracy_m?: number;
  captured_at: string;
  received_at: string;
  local_date: string; // YYYY-MM-DD
  status: DisposalStatus;
  confidence?: number;
  reject_reason?: string;
  waste_types: string[];
  nearest_bin_id?: string;
  created_at: string;
}

export interface UserStreak {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null; // YYYY-MM-DD
  freezes_available: number;
}

export type LedgerReason = 'disposal' | 'streak_bonus' | 'report' | 'redemption' | 'adjustment' | 'quiz_bonus';

export interface CreditLedgerEntry {
  id: number;
  user_id: string;
  delta: number;
  reason: LedgerReason;
  ref_type: string;
  ref_id: string;
  balance_after: number;
  created_at: string;
}

export type RewardTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Reward {
  id: string;
  title: string;
  description?: string;
  partner?: string;
  cost_credits: number;
  tier_required: RewardTier;
  stock: number | null; // null = unlimited
  active: boolean;
}

export type RedemptionStatus = 'issued' | 'used' | 'expired';

export interface Redemption {
  id: string;
  user_id: string;
  reward_id: string;
  cost: number;
  code: string;
  status: RedemptionStatus;
  created_at: string;
}

export type BinType = 'general' | 'wet' | 'dry' | 'recycling' | 'hazardous';

export interface Bin {
  id: string;
  location: { lat: number; lng: number };
  bin_type?: BinType;
  source: 'osm' | 'municipal' | 'user';
  verified: boolean;
}

export type ReportCategory =
  | 'overflowing_bin'
  | 'illegal_dumping'
  | 'open_burning'
  | 'missing_bin'
  | 'no_segregation'
  | 'other';

export type ReportStatus =
  | 'submitted'
  | 'forwarded'
  | 'acknowledged'
  | 'in_progress'
  | 'resolved'
  | 'rejected';

export interface Report {
  id: string;
  user_id: string;
  category: ReportCategory;
  description?: string;
  photo_keys: string[];
  location: { lat: number; lng: number };
  address_text?: string;
  severity: number;
  status: ReportStatus;
  duplicate_of?: string;
  support_count: number;
  authority_id?: string;
  external_ref?: string;
  created_at: string;
  resolved_at?: string;
}

export interface ReportEvent {
  id: number;
  report_id: string;
  status: ReportStatus;
  note?: string;
  created_at: string;
}

export type TipCategory =
  | 'segregation'
  | 'composting'
  | 'plastic'
  | 'ewaste'
  | 'recycling'
  | 'hazardous';

export interface Tip {
  id: string;
  category: TipCategory;
  title: string;
  body_md: string;
  language: string;
  tags: string[];
  active: boolean;
}

export interface WalkSession {
  id: string;
  user_id: string;
  started_at: string;
  ended_at?: string;
  distance_m: number;
  duration_s: number;
  avg_speed_kmh?: number;
  calories_kcal?: number;
  source: 'gps' | 'pedometer';
  points: Array<{ lat: number; lng: number; accuracy: number; ts: number }>;
}

export type WildlifeAnimalType =
  | 'dog'
  | 'cat'
  | 'bird'
  | 'cow'
  | 'monkey'
  | 'wild_animal'
  | 'reptile'
  | 'other';

export type WildlifeCondition =
  | 'critical'
  | 'bleeding_fracture'
  | 'sick_malnourished'
  | 'trapped'
  | 'minor_injury';

export type WildlifeReportStatus =
  | 'reported'
  | 'team_dispatched'
  | 'on_site_triage'
  | 'treated_rescued'
  | 'closed';

export interface WildlifeReport {
  id: string;
  user_id: string;
  reporter_name?: string;
  animal_type: WildlifeAnimalType;
  condition: WildlifeCondition;
  description: string;
  photo_url: string; // watermarked with date, time, and GPS
  captured_at: string;
  location: { lat: number; lng: number };
  address_hint?: string;
  status: WildlifeReportStatus;
  dispatched_team?: {
    team_name: string;
    contact_phone?: string;
    eta_minutes?: number;
    dispatched_at: string;
  };
  diagnosis_notes?: string;
  rescue_outcome?: string;
  resolved_at?: string;
  created_at: string;
}

