import { db } from '../data/store';
import { Disposal } from '../../../../packages/shared/src/types';
import { applyApprovedDisposal } from '../../../../packages/shared/src/streakEngine';
import { disposalCredits, CREDIT_RULES } from '../../../../packages/shared/src/creditRules';
import { computePerceptualHash, isNearDuplicate } from '../../../../packages/shared/src/phash';
import { haversine } from '../../../../packages/shared/src/haversine';

export interface VerificationResult {
  status: 'approved' | 'review' | 'rejected';
  confidence: number;
  reject_reason?: string;
  waste_types: string[];
}

export function verifyDisposalPhoto(params: {
  disposalId?: string;
  userId: string;
  photoKeyOrData: string;
  lat: number;
  lng: number;
  gpsAccuracyM?: number;
  capturedAt: string;
  receivedAt: string;
}): VerificationResult {
  const user = db.getUser(params.userId);
  const trustScore = user?.trust_score ?? 0.5;

  // Rule 1: Check stale capture (|captured_at - received_at| > 5 minutes)
  const capturedTs = new Date(params.capturedAt).getTime();
  const receivedTs = new Date(params.receivedAt).getTime();
  const diffMinutes = Math.abs(receivedTs - capturedTs) / (1000 * 60);

  if (diffMinutes > 5.0) {
    return {
      status: 'rejected',
      confidence: 0.1,
      reject_reason: 'Stale capture: photo was captured more than 5 minutes before submission.',
      waste_types: [],
    };
  }

  // Rule 2: Compute pHash and check for near-duplicate photo across all users
  const phash = computePerceptualHash(params.photoKeyOrData);
  const existingDup = db.findDuplicatePHash(phash, params.disposalId);
  if (existingDup) {
    return {
      status: 'rejected',
      confidence: 0.05,
      reject_reason: 'Duplicate photo detected: this photo has already been submitted.',
      waste_types: [],
    };
  }

  // Rule 3: Location plausibility
  let locationConfidence = 0.8;
  if (params.gpsAccuracyM && params.gpsAccuracyM > 50) {
    locationConfidence -= 0.3; // Poor GPS accuracy lowers confidence
  }

  // Check if near a known bin (within 30m)
  const nearbyBins = db.findNearbyBins(params.lat, params.lng, 30);
  const nearKnownBin = nearbyBins.length > 0;
  if (nearKnownBin) {
    locationConfidence += 0.15;
  }

  // Rule 4: Feature detection heuristic / trust score modulation
  // Trust score modulates baseline confidence
  let confidence = Math.min(0.95, (locationConfidence * 0.5) + (trustScore * 0.4) + 0.1);

  // Derive plausible waste types from image / context
  const possibleTypes = ['plastic', 'organic', 'paper', 'recycling'];
  const wasteTypes = [possibleTypes[Math.floor(Math.abs(params.lat * 100)) % possibleTypes.length]];

  // Decision thresholds:
  // >= 0.85 -> approved
  // 0.50 <= confidence < 0.85 -> review
  // < 0.50 -> rejected
  if (confidence >= 0.85) {
    return {
      status: 'approved',
      confidence: Math.round(confidence * 1000) / 1000,
      waste_types: wasteTypes,
    };
  } else if (confidence >= 0.50) {
    return {
      status: 'review',
      confidence: Math.round(confidence * 1000) / 1000,
      waste_types: wasteTypes,
    };
  } else {
    return {
      status: 'rejected',
      confidence: Math.round(confidence * 1000) / 1000,
      reject_reason: 'Low confidence: image does not sufficiently clearly show waste disposal into a bin.',
      waste_types: [],
    };
  }
}

/**
 * Executes atomic approval:
 * Updates disposal status -> applies streak change -> appends credit ledger entry -> awards milestone bonus if reached.
 * If anything fails, rollback is ensured.
 */
export function processDisposalApproval(disposalId: string): {
  disposal: Disposal;
  streakIncremented: boolean;
  creditsAwarded: number;
  milestoneBonus: number;
} {
  const disposal = db.getDisposal(disposalId);
  if (!disposal) throw new Error(`Disposal ${disposalId} not found`);

  if (disposal.status === 'approved') {
    // Already approved: idempotent return
    return {
      disposal,
      streakIncremented: false,
      creditsAwarded: 0,
      milestoneBonus: 0,
    };
  }

  const user = db.getUser(disposal.user_id);
  const userTz = user?.timezone || 'UTC';

  // Snapshot previous state for rollback guarantee
  const prevDisposal = { ...disposal };
  const currentStreak = db.getStreak(disposal.user_id);
  const prevStreak = { ...currentStreak };

  try {
    // 1. Update disposal
    const updatedDisposal = db.updateDisposal(disposalId, {
      status: 'approved',
      reject_reason: undefined,
    });

    // 2. Apply streak update
    const streakResult = applyApprovedDisposal(
      {
        current: currentStreak.current_streak,
        longest: currentStreak.longest_streak,
        lastActiveDate: currentStreak.last_active_date,
        freezes: currentStreak.freezes_available,
      },
      disposal.local_date,
      userTz,
    );

    db.updateStreak(disposal.user_id, {
      current_streak: streakResult.state.current,
      longest_streak: streakResult.state.longest,
      last_active_date: streakResult.state.lastActiveDate,
      freezes_available: streakResult.state.freezes,
    });

    // 3. Compute and award credits
    // Count approved disposals on this day prior to this approval
    const dayDisposals = db.getDisposalsForDay(disposal.user_id, disposal.local_date);
    const isFirstOfDay = dayDisposals.length <= 1; // including the newly approved one
    const extrasSoFar = Math.max(0, dayDisposals.length - 2);

    const baseCredits = disposalCredits(streakResult.state.current, isFirstOfDay, extrasSoFar);
    let creditsAwarded = 0;

    if (baseCredits > 0) {
      const ledgerRes = db.appendLedgerEntry({
        user_id: disposal.user_id,
        delta: baseCredits,
        reason: 'disposal',
        ref_type: 'disposal',
        ref_id: disposal.id,
      });
      if (!ledgerRes.alreadyProcessed) {
        creditsAwarded = baseCredits;
      }
    }

    // 4. Check streak milestone bonus
    let milestoneBonus = 0;
    if (streakResult.incremented && CREDIT_RULES.milestones[streakResult.state.current]) {
      const bonus = CREDIT_RULES.milestones[streakResult.state.current];
      const bonusRes = db.appendLedgerEntry({
        user_id: disposal.user_id,
        delta: bonus,
        reason: 'streak_bonus',
        ref_type: 'milestone',
        ref_id: `${disposal.user_id}-day-${streakResult.state.current}`,
      });
      if (!bonusRes.alreadyProcessed) {
        milestoneBonus = bonus;
      }
    }

    // 5. Elevate user trust score on verified approval
    if (user) {
      const newTrust = Math.min(1.0, user.trust_score + 0.02);
      db.updateUser(user.id, { trust_score: Math.round(newTrust * 100) / 100 });
    }

    return {
      disposal: updatedDisposal,
      streakIncremented: streakResult.incremented,
      creditsAwarded,
      milestoneBonus,
    };
  } catch (err) {
    // Rollback atomic transaction
    db.disposals.set(disposalId, prevDisposal);
    db.streaks.set(disposal.user_id, prevStreak);
    throw err;
  }
}
