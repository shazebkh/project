import { RewardTier } from './types.js';

export const CREDIT_RULES = {
  firstDisposalOfDay: 10,
  extraDisposal: 2,
  extraDisposalsPerDay: 2,
  acceptedReport: 15,
  reportsPerDay: 3,
  multiplierPerWeek: 0.1,
  multiplierCap: 2.0,
  milestones: { 3: 5, 7: 20, 14: 40, 30: 100, 60: 250, 100: 500 } as Record<number, number>,
};

export const TIERS: Array<{ name: RewardTier; minLifetime: number }> = [
  { name: 'bronze', minLifetime: 0 },
  { name: 'silver', minLifetime: 500 },
  { name: 'gold', minLifetime: 1500 },
  { name: 'platinum', minLifetime: 4000 },
];

export function getTierForLifetimeCredits(lifetimeCredits: number): RewardTier {
  if (lifetimeCredits >= 4000) return 'platinum';
  if (lifetimeCredits >= 1500) return 'gold';
  if (lifetimeCredits >= 500) return 'silver';
  return 'bronze';
}

export function isTierUnlocked(userTier: RewardTier, requiredTier: RewardTier): boolean {
  const order: Record<RewardTier, number> = {
    bronze: 0,
    silver: 1,
    gold: 2,
    platinum: 3,
  };
  return order[userTier] >= order[requiredTier];
}

export function disposalCredits(streakDay: number, isFirstOfDay: boolean, extrasSoFar: number): number {
  if (!isFirstOfDay) {
    return extrasSoFar < CREDIT_RULES.extraDisposalsPerDay ? CREDIT_RULES.extraDisposal : 0;
  }
  const multiplier = Math.min(
    1 + Math.floor(streakDay / 7) * CREDIT_RULES.multiplierPerWeek,
    CREDIT_RULES.multiplierCap,
  );
  return Math.round(CREDIT_RULES.firstDisposalOfDay * multiplier);
}
