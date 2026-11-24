import { DateTime } from 'luxon';

export interface StreakState {
  current: number;
  longest: number;
  lastActiveDate: string | null; // 'YYYY-MM-DD'
  freezes: number;
}

export function applyApprovedDisposal(
  s: StreakState,
  localDate: string,
  tz: string = 'UTC',
): { state: StreakState; incremented: boolean; freezesUsed: number; earnedFreeze: boolean } {
  // Use timezone for boundary calculation
  const today = DateTime.fromISO(localDate, { zone: tz }).startOf('day');

  if (!s.lastActiveDate) {
    const bumped = bump({ ...s, current: 0 }, localDate);
    return {
      state: bumped.state,
      incremented: true,
      freezesUsed: 0,
      earnedFreeze: bumped.earnedFreeze,
    };
  }

  const last = DateTime.fromISO(s.lastActiveDate, { zone: tz }).startOf('day');
  const gap = Math.round(today.diff(last, 'days').days);

  // Already counted today or past day review
  if (gap <= 0) {
    return { state: s, incremented: false, freezesUsed: 0, earnedFreeze: false };
  }

  // Consecutive day
  if (gap === 1) {
    const bumped = bump(s, localDate);
    return {
      state: bumped.state,
      incremented: true,
      freezesUsed: 0,
      earnedFreeze: bumped.earnedFreeze,
    };
  }

  // Missed days
  const missed = gap - 1;
  if (s.freezes >= missed) {
    const bumped = bump({ ...s, freezes: s.freezes - missed }, localDate);
    return {
      state: bumped.state,
      incremented: true,
      freezesUsed: missed,
      earnedFreeze: bumped.earnedFreeze,
    };
  }

  // Reset streak to 1
  const bumped = bump({ ...s, current: 0 }, localDate);
  return {
    state: bumped.state,
    incremented: true,
    freezesUsed: 0,
    earnedFreeze: bumped.earnedFreeze,
  };
}

function bump(s: StreakState, localDate: string): { state: StreakState; earnedFreeze: boolean } {
  const current = s.current + 1;
  const earnedFreeze = current % 10 === 0;
  return {
    state: {
      current,
      longest: Math.max(s.longest, current),
      lastActiveDate: localDate,
      freezes: Math.min(2, s.freezes + (earnedFreeze ? 1 : 0)),
    },
    earnedFreeze,
  };
}
