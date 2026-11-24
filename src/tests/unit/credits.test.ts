import { describe, it, expect } from 'vitest';
import {
  CREDIT_RULES,
  disposalCredits,
  getTierForLifetimeCredits,
  isTierUnlocked,
} from '../../../packages/shared/src/creditRules';

describe('Credits and Rewards Rules (Section 6)', () => {
  it('calculates first disposal base credits with streak multiplier', () => {
    // Day 1 (week 0): multiplier = 1.0 -> 10 credits
    expect(disposalCredits(1, true, 0)).toBe(10);

    // Day 7 (week 1): multiplier = 1.1 -> 11 credits
    expect(disposalCredits(7, true, 0)).toBe(11);

    // Day 14 (week 2): multiplier = 1.2 -> 12 credits
    expect(disposalCredits(14, true, 0)).toBe(12);

    // Day 70 (week 10): multiplier capped at 2.0 -> 20 credits
    expect(disposalCredits(70, true, 0)).toBe(20);
    expect(disposalCredits(100, true, 0)).toBe(20);
  });

  it('enforces extra disposal credit rules and daily extra cap', () => {
    // Second disposal of the day (extrasSoFar = 0 < 2) -> 2 credits
    expect(disposalCredits(5, false, 0)).toBe(2);

    // Third disposal of the day (extrasSoFar = 1 < 2) -> 2 credits
    expect(disposalCredits(5, false, 1)).toBe(2);

    // Fourth disposal of the day (extrasSoFar = 2 >= 2) -> 0 credits (daily cap reached)
    expect(disposalCredits(5, false, 2)).toBe(0);
    expect(disposalCredits(5, false, 3)).toBe(0);
  });

  it('defines milestone bonus credits properly', () => {
    expect(CREDIT_RULES.milestones[3]).toBe(5);
    expect(CREDIT_RULES.milestones[7]).toBe(20);
    expect(CREDIT_RULES.milestones[14]).toBe(40);
    expect(CREDIT_RULES.milestones[30]).toBe(100);
    expect(CREDIT_RULES.milestones[60]).toBe(250);
    expect(CREDIT_RULES.milestones[100]).toBe(500);
  });

  it('calculates tiers based on LIFETIME credits (spending does not demote)', () => {
    expect(getTierForLifetimeCredits(0)).toBe('bronze');
    expect(getTierForLifetimeCredits(499)).toBe('bronze');
    expect(getTierForLifetimeCredits(500)).toBe('silver');
    expect(getTierForLifetimeCredits(1499)).toBe('silver');
    expect(getTierForLifetimeCredits(1500)).toBe('gold');
    expect(getTierForLifetimeCredits(3999)).toBe('gold');
    expect(getTierForLifetimeCredits(4000)).toBe('platinum');
    expect(getTierForLifetimeCredits(10000)).toBe('platinum');

    // Tier unlock checks
    expect(isTierUnlocked('bronze', 'bronze')).toBe(true);
    expect(isTierUnlocked('bronze', 'silver')).toBe(false);
    expect(isTierUnlocked('gold', 'silver')).toBe(true);
    expect(isTierUnlocked('gold', 'gold')).toBe(true);
    expect(isTierUnlocked('gold', 'platinum')).toBe(false);
    expect(isTierUnlocked('platinum', 'gold')).toBe(true);
  });
});
