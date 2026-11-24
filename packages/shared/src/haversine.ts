const R = 6371000; // metres
const rad = (d: number) => (d * Math.PI) / 180;

export function haversine(a: [number, number], b: [number, number]): number {
  const dLat = rad(b[0] - a[0]);
  const dLon = rad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// MET values for level walking (Compendium of Physical Activities)
export function metForSpeed(kmh: number): number {
  if (kmh < 3.0) return 2.5;
  if (kmh < 4.0) return 2.8;
  if (kmh < 5.2) return 3.5;
  if (kmh < 6.0) return 4.3;
  return 5.0;
}

export function caloriesBurned(opts: {
  weightKg?: number;
  distanceM: number;
  durationS: number;
}): { calories: number; isEstimate: boolean } {
  const isEstimate = opts.weightKg === undefined || opts.weightKg === null;
  const weight = opts.weightKg ?? 65; // default 65 kg, flagged as estimate
  const hours = opts.durationS / 3600;
  if (hours <= 0 || opts.distanceM <= 0) {
    return { calories: 0, isEstimate };
  }
  const speedKmh = (opts.distanceM / 1000) / hours;
  const calories = metForSpeed(speedKmh) * weight * hours;
  return {
    calories: Math.round(calories * 100) / 100,
    isEstimate,
  };
}

export interface GPSPoint {
  lat: number;
  lng: number;
  accuracy: number;
  ts: number;
}

/**
 * Filter raw GPS points according to Section 7.2:
 * - Discard points with accuracy worse than 30 m.
 * - Discard points implying speed above 10 km/h (not walking) or jump over 50 m between consecutive points.
 * - Ignore movement under 2 m (jitter while standing still).
 */
export function filterGPSPoints(rawPoints: GPSPoint[]): {
  filteredPoints: GPSPoint[];
  totalDistanceM: number;
  durationS: number;
  avgSpeedKmh: number;
} {
  if (rawPoints.length === 0) {
    return { filteredPoints: [], totalDistanceM: 0, durationS: 0, avgSpeedKmh: 0 };
  }

  const validAccuracy = rawPoints.filter((p) => p.accuracy <= 30);
  if (validAccuracy.length === 0) {
    return { filteredPoints: [], totalDistanceM: 0, durationS: 0, avgSpeedKmh: 0 };
  }

  const filtered: GPSPoint[] = [validAccuracy[0]];
  let totalDistanceM = 0;

  for (let i = 1; i < validAccuracy.length; i++) {
    const prev = filtered[filtered.length - 1];
    const curr = validAccuracy[i];
    const dist = haversine([prev.lat, prev.lng], [curr.lat, curr.lng]);
    const dtSeconds = Math.max(0.5, (curr.ts - prev.ts) / 1000);
    const speedKmh = (dist / 1000) / (dtSeconds / 3600);

    // Filter jitter under 2m
    if (dist < 2) {
      continue;
    }

    // Filter jumps > 50m or speed > 10 km/h (implausible walking speed)
    if (dist > 50 || speedKmh > 10.0) {
      continue;
    }

    filtered.push(curr);
    totalDistanceM += dist;
  }

  const firstTs = filtered[0].ts;
  const lastTs = filtered[filtered.length - 1].ts;
  const durationS = Math.max(1, Math.round((lastTs - firstTs) / 1000));
  const avgSpeedKmh = durationS > 0 ? (totalDistanceM / 1000) / (durationS / 3600) : 0;

  return {
    filteredPoints: filtered,
    totalDistanceM: Math.round(totalDistanceM * 10) / 10,
    durationS,
    avgSpeedKmh: Math.round(avgSpeedKmh * 100) / 100,
  };
}
