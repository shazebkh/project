import { describe, it, expect } from 'vitest';
import { applyApprovedDisposal, StreakState } from '../../../packages/shared/src/streakEngine';

describe('Streak Engine (Section 5)', () => {
  it('first disposal initializes streak to 1', () => {
    const initial: StreakState = {
      current: 0,
      longest: 0,
      lastActiveDate: null,
      freezes: 0,
    };
    const res = applyApprovedDisposal(initial, '2026-10-25', 'UTC');
    expect(res.incremented).toBe(true);
    expect(res.state.current).toBe(1);
    expect(res.state.longest).toBe(1);
    expect(res.state.lastActiveDate).toBe('2026-10-25');
    expect(res.state.freezes).toBe(0);
  });

  it('consecutive day increments current and longest streak', () => {
    const s: StreakState = {
      current: 1,
      longest: 1,
      lastActiveDate: '2026-10-24',
      freezes: 0,
    };
    const res = applyApprovedDisposal(s, '2026-10-25', 'UTC');
    expect(res.incremented).toBe(true);
    expect(res.state.current).toBe(2);
    expect(res.state.longest).toBe(2);
    expect(res.state.lastActiveDate).toBe('2026-10-25');
  });

  it('same-day duplicate does not double count', () => {
    const s: StreakState = {
      current: 5,
      longest: 5,
      lastActiveDate: '2026-10-25',
      freezes: 1,
    };
    const res = applyApprovedDisposal(s, '2026-10-25', 'UTC');
    expect(res.incremented).toBe(false);
    expect(res.state.current).toBe(5);
    expect(res.state.longest).toBe(5);
  });

  it('missed days with enough freezes consumes freeze and continues streak', () => {
    const s: StreakState = {
      current: 5,
      longest: 5,
      lastActiveDate: '2026-10-20',
      freezes: 2,
    };
    // gap = 2 days (missed Oct 21, submitting on Oct 22) -> missed = 1
    const res = applyApprovedDisposal(s, '2026-10-22', 'UTC');
    expect(res.incremented).toBe(true);
    expect(res.freezesUsed).toBe(1);
    expect(res.state.current).toBe(6);
    expect(res.state.freezes).toBe(1);
    expect(res.state.lastActiveDate).toBe('2026-10-22');
  });

  it('missed days without enough freezes resets streak to 1', () => {
    const s: StreakState = {
      current: 14,
      longest: 14,
      lastActiveDate: '2026-10-20',
      freezes: 0,
    };
    const res = applyApprovedDisposal(s, '2026-10-23', 'UTC');
    expect(res.incremented).toBe(true);
    expect(res.freezesUsed).toBe(0);
    expect(res.state.current).toBe(1);
    expect(res.state.longest).toBe(14); // longest preserved
    expect(res.state.lastActiveDate).toBe('2026-10-23');
  });

  it('freeze earned every 10 streak days, capped at 2', () => {
    const s: StreakState = {
      current: 9,
      longest: 9,
      lastActiveDate: '2026-10-24',
      freezes: 0,
    };
    const res1 = applyApprovedDisposal(s, '2026-10-25', 'UTC');
    expect(res1.state.current).toBe(10);
    expect(res1.state.freezes).toBe(1);
    expect(res1.earnedFreeze).toBe(true);

    // Now test cap: already has 2 freezes, hits day 20
    const s20: StreakState = {
      current: 19,
      longest: 19,
      lastActiveDate: '2026-10-24',
      freezes: 2,
    };
    const res2 = applyApprovedDisposal(s20, '2026-10-25', 'UTC');
    expect(res2.state.current).toBe(20);
    expect(res2.state.freezes).toBe(2); // Capped at 2
  });

  it('handles midnight boundary and user timezone accurately', () => {
    // User in Tokyo (UTC+9)
    // 2026-10-25 in Tokyo
    const s: StreakState = {
      current: 3,
      longest: 3,
      lastActiveDate: '2026-10-24',
      freezes: 0,
    };
    const res = applyApprovedDisposal(s, '2026-10-25', 'Asia/Tokyo');
    expect(res.incremented).toBe(true);
    expect(res.state.current).toBe(4);
    expect(res.state.lastActiveDate).toBe('2026-10-25');
  });

  it('out-of-order approval for earlier date does not corrupt future streak state', () => {
    const s: StreakState = {
      current: 5,
      longest: 5,
      lastActiveDate: '2026-10-25',
      freezes: 1,
    };
    // Approval arrives late for yesterday (2026-10-24)
    const res = applyApprovedDisposal(s, '2026-10-24', 'UTC');
    expect(res.incremented).toBe(false);
    expect(res.state.current).toBe(5);
  });
});
