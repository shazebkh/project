import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from './app-test-helper';
import { db } from '../../../apps/api/src/data/store';

describe('Walks and Calorie Tracking Integration (Section 7 & Section 11)', () => {
  const app = createTestApp();

  beforeEach(() => {
    db.reset();
  });

  it('tracks walk session and calculates distance & calories on finish', async () => {
    const user = db.createUser({
      email: 'walker@cleanstreak.app',
      display_name: 'City Walker',
      timezone: 'UTC',
      weight_kg: 70, // 70 kg
    });

    // 1. Start walk
    const startRes = await request(app)
      .post('/api/walks/start')
      .set('Authorization', `Bearer ${user.id}`)
      .expect(200);

    const walkId = startRes.body.id;
    expect(walkId).toBeDefined();

    // 2. Add GPS points (~100m over 75 seconds)
    const baseTs = 1000000;
    const points = [
      { lat: 28.66920, lng: 77.45380, accuracy: 10, ts: baseTs },
      { lat: 28.66950, lng: 77.45380, accuracy: 10, ts: baseTs + 25000 },
      { lat: 28.66980, lng: 77.45380, accuracy: 10, ts: baseTs + 50000 },
      { lat: 28.67010, lng: 77.45380, accuracy: 10, ts: baseTs + 75000 },
    ];

    await request(app)
      .post(`/api/walks/${walkId}/points`)
      .set('Authorization', `Bearer ${user.id}`)
      .send({ points })
      .expect(200);

    // 3. Finish walk
    const finishRes = await request(app)
      .post(`/api/walks/${walkId}/finish`)
      .set('Authorization', `Bearer ${user.id}`)
      .expect(200);

    expect(finishRes.body.distance_m).toBeGreaterThan(90);
    expect(finishRes.body.duration_s).toBe(75);
    expect(finishRes.body.calories_kcal).toBeGreaterThan(4.0);
    expect(finishRes.body.is_calorie_estimate).toBe(false); // User specified weight 70kg
  });
});
