import { describe, it, expect } from 'vitest';
import {
  haversine,
  metForSpeed,
  caloriesBurned,
  filterGPSPoints,
  GPSPoint,
} from '../../../packages/shared/src/haversine';

describe('Walk Tracking and Calories (Section 7)', () => {
  it('computes haversine distance between two coordinates accurately', () => {
    // 0,0 to 0,1 degree longitude at equator is approx 111.32 km = 111320 m
    const dist = haversine([0, 0], [0, 1]);
    expect(dist).toBeGreaterThan(111000);
    expect(dist).toBeLessThan(112000);

    // Same point is 0
    expect(haversine([28.6692, 77.4538], [28.6692, 77.4538])).toBe(0);
  });

  it('matches MET values according to walking speed', () => {
    expect(metForSpeed(2.5)).toBe(2.5); // < 3.0
    expect(metForSpeed(3.5)).toBe(2.8); // 3.0 - 4.0
    expect(metForSpeed(4.8)).toBe(3.5); // 4.0 - 5.2
    expect(metForSpeed(5.6)).toBe(4.3); // 5.2 - 6.0
    expect(metForSpeed(6.5)).toBe(5.0); // >= 6.0
  });

  it('spec example: 100 m in 75 s for 70 kg is about 5.1 kcal', () => {
    // Speed: 100m in 75s = (0.1 / (75/3600)) = 4.8 km/h -> MET = 3.5
    // Calories: 3.5 * 70 * (75/3600) = 5.104 kcal
    const res = caloriesBurned({
      weightKg: 70,
      distanceM: 100,
      durationS: 75,
    });
    expect(res.isEstimate).toBe(false);
    expect(res.calories).toBeCloseTo(5.1, 1);
  });

  it('missing weight uses default 65 kg and is flagged as an estimate', () => {
    const res = caloriesBurned({
      distanceM: 100,
      durationS: 75,
    });
    expect(res.isEstimate).toBe(true);
    // 3.5 * 65 * (75/3600) = 4.74 kcal
    expect(res.calories).toBeCloseTo(4.74, 1);
  });

  it('filters GPS noise (accuracy > 30m, jitter < 2m, speed > 10 km/h, jumps > 50m)', () => {
    const now = 1000000;
    const raw: GPSPoint[] = [
      { lat: 28.669200, lng: 77.453800, accuracy: 10, ts: now },
      // Bad accuracy point (>30m) - should be discarded
      { lat: 28.669300, lng: 77.453900, accuracy: 45, ts: now + 5000 },
      // Jitter (< 2m from first point) - should be discarded
      { lat: 28.669205, lng: 77.453805, accuracy: 8, ts: now + 8000 },
      // Valid step: ~15m away after 10s -> speed approx 5.4 km/h
      { lat: 28.669335, lng: 77.453800, accuracy: 12, ts: now + 10000 },
      // Impossible jump (>50m away in 2s, speed > 100 km/h) - should be discarded
      { lat: 28.675000, lng: 77.460000, accuracy: 10, ts: now + 12000 },
      // Valid next step: ~15m further after another 10s
      { lat: 28.669470, lng: 77.453800, accuracy: 9, ts: now + 20000 },
    ];

    const result = filterGPSPoints(raw);
    expect(result.filteredPoints.length).toBe(3);
    expect(result.totalDistanceM).toBeGreaterThan(20);
    expect(result.totalDistanceM).toBeLessThan(40);
    expect(result.avgSpeedKmh).toBeLessThan(10);
  });
});
